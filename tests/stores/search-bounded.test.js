import { describe, it, expect, beforeEach } from 'vitest';
import { initDB, put } from '../../src/db.js';
import { globalSearch } from '../../src/stores/search.js';

beforeEach(async () => {
  await initDB();
});

describe('globalSearch — bounded queries', () => {
  it('returns at most limit results', async () => {
    // Seed 40 tasks matching "test"
    for (let i = 0; i < 40; i++) {
      await put('os_tasks', {
        id: `task-${i}`,
        text: `test item ${i}`,
        mode: 'School',
        status: 'todo',
        date: '2026-02-20',
        updated_at: '2026-02-20',
      });
    }

    const results = await globalSearch('test', { limit: 10 });
    expect(results.length).toBeLessThanOrEqual(10);
  });

  it('uses default limit of 30', async () => {
    // Seed 50 tasks
    for (let i = 0; i < 50; i++) {
      await put('os_tasks', {
        id: `task-${i}`,
        text: `zoekterm item ${i}`,
        mode: 'School',
        status: 'todo',
        date: '2026-02-20',
        updated_at: '2026-02-20',
      });
    }

    const results = await globalSearch('zoekterm');
    expect(results.length).toBeLessThanOrEqual(30);
  });

  it('returns results sorted by score then date', async () => {
    await put('os_tasks', {
      id: 'exact',
      text: 'abc',
      mode: 'School',
      status: 'todo',
      date: '2026-02-10',
      updated_at: '2026-02-10',
    });
    await put('os_tasks', {
      id: 'partial',
      text: 'xyzabc',
      mode: 'School',
      status: 'todo',
      date: '2026-02-20',
      updated_at: '2026-02-20',
    });

    const results = await globalSearch('abc');
    expect(results.length).toBeGreaterThanOrEqual(2);
    // Exact match should have higher score
    expect(results[0].id).toBe('exact');
  });

  it('returns empty array for short queries', async () => {
    const results = await globalSearch('a');
    expect(results).toEqual([]);
  });

  it('finds tasks from the last 365 days', async () => {
    const recentDate = '2026-02-01';
    await put('os_tasks', {
      id: 'recent',
      text: 'findme recent',
      mode: 'School',
      status: 'todo',
      date: recentDate,
      updated_at: recentDate,
    });

    const results = await globalSearch('findme');
    expect(results.some((r) => r.id === 'recent')).toBe(true);
  });
});
