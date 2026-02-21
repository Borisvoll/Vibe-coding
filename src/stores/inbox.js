import { getAll, getByKey, put, remove } from '../db.js';
import { addTask } from './tasks.js';
import { validateInboxItem } from './validate.js';

const STORE = 'os_inbox';
const REF_STORE = 'reference';

export async function getInboxItems() {
  const all = await getAll(STORE);
  return all
    .filter((item) => item.status === 'inbox')
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getInboxItemById(id) {
  return getByKey(STORE, id);
}

export async function getInboxCount() {
  const items = await getInboxItems();
  return items.length;
}

export async function addInboxItem(text, mode = null) {
  validateInboxItem({ text, mode });
  const raw = text.trim();
  const isLink = /^https?:\/\//.test(raw);
  const item = {
    id: crypto.randomUUID(),
    text: raw,
    type: isLink ? 'link' : 'thought',
    mode,
    url: isLink ? raw : null,
    status: 'inbox',
    promotedTo: null,
    tags: extractHashtags(raw),
    createdAt: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  await put(STORE, item);
  return item;
}

function extractHashtags(text) {
  const matches = text.match(/#([\w-]+)/g) || [];
  return matches.map((t) => t.slice(1).toLowerCase());
}

export async function promoteToTask(id, mode = null) {
  const item = await getByKey(STORE, id);
  if (!item) return null;
  const task = await addTask(item.text, mode || item.mode || 'Personal');
  item.status = 'promoted';
  item.promotedTo = task.id;
  item.updated_at = new Date().toISOString();
  await put(STORE, item);
  return task;
}

export async function saveToReference(id, category = 'inbox') {
  const item = await getByKey(STORE, id);
  if (!item) return null;
  const ref = {
    id: crypto.randomUUID(),
    title: item.text,
    content: item.url || item.text,
    category,
    source: 'inbox',
    sourceId: item.id,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  await put(REF_STORE, ref);
  item.status = 'archived';
  item.updated_at = new Date().toISOString();
  await put(STORE, item);
  return ref;
}

export async function archiveItem(id) {
  const item = await getByKey(STORE, id);
  if (!item) return null;
  item.status = 'archived';
  item.updated_at = new Date().toISOString();
  await put(STORE, item);
  return item;
}

export async function deleteItem(id) {
  return remove(STORE, id);
}
