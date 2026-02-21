/**
 * Module presets — bundled block configurations.
 * Each preset defines which blocks are active by default.
 * Users can override individual blocks in Settings.
 */

export const PRESETS = {
  minimaal: {
    label: 'Minimaal',
    description: 'Taken, inbox, dagplanning',
    emoji: '🎯',
    blocks: [
      'daily-outcomes', 'daily-todos', 'daily-reflection',
      'inbox', 'inbox-screen', 'dashboard', 'daily-cockpit',
    ],
  },
  school: {
    label: 'School',
    description: 'Studie, projecten, planning',
    emoji: '📚',
    blocks: [
      'daily-outcomes', 'daily-todos', 'daily-reflection', 'daily-cockpit',
      'inbox', 'inbox-screen', 'projects', 'dashboard',
      'school-dashboard', 'school-today',
      'weekly-review', 'lijsten', 'lijsten-screen',
    ],
  },
  bpv: {
    label: 'BPV',
    description: 'Stage, uren, logboek',
    emoji: '🏢',
    blocks: [
      'daily-outcomes', 'daily-todos', 'daily-reflection', 'daily-cockpit',
      'inbox', 'inbox-screen', 'projects', 'dashboard',
      'bpv-today', 'bpv-quick-log', 'bpv-weekly-overview',
      'bpv-log-summary', 'weekly-review',
      'lijsten', 'lijsten-screen',
    ],
  },
  persoonlijk: {
    label: 'Persoonlijk',
    description: 'Welzijn, reflectie, groei',
    emoji: '🌱',
    blocks: [
      'daily-outcomes', 'daily-todos', 'daily-reflection', 'daily-cockpit',
      'inbox', 'inbox-screen', 'projects', 'dashboard',
      'personal-dashboard', 'personal-today',
      'weekly-review', 'lijsten', 'lijsten-screen',
      // Personality-driven blocks
      'brain-state', 'worry-dump', 'conversation-debrief', 'boundaries',
    ],
  },
  alles: {
    label: 'Alles aan',
    description: 'Alle modules actief',
    emoji: '⚡',
    blocks: null, // null = enable everything
  },
};

const STORAGE_KEY = 'boris_active_preset';
const DISABLED_PREFIX = 'block_off_';

const MODE_DEFAULT_PRESET = {
  School: 'school',
  BPV: 'bpv',
  Personal: 'persoonlijk',
};

/**
 * Get the currently active preset name.
 * @returns {string}
 */
export function getActivePreset() {
  try {
    return localStorage.getItem(STORAGE_KEY) || 'alles';
  } catch {
    return 'alles';
  }
}

/**
 * Set mode-appropriate preset on first run (no existing user preference).
 * Called once during init — does nothing if user already chose a preset.
 */
export function applyDefaultPresetForMode(mode) {
  try {
    if (localStorage.getItem(STORAGE_KEY)) return; // user already chose
    const preset = MODE_DEFAULT_PRESET[mode];
    if (preset && PRESETS[preset]) {
      localStorage.setItem(STORAGE_KEY, preset);
    }
  } catch { /* ignore */ }
}

/**
 * Set the active preset. Clears individual overrides.
 * @param {string} presetId
 */
export function setActivePreset(presetId) {
  try {
    localStorage.setItem(STORAGE_KEY, presetId);
    // Clear individual overrides when switching presets
    clearBlockOverrides();
  } catch { /* ignore */ }
}

/**
 * Check if a specific block is disabled (either by preset or individual toggle).
 * @param {string} blockId
 * @returns {boolean}
 */
export function isBlockDisabled(blockId) {
  // Check individual override first
  try {
    const override = localStorage.getItem(`${DISABLED_PREFIX}${blockId}`);
    if (override === 'true') return true;
    if (override === 'false') return false;
  } catch { /* fall through */ }

  // Check preset
  const preset = PRESETS[getActivePreset()];
  if (!preset || preset.blocks === null) return false; // "alles" preset
  return !preset.blocks.includes(blockId);
}

/**
 * Explicitly enable or disable a single block (overrides preset).
 * @param {string} blockId
 * @param {boolean} disabled
 */
export function setBlockDisabled(blockId, disabled) {
  try {
    localStorage.setItem(`${DISABLED_PREFIX}${blockId}`, String(disabled));
  } catch { /* ignore */ }
}

/**
 * Clear all individual block overrides.
 */
export function clearBlockOverrides() {
  try {
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(DISABLED_PREFIX)) keys.push(key);
    }
    keys.forEach((k) => localStorage.removeItem(k));
  } catch { /* ignore */ }
}

/**
 * Get list of all preset IDs.
 * @returns {string[]}
 */
export function getPresetIds() {
  return Object.keys(PRESETS);
}
