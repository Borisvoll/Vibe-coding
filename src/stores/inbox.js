import { getAll, getByKey, put, remove } from '../db.js';
import { addTask } from './tasks.js';
import { validateInboxItem } from './validate.js';

const STORE = 'os_inbox';

export async function getInboxItems() {
  const all = await getAll(STORE);
  return all
    .filter((item) => item.status === 'inbox')
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function addInboxItem(text, mode = null) {
  validateInboxItem({ text, mode });
  const isLink = /^https?:\/\//.test(text.trim());
  const item = {
    id: crypto.randomUUID(),
    text: text.trim(),
    type: isLink ? 'link' : 'thought',
    mode,
    url: isLink ? text.trim() : null,
    status: 'inbox',
    promotedTo: null,
    createdAt: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  await put(STORE, item);
  return item;
}

export async function promoteToTask(id) {
  const item = await getByKey(STORE, id);
  if (!item) return null;
  const task = await addTask(item.text, item.mode || 'Personal');
  item.status = 'promoted';
  item.promotedTo = task.id;
  item.updated_at = new Date().toISOString();
  await put(STORE, item);
  return task;
}

export async function archiveItem(id) {
  const item = await getByKey(STORE, id);
  if (!item) return null;
  item.status = 'archived';
  item.updated_at = new Date().toISOString();
  await put(STORE, item);
  return item;
}
