import { isValidModeSync } from './modeConfig.js';

const FALLBACK_MODES = ['BPV', 'School', 'Personal'];
const STORAGE_KEY = 'boris_mode';

function getPersistedMode() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return isValidModeSync(saved) ? saved : null;
  } catch {
    return null;
  }
}

function isFirstVisit() {
  try {
    return localStorage.getItem(STORAGE_KEY) === null;
  } catch {
    return false;
  }
}

export function createModeManager(eventBus, initialMode = 'School') {
  const persisted = getPersistedMode();
  let currentMode = persisted || (isValidModeSync(initialMode) ? initialMode : 'School');

  // Active modes list — updated from config when loadModes() is called
  let activeModes = [...FALLBACK_MODES];

  function setMode(mode) {
    if (!isValidModeSync(mode) || currentMode === mode) return;
    currentMode = mode;
    // Keep localStorage as fast-startup cache
    try { localStorage.setItem(STORAGE_KEY, currentMode); } catch { /* ignore */ }
    // Persist to IndexedDB settings-store (fire-and-forget — never blocks UI)
    import('../db.js')
      .then(({ setSetting }) => setSetting('boris_mode', currentMode))
      .catch(() => { /* non-critical */ });
    eventBus?.emit('mode:changed', { mode: currentMode });
  }

  function getMode() {
    return currentMode;
  }

  function getModes() {
    return [...activeModes];
  }

  /**
   * Load active modes from config. Called after DB init.
   * Updates the modes list and ensures current mode is still active.
   */
  async function loadModes() {
    try {
      const { getActiveModeIds } = await import('./modeConfig.js');
      const activeIds = await getActiveModeIds();
      if (activeIds.length > 0) {
        activeModes = activeIds;
        // If current mode was archived, switch to first active mode
        if (!activeModes.includes(currentMode)) {
          setMode(activeModes[0]);
        }
      }
    } catch { /* use fallback */ }
  }

  return { setMode, getMode, getModes, isFirstVisit, loadModes };
}
