/**
 * BORIS OS — Feature Flags
 * Enable/disable blocks and experimental features without code changes.
 * Flags persist in localStorage for instant access (no async needed at boot).
 */

const STORAGE_KEY = 'boris_feature_flags';

let flags = {};

export function initFeatureFlags() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      flags = JSON.parse(stored);
    }
  } catch {
    flags = {};
  }
}

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(flags));
  } catch {
    // Storage full or unavailable
  }
}

export function isEnabled(blockId) {
  // If not explicitly set, default to enabled
  if (!(blockId in flags)) return true;
  return !!flags[blockId];
}

export function enableBlock(blockId) {
  flags[blockId] = true;
  persist();
}

export function disableBlock(blockId) {
  flags[blockId] = false;
  persist();
}

export function toggleBlock(blockId) {
  flags[blockId] = !isEnabled(blockId);
  persist();
  return flags[blockId];
}

export function getAllFlags() {
  return { ...flags };
}

export function resetFlags() {
  flags = {};
  persist();
}
