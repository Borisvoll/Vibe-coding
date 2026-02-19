import { describe, it, expect, beforeEach } from 'vitest';
import { initDB } from '../../src/db.js';
import {
  saveDailyEntry,
  getDailyEntry,
  getAllDailyEntries,
  saveOutcomes,
  addTodo,
  toggleTodo,
  deleteTodo,
  saveNotes,
} from '../../src/stores/daily.js';

beforeEach(async () => {
  await initDB();
});

describe('Daily store — mode-aware', () => {
  // ── saveDailyEntry / getDailyEntry ─────────────────────────────────────────

  it('saveDailyEntry creates entry with composite id', async () => {
    const entry = await saveDailyEntry({
      mode: 'School',
      date: '2026-02-19',
      outcomes: ['Wiskunde', '', ''],
      todos: [],
      notes: '',
    });

    expect(entry.id).toBe('2026-02-19__School');
    expect(entry.mode).toBe('School');
    expect(entry.date).toBe('2026-02-19');
    expect(entry.outcomes).toHaveLength(3);
    expect(entry.outcomes[0]).toBe('Wiskunde');
    expect(entry.updatedAt).toBeDefined();
  });

  it('getDailyEntry loads by mode + date', async () => {
    await saveDailyEntry({ mode: 'School', date: '2026-02-19', outcomes: ['A', '', ''], todos: [], notes: '' });

    const entry = await getDailyEntry('School', '2026-02-19');
    expect(entry).not.toBeNull();
    expect(entry.mode).toBe('School');
    expect(entry.outcomes[0]).toBe('A');
  });

  it('getDailyEntry returns null for missing mode+date', async () => {
    const entry = await getDailyEntry('School', '2099-01-01');
    expect(entry).toBeNull();
  });

  it('getDailyEntry returns null for invalid mode', async () => {
    const entry = await getDailyEntry('Invalid', '2026-02-19');
    expect(entry).toBeNull();
  });

  it('School and Personal entries for same date are independent', async () => {
    await saveDailyEntry({ mode: 'School', date: '2026-02-19', outcomes: ['School outcome', '', ''], todos: [], notes: '' });
    await saveDailyEntry({ mode: 'Personal', date: '2026-02-19', outcomes: ['Personal outcome', '', ''], todos: [], notes: '' });

    const school = await getDailyEntry('School', '2026-02-19');
    const personal = await getDailyEntry('Personal', '2026-02-19');

    expect(school.outcomes[0]).toBe('School outcome');
    expect(personal.outcomes[0]).toBe('Personal outcome');
    expect(school.id).not.toBe(personal.id);
  });

  it('All three modes (School/Personal/BPV) independent for same date', async () => {
    await saveDailyEntry({ mode: 'BPV', date: '2026-02-19', outcomes: ['BPV goal', '', ''], todos: [], notes: '' });
    await saveDailyEntry({ mode: 'School', date: '2026-02-19', outcomes: ['School goal', '', ''], todos: [], notes: '' });
    await saveDailyEntry({ mode: 'Personal', date: '2026-02-19', outcomes: ['Personal goal', '', ''], todos: [], notes: '' });

    expect((await getDailyEntry('BPV', '2026-02-19')).outcomes[0]).toBe('BPV goal');
    expect((await getDailyEntry('School', '2026-02-19')).outcomes[0]).toBe('School goal');
    expect((await getDailyEntry('Personal', '2026-02-19')).outcomes[0]).toBe('Personal goal');
  });

  it('saveDailyEntry upserts (replaces) existing entry for same mode+date', async () => {
    await saveDailyEntry({ mode: 'School', date: '2026-02-19', outcomes: ['First', '', ''], todos: [], notes: '' });
    await saveDailyEntry({ mode: 'School', date: '2026-02-19', outcomes: ['Updated', '', ''], todos: [], notes: '' });

    const all = await getAllDailyEntries();
    const schoolEntries = all.filter(e => e.mode === 'School' && e.date === '2026-02-19');
    expect(schoolEntries).toHaveLength(1);
    expect(schoolEntries[0].outcomes[0]).toBe('Updated');
  });

  it('saveDailyEntry pads outcomes to 3 slots', async () => {
    const entry = await saveDailyEntry({ mode: 'School', date: '2026-02-19', outcomes: ['A'], todos: [], notes: '' });
    expect(entry.outcomes).toHaveLength(3);
    expect(entry.outcomes[1]).toBe('');
    expect(entry.outcomes[2]).toBe('');
  });

  it('saveDailyEntry rejects invalid date', async () => {
    await expect(saveDailyEntry({ mode: 'School', date: 'bad', outcomes: [], todos: [], notes: '' }))
      .rejects.toThrow('date');
  });

  it('saveDailyEntry rejects invalid mode', async () => {
    await expect(saveDailyEntry({ mode: 'Unknown', date: '2026-02-19', outcomes: [], todos: [], notes: '' }))
      .rejects.toThrow('mode');
  });

  it('notes are truncated at 500 characters', async () => {
    const longNotes = 'x'.repeat(600);
    const entry = await saveDailyEntry({ mode: 'School', date: '2026-02-19', outcomes: [], todos: [], notes: longNotes });
    expect(entry.notes.length).toBe(500);
  });

  // ── saveOutcomes ───────────────────────────────────────────────────────────

  it('saveOutcomes persists all 3 outcomes', async () => {
    const entry = await saveOutcomes('School', '2026-02-19', ['Goal 1', 'Goal 2', 'Goal 3']);
    expect(entry.outcomes).toEqual(['Goal 1', 'Goal 2', 'Goal 3']);
  });

  it('saveOutcomes preserves existing todos', async () => {
    await addTodo('School', '2026-02-19', 'Existing todo');
    await saveOutcomes('School', '2026-02-19', ['New outcome', '', '']);
    const entry = await getDailyEntry('School', '2026-02-19');
    expect(entry.todos).toHaveLength(1);
    expect(entry.todos[0].text).toBe('Existing todo');
    expect(entry.outcomes[0]).toBe('New outcome');
  });

  // ── addTodo ────────────────────────────────────────────────────────────────

  it('addTodo creates todo with uuid, done=false', async () => {
    const entry = await addTodo('School', '2026-02-19', 'Do homework');
    expect(entry.todos).toHaveLength(1);
    const todo = entry.todos[0];
    expect(todo.id).toBeDefined();
    expect(todo.text).toBe('Do homework');
    expect(todo.done).toBe(false);
    expect(todo.createdAt).toBeDefined();
    expect(todo.doneAt).toBeNull();
  });

  it('addTodo returns null for empty text', async () => {
    const result = await addTodo('School', '2026-02-19', '   ');
    expect(result).toBeNull();
  });

  it('addTodo appends to existing todos', async () => {
    await addTodo('School', '2026-02-19', 'Todo 1');
    await addTodo('School', '2026-02-19', 'Todo 2');
    const entry = await getDailyEntry('School', '2026-02-19');
    expect(entry.todos).toHaveLength(2);
  });

  it('addTodo keeps modes isolated', async () => {
    await addTodo('School', '2026-02-19', 'School todo');
    await addTodo('Personal', '2026-02-19', 'Personal todo');
    const school = await getDailyEntry('School', '2026-02-19');
    const personal = await getDailyEntry('Personal', '2026-02-19');
    expect(school.todos).toHaveLength(1);
    expect(personal.todos).toHaveLength(1);
    expect(school.todos[0].text).toBe('School todo');
    expect(personal.todos[0].text).toBe('Personal todo');
  });

  // ── toggleTodo ─────────────────────────────────────────────────────────────

  it('toggleTodo flips done state and sets doneAt', async () => {
    const entry = await addTodo('School', '2026-02-19', 'Toggle me');
    const todoId = entry.todos[0].id;

    const toggled = await toggleTodo('School', '2026-02-19', todoId);
    expect(toggled.todos[0].done).toBe(true);
    expect(toggled.todos[0].doneAt).toBeTruthy();

    const toggledBack = await toggleTodo('School', '2026-02-19', todoId);
    expect(toggledBack.todos[0].done).toBe(false);
    expect(toggledBack.todos[0].doneAt).toBeNull();
  });

  it('toggleTodo returns null when entry missing', async () => {
    const result = await toggleTodo('School', '2099-01-01', 'nonexistent-id');
    expect(result).toBeNull();
  });

  it('toggleTodo only affects the targeted todo', async () => {
    await addTodo('School', '2026-02-19', 'First');
    const entry = await addTodo('School', '2026-02-19', 'Second');
    const firstId = entry.todos[0].id;

    const updated = await toggleTodo('School', '2026-02-19', firstId);
    expect(updated.todos[0].done).toBe(true);
    expect(updated.todos[1].done).toBe(false);
  });

  // ── deleteTodo ─────────────────────────────────────────────────────────────

  it('deleteTodo removes by id, leaves others', async () => {
    await addTodo('School', '2026-02-19', 'Keep');
    const entry = await addTodo('School', '2026-02-19', 'Delete me');
    const deleteId = entry.todos[1].id;

    const updated = await deleteTodo('School', '2026-02-19', deleteId);
    expect(updated.todos).toHaveLength(1);
    expect(updated.todos[0].text).toBe('Keep');
  });

  it('deleteTodo returns null when entry missing', async () => {
    const result = await deleteTodo('School', '2099-01-01', 'nonexistent-id');
    expect(result).toBeNull();
  });

  // ── saveNotes ──────────────────────────────────────────────────────────────

  it('saveNotes persists notes', async () => {
    await saveNotes('School', '2026-02-19', 'Good day today');
    const entry = await getDailyEntry('School', '2026-02-19');
    expect(entry.notes).toBe('Good day today');
  });

  it('saveNotes enforces 500 char limit', async () => {
    await saveNotes('School', '2026-02-19', 'x'.repeat(600));
    const entry = await getDailyEntry('School', '2026-02-19');
    expect(entry.notes.length).toBe(500);
  });

  it('saveNotes preserves existing todos and outcomes', async () => {
    await addTodo('School', '2026-02-19', 'Keep this todo');
    await saveOutcomes('School', '2026-02-19', ['Keep this outcome', '', '']);
    await saveNotes('School', '2026-02-19', 'New note');
    const entry = await getDailyEntry('School', '2026-02-19');
    expect(entry.todos[0].text).toBe('Keep this todo');
    expect(entry.outcomes[0]).toBe('Keep this outcome');
    expect(entry.notes).toBe('New note');
  });

  // ── getAllDailyEntries ──────────────────────────────────────────────────────

  it('getAllDailyEntries returns multi-mode entries sorted desc', async () => {
    await saveDailyEntry({ mode: 'School', date: '2026-02-17', outcomes: [], todos: [], notes: '' });
    await saveDailyEntry({ mode: 'Personal', date: '2026-02-19', outcomes: [], todos: [], notes: '' });
    await saveDailyEntry({ mode: 'School', date: '2026-02-18', outcomes: [], todos: [], notes: '' });

    const all = await getAllDailyEntries();
    expect(all.length).toBeGreaterThanOrEqual(3);
    expect(all[0].date).toBe('2026-02-19');
  });
});
