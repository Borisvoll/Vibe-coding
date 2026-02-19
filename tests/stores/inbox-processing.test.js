import { describe, it, expect, beforeEach } from 'vitest';
import { initDB, getByKey, getAll } from '../../src/db.js';
import {
  addInboxItem, getInboxItems, getInboxItemById, getInboxCount,
  promoteToTask, saveToReference, archiveItem, deleteItem,
} from '../../src/stores/inbox.js';

beforeEach(async () => {
  await initDB();
});

describe('Inbox processing state transitions', () => {
  it('getInboxItemById returns a specific item', async () => {
    const item = await addInboxItem('Find me', 'BPV');
    const found = await getInboxItemById(item.id);
    expect(found).toBeDefined();
    expect(found.id).toBe(item.id);
    expect(found.text).toBe('Find me');
  });

  it('getInboxItemById returns null for non-existent id', async () => {
    const found = await getInboxItemById('non-existent');
    expect(found).toBeNull();
  });

  it('getInboxCount returns count of inbox-status items', async () => {
    expect(await getInboxCount()).toBe(0);
    await addInboxItem('One', null);
    await addInboxItem('Two', null);
    expect(await getInboxCount()).toBe(2);
    // Archive one — count should drop
    const items = await getInboxItems();
    await archiveItem(items[0].id);
    expect(await getInboxCount()).toBe(1);
  });

  it('promoteToTask with explicit mode overrides item mode', async () => {
    const item = await addInboxItem('School item', 'School');
    const task = await promoteToTask(item.id, 'Personal');
    expect(task.mode).toBe('Personal');
    expect(task.text).toBe('School item');
  });

  it('promoteToTask falls back to item mode when no mode given', async () => {
    const item = await addInboxItem('BPV item', 'BPV');
    const task = await promoteToTask(item.id);
    expect(task.mode).toBe('BPV');
  });

  it('promoteToTask falls back to Personal when no mode at all', async () => {
    const item = await addInboxItem('No mode', null);
    const task = await promoteToTask(item.id);
    expect(task.mode).toBe('Personal');
  });

  it('promoteToTask marks item as promoted with task link', async () => {
    const item = await addInboxItem('Promote me', 'BPV');
    const task = await promoteToTask(item.id);
    const updated = await getInboxItemById(item.id);
    expect(updated.status).toBe('promoted');
    expect(updated.promotedTo).toBe(task.id);
    // Promoted items no longer appear in inbox list
    expect(await getInboxCount()).toBe(0);
  });

  it('promoteToTask returns null for non-existent item', async () => {
    const result = await promoteToTask('non-existent');
    expect(result).toBeNull();
  });

  it('saveToReference creates a reference entry and archives the item', async () => {
    const item = await addInboxItem('Save this', null);
    const ref = await saveToReference(item.id);
    expect(ref).toBeDefined();
    expect(ref.title).toBe('Save this');
    expect(ref.source).toBe('inbox');
    expect(ref.sourceId).toBe(item.id);

    // Item is now archived
    const updated = await getInboxItemById(item.id);
    expect(updated.status).toBe('archived');
    expect(await getInboxCount()).toBe(0);
  });

  it('saveToReference stores link content for link items', async () => {
    const item = await addInboxItem('https://example.com', null);
    const ref = await saveToReference(item.id);
    expect(ref.content).toBe('https://example.com');
  });

  it('saveToReference with custom category', async () => {
    const item = await addInboxItem('Categorized', null);
    const ref = await saveToReference(item.id, 'notes');
    expect(ref.category).toBe('notes');
  });

  it('saveToReference returns null for non-existent item', async () => {
    const result = await saveToReference('non-existent');
    expect(result).toBeNull();
  });

  it('deleteItem removes the item entirely', async () => {
    const item = await addInboxItem('Delete me', 'School');
    await deleteItem(item.id);
    const found = await getInboxItemById(item.id);
    expect(found).toBeNull();
    expect(await getInboxCount()).toBe(0);
  });

  it('full processing flow: add → select → process → verify', async () => {
    // Capture 3 items
    const a = await addInboxItem('Task idea', 'BPV');
    const b = await addInboxItem('https://docs.example.com', 'School');
    const c = await addInboxItem('Random thought', null);

    expect(await getInboxCount()).toBe(3);

    // Process: promote a to task
    const task = await promoteToTask(a.id, 'BPV');
    expect(task.text).toBe('Task idea');

    // Process: save b to reference
    const ref = await saveToReference(b.id);
    expect(ref.title).toBe('https://docs.example.com');

    // Process: delete c
    await deleteItem(c.id);

    // Inbox should be empty
    expect(await getInboxCount()).toBe(0);
    const remaining = await getInboxItems();
    expect(remaining).toHaveLength(0);
  });
});
