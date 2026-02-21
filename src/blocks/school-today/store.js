import { getByKey, getSetting, setSetting } from '../../db.js';
import { getToday, generateId } from '../../utils.js';
import { addTask, getTasksForToday, deleteTask } from '../../stores/tasks.js';
import { getTaskCap } from '../../core/modeCaps.js';

const MODE = 'School';
const PROJECT_STORE = 'os_school_projects';
const HOMEWORK_SETTING = 'os_school_homework_list';

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

// ── Homework / Assignment queue ────────────────────────────────

export async function listHomework() {
  const raw = await getSetting(HOMEWORK_SETTING);
  const items = Array.isArray(raw) ? raw : [];
  return items.sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    return String(a.dueDate || '9999').localeCompare(String(b.dueDate || '9999'));
  });
}

export async function addHomework({ title, subject, dueDate }) {
  const raw = await getSetting(HOMEWORK_SETTING);
  const items = Array.isArray(raw) ? raw : [];
  items.push({
    id: generateId(),
    title: String(title || '').trim(),
    subject: String(subject || '').trim(),
    dueDate: dueDate || '',
    done: false,
    createdAt: new Date().toISOString(),
  });
  return setSetting(HOMEWORK_SETTING, items);
}

export async function toggleHomework(id) {
  const raw = await getSetting(HOMEWORK_SETTING);
  const items = Array.isArray(raw) ? raw : [];
  const idx = items.findIndex((i) => i.id === id);
  if (idx === -1) return;
  items[idx] = { ...items[idx], done: !items[idx].done };
  return setSetting(HOMEWORK_SETTING, items);
}

export async function deleteHomework(id) {
  const raw = await getSetting(HOMEWORK_SETTING);
  const items = Array.isArray(raw) ? raw : [];
  return setSetting(HOMEWORK_SETTING, items.filter((i) => i.id !== id));
}
