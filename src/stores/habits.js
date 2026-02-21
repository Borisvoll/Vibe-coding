import { getAll, getByKey, getByIndex, put, remove } from '../db.js';
import { getToday, formatDateISO } from '../utils.js';

const STORE = 'os_habits';
const LOG_STORE = 'os_habit_logs';

// ── Habit definitions ────────────────────────────────────────

export async function getHabitsByMode(mode) {
  const all = await getByIndex(STORE, 'mode', mode);
  return all.filter((h) => !h.archived);
}

export async function getAllHabits() {
  return getAll(STORE);
}

export async function addHabit(name, mode, { icon = '✓', color = null } = {}) {
  const habit = {
    id: crypto.randomUUID(),
    name: name.trim(),
    mode,
    icon,
    color,
    archived: false,
    order: Date.now(),
    createdAt: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  await put(STORE, habit);
  return habit;
}

export async function updateHabit(id, changes) {
  const habit = await getByKey(STORE, id);
  if (!habit) return null;
  const updated = { ...habit, ...changes, id, updated_at: new Date().toISOString() };
  await put(STORE, updated);
  return updated;
}

export async function archiveHabit(id) {
  return updateHabit(id, { archived: true });
}

export async function deleteHabit(id) {
  return remove(STORE, id);
}

// ── Habit logs (daily completions) ───────────────────────────

/**
 * Toggle a habit log for today (or given date).
 * Returns { completed: boolean }
 */
export async function toggleHabitLog(habitId, date = null) {
  const d = date || getToday();
  const logId = `${habitId}__${d}`;
  const existing = await getByKey(LOG_STORE, logId);

  if (existing) {
    await remove(LOG_STORE, logId);
    return { completed: false };
  }

  const log = {
    id: logId,
    habit_id: habitId,
    date: d,
    completedAt: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  await put(LOG_STORE, log);
  return { completed: true };
}

export async function getHabitLogForDate(habitId, date) {
  return getByKey(LOG_STORE, `${habitId}__${date}`);
}

export async function getLogsForDate(date) {
  return getByIndex(LOG_STORE, 'date', date);
}

export async function getLogsForHabit(habitId) {
  return getByIndex(LOG_STORE, 'habit_id', habitId);
}

// ── Streak calculation ───────────────────────────────────────

/**
 * Calculate the current streak (consecutive days ending today or yesterday).
 * Returns the number of consecutive days the habit was completed.
 */
export async function getStreak(habitId) {
  const logs = await getLogsForHabit(habitId);
  const logDates = new Set(logs.map((l) => l.date));

  let streak = 0;
  const d = new Date();

  // If not completed today, start counting from yesterday
  const todayStr = formatDateISO(d);
  if (!logDates.has(todayStr)) {
    d.setDate(d.getDate() - 1);
  }

  while (true) {
    const dateStr = formatDateISO(d);
    if (!logDates.has(dateStr)) break;
    streak += 1;
    d.setDate(d.getDate() - 1);
  }

  return streak;
}

/**
 * Get the last N days of completion data for a habit (for sparkline/grid).
 * Returns array of { date, completed } ordered oldest → newest.
 */
export async function getHabitHistory(habitId, days = 7) {
  const logs = await getLogsForHabit(habitId);
  const logDates = new Set(logs.map((l) => l.date));

  const result = [];
  const ref = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(ref);
    d.setDate(ref.getDate() - i);
    const dateStr = formatDateISO(d);
    result.push({ date: dateStr, completed: logDates.has(dateStr) });
  }
  return result;
}

/**
 * Get completion stats for all habits in a mode for today.
 * Returns Map<habitId, boolean>
 */
export async function getTodayCompletions(mode) {
  const today = getToday();
  const [habits, todayLogs] = await Promise.all([
    getHabitsByMode(mode),
    getLogsForDate(today),
  ]);

  const completedIds = new Set(todayLogs.map((l) => l.habit_id));
  const result = new Map();
  habits.forEach((h) => result.set(h.id, completedIds.has(h.id)));
  return result;
}
