/**
 * Manual encrypted sync engine (.bpv files)
 * - Atomic snapshot with write guard
 * - AES-GCM + PBKDF2 encryption via crypto helpers
 * - Merge/replace import with safety backup + undo support
 */

import {
  getAll,
  put,
  remove,
  clearAllData,
  getSetting,
  getStoreNames,
  acquireWriteGuard,
  releaseWriteGuard,
} from './db.js';
import { encryptBinary, decryptBinary } from './crypto.js';
import { APP_VERSION } from './version.js';
import { SCHEMA_VERSION } from './main.js';

const BASE_SYNC_STORES = [
  'hours', 'logbook', 'photos', 'competencies', 'assignments',
  'goals', 'quality', 'dailyPlans', 'weekReviews',
  'learningMoments', 'reference', 'energy', 'deleted',
];

const VAULT_STORES = ['vault', 'vaultFiles'];
const CLOSE_CONFLICT_WINDOW_MS = 90 * 1000;

function parseTime(value) {
  if (!value) return 0;
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeTimestamp(value) {
  const ts = parseTime(value);
  return ts ? new Date(ts).toISOString() : new Date(0).toISOString();
}

function normalizeSyncRecord(record, fallbackDeviceId) {
  if (!record || typeof record !== 'object') return record;

  const updatedAt = record.updated_at || record.updatedAt || record.date || new Date().toISOString();
  const deletedAt = record.deleted_at || record.deletedAt || null;
  const revision = Number(record.revision || 1);
  const deviceId = record.device_id || record.deviceId || fallbackDeviceId || 'unknown';

  return {
    ...record,
    updated_at: normalizeTimestamp(updatedAt),
    revision: Number.isFinite(revision) && revision > 0 ? revision : 1,
    device_id: deviceId,
    deleted_at: deletedAt ? normalizeTimestamp(deletedAt) : null,
  };
}

function extractTimestamp(record) {
  return parseTime(record?.updated_at || record?.updatedAt || record?.date);
}

function extractDeleteTimestamp(record) {
  return parseTime(record?.deleted_at || record?.deletedAt);
}

function extractRevision(record) {
  const revision = Number(record?.revision || 0);
  return Number.isFinite(revision) ? revision : 0;
}

function isTombstone(record) {
  return Boolean(record?.deleted_at || record?.deletedAt);
}

async function getSyncStoreList(includeVault = false) {
  const allStores = getStoreNames();
  const osStores = allStores.filter((name) => name.startsWith('os_'));

  const merged = new Set([...BASE_SYNC_STORES, ...osStores]);
  if (includeVault) {
    VAULT_STORES.forEach((name) => merged.add(name));
  } else {
    VAULT_STORES.forEach((name) => merged.delete(name));
  }

  return [...merged].filter((name) => allStores.includes(name) && name !== 'settings');
}

/**
 * Create atomic snapshot while writes are guarded.
 */
export async function createSnapshot(includeVault = false) {
  await acquireWriteGuard();
  try {
    const stores = await getSyncStoreList(includeVault);
    const data = {};

    for (const storeName of stores) {
      const rows = await getAll(storeName).catch(() => []);
      data[storeName] = rows.map((record) => normalizeSyncRecord(record));
    }

    const settings = await getAll('settings');
    data.settings = settings.filter((entry) => entry.key !== 'device_id');

    const deviceId = await getSetting('device_id') || 'unknown';

    return {
      format: 'bpv-sync-v2',
      meta: {
        app_version: APP_VERSION,
        schema_version: SCHEMA_VERSION,
        device_id: deviceId,
        exported_at: new Date().toISOString(),
        include_vault: includeVault,
        stores,
        store_counts: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, Array.isArray(v) ? v.length : 0])),
      },
      data,
    };
  } finally {
    releaseWriteGuard();
  }
}

export async function exportBPV(password, includeVault = false) {
  const snapshot = await createSnapshot(includeVault);
  return encryptBinary(JSON.stringify(snapshot), password);
}

export async function decryptBPV(buffer, password) {
  const json = await decryptBinary(buffer, password);
  const parsed = JSON.parse(json);

  if (!parsed?.meta || !parsed?.data) {
    throw new Error('Ongeldig bestandsformaat');
  }

  if (parsed.meta.schema_version > SCHEMA_VERSION) {
    throw new Error(`Bestand vereist app versie ${parsed.meta.app_version} of nieuwer.`);
  }

  return parsed;
}

