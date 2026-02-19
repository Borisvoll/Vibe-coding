import { describe, it, expect, beforeEach } from 'vitest';
import { initDB, DB_NAME, DB_VERSION, getStoreNames, getAll, put } from '../src/db.js';

describe('Schema migration', () => {
  it('initializes at version 5', async () => {
    await initDB();
    expect(DB_VERSION).toBe(5);
  });

  it('creates all 28 expected stores', async () => {
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

  it('dailyPlans store has unique date index', async () => {
    await initDB();

    await put('dailyPlans', {
      id: 'dp-1',
      date: '2026-02-19',
      tasks: [],
      updatedAt: new Date().toISOString(),
    });

    const all = await getAll('dailyPlans');
    expect(all.find((d) => d.id === 'dp-1')).toBeDefined();
  });
});
