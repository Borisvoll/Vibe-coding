import { describe, it, expect, beforeEach } from 'vitest';
import { initDB } from '../../src/db.js';
import { saveDailyEntry, getDailyEntriesPage } from '../../src/stores/daily.js';
import { _resetModeConfigCache, seedModeConfigIfNeeded } from '../../src/core/modeConfig.js';

beforeEach(async () => {
  await initDB();
  _resetModeConfigCache();
  await seedModeConfigIfNeeded();
});

describe('History browser — pagination', () => {
  it('returns empty array when no entries exist', async () => {
    const entries = await getDailyEntriesPage(0, 10);
    expect(entries).toHaveLength(0);
  });

  it('returns entries sorted newest-first', async () => {
    await saveDailyEntry({ mode: 'School', date: '2026-02-18', outcomes: ['A'], todos: [], notes: '' });
    await saveDailyEntry({ mode: 'School', date: '2026-02-19', outcomes: ['B'], todos: [], notes: '' });
    await saveDailyEntry({ mode: 'School', date: '2026-02-20', outcomes: ['C'], todos: [], notes: '' });

    const entries = await getDailyEntriesPage(0, 10);
    expect(entries.length).toBe(3);
    expect(entries[0].date).toBe('2026-02-20');
    expect(entries[1].date).toBe('2026-02-19');
    expect(entries[2].date).toBe('2026-02-18');
  });

  it('paginates correctly with offset and limit', async () => {
    for (let i = 1; i <= 5; i++) {
      const day = String(i).padStart(2, '0');
      await saveDailyEntry({ mode: 'School', date: `2026-02-${day}`, outcomes: [`Day ${i}`], todos: [], notes: '' });
    }

    const page1 = await getDailyEntriesPage(0, 2);
    expect(page1.length).toBe(2);
    expect(page1[0].date).toBe('2026-02-05');
    expect(page1[1].date).toBe('2026-02-04');

    const page2 = await getDailyEntriesPage(2, 2);
    expect(page2.length).toBe(2);
    expect(page2[0].date).toBe('2026-02-03');
    expect(page2[1].date).toBe('2026-02-02');

    const page3 = await getDailyEntriesPage(4, 2);
    expect(page3.length).toBe(1);
    expect(page3[0].date).toBe('2026-02-01');
  });

  it('handles multiple modes in history', async () => {
    await saveDailyEntry({ mode: 'School', date: '2026-02-20', outcomes: ['School day'], todos: [], notes: '' });
    await saveDailyEntry({ mode: 'Personal', date: '2026-02-20', outcomes: ['Personal day'], todos: [], notes: '' });

    const entries = await getDailyEntriesPage(0, 10);
    expect(entries.length).toBe(2);
    const modes = entries.map((e) => e.mode);
    expect(modes).toContain('School');
    expect(modes).toContain('Personal');
  });

  it('includes todos in entry data', async () => {
    await saveDailyEntry({
      mode: 'School',
      date: '2026-02-20',
      outcomes: ['Test'],
      todos: [{ id: 't1', text: 'Read chapter', done: true }, { id: 't2', text: 'Write essay', done: false }],
      notes: 'Drukke dag',
    });

    const entries = await getDailyEntriesPage(0, 10);
    expect(entries[0].todos).toHaveLength(2);
    expect(entries[0].todos[0].done).toBe(true);
    expect(entries[0].notes).toBe('Drukke dag');
  });
});
