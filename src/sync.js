/**
 * Sync engine — export/import/merge .bpv files
 * Transactional: atomic snapshot for export, 2-phase import
 */

import { getAll, put, remove, clearAllData, getSetting } from './db.js';
import { encryptBinary, decryptBinary } from './crypto.js';
import { APP_VERSION, SCHEMA_VERSION } from './main.js';

// All data stores that participate in sync
const SYNC_STORES = [
  'hours', 'logbook', 'photos', 'competencies', 'assignments',
  'goals', 'quality', 'dailyPlans', 'weekReviews',
  'learningMoments', 'reference', 'energy', 'checklists', 'checklistLogs', 'deleted'
];

// Stores that contain sensitive data (Vault) — opt-in
const VAULT_STORES = ['vault', 'vaultFiles'];

// Stores where the 'date' field has a unique index
const UNIQUE_DATE_STORES = ['hours', 'dailyPlans', 'energy'];
// Stores where the 'week' field has a unique index
const UNIQUE_WEEK_STORES = ['weekReviews'];


function parseTime(value) {
  if (!value) return 0;
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const ts = Date.parse(value);
  return Number.isFinite(ts) ? ts : 0;
}

function getRecordTimestamp(record) {
  return parseTime(record?.updatedAt || record?.date);
}


/**
 * Create an atomic snapshot of all data stores
 * @param {boolean} includeVault - Whether to include vault data
 * @returns {Object} snapshot with meta + data
 */
export async function createSnapshot(includeVault = false) {
  const stores = [...SYNC_STORES];
  if (includeVault) stores.push(...VAULT_STORES);

  const data = {};
  for (const name of stores) {
    try {
      data[name] = await getAll(name);
    } catch {
      data[name] = [];
    }
  }

  // Include settings (excluding device_id)
  const allSettings = await getAll('settings');
  data.settings = allSettings.filter(s => s.key !== 'device_id');

  const deviceId = await getSetting('device_id') || 'unknown';

  return {
    meta: {
      app_version: APP_VERSION,
      schema_version: SCHEMA_VERSION,
      device_id: deviceId,
      exported_at: new Date().toISOString(),
      store_counts: Object.fromEntries(
        Object.entries(data).map(([k, v]) => [k, v.length])
      )
    },
    data
  };
}

/**
 * Export data as encrypted .bpv binary file
 * @param {string} password - Encryption password
 * @param {boolean} includeVault - Include vault data
 * @returns {ArrayBuffer} encrypted binary
 */
export async function exportBPV(password, includeVault = false) {
  const snapshot = await createSnapshot(includeVault);
  const json = JSON.stringify(snapshot);
  return encryptBinary(json, password);
}

/**
 * Decrypt and validate a .bpv file (Phase 1 of import)
 * Does NOT write to DB — only returns parsed data
 * @param {ArrayBuffer} buffer - The .bpv file contents
 * @param {string} password - Decryption password
 * @returns {Object} { meta, data } parsed and validated
 */
export async function decryptBPV(buffer, password) {
  const json = await decryptBinary(buffer, password);
  const parsed = JSON.parse(json);

  if (!parsed.meta || !parsed.data) {
    throw new Error('Ongeldig bestandsformaat');
  }

  if (parsed.meta.schema_version > SCHEMA_VERSION) {
    throw new Error(`Bestand vereist app versie ${parsed.meta.app_version} of nieuwer. Update de app eerst.`);
  }

  return parsed;
}

/**
 * Apply imported data — replace all (Phase 2)
 * Creates a safety snapshot first for undo
 * @param {Object} importedData - The data object from decryptBPV
 * @returns {Object} { safetySnapshot } for undo
 */
export async function applyReplace(importedData) {
  // Create safety snapshot before replacing
  const safetySnapshot = await createSnapshot(true);

  // Clear all data
  await clearAllData();

  // Write all imported data
  for (const [storeName, records] of Object.entries(importedData)) {
    if (!Array.isArray(records)) continue;
    for (const record of records) {
      try {
        await put(storeName, record);
      } catch {
        // Skip invalid records
      }
    }
  }

  return { safetySnapshot };
}

/**
 * Apply imported data — merge (Phase 2)
 * Newest updated_at wins for conflicts
 * @param {Object} importedData - The data object from decryptBPV
 * @returns {Object} { merged, skipped, conflicts }
 */
