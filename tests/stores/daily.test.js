import { describe, it, expect, beforeEach } from 'vitest';
import { initDB } from '../../src/db.js';
import { saveDailyEntry, getDailyEntry, getAllDailyEntries, toggleDailyTask } from '../../src/stores/daily.js';

beforeEach(async () => {
  await initDB();
});

describe('Daily store', () => {
  it('saveDailyEntry creates a new entry', async () => {
    const entry = await saveDailyEntry({
      date: '2026-02-19',
      tasks: [
        { text: 'Task 1', done: false },
        { text: 'Task 2', done: true },
      ],
      evaluation: 'Good day',
    });

    expect(entry.id).toBeDefined();
    expect(entry.date).toBe('2026-02-19');
    expect(entry.tasks).toHaveLength(2);
    expect(entry.tasks[0].text).toBe('Task 1');
    expect(entry.tasks[0].done).toBe(false);
    expect(entry.evaluation).toBe('Good day');
    expect(entry.updatedAt).toBeDefined();
  });

  it('saveDailyEntry updates existing entry for same date', async () => {
    const first = await saveDailyEntry({
      date: '2026-02-19',
      tasks: [{ text: 'Original', done: false }],
    });
    const second = await saveDailyEntry({
      date: '2026-02-19',
      tasks: [{ text: 'Updated', done: true }],
    });

    expect(second.id).toBe(first.id);
    expect(second.tasks[0].text).toBe('Updated');
  });

  it('getDailyEntry returns entry by date', async () => {
    await saveDailyEntry({
      date: '2026-02-19',
      tasks: [{ text: 'Test', done: false }],
    });

    const entry = await getDailyEntry('2026-02-19');
    expect(entry).not.toBeNull();
    expect(entry.date).toBe('2026-02-19');
  });

  it('getDailyEntry returns null for missing date', async () => {
    const entry = await getDailyEntry('2099-01-01');
    expect(entry).toBeNull();
  });

  it('getAllDailyEntries returns sorted desc', async () => {
    await saveDailyEntry({ date: '2026-02-17', tasks: [{ text: 'A', done: false }] });
    await saveDailyEntry({ date: '2026-02-19', tasks: [{ text: 'B', done: false }] });
    await saveDailyEntry({ date: '2026-02-18', tasks: [{ text: 'C', done: false }] });

    const all = await getAllDailyEntries();
    expect(all).toHaveLength(3);
    expect(all[0].date).toBe('2026-02-19');
    expect(all[2].date).toBe('2026-02-17');
  });

  it('toggleDailyTask flips task done state', async () => {
    await saveDailyEntry({
      date: '2026-02-19',
      tasks: [{ text: 'Toggle me', done: false }],
    });

    const updated = await toggleDailyTask('2026-02-19', 0);
    expect(updated.tasks[0].done).toBe(true);

    const toggledBack = await toggleDailyTask('2026-02-19', 0);
    expect(toggledBack.tasks[0].done).toBe(false);
  });

  it('toggleDailyTask returns null for invalid index', async () => {
    await saveDailyEntry({
      date: '2026-02-19',
      tasks: [{ text: 'Only one', done: false }],
    });

    const result = await toggleDailyTask('2026-02-19', 5);
    expect(result).toBeNull();
  });

  it('saveDailyEntry rejects invalid date', async () => {
    await expect(saveDailyEntry({
      date: 'bad',
      tasks: [],
    })).rejects.toThrow('date');
  });

  it('saveDailyEntry rejects non-array tasks', async () => {
    await expect(saveDailyEntry({
      date: '2026-02-19',
      tasks: 'not-array',
    })).rejects.toThrow('tasks');
  });

  it('saveDailyEntry trims task text and evaluation', async () => {
    const entry = await saveDailyEntry({
      date: '2026-02-19',
      tasks: [{ text: '  spaced  ', done: false }],
      evaluation: '  trimmed  ',
    });
    expect(entry.tasks[0].text).toBe('spaced');
    expect(entry.evaluation).toBe('trimmed');
  });
});
