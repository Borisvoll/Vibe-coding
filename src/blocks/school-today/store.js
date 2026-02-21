import { getByKey, getSetting, setSetting } from '../../db.js';
import { getToday } from '../../utils.js';
import { addTask, getTasksForToday, deleteTask } from '../../stores/tasks.js';
import { getTaskCap } from '../../core/modeCaps.js';

const MODE = 'School';
const PROJECT_STORE = 'os_school_projects';

function dayKey() {
  return `os_school_today_learning_${getToday()}`;
}

export async function listFocusTasks() {
  const tasks = await getTasksForToday(MODE);
  return tasks.filter((t) => t.status !== 'done').slice(0, getTaskCap(MODE));
}

export async function addFocusTask(title) {
  await addTask(title, MODE);
  return true;
}

export async function removeFocusTask(id) {
  await deleteTask(id);
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
