/**
 * Cloud Sync Engine for BORIS
 *
 * Encrypted cross-device sync via Cloudflare Workers relay.
 * All data is AES-256-GCM encrypted client-side before upload.
 *
 * Usage:
 *   import { cloudSync } from './sync-cloud.js';
 *   await cloudSync.init(eventBus);
 *   await cloudSync.createRoom(password);   // Device A
 *   await cloudSync.joinRoom(roomId, secret, password); // Device B
 */

import { getSetting, setSetting } from './db.js';
import { createSnapshot } from './sync.js';
import { applyMerge } from './sync.js';
import { encryptBinary, decryptBinary } from './crypto.js';

const SYNC_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const RETRY_DELAYS = [2000, 4000, 8000, 16000];

// ─── State ──────────────────────────────────────────────────

let syncConfig = null;   // { serverUrl, roomId, secret, password, deviceId, deviceName }
let eventBus = null;
let syncTimer = null;
let isSyncing = false;
let lastSyncAt = null;
let syncStatus = 'disconnected'; // disconnected | connected | syncing | error

function emit(event, data) {
  eventBus?.emit(event, data);
}

function updateStatus(status, detail) {
  syncStatus = status;
  emit('sync:status', { status, detail, lastSyncAt });
}

// ─── Network helpers ────────────────────────────────────────

async function fetchWithRetry(url, options, retries = RETRY_DELAYS) {
  for (let attempt = 0; attempt <= retries.length; attempt++) {
    try {
      const response = await fetch(url, options);
      return response;
    } catch (err) {
      if (attempt < retries.length) {
        await new Promise((r) => setTimeout(r, retries[attempt]));
      } else {
        throw err;
      }
    }
  }
}

function apiHeaders() {
  return {
    'X-Room-Id': syncConfig.roomId,
    'X-Device-Id': syncConfig.deviceId,
    'X-Room-Secret': syncConfig.secret,
  };
}

// ─── Core sync operations ───────────────────────────────────

