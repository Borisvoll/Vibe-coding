import { json, error, getHeaders, verifyRoom, CORS_HEADERS, ROOM_TTL } from './_helpers.js';

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export async function onRequestDelete(context) {
  const kv = context.env.SYNC_KV;
  if (!kv) return error('KV not configured', 500);

  const { roomId, deviceId, secret } = getHeaders(context.request);
  if (!roomId || !deviceId || !secret) return error('Missing headers');

  const { room, error: verifyError } = await verifyRoom(kv, roomId, secret);
  if (verifyError) return verifyError;

  room.devices = room.devices.filter((d) => d.id !== deviceId);

  if (room.devices.length === 0) {
    await kv.delete(`room:${roomId}`);
    await kv.delete(`snapshot:${roomId}`);
    await kv.delete(`snapshot-meta:${roomId}`);
  } else {
    await kv.put(`room:${roomId}`, JSON.stringify(room), { expirationTtl: ROOM_TTL });
  }

  return json({ left: true });
}
