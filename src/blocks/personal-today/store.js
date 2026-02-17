import { getAll, put, remove } from '../../db.js';
import { generateId } from '../../utils.js';

const TASK_STORE = 'os_personal_tasks';
const AGENDA_STORE = 'os_personal_agenda';
const ACTION_STORE = 'os_personal_actions';
const WELLBEING_STORE = 'os_personal_wellbeing';

export async function listTasks() {
  return (await getAll(TASK_STORE).catch(() => [])).sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));
}

export async function addTask(text) {
  return put(TASK_STORE, { id: generateId(), text, createdAt: new Date().toISOString(), updated_at: new Date().toISOString() });
}

export async function removeTask(id) { return remove(TASK_STORE, id); }

export async function listAgenda() {
  return (await getAll(AGENDA_STORE).catch(() => [])).sort((a, b) => String(a.start || '').localeCompare(String(b.start || '')));
}

export async function addAgenda(item) {
  return put(AGENDA_STORE, { id: generateId(), ...item, updated_at: new Date().toISOString() });
}

export async function removeAgenda(id) { return remove(AGENDA_STORE, id); }

export async function getMeaningfulAction() {
  return (await getAll(ACTION_STORE).catch(() => []))[0] || null;
}

export async function saveMeaningfulAction(text) {
  const existing = await getMeaningfulAction();
  return put(ACTION_STORE, { id: existing?.id || 'today-action', text, updated_at: new Date().toISOString() });
}

export async function getWellbeingLine() {
  const record = (await getAll(WELLBEING_STORE).catch(() => []))[0] || null;
  return record?.line || '';
}

export async function saveWellbeingLine(line) {
  const record = (await getAll(WELLBEING_STORE).catch(() => []))[0] || null;
  return put(WELLBEING_STORE, { id: record?.id || 'today-wellbeing-line', line, updated_at: new Date().toISOString() });
}
