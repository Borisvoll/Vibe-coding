import { describe, it, expect, beforeEach } from 'vitest';
import {
  initDB,
  put,
  softDelete,
  getByIndexRange,
  getRecentByIndex,
  countRecords,
  purgeDeletedOlderThan,
  getDbHealthMetrics,
} from '../src/db.js';

beforeEach(async () => {
  await initDB();
});

describe('getByIndexRange', () => {
  it('returns records within date range', async () => {
    await put('os_tasks', { id: '1', text: 'A', mode: 'School', status: 'todo', date: '2026-01-01', updated_at: '2026-01-01' });
    await put('os_tasks', { id: '2', text: 'B', mode: 'School', status: 'todo', date: '2026-01-15', updated_at: '2026-01-15' });
    await put('os_tasks', { id: '3', text: 'C', mode: 'School', status: 'todo', date: '2026-02-01', updated_at: '2026-02-01' });

    const jan = await getByIndexRange('os_tasks', 'date', '2026-01-01', '2026-01-31');
    expect(jan).toHaveLength(2);
    expect(jan.map((t) => t.id).sort()).toEqual(['1', '2']);
  });

  it('returns all records when both bounds are null', async () => {
    await put('os_tasks', { id: '1', text: 'A', mode: 'School', status: 'todo', date: '2026-01-01', updated_at: '2026-01-01' });
    await put('os_tasks', { id: '2', text: 'B', mode: 'School', status: 'todo', date: '2026-02-01', updated_at: '2026-02-01' });

    const all = await getByIndexRange('os_tasks', 'date', null, null);
    expect(all.length).toBeGreaterThanOrEqual(2);
  });

  it('supports open lower bound', async () => {
    await put('os_tasks', { id: '1', text: 'A', mode: 'School', status: 'todo', date: '2026-01-01', updated_at: '2026-01-01' });
    await put('os_tasks', { id: '2', text: 'B', mode: 'School', status: 'todo', date: '2026-06-01', updated_at: '2026-06-01' });

    const upToJune = await getByIndexRange('os_tasks', 'date', null, '2026-06-30');
    expect(upToJune.length).toBeGreaterThanOrEqual(2);
  });

  it('supports open upper bound', async () => {
    await put('os_tasks', { id: '1', text: 'A', mode: 'School', status: 'todo', date: '2026-06-01', updated_at: '2026-06-01' });

    const fromJune = await getByIndexRange('os_tasks', 'date', '2026-06-01', null);
    expect(fromJune.length).toBeGreaterThanOrEqual(1);
  });
});

describe('getRecentByIndex', () => {
  it('returns limited records sorted newest-first', async () => {
    for (let i = 1; i <= 10; i++) {
      const d = `2026-01-${String(i).padStart(2, '0')}`;
      await put('os_tasks', { id: String(i), text: `Task ${i}`, mode: 'School', status: 'todo', date: d, updated_at: d });
    }

    const recent3 = await getRecentByIndex('os_tasks', 'date', 3);
    expect(recent3).toHaveLength(3);
    // Should be the 3 most recent dates
    expect(recent3[0].date).toBe('2026-01-10');
    expect(recent3[1].date).toBe('2026-01-09');
    expect(recent3[2].date).toBe('2026-01-08');
  });

  it('returns fewer than limit when store has fewer records', async () => {
    await put('os_tasks', { id: '1', text: 'Only one', mode: 'School', status: 'todo', date: '2026-01-01', updated_at: '2026-01-01' });

    const result = await getRecentByIndex('os_tasks', 'date', 10);
    expect(result).toHaveLength(1);
  });
});

describe('countRecords', () => {
  it('returns 0 for empty store', async () => {
    const count = await countRecords('os_tasks');
    expect(count).toBe(0);
  });

  it('returns correct count after adding records', async () => {
    await put('os_tasks', { id: '1', text: 'A', mode: 'School', status: 'todo', date: '2026-01-01', updated_at: '2026-01-01' });
    await put('os_tasks', { id: '2', text: 'B', mode: 'School', status: 'todo', date: '2026-01-02', updated_at: '2026-01-02' });

    const count = await countRecords('os_tasks');
    expect(count).toBe(2);
  });
});

describe('purgeDeletedOlderThan', () => {
  it('purges tombstones older than N days', async () => {
    // Create a soft-delete with old timestamp
    const oldDate = new Date(Date.now() - 60 * 86400000).toISOString(); // 60 days ago
    const recentDate = new Date(Date.now() - 5 * 86400000).toISOString(); // 5 days ago

    await put('os_tasks', { id: 'old-task', text: 'Old', mode: 'School', status: 'todo', date: '2025-12-01', updated_at: '2025-12-01' });
    await put('os_tasks', { id: 'recent-task', text: 'Recent', mode: 'School', status: 'todo', date: '2026-02-15', updated_at: '2026-02-15' });
    await softDelete('os_tasks', 'old-task');
    await softDelete('os_tasks', 'recent-task');

    // Manually backdate the "old" tombstone
    const { getAll } = await import('../src/db.js');
    const deleted = await getAll('deleted');
    const oldTombstone = deleted.find((d) => d.id === 'old-task');
    if (oldTombstone) {
      await put('deleted', { ...oldTombstone, deletedAt: oldDate });
    }
    const recentTombstone = deleted.find((d) => d.id === 'recent-task');
    if (recentTombstone) {
      await put('deleted', { ...recentTombstone, deletedAt: recentDate });
    }

    const purged = await purgeDeletedOlderThan(30);
    expect(purged).toBeGreaterThanOrEqual(1);

    // Recent tombstone should still exist
    const remaining = await getAll('deleted');
    const recentStillExists = remaining.some((d) => d.id === 'recent-task');
    expect(recentStillExists).toBe(true);

    // Old tombstone should be gone
    const oldStillExists = remaining.some((d) => d.id === 'old-task');
    expect(oldStillExists).toBe(false);
  });

  it('returns 0 when nothing to purge', async () => {
    const purged = await purgeDeletedOlderThan(30);
    expect(purged).toBe(0);
  });
});

describe('getDbHealthMetrics', () => {
  it('returns counts for all stores', async () => {
    const metrics = await getDbHealthMetrics();
    expect(metrics).toHaveProperty('counts');
    expect(metrics).toHaveProperty('totalRecords');
    expect(metrics).toHaveProperty('estimatedExportBytes');
    expect(typeof metrics.totalRecords).toBe('number');
    expect(typeof metrics.estimatedExportBytes).toBe('number');
  });

  it('reflects added records in counts', async () => {
    await put('os_tasks', { id: 'x', text: 'X', mode: 'School', status: 'todo', date: '2026-01-01', updated_at: '2026-01-01' });
    const metrics = await getDbHealthMetrics();
    expect(metrics.counts.os_tasks).toBeGreaterThanOrEqual(1);
    expect(metrics.totalRecords).toBeGreaterThanOrEqual(1);
  });
});
