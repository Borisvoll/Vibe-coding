import { getAll, getSetting, setSetting } from '../db.js';
import { getToday, getISOWeek, getWeekDates, formatMinutes, formatDateShort } from '../utils.js';
import { getWeeklyOverview } from './bpv.js';

const WELLBEING_STORE = 'os_personal_wellbeing';
const TASKS_STORE = 'os_tasks';
const PROJECTS_STORE = 'os_projects';
const INBOX_STORE = 'os_inbox';

/**
 * Rotating weekly reflection prompts — gentle, emotionally-aware.
 */
const REFLECTION_PROMPTS = [
  'Welk moment deze week bracht je het meest tot leven?',
  'Waar voelde je weerstand? Dat is vaak waar groei begint.',
  'Wat zou je tegen je toekomstige zelf willen zeggen over deze week?',
  'Welke emotie was het sterkst aanwezig deze week?',
  'Waar ben je trots op, ook al is het klein?',
  'Wat wil je volgende week anders voelen?',
  'Welk gesprek of moment raakte je?',
  'Wat leer je over jezelf als je terugkijkt op deze week?',
];

/**
 * Get a deterministic prompt for a given week.
 */
export function getWeeklyPrompt(weekStr) {
  const weekNum = parseInt(weekStr.split('-W')[1], 10) || 0;
  return REFLECTION_PROMPTS[weekNum % REFLECTION_PROMPTS.length];
}

/**
 * Aggregate all data for the weekly review email.
 */
export async function aggregateWeeklyReview(weekStr = null) {
  const today = getToday();
  const week = weekStr || getISOWeek(today);
  const weekDates = getWeekDates(week);
  const weekStart = weekDates[0];
  const weekEnd = weekDates[4];

  // Tasks completed this week
  const allTasks = await getAll(TASKS_STORE);
  const completedTasks = allTasks.filter((t) =>
    t.status === 'done' &&
    t.doneAt &&
    t.doneAt.slice(0, 10) >= weekStart &&
    t.doneAt.slice(0, 10) <= weekEnd
  ).sort((a, b) => (a.doneAt || '').localeCompare(b.doneAt || ''));

  const openTasks = allTasks.filter((t) => t.status === 'todo');

  // BPV hours
  const bpv = await getWeeklyOverview(week);

  // Wellbeing / journal entries for this week
  const allWellbeing = await getAll(WELLBEING_STORE);
  const weekEntries = allWellbeing.filter((e) => {
    const d = e.date || e.id || '';
    return d >= weekStart && d <= weekEnd;
  }).sort((a, b) => (a.date || a.id || '').localeCompare(b.date || b.id || ''));

  // Extract gratitude, reflections, journal notes
  const gratitude = weekEntries
    .filter((e) => e.gratitude)
    .map((e) => ({ date: e.date || e.id, text: e.gratitude }));

  const reflections = weekEntries
    .filter((e) => e.reflection)
    .map((e) => ({ date: e.date || e.id, text: e.reflection }));

  const journalNotes = weekEntries
    .filter((e) => e.journalNote)
    .map((e) => ({ date: e.date || e.id, text: e.journalNote }));

  // Habits summary
  const habitsData = weekEntries.map((e) => e.habits || {});
  const habitKeys = ['water', 'movement', 'focus'];
  const habitsSummary = {};
  for (const key of habitKeys) {
    const done = habitsData.filter((h) => h[key]).length;
    habitsSummary[key] = { done, total: habitsData.length || 5 };
  }

  // Projects
  const allProjects = await getAll(PROJECTS_STORE);
  const activeProjects = allProjects.filter((p) => p.status === 'active');

  // Inbox processed this week
  const allInbox = await getAll(INBOX_STORE);
  const processedInbox = allInbox.filter((item) =>
    item.status !== 'inbox' &&
    item.updated_at &&
    item.updated_at.slice(0, 10) >= weekStart &&
    item.updated_at.slice(0, 10) <= weekEnd
  );

  const prompt = getWeeklyPrompt(week);

  return {
    week,
    weekStart,
    weekEnd,
    weekStartFormatted: formatDateShort(weekStart),
    weekEndFormatted: formatDateShort(weekEnd),
    completedTasks,
    completedTaskCount: completedTasks.length,
    openTaskCount: openTasks.length,
    bpv: {
      totalMinutes: bpv.totalMinutes,
      formattedTotal: bpv.formattedTotal,
      targetMinutes: bpv.targetMinutes,
      formattedTarget: bpv.formattedTarget,
      percentComplete: bpv.percentComplete,
    },
    gratitude,
    reflections,
    journalNotes,
    habitsSummary,
    activeProjects: activeProjects.map((p) => ({
      title: p.title,
      mode: p.mode,
    })),
    processedInboxCount: processedInbox.length,
    prompt,
  };
}

/**
 * Check if the weekly review has been sent for the given week.
 */
export async function isReviewSent(weekStr) {
  const key = `weekly_review_sent_${weekStr}`;
  return !!(await getSetting(key));
}

/**
 * Mark the weekly review as sent for the given week.
 */
export async function markReviewSent(weekStr) {
  const key = `weekly_review_sent_${weekStr}`;
  await setSetting(key, new Date().toISOString());
}

/**
 * Check if today is Friday.
 */
export function isFriday() {
  return new Date().getDay() === 5;
}

/**
 * Send the weekly review by posting data to the serverless function.
 */
export async function sendWeeklyReview(data) {
  const response = await fetch('/.netlify/functions/send-weekly-review', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => 'Unknown error');
    throw new Error(`Failed to send: ${response.status} — ${body}`);
  }

  return response.json();
}
