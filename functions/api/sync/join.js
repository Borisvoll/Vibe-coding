import { json, error, hashSecret, CORS_HEADERS, ROOM_TTL } from './_helpers.js';

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export async function onRequestPost(context) {
  const kv = context.env.SYNC_KV;
  if (!kv) return error('KV not configured', 500);

  const { roomId, secret, deviceId, deviceName } = await context.request.json();

  if (!roomId || !secret || !deviceId) {
    return error('roomId, secret, and deviceId are required');
  }

  const roomData = await kv.get(`room:${roomId}`);
  if (!roomData) return error('Room not found', 404);

  const room = JSON.parse(roomData);
  const secretHash = await hashSecret(secret);

  if (secretHash !== room.secretHash) {
    return error('Invalid secret', 403);
  }

  if (!room.devices.find((d) => d.id === deviceId)) {
    room.devices.push({
      id: deviceId,
      name: deviceName || 'Unknown device',
      joinedAt: new Date().toISOString(),
      lastSeenAt: new Date().toISOString(),
    });
  }

  await kv.put(`room:${roomId}`, JSON.stringify(room), { expirationTtl: ROOM_TTL });

  return json({
    joined: true,
    devices: room.devices.map((d) => ({ id: d.id, name: d.name, lastSeenAt: d.lastSeenAt })),
  });
}
