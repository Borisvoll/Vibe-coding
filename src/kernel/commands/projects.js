import {
  getProjects,
  getActiveProjects,
  getProjectById,
  getPinnedProject,
  addProject as _addProject,
  updateProject as _updateProject,
  deleteProject as _deleteProject,
  setNextAction as _setNextAction,
  clearNextAction as _clearNextAction,
  addMilestone as _addMilestone,
  removeMilestone as _removeMilestone,
  setPinned as _setPinned,
  unpinProject as _unpinProject,
  setCover as _setCover,
  setAccentColor as _setAccentColor,
  updateMindmap as _updateMindmap,
  addFile as _addFile,
  removeFile as _removeFile,
  addPhase as _addPhase,
  removePhase as _removePhase,
} from '../../stores/projects.js';

// Re-export read functions unchanged (queries)
export { getProjects, getActiveProjects, getProjectById, getPinnedProject };

function meta(action, id) {
  return { action, id, source: 'kernel', at: Date.now() };
}

export function createCommands(eventBus) {
  return {
    add: async (title, goal, mode) => {
      const result = await _addProject(title, goal, mode);
      eventBus.emit('projects:changed', meta('create', result.id));
      return result;
    },
    update: async (id, changes) => {
      const result = await _updateProject(id, changes);
      eventBus.emit('projects:changed', meta('update', id));
      return result;
    },
    delete: async (id) => {
      const result = await _deleteProject(id);
      eventBus.emit('projects:changed', meta('delete', id));
      return result;
    },
    setNextAction: async (projectId, taskId) => {
      const result = await _setNextAction(projectId, taskId);
      eventBus.emit('projects:changed', meta('update', projectId));
      return result;
    },
    clearNextAction: async (projectId) => {
      const result = await _clearNextAction(projectId);
      eventBus.emit('projects:changed', meta('update', projectId));
      return result;
    },
    addMilestone: async (projectId, title, date) => {
      const result = await _addMilestone(projectId, title, date);
      eventBus.emit('projects:changed', meta('update', projectId));
      return result;
    },
    removeMilestone: async (projectId, milestoneId) => {
      const result = await _removeMilestone(projectId, milestoneId);
      eventBus.emit('projects:changed', meta('update', projectId));
      return result;
    },
    setPinned: async (projectId, mode) => {
      const result = await _setPinned(projectId, mode);
      eventBus.emit('projects:changed', meta('update', projectId));
      return result;
    },
    unpinProject: async (projectId) => {
      const result = await _unpinProject(projectId);
      eventBus.emit('projects:changed', meta('update', projectId));
      return result;
    },
    setCover: async (projectId, dataUrl) => {
      const result = await _setCover(projectId, dataUrl);
      eventBus.emit('projects:changed', meta('update', projectId));
      return result;
    },
    setAccentColor: async (projectId, color) => {
      const result = await _setAccentColor(projectId, color);
      eventBus.emit('projects:changed', meta('update', projectId));
      return result;
    },
    updateMindmap: async (projectId, nodes) => {
      const result = await _updateMindmap(projectId, nodes);
      eventBus.emit('projects:changed', meta('update', projectId));
      return result;
    },
    addFile: async (projectId, fileEntry) => {
      const result = await _addFile(projectId, fileEntry);
      eventBus.emit('projects:changed', meta('update', projectId));
      return result;
    },
    removeFile: async (projectId, fileId) => {
      const result = await _removeFile(projectId, fileId);
      eventBus.emit('projects:changed', meta('update', projectId));
      return result;
    },
    addPhase: async (projectId, title, startDate, endDate, color) => {
      const result = await _addPhase(projectId, title, startDate, endDate, color);
      eventBus.emit('projects:changed', meta('update', projectId));
      return result;
    },
    removePhase: async (projectId, phaseId) => {
      const result = await _removePhase(projectId, phaseId);
      eventBus.emit('projects:changed', meta('update', projectId));
      return result;
    },
  };
}
