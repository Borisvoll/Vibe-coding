import { describe, it, expect, beforeEach } from 'vitest';
import { initDB } from '../../src/db.js';
import { saveDailyEntry, getDailyEntriesPage } from '../../src/stores/daily.js';

beforeEach(async () => {
  await initDB();
});

describe('getDailyEntriesPage', () => {
  it('returns paginated results', async () => {
    // Create 15 entries across different dates
    for (let i = 1; i <= 15; i++) {
      const date = `2026-02-${String(i).padStart(2, '0')}`;
      await saveDailyEntry({
        mode: 'School',
        date,
        outcomes: ['Outcome 1', '', ''],
        todos: [],
        notes: `Notes for ${date}`,
      });
    }

    const page1 = await getDailyEntriesPage(0, 5);
    expect(page1).toHaveLength(5);
    // Should be sorted newest-first
    expect(page1[0].date).toBe('2026-02-15');
    expect(page1[4].date).toBe('2026-02-11');

    const page2 = await getDailyEntriesPage(5, 5);
    expect(page2).toHaveLength(5);
    expect(page2[0].date).toBe('2026-02-10');
  });

  it('returns fewer items when offset exceeds data', async () => {
    await saveDailyEntry({
      mode: 'School',
      date: '2026-02-01',
      outcomes: ['A', '', ''],
      todos: [],
      notes: '',
    });

    const page = await getDailyEntriesPage(10, 5);
    expect(page).toHaveLength(0);
  });

  it('returns empty array for empty store', async () => {
    const page = await getDailyEntriesPage(0, 10);
    expect(page).toHaveLength(0);
  });
});
