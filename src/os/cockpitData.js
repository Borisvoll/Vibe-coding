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
import { getByIndex } from '../db.js';
import { getToday } from '../utils.js';

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
    logbook: logbookEntries != null,
  };

  const template = MODE_ITEMS[mode] || MODE_ITEMS.School;
  return template.map((item) => ({
    ...item,
    done: !!doneMap[item.id],
  }));
}
