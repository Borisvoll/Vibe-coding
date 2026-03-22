import { json, error, getHeaders, verifyRoom, CORS_HEADERS } from './_helpers.js';

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export async function onRequestGet(context) {
  const kv = context.env.SYNC_KV;
  if (!kv) return error('KV not configured', 500);

  const { roomId, secret } = getHeaders(context.request);
  if (!roomId || !secret) return error('Missing headers');

  const { room, error: verifyError } = await verifyRoom(kv, roomId, secret);
  if (verifyError) return verifyError;

  const metaStr = await kv.get(`snapshot-meta:${roomId}`);

  return json({
    roomId: room.id,
    devices: room.devices.map((d) => ({ id: d.id, name: d.name, lastSeenAt: d.lastSeenAt })),
    lastSyncAt: room.lastSyncAt,
    snapshotMeta: metaStr ? JSON.parse(metaStr) : null,
  });
}
