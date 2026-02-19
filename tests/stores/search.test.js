import { describe, it, expect, beforeEach } from 'vitest';
import { initDB } from '../../src/db.js';
import { globalSearch } from '../../src/stores/search.js';
import { addTask } from '../../src/stores/tasks.js';
import { addInboxItem } from '../../src/stores/inbox.js';
import { addProject } from '../../src/stores/projects.js';
import { saveTodayEntry } from '../../src/stores/personal.js';
import { getToday } from '../../src/utils.js';

beforeEach(async () => {
  await initDB();
});

describe('Global search', () => {
  it('returns empty for short queries', async () => {
    const results = await globalSearch('a');
    expect(results).toEqual([]);
  });

  it('returns empty for no matches', async () => {
    await addTask('Test task', 'BPV');
    const results = await globalSearch('zzzzz');
    expect(results).toEqual([]);
  });

  it('finds tasks by text', async () => {
    await addTask('CNC draaiwerk afgerond', 'BPV');
    const results = await globalSearch('draaiwerk');
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0].type).toBe('task');
    expect(results[0].title).toContain('draaiwerk');
  });

  it('finds inbox items', async () => {
    await addInboxItem('Idee voor nieuw project');
    const results = await globalSearch('nieuw project');
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0].type).toBe('inbox');
  });

  it('finds projects by title', async () => {
    await addProject('Eindopdracht netwerken', 'goal', 'School');
    const results = await globalSearch('netwerken');
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0].type).toBe('project');
  });

  it('finds journal entries', async () => {
    await saveTodayEntry({ journalNote: 'Begonnen met mediteren vandaag' });
    const results = await globalSearch('mediteren');
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0].type).toBe('journal');
  });

  it('sorts by relevance (start match first)', async () => {
    await addTask('Alpha task', 'BPV');
    await addTask('Task with alpha in middle', 'School');
    const results = await globalSearch('alpha');
    expect(results.length).toBeGreaterThanOrEqual(2);
    // "Alpha task" should rank higher (match at position 0)
    expect(results[0].title).toBe('Alpha task');
  });

  it('is case insensitive', async () => {
    await addTask('UPPERCASE Task', 'BPV');
    const results = await globalSearch('uppercase');
    expect(results.length).toBeGreaterThanOrEqual(1);
  });
});
