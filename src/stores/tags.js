import { getAll, getByKey, put } from '../db.js';

/**
 * Simple tagging system.
 *
 * Tags are stored as string arrays directly on records.
 * Supported stores: os_tasks, os_inbox, os_projects, hours, logbook.
 * Each record can have a `tags: string[]` field.
 */

const TAGGABLE_STORES = ['os_tasks', 'os_inbox', 'os_projects', 'hours', 'logbook'];

/**
 * Add a tag to a record.
 */
export async function addTag(storeName, recordId, tag) {
  validateTaggable(storeName);
  const normalized = normalizeTag(tag);
  if (!normalized) return null;

  const record = await getByKey(storeName, recordId);
  if (!record) return null;

  const tags = Array.isArray(record.tags) ? [...record.tags] : [];
  if (tags.includes(normalized)) return record; // Already tagged

  tags.push(normalized);
  record.tags = tags;
  record.updated_at = new Date().toISOString();
  await put(storeName, record);
  return record;
}

/**
 * Remove a tag from a record.
 */
export async function removeTag(storeName, recordId, tag) {
  validateTaggable(storeName);
  const normalized = normalizeTag(tag);
  if (!normalized) return null;

  const record = await getByKey(storeName, recordId);
  if (!record) return null;

  const tags = Array.isArray(record.tags) ? record.tags.filter((t) => t !== normalized) : [];
  record.tags = tags;
  record.updated_at = new Date().toISOString();
  await put(storeName, record);
  return record;
}

/**
 * Get all records in a store that have a specific tag.
 */
export async function getByTag(storeName, tag) {
  validateTaggable(storeName);
  const normalized = normalizeTag(tag);
  if (!normalized) return [];

  const all = await getAll(storeName);
  return all.filter((r) => Array.isArray(r.tags) && r.tags.includes(normalized));
}

/**
 * Get all unique tags used across all taggable stores (or a specific store).
 */
export async function getAllTags(storeName = null) {
  const stores = storeName ? [storeName] : TAGGABLE_STORES;
  const tagSet = new Set();

  for (const store of stores) {
    try {
      const all = await getAll(store);
      for (const record of all) {
        if (Array.isArray(record.tags)) {
          record.tags.forEach((t) => tagSet.add(t));
        }
      }
    } catch {
      // Store might not exist in older DB versions
    }
  }

  return [...tagSet].sort();
}

function normalizeTag(tag) {
  if (!tag || typeof tag !== 'string') return '';
  return tag.trim().toLowerCase().replace(/\s+/g, '-').slice(0, 50);
}

function validateTaggable(storeName) {
  if (!TAGGABLE_STORES.includes(storeName)) {
    throw new Error(`Store "${storeName}" is not taggable. Allowed: ${TAGGABLE_STORES.join(', ')}`);
  }
}
