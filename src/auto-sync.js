/**
 * Auto-sync engine — real-time encrypted sync via jsonbin.io
 * Uses existing AES-256-GCM encryption from crypto.js
 * Debounced upload on data changes, periodic polling for remote updates
 */

import { getSetting, setSetting, getAll, put } from './db.js';
import { encryptData, decryptData } from './crypto.js';
import { on, emit } from './state.js';

const API_BASE = 'https://api.jsonbin.io/v3/b';
const DEBOUNCE_MS = 3000;
const POLL_INTERVAL_MS = 30000;

// Stores to sync (same as sync.js)
const SYNC_STORES = [
  'hours', 'logbook', 'photos', 'competencies', 'assignments',
  'goals', 'quality', 'dailyPlans', 'weekReviews',
  'learningMoments', 'reference', 'energy'
];

let debounceTimer = null;
let pollTimer = null;
let isSyncing = false;
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

// ===== jsonbin.io API =====

async function createBin(apiKey, data) {
  const res = await fetch(API_BASE, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Master-Key': apiKey,
      'X-Bin-Private': 'true',
      'X-Bin-Name': 'bpv-tracker-sync'
    },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error(`Bin aanmaken mislukt (${res.status})`);
  const json = await res.json();
  return json.metadata.id;
}

async function readBin(apiKey, binId) {
  const res = await fetch(`${API_BASE}/${binId}/latest`, {
    headers: { 'X-Master-Key': apiKey }
  });
  if (!res.ok) throw new Error(`Bin lezen mislukt (${res.status})`);
  const json = await res.json();
  return json.record;
}

async function updateBin(apiKey, binId, data) {
  const res = await fetch(`${API_BASE}/${binId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'X-Master-Key': apiKey
    },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error(`Bin updaten mislukt (${res.status})`);
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

// ===== Upload =====

async function upload() {
  if (!isConfigured() || isSyncing) return;
  isSyncing = true;
  emit('autosync:status', { state: 'uploading' });

  try {
    const snapshot = await createSyncSnapshot();
    const encrypted = await encryptSnapshot(snapshot, config.password);

    if (!config.binId) {
      // First sync: create a new bin
      const binId = await createBin(config.apiKey, encrypted);
      await setSetting('autosync_binid', binId);
      config.binId = binId;
    } else {
      await updateBin(config.apiKey, config.binId, encrypted);
    }

    await setSetting('autosync_last', snapshot.syncedAt);
    emit('autosync:status', { state: 'idle', lastSync: snapshot.syncedAt });
  } catch (err) {
    console.error('Auto-sync upload failed:', err);
    emit('autosync:status', { state: 'error', message: err.message });
  } finally {
    isSyncing = false;
  }
}

// ===== Download & Merge =====

async function download() {
  if (!isConfigured() || !config.binId || isSyncing) return;
  isSyncing = true;
  emit('autosync:status', { state: 'downloading' });

  try {
    const encrypted = await readBin(config.apiKey, config.binId);
    const snapshot = await decryptSnapshot(encrypted, config.password);

    // Check if remote is newer than our last sync
    const lastSync = await getSetting('autosync_last');
    if (lastSync && snapshot.syncedAt <= lastSync) {
      emit('autosync:status', { state: 'idle', lastSync });
      return; // Already up to date
    }

    // Merge: newest updatedAt/date wins
    let merged = 0;
    for (const [storeName, records] of Object.entries(snapshot.data)) {
      if (!Array.isArray(records) || !SYNC_STORES.includes(storeName)) continue;

      const existing = await getAll(storeName).catch(() => []);
      const existingMap = new Map(existing.map(r => [r.id, r]));

      for (const record of records) {
        const local = existingMap.get(record.id);
        if (!local) {
          await put(storeName, record);
          merged++;
        } else {
          const localTime = local.updatedAt || local.date || '';
          const remoteTime = record.updatedAt || record.date || '';
          if (remoteTime > localTime) {
            await put(storeName, record);
            merged++;
          }
        }
      }
    }

    await setSetting('autosync_last', snapshot.syncedAt);
    emit('autosync:status', { state: 'idle', lastSync: snapshot.syncedAt });

    if (merged > 0) {
      // Notify UI to refresh across all synced modules
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
  if (!isConfigured()) return;
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
  await download();

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
 * Force a sync now (manual trigger)
 */
export async function syncNow() {
  await loadConfig();
  if (!isConfigured()) return;
  await download();
  await upload();
}
