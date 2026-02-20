import { describe, it, expect, beforeEach } from 'vitest';
import { initDB } from '../../src/db.js';
import {
  getLists, getListById, addList, updateList, deleteList,
  getItemsByList, addItem, addSubtask, getSubtasks,
  toggleItem, updateItem, deleteItem, getItemCount,
  reorderItems,
} from '../../src/stores/lists.js';

beforeEach(async () => {
  await initDB();
});

describe('Lists store — list CRUD', () => {
  it('addList creates a list with correct shape', async () => {
    const list = await addList('Boodschappen', '🛒');
    expect(list.id).toBeDefined();
    expect(list.name).toBe('Boodschappen');
    expect(list.icon).toBe('🛒');
    expect(list.position).toBe(0);
    expect(list.createdAt).toBeDefined();
    expect(list.updated_at).toBeDefined();
  });

  it('addList rejects empty name', async () => {
    await expect(addList('')).rejects.toThrow('name');
    await expect(addList('   ')).rejects.toThrow('name');
  });

  it('addList trims name', async () => {
    const list = await addList('  Padded  ');
    expect(list.name).toBe('Padded');
  });

  it('addList assigns incremental positions', async () => {
    const a = await addList('First');
    const b = await addList('Second');
    const c = await addList('Third');
    expect(a.position).toBe(0);
    expect(b.position).toBe(1);
    expect(c.position).toBe(2);
  });

  it('getLists returns lists sorted by position', async () => {
    await addList('C');
    await addList('A');
    await addList('B');
    const lists = await getLists();
    expect(lists).toHaveLength(3);
    expect(lists[0].name).toBe('C');
    expect(lists[1].name).toBe('A');
    expect(lists[2].name).toBe('B');
  });

  it('getListById returns the list', async () => {
    const list = await addList('Find me');
    const found = await getListById(list.id);
    expect(found.id).toBe(list.id);
    expect(found.name).toBe('Find me');
  });

  it('getListById returns null for unknown id', async () => {
    const found = await getListById('non-existent');
    expect(found).toBeNull();
  });

  it('updateList changes fields', async () => {
    const list = await addList('Before');
    const updated = await updateList(list.id, { name: 'After', icon: '📝' });
    expect(updated.name).toBe('After');
    expect(updated.icon).toBe('📝');
    expect(updated.id).toBe(list.id);
  });

  it('updateList returns null for unknown id', async () => {
    const result = await updateList('non-existent', { name: 'x' });
    expect(result).toBeNull();
  });

  it('deleteList removes it and all its items', async () => {
    const list = await addList('Delete me');
    await addItem(list.id, 'Item A');
    await addItem(list.id, 'Item B');
    await deleteList(list.id);

    const found = await getListById(list.id);
    expect(found).toBeNull();
    const items = await getItemsByList(list.id);
    expect(items).toHaveLength(0);
  });
});

describe('Lists store — item CRUD', () => {
  let listId;

  beforeEach(async () => {
    const list = await addList('Test list');
    listId = list.id;
  });

  it('addItem creates an item with correct shape', async () => {
    const item = await addItem(listId, 'Melk');
    expect(item.id).toBeDefined();
    expect(item.listId).toBe(listId);
    expect(item.text).toBe('Melk');
    expect(item.done).toBe(false);
    expect(item.doneAt).toBeNull();
    expect(item.createdAt).toBeDefined();
    expect(item.updated_at).toBeDefined();
  });

  it('addItem rejects empty text', async () => {
    await expect(addItem(listId, '')).rejects.toThrow('text');
    await expect(addItem(listId, '   ')).rejects.toThrow('text');
  });

  it('addItem trims text', async () => {
    const item = await addItem(listId, '  Brood  ');
    expect(item.text).toBe('Brood');
  });

  it('getItemsByList returns items for the list', async () => {
    await addItem(listId, 'A');
    await addItem(listId, 'B');
    await addItem(listId, 'C');
    const items = await getItemsByList(listId);
    expect(items).toHaveLength(3);
  });

  it('getItemsByList sorts active items before done items', async () => {
    const a = await addItem(listId, 'Active');
    const b = await addItem(listId, 'Done');
    const c = await addItem(listId, 'Also active');
    await toggleItem(b.id);

    const items = await getItemsByList(listId);
    expect(items[0].text).toBe('Active');
    expect(items[1].text).toBe('Also active');
    expect(items[2].text).toBe('Done');
    expect(items[2].done).toBe(true);
  });

  it('toggleItem marks item as done', async () => {
    const item = await addItem(listId, 'Toggle me');
    const toggled = await toggleItem(item.id);
    expect(toggled.done).toBe(true);
    expect(toggled.doneAt).toBeDefined();
  });

  it('toggleItem marks done item as undone', async () => {
    const item = await addItem(listId, 'Toggle twice');
    await toggleItem(item.id);
    const toggled = await toggleItem(item.id);
    expect(toggled.done).toBe(false);
    expect(toggled.doneAt).toBeNull();
  });

  it('toggleItem returns null for unknown id', async () => {
    const result = await toggleItem('non-existent');
    expect(result).toBeNull();
  });

  it('updateItem changes fields', async () => {
    const item = await addItem(listId, 'Before');
    const updated = await updateItem(item.id, { text: 'After' });
    expect(updated.text).toBe('After');
    expect(updated.listId).toBe(listId);
  });

  it('updateItem cannot change listId', async () => {
    const item = await addItem(listId, 'Locked');
    const updated = await updateItem(item.id, { listId: 'other' });
    expect(updated.listId).toBe(listId);
  });

  it('updateItem returns null for unknown id', async () => {
    const result = await updateItem('non-existent', { text: 'x' });
    expect(result).toBeNull();
  });

  it('deleteItem removes it', async () => {
    const item = await addItem(listId, 'Delete me');
    await deleteItem(item.id);
    const items = await getItemsByList(listId);
    expect(items).toHaveLength(0);
  });

  it('getItemCount returns correct totals', async () => {
    await addItem(listId, 'A');
    const b = await addItem(listId, 'B');
    await addItem(listId, 'C');
    await toggleItem(b.id);

    const count = await getItemCount(listId);
    expect(count.total).toBe(3);
    expect(count.done).toBe(1);
  });

  it('items from different lists do not mix', async () => {
    const otherList = await addList('Other');
    await addItem(listId, 'List 1 item');
    await addItem(otherList.id, 'List 2 item');

    const items1 = await getItemsByList(listId);
    const items2 = await getItemsByList(otherList.id);
    expect(items1).toHaveLength(1);
    expect(items2).toHaveLength(1);
    expect(items1[0].text).toBe('List 1 item');
    expect(items2[0].text).toBe('List 2 item');
  });

  it('addItem sets parentId to null', async () => {
    const item = await addItem(listId, 'Top level');
    expect(item.parentId).toBeNull();
  });
});

