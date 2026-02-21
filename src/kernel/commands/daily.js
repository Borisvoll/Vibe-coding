import {
  getDailyEntry,
  getAllDailyEntries,
  saveDailyEntry as _saveDailyEntry,
  saveOutcomes as _saveOutcomes,
  addTodo as _addTodo,
  toggleTodo as _toggleTodo,
  deleteTodo as _deleteTodo,
  saveNotes as _saveNotes,
} from '../../stores/daily.js';

// Re-export read functions unchanged (queries)
export { getDailyEntry, getAllDailyEntries };

function meta(action, id) {
  return { action, id, source: 'kernel', at: Date.now() };
}

export function createCommands(eventBus) {
  return {
    save: async (entry) => {
      const result = await _saveDailyEntry(entry);
      eventBus.emit('daily:changed', meta('update', result.id));
      return result;
    },
    saveOutcomes: async (mode, date, outcomes) => {
      const result = await _saveOutcomes(mode, date, outcomes);
      eventBus.emit('daily:changed', meta('update', result.id));
      return result;
    },
    addTodo: async (mode, date, text) => {
      const result = await _addTodo(mode, date, text);
      eventBus.emit('daily:changed', meta('create', result?.id));
      return result;
    },
    toggleTodo: async (mode, date, todoId) => {
      const result = await _toggleTodo(mode, date, todoId);
      eventBus.emit('daily:changed', meta('toggle', todoId));
      return result;
    },
    deleteTodo: async (mode, date, todoId) => {
      const result = await _deleteTodo(mode, date, todoId);
      eventBus.emit('daily:changed', meta('delete', todoId));
      return result;
    },
    saveNotes: async (mode, date, notes) => {
      const result = await _saveNotes(mode, date, notes);
      eventBus.emit('daily:changed', meta('update', result?.id));
      return result;
    },
  };
}
