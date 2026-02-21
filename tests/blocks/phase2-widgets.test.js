import { describe, it, expect, beforeEach } from 'vitest';
import { initDB, getAll, put, getByKey, remove } from '../../src/db.js';
import { generateId, getToday, getISOWeek } from '../../src/utils.js';
import { getTaskCap } from '../../src/core/modeCaps.js';

beforeEach(async () => {
  await initDB();
});

// ─── Mini Cards (BPV / School / Personal) ────────────────────────────

describe('BPV Mini Card — registration contract', () => {
  it('BPV mode card targets dashboard-cards host', async () => {
    const { registerBPVMiniCard } = await import('../../src/blocks/bpv-mini-card/index.js');
    let registered;
    const fakeRegistry = { register: (def) => { registered = def; } };
    registerBPVMiniCard(fakeRegistry);
    expect(registered.id).toBe('bpv-mini-card');
    expect(registered.hosts).toContain('dashboard-cards');
    expect(registered.modes).toContain('BPV');
    expect(registered.enabled).toBe(true);
  });
});

describe('School Mini Card — registration contract', () => {
  it('School mode card targets dashboard-cards host', async () => {
    const { registerSchoolMiniCard } = await import('../../src/blocks/school-mini-card/index.js');
    let registered;
    const fakeRegistry = { register: (def) => { registered = def; } };
    registerSchoolMiniCard(fakeRegistry);
    expect(registered.id).toBe('school-mini-card');
    expect(registered.hosts).toContain('dashboard-cards');
    expect(registered.modes).toContain('School');
    expect(registered.enabled).toBe(true);
  });
});

describe('Personal Mini Card — registration contract', () => {
  it('Personal mode card targets dashboard-cards host', async () => {
    const { registerPersonalMiniCard } = await import('../../src/blocks/personal-mini-card/index.js');
    let registered;
    const fakeRegistry = { register: (def) => { registered = def; } };
    registerPersonalMiniCard(fakeRegistry);
    expect(registered.id).toBe('personal-mini-card');
    expect(registered.hosts).toContain('dashboard-cards');
    expect(registered.modes).toContain('Personal');
    expect(registered.enabled).toBe(true);
  });
});

// ─── Tasks Block ─────────────────────────────────────────────────────

describe('Tasks Block — registration + store', () => {
  it('registers into vandaag-mode for all modes', async () => {
    const { registerTasksBlock } = await import('../../src/blocks/tasks/index.js');
    let registered;
    const fakeRegistry = { register: (def) => { registered = def; } };
    registerTasksBlock(fakeRegistry);
    expect(registered.id).toBe('tasks');
    expect(registered.hosts).toContain('vandaag-mode');
    expect(registered.modes).toEqual(['BPV', 'School', 'Personal']);
    expect(registered.order).toBe(20);
  });

  it('task store can add and retrieve tasks', async () => {
    const { addTask, getTasksForToday } = await import('../../src/blocks/tasks/store.js');
    await addTask('Test taak', 'School');
    const tasks = await getTasksForToday('School');
    expect(tasks.length).toBe(1);
    expect(tasks[0].text).toBe('Test taak');
    expect(tasks[0].mode).toBe('School');
  });

  it('task store respects mode filter', async () => {
    const { addTask, getTasksForToday } = await import('../../src/blocks/tasks/store.js');
    await addTask('School taak', 'School');
    await addTask('BPV taak', 'BPV');
    const schoolTasks = await getTasksForToday('School');
    const bpvTasks = await getTasksForToday('BPV');
    expect(schoolTasks.length).toBe(1);
    expect(bpvTasks.length).toBe(1);
    expect(schoolTasks[0].text).toBe('School taak');
    expect(bpvTasks[0].text).toBe('BPV taak');
  });

  it('task cap is enforced per mode', () => {
    expect(getTaskCap('BPV')).toBe(3);
    expect(getTaskCap('School')).toBe(3);
    expect(getTaskCap('Personal')).toBe(5);
  });
});

// ─── Schedule Placeholder ────────────────────────────────────────────

describe('Schedule Placeholder — registration contract', () => {
  it('registers into vandaag-mode for all modes', async () => {
    const { registerSchedulePlaceholderBlock } = await import('../../src/blocks/schedule-placeholder/index.js');
    let registered;
    const fakeRegistry = { register: (def) => { registered = def; } };
    registerSchedulePlaceholderBlock(fakeRegistry);
    expect(registered.id).toBe('schedule-placeholder');
    expect(registered.hosts).toContain('vandaag-mode');
    expect(registered.modes).toEqual(['BPV', 'School', 'Personal']);
    expect(registered.order).toBe(25);
  });
});

