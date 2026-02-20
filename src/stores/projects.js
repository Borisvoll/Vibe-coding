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

// --- Milestones ---

export async function addMilestone(projectId, title, date) {
  const project = await getByKey(STORE, projectId);
  if (!project) return null;
  const milestones = project.milestones || [];
  milestones.push({ id: crypto.randomUUID(), title: title.trim(), date });
  return updateProject(projectId, { milestones });
}

export async function removeMilestone(projectId, milestoneId) {
  const project = await getByKey(STORE, projectId);
  if (!project) return null;
  const milestones = (project.milestones || []).filter((m) => m.id !== milestoneId);
  return updateProject(projectId, { milestones });
}

// --- Pin to Today (one per mode) ---

export async function setPinned(projectId, mode) {
  const all = await getAll(STORE);
  // Clear any existing pin in this mode
  for (const p of all) {
    if (p.pinnedForMode === mode && p.id !== projectId) {
      await put(STORE, { ...p, pinnedForMode: null, updated_at: new Date().toISOString() });
    }
  }
  return updateProject(projectId, { pinnedForMode: mode });
}

export async function unpinProject(projectId) {
  return updateProject(projectId, { pinnedForMode: null });
}

export async function getPinnedProject(mode) {
  const all = await getAll(STORE);
  return all.find((p) => p.pinnedForMode === mode) || null;
}

// --- Cover & accent color ---

export async function setCover(projectId, dataUrl) {
  return updateProject(projectId, { cover: dataUrl });
}

export async function setAccentColor(projectId, color) {
  return updateProject(projectId, { accentColor: color });
}

// --- Mindmap ---

export async function updateMindmap(projectId, nodes) {
  return updateProject(projectId, { mindmap: nodes });
}

// --- File attachments ---

export async function addFile(projectId, fileEntry) {
  const project = await getByKey(STORE, projectId);
  if (!project) return null;
  const files = project.files || [];
  files.push(fileEntry);
  return updateProject(projectId, { files });
}

export async function removeFile(projectId, fileId) {
  const project = await getByKey(STORE, projectId);
  if (!project) return null;
  const files = (project.files || []).filter((f) => f.id !== fileId);
  return updateProject(projectId, { files });
}

// --- Phases ---

export async function addPhase(projectId, title, startDate, endDate, color = 'var(--color-accent)') {
  const project = await getByKey(STORE, projectId);
  if (!project) return null;
  const phases = project.phases || [];
  phases.push({ id: crypto.randomUUID(), title: title.trim(), startDate, endDate, color });
  return updateProject(projectId, { phases });
}

export async function removePhase(projectId, phaseId) {
  const project = await getByKey(STORE, projectId);
  if (!project) return null;
  const phases = (project.phases || []).filter((p) => p.id !== phaseId);
  return updateProject(projectId, { phases });
}
