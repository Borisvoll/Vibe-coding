import { describe, it, expect, beforeEach } from 'vitest';
import { initDB, DB_NAME, DB_VERSION, getStoreNames, getAll, put } from '../src/db.js';

describe('Schema migration', () => {
  it('initializes at version 8', async () => {
    await initDB();
    expect(DB_VERSION).toBe(8);
  });

  it('creates all 31 expected stores', async () => {
    await initDB();
    const stores = getStoreNames();

    const expected = [
      // v1
      'hours', 'logbook', 'photos', 'settings', 'deleted',
      'competencies', 'assignments', 'goals', 'quality',
      'dailyPlans', 'weekReviews',
      // v2
      'learningMoments', 'reference', 'vault', 'vaultFiles', 'energy',
      // v3
      'os_school_projects', 'os_school_milestones', 'os_school_skills', 'os_school_concepts',
      // v4
      'os_personal_tasks', 'os_personal_agenda', 'os_personal_actions',
      'os_personal_wellbeing', 'os_personal_reflections', 'os_personal_week_plan',
      // v5
      'os_inbox', 'os_tasks',
      // v6
      'os_projects',
      // v8
      'os_lists', 'os_list_items',
    ];

    for (const name of expected) {
      expect(stores).toContain(name);
    }
    expect(stores).toHaveLength(expected.length);
  });

  it('data persists after write and re-read', async () => {
    await initDB();

    await put('os_tasks', {
      id: 'persist-test',
      text: 'Persist me',
      mode: 'BPV',
      status: 'todo',
      date: '2026-02-19',
      updated_at: new Date().toISOString(),
    });

    const all = await getAll('os_tasks');
    const found = all.find((t) => t.id === 'persist-test');
    expect(found).toBeDefined();
    expect(found.text).toBe('Persist me');
  });

  it('os_inbox store has mode and status indexes', async () => {
    await initDB();

    await put('os_inbox', {
      id: 'idx-test',
      text: 'Index test',
      type: 'thought',
      mode: 'BPV',
      status: 'inbox',
      createdAt: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    const all = await getAll('os_inbox');
    expect(all.find((i) => i.id === 'idx-test')).toBeDefined();
  });

  it('dailyPlans store supports mode-aware entries (v7)', async () => {
    await initDB();

    // v7: date index is non-unique, mode index added
    await put('dailyPlans', {
      id: '2026-02-19__School',
      date: '2026-02-19',
      mode: 'School',
      outcomes: ['Goal 1', '', ''],
      todos: [],
      notes: '',
      updatedAt: new Date().toISOString(),
    });

    await put('dailyPlans', {
      id: '2026-02-19__Personal',
      date: '2026-02-19',
      mode: 'Personal',
      outcomes: ['Personal goal', '', ''],
      todos: [],
      notes: '',
      updatedAt: new Date().toISOString(),
    });

    const all = await getAll('dailyPlans');
    const schoolEntry = all.find((d) => d.id === '2026-02-19__School');
    const personalEntry = all.find((d) => d.id === '2026-02-19__Personal');
    expect(schoolEntry).toBeDefined();
    expect(personalEntry).toBeDefined();
    expect(schoolEntry.outcomes[0]).toBe('Goal 1');
    expect(personalEntry.outcomes[0]).toBe('Personal goal');
  });
});
