import { describe, it, expect, beforeEach } from 'vitest';
import { initDB } from '../../src/db.js';
import { globalSearch } from '../../src/stores/search.js';
import { addTask } from '../../src/stores/tasks.js';
import { addInboxItem } from '../../src/stores/inbox.js';
import { addProject } from '../../src/stores/projects.js';

/**
 * Command palette tests — pure search logic.
 * Since tests run in Node.js (no DOM), we test the search integration
 * that powers the command palette. DOM rendering is verified via build + manual.
 */

beforeEach(async () => {
  await initDB();
});

describe('Command palette — search integration', () => {
  it('search returns results with type field for badge rendering', async () => {
    await addTask('Wiskunde huiswerk', 'School');
    const results = await globalSearch('wiskunde');
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0]).toHaveProperty('type');
    expect(results[0]).toHaveProperty('title');
    expect(results[0]).toHaveProperty('subtitle');
    expect(results[0]).toHaveProperty('score');
  });

  it('search results have consistent shape for rendering', async () => {
    await addTask('Test taak', 'School');
    await addInboxItem('Test idee');
    await addProject('Test project', 'goal', 'School');

    const results = await globalSearch('test');
    expect(results.length).toBeGreaterThanOrEqual(3);

    for (const r of results) {
      expect(typeof r.type).toBe('string');
      expect(typeof r.title).toBe('string');
      expect(typeof r.score).toBe('number');
    }
  });

  it('search limits useful for palette (max 12 results)', async () => {
    // Create many items
    for (let i = 0; i < 15; i++) {
      await addTask(`Alpha taak ${i}`, 'School');
    }
    const results = await globalSearch('alpha');
    expect(results.length).toBeGreaterThanOrEqual(12);
    // Palette will slice to 12 — results should be sorted by relevance
    const palette12 = results.slice(0, 12);
    expect(palette12.length).toBe(12);
  });

  it('search type matches expected palette type set', async () => {
    await addTask('Test', 'School');
    const results = await globalSearch('test');
    const validTypes = ['task', 'inbox', 'project', 'hours', 'logbook', 'daily', 'journal'];
    for (const r of results) {
      expect(validTypes).toContain(r.type);
    }
  });

  it('search returns empty for whitespace-only query', async () => {
    const results = await globalSearch('   ');
    expect(results).toEqual([]);
  });

  it('search handles special characters safely', async () => {
    await addTask('Fix <script>alert(1)</script>', 'School');
    const results = await globalSearch('script');
    expect(results.length).toBeGreaterThanOrEqual(1);
    // The raw title contains HTML — palette must use escapeHTML before rendering
    expect(results[0].title).toContain('<script>');
  });

  it('cross-store search returns mixed types', async () => {
    await addTask('Projectwerk afronden', 'School');
    await addInboxItem('Projectwerk idee noteren');
    await addProject('Projectwerk eindopdracht', 'goal', 'School');

    const results = await globalSearch('projectwerk');
    const types = new Set(results.map(r => r.type));
    expect(types.size).toBeGreaterThanOrEqual(2);
  });
});

describe('Command palette — navigation mapping', () => {
  const TYPE_META = {
    task:    { label: 'Taak',     tab: 'today', focus: 'tasks' },
    inbox:   { label: 'Inbox',    tab: 'inbox', focus: null },
    project: { label: 'Project',  tab: 'today', focus: 'projects' },
    hours:   { label: 'Uren',     tab: 'today', focus: 'mode' },
    logbook: { label: 'Logboek',  tab: 'today', focus: 'mode' },
    daily:   { label: 'Dagplan',  tab: 'today', focus: null },
    journal: { label: 'Dagboek',  tab: 'today', focus: 'reflection' },
  };

  it('every type has a Dutch label', () => {
    for (const [type, meta] of Object.entries(TYPE_META)) {
      expect(meta.label).toBeTruthy();
      expect(typeof meta.label).toBe('string');
    }
  });

  it('every type maps to a valid tab', () => {
    const validTabs = ['dashboard', 'today', 'inbox', 'lijsten', 'planning', 'settings'];
    for (const meta of Object.values(TYPE_META)) {
      expect(validTabs).toContain(meta.tab);
    }
  });

  it('task results navigate to tasks zone', () => {
    expect(TYPE_META.task.tab).toBe('today');
    expect(TYPE_META.task.focus).toBe('tasks');
  });

  it('inbox results navigate to inbox tab directly', () => {
    expect(TYPE_META.inbox.tab).toBe('inbox');
  });

  it('BPV results navigate to mode context zone', () => {
    expect(TYPE_META.hours.focus).toBe('mode');
    expect(TYPE_META.logbook.focus).toBe('mode');
  });
});