async function push() {
  if (!syncConfig) return;

  const snapshot = await createSnapshot(false);
  const encrypted = await encryptBinary(JSON.stringify(snapshot), syncConfig.password);

  const response = await fetchWithRetry(`${syncConfig.serverUrl}/api/sync/push`, {
    method: 'POST',
    headers: {
      ...apiHeaders(),
      'Content-Type': 'application/octet-stream',
    },
    body: encrypted,
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Push failed' }));
    throw new Error(err.error);
  }

  return response.json();
}

async function pull() {
  if (!syncConfig) return null;

  const response = await fetchWithRetry(`${syncConfig.serverUrl}/api/sync/pull`, {
    method: 'GET',
    headers: apiHeaders(),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Pull failed' }));
    throw new Error(err.error);
  }

  const contentType = response.headers.get('Content-Type');

  // JSON response = no snapshot or own snapshot
  if (contentType?.includes('application/json')) {
    return null;
  }

  // Binary response = encrypted snapshot from another device
  const buffer = await response.arrayBuffer();
  const json = await decryptBinary(buffer, syncConfig.password);
  return JSON.parse(json);
}

async function syncOnce() {
  if (isSyncing || !syncConfig) return;
  isSyncing = true;
  updateStatus('syncing');

  try {
    // Pull first, merge, then push
    const remoteSnapshot = await pull();

    if (remoteSnapshot?.data) {
      const result = await applyMerge(remoteSnapshot.data);
      if (result.merged > 0) {
        emit('sync:merged', { merged: result.merged, conflicts: result.conflicts });
        // Notify all blocks to refresh
        emit('tasks:changed');
        emit('projects:changed');
        emit('lists:changed');
        emit('inbox:changed');
        emit('daily:changed', {});
        emit('habits:changed');
        emit('bpv:changed');
      }
    }

    // Push our current state
    await push();

    lastSyncAt = new Date().toISOString();
    await setSetting('sync_last_at', lastSyncAt);
    updateStatus('connected');
  } catch (err) {
    console.warn('[sync] sync failed:', err.message);
    updateStatus('error', err.message);
  } finally {
    isSyncing = false;
  }
}

// ─── Timer ──────────────────────────────────────────────────

function startTimer() {
  stopTimer();
  syncTimer = setInterval(() => syncOnce(), SYNC_INTERVAL_MS);
}

function stopTimer() {
  if (syncTimer) {
    clearInterval(syncTimer);
    syncTimer = null;
  }
}

// ─── Public API ─────────────────────────────────────────────

export const cloudSync = {
  /**
   * Initialize the sync engine. Resumes if config exists in IDB.
   */
  async init(bus) {
    eventBus = bus;

    const config = await getSetting('sync_config');
    if (config) {
      syncConfig = config;
      lastSyncAt = await getSetting('sync_last_at');
      updateStatus('connected');
      startTimer();

      // Subscribe to data changes for push-on-change
      const debounceSync = debounce(() => syncOnce(), 10000);
      eventBus.on('tasks:changed', debounceSync);
      eventBus.on('projects:changed', debounceSync);
      eventBus.on('lists:changed', debounceSync);
      eventBus.on('inbox:changed', debounceSync);
      eventBus.on('daily:changed', debounceSync);
      eventBus.on('habits:changed', debounceSync);
      eventBus.on('bpv:changed', debounceSync);

      // Initial sync on load
      setTimeout(() => syncOnce(), 3000);
    }
  },

  /**
   * Create a new sync room. Returns { roomId, secret } to share with other device.
   */
  async createRoom(serverUrl, password) {
    const response = await fetch(`${serverUrl}/api/sync/create-room`, { method: 'POST' });
    if (!response.ok) throw new Error('Failed to create room');

    const { roomId, secret } = await response.json();
    const deviceId = await getSetting('device_id') || crypto.randomUUID();
    const deviceName = getDeviceName();

    // Join the room we just created
    const joinResponse = await fetch(`${serverUrl}/api/sync/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomId, secret, deviceId, deviceName }),
    });

    if (!joinResponse.ok) throw new Error('Failed to join room');

    syncConfig = { serverUrl, roomId, secret, password, deviceId, deviceName };
    await setSetting('sync_config', syncConfig);

    updateStatus('connected');
    startTimer();

    // Push initial snapshot
    await syncOnce();

    return { roomId, secret };
  },

  /**
   * Join an existing sync room.
   */
  async joinRoom(serverUrl, roomId, secret, password) {
    const deviceId = await getSetting('device_id') || crypto.randomUUID();
    const deviceName = getDeviceName();

    const response = await fetch(`${serverUrl}/api/sync/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomId, secret, deviceId, deviceName }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: 'Failed to join' }));
      throw new Error(err.error);
    }

    syncConfig = { serverUrl, roomId, secret, password, deviceId, deviceName };
    await setSetting('sync_config', syncConfig);

    updateStatus('connected');
    startTimer();

    // Pull and merge on join
    await syncOnce();

    return response.json();
  },

  /**
   * Disconnect from sync.
   */
  async disconnect() {
    if (!syncConfig) return;

    try {
      await fetchWithRetry(`${syncConfig.serverUrl}/api/sync/leave`, {
        method: 'DELETE',
        headers: apiHeaders(),
      });
    } catch { /* ignore network errors on leave */ }

    stopTimer();
    syncConfig = null;
    await setSetting('sync_config', null);
    await setSetting('sync_last_at', null);
    updateStatus('disconnected');
  },

  /**
   * Force a sync now.
   */
  async syncNow() {
    return syncOnce();
  },

  /**
   * Get current sync status.
   */
  getStatus() {
    return {
      status: syncStatus,
      lastSyncAt,
      isConfigured: !!syncConfig,
      roomId: syncConfig?.roomId || null,
      deviceName: syncConfig?.deviceName || null,
    };
  },

  /**
   * Get room status (devices, last sync).
   */
  async getRoomStatus() {
    if (!syncConfig) return null;

    const response = await fetchWithRetry(`${syncConfig.serverUrl}/api/sync/status`, {
      method: 'GET',
      headers: apiHeaders(),
    });

    if (!response.ok) return null;
    return response.json();
  },
};

// ─── Helpers ────────────────────────────────────────────────

function getDeviceName() {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  if (/iPad|iPhone|iPod/.test(ua)) return 'iPhone/iPad';
  if (/Android/.test(ua)) return 'Android';
  if (/Macintosh/.test(ua)) return 'Mac';
  if (/Windows/.test(ua)) return 'Windows';
  if (/Linux/.test(ua)) return 'Linux';
  return 'Browser';
}

function debounce(fn, ms) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}
