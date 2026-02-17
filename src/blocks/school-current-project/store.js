import { getByKey, put } from '../../db.js';

const STORE = 'os_school_projects';
const ID = 'school_current_project';

export async function getCurrentProject() {
  return getByKey(STORE, ID);
}

export async function saveCurrentProject(payload) {
  return put(STORE, {
    id: ID,
    ...payload,
    updated_at: new Date().toISOString(),
  });
}
