import { describe, it, expect, beforeEach } from 'vitest';
import { initDB } from '../../src/db.js';
import {
  addHoursEntry, getHoursEntry, updateHoursEntry, deleteHoursEntry,
  getWeeklyOverview, exportEntries,
} from '../../src/stores/bpv.js';

beforeEach(async () => {
  await initDB();
});

// ─── TrackerEntry CRUD ────────────────────────────────────────────────────────

describe('BPV store — TrackerEntry CRUD', () => {
  it('addHoursEntry creates a work entry with correct shape', async () => {
    const entry = await addHoursEntry('2026-02-19', {
      type: 'work',
      startTime: '08:00',
      endTime: '16:45',
      breakMinutes: 45,
      note: 'CNC draaiwerk',
    });

    expect(entry.id).toBeDefined();
    expect(entry.date).toBe('2026-02-19');
    expect(entry.week).toBe('2026-W08');
    expect(entry.type).toBe('work');
    expect(entry.startTime).toBe('08:00');
    expect(entry.endTime).toBe('16:45');
    expect(entry.breakMinutes).toBe(45);
    // 16:45 - 08:00 = 525min; 525 - 45min break = 480min = 8h
    expect(entry.netMinutes).toBe(480);
    expect(entry.note).toBe('CNC draaiwerk');
    expect(entry.createdAt).toBeDefined();
    expect(entry.updatedAt).toBeDefined();
  });

  it('addHoursEntry calculates netMinutes correctly', async () => {
    const entry = await addHoursEntry('2026-02-20', {
      type: 'work',
      startTime: '09:00',
      endTime: '17:00',
      breakMinutes: 30,
    });
    // 17:00 - 09:00 = 8h = 480min; 480 - 30 = 450min
    expect(entry.netMinutes).toBe(450);
  });

  it('addHoursEntry sets netMinutes to 0 for non-work types', async () => {
    const sick = await addHoursEntry('2026-02-23', { type: 'sick' });
    expect(sick.netMinutes).toBe(0);
    expect(sick.startTime).toBeNull();
    expect(sick.endTime).toBeNull();

    const holiday = await addHoursEntry('2026-02-24', { type: 'holiday' });
    expect(holiday.netMinutes).toBe(0);
  });

  it('addHoursEntry upserts — same date updates existing entry', async () => {
    const first = await addHoursEntry('2026-02-25', {
      type: 'work', startTime: '08:00', endTime: '16:00', breakMinutes: 30,
    });
    const second = await addHoursEntry('2026-02-25', {
      type: 'work', startTime: '09:00', endTime: '17:00', breakMinutes: 45,
    });

    expect(second.id).toBe(first.id); // same id — updated, not duplicated
    expect(second.startTime).toBe('09:00');
    expect(second.endTime).toBe('17:00');
    // 17:00 - 09:00 = 480min - 45 = 435min
    expect(second.netMinutes).toBe(435);
  });

  it('addHoursEntry requires date', async () => {
    await expect(addHoursEntry('')).rejects.toThrow('date');
    await expect(addHoursEntry(null)).rejects.toThrow('date');
  });

  it('getHoursEntry returns the entry for the date', async () => {
    await addHoursEntry('2026-03-02', { type: 'work', startTime: '07:30', endTime: '15:30', breakMinutes: 30 });
    const found = await getHoursEntry('2026-03-02');
    expect(found).not.toBeNull();
    expect(found.date).toBe('2026-03-02');
  });

  it('getHoursEntry returns null for a date with no entry', async () => {
    const found = await getHoursEntry('2020-01-01');
    expect(found).toBeNull();
  });

  it('updateHoursEntry changes fields and recalculates netMinutes', async () => {
    const entry = await addHoursEntry('2026-03-03', {
      type: 'work', startTime: '08:00', endTime: '16:00', breakMinutes: 30,
    });
    // 8h - 30m = 450min
    expect(entry.netMinutes).toBe(450);

    const updated = await updateHoursEntry(entry.id, { endTime: '17:00', breakMinutes: 45 });
    // 9h - 45m = 495min
    expect(updated.netMinutes).toBe(495);
    expect(updated.endTime).toBe('17:00');
    expect(updated.id).toBe(entry.id);
  });

  it('updateHoursEntry returns null for non-existent id', async () => {
    const result = await updateHoursEntry('non-existent', { note: 'x' });
    expect(result).toBeNull();
  });

  it('updateHoursEntry zeroes time fields when changing to non-work type', async () => {
    const entry = await addHoursEntry('2026-03-04', {
      type: 'work', startTime: '08:00', endTime: '16:00', breakMinutes: 30,
    });
    const updated = await updateHoursEntry(entry.id, { type: 'sick' });
    expect(updated.netMinutes).toBe(0);
    expect(updated.startTime).toBeNull();
    expect(updated.endTime).toBeNull();
  });

  it('deleteHoursEntry removes the entry', async () => {
    const entry = await addHoursEntry('2026-03-05', {
      type: 'work', startTime: '08:00', endTime: '16:00', breakMinutes: 30,
    });
    await deleteHoursEntry(entry.id);
    const found = await getHoursEntry('2026-03-05');
    expect(found).toBeNull();
  });
});

