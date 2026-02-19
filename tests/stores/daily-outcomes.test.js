/**
 * daily-outcomes.test.js — Integration tests for the daily-outcomes block pattern.
 * Updated to use mode-aware daily store API (v7).
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { initDB } from '../../src/db.js';
import {
  saveDailyEntry,
  getDailyEntry,
  saveOutcomes,
  addTodo,
  toggleTodo,
} from '../../src/stores/daily.js';

beforeEach(async () => {
  await initDB();
});

describe('Daily Outcomes integration', () => {
  it('creates a daily entry with 3 outcomes', async () => {
    const entry = await saveDailyEntry({
      mode: 'School',
      date: '2026-02-19',
      outcomes: ['Finish report', 'Review PR', 'Update docs'],
      todos: [],
      notes: '',
    });

    expect(entry.outcomes).toHaveLength(3);
    expect(entry.outcomes[0]).toBe('Finish report');
  });

  it('updates outcomes for the same mode+date', async () => {
    await saveDailyEntry({ mode: 'School', date: '2026-02-19', outcomes: ['Original'], todos: [], notes: '' });
    const updated = await saveOutcomes('School', '2026-02-19', ['Changed', 'New item', '']);
    expect(updated.outcomes[0]).toBe('Changed');
    expect(updated.outcomes[1]).toBe('New item');
  });

  it('toggles a todo done/undone', async () => {
    const entry = await addTodo('School', '2026-02-19', 'Task A');
    await addTodo('School', '2026-02-19', 'Task B');
    const todoId = entry.todos[0].id;

    const toggled = await toggleTodo('School', '2026-02-19', todoId);
    expect(toggled.todos[0].done).toBe(true);
    expect(toggled.todos[1].done).toBe(false);
  });

  it('preserves notes when updating outcomes', async () => {
    await saveDailyEntry({ mode: 'School', date: '2026-02-19', outcomes: ['Task'], todos: [], notes: 'Good day' });
    const updated = await saveOutcomes('School', '2026-02-19', ['Task updated', '', '']);
    expect(updated.notes).toBe('Good day');
    expect(updated.outcomes[0]).toBe('Task updated');
  });

  it('saves notes independently from outcomes', async () => {
    await saveDailyEntry({ mode: 'School', date: '2026-02-19', outcomes: ['Something'], todos: [], notes: '' });
    const updated = await saveDailyEntry({
      mode: 'School', date: '2026-02-19', outcomes: ['Something'], todos: [], notes: 'Learned a lot today',
    });
    expect(updated.notes).toBe('Learned a lot today');
  });

  it('retrieves entry for today with outcomes and notes', async () => {
    await saveDailyEntry({
      mode: 'School',
      date: '2026-02-19',
      outcomes: ['Outcome 1', 'Outcome 2', 'Outcome 3'],
      todos: [],
      notes: 'Productive day',
    });

    const entry = await getDailyEntry('School', '2026-02-19');
    expect(entry).not.toBeNull();
    expect(entry.outcomes).toHaveLength(3);
    expect(entry.notes).toBe('Productive day');
  });

  it('returns null for a date+mode with no entry', async () => {
    const entry = await getDailyEntry('School', '2099-01-01');
    expect(entry).toBeNull();
  });
});