describe('Lists store — subtasks', () => {
  let listId;
  let parentItem;

  beforeEach(async () => {
    const list = await addList('Test list');
    listId = list.id;
    parentItem = await addItem(listId, 'Parent');
  });

  it('addSubtask creates a subtask under parent', async () => {
    const sub = await addSubtask(parentItem.id, 'Child task');
    expect(sub.id).toBeDefined();
    expect(sub.parentId).toBe(parentItem.id);
    expect(sub.listId).toBe(listId);
    expect(sub.text).toBe('Child task');
    expect(sub.done).toBe(false);
  });

  it('addSubtask rejects empty text', async () => {
    await expect(addSubtask(parentItem.id, '')).rejects.toThrow('text');
  });

  it('addSubtask rejects unknown parent', async () => {
    await expect(addSubtask('non-existent', 'Task')).rejects.toThrow('parentId');
  });

  it('getSubtasks returns children sorted by position', async () => {
    await addSubtask(parentItem.id, 'First');
    await addSubtask(parentItem.id, 'Second');
    await addSubtask(parentItem.id, 'Third');

    const subs = await getSubtasks(parentItem.id);
    expect(subs).toHaveLength(3);
    expect(subs[0].text).toBe('First');
    expect(subs[1].text).toBe('Second');
    expect(subs[2].text).toBe('Third');
  });

  it('getSubtasks returns empty for unknown parent', async () => {
    const subs = await getSubtasks('non-existent');
    expect(subs).toHaveLength(0);
  });

  it('subtasks do not appear in getItemsByList', async () => {
    await addSubtask(parentItem.id, 'Hidden child');
    const items = await getItemsByList(listId);
    expect(items).toHaveLength(1);
    expect(items[0].text).toBe('Parent');
  });

  it('toggleItem works on subtasks', async () => {
    const sub = await addSubtask(parentItem.id, 'Toggle me');
    const toggled = await toggleItem(sub.id);
    expect(toggled.done).toBe(true);
  });

  it('deleteItem on parent also deletes subtasks', async () => {
    await addSubtask(parentItem.id, 'Child A');
    await addSubtask(parentItem.id, 'Child B');
    await deleteItem(parentItem.id);

    const subs = await getSubtasks(parentItem.id);
    expect(subs).toHaveLength(0);
    const items = await getItemsByList(listId);
    expect(items).toHaveLength(0);
  });

  it('subtasks count in getItemCount', async () => {
    await addSubtask(parentItem.id, 'Sub 1');
    const sub2 = await addSubtask(parentItem.id, 'Sub 2');
    await toggleItem(sub2.id);

    const count = await getItemCount(listId);
    expect(count.total).toBe(3); // parent + 2 subs
    expect(count.done).toBe(1);
  });
});

describe('Lists store — reorder', () => {
  let listId;

  beforeEach(async () => {
    const list = await addList('Test list');
    listId = list.id;
  });

  it('reorderItems updates positions', async () => {
    const a = await addItem(listId, 'A');
    const b = await addItem(listId, 'B');
    const c = await addItem(listId, 'C');

    // Reverse order: C, B, A
    await reorderItems([c.id, b.id, a.id]);
    const items = await getItemsByList(listId);
    // All not done, so sorted by position
    expect(items[0].text).toBe('C');
    expect(items[1].text).toBe('B');
    expect(items[2].text).toBe('A');
  });

  it('reorderItems ignores unknown ids gracefully', async () => {
    const a = await addItem(listId, 'A');
    // Include a non-existent id — should not throw
    await reorderItems(['non-existent', a.id]);
    const items = await getItemsByList(listId);
    expect(items).toHaveLength(1);
  });
});
