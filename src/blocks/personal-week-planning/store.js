import { getAll, put, remove } from '../../db.js';
import { generateId } from '../../utils.js';

const STORE = 'os_personal_week_plan';

export async function listWeekPlan() {
  return (await getAll(STORE).catch(() => [])).sort((a, b) => String(a.day || '').localeCompare(String(b.day || '')));
}

export async function addWeekItem(item) {
  return put(STORE, { id: generateId(), ...item, updated_at: new Date().toISOString() });
}

export async function deleteWeekItem(id) {
  return remove(STORE, id);
}
