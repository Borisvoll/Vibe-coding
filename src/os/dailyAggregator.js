/**
 * dailyAggregator.js — Pure aggregation functions over daily entries.
 *
 * These are the single source of truth for day/week/month summaries that
 * the Dashboard and future planning views can consume. All functions return
 * stable shapes even when no data exists.
 */

import { getDailyEntry, getAllDailyEntries } from '../stores/daily.js';

// ─── helpers ─────────────────────────────────────────────────────────────────

/** Returns all YYYY-MM-DD dates in an ISO week string (e.g. '2026-W08') */
function datesInWeek(weekStr) {
  const [year, week] = weekStr.split('-W').map(Number);
  // Jan 4 is always in week 1 (ISO)
  const jan4 = new Date(year, 0, 4);
  const startOfWeek = new Date(jan4);
  startOfWeek.setDate(jan4.getDate() - ((jan4.getDay() + 6) % 7) + (week - 1) * 7);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + i);
    return d.toISOString().slice(0, 10);
  });
}

/** Returns all YYYY-MM-DD dates in a month string (e.g. '2026-02') */
function datesInMonth(monthStr) {
  const [year, month] = monthStr.split('-').map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();
  return Array.from({ length: daysInMonth }, (_, i) => {
    const d = i + 1;
    return `${monthStr}-${String(d).padStart(2, '0')}`;
  });
}

// ─── public API ──────────────────────────────────────────────────────────────

/**
 * getDailySummary(mode, date) → { outcomesSet, todosTotal, todosDone, notes }
 *
 * Returns a summary of a single day's entry for a given mode.
 * All fields are zero/empty when no entry exists.
 */
export async function getDailySummary(mode, date) {
  const entry = await getDailyEntry(mode, date);
  if (!entry) {
    return { outcomesSet: 0, todosTotal: 0, todosDone: 0, notes: '' };
  }
  const outcomesSet = (entry.outcomes || []).filter((o) => o.trim().length > 0).length;
  const todosTotal = (entry.todos || []).length;
  const todosDone = (entry.todos || []).filter((t) => t.done).length;
  return { outcomesSet, todosTotal, todosDone, notes: entry.notes || '' };
}

/**
 * getWeeklySummary(mode, weekStr) → {
 *   totalOutcomesSet, totalTodosDone, totalTodosTotal, daysWithEntries
 * }
 *
 * weekStr format: '2026-W08'
 * Aggregates all 7 daily entries for the given mode and week.
 */
export async function getWeeklySummary(mode, weekStr) {
  const dates = datesInWeek(weekStr);
  const entries = await Promise.all(dates.map((d) => getDailyEntry(mode, d)));

  let totalOutcomesSet = 0;
  let totalTodosDone = 0;
  let totalTodosTotal = 0;
  let daysWithEntries = 0;

  for (const entry of entries) {
    if (!entry) continue;
    daysWithEntries += 1;
    totalOutcomesSet += (entry.outcomes || []).filter((o) => o.trim().length > 0).length;
    totalTodosTotal += (entry.todos || []).length;
    totalTodosDone += (entry.todos || []).filter((t) => t.done).length;
  }

  return { totalOutcomesSet, totalTodosDone, totalTodosTotal, daysWithEntries };
}

/**
 * getMonthlySummary(mode, monthStr) → {
 *   totalTodosDone, topOutcome: string|null
 * }
 *
 * monthStr format: '2026-02'
 * topOutcome = most frequently written non-empty outcome string across the month.
 */
export async function getMonthlySummary(mode, monthStr) {
  const dates = datesInMonth(monthStr);
  const entries = await Promise.all(dates.map((d) => getDailyEntry(mode, d)));

  let totalTodosDone = 0;
  const outcomeCounts = new Map();

  for (const entry of entries) {
    if (!entry) continue;
    totalTodosDone += (entry.todos || []).filter((t) => t.done).length;
    for (const outcome of entry.outcomes || []) {
      const trimmed = outcome.trim();
      if (!trimmed) continue;
      outcomeCounts.set(trimmed, (outcomeCounts.get(trimmed) || 0) + 1);
    }
  }

  let topOutcome = null;
  let topCount = 0;
  for (const [text, count] of outcomeCounts) {
    if (count > topCount) {
      topCount = count;
      topOutcome = text;
    }
  }

  return { totalTodosDone, topOutcome };
}
