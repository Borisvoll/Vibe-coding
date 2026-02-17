const MODES = ['BPV', 'School', 'Personal'];

export function createModeManager(eventBus, initialMode = 'BPV') {
  let currentMode = MODES.includes(initialMode) ? initialMode : 'BPV';

  function setMode(mode) {
    if (!MODES.includes(mode) || currentMode === mode) return;
    currentMode = mode;
    eventBus?.emit('mode:changed', { mode: currentMode });
  }

  function getMode() {
    return currentMode;
  }

  function getModes() {
    return [...MODES];
  }

  return { setMode, getMode, getModes };
}
