import { getAll, getByIndex, put } from '../db.js';
import { getISOWeek } from '../utils.js';
import { validateHoursEntry, validateLogbookEntry } from './validate.js';

// ===== Hours =====

const HOURS_STORE = 'hours';

export async function getHoursForDate(date) {
  const results = await getByIndex(HOURS_STORE, 'date', date);
  return results[0] || null;
}

export async function getHoursForWeek(week) {
  return getByIndex(HOURS_STORE, 'week', week);
}

export async function getAllHours() {
  const all = await getAll(HOURS_STORE);
  return all.sort((a, b) => a.date.localeCompare(b.date));
}

export async function saveHoursEntry(data) {
  const week = data.week || getISOWeek(data.date);
  const payload = { ...data, week };
  validateHoursEntry(payload);

  const existing = await getHoursForDate(data.date);
  const entry = {
    id: existing?.id || crypto.randomUUID(),
    date: data.date,
    week,
    type: data.type,
    value: data.value,
    startTime: data.startTime || null,
    endTime: data.endTime || null,
    breakMinutes: data.breakMinutes ?? null,
    updatedAt: new Date().toISOString(),
  };
  await put(HOURS_STORE, entry);
  return entry;
}

// ===== Logbook =====

const LOGBOOK_STORE = 'logbook';

export async function getLogbookForDate(date) {
  const results = await getByIndex(LOGBOOK_STORE, 'date', date);
  return results.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function getLogbookForWeek(week) {
  const results = await getByIndex(LOGBOOK_STORE, 'week', week);
  return results.sort((a, b) => b.date.localeCompare(a.date));
}

export async function getAllLogbook() {
  const all = await getAll(LOGBOOK_STORE);
  return all.sort((a, b) => b.date.localeCompare(a.date));
}

export async function saveLogbookEntry(data) {
  const week = data.week || getISOWeek(data.date);
  const payload = { ...data, week };
  validateLogbookEntry(payload);

  const entry = {
    id: data.id || crypto.randomUUID(),
    date: data.date,
    week,
    tags: Array.isArray(data.tags) ? data.tags : [],
    text: data.text.trim(),
    updatedAt: new Date().toISOString(),
  };
  await put(LOGBOOK_STORE, entry);
  return entry;
}