export async function applyMerge(importedData) {
  const safetySnapshot = await createSnapshot(true);
  let merged = 0;
  let skipped = 0;
  const conflicts = [];

  for (const [storeName, records] of Object.entries(importedData)) {
    if (!Array.isArray(records)) continue;
    if (storeName === 'settings') {
      // Merge settings: imported wins except device_id
      for (const setting of records) {
        if (setting.key === 'device_id') continue;
        await put('settings', setting);
        merged++;
      }
      continue;
    }

    if (storeName === 'deleted') {
      for (const tombstone of records) {
        if (!tombstone?.id || !tombstone?.store) { skipped++; continue; }

        const localStoreRecords = await getAll(tombstone.store).catch(() => []);
        const localRecord = localStoreRecords.find((entry) => entry.id === tombstone.id);
        const deletedAt = parseTime(tombstone.deletedAt);
        const localUpdatedAt = getRecordTimestamp(localRecord);

        if (!localRecord || deletedAt > localUpdatedAt) {
          await put('deleted', tombstone);
          // Clearing by id is safe even when record does not exist.
          await remove(tombstone.store, tombstone.id).catch(() => {});
          merged++;
        } else {
          skipped++;
        }
      }
      continue;
    }

    const existingRecords = await getAll(storeName).catch(() => []);
    const existingMap = new Map(existingRecords.map(r => [r.id, r]));

    // Build a lookup by unique field (date/week) for stores with unique indexes
    let uniqueFieldMap = null;
    if (UNIQUE_DATE_STORES.includes(storeName)) {
      uniqueFieldMap = new Map(existingRecords.map((r) => [r.date, r]));
    } else if (UNIQUE_WEEK_STORES.includes(storeName)) {
      uniqueFieldMap = new Map(existingRecords.map((r) => [r.week, r]));
    }

    for (const record of records) {
      const existing = existingMap.get(record.id);

      if (!existing) {
        // Check for unique date/week conflict before inserting
        const uniqueKey = UNIQUE_DATE_STORES.includes(storeName) ? record.date
          : UNIQUE_WEEK_STORES.includes(storeName) ? record.week : null;
        const conflictByField = uniqueKey && uniqueFieldMap ? uniqueFieldMap.get(uniqueKey) : null;

        if (conflictByField) {
          // Same date/week but different id — resolve by timestamp
          const existingTime = getRecordTimestamp(conflictByField);
          const importedTime = getRecordTimestamp(record);
          if (importedTime > existingTime) {
            await remove(storeName, conflictByField.id).catch(() => {});
            await put(storeName, record);
            existingMap.delete(conflictByField.id);
            uniqueFieldMap.set(uniqueKey, record);
            merged++;
            conflicts.push({ store: storeName, id: record.id, resolution: 'imported (replaced by date)' });
          } else {
            skipped++;
            conflicts.push({ store: storeName, id: record.id, resolution: 'kept (existing date newer)' });
          }
        } else {
          // New record — import it
          try {
            await put(storeName, record);
            if (uniqueFieldMap && uniqueKey) uniqueFieldMap.set(uniqueKey, record);
            merged++;
          } catch {
            skipped++;
          }
        }
        continue;
      }

      // Conflict: compare updatedAt/date using parsed timestamps
      const existingTime = getRecordTimestamp(existing);
      const importedTime = getRecordTimestamp(record);

      if (importedTime > existingTime) {
        // Imported is newer — overwrite
        await put(storeName, record);
        merged++;
        conflicts.push({ store: storeName, id: record.id, resolution: 'imported' });
      } else {
        // Existing is newer or equal — keep
        skipped++;
        conflicts.push({ store: storeName, id: record.id, resolution: 'kept' });
      }
    }
  }

  return { safetySnapshot, merged, skipped, conflicts };
}

/**
 * Undo an import by restoring a safety snapshot
 * @param {Object} safetySnapshot - The snapshot from applyReplace/applyMerge
 */
export async function undoImport(safetySnapshot) {
  await clearAllData();

  for (const [storeName, records] of Object.entries(safetySnapshot.data)) {
    if (!Array.isArray(records)) continue;
    for (const record of records) {
      try {
        await put(storeName, record);
      } catch {
        // Skip
      }
    }
  }
}

/**
 * Generate a download filename
 * @returns {string} e.g. "BPV-Tracker-Sync_2026-02-15_1430.bpv"
 */
export function generateFilename() {
  const now = new Date();
  const date = now.toISOString().slice(0, 10);
  const time = String(now.getHours()).padStart(2, '0') + String(now.getMinutes()).padStart(2, '0');
  return `BPV-Tracker-Sync_${date}_${time}.bpv`;
}
