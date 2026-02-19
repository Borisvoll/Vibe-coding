import { getAll, getByKey, put } from '../db.js';

const STORE = 'dailyPlans';
const NOTES_MAX = 500;
const VALID_MODES = ['BPV', 'School', 'Personal'];

function makeId(date, mode) {
  return `${date}__${mode}`;
}

export async function getDailyEntry(mode, date) {
  if (!VALID_MODES.includes(mode)) return null;
  return (await getByKey(STORE, makeId(date, mode))) || null;
}

export async function getAllDailyEntries() {
  const all = await getAll(STORE);
  return all.sort((a, b) => b.date.localeCompare(a.date));
}

export async function saveDailyEntry({ mode, date, outcomes, todos, notes }) {
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error('date: must be a date string (YYYY-MM-DD)');
  }
  if (!VALID_MODES.includes(mode)) {
    throw new Error(`mode: must be one of ${VALID_MODES.join(', ')}`);
  }

  const normalizedOutcomes = Array.isArray(outcomes)
    ? outcomes.slice(0, 3).map((o) => String(o || ''))
    : ['', '', ''];
  while (normalizedOutcomes.length < 3) normalizedOutcomes.push('');

  const entry = {
    id: makeId(date, mode),
    date,
    mode,
    outcomes: normalizedOutcomes,
    todos: Array.isArray(todos)
      ? todos.map((t) => ({
          id: t.id || crypto.randomUUID(),
          text: String(t.text || '').trim(),
          done: Boolean(t.done),
          createdAt: t.createdAt || new Date().toISOString(),
          doneAt: t.doneAt || null,
        }))
      : [],
    notes: String(notes || '').slice(0, NOTES_MAX),
    updatedAt: new Date().toISOString(),
  };

  await put(STORE, entry);
  return entry;
}

export async function saveOutcomes(mode, date, outcomes) {
  const existing = await getDailyEntry(mode, date);
  return saveDailyEntry({
    mode,
    date,
    outcomes,
    todos: existing?.todos || [],
    notes: existing?.notes || '',
  });
}

export async function addTodo(mode, date, text) {
  const text_ = String(text || '').trim();
  if (!text_) return null;
  const existing = await getDailyEntry(mode, date);
  const todo = {
    id: crypto.randomUUID(),
    text: text_,
    done: false,
    createdAt: new Date().toISOString(),
    doneAt: null,
  };
  return saveDailyEntry({
    mode,
    date,
    outcomes: existing?.outcomes || ['', '', ''],
    todos: [...(existing?.todos || []), todo],
    notes: existing?.notes || '',
  });
}

export async function toggleTodo(mode, date, todoId) {
  const existing = await getDailyEntry(mode, date);
  if (!existing) return null;
  const now = new Date().toISOString();
  const todos = existing.todos.map((t) => {
    if (t.id !== todoId) return t;
    const done = !t.done;
    return { ...t, done, doneAt: done ? now : null };
  });
  return saveDailyEntry({ mode, date, outcomes: existing.outcomes, todos, notes: existing.notes });
}

export async function deleteTodo(mode, date, todoId) {
  const existing = await getDailyEntry(mode, date);
  if (!existing) return null;
  const todos = existing.todos.filter((t) => t.id !== todoId);
  return saveDailyEntry({ mode, date, outcomes: existing.outcomes, todos, notes: existing.notes });
}

export async function saveNotes(mode, date, notes) {
  const existing = await getDailyEntry(mode, date);
  return saveDailyEntry({
    mode,
    date,
    outcomes: existing?.outcomes || ['', '', ''],
    todos: existing?.todos || [],
    notes: String(notes || '').slice(0, NOTES_MAX),
  });
}
