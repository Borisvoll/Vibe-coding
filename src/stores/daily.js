import { getAll, getByIndex, getByKey, put } from '../db.js';
import { validateDailyEntry } from './validate.js';

const STORE = 'dailyPlans';

export async function getDailyEntry(date) {
  const results = await getByIndex(STORE, 'date', date);
  return results[0] || null;
}

export async function getAllDailyEntries() {
  const all = await getAll(STORE);
  return all.sort((a, b) => b.date.localeCompare(a.date));
}

export async function saveDailyEntry(data) {
  validateDailyEntry(data);

  const existing = await getDailyEntry(data.date);
  const entry = {
    id: existing?.id || crypto.randomUUID(),
    date: data.date,
    tasks: data.tasks.map((t) => ({
      text: t.text.trim(),
      done: Boolean(t.done),
    })),
    evaluation: data.evaluation?.trim() || null,
    updatedAt: new Date().toISOString(),
  };
  await put(STORE, entry);
  return entry;
}

export async function toggleDailyTask(date, taskIndex) {
  const entry = await getDailyEntry(date);
  if (!entry || !entry.tasks[taskIndex]) return null;
  entry.tasks[taskIndex].done = !entry.tasks[taskIndex].done;
  entry.updatedAt = new Date().toISOString();
  await put(STORE, entry);
  return entry;
}
