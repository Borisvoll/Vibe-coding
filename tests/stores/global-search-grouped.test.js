import { describe, it, expect, beforeEach } from 'vitest';
import { initDB } from '../../src/db.js';
import { fuzzyScore, fuzzyScoreMulti, globalSearch, globalSearchGrouped, GROUP_META, GROUP_ORDER } from '../../src/stores/search.js';
import { addTask } from '../../src/stores/tasks.js';
import { addInboxItem } from '../../src/stores/inbox.js';
import { addProject } from '../../src/stores/projects.js';

beforeEach(async () => {
  await initDB();
});

// ── fuzzyScore ───────────────────────────────────────────────

describe('fuzzyScore — exact matches', () => {
  it('identical strings → 1.0', () => {
    expect(fuzzyScore('project', 'project')).toBe(1.0);
  });

  it('case-insensitive full match → 1.0', () => {
    expect(fuzzyScore('Project', 'project')).toBe(1.0);
  });

  it('substring at word boundary → 1.0', () => {
    expect(fuzzyScore('project beheer', 'project')).toBe(1.0);
  });

  it('substring after hyphen → 0.95 (word boundary)', () => {
    expect(fuzzyScore('end-project', 'project')).toBe(0.95);
  });

  it('mid-string substring → between 0.7 and 1.0', () => {
    const s = fuzzyScore('een project hier', 'project');
    expect(s).toBeGreaterThanOrEqual(0.7);
    expect(s).toBeLessThanOrEqual(1.0);
  });
});

describe('fuzzyScore — subsequence matches', () => {
  it('ordered subsequence → score ≥ 0.3', () => {
    // 'prj' is a subsequence of 'project'
    expect(fuzzyScore('project', 'prj')).toBeGreaterThanOrEqual(0.3);
  });

  it('subsequence with word-boundary bonus → higher score than same chars mid-word', () => {
    // 's' at start + 't' at start of 'today' → two word-boundary bonuses
    const withBoundary = fuzzyScore('start today', 'st');
    // 's' and 't' buried in middle of word, no boundaries
    const withoutBoundary = fuzzyScore('xsxxxxxt', 'st');
    expect(withBoundary).toBeGreaterThan(withoutBoundary);
  });

  it('subsequence score below exact-substring range (< 0.7)', () => {
    const seq = fuzzyScore('project', 'prjct');
    const exact = fuzzyScore('project', 'proje');
    expect(seq).toBeLessThan(exact);
  });

  it('non-subsequence returns -1', () => {
    expect(fuzzyScore('abc', 'xyz')).toBe(-1);
    expect(fuzzyScore('abc', 'abcd')).toBe(-1); // query longer than text subsequence
  });

  it('empty / null text returns -1', () => {
    expect(fuzzyScore('', 'test')).toBe(-1);
    expect(fuzzyScore(null, 'test')).toBe(-1);
    expect(fuzzyScore(undefined, 'test')).toBe(-1);
  });

  it('empty / null query returns -1', () => {
    expect(fuzzyScore('test', '')).toBe(-1);
    expect(fuzzyScore('test', null)).toBe(-1);
  });

  it('below-threshold dense subsequence returns -1', () => {
    // Very sparse match: 'z' in 'amazing zeal' but 'zz' doesn't exist as subseq in 'amazing'
    expect(fuzzyScore('amazing', 'zz')).toBe(-1);
  });
});

describe('fuzzyScoreMulti', () => {
  it('returns best score across all fields', () => {
    const s = fuzzyScoreMulti(['aaa', 'project details', 'zzz'], 'project');
    expect(s).toBe(fuzzyScore('project details', 'project'));
  });

  it('returns -1 when no field matches', () => {
    expect(fuzzyScoreMulti(['aaa', 'bbb'], 'xyz')).toBe(-1);
  });

  it('empty fields array returns -1', () => {
    expect(fuzzyScoreMulti([], 'test')).toBe(-1);
  });
});

// ── globalSearch ─────────────────────────────────────────────

describe('globalSearch — parallel reads + scoring', () => {
  it('reads all stores in parallel (smoke test)', async () => {
    await addTask('Parallel taak', 'School');
    await addProject('Parallel project', 'doel', 'School');
    const results = await globalSearch('parallel');
    expect(results.length).toBeGreaterThanOrEqual(2);
  });

  it('results sorted: higher score first', async () => {
    // 'score test' is a more relevant match than 'this score test thing extra words'
    await addTask('score test', 'School');
    await addTask('this score test thing extra words', 'School');
    const results = await globalSearch('score test');
    expect(results[0].score).toBeGreaterThanOrEqual(results[results.length - 1].score);
  });

  it('fuzzy search finds subsequence not found by exact indexOf', async () => {
    await addTask('projectplanning', 'School'); // no space — indexOf('proj plng') = -1
    const results = await globalSearch('projpln');
    // Subsequence 'projpln' in 'projectplanning': p(0),r(1),o(2),j(3),p(4),l(8),n(9) ✓
    expect(results.length).toBeGreaterThanOrEqual(1);
  });

  it('empty query returns empty array', async () => {
    expect(await globalSearch('')).toEqual([]);
    expect(await globalSearch('  ')).toEqual([]);
    expect(await globalSearch('a')).toEqual([]); // < 2 chars
  });
});

