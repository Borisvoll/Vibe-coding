import {
  getTodayEntry,
  getCreativeSparks,
  getRecentEntries,
  getPersonalDashboardData,
  saveTodayEntry as _saveTodayEntry,
  toggleHabit as _toggleHabit,
} from '../../stores/personal.js';

// Re-export read functions unchanged (queries)
export { getTodayEntry, getCreativeSparks, getRecentEntries, getPersonalDashboardData };

function meta(action, id) {
  return { action, id, source: 'kernel', at: Date.now() };
}

export function createCommands(eventBus) {
  return {
    saveToday: async (fields) => {
      const result = await _saveTodayEntry(fields);
      eventBus.emit('personal:changed', meta('update', result.id));
      return result;
    },
    toggleHabit: async (habitKey) => {
      const result = await _toggleHabit(habitKey);
      eventBus.emit('personal:changed', meta('toggle', habitKey));
      return result;
    },
  };
}
