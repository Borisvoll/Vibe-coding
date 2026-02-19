import { describe, it, expect, beforeEach } from 'vitest';
import { initDB } from '../../src/db.js';
import { addTask, getTasksByMode, getTasksForToday, toggleTask, deleteTask } from '../../src/stores/tasks.js';

beforeEach(async () => {
  await initDB();
});

describe('Tasks store', () => {
  it('addTask creates a todo task', async () => {
    const task = await addTask('Build feature', 'BPV');
    expect(task.id).toBeDefined();
    expect(task.text).toBe('Build feature');
    expect(task.mode).toBe('BPV');
    expect(task.status).toBe('todo');
    expect(task.date).toBeDefined();
    expect(task.createdAt).toBeDefined();
  });

  it('addTask trims text', async () => {
    const task = await addTask('  spaced  ', 'School');
    expect(task.text).toBe('spaced');
  });

  it('addTask rejects empty text', async () => {
    await expect(addTask('', 'BPV')).rejects.toThrow('text');
  });

  it('addTask rejects invalid mode', async () => {
    await expect(addTask('ok', 'InvalidMode')).rejects.toThrow('mode');
  });

  it('addTask rejects invalid date', async () => {
    await expect(addTask('ok', 'BPV', 'not-a-date')).rejects.toThrow('date');
  });

  it('getTasksByMode filters by mode', async () => {
    await addTask('BPV task', 'BPV');
    await addTask('School task', 'School');
    await addTask('Personal task', 'Personal');

    const bpvTasks = await getTasksByMode('BPV');
    expect(bpvTasks).toHaveLength(1);
    expect(bpvTasks[0].text).toBe('BPV task');
  });

  it('toggleTask flips status between todo and done', async () => {
    const task = await addTask('Toggle me', 'BPV');
    expect(task.status).toBe('todo');

    const toggled = await toggleTask(task.id);
    expect(toggled.status).toBe('done');
    expect(toggled.doneAt).toBeDefined();

    const toggledBack = await toggleTask(task.id);
    expect(toggledBack.status).toBe('todo');
    expect(toggledBack.doneAt).toBeNull();
  });

  it('toggleTask returns null for non-existent id', async () => {
    const result = await toggleTask('non-existent');
    expect(result).toBeNull();
  });

  it('deleteTask removes the task', async () => {
    const task = await addTask('Delete me', 'Personal');
    await deleteTask(task.id);

    const tasks = await getTasksByMode('Personal');
    expect(tasks).toHaveLength(0);
  });
});
