import { getAll, put, remove } from '../../db.js';
import { generateId } from '../../utils.js';

const STORE = 'os_school_concepts';

export async function listConcepts() {
  const all = await getAll(STORE).catch(() => []);
  return all.sort((a, b) => String(b.updated_at || '').localeCompare(String(a.updated_at || '')));
}

export async function saveConcept(payload) {
  const concept = {
    id: payload.id || generateId(),
    title: payload.title,
    explanation: payload.explanation,
    tags: payload.tags || [],
    projectLink: payload.projectLink || '',
    searchText: [payload.title, payload.explanation, ...(payload.tags || []), payload.projectLink || '']
      .filter(Boolean)
      .join(' ')
      .toLowerCase(),
    updated_at: new Date().toISOString(),
  };

  return put(STORE, concept);
}

export async function deleteConcept(id) {
  return remove(STORE, id);
}
