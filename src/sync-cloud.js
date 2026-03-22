/**
 * Cloud Sync Engine for BORIS
 *
 * Encrypted cross-device sync via Cloudflare Pages Functions.
 * All data is AES-256-GCM encrypted client-side before upload.
 * Uses same-origin API calls — no server URL configuration needed.
 */

import { getSetting, setSetting } from './db.js';
import { createSnapshot, applyMerge } from './sync.js';
import { encryptBinary, decryptBinary } from './crypto.js';

const SYNC_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const RETRY_DELAYS = [2000, 4000, 8000, 16000];

let syncConfig = null;   // { roomId, secret, password, deviceId, deviceName }
let eventBus = null;
let syncTimer = null;
let isSyncing = false;
let lastSyncAt = null;
let syncStatus = 'disconnected';

function emit(event, data) {
  eventBus?.emit(event, data);
}

function updateStatus(status, detail) {
  syncStatus = status;
  emit('sync:status', { status, detail, lastSyncAt });
}

async function fetchWithRetry(url, options, retries = RETRY_DELAYS) {
  for (let attempt = 0; attempt <= retries.length; attempt++) {
    try {
      return await fetch(url, options);
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

async function push() {
  if (!syncConfig) return;
  const snapshot = await createSnapshot(false);
  const encrypted = await encryptBinary(JSON.stringify(snapshot), syncConfig.password);

  const response = await fetchWithRetry('/api/sync/push', {
    method: 'POST',
    headers: { ...apiHeaders(), 'Content-Type': 'application/octet-stream' },
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

  const response = await fetchWithRetry('/api/sync/pull', {
    method: 'GET',
    headers: apiHeaders(),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Pull failed' }));
    throw new Error(err.error);
  }

  const contentType = response.headers.get('Content-Type');
  if (contentType?.includes('application/json')) return null;

  const buffer = await response.arrayBuffer();
  const json = await decryptBinary(buffer, syncConfig.password);
  return JSON.parse(json);
}

async function syncOnce() {
  if (isSyncing || !syncConfig) return;
  isSyncing = true;
  updateStatus('syncing');

  try {
    const remoteSnapshot = await pull();

    if (remoteSnapshot?.data) {
      const result = await applyMerge(remoteSnapshot.data);
      if (result.merged > 0) {
        emit('sync:merged', { merged: result.merged, conflicts: result.conflicts });
        emit('tasks:changed');
        emit('projects:changed');
        emit('lists:changed');
        emit('inbox:changed');
        emit('daily:changed', {});
        emit('habits:changed');
        emit('bpv:changed');
      }
    }

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

export const cloudSync = {
  async init(bus) {
    eventBus = bus;

    const config = await getSetting('sync_config');
    if (config) {
      syncConfig = config;
      lastSyncAt = await getSetting('sync_last_at');
      updateStatus('connected');
      startTimer();

      const debounceSync = debounce(() => syncOnce(), 10000);
      eventBus.on('tasks:changed', debounceSync);
      eventBus.on('projects:changed', debounceSync);
      eventBus.on('lists:changed', debounceSync);
      eventBus.on('inbox:changed', debounceSync);
      eventBus.on('daily:changed', debounceSync);
      eventBus.on('habits:changed', debounceSync);
      eventBus.on('bpv:changed', debounceSync);

      setTimeout(() => syncOnce(), 3000);
    }
  },

  async createRoom(password) {
    const response = await fetch('/api/sync/create-room', { method: 'POST' });
    if (!response.ok) throw new Error('Kan kamer niet aanmaken');

    const { roomId, secret } = await response.json();
    const deviceId = await getSetting('device_id') || crypto.randomUUID();
    const deviceName = getDeviceName();

    const joinResponse = await fetch('/api/sync/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomId, secret, deviceId, deviceName }),
    });
    if (!joinResponse.ok) throw new Error('Kan niet joinen');

    syncConfig = { roomId, secret, password, deviceId, deviceName };
    await setSetting('sync_config', syncConfig);

    updateStatus('connected');
    startTimer();
    await syncOnce();

    return { roomId, secret };
  },

  async joinRoom(roomId, secret, password) {
    const deviceId = await getSetting('device_id') || crypto.randomUUID();
    const deviceName = getDeviceName();

    const response = await fetch('/api/sync/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomId, secret, deviceId, deviceName }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: 'Koppelen mislukt' }));
      throw new Error(err.error);
    }

    syncConfig = { roomId, secret, password, deviceId, deviceName };
    await setSetting('sync_config', syncConfig);

    updateStatus('connected');
    startTimer();
    await syncOnce();

    return response.json();
  },

  async disconnect() {
    if (!syncConfig) return;
    try {
      await fetchWithRetry('/api/sync/leave', { method: 'DELETE', headers: apiHeaders() });
    } catch { /* ignore */ }

    stopTimer();
    syncConfig = null;
    await setSetting('sync_config', null);
    await setSetting('sync_last_at', null);
    updateStatus('disconnected');
  },

  async syncNow() {
    return syncOnce();
  },

  getStatus() {
    return {
      status: syncStatus,
      lastSyncAt,
      isConfigured: !!syncConfig,
      roomId: syncConfig?.roomId || null,
      deviceName: syncConfig?.deviceName || null,
    };
  },

  async getRoomStatus() {
    if (!syncConfig) return null;
    const response = await fetchWithRetry('/api/sync/status', { method: 'GET', headers: apiHeaders() });
    if (!response.ok) return null;
    return response.json();
  },
};

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
