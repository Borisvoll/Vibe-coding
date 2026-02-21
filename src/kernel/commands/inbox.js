import {
  getInboxItems,
  getInboxItemById,
  getInboxCount,
  addInboxItem as _addInboxItem,
  promoteToTask as _promoteToTask,
  saveToReference as _saveToReference,
  archiveItem as _archiveItem,
  deleteItem as _deleteItem,
} from '../../stores/inbox.js';

// Re-export read functions unchanged (queries)
export { getInboxItems, getInboxItemById, getInboxCount };

function meta(action, id) {
  return { action, id, source: 'kernel', at: Date.now() };
}

export function createCommands(eventBus) {
  return {
    add: async (text, mode) => {
      const result = await _addInboxItem(text, mode);
      eventBus.emit('inbox:changed', meta('create', result.id));
      return result;
    },
    promoteToTask: async (id, mode) => {
      const result = await _promoteToTask(id, mode);
      eventBus.emit('inbox:changed', meta('update', id));
      eventBus.emit('tasks:changed', meta('create', result?.id));
      return result;
    },
    saveToReference: async (id, category) => {
      const result = await _saveToReference(id, category);
      eventBus.emit('inbox:changed', meta('update', id));
      return result;
    },
    archive: async (id) => {
      const result = await _archiveItem(id);
      eventBus.emit('inbox:changed', meta('update', id));
      return result;
    },
    delete: async (id) => {
      const result = await _deleteItem(id);
      eventBus.emit('inbox:changed', meta('delete', id));
      return result;
    },
  };
}
