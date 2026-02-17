import { getAll, getByKey, getSetting, put, remove, setSetting } from '../../db.js';
import { generateId, getToday } from '../../utils.js';
import { getTaskCap } from '../../core/modeCaps.js';

const TASK_STORE = 'os_school_milestones';
const PROJECT_STORE = 'os_school_projects';

function dayKey() {
  return `os_school_today_learning_${getToday()}`;
}

export async function listFocusTasks() {
  const all = await getAll(TASK_STORE).catch(() => []);
  return all.slice(0, getTaskCap('School'));
}

export async function addFocusTask(title) {
  const list = await listFocusTasks();
  if (list.length >= getTaskCap('School')) return false;
  await put(TASK_STORE, { id: generateId(), title, dueDate: getToday(), updated_at: new Date().toISOString() });
  return true;
}

export async function removeFocusTask(id) {
  await remove(TASK_STORE, id);
}

export async function getCurrentProjectPointer() {
  return getByKey(PROJECT_STORE, 'current');
}

export async function getLearningCapture() {
  return (await getSetting(dayKey())) || '';
}

export async function saveLearningCapture(value) {
  return setSetting(dayKey(), String(value || '').trim());
}
