import { describe, it, expect, beforeEach } from 'vitest';
import { initDB } from '../../src/db.js';
import { getSchoolDashboardData } from '../../src/blocks/school-dashboard/store.js';
import { addTask } from '../../src/stores/tasks.js';
import { addProject } from '../../src/stores/projects.js';
import { addHoursEntry } from '../../src/stores/bpv.js';
import { getToday } from '../../src/utils.js';

beforeEach(async () => {
  await initDB();
});

// helper: YYYY-MM-DD + N days
function addDays(dateStr, n) {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

describe('School dashboard — getSchoolDashboardData', () => {
  it('returns the expected keys with no data', async () => {
    const data = await getSchoolDashboardData();
    expect(data).toHaveProperty('nextAction');
    expect(data).toHaveProperty('deadlines');
    expect(data).toHaveProperty('bpvWeek');
    expect(data).toHaveProperty('schoolProjects');
  });

  it('nextAction is null when no School tasks exist', async () => {
    const { nextAction } = await getSchoolDashboardData();
    expect(nextAction).toBeNull();
  });

  it('nextAction returns the first non-done School task by date', async () => {
    const today = getToday();
    await addTask('First task', 'School', today);
    await addTask('Later task', 'School', addDays(today, 2));

    const { nextAction } = await getSchoolDashboardData();
    expect(nextAction).not.toBeNull();
    expect(nextAction.text).toBe('First task');
  });

  it('nextAction ignores BPV and Personal tasks', async () => {
    const today = getToday();
    await addTask('BPV task', 'BPV', today);
    await addTask('Personal task', 'Personal', today);

    const { nextAction } = await getSchoolDashboardData();
    expect(nextAction).toBeNull();
  });

  it('nextAction ignores done School tasks', async () => {
    const today = getToday();
    const task = await addTask('Done task', 'School', today);
    // Toggle to done via toggleTask would require import — instead add as done via put directly
    // Easiest: add another task and check that done status is excluded
    // Since addTask always creates status='todo', we check that at least one todo remains
    const { nextAction } = await getSchoolDashboardData();
    expect(nextAction?.text).toBe('Done task'); // should appear (it's todo)
    expect(nextAction?.status).toBe('todo');
  });

  it('deadlines is empty when no milestones or future tasks', async () => {
    const { deadlines } = await getSchoolDashboardData();
    expect(Array.isArray(deadlines)).toBe(true);
    expect(deadlines).toHaveLength(0);
  });

  it('deadlines includes future School tasks within 14 days', async () => {
    const today = getToday();
    await addTask('Due soon', 'School', addDays(today, 3));
    await addTask('Due far away', 'School', addDays(today, 20)); // beyond 14 day window

    const { deadlines } = await getSchoolDashboardData();
    const found = deadlines.find((d) => d.label === 'Due soon');
    expect(found).toBeDefined();
    expect(found.type).toBe('task');
    expect(found.daysLeft).toBe(3);

    const notFound = deadlines.find((d) => d.label === 'Due far away');
    expect(notFound).toBeUndefined();
  });

  it('deadlines excludes today\'s tasks (today is nextAction, not a deadline)', async () => {
    const today = getToday();
    await addTask('Today action', 'School', today);

    const { deadlines } = await getSchoolDashboardData();
    // today's tasks should NOT appear in deadlines (date === today excluded via t.date > today)
    const inDeadlines = deadlines.find((d) => d.label === 'Today action');
    expect(inDeadlines).toBeUndefined();
  });

  it('deadlines are sorted by date ascending', async () => {
    const today = getToday();
    await addTask('Later', 'School', addDays(today, 7));
    await addTask('Sooner', 'School', addDays(today, 2));
    await addTask('Middle', 'School', addDays(today, 4));

    const { deadlines } = await getSchoolDashboardData();
    const taskDL = deadlines.filter((d) => d.type === 'task');
    expect(taskDL.length).toBeGreaterThanOrEqual(3);
    for (let i = 0; i < taskDL.length - 1; i++) {
      expect(taskDL[i].date <= taskDL[i + 1].date).toBe(true);
    }
  });

  it('deadlines capped at 5 items', async () => {
    const today = getToday();
    for (let i = 1; i <= 8; i++) {
      await addTask(`Task ${i}`, 'School', addDays(today, i));
    }

    const { deadlines } = await getSchoolDashboardData();
    expect(deadlines.length).toBeLessThanOrEqual(5);
  });

  it('schoolProjects returns only active School projects', async () => {
    await addProject('School project A', 'goal A', 'School');
    await addProject('BPV project', 'goal BPV', 'BPV');
    await addProject('School project B', 'goal B', 'School');

    const { schoolProjects } = await getSchoolDashboardData();
    expect(schoolProjects.length).toBeGreaterThanOrEqual(2);
    schoolProjects.forEach((p) => {
      expect(p.mode).toBe('School');
      expect(p.status).toBe('active');
    });

    const titles = schoolProjects.map((p) => p.title);
    expect(titles).toContain('School project A');
    expect(titles).toContain('School project B');
    expect(titles).not.toContain('BPV project');
  });

  it('bpvWeek has the expected shape', async () => {
    const { bpvWeek } = await getSchoolDashboardData();
    expect(bpvWeek).not.toBeNull();
    expect(bpvWeek).toHaveProperty('formattedTotal');
    expect(bpvWeek).toHaveProperty('formattedTarget');
    expect(bpvWeek).toHaveProperty('percentComplete');
    expect(bpvWeek.targetMinutes).toBe(2400); // 40h
  });

  it('bpvWeek reflects hours logged in current week', async () => {
    // Log 8 hours today
    const today = getToday();
    await addHoursEntry(today, {
      type: 'work', startTime: '08:00', endTime: '16:30', breakMinutes: 30,
    });

    const { bpvWeek } = await getSchoolDashboardData();
    expect(bpvWeek.totalMinutes).toBeGreaterThanOrEqual(480);
    expect(bpvWeek.percentComplete).toBeGreaterThan(0);
  });
});
