import { describe, it, expect, beforeEach } from 'vitest';
import { initDB } from '../../src/db.js';
import { saveDailyEntry, getDailyEntry, toggleDailyTask } from '../../src/stores/daily.js';

beforeEach(async () => {
  await initDB();
});

describe('Daily Outcomes integration', () => {
  it('creates a daily entry with 3 outcomes', async () => {
    const entry = await saveDailyEntry({
      date: '2026-02-19',
      tasks: [
        { text: 'Finish report', done: false },
        { text: 'Review PR', done: false },
        { text: 'Update docs', done: false },
      ],
    });

    expect(entry.tasks).toHaveLength(3);
    expect(entry.tasks[0].text).toBe('Finish report');
    expect(entry.tasks[0].done).toBe(false);
  });

  it('updates outcomes for the same date', async () => {
    await saveDailyEntry({
      date: '2026-02-19',
      tasks: [{ text: 'Original', done: false }],
    });

    const updated = await saveDailyEntry({
      date: '2026-02-19',
      tasks: [
        { text: 'Changed', done: false },
        { text: 'New item', done: true },
      ],
    });

    expect(updated.tasks).toHaveLength(2);
    expect(updated.tasks[0].text).toBe('Changed');
    expect(updated.tasks[1].done).toBe(true);
  });

  it('toggles a specific outcome done/undone', async () => {
    await saveDailyEntry({
      date: '2026-02-19',
      tasks: [
        { text: 'Task A', done: false },
        { text: 'Task B', done: false },
      ],
    });

    const toggled = await toggleDailyTask('2026-02-19', 0);
    expect(toggled.tasks[0].done).toBe(true);
    expect(toggled.tasks[1].done).toBe(false);
  });

  it('preserves evaluation when updating outcomes', async () => {
    await saveDailyEntry({
      date: '2026-02-19',
      tasks: [{ text: 'Task 1', done: false }],
      evaluation: 'Good day',
    });

    const updated = await saveDailyEntry({
      date: '2026-02-19',
      tasks: [{ text: 'Task 1 updated', done: true }],
      evaluation: 'Good day',
    });

    expect(updated.evaluation).toBe('Good day');
    expect(updated.tasks[0].text).toBe('Task 1 updated');
  });

  it('saves evaluation via daily entry (reflection block)', async () => {
    await saveDailyEntry({
      date: '2026-02-19',
      tasks: [{ text: 'Something', done: false }],
    });

    const updated = await saveDailyEntry({
      date: '2026-02-19',
      tasks: [{ text: 'Something', done: false }],
      evaluation: 'Learned a lot today',
    });

    expect(updated.evaluation).toBe('Learned a lot today');
  });

  it('retrieves entry for today with outcomes and reflection', async () => {
    await saveDailyEntry({
      date: '2026-02-19',
      tasks: [
        { text: 'Outcome 1', done: true },
        { text: 'Outcome 2', done: false },
        { text: 'Outcome 3', done: false },
      ],
      evaluation: 'Productive day',
    });

    const entry = await getDailyEntry('2026-02-19');
    expect(entry).not.toBeNull();
    expect(entry.tasks).toHaveLength(3);
    expect(entry.evaluation).toBe('Productive day');
  });

  it('returns null for a date with no entry', async () => {
    const entry = await getDailyEntry('2099-01-01');
    expect(entry).toBeNull();
  });
});