// ─── School Concept Vault ────────────────────────────────────────────

describe('School Concept Vault — store', () => {
  it('starts with empty concept list', async () => {
    const { listConcepts } = await import('../../src/blocks/school-concept-vault/store.js');
    const concepts = await listConcepts();
    expect(concepts).toEqual([]);
  });

  it('saves and retrieves a concept', async () => {
    const { saveConcept, listConcepts } = await import('../../src/blocks/school-concept-vault/store.js');
    await saveConcept({
      title: 'CNC Frezen',
      explanation: 'Materiaal verwijderen met roterende frees',
      tags: ['metaal', 'productie'],
      projectLink: 'Project A',
    });
    const concepts = await listConcepts();
    expect(concepts.length).toBe(1);
    expect(concepts[0].title).toBe('CNC Frezen');
    expect(concepts[0].tags).toEqual(['metaal', 'productie']);
    expect(concepts[0].searchText).toContain('cnc frezen');
  });

  it('deletes a concept', async () => {
    const { saveConcept, listConcepts, deleteConcept } = await import('../../src/blocks/school-concept-vault/store.js');
    await saveConcept({ title: 'Test', explanation: 'Uitleg' });
    let concepts = await listConcepts();
    expect(concepts.length).toBe(1);
    await deleteConcept(concepts[0].id);
    concepts = await listConcepts();
    expect(concepts.length).toBe(0);
  });

  it('registers into dashboard-cards for School mode', async () => {
    const { registerSchoolConceptVaultBlock } = await import('../../src/blocks/school-concept-vault/index.js');
    let registered;
    const fakeRegistry = { register: (def) => { registered = def; } };
    registerSchoolConceptVaultBlock(fakeRegistry);
    expect(registered.id).toBe('school-concept-vault');
    expect(registered.hosts).toContain('dashboard-cards');
    expect(registered.modes).toContain('School');
  });
});

// ─── School Current Project ──────────────────────────────────────────

describe('School Current Project — store', () => {
  it('starts with no current project', async () => {
    const { getCurrentProject } = await import('../../src/blocks/school-current-project/store.js');
    const project = await getCurrentProject();
    expect(project).toBeNull();
  });

  it('saves and retrieves current project', async () => {
    const { saveCurrentProject, getCurrentProject } = await import('../../src/blocks/school-current-project/store.js');
    await saveCurrentProject({
      building: 'CNC onderdeel',
      learning: 'Toleranties',
      milestone: 'Prototype af',
    });
    const project = await getCurrentProject();
    expect(project.building).toBe('CNC onderdeel');
    expect(project.learning).toBe('Toleranties');
    expect(project.milestone).toBe('Prototype af');
    expect(project.updated_at).toBeTruthy();
  });

  it('overwrites previous project data', async () => {
    const { saveCurrentProject, getCurrentProject } = await import('../../src/blocks/school-current-project/store.js');
    await saveCurrentProject({ building: 'V1', learning: '', milestone: '' });
    await saveCurrentProject({ building: 'V2', learning: 'Nieuw', milestone: 'Deadline' });
    const project = await getCurrentProject();
    expect(project.building).toBe('V2');
  });

  it('registers into dashboard-cards for School mode', async () => {
    const { registerSchoolCurrentProjectBlock } = await import('../../src/blocks/school-current-project/index.js');
    let registered;
    const fakeRegistry = { register: (def) => { registered = def; } };
    registerSchoolCurrentProjectBlock(fakeRegistry);
    expect(registered.id).toBe('school-current-project');
    expect(registered.hosts).toContain('dashboard-cards');
    expect(registered.modes).toContain('School');
  });
});

// ─── School Milestones ───────────────────────────────────────────────

describe('School Milestones — store', () => {
  it('starts with empty milestone list', async () => {
    const { listMilestones } = await import('../../src/blocks/school-milestones/store.js');
    const list = await listMilestones();
    expect(list).toEqual([]);
  });

  it('adds and lists milestones', async () => {
    const { addMilestone, listMilestones } = await import('../../src/blocks/school-milestones/store.js');
    await addMilestone({ title: 'Prototype', dueDate: '2026-03-01' });
    await addMilestone({ title: 'Presentatie', dueDate: '2026-04-01' });
    const list = await listMilestones();
    expect(list.length).toBe(2);
    // sorted by dueDate
    expect(list[0].title).toBe('Prototype');
    expect(list[1].title).toBe('Presentatie');
  });

  it('deletes a milestone', async () => {
    const { addMilestone, listMilestones, deleteMilestone } = await import('../../src/blocks/school-milestones/store.js');
    await addMilestone({ title: 'Verwijder mij', dueDate: '2026-05-01' });
    let list = await listMilestones();
    expect(list.length).toBe(1);
    await deleteMilestone(list[0].id);
    list = await listMilestones();
    expect(list.length).toBe(0);
  });

  it('registers into dashboard-cards for School mode', async () => {
    const { registerSchoolMilestonesBlock } = await import('../../src/blocks/school-milestones/index.js');
    let registered;
    const fakeRegistry = { register: (def) => { registered = def; } };
    registerSchoolMilestonesBlock(fakeRegistry);
    expect(registered.id).toBe('school-milestones');
    expect(registered.hosts).toContain('dashboard-cards');
    expect(registered.modes).toContain('School');
  });
});

