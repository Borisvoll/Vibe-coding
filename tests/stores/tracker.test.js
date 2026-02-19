import { describe, it, expect, beforeEach } from 'vitest';
import { initDB } from '../../src/db.js';
import {
  saveHoursEntry, getHoursForDate, getHoursForWeek, getAllHours,
  saveLogbookEntry, getLogbookForDate, getLogbookForWeek, getAllLogbook,
} from '../../src/stores/tracker.js';

beforeEach(async () => {
  await initDB();
});

describe('Tracker store — Hours', () => {
  it('saveHoursEntry creates a new entry', async () => {
    const entry = await saveHoursEntry({
      date: '2026-02-19',
      type: 'work',
      value: 8,
    });
    expect(entry.id).toBeDefined();
    expect(entry.date).toBe('2026-02-19');
    expect(entry.week).toMatch(/^\d{4}-W\d{2}$/);
    expect(entry.type).toBe('work');
    expect(entry.value).toBe(8);
    expect(entry.updatedAt).toBeDefined();
  });

  it('saveHoursEntry updates existing entry for same date', async () => {
    const first = await saveHoursEntry({ date: '2026-02-19', type: 'work', value: 4 });
    const second = await saveHoursEntry({ date: '2026-02-19', type: 'work', value: 8 });
    expect(second.id).toBe(first.id);
    expect(second.value).toBe(8);
  });

  it('getHoursForDate returns entry', async () => {
    await saveHoursEntry({ date: '2026-02-19', type: 'work', value: 8 });
    const entry = await getHoursForDate('2026-02-19');
    expect(entry).not.toBeNull();
    expect(entry.value).toBe(8);
  });

  it('getHoursForDate returns null for missing date', async () => {
    const entry = await getHoursForDate('2099-01-01');
    expect(entry).toBeNull();
  });

  it('getHoursForWeek returns entries in a week', async () => {
    await saveHoursEntry({ date: '2026-02-16', type: 'work', value: 8 });
    await saveHoursEntry({ date: '2026-02-17', type: 'work', value: 7 });
    const week = await getHoursForWeek('2026-W08');
    expect(week.length).toBeGreaterThanOrEqual(2);
  });

  it('getAllHours returns sorted asc', async () => {
    await saveHoursEntry({ date: '2026-02-19', type: 'work', value: 8 });
    await saveHoursEntry({ date: '2026-02-17', type: 'work', value: 6 });
    const all = await getAllHours();
    expect(all[0].date).toBe('2026-02-17');
  });

  it('saveHoursEntry rejects invalid type', async () => {
    await expect(saveHoursEntry({
      date: '2026-02-19', type: 'vacation', value: 8,
    })).rejects.toThrow('type');
  });

  it('saveHoursEntry rejects negative hours', async () => {
    await expect(saveHoursEntry({
      date: '2026-02-19', type: 'work', value: -1,
    })).rejects.toThrow('value');
  });

  it('saveHoursEntry rejects hours > 24', async () => {
    await expect(saveHoursEntry({
      date: '2026-02-19', type: 'work', value: 25,
    })).rejects.toThrow('value');
  });

  it('saveHoursEntry accepts zero hours for sick day', async () => {
    const entry = await saveHoursEntry({ date: '2026-02-19', type: 'sick', value: 0 });
    expect(entry.type).toBe('sick');
    expect(entry.value).toBe(0);
  });
});

describe('Tracker store — Logbook', () => {
  it('saveLogbookEntry creates a new entry', async () => {
    const entry = await saveLogbookEntry({
      date: '2026-02-19',
      text: 'Worked on CNC machine',
      tags: ['CNC', 'frezen'],
    });
    expect(entry.id).toBeDefined();
    expect(entry.date).toBe('2026-02-19');
    expect(entry.week).toMatch(/^\d{4}-W\d{2}$/);
    expect(entry.text).toBe('Worked on CNC machine');
    expect(entry.tags).toEqual(['CNC', 'frezen']);
  });

  it('saveLogbookEntry trims text', async () => {
    const entry = await saveLogbookEntry({
      date: '2026-02-19',
      text: '  spaced  ',
      tags: [],
    });
    expect(entry.text).toBe('spaced');
  });

  it('saveLogbookEntry rejects empty text', async () => {
    await expect(saveLogbookEntry({
      date: '2026-02-19', text: '', tags: [],
    })).rejects.toThrow('text');
  });

  it('getLogbookForDate returns entries', async () => {
    await saveLogbookEntry({ date: '2026-02-19', text: 'Entry 1', tags: [] });
    await saveLogbookEntry({ date: '2026-02-19', text: 'Entry 2', tags: [] });
    const entries = await getLogbookForDate('2026-02-19');
    expect(entries).toHaveLength(2);
  });

  it('getLogbookForWeek returns entries in a week', async () => {
    await saveLogbookEntry({ date: '2026-02-16', text: 'Monday', tags: [] });
    await saveLogbookEntry({ date: '2026-02-17', text: 'Tuesday', tags: [] });
    const week = await getLogbookForWeek('2026-W08');
    expect(week.length).toBeGreaterThanOrEqual(2);
  });

  it('getAllLogbook returns sorted desc', async () => {
    await saveLogbookEntry({ date: '2026-02-17', text: 'Earlier', tags: [] });
    await saveLogbookEntry({ date: '2026-02-19', text: 'Later', tags: [] });
    const all = await getAllLogbook();
    expect(all[0].date).toBe('2026-02-19');
  });
});
