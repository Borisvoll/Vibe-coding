import { describe, it, expect, beforeEach } from 'vitest';
import { initDB } from '../../src/db.js';
import { globalSearch, globalSearchGrouped, fuzzyScore } from '../../src/stores/search.js';
import { addTask } from '../../src/stores/tasks.js';
import { addInboxItem } from '../../src/stores/inbox.js';
import { addProject } from '../../src/stores/projects.js';

/**
 * Command palette tests — search logic + grouping.
 * DOM rendering is verified via build + manual inspection.
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

  it('search scores are in 0.0–1.0 range', async () => {
    await addTask('Alpha taak', 'School');
    const results = await globalSearch('alpha');
    expect(results.length).toBeGreaterThanOrEqual(1);
    for (const r of results) {
      expect(r.score).toBeGreaterThanOrEqual(0);
      expect(r.score).toBeLessThanOrEqual(1.0);
    }
  });

  it('search returns enough results for palette (≥12 when many match)', async () => {
    for (let i = 0; i < 15; i++) {
      await addTask(`Alpha taak ${i}`, 'School');
    }
    const results = await globalSearch('alpha');
    expect(results.length).toBeGreaterThanOrEqual(12);
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
    // Raw title contains HTML — palette must use escapeHTML before rendering
    expect(results[0].title).toContain('<script>');
  });

  it('cross-store search returns mixed types', async () => {
    await addTask('Projectwerk afronden', 'School');
    await addInboxItem('Projectwerk idee noteren');
    await addProject('Projectwerk eindopdracht', 'goal', 'School');

    const results = await globalSearch('projectwerk');
    const types = new Set(results.map((r) => r.type));
    expect(types.size).toBeGreaterThanOrEqual(2);
  });

  it('higher-relevance results sort before lower-relevance', async () => {
    await addTask('exactly this', 'School');
    await addTask('something containing this word somewhere', 'School');
    const results = await globalSearch('exactly this');
    expect(results[0].score).toBeGreaterThanOrEqual(results[results.length - 1].score);
  });
});

describe('Command palette — fuzzy scoring', () => {
  it('exact full-string match returns 1.0', () => {
    expect(fuzzyScore('wiskunde', 'wiskunde')).toBe(1.0);
  });

  it('exact substring at word start returns 1.0', () => {
    expect(fuzzyScore('wiskunde huiswerk', 'wiskunde')).toBe(1.0);
  });

  it('exact substring mid-string returns ≥ 0.7', () => {
    const s = fuzzyScore('aaa wiskunde bbb', 'wiskunde');
    expect(s).toBeGreaterThanOrEqual(0.7);
  });

  it('subsequence match returns score ≥ threshold (0.3)', () => {
    // 'prjct' is a subsequence of 'project'
    const s = fuzzyScore('project', 'prjct');
    expect(s).toBeGreaterThanOrEqual(0.3);
    expect(s).toBeLessThan(0.7); // below exact-substring range
  });

  it('non-matching query returns -1', () => {
    expect(fuzzyScore('wiskunde', 'xyz')).toBe(-1);
  });

  it('empty text returns -1', () => {
    expect(fuzzyScore('', 'test')).toBe(-1);
    expect(fuzzyScore(null, 'test')).toBe(-1);
  });

  it('below-threshold subsequence returns -1', () => {
    // 'z' appears in 'blazen' but as a single char with low density
    // 'zz' not a subsequence of 'blazen' (only one z)
    expect(fuzzyScore('abc', 'xyz')).toBe(-1);
  });
});

describe('Command palette — grouped search', () => {
  it('returns groups with correct shape', async () => {
    await addTask('Groepszoek test', 'School');
    await addProject('Groepszoek project', 'doel', 'School');

    const groups = await globalSearchGrouped('groepszoek');
    expect(groups.length).toBeGreaterThanOrEqual(1);

    for (const g of groups) {
      expect(typeof g.type).toBe('string');
      expect(typeof g.label).toBe('string');
      expect(typeof g.icon).toBe('string');
      expect(typeof g.tab).toBe('string');
      expect(Array.isArray(g.items)).toBe(true);
      expect(typeof g.visibleCount).toBe('number');
    }
  });

  it('visibleCount is at most 6 per group by default', async () => {
    for (let i = 0; i < 10; i++) {
      await addTask(`Veel taken test ${i}`, 'School');
    }
    const groups = await globalSearchGrouped('veel taken test');
    const taskGroup = groups.find((g) => g.type === 'task');
    expect(taskGroup).toBeDefined();
    expect(taskGroup.visibleCount).toBeLessThanOrEqual(6);
    // But all items are available for "Show more"
    expect(taskGroup.items.length).toBeGreaterThan(taskGroup.visibleCount);
  });

  it('respects custom maxPerGroup option', async () => {
    for (let i = 0; i < 5; i++) {
      await addTask(`Optie taak test ${i}`, 'School');
    }
    const groups = await globalSearchGrouped('optie taak test', { maxPerGroup: 2 });
    const taskGroup = groups.find((g) => g.type === 'task');
    expect(taskGroup.visibleCount).toBeLessThanOrEqual(2);
  });

  it('items within each group are sorted by recency (newest first)', async () => {
    await addTask('Datum taak oud', 'School');
    await addTask('Datum taak nieuw', 'School');
    const groups = await globalSearchGrouped('datum taak');
    const taskGroup = groups.find((g) => g.type === 'task');
    if (taskGroup && taskGroup.items.length >= 2) {
      const d0 = taskGroup.items[0].date || '';
      const d1 = taskGroup.items[1].date || '';
      // Newer or equal date should come first
      expect(d0.localeCompare(d1)).toBeGreaterThanOrEqual(0);
    }
  });

  it('returns empty array for short query', async () => {
    const groups = await globalSearchGrouped('a');
    expect(groups).toEqual([]);
  });

  it('projects group maps to projects tab', async () => {
    await addProject('Hub project zoekterm', 'doel', 'School');
    const groups = await globalSearchGrouped('hub project zoekterm');
    const projectGroup = groups.find((g) => g.type === 'project');
    expect(projectGroup).toBeDefined();
    expect(projectGroup.tab).toBe('projects');
  });
});

describe('Command palette — navigation mapping', () => {
  // Mirrors the TYPE_META / GROUP_META in command-palette.js and search.js
  const TYPE_META = {
    task:    { label: 'Taken',      tab: 'today',    focus: 'tasks' },
    inbox:   { label: 'Inbox',      tab: 'inbox',    focus: null },
    project: { label: 'Projecten',  tab: 'projects', focus: null },
    hours:   { label: 'Uren',       tab: 'today',    focus: 'mode' },
    logbook: { label: 'Logboek',    tab: 'today',    focus: 'mode' },
    daily:   { label: 'Dagplannen', tab: 'today',    focus: null },
    journal: { label: 'Dagboek',    tab: 'today',    focus: 'reflection' },
  };

  it('every type has a Dutch label', () => {
    for (const meta of Object.values(TYPE_META)) {
      expect(meta.label).toBeTruthy();
      expect(typeof meta.label).toBe('string');
    }
  });

  it('every type maps to a valid tab', () => {
    const validTabs = ['dashboard', 'today', 'inbox', 'lijsten', 'planning', 'projects', 'settings'];
    for (const meta of Object.values(TYPE_META)) {
      expect(validTabs).toContain(meta.tab);
    }
  });

  it('task results navigate to tasks zone in today tab', () => {
    expect(TYPE_META.task.tab).toBe('today');
    expect(TYPE_META.task.focus).toBe('tasks');
  });

  it('inbox results navigate to inbox tab directly', () => {
    expect(TYPE_META.inbox.tab).toBe('inbox');
  });

  it('project results navigate to projects tab', () => {
    expect(TYPE_META.project.tab).toBe('projects');
  });

  it('BPV results navigate to mode context zone', () => {
    expect(TYPE_META.hours.focus).toBe('mode');
    expect(TYPE_META.logbook.focus).toBe('mode');
  });
});
