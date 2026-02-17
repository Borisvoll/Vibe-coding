/**
 * Auto-sync engine — real-time encrypted sync via jsonbin.io
 * Uses existing AES-256-GCM encryption from crypto.js
 *
 * Key design decisions:
 * - Auto-discovery: finds existing "bpv-tracker-sync" bin automatically
 *   so both devices use the same bin without manual Bin ID copying
 * - Pull-before-push prevents overwriting newer remote data
 * - Merge uses updatedAt/date timestamps (newest wins)
 * - Tombstones (deleted store) propagate deletes across devices
 * - Upload debounce prevents API spam during rapid edits
 * - A syncing guard prevents circular event loops
 * - Photos excluded: Blob objects can't be JSON-serialized,
 *   and images exceed jsonbin.io's 100KB free-tier limit.
 *   Use manual .bpv export for full backups including photos.
 */

import { getSetting, setSetting, getAll, put, remove } from './db.js';
import { encryptData, decryptData } from './crypto.js';
import { on, emit } from './state.js';

const API_BASE = 'https://api.jsonbin.io/v3/b';
const DEBOUNCE_MS = 3000;
const POLL_INTERVAL_MS = 30000;
const BIN_NAME = 'bpv-tracker-sync';

// Stores to sync — photos excluded (Blob objects + jsonbin.io size limit)
const SYNC_STORES = [
  'hours', 'logbook', 'competencies', 'assignments',
  'goals', 'quality', 'dailyPlans', 'weekReviews',
  'learningMoments', 'reference', 'energy', 'checklists', 'checklistLogs', 'deleted'
];

// Stores where the 'date' field has a unique index
const UNIQUE_DATE_STORES = ['hours', 'dailyPlans', 'energy'];
// Stores where the 'week' field has a unique index
const UNIQUE_WEEK_STORES = ['weekReviews'];

let debounceTimer = null;
let pollTimer = null;
let isSyncing = false;
let suppressEvents = false; // prevents merge -> emit -> upload loop
let config = null;
let eventUnsubs = []; // track event listeners for cleanup

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

/**
 * Search for an existing bin named "bpv-tracker-sync" using jsonbin.io API.
 * Returns the bin ID if found, null otherwise.
 */
async function findExistingBin(apiKey) {
  try {
    // jsonbin.io v3: list bins in uncategorized collection
    const res = await fetch('https://api.jsonbin.io/v3/c/uncategorized/bins', {
      headers: { 'X-Master-Key': apiKey }
    });
    if (!res.ok) {
      // If collection listing fails, try the /e metadata endpoint
      console.warn('Bin listing via collection failed, trying metadata...');
      return await findExistingBinViaMetadata(apiKey);
    }
    const bins = await res.json();
    // bins is an array of objects with metadata
    if (Array.isArray(bins)) {
      for (const bin of bins) {
        const name = bin?.snippetMeta?.name || bin?.metadata?.name || bin?.name;
        const id = bin?.snippetMeta?.id || bin?.metadata?.id || bin?.record;
        if (name === BIN_NAME && id) {
          console.log('Found existing sync bin:', id);
          return id;
        }
      }
    }
    return null;
  } catch (err) {
    console.warn('Bin auto-discovery failed:', err.message);
    return null;
  }
}

/**
 * Fallback: try to find bin via metadata/bins endpoint
 */
async function findExistingBinViaMetadata(apiKey) {
  try {
    const res = await fetch('https://api.jsonbin.io/v3/e/metadata', {
      headers: { 'X-Master-Key': apiKey }
    });
    if (!res.ok) return null;
    const data = await res.json();
    const bins = data?.record || data;
    if (Array.isArray(bins)) {
      for (const bin of bins) {
        if (bin?.private === BIN_NAME || bin?.name === BIN_NAME) {
          return bin?.id || bin?.snippetMeta?.id;
        }
      }
    }
    return null;
  } catch {
    return null;
  }
}