async function writeImportedData(importedData) {
  for (const [storeName, records] of Object.entries(importedData)) {
    if (!Array.isArray(records)) continue;
    for (const record of records) {
      try {
        await put(storeName, record);
      } catch {
        // skip invalid store/row
      }
    }
  }
}

export async function applyReplace(importedData) {
  const safetySnapshot = await createSnapshot(true);
  await clearAllData();
  await writeImportedData(importedData);
  return { safetySnapshot };
}

function createConflict(storeName, localRecord, incomingRecord, reason) {
  return {
    store: storeName,
    id: incomingRecord?.id || localRecord?.id,
    reason,
    local: localRecord,
    incoming: incomingRecord,
  };
}

async function mergeStoreRecords(storeName, incomingRecords, deviceId) {
  const existing = await getAll(storeName).catch(() => []);
  const existingMap = new Map(existing.map((record) => [record.id, normalizeSyncRecord(record, deviceId)]));

  let merged = 0;
  let skipped = 0;
  const conflicts = [];

  for (const raw of incomingRecords) {
    const incoming = normalizeSyncRecord(raw, deviceId);
    if (!incoming?.id) {
      skipped += 1;
      continue;
    }

    const local = existingMap.get(incoming.id);
    if (!local) {
      await put(storeName, incoming);
      merged += 1;
      continue;
    }

    const localDeletedAt = extractDeleteTimestamp(local);
    const incomingDeletedAt = extractDeleteTimestamp(incoming);
    const localTs = extractTimestamp(local);
    const incomingTs = extractTimestamp(incoming);
    const localRev = extractRevision(local);
    const incomingRev = extractRevision(incoming);

    // tombstone dominance
    if (incomingDeletedAt || localDeletedAt) {
      if (incomingDeletedAt > localDeletedAt) {
        await put(storeName, incoming);
        merged += 1;
      } else {
        skipped += 1;
      }
      continue;
    }

    if (incomingTs > localTs) {
      const near = Math.abs(incomingTs - localTs) <= CLOSE_CONFLICT_WINDOW_MS;
      const bothChanged = localRev > 0 && incomingRev > 0 && incomingRev !== localRev;

      if (near && bothChanged) {
        conflicts.push(createConflict(storeName, local, incoming, 'close_timestamp_both_changed'));
      }

      await put(storeName, incoming);
      merged += 1;
      continue;
    }

    if (localTs > incomingTs) {
      skipped += 1;
      continue;
    }

    // same updated_at: tie-break by revision, then device id
    if (incomingRev > localRev) {
      await put(storeName, incoming);
      merged += 1;
      conflicts.push(createConflict(storeName, local, incoming, 'revision_tiebreak'));
      continue;
    }

    if (incomingRev === localRev && incoming.device_id !== local.device_id) {
      conflicts.push(createConflict(storeName, local, incoming, 'same_timestamp_same_revision_different_device'));
    }

    skipped += 1;
  }

  return { merged, skipped, conflicts };
}

export async function applyMerge(importedData) {
  const safetySnapshot = await createSnapshot(true);
  const currentDeviceId = await getSetting('device_id') || 'unknown';

  let merged = 0;
  let skipped = 0;
  const conflicts = [];

  for (const [storeName, records] of Object.entries(importedData)) {
    if (!Array.isArray(records)) continue;

    if (storeName === 'settings') {
      for (const setting of records) {
        if (setting.key === 'device_id') continue;
        await put('settings', setting);
        merged += 1;
      }
      continue;
    }

    const result = await mergeStoreRecords(storeName, records, currentDeviceId);
    merged += result.merged;
    skipped += result.skipped;
    conflicts.push(...result.conflicts);
  }

  return { safetySnapshot, merged, skipped, conflicts };
}

export async function undoImport(safetySnapshot) {
  await clearAllData();
  await writeImportedData(safetySnapshot.data || {});
}

export function generateFilename() {
  const now = new Date();
  const date = now.toISOString().slice(0, 10);
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  return `BPV-Tracker-Sync_${date}_${hh}${mm}.bpv`;
}
