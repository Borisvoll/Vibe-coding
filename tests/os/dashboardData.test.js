import { describe, it, expect, beforeEach } from 'vitest';
import { initDB, _resetDB, DB_NAME } from '../../src/db.js';
import { addTask } from '../../src/stores/tasks.js';
import { addInboxItem } from '../../src/stores/inbox.js';
import { addProject } from '../../src/stores/projects.js';
import { addHoursEntry } from '../../src/stores/bpv.js';
import {
  getTodaySnapshot,
  getWeekFocus,
  getProjectsPulse,
  getBPVPulse,
} from '../../src/os/dashboardData.js';

describe('Dashboard Data Aggregation', () => {
  beforeEach(async () => {
    _resetDB();
    indexedDB.deleteDatabase(DB_NAME);
    await initDB();
  });

  // ── getTodaySnapshot ───────────────────────────────────────

  it('should return correct shape with no data', async () => {
    const result = await getTodaySnapshot('School');
    expect(result).toHaveProperty('outcomes');
    expect(result).toHaveProperty('tasksDone');
    expect(result).toHaveProperty('tasksTotal');
    expect(result).toHaveProperty('inboxCount');
    expect(result.tasksDone).toBe(0);
    expect(result.tasksTotal).toBe(0);
    expect(result.inboxCount).toBe(0);
    expect(result.outcomes).toEqual([]);
  });

  it('should count tasks by mode', async () => {
    const today = new Date().toISOString().slice(0, 10);
    await addTask('School task', 'School', today);
    await addTask('BPV task', 'BPV', today);

    const school = await getTodaySnapshot('School');
    expect(school.tasksTotal).toBe(1);
    expect(school.tasksDone).toBe(0);

    const bpv = await getTodaySnapshot('BPV');
    expect(bpv.tasksTotal).toBe(1);
  });

  it('should count inbox items', async () => {
    await addInboxItem('thought 1', 'School');
    await addInboxItem('thought 2', 'School');

    const result = await getTodaySnapshot('School');
    expect(result.inboxCount).toBe(2);
  });

  // ── getProjectsPulse ───────────────────────────────────────

  it('should return correct shape with no projects', async () => {
    const result = await getProjectsPulse();
    expect(result.active).toEqual([]);
    expect(result.activeCount).toBe(0);
    expect(result.atRiskCount).toBe(0);
  });

  it('should aggregate projects cross-mode', async () => {
    await addProject('School project', '', 'School');
    await addProject('BPV project', '', 'BPV');
    await addProject('Personal project', '', 'Personal');

    const result = await getProjectsPulse();
    expect(result.activeCount).toBe(3);
    expect(result.active).toHaveLength(3);
  });

  it('should count at-risk projects (no next action)', async () => {
    await addProject('With action', '', 'School');
    await addProject('Without action', '', 'BPV');

    const result = await getProjectsPulse();
    // All new projects have no next action
    expect(result.atRiskCount).toBe(2);
  });

  it('should include mode in project data', async () => {
    await addProject('My project', '', 'School');
    const result = await getProjectsPulse();
    expect(result.active[0].mode).toBe('School');
    expect(result.active[0].title).toBe('My project');
    expect(result.active[0].hasNextAction).toBe(false);
  });

  // ── getBPVPulse ────────────────────────────────────────────

  it('should return correct shape with no BPV data', async () => {
    const result = await getBPVPulse();
    expect(result.totalMinutes).toBe(0);
    expect(result.targetMinutes).toBe(2400);
    expect(result.percentComplete).toBe(0);
    expect(result.formattedTotal).toBe('0u');
    expect(result.lastLogbookDate).toBeNull();
  });

  it('should reflect logged hours', async () => {
    const today = new Date().toISOString().slice(0, 10);
    await addHoursEntry(today, {
      type: 'work',
      startTime: '08:00',
      endTime: '16:30',
      breakMinutes: 30,
      note: 'Full day',
    });

    const result = await getBPVPulse();
    expect(result.totalMinutes).toBeGreaterThan(0);
    expect(result.percentComplete).toBeGreaterThan(0);
  });

  // ── getWeekFocus ───────────────────────────────────────────

  it('should return correct shape with no week data', async () => {
    const result = await getWeekFocus();
    expect(result).toHaveProperty('completedTaskCount');
    expect(result).toHaveProperty('openTaskCount');
    expect(result).toHaveProperty('habitsComplete');
    expect(result).toHaveProperty('habitsTotal');
    expect(result).toHaveProperty('reflectionDays');
    expect(result.completedTaskCount).toBe(0);
  });
});
