/**
 * School dashboard data aggregation.
 * Pulls from four sources and returns a single snapshot object.
 */
import { getAll } from '../../db.js';
import { getActiveProjects } from '../../stores/projects.js';
import { getWeeklyOverview } from '../../stores/bpv.js';
import { getToday, getCurrentWeek, formatDateShort } from '../../utils.js';

const MILESTONES_STORE = 'os_school_milestones';
const TASKS_STORE = 'os_tasks';

const DAYS_AHEAD = 14; // look this many days ahead for deadlines

/**
 * Returns { nextAction, deadlines, bpvWeek, schoolProjects }
 *
 * nextAction   — first non-done School task (by date asc, then createdAt)
 * deadlines    — upcoming items from milestones + future-dated tasks (next 14 days)
 * bpvWeek      — { formattedTotal, formattedTarget, percentComplete } from bpv store
 * schoolProjects — active os_projects where mode='School'
 */
export async function getSchoolDashboardData() {
  const today = getToday();
  const cutoff = getFutureDateStr(today, DAYS_AHEAD);

  const [allTasks, allMilestones, schoolProjects, bpvWeek] = await Promise.all([
    getAll(TASKS_STORE).catch(() => []),
    getAll(MILESTONES_STORE).catch(() => []),
    getActiveProjects('School').catch(() => []),
    getWeeklyOverview(getCurrentWeek()).catch(() => null),
  ]);

  // Next action — first non-done School task, sorted by date then createdAt
  const schoolTodos = allTasks
    .filter((t) => t.mode === 'School' && t.status !== 'done')
    .sort((a, b) => {
      const da = a.date || '';
      const db = b.date || '';
      if (da !== db) return da.localeCompare(db);
      return String(a.createdAt || '').localeCompare(String(b.createdAt || ''));
    });
  const nextAction = schoolTodos[0] || null;

  // Upcoming deadlines — milestones with a dueDate, plus future-dated tasks
  const milestoneDL = allMilestones
    .filter((m) => m.dueDate && m.dueDate >= today && m.dueDate <= cutoff)
    .map((m) => ({
      id: m.id,
      label: m.title || '(mijlpaal)',
      date: m.dueDate,
      type: 'milestone',
      daysLeft: daysBetween(today, m.dueDate),
    }));

  const taskDL = allTasks
    .filter((t) => t.mode === 'School' && t.status !== 'done'
      && t.date && t.date > today && t.date <= cutoff)
    .map((t) => ({
      id: t.id,
      label: t.text,
      date: t.date,
      type: 'task',
      daysLeft: daysBetween(today, t.date),
    }));

  const deadlines = [...milestoneDL, ...taskDL]
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 5);

  return { nextAction, deadlines, bpvWeek, schoolProjects };
}

// ─── helpers ─────────────────────────────────────────────────────────────────

function getFutureDateStr(dateStr, days) {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

function daysBetween(from, to) {
  const a = new Date(from + 'T00:00:00');
  const b = new Date(to + 'T00:00:00');
  return Math.round((b - a) / 86400000);
}