// ─── School Skill Tracker ────────────────────────────────────────────

describe('School Skill Tracker — store', () => {
  it('returns default skills when store is empty', async () => {
    const { listSkills } = await import('../../src/blocks/school-skill-tracker/store.js');
    const skills = await listSkills();
    expect(skills.length).toBe(5);
    expect(skills.map(s => s.name)).toEqual([
      'CNC', 'CAD/CAM', 'Tolerances', 'Measuring', 'Process thinking',
    ]);
    // default skill has empty notes
    expect(skills[0].levelNotes).toBe('');
  });

  it('saves skill data and merges with defaults', async () => {
    const { listSkills, saveSkill } = await import('../../src/blocks/school-skill-tracker/store.js');
    const skills = await listSkills();
    await saveSkill({
      ...skills[0],
      levelNotes: 'Goed bezig',
      nextStep: 'Complexere vormen',
    });
    const updated = await listSkills();
    expect(updated[0].levelNotes).toBe('Goed bezig');
    expect(updated[0].nextStep).toBe('Complexere vormen');
    // other skills unchanged
    expect(updated[1].levelNotes).toBe('');
  });

  it('registers into dashboard-cards for School mode', async () => {
    const { registerSchoolSkillTrackerBlock } = await import('../../src/blocks/school-skill-tracker/index.js');
    let registered;
    const fakeRegistry = { register: (def) => { registered = def; } };
    registerSchoolSkillTrackerBlock(fakeRegistry);
    expect(registered.id).toBe('school-skill-tracker');
    expect(registered.hosts).toContain('dashboard-cards');
    expect(registered.modes).toContain('School');
  });
});

// ─── Personal Energy ─────────────────────────────────────────────────

describe('Personal Energy — store', () => {
  it('starts with no wellbeing entry', async () => {
    const { getWellbeing } = await import('../../src/blocks/personal-energy/store.js');
    const entry = await getWellbeing();
    expect(entry).toBeNull();
  });

  it('saves and retrieves wellbeing data', async () => {
    const { saveWellbeing, getWellbeing } = await import('../../src/blocks/personal-energy/store.js');
    await saveWellbeing({ energy: '7', mood: 'blij', gratitude: 'mooi weer' });
    const entry = await getWellbeing();
    expect(entry.energy).toBe('7');
    expect(entry.mood).toBe('blij');
    expect(entry.gratitude).toBe('mooi weer');
    expect(entry.updated_at).toBeTruthy();
  });

  it('overwrites previous wellbeing data', async () => {
    const { saveWellbeing, getWellbeing } = await import('../../src/blocks/personal-energy/store.js');
    await saveWellbeing({ energy: '5', mood: 'oké', gratitude: '' });
    await saveWellbeing({ energy: '8', mood: 'energiek', gratitude: 'goede nacht' });
    const entry = await getWellbeing();
    expect(entry.energy).toBe('8');
    expect(entry.mood).toBe('energiek');
  });

  it('registers into dashboard-cards for Personal mode', async () => {
    const { registerPersonalEnergyBlock } = await import('../../src/blocks/personal-energy/index.js');
    let registered;
    const fakeRegistry = { register: (def) => { registered = def; } };
    registerPersonalEnergyBlock(fakeRegistry);
    expect(registered.id).toBe('personal-energy-block');
    expect(registered.hosts).toContain('dashboard-cards');
    expect(registered.modes).toContain('Personal');
  });
});

// ─── Personal Week Planning ──────────────────────────────────────────

