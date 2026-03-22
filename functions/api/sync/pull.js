import { json, error, getHeaders, verifyRoom, CORS_HEADERS, ROOM_TTL } from './_helpers.js';

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export async function onRequestGet(context) {
  const kv = context.env.SYNC_KV;
  if (!kv) return error('KV not configured', 500);

  const { roomId, deviceId, secret } = getHeaders(context.request);
  if (!roomId || !deviceId || !secret) {
    return error('Missing headers');
  }

  const { room, error: verifyError } = await verifyRoom(kv, roomId, secret);
  if (verifyError) return verifyError;

  const metaStr = await kv.get(`snapshot-meta:${roomId}`);
  if (!metaStr) {
    return json({ hasSnapshot: false });
  }

  const meta = JSON.parse(metaStr);

  // Skip pulling your own snapshot
  if (meta.deviceId === deviceId) {
    return json({ hasSnapshot: true, isOwnSnapshot: true, meta });
  }

  const snapshot = await kv.get(`snapshot:${roomId}`, { type: 'arrayBuffer' });
  if (!snapshot) {
    return json({ hasSnapshot: false });
  }

  // Update device last seen
  const device = room.devices.find((d) => d.id === deviceId);
  if (device) {
    device.lastSeenAt = new Date().toISOString();
    await kv.put(`room:${roomId}`, JSON.stringify(room), { expirationTtl: ROOM_TTL });
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