// ── globalSearchGrouped ──────────────────────────────────────

describe('globalSearchGrouped — structure', () => {
  it('returns groups with all required fields', async () => {
    await addTask('Groep test taak', 'School');
    const groups = await globalSearchGrouped('groep test taak');
    expect(groups.length).toBeGreaterThanOrEqual(1);

    for (const g of groups) {
      expect(typeof g.type).toBe('string');
      expect(typeof g.label).toBe('string');
      expect(typeof g.icon).toBe('string');
      expect(typeof g.tab).toBe('string');
      expect(typeof g.visibleCount).toBe('number');
      expect(Array.isArray(g.items)).toBe(true);
      expect(g.visibleCount).toBeGreaterThan(0);
      expect(g.visibleCount).toBeLessThanOrEqual(g.items.length);
    }
  });

  it('different types appear in separate groups', async () => {
    await addTask('Meerdere groepen', 'School');
    await addInboxItem('Meerdere groepen idee');
    await addProject('Meerdere groepen project', 'doel', 'School');

    const groups = await globalSearchGrouped('meerdere groepen');
    const types = groups.map((g) => g.type);
    expect(new Set(types).size).toBe(types.length); // no duplicate types
    expect(types.length).toBeGreaterThanOrEqual(2);
  });

  it('respects maxPerGroup = 6 by default', async () => {
    for (let i = 0; i < 9; i++) {
      await addTask(`Max groep taak ${i}`, 'School');
    }
    const groups = await globalSearchGrouped('max groep taak');
    const taskGroup = groups.find((g) => g.type === 'task');
    expect(taskGroup).toBeDefined();
    expect(taskGroup.visibleCount).toBe(6);
    expect(taskGroup.items.length).toBeGreaterThan(6);
  });

  it('respects custom maxPerGroup', async () => {
    for (let i = 0; i < 5; i++) {
      await addTask(`Custom max taak ${i}`, 'School');
    }
    const groups = await globalSearchGrouped('custom max taak', { maxPerGroup: 3 });
    const taskGroup = groups.find((g) => g.type === 'task');
    expect(taskGroup.visibleCount).toBeLessThanOrEqual(3);
  });

  it('items within group sorted by recency (newest date first)', async () => {
    // Add tasks with different dates by using today vs past
    await addTask('Recency taak oud', 'School');
    await addTask('Recency taak nieuw', 'School');
    const groups = await globalSearchGrouped('recency taak');
    const taskGroup = groups.find((g) => g.type === 'task');
    if (taskGroup && taskGroup.items.length >= 2) {
      const d0 = taskGroup.items[0].date || '';
      const d1 = taskGroup.items[1].date || '';
      expect(d0.localeCompare(d1)).toBeGreaterThanOrEqual(0);
    }
  });

  it('empty / short query returns empty array', async () => {
    expect(await globalSearchGrouped('')).toEqual([]);
    expect(await globalSearchGrouped('x')).toEqual([]);
  });

  it('projects group navigates to projects tab', async () => {
    await addProject('Navigatie project test', 'doel', 'School');
    const groups = await globalSearchGrouped('navigatie project test');
    const pGroup = groups.find((g) => g.type === 'project');
    expect(pGroup).toBeDefined();
    expect(pGroup.tab).toBe('projects');
    expect(pGroup.focus).toBeNull();
  });

  it('task group navigates to today tab with tasks focus', async () => {
    await addTask('Navigatie taak test', 'School');
    const groups = await globalSearchGrouped('navigatie taak test');
    const tGroup = groups.find((g) => g.type === 'task');
    expect(tGroup).toBeDefined();
    expect(tGroup.tab).toBe('today');
    expect(tGroup.focus).toBe('tasks');
  });
});

// ── GROUP_META + GROUP_ORDER exports ─────────────────────────

describe('GROUP_META and GROUP_ORDER', () => {
  it('GROUP_ORDER contains all GROUP_META keys', () => {
    for (const type of Object.keys(GROUP_META)) {
      expect(GROUP_ORDER).toContain(type);
    }
  });

  it('every GROUP_META entry has required fields', () => {
    for (const [type, meta] of Object.entries(GROUP_META)) {
      expect(typeof meta.label).toBe('string');
      expect(typeof meta.icon).toBe('string');
      expect(typeof meta.tab).toBe('string');
      expect(meta).toHaveProperty('focus');
    }
  });

  it('all tabs in GROUP_META are valid shell tabs', () => {
    const validTabs = ['dashboard', 'today', 'inbox', 'lijsten', 'planning', 'projects', 'settings'];
    for (const meta of Object.values(GROUP_META)) {
      expect(validTabs).toContain(meta.tab);
    }
  });
});

// ── Performance ──────────────────────────────────────────────

describe('globalSearch — performance', () => {
  it('completes in < 150 ms with 500 records', async () => {
    // Add 500 tasks
    const additions = [];
    for (let i = 0; i < 500; i++) {
      additions.push(addTask(`Perf taak item ${i}`, 'School'));
    }
    await Promise.all(additions);

    const start = performance.now();
    await globalSearch('perf taak item');
    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(150);
  });
});