describe('Personal Week Planning — store', () => {
  it('starts with empty week plan', async () => {
    const { listWeekPlan } = await import('../../src/blocks/personal-week-planning/store.js');
    const plan = await listWeekPlan();
    expect(plan).toEqual([]);
  });

  it('adds week items and sorts by day', async () => {
    const { addWeekItem, listWeekPlan } = await import('../../src/blocks/personal-week-planning/store.js');
    await addWeekItem({ day: 'Wo', plan: 'Sporten' });
    await addWeekItem({ day: 'Ma', plan: 'Boodschappen' });
    const plan = await listWeekPlan();
    expect(plan.length).toBe(2);
    // sorted by day alphabetically (Ma < Wo)
    expect(plan[0].day).toBe('Ma');
    expect(plan[1].day).toBe('Wo');
  });

  it('deletes a week item', async () => {
    const { addWeekItem, listWeekPlan, deleteWeekItem } = await import('../../src/blocks/personal-week-planning/store.js');
    await addWeekItem({ day: 'Di', plan: 'Yoga' });
    let plan = await listWeekPlan();
    expect(plan.length).toBe(1);
    await deleteWeekItem(plan[0].id);
    plan = await listWeekPlan();
    expect(plan.length).toBe(0);
  });

  it('registers into dashboard-cards for Personal mode', async () => {
    const { registerPersonalWeekPlanningBlock } = await import('../../src/blocks/personal-week-planning/index.js');
    let registered;
    const fakeRegistry = { register: (def) => { registered = def; } };
    registerPersonalWeekPlanningBlock(fakeRegistry);
    expect(registered.id).toBe('personal-week-planning');
    expect(registered.hosts).toContain('dashboard-cards');
    expect(registered.modes).toContain('Personal');
  });
});

// ─── Personal Weekly Reflection ──────────────────────────────────────

describe('Personal Weekly Reflection — store', () => {
  it('starts with no reflection', async () => {
    const { getReflection } = await import('../../src/blocks/personal-weekly-reflection/store.js');
    const reflection = await getReflection('2026-W08');
    expect(reflection).toBeNull();
  });

  it('saves and retrieves a weekly reflection', async () => {
    const { saveReflection, getReflection } = await import('../../src/blocks/personal-weekly-reflection/store.js');
    await saveReflection('2026-W08', {
      balanced: 'Goed geslapen',
      adjust: 'Meer bewegen',
    });
    const reflection = await getReflection('2026-W08');
    expect(reflection.balanced).toBe('Goed geslapen');
    expect(reflection.adjust).toBe('Meer bewegen');
    expect(reflection.updated_at).toBeTruthy();
  });

  it('overwrites reflection for same week', async () => {
    const { saveReflection, getReflection } = await import('../../src/blocks/personal-weekly-reflection/store.js');
    await saveReflection('2026-W08', { balanced: 'V1', adjust: '' });
    await saveReflection('2026-W08', { balanced: 'V2', adjust: 'Bijgesteld' });
    const reflection = await getReflection('2026-W08');
    expect(reflection.balanced).toBe('V2');
  });

  it('different weeks are independent', async () => {
    const { saveReflection, getReflection } = await import('../../src/blocks/personal-weekly-reflection/store.js');
    await saveReflection('2026-W07', { balanced: 'Week 7', adjust: '' });
    await saveReflection('2026-W08', { balanced: 'Week 8', adjust: '' });
    const w7 = await getReflection('2026-W07');
    const w8 = await getReflection('2026-W08');
    expect(w7.balanced).toBe('Week 7');
    expect(w8.balanced).toBe('Week 8');
  });

  it('registers into dashboard-cards for Personal mode', async () => {
    const { registerPersonalWeeklyReflectionBlock } = await import('../../src/blocks/personal-weekly-reflection/index.js');
    let registered;
    const fakeRegistry = { register: (def) => { registered = def; } };
    registerPersonalWeeklyReflectionBlock(fakeRegistry);
    expect(registered.id).toBe('personal-weekly-reflection');
    expect(registered.hosts).toContain('dashboard-cards');
    expect(registered.modes).toContain('Personal');
  });
});

// ─── Block Registration Count ────────────────────────────────────────

describe('registerDefaultBlocks — total count', () => {
  it('registers 43 blocks total', async () => {
    const { registerDefaultBlocks } = await import('../../src/blocks/registerBlocks.js');
    const registered = [];
    const fakeRegistry = { register: (def) => registered.push(def) };
    registerDefaultBlocks(fakeRegistry);
    expect(registered.length).toBe(40);
  });

  it('all block ids are unique', async () => {
    const { registerDefaultBlocks } = await import('../../src/blocks/registerBlocks.js');
    const registered = [];
    const fakeRegistry = { register: (def) => registered.push(def) };
    registerDefaultBlocks(fakeRegistry);
    const ids = registered.map(b => b.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
