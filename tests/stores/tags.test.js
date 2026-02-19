import { describe, it, expect, beforeEach } from 'vitest';
import { initDB } from '../../src/db.js';
import { addTag, removeTag, getByTag, getAllTags } from '../../src/stores/tags.js';
import { addTask } from '../../src/stores/tasks.js';
import { addInboxItem } from '../../src/stores/inbox.js';

beforeEach(async () => {
  await initDB();
});

describe('Tagging system — addTag', () => {
  it('adds a tag to a task', async () => {
    const task = await addTask('Test task', 'BPV');
    const updated = await addTag('os_tasks', task.id, 'belangrijk');
    expect(updated.tags).toContain('belangrijk');
  });

  it('normalizes tags (lowercase, trim, hyphens)', async () => {
    const task = await addTask('Test', 'BPV');
    const updated = await addTag('os_tasks', task.id, '  Mijn Tag  ');
    expect(updated.tags).toContain('mijn-tag');
  });

  it('does not duplicate tags', async () => {
    const task = await addTask('Test', 'BPV');
    await addTag('os_tasks', task.id, 'urgent');
    const updated = await addTag('os_tasks', task.id, 'urgent');
    expect(updated.tags.filter((t) => t === 'urgent')).toHaveLength(1);
  });

  it('returns null for non-existent record', async () => {
    const result = await addTag('os_tasks', 'non-existent', 'tag');
    expect(result).toBeNull();
  });

  it('throws for non-taggable store', async () => {
    await expect(addTag('settings', 'key', 'tag')).rejects.toThrow('not taggable');
  });
});

describe('Tagging system — removeTag', () => {
  it('removes an existing tag', async () => {
    const task = await addTask('Test', 'BPV');
    await addTag('os_tasks', task.id, 'remove-me');
    const updated = await removeTag('os_tasks', task.id, 'remove-me');
    expect(updated.tags).not.toContain('remove-me');
  });

  it('is safe when tag does not exist', async () => {
    const task = await addTask('Test', 'BPV');
    const updated = await removeTag('os_tasks', task.id, 'nonexistent');
    expect(updated.tags).toEqual([]);
  });
});

describe('Tagging system — getByTag', () => {
  it('returns records with the specified tag', async () => {
    const t1 = await addTask('Tagged', 'BPV');
    const t2 = await addTask('Not tagged', 'BPV');
    await addTag('os_tasks', t1.id, 'priority');

    const results = await getByTag('os_tasks', 'priority');
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe(t1.id);
  });

  it('returns empty for unused tag', async () => {
    const results = await getByTag('os_tasks', 'unused');
    expect(results).toEqual([]);
  });
});

describe('Tagging system — getAllTags', () => {
  it('returns empty when no tags exist', async () => {
    const tags = await getAllTags();
    expect(tags).toEqual([]);
  });

  it('returns unique tags across stores', async () => {
    const task = await addTask('Test', 'BPV');
    const item = await addInboxItem('Test inbox');
    await addTag('os_tasks', task.id, 'shared-tag');
    await addTag('os_inbox', item.id, 'shared-tag');
    await addTag('os_tasks', task.id, 'unique-tag');

    const tags = await getAllTags();
    expect(tags).toContain('shared-tag');
    expect(tags).toContain('unique-tag');
    // Unique — no duplicates
    expect(tags.filter((t) => t === 'shared-tag')).toHaveLength(1);
  });

  it('filters by store when specified', async () => {
    const task = await addTask('Test', 'BPV');
    const item = await addInboxItem('Test inbox');
    await addTag('os_tasks', task.id, 'task-only');
    await addTag('os_inbox', item.id, 'inbox-only');

    const taskTags = await getAllTags('os_tasks');
    expect(taskTags).toContain('task-only');
    expect(taskTags).not.toContain('inbox-only');
  });
});
