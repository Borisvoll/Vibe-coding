import { json, error, generateId, generateSecret, hashSecret, CORS_HEADERS, ROOM_TTL } from './_helpers.js';

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export async function onRequestPost(context) {
  const kv = context.env.SYNC_KV;
  if (!kv) return error('KV not configured', 500);

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

  await kv.put(`room:${roomId}`, JSON.stringify(room), { expirationTtl: ROOM_TTL });

  return json({ roomId, secret });
}
