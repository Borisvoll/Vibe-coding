import { describe, it, expect, beforeEach } from 'vitest';
import { initDB } from '../../src/db.js';
import {
  addProject, getProjects, getActiveProjects, getProjectById,
  updateProject, setNextAction, clearNextAction, deleteProject,
} from '../../src/stores/projects.js';
import { addTask } from '../../src/stores/tasks.js';

beforeEach(async () => {
  await initDB();
});

describe('Projects store — CRUD', () => {
  it('addProject creates a project with correct shape', async () => {
    const p = await addProject('Test project', 'Do something great', 'BPV');
    expect(p.id).toBeDefined();
    expect(p.title).toBe('Test project');
    expect(p.goal).toBe('Do something great');
    expect(p.mode).toBe('BPV');
    expect(p.status).toBe('active');
    expect(p.nextActionId).toBeNull();
    expect(p.createdAt).toBeDefined();
    expect(p.updatedAt).toBeDefined();
  });

  it('addProject rejects empty title', async () => {
    await expect(addProject('', 'goal', 'BPV')).rejects.toThrow('title');
    await expect(addProject('   ', 'goal', 'BPV')).rejects.toThrow('title');
  });

  it('addProject trims title and goal', async () => {
    const p = await addProject('  Padded  ', '  Spaced goal  ', 'School');
    expect(p.title).toBe('Padded');
    expect(p.goal).toBe('Spaced goal');
  });

  it('getProjects returns all projects when no mode filter', async () => {
    await addProject('BPV project', '', 'BPV');
    await addProject('School project', '', 'School');
    const all = await getProjects();
    expect(all).toHaveLength(2);
  });

  it('getProjects with mode filter includes mode-matched and modeless projects', async () => {
    await addProject('BPV only', '', 'BPV');
    await addProject('No mode', '', null);
    await addProject('School only', '', 'School');
    const bpvProjects = await getProjects('BPV');
    expect(bpvProjects).toHaveLength(2); // BPV + null
    const schoolProjects = await getProjects('School');
    expect(schoolProjects).toHaveLength(2); // School + null
  });

  it('getProjects sorts: active → paused → done', async () => {
    const a = await addProject('Active', '', null);
    const b = await addProject('Paused', '', null);
    const c = await addProject('Done', '', null);
    await updateProject(b.id, { status: 'paused' });
    await updateProject(c.id, { status: 'done' });

    const projects = await getProjects();
    expect(projects[0].title).toBe('Active');
    expect(projects[1].title).toBe('Paused');
    expect(projects[2].title).toBe('Done');
  });

  it('getActiveProjects returns only active projects', async () => {
    const a = await addProject('Active', '', 'BPV');
    const b = await addProject('Paused', '', 'BPV');
    await updateProject(b.id, { status: 'paused' });
    const active = await getActiveProjects('BPV');
    expect(active).toHaveLength(1);
    expect(active[0].id).toBe(a.id);
  });

  it('getProjectById returns the project', async () => {
    const p = await addProject('Find me', '', null);
    const found = await getProjectById(p.id);
    expect(found.id).toBe(p.id);
  });

  it('getProjectById returns null for unknown id', async () => {
    const found = await getProjectById('non-existent');
    expect(found).toBeNull();
  });

  it('updateProject changes fields', async () => {
    const p = await addProject('Before', 'old goal', 'BPV');
    const updated = await updateProject(p.id, { title: 'After', goal: 'new goal' });
    expect(updated.title).toBe('After');
    expect(updated.goal).toBe('new goal');
    expect(updated.id).toBe(p.id); // id never changes
  });

  it('updateProject returns null for unknown id', async () => {
    const result = await updateProject('non-existent', { title: 'x' });
    expect(result).toBeNull();
  });

  it('deleteProject removes it', async () => {
    const p = await addProject('Delete me', '', null);
    await deleteProject(p.id);
    const found = await getProjectById(p.id);
    expect(found).toBeNull();
    const all = await getProjects();
    expect(all).toHaveLength(0);
  });
});

describe('Projects store — one-next-action rule', () => {
  it('setNextAction stores the task id on the project', async () => {
    const project = await addProject('Project', '', 'BPV');
    const task = await addTask('Write unit tests', 'BPV');

    const updated = await setNextAction(project.id, task.id);
    expect(updated.nextActionId).toBe(task.id);
  });

  it('setNextAction replaces the previous next action (one-next-action rule)', async () => {
    const project = await addProject('Project', '', 'BPV');
    const task1 = await addTask('First action', 'BPV');
    const task2 = await addTask('Second action', 'BPV');

    await setNextAction(project.id, task1.id);
    // Verify first is set
    let p = await getProjectById(project.id);
    expect(p.nextActionId).toBe(task1.id);

    // Set second — must replace first
    await setNextAction(project.id, task2.id);
    p = await getProjectById(project.id);
    expect(p.nextActionId).toBe(task2.id);
    // First task ID is gone — only one next action allowed
    expect(p.nextActionId).not.toBe(task1.id);
  });

  it('clearNextAction sets nextActionId to null', async () => {
    const project = await addProject('Project', '', 'BPV');
    const task = await addTask('Some action', 'BPV');

    await setNextAction(project.id, task.id);
    await clearNextAction(project.id);

    const p = await getProjectById(project.id);
    expect(p.nextActionId).toBeNull();
  });

  it('setNextAction returns null for non-existent project', async () => {
    const result = await setNextAction('non-existent', 'any-task-id');
    expect(result).toBeNull();
  });

  it('a project without a next action starts with nextActionId null', async () => {
    const p = await addProject('Empty project', '', null);
    expect(p.nextActionId).toBeNull();
  });

  it('three projects each have independent next actions', async () => {
    const p1 = await addProject('Alpha', '', 'BPV');
    const p2 = await addProject('Beta', '', 'BPV');
    const p3 = await addProject('Gamma', '', 'BPV');

    const t1 = await addTask('Alpha action', 'BPV');
    const t2 = await addTask('Beta action', 'BPV');
    const t3 = await addTask('Gamma action', 'BPV');

    await setNextAction(p1.id, t1.id);
    await setNextAction(p2.id, t2.id);
    await setNextAction(p3.id, t3.id);

    const projects = await getProjects('BPV');
    const alpha = projects.find((p) => p.id === p1.id);
    const beta = projects.find((p) => p.id === p2.id);
    const gamma = projects.find((p) => p.id === p3.id);

    expect(alpha.nextActionId).toBe(t1.id);
    expect(beta.nextActionId).toBe(t2.id);
    expect(gamma.nextActionId).toBe(t3.id);
  });
});
