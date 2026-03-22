/**
 * BORIS Sync Relay — Cloudflare Worker
 *
 * Stores AES-256-GCM encrypted snapshots in KV.
 * The worker never sees plaintext data.
 *
 * KV namespace binding: SYNC_KV
 *
 * Routes:
 *   POST /api/sync/create-room   → Create a new sync room (returns roomId + secret)
 *   POST /api/sync/join          → Join a room with roomId + secret
 *   POST /api/sync/push          → Upload encrypted snapshot
 *   GET  /api/sync/pull          → Download latest snapshot
 *   GET  /api/sync/status        → Room info (device count, last sync)
 *   DELETE /api/sync/leave       → Remove device from room
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Room-Id, X-Device-Id, X-Room-Secret',
  'Access-Control-Max-Age': '86400',
};

const MAX_SNAPSHOT_BYTES = 10 * 1024 * 1024; // 10 MB
const ROOM_TTL = 90 * 24 * 60 * 60; // 90 days in seconds

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}

function error(message, status = 400) {
  return json({ error: message }, status);
}

function generateId(length = 12) {
  const chars = 'abcdefghijkmnpqrstuvwxyz23456789';
  const values = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(values, (v) => chars[v % chars.length]).join('');
}

function generateSecret() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

async function hashSecret(secret) {
  const encoder = new TextEncoder();
  const data = encoder.encode(secret);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash), (b) => b.toString(16).padStart(2, '0')).join('');
}

// ─── Route handlers ─────────────────────────────────────────

async function handleCreateRoom(env) {
  const roomId = generateId(8);
  const secret = generateSecret();
  const secretHash = await hashSecret(secret);

  const room = {
    id: roomId,
    secretHash,
    devices: [],
    createdAt: new Date().toISOString(),
    lastSyncAt: null,
  };

  await env.SYNC_KV.put(`room:${roomId}`, JSON.stringify(room), { expirationTtl: ROOM_TTL });

  return json({ roomId, secret });
}

async function handleJoin(request, env) {
  const { roomId, secret, deviceId, deviceName } = await request.json();

  if (!roomId || !secret || !deviceId) {
    return error('roomId, secret, and deviceId are required');
  }

  const roomData = await env.SYNC_KV.get(`room:${roomId}`);
  if (!roomData) return error('Room not found', 404);

  const room = JSON.parse(roomData);
  const secretHash = await hashSecret(secret);

  if (secretHash !== room.secretHash) {
    return error('Invalid secret', 403);
  }

  // Add device if not already joined
  if (!room.devices.find((d) => d.id === deviceId)) {
    room.devices.push({
      id: deviceId,
      name: deviceName || 'Unknown device',
      joinedAt: new Date().toISOString(),
      lastSeenAt: new Date().toISOString(),
    });
  }

  await env.SYNC_KV.put(`room:${roomId}`, JSON.stringify(room), { expirationTtl: ROOM_TTL });

  return json({
    joined: true,
    devices: room.devices.map((d) => ({ id: d.id, name: d.name, lastSeenAt: d.lastSeenAt })),
  });
}

async function handlePush(request, env) {
  const roomId = request.headers.get('X-Room-Id');
  const deviceId = request.headers.get('X-Device-Id');
  const secret = request.headers.get('X-Room-Secret');

  if (!roomId || !deviceId || !secret) {
    return error('Missing headers: X-Room-Id, X-Device-Id, X-Room-Secret');
  }

  // Verify room + secret
  const roomData = await env.SYNC_KV.get(`room:${roomId}`);
  if (!roomData) return error('Room not found', 404);

  const room = JSON.parse(roomData);
  const secretHash = await hashSecret(secret);
  if (secretHash !== room.secretHash) return error('Invalid secret', 403);

  // Read encrypted payload (opaque binary)
  const body = await request.arrayBuffer();
  if (body.byteLength > MAX_SNAPSHOT_BYTES) {
    return error(`Snapshot too large (${body.byteLength} bytes, max ${MAX_SNAPSHOT_BYTES})`);
  }

  // Store snapshot keyed by room
  const meta = {
    deviceId,
    pushedAt: new Date().toISOString(),
    sizeBytes: body.byteLength,
  };

  await env.SYNC_KV.put(`snapshot:${roomId}`, body, { expirationTtl: ROOM_TTL });
  await env.SYNC_KV.put(`snapshot-meta:${roomId}`, JSON.stringify(meta), { expirationTtl: ROOM_TTL });

  // Update room last sync + device last seen
  room.lastSyncAt = meta.pushedAt;
  const device = room.devices.find((d) => d.id === deviceId);
  if (device) device.lastSeenAt = meta.pushedAt;
  await env.SYNC_KV.put(`room:${roomId}`, JSON.stringify(room), { expirationTtl: ROOM_TTL });

  return json({ pushed: true, sizeBytes: body.byteLength });
}

async function handlePull(request, env) {
  const roomId = request.headers.get('X-Room-Id');
  const deviceId = request.headers.get('X-Device-Id');
  const secret = request.headers.get('X-Room-Secret');

  if (!roomId || !deviceId || !secret) {
    return error('Missing headers');
  }

  const roomData = await env.SYNC_KV.get(`room:${roomId}`);
  if (!roomData) return error('Room not found', 404);

  const room = JSON.parse(roomData);
  const secretHash = await hashSecret(secret);
  if (secretHash !== room.secretHash) return error('Invalid secret', 403);

  // Get snapshot metadata
  const metaStr = await env.SYNC_KV.get(`snapshot-meta:${roomId}`);
  if (!metaStr) {
    return json({ hasSnapshot: false });
  }

  const meta = JSON.parse(metaStr);

  // If the snapshot was pushed by this device, skip (no need to pull your own data)
  if (meta.deviceId === deviceId) {
    return json({ hasSnapshot: true, isOwnSnapshot: true, meta });
  }

  const snapshot = await env.SYNC_KV.get(`snapshot:${roomId}`, { type: 'arrayBuffer' });
  if (!snapshot) {
    return json({ hasSnapshot: false });
  }

  // Update device last seen
  const device = room.devices.find((d) => d.id === deviceId);
  if (device) {
    device.lastSeenAt = new Date().toISOString();
    await env.SYNC_KV.put(`room:${roomId}`, JSON.stringify(room), { expirationTtl: ROOM_TTL });
  }

  return new Response(snapshot, {
    status: 200,
    headers: {
      'Content-Type': 'application/octet-stream',
      'X-Snapshot-Meta': JSON.stringify(meta),
      ...CORS_HEADERS,
    },
  });
}

async function handleStatus(request, env) {
  const roomId = request.headers.get('X-Room-Id');
  const secret = request.headers.get('X-Room-Secret');

  if (!roomId || !secret) return error('Missing headers');

  const roomData = await env.SYNC_KV.get(`room:${roomId}`);
  if (!roomData) return error('Room not found', 404);

  const room = JSON.parse(roomData);
  const secretHash = await hashSecret(secret);
  if (secretHash !== room.secretHash) return error('Invalid secret', 403);

  const metaStr = await env.SYNC_KV.get(`snapshot-meta:${roomId}`);
  const snapshotMeta = metaStr ? JSON.parse(metaStr) : null;

  return json({
    roomId: room.id,
    devices: room.devices.map((d) => ({ id: d.id, name: d.name, lastSeenAt: d.lastSeenAt })),
    lastSyncAt: room.lastSyncAt,
    snapshotMeta,
  });
}

async function handleLeave(request, env) {
  const roomId = request.headers.get('X-Room-Id');
  const deviceId = request.headers.get('X-Device-Id');
  const secret = request.headers.get('X-Room-Secret');

  if (!roomId || !deviceId || !secret) return error('Missing headers');

  const roomData = await env.SYNC_KV.get(`room:${roomId}`);
  if (!roomData) return error('Room not found', 404);

  const room = JSON.parse(roomData);
  const secretHash = await hashSecret(secret);
  if (secretHash !== room.secretHash) return error('Invalid secret', 403);

  room.devices = room.devices.filter((d) => d.id !== deviceId);

  if (room.devices.length === 0) {
    // Last device left — clean up
    await env.SYNC_KV.delete(`room:${roomId}`);
    await env.SYNC_KV.delete(`snapshot:${roomId}`);
    await env.SYNC_KV.delete(`snapshot-meta:${roomId}`);
  } else {
    await env.SYNC_KV.put(`room:${roomId}`, JSON.stringify(room), { expirationTtl: ROOM_TTL });
  }

  return json({ left: true });
}

// ─── Main router ────────────────────────────────────────────

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    try {
      if (request.method === 'POST' && path === '/api/sync/create-room') {
        return handleCreateRoom(env);
      }
      if (request.method === 'POST' && path === '/api/sync/join') {
        return handleJoin(request, env);
      }
      if (request.method === 'POST' && path === '/api/sync/push') {
        return handlePush(request, env);
      }
      if (request.method === 'GET' && path === '/api/sync/pull') {
        return handlePull(request, env);
      }
      if (request.method === 'GET' && path === '/api/sync/status') {
        return handleStatus(request, env);
      }
      if (request.method === 'DELETE' && path === '/api/sync/leave') {
        return handleLeave(request, env);
      }

      return error('Not found', 404);
    } catch (err) {
      return error(`Server error: ${err.message}`, 500);
    }
  },
};
