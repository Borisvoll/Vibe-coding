import { getAll, put, remove } from '../../db.js';
import { generateId } from '../../utils.js';

const STORE = 'os_school_milestones';

export async function listMilestones() {
  const all = await getAll(STORE).catch(() => []);
  return all.sort((a, b) => String(a.dueDate || '').localeCompare(String(b.dueDate || '')));
}

export async function addMilestone(payload) {
  return put(STORE, {
    id: generateId(),
    ...payload,
    updated_at: new Date().toISOString(),
  });
}

export async function deleteMilestone(id) {
  return remove(STORE, id);
}
