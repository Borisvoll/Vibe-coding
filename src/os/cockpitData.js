/**
 * Cockpit data — computes the "what to do now" checklist items per mode.
 * Used by both the daily-cockpit block and the dashboard vandaag widget.
 *
 * Pure async function, reads from existing stores, no side effects.
 */

import { getDailyEntry } from '../stores/daily.js';
import { getInboxCount } from '../stores/inbox.js';
import { getActiveProjects } from '../stores/projects.js';
import { getHoursEntry } from '../stores/bpv.js';
import { getByIndex, getAll } from '../db.js';
import { getToday, formatDateISO } from '../utils.js';
import { getAllProjectsMomentum } from '../stores/momentum.js';

/**
 * @typedef {Object} CockpitItem
 * @property {string} id       — unique key
 * @property {string} label    — display text (Dutch)
 * @property {boolean} done    — computed from real data
 * @property {string} deepLink — action type for the view to handle
 */

const MODE_ITEMS = {
  School: [
    { id: 'outcomes',  label: 'Top 3 ingevuld',      deepLink: 'outcomes' },
    { id: 'task',      label: '1 taak gedaan',        deepLink: 'todos' },
    { id: 'inbox',     label: 'Inbox verwerkt',       deepLink: 'inbox' },
    { id: 'project',   label: 'Project actie gezet',  deepLink: 'projects' },
  ],
  Personal: [
    { id: 'outcomes',  label: 'Top 3 ingevuld',           deepLink: 'outcomes' },
    { id: 'task',      label: '1 taak gedaan',             deepLink: 'todos' },
    { id: 'reflect',   label: '1 reflectie geschreven',    deepLink: 'reflection' },
    { id: 'inbox',     label: 'Inbox verwerkt',            deepLink: 'inbox' },
  ],
  BPV: [
    { id: 'outcomes',  label: 'Top 3 ingevuld',       deepLink: 'outcomes' },
    { id: 'hours',     label: 'Uren ingevuld',        deepLink: 'hours' },
    { id: 'logbook',   label: 'Logboek bijgewerkt',   deepLink: 'logbook' },
    { id: 'task',      label: '1 taak gedaan',        deepLink: 'todos' },
  ],
};

/**
 * Get cockpit items with live done-state for the given mode.
 * @param {string} mode — 'School' | 'Personal' | 'BPV'
 * @returns {Promise<CockpitItem[]>}
 */
export async function getCockpitItems(mode) {
  const today = getToday();

  const [dailyEntry, inboxCount, activeProjects, hoursEntry, logbookEntries] = await Promise.all([
    getDailyEntry(mode, today),
    getInboxCount(),
    getActiveProjects(mode),
    mode === 'BPV' ? getHoursEntry(today) : null,
    mode === 'BPV' ? getByIndex('logbook', 'date', today).catch(() => null) : null,
  ]);

  const outcomes = dailyEntry?.outcomes || [];
  const todos = dailyEntry?.todos || [];
  const notes = dailyEntry?.notes || '';

  const doneMap = {
    outcomes: outcomes.filter((o) => o && o.trim()).length >= 3,
    task: todos.some((t) => t.done),
    inbox: inboxCount === 0,
    project: activeProjects.some((p) => p.nextAction),
    reflect: notes.trim().length > 0,
    hours: hoursEntry != null,
    logbook: Array.isArray(logbookEntries) ? logbookEntries.length > 0 : logbookEntries != null,
  };

  const template = MODE_ITEMS[mode] || MODE_ITEMS.School;
  return template.map((item) => ({
    ...item,
    done: !!doneMap[item.id],
  }));
}

/**
 * Get the 4 cockpit stats: gedaan, streak, momentum, inbox.
 * @param {string} mode
 * @returns {Promise<{done: number, streak: number, momentum: number, inbox: number}>}
 */
export async function getCockpitStats(mode) {
  const today = getToday();

  const [dailyEntry, inboxCount, momentumMap] = await Promise.all([
    getDailyEntry(mode, today),
    getInboxCount(),
    getAllProjectsMomentum(mode).catch(() => new Map()),
  ]);

  // Done: tasks completed today in this mode
  const todos = dailyEntry?.todos || [];
  const done = todos.filter((t) => t.done).length;

  // Streak: consecutive days with at least 1 completed task
  let streak = done > 0 ? 1 : 0;
  try {
    const allPlans = await getAll('dailyPlans');
    const modePlans = allPlans
      .filter((p) => p.mode === mode && p.date < today)
      .sort((a, b) => b.date.localeCompare(a.date));

    for (const plan of modePlans) {
      const planTodos = plan.todos || [];
      if (planTodos.some((t) => t.done)) {
        streak++;
      } else {
        break;
      }
    }
  } catch { /* non-critical */ }

  // Momentum: average score across active projects (0-100 scale)
  let momentum = 0;
  if (momentumMap.size > 0) {
    let totalScore = 0;
    for (const m of momentumMap.values()) {
      totalScore += m.score;
    }
    const avgScore = totalScore / momentumMap.size;
    momentum = Math.min(Math.round((avgScore / 40) * 100), 100);
  }

  return { done, streak, momentum, inbox: inboxCount };
}
