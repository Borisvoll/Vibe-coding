import { getByKey, put } from '../../db.js';

const STORE = 'os_personal_reflections';

export async function getReflection(weekKey) {
  return getByKey(STORE, weekKey);
}

export async function saveReflection(weekKey, payload) {
  return put(STORE, { id: weekKey, ...payload, updated_at: new Date().toISOString() });
}
