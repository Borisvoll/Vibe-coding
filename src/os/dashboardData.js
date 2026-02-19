import { getTasksForToday } from '../stores/tasks.js';
import { getInboxCount } from '../stores/inbox.js';
import { getActiveProjects } from '../stores/projects.js';
import { getWeeklyOverview } from '../stores/bpv.js';
import { aggregateWeeklyReview } from '../stores/weekly-review.js';
import { getDailyEntry } from '../stores/daily.js';
import { getToday, getCurrentWeek } from '../utils.js';

/**
 * Dashboard data aggregation — pure async functions.
 * All data comes from existing stores. No new schema.
 */

export async function getTodaySnapshot(mode) {
  try {
    const [tasks, inboxCount, dailyEntry] = await Promise.all([
      getTasksForToday(mode),
      getInboxCount(),
      getDailyEntry(mode, getToday()),
    ]);

    const tasksDone = tasks.filter((t) => t.status === 'done').length;
    const tasksTotal = tasks.length;
    const outcomes = (dailyEntry?.outcomes || []).filter((o) => o.trim());

    return { outcomes, tasksDone, tasksTotal, inboxCount };
  } catch {
    return { outcomes: [], tasksDone: 0, tasksTotal: 0, inboxCount: 0 };
  }
}

export async function getWeekFocus(weekStr = null) {
  try {
    const week = weekStr || getCurrentWeek();
    const review = await aggregateWeeklyReview(week);

    const habitsComplete = review.habitsSummary
      ? Object.values(review.habitsSummary).reduce((sum, h) => sum + (h?.done || 0), 0)
      : 0;
    const habitsTotal = review.habitsSummary
      ? Object.values(review.habitsSummary).reduce((sum, h) => sum + (h?.total || 0), 0)
      : 0;

    // Count days with reflections or gratitude entries
    const reflectionDays = (review.reflections?.length || 0) + (review.gratitude?.length || 0);

    return {
      completedTaskCount: review.completedTaskCount || 0,
      openTaskCount: review.openTaskCount || 0,
      habitsComplete,
      habitsTotal,
      reflectionDays: Math.min(reflectionDays, 7),
      prompt: review.prompt || '',
    };
  } catch {
    return { completedTaskCount: 0, openTaskCount: 0, habitsComplete: 0, habitsTotal: 0, reflectionDays: 0, prompt: '' };
  }
}

export async function getProjectsPulse() {
  try {
    const projects = await getActiveProjects();
    const atRisk = projects.filter((p) => !p.nextActionId);

    return {
      active: projects.slice(0, 5).map((p) => ({
        id: p.id,
        title: p.title,
        mode: p.mode || null,
        hasNextAction: !!p.nextActionId,
      })),
      activeCount: projects.length,
      atRiskCount: atRisk.length,
    };
  } catch {
    return { active: [], activeCount: 0, atRiskCount: 0 };
  }
}

export async function getBPVPulse(weekStr = null) {
  try {
    const week = weekStr || getCurrentWeek();
    const overview = await getWeeklyOverview(week);

    // Find last day with a logbook entry
    let lastLogbookDate = null;
    if (overview.days) {
      for (const day of [...overview.days].reverse()) {
        if (day.hasLogbook) {
          lastLogbookDate = day.date;
          break;
        }
      }
    }

    return {
      totalMinutes: overview.totalMinutes || 0,
      targetMinutes: overview.targetMinutes || 2400,
      percentComplete: overview.percentComplete || 0,
      formattedTotal: overview.totalMinutes ? `${Math.floor(overview.totalMinutes / 60)}u ${overview.totalMinutes % 60}m` : '0u',
      lastLogbookDate,
    };
  } catch {
    return { totalMinutes: 0, targetMinutes: 2400, percentComplete: 0, formattedTotal: '0u', lastLogbookDate: null };
  }
}
