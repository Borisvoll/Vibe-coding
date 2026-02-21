import {
  getHoursEntry,
  getWeeklyOverview,
  exportEntries,
  addHoursEntry as _addHoursEntry,
  updateHoursEntry as _updateHoursEntry,
  deleteHoursEntry as _deleteHoursEntry,
} from '../../stores/bpv.js';

// Re-export read functions unchanged (queries)
export { getHoursEntry, getWeeklyOverview, exportEntries };

function meta(action, id) {
  return { action, id, source: 'kernel', at: Date.now() };
}

export function createCommands(eventBus) {
  return {
    addHours: async (date, options) => {
      const result = await _addHoursEntry(date, options);
      eventBus.emit('bpv:changed', meta('create', result.id));
      return result;
    },
    updateHours: async (id, changes) => {
      const result = await _updateHoursEntry(id, changes);
      eventBus.emit('bpv:changed', meta('update', id));
      return result;
    },
    deleteHours: async (id) => {
      const result = await _deleteHoursEntry(id);
      eventBus.emit('bpv:changed', meta('delete', id));
      return result;
    },
  };
}
