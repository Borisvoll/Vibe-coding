import {
  getTasksByMode,
  getTasksForToday,
  getTasksByProject,
  addTask as _addTask,
  updateTask as _updateTask,
  toggleTask as _toggleTask,
  deleteTask as _deleteTask,
} from '../../stores/tasks.js';

// Re-export read functions unchanged (queries)
export { getTasksByMode, getTasksForToday, getTasksByProject };

function meta(action, id) {
  return { action, id, source: 'kernel', at: Date.now() };
}

// Write commands — auto-emit events
export function createCommands(eventBus) {
  return {
    add: async (text, mode, date, projectId) => {
      const result = await _addTask(text, mode, date, projectId);
      eventBus.emit('tasks:changed', meta('create', result.id));
      return result;
    },
    update: async (id, changes) => {
      const result = await _updateTask(id, changes);
      eventBus.emit('tasks:changed', meta('update', id));
      return result;
    },
    toggle: async (id) => {
      const result = await _toggleTask(id);
      eventBus.emit('tasks:changed', meta('toggle', id));
      return result;
    },
    delete: async (id) => {
      const result = await _deleteTask(id);
      eventBus.emit('tasks:changed', meta('delete', id));
      return result;
    },
  };
}