async function createBin(apiKey, data) {
  const json = await apiFetch(API_BASE, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Master-Key': apiKey,
      'X-Bin-Private': 'true',
      'X-Bin-Name': BIN_NAME
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

    // Build a lookup by unique field (date/week) for stores with unique indexes
    let uniqueFieldMap = null;
    if (UNIQUE_DATE_STORES.includes(storeName)) {
      uniqueFieldMap = new Map(existing.map((r) => [r.date, r]));
    } else if (UNIQUE_WEEK_STORES.includes(storeName)) {
      uniqueFieldMap = new Map(existing.map((r) => [r.week, r]));
    }

    for (const record of records) {
      if (!record?.id) continue;
      const local = existingMap.get(record.id);
      if (!local) {
        // Check for unique date/week conflict before inserting
        const uniqueKey = UNIQUE_DATE_STORES.includes(storeName) ? record.date
          : UNIQUE_WEEK_STORES.includes(storeName) ? record.week : null;
        const conflictByField = uniqueKey && uniqueFieldMap ? uniqueFieldMap.get(uniqueKey) : null;

        if (conflictByField) {
          // Same date/week but different id — resolve by timestamp
          const localTime = getRecordTimestamp(conflictByField);
          const remoteTime = getRecordTimestamp(record);
          if (remoteTime > localTime) {
            await remove(storeName, conflictByField.id).catch(() => {});
            await put(storeName, record);
            existingMap.delete(conflictByField.id);
            uniqueFieldMap.set(uniqueKey, record);
            merged++;
          }
          // else: local is newer, skip
        } else {
          try {
            await put(storeName, record);
            if (uniqueFieldMap && uniqueKey) uniqueFieldMap.set(uniqueKey, record);
            merged++;
          } catch {
            // Skip records that still fail
          }
        }
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
  try {
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
    emit('checklists:updated');
  } finally {
    suppressEvents = false;
  }
}

/**
 * Find or create a sync bin. Automatically discovers existing bins
 * so multiple devices with the same API key share the same bin.
 */
async function findOrCreateBin(apiKey, password) {
  // Step 1: Try to find an existing bin named "bpv-tracker-sync"
  emit('autosync:status', { state: 'searching' });
  const existingBinId = await findExistingBin(apiKey);

  if (existingBinId) {
    // Verify we can read and decrypt it (same password)
    try {
      const encrypted = await readBin(apiKey, existingBinId);
      await decryptSnapshot(encrypted, password);
      // Success! This bin works with our password
      return { binId: existingBinId, created: false };
    } catch (err) {
      console.warn('Found bin but cannot decrypt (different password?):', err.message);
      // The bin exists but uses a different password — create a new one
    }
  }

  // Step 2: No existing bin found (or wrong password) — create a new one
  const snapshot = await createSyncSnapshot();
  const encrypted = await encryptSnapshot(snapshot, password);
  const newBinId = await createBin(apiKey, encrypted);
  return { binId: newBinId, created: true, snapshot };
}

// ===== Upload (push local -> remote) =====

async function upload(force = false) {
  if (!isConfigured()) return;
  if (isSyncing && !force) return;
  isSyncing = true;
  emit('autosync:status', { state: 'uploading' });

  try {
    if (!config.binId) {
      // First sync: auto-discover or create bin
      const { binId, created, snapshot } = await findOrCreateBin(config.apiKey, config.password);
      await setSetting('autosync_binid', binId);
      config.binId = binId;

      if (created && snapshot) {
        // We just created a new bin with our data
        await setSetting('autosync_lastPushed', snapshot.syncedAt);
        await setSetting('autosync_last', snapshot.syncedAt);
        emit('autosync:status', { state: 'idle', lastSync: snapshot.syncedAt });
        emit('autosync:binFound', { binId, created: true });
        return;
      }

      // Found existing bin — now do a proper pull+push below
      emit('autosync:binFound', { binId, created: false });
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

async function download(force = false) {
  if (!hasBin()) return;
  if (isSyncing && !force) return;
  isSyncing = true;
  emit('autosync:status', { state: 'downloading' });

  try {
    const encrypted = await readBin(config.apiKey, config.binId);
    const snapshot = await decryptSnapshot(encrypted, config.password);

    // Check if remote is newer than our last pull (skip for forced/manual sync)
    if (!force) {
      const lastPulledAt = await getSetting('autosync_lastPulled');
      if (lastPulledAt && parseTime(snapshot.syncedAt) <= parseTime(lastPulledAt)) {
        emit('autosync:status', { state: 'idle', lastSync: lastPulledAt });
        return; // Already up to date
      }
    }

    const merged = await mergeRemoteSnapshot(snapshot);

    await setSetting('autosync_lastPulled', snapshot.syncedAt);
    await setSetting('autosync_last', snapshot.syncedAt);
    emit('autosync:status', { state: 'idle', lastSync: snapshot.syncedAt });

    if (merged > 0) {
      emitRefreshEvents();
    }

    return merged;
  } catch (err) {
    console.error('Auto-sync download failed:', err);
    emit('autosync:status', { state: 'error', message: err.message });
    throw err; // re-throw so syncNow() can report it
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
    'learningMoments:updated', 'checklists:updated'
  ];
  events.forEach(evt => {
    const unsub = on(evt, scheduleUpload);
    eventUnsubs.push(unsub);
  });

  // Initial download to get latest remote data
  if (hasBin()) {
    await download();
  }

  // Start periodic polling
  pollTimer = setInterval(download, POLL_INTERVAL_MS);
}

/**
 * Stop auto-sync and clean up all listeners
 */
export function stopAutoSync() {
  clearTimeout(debounceTimer);
  clearInterval(pollTimer);
  pollTimer = null;
  // Remove event listeners to prevent stacking on restart
  eventUnsubs.forEach(fn => fn());
  eventUnsubs = [];
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
 * Bypasses isSyncing guard and "already up to date" checks.
 * Returns detailed result object for UI display.
 */
export async function syncNow() {
  await loadConfig();
  if (!isConfigured()) throw new Error('Vul API key en wachtwoord in');

  // Force-reset syncing state in case it got stuck
  isSyncing = false;

  const result = { pulled: 0, pushed: false, binCreated: false, binFound: false, error: null };

  try {
    if (hasBin()) {
      // Pull remote data first (force=true bypasses guards)
      const merged = await download(true);
      result.pulled = merged || 0;

      // Then push local data
      await upload(true);
      result.pushed = true;
    } else {
      // No bin yet — auto-discover or create
      await upload(true);
      // Check if bin was found or created
      const binId = await getSetting('autosync_binid');
      if (binId) {
        result.pushed = true;
        // Try to pull data from the found bin (might have data from other device)
        await loadConfig();
        if (hasBin()) {
          const merged = await download(true);
          result.pulled = merged || 0;
          if (merged > 0) {
            // Push merged data back
            await upload(true);
          }
          result.binFound = true;
        } else {
          result.binCreated = true;
        }
      }
    }
  } catch (err) {
    result.error = err.message;
    throw err;
  }

  return result;
}

/**
 * Test the connection and return comprehensive diagnostic info.
 */
export async function testSync() {
  await loadConfig();
  const result = { steps: [], ok: false };

  // Step 1: Config check
  if (!config?.apiKey) { result.steps.push('API key ontbreekt'); return result; }
  if (!config?.password) { result.steps.push('Wachtwoord ontbreekt'); return result; }
  result.steps.push('Config OK (enabled=' + !!config.enabled + ')');

  // Step 2: Check local data size
  try {
    const snapshot = await createSyncSnapshot();
    const json = JSON.stringify(snapshot);
    const sizeKB = Math.round(json.length / 1024);
    const storeSizes = Object.entries(snapshot.data)
      .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.length : 0}`)
      .join(', ');
    result.steps.push(`Lokale data: ${sizeKB}KB (${storeSizes})`);
    if (sizeKB > 90) {
      result.steps.push(`LET OP: Data is ${sizeKB}KB, jsonbin.io limiet is 100KB!`);
    }
  } catch (err) {
    result.steps.push('Snapshot fout: ' + err.message);
  }

  // Step 3: API connectivity
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

  // Step 4: Auto-discovery check
  if (!config.binId) {
    result.steps.push('Geen Bin ID — zoeken naar bestaande bin...');
    const found = await findExistingBin(config.apiKey);
    if (found) {
      result.steps.push('Bestaande bin gevonden: ' + found);
    } else {
      result.steps.push('Geen bestaande bin gevonden — eerste sync maakt deze aan');
    }
    result.ok = true;
    return result;
  }

  // Step 5: Bin read
  try {
    const encrypted = await readBin(config.apiKey, config.binId);
    const rawSize = JSON.stringify(encrypted).length;
    result.steps.push('Bin gelezen (' + Math.round(rawSize / 1024) + 'KB)');

    // Step 6: Decryption
    const snapshot = await decryptSnapshot(encrypted, config.password);
    const storeCount = Object.keys(snapshot?.data || {}).length;
    const recordCount = Object.values(snapshot?.data || {}).reduce((s, arr) => s + (Array.isArray(arr) ? arr.length : 0), 0);
    result.steps.push(`Ontsleuteld: ${storeCount} stores, ${recordCount} records`);
    if (snapshot?.syncedAt) result.steps.push('Laatst gepusht: ' + new Date(snapshot.syncedAt).toLocaleString('nl-NL'));
    if (snapshot?.deviceId) result.steps.push('Door device: ' + snapshot.deviceId);

    // Step 7: Compare with local
    const localDeviceId = await getSetting('device_id') || 'unknown';
    result.steps.push('Dit device: ' + localDeviceId);
    if (snapshot?.deviceId === localDeviceId) {
      result.steps.push('Remote data komt van DIT device');
    } else {
      result.steps.push('Remote data komt van ANDER device — sync zou moeten werken');
    }

    // Step 8: Check what would be merged
    let wouldMerge = 0;
    for (const [storeName, records] of Object.entries(snapshot?.data || {})) {
      if (!Array.isArray(records) || !SYNC_STORES.includes(storeName)) continue;
      const local = await getAll(storeName).catch(() => []);
      const localMap = new Map(local.map(r => [r.id, r]));
      for (const record of records) {
        if (!record?.id) continue;
        const existing = localMap.get(record.id);
        if (!existing) { wouldMerge++; continue; }
        if (getRecordTimestamp(record) > getRecordTimestamp(existing)) wouldMerge++;
      }
    }
    result.steps.push(`Records die gemerged zouden worden: ${wouldMerge}`);

    result.ok = true;
  } catch (err) {
    result.steps.push('Fout: ' + err.message);
  }

  return result;
}
