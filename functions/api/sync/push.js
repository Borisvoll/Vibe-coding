import { json, error, getHeaders, verifyRoom, CORS_HEADERS, MAX_SNAPSHOT_BYTES, ROOM_TTL } from './_helpers.js';

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export async function onRequestPost(context) {
  const kv = context.env.SYNC_KV;
  if (!kv) return error('KV not configured', 500);

  const { roomId, deviceId, secret } = getHeaders(context.request);
  if (!roomId || !deviceId || !secret) {
    return error('Missing headers: X-Room-Id, X-Device-Id, X-Room-Secret');
  }

  const { room, error: verifyError } = await verifyRoom(kv, roomId, secret);
  if (verifyError) return verifyError;

  const body = await context.request.arrayBuffer();
  if (body.byteLength > MAX_SNAPSHOT_BYTES) {
    return error(`Snapshot too large (${body.byteLength} bytes, max ${MAX_SNAPSHOT_BYTES})`);
  }

  const meta = {
    deviceId,
    pushedAt: new Date().toISOString(),
    sizeBytes: body.byteLength,
  };

  await kv.put(`snapshot:${roomId}`, body, { expirationTtl: ROOM_TTL });
  await kv.put(`snapshot-meta:${roomId}`, JSON.stringify(meta), { expirationTtl: ROOM_TTL });

  room.lastSyncAt = meta.pushedAt;
  const device = room.devices.find((d) => d.id === deviceId);
  if (device) device.lastSeenAt = meta.pushedAt;
  await kv.put(`room:${roomId}`, JSON.stringify(room), { expirationTtl: ROOM_TTL });

  return json({ pushed: true, sizeBytes: body.byteLength });
}
