import { getActiveProjects } from './projects.js';
import { getTasksByProject } from './tasks.js';
import { formatDateISO } from '../utils.js';

/**
 * Project Momentum — activity-based metric over a 4-week window.
 *
 * Reads project + task timestamps (read-only, no mutations).
 * No new schema, no new IndexedDB stores.
 */

const STALLED_DAYS = 7;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Get the Monday 00:00 of the week containing `date`.
 * @param {Date} date
 * @returns {Date}
 */
function getWeekStart(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // 0=Sun
  const diff = (day === 0 ? 6 : day - 1); // days since Monday
  d.setDate(d.getDate() - diff);
  return d;
}

/**
 * Bucket an ISO timestamp into one of 4 week slots.
 * Weeks: [3 weeks ago, 2 weeks ago, last week, this week] → indices [0,1,2,3]
 * Returns -1 if outside the 4-week window.
 *
 * @param {string} isoTimestamp — ISO 8601 date/datetime string
 * @param {Date} thisWeekStart — Monday of current week
 * @returns {number} bucket index (0–3) or -1
 */
function weekBucket(isoTimestamp, thisWeekStart) {
  if (!isoTimestamp) return -1;
  const ts = new Date(isoTimestamp);
  if (isNaN(ts.getTime())) return -1;

  const diff = thisWeekStart.getTime() - getWeekStart(ts).getTime();
  const weeksAgo = Math.round(diff / WEEK_MS);

  if (weeksAgo < 0 || weeksAgo > 3) return -1;
  return 3 - weeksAgo; // index 3 = this week, 0 = 3 weeks ago
}

/**
 * Compute momentum data for a single project.
 *
 * @param {string} projectId
 * @param {object} [project] — optional pre-fetched project record
 * @returns {Promise<{weeklyActivity: number[], isStalled: boolean, lastActiveDate: string|null, score: number}>}
 */
export async function getProjectMomentum(projectId, project = null) {
  const weeklyActivity = [0, 0, 0, 0]; // [w-3, w-2, w-1, w0]
  const now = new Date();
  const thisWeekStart = getWeekStart(now);
  const stalledCutoff = new Date(now.getTime() - STALLED_DAYS * 24 * 60 * 60 * 1000);

  let lastActive = null;

  try {
    const tasks = await getTasksByProject(projectId);

    // Bucket task completions
    for (const task of tasks) {
      if (task.doneAt) {
        const bucket = weekBucket(task.doneAt, thisWeekStart);
        if (bucket >= 0) weeklyActivity[bucket]++;

        const doneDate = new Date(task.doneAt);
        if (!lastActive || doneDate > lastActive) lastActive = doneDate;
      }
    }

    // Count project-level update as activity
    if (project?.updatedAt) {
      const bucket = weekBucket(project.updatedAt, thisWeekStart);
      if (bucket >= 0) weeklyActivity[bucket]++;

      const upDate = new Date(project.updatedAt);
      if (!lastActive || upDate > lastActive) lastActive = upDate;
    }
  } catch {
    // Non-critical — return empty momentum
  }

  const lastActiveDate = lastActive ? formatDateISO(lastActive) : null;
  const isStalled = project?.status === 'active' && (!lastActive || lastActive < stalledCutoff);

  // Weighted score: recent weeks count more
  const score = weeklyActivity[0] * 1 + weeklyActivity[1] * 2 + weeklyActivity[2] * 3 + weeklyActivity[3] * 4;

  return { weeklyActivity, isStalled, lastActiveDate, score };
}

/**
 * Batch momentum for all active projects in a mode.
 *
 * @param {string} [mode]
 * @returns {Promise<Map<string, {weeklyActivity: number[], isStalled: boolean, lastActiveDate: string|null, score: number}>>}
 */
export async function getAllProjectsMomentum(mode) {
  const map = new Map();
  try {
    const projects = await getActiveProjects(mode);
    const results = await Promise.all(
      projects.map((p) => getProjectMomentum(p.id, p).then((m) => [p.id, m])),
    );
    for (const [id, momentum] of results) {
      map.set(id, momentum);
    }
  } catch {
    // Non-critical
  }
  return map;
}

/**
 * Dashboard-ready momentum pulse: top 3 active + stalled list.
 *
 * @param {string} [mode]
 * @returns {Promise<{topActive: Array, stalled: Array}>}
 */
export async function getMomentumPulse(mode) {
  try {
    const projects = await getActiveProjects(mode);
    const entries = await Promise.all(
      projects.map(async (p) => {
        const m = await getProjectMomentum(p.id, p);
        return { id: p.id, title: p.title, ...m };
      }),
    );

    // Top 3 by score (descending)
    const sorted = [...entries].sort((a, b) => b.score - a.score);
    const topActive = sorted.slice(0, 3);

    // Stalled projects
    const now = new Date();
    const stalled = entries
      .filter((e) => e.isStalled)
      .map((e) => {
        const last = e.lastActiveDate ? new Date(e.lastActiveDate + 'T00:00:00') : null;
        const daysSince = last ? Math.floor((now - last) / (24 * 60 * 60 * 1000)) : null;
        return { id: e.id, title: e.title, daysSince, weeklyActivity: e.weeklyActivity };
      });

    return { topActive, stalled };
  } catch {
    return { topActive: [], stalled: [] };
  }
}

// Exported for testing
export { getWeekStart, weekBucket, STALLED_DAYS };
