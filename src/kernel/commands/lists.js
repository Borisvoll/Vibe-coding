import {
  getLists,
  getListById,
  getItemsByList,
  getSubtasks,
  getItemCount,
  addList as _addList,
  updateList as _updateList,
  deleteList as _deleteList,
  addItem as _addItem,
  addSubtask as _addSubtask,
  toggleItem as _toggleItem,
  updateItem as _updateItem,
  deleteItem as _deleteItem,
  reorderItems as _reorderItems,
} from '../../stores/lists.js';

// Re-export read functions unchanged (queries)
export { getLists, getListById, getItemsByList, getSubtasks, getItemCount };

function meta(action, id) {
  return { action, id, source: 'kernel', at: Date.now() };
}

export function createCommands(eventBus) {
  return {
    addList: async (name, icon) => {
      const result = await _addList(name, icon);
      eventBus.emit('lists:changed', meta('create', result.id));
      return result;
    },
    updateList: async (id, changes) => {
      const result = await _updateList(id, changes);
      eventBus.emit('lists:changed', meta('update', id));
      return result;
    },
    deleteList: async (id) => {
      const result = await _deleteList(id);
      eventBus.emit('lists:changed', meta('delete', id));
      return result;
    },
    addItem: async (listId, text) => {
      const result = await _addItem(listId, text);
      eventBus.emit('lists:changed', meta('create', result.id));
      return result;
    },
    addSubtask: async (parentId, text) => {
      const result = await _addSubtask(parentId, text);
      eventBus.emit('lists:changed', meta('create', result.id));
      return result;
    },
    toggleItem: async (id) => {
      const result = await _toggleItem(id);
      eventBus.emit('lists:changed', meta('toggle', id));
      return result;
    },
    updateItem: async (id, changes) => {
      const result = await _updateItem(id, changes);
      eventBus.emit('lists:changed', meta('update', id));
      return result;
    },
    deleteItem: async (id) => {
      const result = await _deleteItem(id);
      eventBus.emit('lists:changed', meta('delete', id));
      return result;
    },
    reorderItems: async (orderedIds) => {
      const result = await _reorderItems(orderedIds);
      eventBus.emit('lists:changed', meta('update'));
      return result;
    },
  };
}
