import { describe, it, expect, beforeEach } from 'vitest';
import { initDB } from '../../src/db.js';
import {
  getTodayEntry,
  saveTodayEntry,
  toggleHabit,
  getCreativeSparks,
  getRecentEntries,
  getPersonalDashboardData,
} from '../../src/stores/personal.js';
import { addInboxItem } from '../../src/stores/inbox.js';
import { getToday } from '../../src/utils.js';

beforeEach(async () => {
  await initDB();
});

describe('Personal store — getTodayEntry', () => {
  it('returns a default entry when none exists', async () => {
    const entry = await getTodayEntry();
    expect(entry.id).toBe(getToday());
    expect(entry.gratitude).toBe('');
    expect(entry.reflection).toBe('');
    expect(entry.journalNote).toBe('');
    expect(entry.habits).toEqual({ water: false, movement: false, focus: false });
  });

  it('returns persisted entry after save', async () => {
    await saveTodayEntry({ gratitude: 'Zon buiten' });
    const entry = await getTodayEntry();
    expect(entry.gratitude).toBe('Zon buiten');
  });
});

describe('Personal store — saveTodayEntry', () => {
  it('creates an entry with correct shape', async () => {
    const entry = await saveTodayEntry({
      gratitude: 'Familie',
      reflection: 'Rustige dag',
      journalNote: 'Begonnen met lezen',
    });
    expect(entry.id).toBe(getToday());
    expect(entry.date).toBe(getToday());
    expect(entry.gratitude).toBe('Familie');
    expect(entry.reflection).toBe('Rustige dag');
    expect(entry.journalNote).toBe('Begonnen met lezen');
    expect(entry.updated_at).toBeDefined();
  });

  it('upserts — second save merges fields', async () => {
    await saveTodayEntry({ gratitude: 'Ochtend' });
    await saveTodayEntry({ reflection: 'Goed geslapen' });
    const entry = await getTodayEntry();
    expect(entry.gratitude).toBe('Ochtend');
    expect(entry.reflection).toBe('Goed geslapen');
  });
});

describe('Personal store — toggleHabit', () => {
  it('toggles a habit from false to true', async () => {
    const entry = await toggleHabit('water');
    expect(entry.habits.water).toBe(true);
    expect(entry.habits.movement).toBe(false);
    expect(entry.habits.focus).toBe(false);
  });

  it('toggles a habit back to false', async () => {
    await toggleHabit('water');
    const entry = await toggleHabit('water');
    expect(entry.habits.water).toBe(false);
  });

  it('toggles multiple habits independently', async () => {
    await toggleHabit('water');
    await toggleHabit('focus');
    const entry = await getTodayEntry();
    expect(entry.habits.water).toBe(true);
    expect(entry.habits.movement).toBe(false);
    expect(entry.habits.focus).toBe(true);
  });
});

describe('Personal store — getCreativeSparks', () => {
  it('returns empty array when no inbox items', async () => {
    const sparks = await getCreativeSparks();
    expect(sparks).toEqual([]);
  });

  it('returns only thought-type inbox items', async () => {
    await addInboxItem('Een creatief idee');
    await addInboxItem('https://example.com'); // link type — excluded

    const sparks = await getCreativeSparks();
    expect(sparks).toHaveLength(1);
    expect(sparks[0].text).toBe('Een creatief idee');
    expect(sparks[0].type).toBe('thought');
  });

  it('respects limit parameter', async () => {
    for (let i = 0; i < 8; i++) {
      await addInboxItem(`Idee ${i}`);
    }
    const sparks = await getCreativeSparks(3);
    expect(sparks).toHaveLength(3);
  });
});

describe('Personal store — getRecentEntries', () => {
  it('returns empty array when no entries have content', async () => {
    const entries = await getRecentEntries();
    expect(entries).toEqual([]);
  });

  it('returns entries with journal content', async () => {
    await saveTodayEntry({ journalNote: 'Dag 1 journal' });
    const entries = await getRecentEntries();
    expect(entries).toHaveLength(1);
    expect(entries[0].journalNote).toBe('Dag 1 journal');
  });
});

describe('Personal store — getPersonalDashboardData', () => {
  it('returns the expected shape with no data', async () => {
    const data = await getPersonalDashboardData();
    expect(data).toHaveProperty('today');
    expect(data).toHaveProperty('sparks');
    expect(data).toHaveProperty('recentEntries');
    expect(data).toHaveProperty('habitsComplete');
    expect(data).toHaveProperty('habitsTotal');
    expect(data.habitsTotal).toBe(3);
    expect(data.habitsComplete).toBe(0);
  });

  it('habitsComplete reflects toggled habits', async () => {
    await toggleHabit('water');
    await toggleHabit('focus');
    const data = await getPersonalDashboardData();
    expect(data.habitsComplete).toBe(2);
  });

  it('sparks includes thought-type inbox items', async () => {
    await addInboxItem('Inspiratie voor project');
    const data = await getPersonalDashboardData();
    expect(data.sparks).toHaveLength(1);
    expect(data.sparks[0].text).toBe('Inspiratie voor project');
  });
});
