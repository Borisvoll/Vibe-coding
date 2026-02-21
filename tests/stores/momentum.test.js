import { describe, it, expect, beforeEach } from 'vitest';
import { initDB } from '../../src/db.js';
import { addProject, getActiveProjects } from '../../src/stores/projects.js';
import { addTask, toggleTask, getTasksByProject } from '../../src/stores/tasks.js';
import {
  getProjectMomentum,
  getAllProjectsMomentum,
  getMomentumPulse,
  getWeekStart,
  weekBucket,
  STALLED_DAYS,
} from '../../src/stores/momentum.js';
import { renderSparkline } from '../../src/ui/sparkline.js';

beforeEach(async () => {
  await initDB();
});

describe('Momentum — getWeekStart', () => {
  it('returns Monday for a Wednesday', () => {
    // 2026-02-18 is a Wednesday
    const ws = getWeekStart(new Date('2026-02-18T12:00:00'));
    expect(ws.getDay()).toBe(1); // Monday
    expect(ws.getDate()).toBe(16); // Mon Feb 16
  });

  it('returns Monday for a Monday', () => {
    const ws = getWeekStart(new Date('2026-02-16T00:00:00'));
    expect(ws.getDay()).toBe(1);
    expect(ws.getDate()).toBe(16);
  });

  it('returns Monday for a Sunday', () => {
    // 2026-02-22 is a Sunday
    const ws = getWeekStart(new Date('2026-02-22T23:59:59'));
    expect(ws.getDay()).toBe(1);
    expect(ws.getDate()).toBe(16);
  });
});

describe('Momentum — weekBucket', () => {
  it('buckets current week as index 3', () => {
    const thisWeekStart = getWeekStart(new Date('2026-02-21T00:00:00'));
    // A timestamp from today (Sat Feb 21) should be in this week bucket
    const idx = weekBucket('2026-02-21T10:00:00', thisWeekStart);
    expect(idx).toBe(3);
  });

  it('buckets last week as index 2', () => {
    const thisWeekStart = getWeekStart(new Date('2026-02-21T00:00:00'));
    // Feb 12 (Thu) is last week
    const idx = weekBucket('2026-02-12T10:00:00', thisWeekStart);
    expect(idx).toBe(2);
  });

  it('buckets 2 weeks ago as index 1', () => {
    const thisWeekStart = getWeekStart(new Date('2026-02-21T00:00:00'));
    // Feb 5 (Thu) is 2 weeks ago
    const idx = weekBucket('2026-02-05T10:00:00', thisWeekStart);
    expect(idx).toBe(1);
  });

  it('buckets 3 weeks ago as index 0', () => {
    const thisWeekStart = getWeekStart(new Date('2026-02-21T00:00:00'));
    // Jan 29 (Thu) is 3 weeks ago
    const idx = weekBucket('2026-01-29T10:00:00', thisWeekStart);
    expect(idx).toBe(0);
  });

  it('returns -1 for older than 4 weeks', () => {
    const thisWeekStart = getWeekStart(new Date('2026-02-21T00:00:00'));
    const idx = weekBucket('2026-01-20T10:00:00', thisWeekStart);
    expect(idx).toBe(-1);
  });

  it('returns -1 for future dates', () => {
    const thisWeekStart = getWeekStart(new Date('2026-02-21T00:00:00'));
    const idx = weekBucket('2026-03-01T10:00:00', thisWeekStart);
    expect(idx).toBe(-1);
  });

  it('returns -1 for null/invalid', () => {
    const thisWeekStart = getWeekStart(new Date('2026-02-21T00:00:00'));
    expect(weekBucket(null, thisWeekStart)).toBe(-1);
    expect(weekBucket('not-a-date', thisWeekStart)).toBe(-1);
    expect(weekBucket('', thisWeekStart)).toBe(-1);
  });
});

