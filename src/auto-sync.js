/**
 * Auto-sync engine — real-time encrypted sync via jsonbin.io
 * Uses existing AES-256-GCM encryption from crypto.js
 *
 * Key design decisions:
 * - Pull-before-push prevents overwriting newer remote data
 * - Merge uses updatedAt/date timestamps (newest wins)
 * - Tombstones (deleted store) propagate deletes across devices
 * - Upload debounce prevents API spam during rapid edits
 * - A syncing guard prevents circular event loops
 */

import { getSetting, setSetting, getAll, put, remove } from './db.js';
import { encryptData, decryptData } from './crypto.js';
import { on, emit } from './state.js';

const API_BASE = 'https://api.jsonbin.io/v3/b';
const DEBOUNCE_MS = 3000;
const POLL_INTERVAL_MS = 30000;

// Stores to sync (must match sync.js SYNC_STORES)
const SYNC_STORES = [
  'hours', 'logbook', 'photos', 'competencies', 'assignments',
  'goals', 'quality', 'dailyPlans', 'weekReviews',
  'learningMoments', 'reference', 'energy', 'deleted'
];

let debounceTimer = null;
let pollTimer = null;
let isSyncing = false;
let suppressEvents = false; // prevents merge -> emit -> upload loop
let config = null;

// ===== Configuration =====

async function loadConfig() {
  const apiKey = await getSetting('autosync_apikey');
  const binId = await getSetting('autosync_binid');
  const password = await getSetting('autosync_password');
  const enabled = await getSetting('autosync_enabled');
  config = { apiKey, binId, password, enabled };
  return config;
}

function isConfigured() {
  return config && config.enabled && config.apiKey && config.password;
}

function hasBin() {
  return isConfigured() && config.binId;
}

function parseTime(value) {
  if (!value) return 0;
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const ts = Date.parse(value);
  return Number.isFinite(ts) ? ts : 0;
}

function getRecordTimestamp(record) {
  return parseTime(record?.updatedAt || record?.date);
}

// ===== jsonbin.io API =====

async function apiFetch(url, options = {}) {
  let res;
  try {
    res = await fetch(url, options);
  } catch (networkErr) {
    throw new Error('Geen internetverbinding of server onbereikbaar');
  }
  if (res.status === 401) throw new Error('Ongeldige API key — controleer je jsonbin.io API key');
  if (res.status === 403) throw new Error('Toegang geweigerd — controleer of de API key juist is');
  if (res.status === 404) throw new Error('Bin niet gevonden — controleer de Bin ID');
  if (res.status === 413) throw new Error('Data te groot voor gratis jsonbin.io (max 100KB)');
  if (res.status === 429) throw new Error('Te veel verzoeken — probeer het over een minuut opnieuw');
  if (!res.ok) throw new Error(`Sync mislukt (HTTP ${res.status})`);
  return res.json();
}

async function createBin(apiKey, data) {
  const json = await apiFetch(API_BASE, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Master-Key': apiKey,
      'X-Bin-Private': 'true',
      'X-Bin-Name': 'bpv-tracker-sync'
    },
    body: JSON.stringify(data)
  });
  return json.metadata.id;
}

async function readBin(apiKey, binId) {
  const json = await apiFetch(`${API_BASE}/${binId}/latest`, {
    headers: { 'X-Master-Key': apiKey }
  });
  return json.record;
}

