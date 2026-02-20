import { describe, it, expect, beforeEach } from 'vitest';
import { initDB } from '../../src/db.js';
import { getAll, put } from '../../src/db.js';
import { addTask } from '../../src/stores/tasks.js';
import { addInboxItem } from '../../src/stores/inbox.js';
import { getToday, generateId } from '../../src/utils.js';

beforeEach(async () => {
  await initDB();
});

describe('Done List — store integration', () => {
  it('creates done task directly', async () => {
    const now = new Date().toISOString();
    await put('os_tasks', {
      id: generateId(),
      text: 'Opgeruimd',
      mode: 'Personal',
      status: 'done',
      priority: 3,
      date: getToday(),
      doneAt: now,
      createdAt: now,
      updated_at: now,
    });

    const tasks = await getAll('os_tasks');
    const done = tasks.filter(t => t.status === 'done');
    expect(done.length).toBe(1);
    expect(done[0].text).toBe('Opgeruimd');
    expect(done[0].doneAt).toBeTruthy();
  });

  it('filters done tasks by today', async () => {
    const now = new Date().toISOString();
    await put('os_tasks', {
      id: generateId(),
      text: 'Today done',
      mode: 'School',
      status: 'done',
      priority: 3,
      date: getToday(),
      doneAt: now,
      createdAt: now,
      updated_at: now,
    });
    await put('os_tasks', {
      id: generateId(),
      text: 'Yesterday done',
      mode: 'School',
      status: 'done',
      priority: 3,
      date: '2020-01-01',
      doneAt: now,
      createdAt: now,
      updated_at: now,
    });

    const tasks = await getAll('os_tasks');
    const todayDone = tasks.filter(t => t.status === 'done' && t.date === getToday());
    expect(todayDone.length).toBe(1);
    expect(todayDone[0].text).toBe('Today done');
  });
});

describe('Brain State — wellbeing integration', () => {
  it('stores brainState in wellbeing entry', async () => {
    const today = getToday();
    const now = new Date().toISOString();

    await put('os_personal_wellbeing', {
      id: today,
      date: today,
      brainState: 'red',
      updated_at: now,
    });

    const all = await getAll('os_personal_wellbeing');
    const entry = all.find(w => w.id === today);
    expect(entry).toBeTruthy();
    expect(entry.brainState).toBe('red');
  });

  it('brainState coexists with other wellbeing fields', async () => {
    const today = getToday();
    const now = new Date().toISOString();

    await put('os_personal_wellbeing', {
      id: today,
      date: today,
      mood: 'goed',
      gratitude: 'zon',
      brainState: 'green',
      updated_at: now,
    });

    const all = await getAll('os_personal_wellbeing');
    const entry = all.find(w => w.id === today);
    expect(entry.mood).toBe('goed');
    expect(entry.brainState).toBe('green');
  });
});

describe('Worry Dump — inbox integration', () => {
  it('creates inbox item with worry type', async () => {
    const now = new Date().toISOString();
    await put('os_inbox', {
      id: generateId(),
      text: 'Tentamen morgen',
      type: 'worry',
      mode: null,
      url: null,
      status: 'inbox',
      promotedTo: null,
      createdAt: now,
      updated_at: now,
    });

    const inbox = await getAll('os_inbox');
    const worries = inbox.filter(i => i.type === 'worry');
    expect(worries.length).toBe(1);
    expect(worries[0].text).toBe('Tentamen morgen');
  });

  it('worry items coexist with regular inbox items', async () => {
    await addInboxItem('Gewoon idee');
    const now = new Date().toISOString();
    await put('os_inbox', {
      id: generateId(),
      text: 'Zorg over deadline',
      type: 'worry',
      mode: null,
      url: null,
      status: 'inbox',
      promotedTo: null,
      createdAt: now,
      updated_at: now,
    });

    const inbox = await getAll('os_inbox');
    expect(inbox.length).toBe(2);
    const types = new Set(inbox.map(i => i.type));
    expect(types.has('thought')).toBe(true);
    expect(types.has('worry')).toBe(true);
  });
});

describe('Conversation Debrief — socialLog integration', () => {
  it('stores socialLog array in wellbeing', async () => {
    const today = getToday();
    const now = new Date().toISOString();

    await put('os_personal_wellbeing', {
      id: today,
      date: today,
      socialLog: [
        { rating: 'good', reason: 'Leuk gesprek', timestamp: now },
      ],
      updated_at: now,
    });

    const all = await getAll('os_personal_wellbeing');
    const entry = all.find(w => w.id === today);
    expect(entry.socialLog).toHaveLength(1);
    expect(entry.socialLog[0].rating).toBe('good');
  });

  it('appends to existing socialLog', async () => {
    const today = getToday();
    const now = new Date().toISOString();

    await put('os_personal_wellbeing', {
      id: today,
      date: today,
      socialLog: [
        { rating: 'good', reason: 'Eerste', timestamp: now },
      ],
      updated_at: now,
    });

    // Simulate append
    const all = await getAll('os_personal_wellbeing');
    const entry = all.find(w => w.id === today);
    const updatedLog = [...entry.socialLog, { rating: 'draining', reason: 'Moeilijk', timestamp: now }];

    await put('os_personal_wellbeing', {
      ...entry,
      socialLog: updatedLog,
      updated_at: now,
    });

    const all2 = await getAll('os_personal_wellbeing');
    const entry2 = all2.find(w => w.id === today);
    expect(entry2.socialLog).toHaveLength(2);
    expect(entry2.socialLog[1].rating).toBe('draining');
  });

  it('rating values are valid', () => {
    const validRatings = ['good', 'neutral', 'draining'];
    expect(validRatings).toContain('good');
    expect(validRatings).toContain('neutral');
    expect(validRatings).toContain('draining');
  });
});

describe('Context Checklist — data model', () => {
  const CHECKLISTS = {
    BPV: ['pbm', 'logboek', 'uren', 'learn'],
    School: ['agenda', 'huiswerk', 'deadlines', 'project'],
    Personal: ['water', 'bewegen', 'opruimen', 'eten'],
  };

  it('each mode has a checklist', () => {
    expect(CHECKLISTS.BPV).toBeTruthy();
    expect(CHECKLISTS.School).toBeTruthy();
    expect(CHECKLISTS.Personal).toBeTruthy();
  });

  it('each checklist has 4 items', () => {
    for (const [mode, items] of Object.entries(CHECKLISTS)) {
      expect(items).toHaveLength(4);
    }
  });

  it('BPV checklist includes safety check', () => {
    expect(CHECKLISTS.BPV).toContain('pbm');
  });

  it('Personal checklist includes wellness items', () => {
    expect(CHECKLISTS.Personal).toContain('water');
    expect(CHECKLISTS.Personal).toContain('bewegen');
  });
});
