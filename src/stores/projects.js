import { getAll, getByKey, put, remove } from '../db.js';

const STORE = 'os_projects';
const STATUS_ORDER = { active: 0, paused: 1, done: 2 };

export async function getProjects(mode = null) {
  const all = await getAll(STORE);
  const filtered = mode ? all.filter((p) => !p.mode || p.mode === mode) : all;
  return filtered.sort((a, b) => {
    const sd = (STATUS_ORDER[a.status] ?? 3) - (STATUS_ORDER[b.status] ?? 3);
    if (sd !== 0) return sd;
    return (b.updatedAt || '').localeCompare(a.updatedAt || '');
  });
}

export async function getActiveProjects(mode = null) {
  const all = await getProjects(mode);
  return all.filter((p) => p.status === 'active');
}

export async function getProjectById(id) {
  return getByKey(STORE, id);
}

export async function addProject(title, goal = '', mode = null) {
  if (!title?.trim()) throw new Error('title: must not be empty');
  const now = new Date().toISOString();
  const project = {
    id: crypto.randomUUID(),
    title: title.trim(),
    goal: (goal || '').trim(),
    mode,
    status: 'active',
    nextActionId: null,
    createdAt: now,
    updatedAt: now,
    updated_at: now,
  };
  await put(STORE, project);
  return project;
}

export async function updateProject(id, changes) {
  const project = await getByKey(STORE, id);
  if (!project) return null;
  const now = new Date().toISOString();
  const updated = { ...project, ...changes, id, updatedAt: now, updated_at: now };
  await put(STORE, updated);
  return updated;
}

/**
 * Set the single "next action" for a project.
 * Enforces the one-next-action rule: calling this always replaces
 * the previous nextActionId. There can only ever be one.
 */
export async function setNextAction(projectId, taskId) {
  return updateProject(projectId, { nextActionId: taskId });
}

export async function clearNextAction(projectId) {
  return setNextAction(projectId, null);
}

export async function deleteProject(id) {
  return remove(STORE, id);
}
