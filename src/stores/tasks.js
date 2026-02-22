import { getAll, getByKey, getByIndex, put, remove } from '../db.js';
import { getToday } from '../utils.js';
import { validateTask } from './validate.js';

const STORE = 'os_tasks';

export async function getTasksByMode(mode) {
  return getByIndex(STORE, 'mode', mode);
}

export async function getTasksForToday(mode) {
  const today = getToday();
  const byMode = await getTasksByMode(mode);
  return byMode.filter((t) => t.date === today || (!t.date && t.status !== 'done'));
}

export async function getTasksByProject(projectId) {
  const all = await getAll(STORE);
  return all.filter((t) => t.project_id === projectId);
}

export async function addTask(text, mode, date = null, projectId = null) {
  validateTask({ text, mode, date });
  const task = {
    id: crypto.randomUUID(),
    text: text.trim(),
    mode,
    status: 'todo',
    priority: 3,
    date: date || getToday(),
    project_id: projectId || null,
    doneAt: null,
    createdAt: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  await put(STORE, task);
  return task;
}

export async function updateTask(id, changes) {
  const task = await getByKey(STORE, id);
  if (!task) return null;
  const updated = { ...task, ...changes, id, updated_at: new Date().toISOString() };
  await put(STORE, updated);
  return updated;
}

export async function toggleTask(id) {
  const task = await getByKey(STORE, id);
  if (!task) return null;
  const done = task.status === 'done';
  task.status = done ? 'todo' : 'done';
  task.doneAt = done ? null : new Date().toISOString();
  task.updated_at = new Date().toISOString();
  await put(STORE, task);
  return task;
}

export async function deleteTask(id) {
  return remove(STORE, id);
}

/**
 * Permanently delete done tasks whose `doneAt` (or `updated_at`) timestamp
 * is older than `maxAgeDays`. Runs at startup to keep the store lean.
 */
export async function purgeOldDoneTasks(maxAgeDays = 30) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - maxAgeDays);
  const cutoffStr = cutoff.toISOString();

  const doneTasks = await getByIndex(STORE, 'status', 'done');
  const stale = doneTasks.filter((t) => {
    const ts = t.doneAt || t.updated_at || '';
    return ts < cutoffStr;
  });
  await Promise.all(stale.map((t) => remove(STORE, t.id)));
}
