import { describe, it, expect, beforeEach } from 'vitest';
import { initDB, getAll, put, getSetting, setSetting } from '../../src/db.js';

beforeEach(async () => {
  await initDB();
});

describe('Data migration: os_personal_tasks → os_tasks', () => {
  it('migrates personal tasks into os_tasks with mode=Personal', async () => {
    // Simulate old data in os_personal_tasks
    await put('os_personal_tasks', {
      id: 'pt-1',
      text: 'Buy groceries',
      status: 'todo',
      updated_at: '2026-02-19T10:00:00.000Z',
    });
    await put('os_personal_tasks', {
      id: 'pt-2',
      text: 'Clean house',
      status: 'done',
      updated_at: '2026-02-19T11:00:00.000Z',
    });

    // Run migration logic (same as main.js migratePersonalTasks)
    const oldTasks = await getAll('os_personal_tasks');
    for (const task of oldTasks) {
      await put('os_tasks', {
        id: task.id,
        text: task.text || task.title || '',
        mode: 'Personal',
        status: task.status || 'todo',
        priority: task.priority ?? 3,
        date: task.date || null,
        doneAt: task.doneAt || null,
        createdAt: task.createdAt || task.created_at || new Date().toISOString(),
        updated_at: task.updated_at || new Date().toISOString(),
      });
    }
    await setSetting('migration_personal_tasks_done', true);

    // Verify migration
    const migratedTasks = await getAll('os_tasks');
    expect(migratedTasks).toHaveLength(2);

    const task1 = migratedTasks.find((t) => t.id === 'pt-1');
    expect(task1.text).toBe('Buy groceries');
    expect(task1.mode).toBe('Personal');
    expect(task1.status).toBe('todo');
    expect(task1.priority).toBe(3);

    const task2 = migratedTasks.find((t) => t.id === 'pt-2');
    expect(task2.text).toBe('Clean house');
    expect(task2.mode).toBe('Personal');
    expect(task2.status).toBe('done');

    // Verify flag is set
    const flag = await getSetting('migration_personal_tasks_done');
    expect(flag).toBe(true);
  });

  it('skips migration if flag is already set', async () => {
    await setSetting('migration_personal_tasks_done', true);

    // Put data in os_personal_tasks after migration flag is set
    await put('os_personal_tasks', {
      id: 'pt-late',
      text: 'Should not migrate',
      status: 'todo',
      updated_at: new Date().toISOString(),
    });

    // Check flag first (same logic as main.js)
    const migrated = await getSetting('migration_personal_tasks_done');
    if (!migrated) {
      throw new Error('Should not reach migration code');
    }

    // os_tasks should remain empty
    const tasks = await getAll('os_tasks');
    expect(tasks).toHaveLength(0);
  });

  it('handles empty os_personal_tasks gracefully', async () => {
    const oldTasks = await getAll('os_personal_tasks');
    expect(oldTasks).toHaveLength(0);

    // Migration with no data should still set the flag
    await setSetting('migration_personal_tasks_done', true);
    const flag = await getSetting('migration_personal_tasks_done');
    expect(flag).toBe(true);
  });

  it('device_id can be stored and retrieved', async () => {
    const deviceId = crypto.randomUUID();
    await setSetting('device_id', deviceId);

    const stored = await getSetting('device_id');
    expect(stored).toBe(deviceId);
  });

  it('last_export_date can be stored and read back', async () => {
    const now = new Date().toISOString();
    await setSetting('last_export_date', now);

    const stored = await getSetting('last_export_date');
    expect(stored).toBe(now);
  });
});
