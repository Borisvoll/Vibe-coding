import { describe, it, expect, beforeEach } from 'vitest';
import { initDB } from '../../src/db.js';
import {
  getHabitsByMode,
  addHabit,
  updateHabit,
  archiveHabit,
  deleteHabit,
  toggleHabitLog,
  getHabitLogForDate,
  getLogsForDate,
  getStreak,
  getHabitHistory,
  getTodayCompletions,
} from '../../src/stores/habits.js';

const TODAY = '2026-02-21';

// Vitest runs with fake-indexeddb; getToday() returns real date.
// We test with explicit date args where needed.

describe('habits store', () => {
  beforeEach(async () => {
    await initDB();
  });

  it('adds a habit', async () => {
    const h = await addHabit('Hardlopen', 'School');
    expect(h.id).toBeTruthy();
    expect(h.name).toBe('Hardlopen');
    expect(h.mode).toBe('School');
    expect(h.archived).toBe(false);
  });

  it('retrieves habits by mode', async () => {
    await addHabit('Lezen', 'School');
    await addHabit('Meditatie', 'Personal');
    const school = await getHabitsByMode('School');
    expect(school.some((h) => h.name === 'Lezen')).toBe(true);
    expect(school.every((h) => h.mode === 'School')).toBe(true);
  });

  it('excludes archived habits from getHabitsByMode', async () => {
    const h = await addHabit('Oud', 'School');
    await archiveHabit(h.id);
    const school = await getHabitsByMode('School');
    expect(school.find((x) => x.id === h.id)).toBeUndefined();
  });

  it('updates a habit', async () => {
    const h = await addHabit('Lezen', 'Personal');
    const updated = await updateHabit(h.id, { name: 'Dagelijks lezen' });
    expect(updated.name).toBe('Dagelijks lezen');
  });

  it('deletes a habit', async () => {
    const h = await addHabit('Verwijder mij', 'School');
    await deleteHabit(h.id);
    const all = await getHabitsByMode('School');
    expect(all.find((x) => x.id === h.id)).toBeUndefined();
  });

  it('toggles a habit log on (first toggle = completed)', async () => {
    const h = await addHabit('Water', 'Personal');
    const result = await toggleHabitLog(h.id, TODAY);
    expect(result.completed).toBe(true);

    const log = await getHabitLogForDate(h.id, TODAY);
    expect(log).toBeTruthy();
    expect(log.habit_id).toBe(h.id);
  });

  it('toggles a habit log off (second toggle = removed)', async () => {
    const h = await addHabit('Water', 'Personal');
    await toggleHabitLog(h.id, TODAY);
    const result = await toggleHabitLog(h.id, TODAY);
    expect(result.completed).toBe(false);

    const log = await getHabitLogForDate(h.id, TODAY);
    expect(log).toBeNull();
  });

  it('gets logs for a date', async () => {
    const h1 = await addHabit('A', 'School');
    const h2 = await addHabit('B', 'School');
    await toggleHabitLog(h1.id, TODAY);
    await toggleHabitLog(h2.id, TODAY);

    const logs = await getLogsForDate(TODAY);
    expect(logs.length).toBeGreaterThanOrEqual(2);
  });

  it('returns 0 streak when never completed', async () => {
    const h = await addHabit('Nieuw', 'School');
    const streak = await getStreak(h.id);
    expect(streak).toBe(0);
  });

  it('returns history array of correct length', async () => {
    const h = await addHabit('Hist', 'School');
    const history = await getHabitHistory(h.id, 7);
    expect(history).toHaveLength(7);
    expect(history.every((d) => typeof d.date === 'string' && typeof d.completed === 'boolean')).toBe(true);
  });

  it('getTodayCompletions returns a Map', async () => {
    const h = await addHabit('Map test', 'Personal');
    const map = await getTodayCompletions('Personal');
    expect(map instanceof Map).toBe(true);
    expect(map.has(h.id)).toBe(true);
    expect(map.get(h.id)).toBe(false);
  });
});
