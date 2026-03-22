/**
 * Shared helpers for BORIS Sync Pages Functions
 * KV binding name: SYNC_KV (configure in Cloudflare dashboard)
 */

export const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Room-Id, X-Device-Id, X-Room-Secret',
  'Access-Control-Max-Age': '86400',
};

export const MAX_SNAPSHOT_BYTES = 10 * 1024 * 1024;
export const ROOM_TTL = 90 * 24 * 60 * 60;

export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}

export function error(message, status = 400) {
  return json({ error: message }, status);
}

export function generateId(length = 12) {
  const chars = 'abcdefghijkmnpqrstuvwxyz23456789';
  const values = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(values, (v) => chars[v % chars.length]).join('');
}

export function generateSecret() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export async function hashSecret(secret) {
  const encoder = new TextEncoder();
  const data = encoder.encode(secret);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash), (b) => b.toString(16).padStart(2, '0')).join('');
}

export function getHeaders(request) {
  return {
    roomId: request.headers.get('X-Room-Id'),
    deviceId: request.headers.get('X-Device-Id'),
    secret: request.headers.get('X-Room-Secret'),
  };
}

export async function verifyRoom(kv, roomId, secret) {
  const roomData = await kv.get(`room:${roomId}`);
  if (!roomData) return { room: null, error: error('Room not found', 404) };

  const room = JSON.parse(roomData);
  const secretHash = await hashSecret(secret);

  if (secretHash !== room.secretHash) {
    return { room: null, error: error('Invalid secret', 403) };
  }

  return { room, error: null };
}
