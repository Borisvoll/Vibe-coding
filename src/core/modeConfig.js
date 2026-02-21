/**
 * Mode configuration — single source of truth for mode definitions.
 *
 * Modes are stored in IDB settings as 'mode_config'. On first run,
 * default modes are seeded. The internal ID (e.g., 'BPV', 'School')
 * is stable and never changes — it's what records reference.
 * Only the display name can be changed via rename.
 *
 * Status: 'active' | 'archived'
 * Archived modes are hidden from the mode picker but data is preserved.
 */

const DEFAULT_MODES = [
  {
    id: 'School',
    name: 'School',
    description: 'Opleiding & studie',
    color: 'var(--color-purple)',
    colorLight: 'var(--color-purple-light)',
    emoji: '📚',
    status: 'active',
    caps: { tasks: 3 },
    order: 1,
  },
  {
    id: 'Personal',
    name: 'Persoonlijk',
    description: 'Persoonlijke groei & leven',
    color: 'var(--color-emerald)',
    colorLight: 'var(--color-emerald-light)',
    emoji: '🌱',
    status: 'active',
    caps: { tasks: 5 },
    order: 2,
  },
  {
    id: 'BPV',
    name: 'BPV',
    description: 'Beroepspraktijkvorming',
    color: 'var(--color-blue)',
    colorLight: 'var(--color-blue-light)',
    emoji: '🏢',
    status: 'active',
    caps: { tasks: 3 },
    order: 3,
  },
];

let cachedConfig = null;

/**
 * Get mode config from IDB settings. Falls back to defaults if not yet seeded.
 * Caches in memory after first read.
 */
export async function getModeConfig() {
  if (cachedConfig) return cachedConfig;

  try {
    const { getSetting } = await import('../db.js');
    const stored = await getSetting('mode_config');
    if (Array.isArray(stored) && stored.length > 0) {
      cachedConfig = stored;
      return cachedConfig;
    }
  } catch { /* fall through */ }

  cachedConfig = DEFAULT_MODES.map((m) => ({ ...m, caps: { ...m.caps } }));
  return cachedConfig;
}

/**
 * Save mode config to IDB settings and update cache.
 */
export async function saveModeConfig(config) {
  const { setSetting } = await import('../db.js');
  await setSetting('mode_config', config);
  cachedConfig = config;
}

/**
 * Seed default modes on first run (if mode_config doesn't exist yet).
 */
export async function seedModeConfigIfNeeded() {
  const { getSetting } = await import('../db.js');
  const existing = await getSetting('mode_config');
  if (!existing) {
    await saveModeConfig(getDefaultModes());
  }
}

/**
 * Get only active mode IDs.
 */
export async function getActiveModeIds() {
  const config = await getModeConfig();
  return config.filter((m) => m.status === 'active').map((m) => m.id);
}

/**
 * Get all mode IDs (including archived).
 */
export async function getAllModeIds() {
  const config = await getModeConfig();
  return config.map((m) => m.id);
}

/**
 * Get mode metadata by ID.
 */
export async function getModeById(modeId) {
  const config = await getModeConfig();
  return config.find((m) => m.id === modeId) || null;
}

/**
 * Get task cap for a mode.
 */
export async function getTaskCapFromConfig(modeId) {
  const mode = await getModeById(modeId);
  return mode?.caps?.tasks ?? 5;
}

/**
 * Rename a mode (display name only, internal ID stays the same).
 */
export async function renameMode(modeId, newName) {
  const config = await getModeConfig();
  const mode = config.find((m) => m.id === modeId);
  if (!mode) return false;
  mode.name = newName;
  await saveModeConfig(config);
  return true;
}

/**
 * Archive a mode (hide from picker, preserve data).
 */
export async function archiveMode(modeId) {
  const config = await getModeConfig();
  const mode = config.find((m) => m.id === modeId);
  if (!mode) return false;
  mode.status = 'archived';
  await saveModeConfig(config);
  return true;
}

/**
 * Unarchive a mode.
 */
export async function unarchiveMode(modeId) {
  const config = await getModeConfig();
  const mode = config.find((m) => m.id === modeId);
  if (!mode) return false;
  mode.status = 'active';
  await saveModeConfig(config);
  return true;
}

/**
 * Check if a mode ID is valid (exists in config, active or archived).
 * Synchronous variant using cached config. Returns true if no cache yet
 * (permissive fallback to avoid blocking validation before config loads).
 */
export function isValidModeSync(modeId) {
  if (!cachedConfig) return ['BPV', 'School', 'Personal'].includes(modeId);
  return cachedConfig.some((m) => m.id === modeId);
}

/**
 * Get the default modes (for testing and migration).
 */
export function getDefaultModes() {
  return DEFAULT_MODES.map((m) => ({ ...m, caps: { ...m.caps } }));
}

/**
 * Reset the in-memory cache (for testing).
 */
export function _resetModeConfigCache() {
  cachedConfig = null;
}