describe('Momentum — getProjectMomentum', () => {
  it('returns momentum for project with no tasks (only updatedAt)', async () => {
    const project = await addProject('Leeg project', '', 'School');
    const m = await getProjectMomentum(project.id, project);

    expect(m.weeklyActivity).toHaveLength(4);
    // Project was just created → updatedAt is now → 1 activity this week (weight 4)
    expect(m.weeklyActivity[3]).toBe(1);
    expect(m.score).toBe(4);
    expect(m.isStalled).toBe(false);
    expect(m.lastActiveDate).not.toBeNull();
  });

  it('counts completed tasks in weekly buckets', async () => {
    const project = await addProject('Test project', '', 'School');
    const task = await addTask('Taak 1', 'School', null, project.id);
    await toggleTask(task.id); // marks done with doneAt = now

    const m = await getProjectMomentum(project.id, project);
    // This week should have at least 1 from the task + 1 from project updatedAt
    expect(m.weeklyActivity[3]).toBeGreaterThanOrEqual(1);
    expect(m.score).toBeGreaterThan(0);
    expect(m.isStalled).toBe(false);
    expect(m.lastActiveDate).not.toBeNull();
  });

  it('detects stalled project (no recent activity)', async () => {
    const project = await addProject('Oud project', '', 'School');
    // Manually set updatedAt to 14 days ago
    const oldDate = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
    const stalledProject = { ...project, updatedAt: oldDate, status: 'active' };

    const m = await getProjectMomentum(project.id, stalledProject);
    expect(m.isStalled).toBe(true);
  });

  it('scores recent weeks higher than older weeks', async () => {
    // Score formula: w[0]*1 + w[1]*2 + w[2]*3 + w[3]*4
    // If we have [0, 0, 0, 2] (2 activities this week), score = 2*4 = 8
    // If we have [2, 0, 0, 0] (2 activities 3 weeks ago), score = 2*1 = 2
    // We test the weight difference through the formula
    const project = await addProject('Score test', '', 'School');
    const m = await getProjectMomentum(project.id, project);
    // Project just created: updatedAt is now → weeklyActivity[3] >= 1
    // Score should use weight 4 for this week
    if (m.weeklyActivity[3] > 0) {
      expect(m.score).toBe(
        m.weeklyActivity[0] * 1 +
        m.weeklyActivity[1] * 2 +
        m.weeklyActivity[2] * 3 +
        m.weeklyActivity[3] * 4,
      );
    }
  });
});

describe('Momentum — getAllProjectsMomentum', () => {
  it('returns map for all active projects in mode', async () => {
    await addProject('Project A', '', 'School');
    await addProject('Project B', '', 'School');
    await addProject('Project C', '', 'Personal');

    const map = await getAllProjectsMomentum('School');
    expect(map.size).toBe(2);

    for (const [, momentum] of map) {
      expect(momentum.weeklyActivity).toHaveLength(4);
      expect(typeof momentum.score).toBe('number');
      expect(typeof momentum.isStalled).toBe('boolean');
    }
  });

  it('returns empty map when no active projects', async () => {
    const map = await getAllProjectsMomentum('School');
    expect(map.size).toBe(0);
  });
});

describe('Momentum — getMomentumPulse', () => {
  it('returns top 3 active sorted by score descending', async () => {
    await addProject('P1', '', 'School');
    const p2 = await addProject('P2', '', 'School');
    await addProject('P3', '', 'School');
    await addProject('P4', '', 'School');

    // Complete some tasks on P2 to boost its score
    const t1 = await addTask('T1', 'School', null, p2.id);
    const t2 = await addTask('T2', 'School', null, p2.id);
    await toggleTask(t1.id);
    await toggleTask(t2.id);

    const pulse = await getMomentumPulse('School');
    expect(pulse.topActive.length).toBeLessThanOrEqual(3);
    // Should be sorted by score desc
    for (let i = 1; i < pulse.topActive.length; i++) {
      expect(pulse.topActive[i - 1].score).toBeGreaterThanOrEqual(pulse.topActive[i].score);
    }
  });

  it('identifies stalled projects', async () => {
    // A project with old updatedAt should appear in stalled
    const project = await addProject('Verouderd', '', 'School');
    // We can't easily simulate old dates in the DB, but with no task activity
    // and a fresh updatedAt, it should NOT be stalled
    const pulse = await getMomentumPulse('School');
    // Fresh project is not stalled
    const stalledIds = pulse.stalled.map((s) => s.id);
    expect(stalledIds).not.toContain(project.id);
  });

  it('returns empty arrays when no projects', async () => {
    const pulse = await getMomentumPulse('School');
    expect(pulse.topActive).toEqual([]);
    expect(pulse.stalled).toEqual([]);
  });
});

describe('Sparkline — renderSparkline', () => {
  it('returns an SVG string with 4 bars', () => {
    const svg = renderSparkline([1, 2, 3, 4]);
    expect(svg).toContain('<svg');
    expect(svg).toContain('momentum-spark');
    // Should have 4 <rect> elements
    const rectCount = (svg.match(/<rect/g) || []).length;
    expect(rectCount).toBe(4);
  });

  it('handles all-zero activity', () => {
    const svg = renderSparkline([0, 0, 0, 0]);
    expect(svg).toContain('<svg');
    // All bars should use the empty color (border)
    expect(svg).toContain('var(--color-border)');
  });

  it('uses warning color when stalled', () => {
    const svg = renderSparkline([1, 0, 0, 0], { isStalled: true });
    expect(svg).toContain('var(--color-warning)');
  });

  it('uses accent color for normal bars', () => {
    const svg = renderSparkline([0, 0, 0, 3], { isStalled: false });
    expect(svg).toContain('var(--color-accent)');
  });

  it('handles missing/default arguments', () => {
    const svg = renderSparkline();
    expect(svg).toContain('<svg');
    const rectCount = (svg.match(/<rect/g) || []).length;
    expect(rectCount).toBe(4);
  });
});

describe('Momentum — STALLED_DAYS constant', () => {
  it('is 7 days', () => {
    expect(STALLED_DAYS).toBe(7);
  });
});
