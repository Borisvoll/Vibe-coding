import { describe, it, expect, beforeEach } from 'vitest';
import { initDB } from '../../src/db.js';
import { addTask, getTasksByProject, updateTask } from '../../src/stores/tasks.js';
import {
  addProject, getProjectById,
  addMilestone, removeMilestone,
  addPhase, removePhase,
} from '../../src/stores/projects.js';

beforeEach(async () => {
  await initDB();
});

describe('Tasks — project_id linking', () => {
  it('addTask with project_id stores the link', async () => {
    const project = await addProject('My Project', '', 'School');
    const task = await addTask('Do thing', 'School', null, project.id);
    expect(task.project_id).toBe(project.id);
  });

  it('addTask without project_id defaults to null', async () => {
    const task = await addTask('Standalone', 'School');
    expect(task.project_id).toBeNull();
  });

  it('getTasksByProject returns only tasks for that project', async () => {
    const p1 = await addProject('Alpha', '', 'School');
    const p2 = await addProject('Beta', '', 'School');
    await addTask('Alpha task', 'School', null, p1.id);
    await addTask('Beta task', 'School', null, p2.id);
    await addTask('No project', 'School');

    const alphaTasks = await getTasksByProject(p1.id);
    expect(alphaTasks).toHaveLength(1);
    expect(alphaTasks[0].text).toBe('Alpha task');

    const betaTasks = await getTasksByProject(p2.id);
    expect(betaTasks).toHaveLength(1);
    expect(betaTasks[0].text).toBe('Beta task');
  });

  it('getTasksByProject returns empty array for project with no tasks', async () => {
    const p = await addProject('Empty', '', 'School');
    const tasks = await getTasksByProject(p.id);
    expect(tasks).toHaveLength(0);
  });
});

describe('Tasks — updateTask', () => {
  it('updateTask changes fields and preserves id', async () => {
    const task = await addTask('Original', 'School');
    const updated = await updateTask(task.id, { text: 'Changed', date: '2026-03-01' });
    expect(updated.text).toBe('Changed');
    expect(updated.date).toBe('2026-03-01');
    expect(updated.id).toBe(task.id);
  });

  it('updateTask returns null for non-existent id', async () => {
    const result = await updateTask('non-existent', { text: 'x' });
    expect(result).toBeNull();
  });

  it('updateTask sets updated_at', async () => {
    const task = await addTask('Test', 'School');
    const before = task.updated_at;
    // Small delay to ensure timestamp differs
    await new Promise((r) => setTimeout(r, 10));
    const updated = await updateTask(task.id, { text: 'Test 2' });
    expect(updated.updated_at).not.toBe(before);
  });
});

describe('Projects — milestones', () => {
  it('addMilestone adds to project.milestones array', async () => {
    const p = await addProject('Timeline', '', 'School');
    const updated = await addMilestone(p.id, 'MVP ready', '2026-04-01');
    expect(updated.milestones).toHaveLength(1);
    expect(updated.milestones[0].title).toBe('MVP ready');
    expect(updated.milestones[0].date).toBe('2026-04-01');
    expect(updated.milestones[0].id).toBeDefined();
  });

  it('addMilestone appends to existing milestones', async () => {
    const p = await addProject('Timeline', '', 'School');
    await addMilestone(p.id, 'First', '2026-03-01');
    const updated = await addMilestone(p.id, 'Second', '2026-04-01');
    expect(updated.milestones).toHaveLength(2);
  });

  it('removeMilestone filters out by id', async () => {
    const p = await addProject('Timeline', '', 'School');
    const withM = await addMilestone(p.id, 'Remove me', '2026-03-15');
    const mId = withM.milestones[0].id;
    const updated = await removeMilestone(p.id, mId);
    expect(updated.milestones).toHaveLength(0);
  });

  it('addMilestone returns null for non-existent project', async () => {
    const result = await addMilestone('no-such-id', 'x', '2026-01-01');
    expect(result).toBeNull();
  });
});

describe('Projects — phases', () => {
  it('addPhase adds to project.phases array', async () => {
    const p = await addProject('Timeline', '', 'School');
    const updated = await addPhase(p.id, 'Research', '2026-02-01', '2026-03-01');
    expect(updated.phases).toHaveLength(1);
    expect(updated.phases[0].title).toBe('Research');
    expect(updated.phases[0].startDate).toBe('2026-02-01');
    expect(updated.phases[0].endDate).toBe('2026-03-01');
    expect(updated.phases[0].color).toBeDefined();
  });

  it('addPhase accepts custom color', async () => {
    const p = await addProject('Timeline', '', 'School');
    const updated = await addPhase(p.id, 'Build', '2026-03-01', '2026-04-01', '#ff0000');
    expect(updated.phases[0].color).toBe('#ff0000');
  });

  it('removePhase filters out by id', async () => {
    const p = await addProject('Timeline', '', 'School');
    const withP = await addPhase(p.id, 'Phase 1', '2026-02-01', '2026-03-01');
    const phaseId = withP.phases[0].id;
    const updated = await removePhase(p.id, phaseId);
    expect(updated.phases).toHaveLength(0);
  });

  it('project without phases has no phases field initially', async () => {
    const p = await addProject('No phases', '', 'School');
    const found = await getProjectById(p.id);
    expect(found.phases).toBeUndefined();
  });
});
