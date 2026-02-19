import { describe, it, expect, beforeEach } from 'vitest';
import { initDB } from '../../src/db.js';
import { saveDailyEntry, addTodo, toggleTodo } from '../../src/stores/daily.js';
import {
  getDailySummary,
  getWeeklySummary,
  getMonthlySummary,
} from '../../src/os/dailyAggregator.js';

beforeEach(async () => {
  await initDB();
});

describe('dailyAggregator', () => {
  // ── getDailySummary ────────────────────────────────────────────────────────

  it('getDailySummary returns zeros for missing entry', async () => {
    const summary = await getDailySummary('School', '2099-01-01');
    expect(summary).toEqual({ outcomesSet: 0, todosTotal: 0, todosDone: 0, notes: '' });
  });

  it('getDailySummary counts non-empty outcomes', async () => {
    await saveDailyEntry({
      mode: 'School',
      date: '2026-02-19',
      outcomes: ['Goal A', '', 'Goal C'],
      todos: [],
      notes: '',
    });
    const summary = await getDailySummary('School', '2026-02-19');
    expect(summary.outcomesSet).toBe(2);
  });

  it('getDailySummary counts todos and done', async () => {
    const entry = await addTodo('School', '2026-02-19', 'Todo 1');
    await addTodo('School', '2026-02-19', 'Todo 2');
    const todoId = entry.todos[0].id;
    await toggleTodo('School', '2026-02-19', todoId);

    const summary = await getDailySummary('School', '2026-02-19');
    expect(summary.todosTotal).toBe(2);
    expect(summary.todosDone).toBe(1);
  });

  it('getDailySummary includes notes', async () => {
    await saveDailyEntry({ mode: 'Personal', date: '2026-02-19', outcomes: [], todos: [], notes: 'Great day' });
    const summary = await getDailySummary('Personal', '2026-02-19');
    expect(summary.notes).toBe('Great day');
  });

  it('getDailySummary is mode-isolated', async () => {
    await saveDailyEntry({ mode: 'School', date: '2026-02-19', outcomes: ['School goal', '', ''], todos: [], notes: '' });
    const personalSummary = await getDailySummary('Personal', '2026-02-19');
    expect(personalSummary.outcomesSet).toBe(0);
  });

  // ── getWeeklySummary ───────────────────────────────────────────────────────

  it('getWeeklySummary returns zeros for empty week', async () => {
    const summary = await getWeeklySummary('School', '2026-W01');
    expect(summary).toEqual({ totalOutcomesSet: 0, totalTodosDone: 0, totalTodosTotal: 0, daysWithEntries: 0 });
  });

  it('getWeeklySummary aggregates across days in the week', async () => {
    // 2026-W08 = Feb 16–22, 2026
    await saveDailyEntry({ mode: 'School', date: '2026-02-16', outcomes: ['Goal', '', ''], todos: [], notes: '' });
    await saveDailyEntry({ mode: 'School', date: '2026-02-17', outcomes: ['Goal 2', 'Goal 3', ''], todos: [], notes: '' });

    const summary = await getWeeklySummary('School', '2026-W08');
    expect(summary.daysWithEntries).toBe(2);
    expect(summary.totalOutcomesSet).toBe(3); // 1 + 2
  });

  it('getWeeklySummary sums todos done across days', async () => {
    const e1 = await addTodo('School', '2026-02-16', 'Monday todo');
    await toggleTodo('School', '2026-02-16', e1.todos[0].id);
    await addTodo('School', '2026-02-17', 'Tuesday todo undone');

    const summary = await getWeeklySummary('School', '2026-W08');
    expect(summary.totalTodosTotal).toBe(2);
    expect(summary.totalTodosDone).toBe(1);
  });

  it('getWeeklySummary is mode-isolated', async () => {
    await saveDailyEntry({ mode: 'Personal', date: '2026-02-16', outcomes: ['Personal goal', '', ''], todos: [], notes: '' });

    const schoolSummary = await getWeeklySummary('School', '2026-W08');
    expect(schoolSummary.daysWithEntries).toBe(0);
    expect(schoolSummary.totalOutcomesSet).toBe(0);
  });

  // ── getMonthlySummary ──────────────────────────────────────────────────────

  it('getMonthlySummary returns zeros + null for empty month', async () => {
    const summary = await getMonthlySummary('School', '2025-01');
    expect(summary).toEqual({ totalTodosDone: 0, topOutcome: null });
  });

  it('getMonthlySummary sums todos done', async () => {
    const e1 = await addTodo('School', '2026-02-01', 'Feb 1 todo');
    const e2 = await addTodo('School', '2026-02-02', 'Feb 2 todo');
    await toggleTodo('School', '2026-02-01', e1.todos[0].id);
    await toggleTodo('School', '2026-02-02', e2.todos[0].id);
    await addTodo('School', '2026-02-03', 'Undone todo');

    const summary = await getMonthlySummary('School', '2026-02');
    expect(summary.totalTodosDone).toBe(2);
  });

  it('getMonthlySummary finds topOutcome (most repeated)', async () => {
    await saveDailyEntry({ mode: 'School', date: '2026-02-01', outcomes: ['Wiskunde', '', ''], todos: [], notes: '' });
    await saveDailyEntry({ mode: 'School', date: '2026-02-02', outcomes: ['Wiskunde', '', ''], todos: [], notes: '' });
    await saveDailyEntry({ mode: 'School', date: '2026-02-03', outcomes: ['Andere doel', '', ''], todos: [], notes: '' });

    const summary = await getMonthlySummary('School', '2026-02');
    expect(summary.topOutcome).toBe('Wiskunde');
  });

  it('getMonthlySummary topOutcome is null when all outcomes empty', async () => {
    await saveDailyEntry({ mode: 'School', date: '2026-02-01', outcomes: ['', '', ''], todos: [], notes: '' });
    const summary = await getMonthlySummary('School', '2026-02');
    expect(summary.topOutcome).toBeNull();
  });

  it('getMonthlySummary is mode-isolated', async () => {
    await addTodo('Personal', '2026-02-01', 'Personal todo done');
    const e = await getDailySummary('Personal', '2026-02-01');
    // School should see 0
    const schoolSummary = await getMonthlySummary('School', '2026-02');
    expect(schoolSummary.totalTodosDone).toBe(0);
  });
});
