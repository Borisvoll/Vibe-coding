import {
  exportBundle,
  validateBundle,
  importBundle as _importBundle,
  restoreFromSafetyBackup as _restoreFromSafetyBackup,
  readBundleFile,
} from '../../stores/backup.js';

// Re-export read/validation functions unchanged (queries)
export { exportBundle, validateBundle, readBundleFile };

function meta(action) {
  return { action, source: 'kernel', at: Date.now() };
}

export function createCommands(eventBus) {
  return {
    import: async (bundle, options) => {
      const result = await _importBundle(bundle, options);
      eventBus.emit('backup:imported', meta('import'));
      return result;
    },
    restore: async () => {
      const result = await _restoreFromSafetyBackup();
      eventBus.emit('backup:restored', meta('restore'));
      return result;
    },
  };
}
