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
import { getToday } from '../utils.js';
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
 * Power-user stats panel: 4 key metrics for today.
 * @param {string} mode
 * @returns {Promise<{tasksCompleted:number, streak:number, momentumScore:number, inboxBacklog:number}>}
 */
export async function getCockpitStats(mode) {
  const today = getToday();

  const [allTasks, inboxCount, momentumMap] = await Promise.all([
    getAll('os_tasks').catch(() => []),
    getInboxCount().catch(() => 0),
    getAllProjectsMomentum(mode).catch(() => new Map()),
  ]);

  // Tasks completed today in this mode
  const tasksCompleted = allTasks.filter(
    (t) => t.mode === mode && t.doneAt && t.doneAt.startsWith(today),
  ).length;

  // Days with at least 1 completion
  const daysWithActivity = new Set();
  allTasks.forEach((t) => {
    if (t.mode === mode && t.doneAt) daysWithActivity.add(t.doneAt.slice(0, 10));
  });

  // Streak: consecutive days ending today (if done) or yesterday (if not yet)
  let streak = 0;
  const todayObj = new Date(today + 'T00:00:00');
  const startOffset = tasksCompleted > 0 ? 0 : 1;
  for (let i = startOffset; i <= 365; i++) {
    const d = new Date(todayObj);
    d.setDate(d.getDate() - i);
    const iso = d.toISOString().slice(0, 10);
    if (daysWithActivity.has(iso)) streak++;
    else break;
  }
  if (tasksCompleted > 0) streak++; // count today

  // Average momentum score across active projects
  const scores = [...momentumMap.values()].map((m) => m.score);
  const momentumScore = scores.length > 0
    ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
    : 0;

  return { tasksCompleted, streak, momentumScore, inboxBacklog: inboxCount };
}
