import { describe, it, expect, beforeEach } from 'vitest';
import { initDB } from '../../src/db.js';
import {
  aggregateWeeklyReview,
  getWeeklyPrompt,
  isReviewSent,
  markReviewSent,
  isFriday,
} from '../../src/stores/weekly-review.js';
import { addTask, toggleTask } from '../../src/stores/tasks.js';
import { addHoursEntry } from '../../src/stores/bpv.js';
import { addInboxItem, archiveItem } from '../../src/stores/inbox.js';
import { saveTodayEntry } from '../../src/stores/personal.js';
import { getToday, getISOWeek } from '../../src/utils.js';

beforeEach(async () => {
  await initDB();
});

describe('Weekly review — aggregateWeeklyReview', () => {
  it('returns the expected shape with no data', async () => {
    const data = await aggregateWeeklyReview();
    expect(data).toHaveProperty('week');
    expect(data).toHaveProperty('weekStart');
    expect(data).toHaveProperty('weekEnd');
    expect(data).toHaveProperty('completedTasks');
    expect(data).toHaveProperty('completedTaskCount');
    expect(data).toHaveProperty('openTaskCount');
    expect(data).toHaveProperty('bpv');
    expect(data).toHaveProperty('gratitude');
    expect(data).toHaveProperty('reflections');
    expect(data).toHaveProperty('journalNotes');
    expect(data).toHaveProperty('habitsSummary');
    expect(data).toHaveProperty('activeProjects');
    expect(data).toHaveProperty('processedInboxCount');
    expect(data).toHaveProperty('prompt');
    expect(data.completedTaskCount).toBe(0);
  });

  it('counts completed tasks for this week', async () => {
    const today = getToday();
    const task = await addTask('Week task', 'BPV', today);
    await toggleTask(task.id);

    const week = getISOWeek(today);
    const data = await aggregateWeeklyReview(week);
    expect(data.completedTaskCount).toBeGreaterThanOrEqual(1);
    const found = data.completedTasks.find((t) => t.text === 'Week task');
    expect(found).toBeDefined();
    expect(found.status).toBe('done');
  });

  it('counts open tasks', async () => {
    await addTask('Open task', 'School');
    const data = await aggregateWeeklyReview();
    expect(data.openTaskCount).toBeGreaterThanOrEqual(1);
  });

  it('includes BPV hours for the week', async () => {
    // Use Monday of the current week — getWeeklyOverview only sums Mon-Fri dates
    const d = new Date();
    const day = d.getDay(); // 0=Sun, 1=Mon, …, 6=Sat
    d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
    const monday = d.toISOString().slice(0, 10);
    await addHoursEntry(monday, {
      type: 'work', startTime: '08:00', endTime: '16:30', breakMinutes: 30,
    });

    const week = getISOWeek(monday);
    const data = await aggregateWeeklyReview(week);
    expect(data.bpv.totalMinutes).toBeGreaterThanOrEqual(480);
    expect(data.bpv.percentComplete).toBeGreaterThan(0);
  });

  it('includes gratitude entries for this week', async () => {
    await saveTodayEntry({ gratitude: 'Zon en stilte' });
    const data = await aggregateWeeklyReview();
    const found = data.gratitude.find((g) => g.text === 'Zon en stilte');
    expect(found).toBeDefined();
  });

  it('includes reflection entries for this week', async () => {
    await saveTodayEntry({ reflection: 'Rustige dag gehad' });
    const data = await aggregateWeeklyReview();
    const found = data.reflections.find((r) => r.text === 'Rustige dag gehad');
    expect(found).toBeDefined();
  });

  it('includes journal notes for this week', async () => {
    await saveTodayEntry({ journalNote: 'Begonnen met mediteren' });
    const data = await aggregateWeeklyReview();
    const found = data.journalNotes.find((j) => j.text === 'Begonnen met mediteren');
    expect(found).toBeDefined();
  });

  it('counts processed inbox items for this week', async () => {
    const item = await addInboxItem('Test idee');
    await archiveItem(item.id);
    const data = await aggregateWeeklyReview();
    expect(data.processedInboxCount).toBeGreaterThanOrEqual(1);
  });

  it('includes habits summary', async () => {
    const data = await aggregateWeeklyReview();
    expect(data.habitsSummary).toHaveProperty('water');
    expect(data.habitsSummary).toHaveProperty('movement');
    expect(data.habitsSummary).toHaveProperty('focus');
  });
});

describe('Weekly review — getWeeklyPrompt', () => {
  it('returns a string', () => {
    const prompt = getWeeklyPrompt('2026-W08');
    expect(typeof prompt).toBe('string');
    expect(prompt.length).toBeGreaterThan(10);
  });

  it('returns different prompts for different weeks', () => {
    const a = getWeeklyPrompt('2026-W08');
    const b = getWeeklyPrompt('2026-W09');
    // They cycle through 8 prompts, so adjacent weeks differ
    expect(a).not.toBe(b);
  });
});

describe('Weekly review — isReviewSent / markReviewSent', () => {
  it('returns false for unsent week', async () => {
    const sent = await isReviewSent('2026-W99');
    expect(sent).toBe(false);
  });

  it('returns true after marking as sent', async () => {
    await markReviewSent('2026-W08');
    const sent = await isReviewSent('2026-W08');
    expect(sent).toBe(true);
  });

  it('different weeks are independent', async () => {
    await markReviewSent('2026-W08');
    const sent09 = await isReviewSent('2026-W09');
    expect(sent09).toBe(false);
  });
});

describe('Weekly review — isFriday', () => {
  it('returns a boolean', () => {
    expect(typeof isFriday()).toBe('boolean');
  });
});
