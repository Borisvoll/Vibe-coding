import { getAll, getByKey, getByIndex, put, remove } from '../db.js';

const LIST_STORE = 'os_lists';
const ITEM_STORE = 'os_list_items';

// ── Lists ────────────────────────────────────────────────────

export async function getLists() {
  const all = await getAll(LIST_STORE);
  return all.sort((a, b) => (a.position ?? 999) - (b.position ?? 999));
}

export async function getListById(id) {
  return getByKey(LIST_STORE, id);
}

export async function addList(name, icon = '') {
  if (!name?.trim()) throw new Error('name: must not be empty');
  const lists = await getLists();
  const now = new Date().toISOString();
  const list = {
    id: crypto.randomUUID(),
    name: name.trim(),
    icon: icon || '',
    position: lists.length,
    createdAt: now,
    updated_at: now,
  };
  await put(LIST_STORE, list);
  return list;
}

export async function updateList(id, changes) {
  const list = await getByKey(LIST_STORE, id);
  if (!list) return null;
  const now = new Date().toISOString();
  const updated = { ...list, ...changes, id, updated_at: now };
  await put(LIST_STORE, updated);
  return updated;
}

export async function deleteList(id) {
  // Delete all items in the list first
  const items = await getByIndex(ITEM_STORE, 'listId', id);
  for (const item of items) {
    await remove(ITEM_STORE, item.id);
  }
  return remove(LIST_STORE, id);
}

// ── List Items ───────────────────────────────────────────────

export async function getItemsByList(listId) {
  const items = await getByIndex(ITEM_STORE, 'listId', listId);
  return items.sort((a, b) => {
    // Active items first, then done items
    if (a.done !== b.done) return a.done ? 1 : -1;
    return (a.position ?? 999) - (b.position ?? 999);
  });
}

export async function addItem(listId, text) {
  if (!text?.trim()) throw new Error('text: must not be empty');
  const existing = await getByIndex(ITEM_STORE, 'listId', listId);
  const activeItems = existing.filter((i) => !i.done);
  const now = new Date().toISOString();
  const item = {
    id: crypto.randomUUID(),
    listId,
    text: text.trim(),
    done: false,
    position: activeItems.length,
    createdAt: now,
    doneAt: null,
    updated_at: now,
  };
  await put(ITEM_STORE, item);
  return item;
}

export async function toggleItem(id) {
  const item = await getByKey(ITEM_STORE, id);
  if (!item) return null;
  const done = !item.done;
  const now = new Date().toISOString();
  const updated = { ...item, done, doneAt: done ? now : null, updated_at: now };
  await put(ITEM_STORE, updated);
  return updated;
}

export async function updateItem(id, changes) {
  const item = await getByKey(ITEM_STORE, id);
  if (!item) return null;
  const now = new Date().toISOString();
  const updated = { ...item, ...changes, id, listId: item.listId, updated_at: now };
  await put(ITEM_STORE, updated);
  return updated;
}

export async function deleteItem(id) {
  return remove(ITEM_STORE, id);
}

export async function getItemCount(listId) {
  const items = await getByIndex(ITEM_STORE, 'listId', listId);
  const total = items.length;
  const done = items.filter((i) => i.done).length;
  return { total, done };
}
