import { describe, it, expect, beforeEach } from 'vitest';
import { initDB } from '../../src/db.js';
import { addSession, getSessionsForDate, getTodayCount } from '../../src/stores/pomodoro.js';

const TODAY = new Date().toISOString().slice(0, 10);

describe('pomodoro store', () => {
  beforeEach(async () => {
    await initDB();
  });

  it('adds a session and retrieves it by date', async () => {
    const session = await addSession({ mode: 'School', duration: 25 });
    expect(session.id).toBeTruthy();
    expect(session.mode).toBe('School');
    expect(session.duration).toBe(25);
    expect(session.date).toBe(TODAY);

    const sessions = await getSessionsForDate(TODAY);
    expect(sessions.find((s) => s.id === session.id)).toBeTruthy();
  });

  it('adds a session with linked task', async () => {
    const session = await addSession({
      taskId: 'task-abc',
      taskText: 'Wiskunde huiswerk',
      mode: 'School',
      duration: 25,
    });
    expect(session.task_id).toBe('task-abc');
    expect(session.task_text).toBe('Wiskunde huiswerk');
  });

  it('getTodayCount returns correct count', async () => {
    await addSession({ mode: 'School', duration: 25 });
    await addSession({ mode: 'School', duration: 25 });
    await addSession({ mode: 'Personal', duration: 25 });

    const total = await getTodayCount();
    expect(total).toBeGreaterThanOrEqual(3);

    const schoolOnly = await getTodayCount('School');
    expect(schoolOnly).toBeGreaterThanOrEqual(2);

    const personalOnly = await getTodayCount('Personal');
    expect(personalOnly).toBeGreaterThanOrEqual(1);
  });

  it('sessions for a different date are not returned for today', async () => {
    const countBefore = await getTodayCount();
    const sessions = await getSessionsForDate('2020-01-01');
    // Yesterday's date should return 0 for a fresh DB
    expect(sessions).toHaveLength(0);
    const countAfter = await getTodayCount();
    expect(countAfter).toBe(countBefore);
  });
});
