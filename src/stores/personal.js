import { getAll, getByKey, getRecentByIndex, put } from '../db.js';
import { getToday } from '../utils.js';

const WELLBEING_STORE = 'os_personal_wellbeing';
const INBOX_STORE = 'os_inbox';

/**
 * Get or create today's personal entry.
 * Uses date as ID so upsert is natural.
 */
export async function getTodayEntry() {
  const today = getToday();
  const entry = await getByKey(WELLBEING_STORE, today);
  if (entry) return entry;
  return {
    id: today,
    date: today,
    energy: null,
    mood: '',
    gratitude: '',
    reflection: '',
    journalNote: '',
    habits: { water: false, movement: false, focus: false },
    updated_at: new Date().toISOString(),
  };
}

/**
 * Save (upsert) today's personal entry.
 */
export async function saveTodayEntry(fields) {
  const today = getToday();
  const existing = await getByKey(WELLBEING_STORE, today);
  const entry = {
    ...(existing || { id: today, date: today }),
    ...fields,
    id: today,
    date: today,
    updated_at: new Date().toISOString(),
  };
  await put(WELLBEING_STORE, entry);
  return entry;
}

/**
 * Toggle a single habit for today.
 */
export async function toggleHabit(habitKey) {
  const entry = await getTodayEntry();
  const habits = entry.habits || { water: false, movement: false, focus: false };
  habits[habitKey] = !habits[habitKey];
  return saveTodayEntry({ habits });
}

/**
 * Get "creative sparks" — thought-type inbox items (ideas).
 * Uses reverse cursor on updated_at to scan recent items first, with early exit.
 */
export async function getCreativeSparks(limit = 5) {
  // Fetch recent inbox items (3x limit to account for filtering)
  const recent = await getRecentByIndex(INBOX_STORE, 'updated_at', limit * 3);
  return recent
    .filter((item) => item.status === 'inbox' && item.type === 'thought')
    .slice(0, limit);
}

/**
 * Get recent journal entries (last N that have content).
 * Uses reverse cursor on updated_at to avoid loading all records.
 */
export async function getRecentEntries(limit = 7) {
  // Fetch recent wellbeing entries (3x limit to account for filtering)
  const recent = await getRecentByIndex(WELLBEING_STORE, 'updated_at', limit * 3);
  return recent
    .filter((e) => e.journalNote || e.gratitude || e.reflection)
    .sort((a, b) => (b.date || b.id || '').localeCompare(a.date || a.id || ''))
    .slice(0, limit);
}

/**
 * Calculate the current streak for a single habit key.
 * Looks back through recent entries and counts consecutive days
 * (starting from yesterday or today) where the habit was done.
 */
export async function getHabitStreak(habitKey) {
  // Fetch last 90 days of entries (enough for any reasonable streak)
  const entries = await getRecentByIndex(WELLBEING_STORE, 'updated_at', 90);
  const today = getToday();

  // Build a set of dates where this habit was completed
  const doneSet = new Set();
  for (const e of entries) {
    const date = e.date || e.id;
    if (e.habits && e.habits[habitKey]) {
      doneSet.add(date);
    }
  }

  // Count streak going backwards from today (include today if done)
  let streak = 0;
  const cur = new Date(today + 'T00:00:00');
  while (true) {
    const key = cur.toISOString().slice(0, 10);
    if (doneSet.has(key)) {
      streak++;
      cur.setDate(cur.getDate() - 1);
    } else {
      // Allow one "grace" day gap (yesterday not done but today done)
      // Only for today itself — stop streak if day before yesterday missed
      break;
    }
  }
  return streak;
}

/**
 * Aggregate data for the Personal Dashboard.
 */
export async function getPersonalDashboardData() {
  const today = await getTodayEntry();
  const sparks = await getCreativeSparks(5);
  const recentEntries = await getRecentEntries(3);

  // Compute streaks for all habits
  const habitKeys = ['water', 'movement', 'focus'];
  const streaks = {};
  for (const key of habitKeys) {
    streaks[key] = await getHabitStreak(key);
  }

  return {
    today,
    sparks,
    recentEntries,
    habitsComplete: today.habits
      ? Object.values(today.habits).filter(Boolean).length
      : 0,
    habitsTotal: 3,
    streaks,
  };
}
