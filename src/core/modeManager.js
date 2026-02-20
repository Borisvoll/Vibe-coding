const MODES = ['BPV', 'School', 'Personal'];
const STORAGE_KEY = 'boris_mode';

function getPersistedMode() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return MODES.includes(saved) ? saved : null;
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
  let currentMode = persisted || (MODES.includes(initialMode) ? initialMode : 'School');

  function setMode(mode) {
    if (!MODES.includes(mode) || currentMode === mode) return;
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
    return [...MODES];
  }

  return { setMode, getMode, getModes, isFirstVisit };
}
