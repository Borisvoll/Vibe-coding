import { getByIndex, put } from '../db.js';
import { getToday } from '../utils.js';

const STORE = 'os_pomodoro_sessions';

/**
 * Record a completed pomodoro session.
 */
export async function addSession({ taskId = null, taskText = null, mode, duration = 25 } = {}) {
  const session = {
    id: crypto.randomUUID(),
    task_id: taskId,
    task_text: taskText,
    mode,
    duration,
    date: getToday(),
    completedAt: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  await put(STORE, session);
  return session;
}

/**
 * Get all sessions for a specific date.
 */
export async function getSessionsForDate(date) {
  return getByIndex(STORE, 'date', date);
}

/**
 * Get the count of completed pomodoros today, optionally filtered by mode.
 */
export async function getTodayCount(mode = null) {
  const sessions = await getSessionsForDate(getToday());
  if (!mode) return sessions.length;
  return sessions.filter((s) => s.mode === mode).length;
}
