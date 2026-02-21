import { describe, it, expect, beforeEach } from 'vitest';
import { initDB, setSetting, getSetting } from '../../src/db.js';
import {
  getModeConfig,
  saveModeConfig,
  seedModeConfigIfNeeded,
  getActiveModeIds,
  getAllModeIds,
  getModeById,
  getTaskCapFromConfig,
  renameMode,
  archiveMode,
  unarchiveMode,
  isValidModeSync,
  getDefaultModes,
  _resetModeConfigCache,
} from '../../src/core/modeConfig.js';

beforeEach(async () => {
  await initDB();
  _resetModeConfigCache();
});

describe('modeConfig — defaults', () => {
  it('returns default modes when no config is stored', async () => {
    const config = await getModeConfig();
    expect(config).toHaveLength(3);
    const ids = config.map((m) => m.id);
    expect(ids).toContain('School');
    expect(ids).toContain('Personal');
    expect(ids).toContain('BPV');
  });

  it('all default modes are active', async () => {
    const config = await getModeConfig();
    expect(config.every((m) => m.status === 'active')).toBe(true);
  });

  it('each mode has required fields', async () => {
    const config = await getModeConfig();
    for (const mode of config) {
      expect(mode.id).toBeDefined();
      expect(mode.name).toBeDefined();
      expect(mode.color).toBeDefined();
      expect(mode.emoji).toBeDefined();
      expect(mode.status).toBeDefined();
      expect(mode.caps).toBeDefined();
      expect(mode.caps.tasks).toBeDefined();
    }
  });
});

describe('modeConfig — seedModeConfigIfNeeded', () => {
  it('seeds config on first run', async () => {
    await seedModeConfigIfNeeded();
    const stored = await getSetting('mode_config');
    expect(Array.isArray(stored)).toBe(true);
    expect(stored.length).toBe(3);
  });

  it('does not overwrite existing config', async () => {
    const custom = [{ id: 'Custom', name: 'Custom', status: 'active', caps: { tasks: 10 }, order: 1 }];
    await setSetting('mode_config', custom);
    _resetModeConfigCache();

    await seedModeConfigIfNeeded();
    const stored = await getSetting('mode_config');
    expect(stored).toHaveLength(1);
    expect(stored[0].id).toBe('Custom');
  });
});

describe('modeConfig — active/all mode IDs', () => {
  it('getActiveModeIds returns only active modes', async () => {
    await seedModeConfigIfNeeded();
    const active = await getActiveModeIds();
    expect(active).toContain('School');
    expect(active).toContain('Personal');
    expect(active).toContain('BPV');
  });

  it('getActiveModeIds excludes archived modes', async () => {
    await seedModeConfigIfNeeded();
    await archiveMode('BPV');
    const active = await getActiveModeIds();
    expect(active).not.toContain('BPV');
    expect(active).toContain('School');
  });

  it('getAllModeIds returns all modes including archived', async () => {
    await seedModeConfigIfNeeded();
    await archiveMode('BPV');
    const all = await getAllModeIds();
    expect(all).toContain('BPV');
  });
});

describe('modeConfig — getModeById', () => {
  it('returns mode config by ID', async () => {
    await seedModeConfigIfNeeded();
    const school = await getModeById('School');
    expect(school).not.toBeNull();
    expect(school.id).toBe('School');
    expect(school.emoji).toBe('📚');
  });

  it('returns null for unknown mode', async () => {
    await seedModeConfigIfNeeded();
    const unknown = await getModeById('Unknown');
    expect(unknown).toBeNull();
  });
});

describe('modeConfig — task caps', () => {
  it('returns correct task cap from config', async () => {
    await seedModeConfigIfNeeded();
    expect(await getTaskCapFromConfig('School')).toBe(3);
    expect(await getTaskCapFromConfig('Personal')).toBe(5);
    expect(await getTaskCapFromConfig('BPV')).toBe(3);
  });

  it('returns default 5 for unknown mode', async () => {
    await seedModeConfigIfNeeded();
    expect(await getTaskCapFromConfig('Unknown')).toBe(5);
  });
});

describe('modeConfig — rename', () => {
  it('renames a mode display name', async () => {
    await seedModeConfigIfNeeded();
    const success = await renameMode('School', 'Studie');
    expect(success).toBe(true);

    const mode = await getModeById('School');
    expect(mode.name).toBe('Studie');
    expect(mode.id).toBe('School'); // ID stays the same
  });

  it('returns false for unknown mode', async () => {
    await seedModeConfigIfNeeded();
    const success = await renameMode('Unknown', 'Test');
    expect(success).toBe(false);
  });
});

describe('modeConfig — archive/unarchive', () => {
  it('archives a mode', async () => {
    await seedModeConfigIfNeeded();
    await archiveMode('BPV');
    const bpv = await getModeById('BPV');
    expect(bpv.status).toBe('archived');
  });

  it('unarchives a mode', async () => {
    await seedModeConfigIfNeeded();
    await archiveMode('BPV');
    await unarchiveMode('BPV');
    const bpv = await getModeById('BPV');
    expect(bpv.status).toBe('active');
  });
});

describe('modeConfig — isValidModeSync', () => {
  it('returns true for known modes (fallback)', () => {
    _resetModeConfigCache();
    expect(isValidModeSync('School')).toBe(true);
    expect(isValidModeSync('Personal')).toBe(true);
    expect(isValidModeSync('BPV')).toBe(true);
  });

  it('returns false for unknown modes (fallback)', () => {
    _resetModeConfigCache();
    expect(isValidModeSync('Unknown')).toBe(false);
  });

  it('uses cached config after load', async () => {
    await seedModeConfigIfNeeded();
    await getModeConfig(); // loads cache
    expect(isValidModeSync('School')).toBe(true);
    expect(isValidModeSync('BPV')).toBe(true);
  });
});

describe('modeConfig — getDefaultModes', () => {
  it('returns a copy of default modes', () => {
    const defaults = getDefaultModes();
    expect(defaults).toHaveLength(3);
    // Modifying the copy should not affect the original
    defaults[0].id = 'modified';
    const defaults2 = getDefaultModes();
    expect(defaults2[0].id).not.toBe('modified');
  });
});
