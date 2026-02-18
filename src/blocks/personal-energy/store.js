import { getByKey, put } from '../../db.js';

const STORE = 'os_personal_wellbeing';
const ID = 'today';

export async function getWellbeing() {
  return getByKey(STORE, ID);
}

export async function saveWellbeing(payload) {
  return put(STORE, { id: ID, ...payload, updated_at: new Date().toISOString() });
}
