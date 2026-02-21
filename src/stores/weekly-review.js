import { getAll, getByIndex, getByIndexRange, getSetting, setSetting } from '../db.js';
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
  const weekStart = weekDates[0]; // Monday
  // Include weekend: Sunday = Friday + 2 days
  const fri = new Date(weekDates[4] + 'T00:00:00');
  fri.setDate(fri.getDate() + 2);
  const weekEnd = fri.toISOString().slice(0, 10); // Sunday

  // Tasks: use date-range query instead of loading all tasks ever.
  // os_tasks has a 'date' index; filter completed tasks in-memory from the week range.
  const weekTasks = await getByIndexRange(TASKS_STORE, 'date', weekStart, weekEnd);
  const completedTasks = weekTasks.filter((t) =>
    t.status === 'done' &&
    t.doneAt &&
    t.doneAt.slice(0, 10) >= weekStart &&
    t.doneAt.slice(0, 10) <= weekEnd
  ).sort((a, b) => (a.doneAt || '').localeCompare(b.doneAt || ''));

  // Open task count: use status index (small result set, not a full scan)
  const openTasks = await getByIndex(TASKS_STORE, 'status', 'todo');

  // BPV hours
  const bpv = await getWeeklyOverview(week);

  // Wellbeing: records are keyed by date (id = date string), use primary key range.
  // os_personal_wellbeing has updated_at index, but IDs are date strings — direct range works.
  const weekEntries = await getByIndexRange(WELLBEING_STORE, 'updated_at', weekStart, weekEnd + 'T23:59:59.999Z').then(
    (all) => all.filter((e) => {
      const d = e.date || e.id || '';
      return d >= weekStart && d <= weekEnd;
    }).sort((a, b) => (a.date || a.id || '').localeCompare(b.date || b.id || ''))
  ).catch(() => []);

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

  // Projects (small store — full scan is acceptable)
  const allProjects = await getAll(PROJECTS_STORE);
  const activeProjects = allProjects.filter((p) => p.status === 'active');

  // Inbox: use updated_at range instead of loading all inbox items
  const weekInbox = await getByIndexRange(INBOX_STORE, 'updated_at', weekStart, weekEnd + 'T23:59:59.999Z').catch(() => []);
  const processedInbox = weekInbox.filter((item) =>
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
 * Send the weekly review by opening the user's email client via mailto:.
 */
export async function sendWeeklyReview(data) {
  return openMailtoFallback(data);
}

/**
 * Build a plain-text summary and open the user's email client.
 */
function openMailtoFallback(data) {
  const {
    week = '', weekStartFormatted = '', weekEndFormatted = '',
    completedTaskCount = 0, completedTasks = [], openTaskCount = 0,
    bpv = {}, gratitude = [], reflections = [], journalNotes = [],
    habitsSummary = {}, activeProjects = [], processedInboxCount = 0, prompt = '',
  } = data;

  const habitLabels = { water: 'Water', movement: 'Bewegen', focus: 'Focus' };
  const lines = [];

  lines.push(`BORIS — Weekoverzicht ${week}`);
  lines.push(`${weekStartFormatted} — ${weekEndFormatted}`);
  lines.push('');
  lines.push(`Taken klaar: ${completedTaskCount}  |  BPV-uren: ${bpv.formattedTotal || '0u'}  |  Verwerkt: ${processedInboxCount}`);

  if (bpv.totalMinutes > 0) {
    lines.push(`BPV voortgang: ${bpv.formattedTotal || '0u'} / ${bpv.formattedTarget || '40u'} (${bpv.percentComplete || 0}%)`);
  }

  if (completedTasks.length > 0) {
    lines.push('', '— Afgeronde taken —');
    completedTasks.slice(0, 15).forEach((t) => lines.push(`  ✓ ${t.text}`));
    if (completedTaskCount > 15) lines.push(`  + ${completedTaskCount - 15} meer`);
    if (openTaskCount > 0) lines.push(`  ${openTaskCount} taken nog open`);
  }

  if (Object.keys(habitsSummary).length > 0) {
    lines.push('', '— Gewoontes —');
    Object.entries(habitsSummary).forEach(([key, val]) => {
      const pct = val.total > 0 ? Math.round((val.done / val.total) * 100) : 0;
      lines.push(`  ${habitLabels[key] || key}: ${val.done}/${val.total} (${pct}%)`);
    });
  }

  if (gratitude.length > 0) {
    lines.push('', '— Dankbaarheid —');
    gratitude.forEach((g) => lines.push(`  ✦ ${g.text}`));
  }

  if (reflections.length > 0) {
    lines.push('', '— Reflecties —');
    reflections.forEach((r) => lines.push(`  ${r.date}: ${r.text}`));
  }

  if (journalNotes.length > 0) {
    lines.push('', '— Dagboek —');
    journalNotes.forEach((j) => lines.push(`  ${j.date}: ${j.text}`));
  }

  if (activeProjects.length > 0) {
    lines.push('', '— Actieve projecten —');
    lines.push(`  ${activeProjects.map((p) => p.title).join(', ')}`);
  }

  if (prompt) {
    lines.push('', `Even stilstaan: "${prompt}"`);
  }

  const subject = encodeURIComponent(`BORIS — Week ${week} overzicht`);
  const body = encodeURIComponent(lines.join('\n'));
  window.open(`mailto:?subject=${subject}&body=${body}`, '_self');

  return { ok: true, method: 'mailto' };
}