async function updateBin(apiKey, binId, data) {
  await apiFetch(`${API_BASE}/${binId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'X-Master-Key': apiKey
    },
    body: JSON.stringify(data)
  });
}

// ===== Snapshot & Encrypt =====

async function createSyncSnapshot() {
  const data = {};
  for (const name of SYNC_STORES) {
    try { data[name] = await getAll(name); }
    catch { data[name] = []; }
  }
  return {
    syncedAt: new Date().toISOString(),
    deviceId: await getSetting('device_id') || 'unknown',
    data
  };
}

async function encryptSnapshot(snapshot, password) {
  const json = JSON.stringify(snapshot);
  return encryptData(json, password);
}

async function decryptSnapshot(encrypted, password) {
  const json = await decryptData(encrypted, password);
  return JSON.parse(json);
}

/**
 * Merge remote snapshot into local DB.
 * Returns count of records that were actually changed.
 */
async function mergeRemoteSnapshot(snapshot) {
  let merged = 0;

  for (const [storeName, records] of Object.entries(snapshot?.data || {})) {
    if (!Array.isArray(records) || !SYNC_STORES.includes(storeName)) continue;

    if (storeName === 'deleted') {
      for (const tombstone of records) {
        if (!tombstone?.id || !tombstone?.store) continue;

        const localStoreRecords = await getAll(tombstone.store).catch(() => []);
        const localRecord = localStoreRecords.find((entry) => entry.id === tombstone.id);
        const deletedAt = parseTime(tombstone.deletedAt);
        const localUpdatedAt = getRecordTimestamp(localRecord);

        if (!localRecord || deletedAt > localUpdatedAt) {
          await put('deleted', tombstone);
          await remove(tombstone.store, tombstone.id).catch(() => {});
          merged++;
        }
      }
      continue;
    }

    const existing = await getAll(storeName).catch(() => []);
    const existingMap = new Map(existing.map((r) => [r.id, r]));

    for (const record of records) {
      if (!record?.id) continue;
      const local = existingMap.get(record.id);
      if (!local) {
        await put(storeName, record);
        merged++;
      } else {
        const localTime = getRecordTimestamp(local);
        const remoteTime = getRecordTimestamp(record);
        if (remoteTime > localTime) {
          await put(storeName, record);
          merged++;
        }
      }
    }
  }

  return merged;
}

/**
 * Emit refresh events for all data stores so the UI updates.
 * Wrapped in suppressEvents to prevent re-triggering upload.
 */
function emitRefreshEvents() {
  suppressEvents = true;
  emit('hours:updated');
  emit('logbook:updated');
  emit('competencies:updated');
  emit('assignments:updated');
  emit('goals:updated');
  emit('quality:updated');
  emit('planning:updated');
  emit('reference:updated');
  emit('energy:updated');
  emit('learningMoments:updated');
  suppressEvents = false;
}

// ===== Upload (push local -> remote) =====

async function upload() {
  if (!isConfigured() || isSyncing) return;
  isSyncing = true;
  emit('autosync:status', { state: 'uploading' });

  try {
    if (!config.binId) {
      // First sync on this device: create a new bin
      const snapshot = await createSyncSnapshot();
      const encrypted = await encryptSnapshot(snapshot, config.password);
      const binId = await createBin(config.apiKey, encrypted);
      await setSetting('autosync_binid', binId);
      config.binId = binId;
      await setSetting('autosync_lastPushed', snapshot.syncedAt);
      await setSetting('autosync_last', snapshot.syncedAt);
      emit('autosync:status', { state: 'idle', lastSync: snapshot.syncedAt });
      return;
    }

    // Pull-before-push: merge any remote changes first
    let remoteHadChanges = false;
    try {
      const encryptedRemote = await readBin(config.apiKey, config.binId);
      const remoteSnapshot = await decryptSnapshot(encryptedRemote, config.password);
      const merged = await mergeRemoteSnapshot(remoteSnapshot);
      if (merged > 0) {
        remoteHadChanges = true;
      }
      if (remoteSnapshot?.syncedAt) {
        await setSetting('autosync_lastPulled', remoteSnapshot.syncedAt);
      }
    } catch (pullErr) {
      // If pull fails due to decryption, the password is wrong or data is corrupt
      // Still push our local data to overwrite the broken state
      console.warn('Auto-sync pull-before-push failed:', pullErr.message);
    }

    // Take a fresh snapshot (after merge) and push
    const snapshot = await createSyncSnapshot();
    const encrypted = await encryptSnapshot(snapshot, config.password);
    await updateBin(config.apiKey, config.binId, encrypted);

    await setSetting('autosync_lastPushed', snapshot.syncedAt);
    await setSetting('autosync_last', snapshot.syncedAt);

    if (remoteHadChanges) {
      emitRefreshEvents();
    }

    emit('autosync:status', { state: 'idle', lastSync: snapshot.syncedAt });
  } catch (err) {
    console.error('Auto-sync upload failed:', err);
    emit('autosync:status', { state: 'error', message: err.message });
  } finally {
    isSyncing = false;
  }
}

// ===== Download & Merge (pull remote -> local) =====

async function download() {
  if (!hasBin() || isSyncing) return;
  isSyncing = true;
  emit('autosync:status', { state: 'downloading' });

  try {
    const encrypted = await readBin(config.apiKey, config.binId);
    const snapshot = await decryptSnapshot(encrypted, config.password);

    // Check if remote is newer than our last pull
    const lastPulledAt = await getSetting('autosync_lastPulled');
    if (lastPulledAt && parseTime(snapshot.syncedAt) <= parseTime(lastPulledAt)) {
      emit('autosync:status', { state: 'idle', lastSync: lastPulledAt });
      return; // Already up to date
    }

    const merged = await mergeRemoteSnapshot(snapshot);

    await setSetting('autosync_lastPulled', snapshot.syncedAt);
    await setSetting('autosync_last', snapshot.syncedAt);
    emit('autosync:status', { state: 'idle', lastSync: snapshot.syncedAt });

    if (merged > 0) {
      emitRefreshEvents();
    }
  } catch (err) {
    console.error('Auto-sync download failed:', err);
    emit('autosync:status', { state: 'error', message: err.message });
  } finally {
    isSyncing = false;
  }
}

// ===== Debounced trigger =====

function scheduleUpload() {
  if (!isConfigured() || suppressEvents) return;
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(upload, DEBOUNCE_MS);
}

// ===== Public API =====

/**
 * Initialize auto-sync: listen for data changes, start polling
 */
export async function initAutoSync() {
  await loadConfig();
  if (!isConfigured()) return;

  // Listen for all data change events
  const events = [
    'hours:updated', 'logbook:updated', 'competencies:updated',
    'assignments:updated', 'goals:updated', 'quality:updated',
    'planning:updated', 'reference:updated', 'energy:updated',
    'learningMoments:updated'
  ];
  events.forEach(evt => on(evt, scheduleUpload));

  // Initial download to get latest remote data
  if (hasBin()) {
    await download();
  }

  // Start periodic polling
  pollTimer = setInterval(download, POLL_INTERVAL_MS);
}

/**
 * Stop auto-sync
 */
export function stopAutoSync() {
  clearTimeout(debounceTimer);
  clearInterval(pollTimer);
  pollTimer = null;
}

/**
 * Restart auto-sync (after config change)
 */
export async function restartAutoSync() {
  stopAutoSync();
  await initAutoSync();
}

/**
 * Force a sync now (manual trigger).
 * On a fresh device with a binId, downloads first to pull data.
 * On the primary device, uploads then checks for remote changes.
 */
export async function syncNow() {
  await loadConfig();
  if (!isConfigured()) throw new Error('Vul API key en wachtwoord in');

  if (hasBin()) {
    // Pull first, then push — this is the safe order for a second device
    await download();
    await upload();
  } else {
    // No bin yet — create one by uploading
    await upload();
  }
}

/**
 * Test the connection and return diagnostic info.
 * Useful for debugging sync issues on mobile.
 */
export async function testSync() {
  await loadConfig();
  const result = { steps: [], ok: false };

  // Step 1: Config check
  if (!config?.apiKey) { result.steps.push('API key ontbreekt'); return result; }
  if (!config?.password) { result.steps.push('Wachtwoord ontbreekt'); return result; }
  result.steps.push('Config OK');

  // Step 2: API connectivity
  try {
    const res = await fetch(`${API_BASE}/${config.binId || 'test'}/latest`, {
      headers: { 'X-Master-Key': config.apiKey }
    });
    result.steps.push(`API bereikbaar (HTTP ${res.status})`);
    if (res.status === 401) { result.steps.push('API key ongeldig'); return result; }
  } catch (err) {
    result.steps.push('Netwerk fout: ' + err.message);
    return result;
  }

  // Step 3: Bin read
  if (!config.binId) {
    result.steps.push('Geen Bin ID — eerste sync maakt deze aan');
    result.ok = true;
    return result;
  }

  try {
    const encrypted = await readBin(config.apiKey, config.binId);
    result.steps.push('Bin gelezen (' + JSON.stringify(encrypted).length + ' bytes)');

    // Step 4: Decryption
    const snapshot = await decryptSnapshot(encrypted, config.password);
    const storeCount = Object.keys(snapshot?.data || {}).length;
    const recordCount = Object.values(snapshot?.data || {}).reduce((s, arr) => s + (Array.isArray(arr) ? arr.length : 0), 0);
    result.steps.push(`Ontsleuteld: ${storeCount} stores, ${recordCount} records`);
    if (snapshot?.syncedAt) result.steps.push('Laatste sync: ' + snapshot.syncedAt);
    if (snapshot?.deviceId) result.steps.push('Device: ' + snapshot.deviceId);
    result.ok = true;
  } catch (err) {
    result.steps.push('Fout: ' + err.message);
  }

  return result;
}