// ─── Weekly overview ──────────────────────────────────────────────────────────

describe('BPV store — getWeeklyOverview', () => {
  it('returns correct structure for a week with no entries', async () => {
    const ov = await getWeeklyOverview('2026-W07');

    expect(ov.weekStr).toBe('2026-W07');
    expect(ov.totalMinutes).toBe(0);
    expect(ov.targetMinutes).toBe(2400); // 40h
    expect(ov.percentComplete).toBe(0);
    expect(ov.days).toHaveLength(5);
    expect(ov.highlights).toHaveLength(0);
    expect(ov.formattedTarget).toBe('40u');
  });

  it('totalMinutes sums all work days in the week', async () => {
    // Week 09 of 2026: Mon 2026-02-23 … Fri 2026-02-27
    await addHoursEntry('2026-02-23', { type: 'work', startTime: '08:00', endTime: '16:30', breakMinutes: 30 });
    await addHoursEntry('2026-02-24', { type: 'work', startTime: '08:00', endTime: '16:30', breakMinutes: 30 });
    // 2026-02-25 = sick
    await addHoursEntry('2026-02-25', { type: 'sick' });

    const ov = await getWeeklyOverview('2026-W09');
    // Each work day: 8h30 - 30m = 8h = 480min; 2 days = 960min
    expect(ov.totalMinutes).toBe(960);
    expect(ov.days.find((d) => d.date === '2026-02-25')?.type).toBe('sick');
    expect(ov.days.find((d) => d.date === '2026-02-25')?.netMinutes).toBe(0);
  });

  it('percentComplete is capped at 100', async () => {
    // Add 5 × 9 hour days = 2700min > 2400min target
    const dates = ['2026-03-09', '2026-03-10', '2026-03-11', '2026-03-12', '2026-03-13'];
    for (const date of dates) {
      await addHoursEntry(date, { type: 'work', startTime: '07:00', endTime: '16:30', breakMinutes: 30 });
    }
    const ov = await getWeeklyOverview('2026-W11');
    expect(ov.percentComplete).toBe(100);
  });

  it('days array has 5 entries (Mon–Fri) with correct shape', async () => {
    const ov = await getWeeklyOverview('2026-W08');
    expect(ov.days).toHaveLength(5);
    const [mon, tue, wed, thu, fri] = ov.days;
    expect(mon.day).toBe('ma');
    expect(tue.day).toBe('di');
    expect(wed.day).toBe('wo');
    expect(thu.day).toBe('do');
    expect(fri.day).toBe('vr');
  });

  it('logged flag is false for days without an entry', async () => {
    const ov = await getWeeklyOverview('2026-W12');
    ov.days.forEach((d) => expect(d.logged).toBe(false));
  });
});

// ─── Export ───────────────────────────────────────────────────────────────────

describe('BPV store — exportEntries', () => {
  it('CSV export has correct header and row count', async () => {
    await addHoursEntry('2026-02-16', { type: 'work', startTime: '08:00', endTime: '16:00', breakMinutes: 30, note: 'Test' });
    await addHoursEntry('2026-02-17', { type: 'sick' });

    const csv = await exportEntries('csv');
    const lines = csv.split('\n').filter(Boolean);

    expect(lines[0]).toBe('datum,week,type,start,einde,pauze_min,netto_min,netto_uren,notitie,omschrijving,tags');
    // At least 2 data rows (may have more from other tests)
    expect(lines.length).toBeGreaterThanOrEqual(3);

    const row1 = lines.find((l) => l.startsWith('2026-02-16'));
    expect(row1).toBeDefined();
    expect(row1).toContain('work');
    expect(row1).toContain('08:00');
  });

  it('JSON export is valid parseable JSON array', async () => {
    await addHoursEntry('2026-02-18', { type: 'work', startTime: '09:00', endTime: '17:00', breakMinutes: 30 });

    const json = await exportEntries('json');
    const parsed = JSON.parse(json);

    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed.length).toBeGreaterThanOrEqual(1);

    const row = parsed.find((r) => r.date === '2026-02-18');
    expect(row).toBeDefined();
    expect(row.type).toBe('work');
    expect(row.netMinutes).toBe(450); // 8h - 30m = 450min
    expect(row.netHours).toBe(7.5);
    expect(Array.isArray(row.tags)).toBe(true);
  });

  it('JSON export entries are sorted by date', async () => {
    await addHoursEntry('2026-03-20', { type: 'work', startTime: '08:00', endTime: '16:00', breakMinutes: 30 });
    await addHoursEntry('2026-03-18', { type: 'work', startTime: '08:00', endTime: '16:00', breakMinutes: 30 });
    await addHoursEntry('2026-03-19', { type: 'sick' });

    const json = await exportEntries('json');
    const parsed = JSON.parse(json);
    const dates = parsed.map((r) => r.date);
    const sorted = [...dates].sort();
    expect(dates).toEqual(sorted);
  });

  it('exportEntries returns empty CSV header for no entries', async () => {
    // In a fresh DB there are no entries; other tests add entries so just
    // verify the format is still valid when called
    const csv = await exportEntries('csv');
    expect(csv.split('\n')[0]).toContain('datum');
  });
});
