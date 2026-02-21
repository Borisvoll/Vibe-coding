import { describe, it, expect, beforeEach } from 'vitest';
import {
  PRESETS,
  getActivePreset,
  setActivePreset,
  isBlockDisabled,
  setBlockDisabled,
  clearBlockOverrides,
  getPresetIds,
  applyDefaultPresetForMode,
} from '../../src/core/modulePresets.js';

beforeEach(() => {
  // Clear all localStorage keys used by presets
  try {
    localStorage.clear();
  } catch { /* ignore */ }
});

describe('Module presets — definitions', () => {
  it('defines expected preset IDs', () => {
    const ids = getPresetIds();
    expect(ids).toContain('minimaal');
    expect(ids).toContain('school');
    expect(ids).toContain('bpv');
    expect(ids).toContain('persoonlijk');
    expect(ids).toContain('alles');
  });

  it('every preset has label, description, emoji', () => {
    for (const [id, preset] of Object.entries(PRESETS)) {
      expect(preset.label).toBeTruthy();
      expect(preset.description).toBeTruthy();
      expect(preset.emoji).toBeTruthy();
    }
  });

  it('minimaal preset has core blocks', () => {
    const blocks = PRESETS.minimaal.blocks;
    expect(blocks).toContain('daily-outcomes');
    expect(blocks).toContain('daily-todos');
    expect(blocks).toContain('inbox');
    expect(blocks).toContain('dashboard');
  });

  it('alles preset has null blocks (enable all)', () => {
    expect(PRESETS.alles.blocks).toBeNull();
  });

  it('school preset includes school-specific blocks', () => {
    const blocks = PRESETS.school.blocks;
    expect(blocks).toContain('school-dashboard');
    expect(blocks).toContain('school-today');
  });

  it('bpv preset includes bpv-specific blocks', () => {
    const blocks = PRESETS.bpv.blocks;
    expect(blocks).toContain('bpv-quick-log');
    expect(blocks).toContain('bpv-weekly-overview');
  });

  it('persoonlijk preset includes personality blocks', () => {
    const blocks = PRESETS.persoonlijk.blocks;
    expect(blocks).toContain('brain-state');
    expect(blocks).toContain('worry-dump');
    expect(blocks).toContain('conversation-debrief');
    expect(blocks).toContain('boundaries');
  });
});

describe('Module presets — active preset', () => {
  it('defaults to alles', () => {
    expect(getActivePreset()).toBe('alles');
  });

  it('persists preset choice', () => {
    setActivePreset('minimaal');
    expect(getActivePreset()).toBe('minimaal');
  });
});

describe('Module presets — isBlockDisabled', () => {
  it('returns false for all blocks when preset is alles', () => {
    setActivePreset('alles');
    expect(isBlockDisabled('daily-todos')).toBe(false);
    expect(isBlockDisabled('brain-state')).toBe(false);
    expect(isBlockDisabled('nonexistent')).toBe(false);
  });

  it('returns true for blocks not in minimaal preset', () => {
    setActivePreset('minimaal');
    expect(isBlockDisabled('brain-state')).toBe(true);
    expect(isBlockDisabled('school-dashboard')).toBe(true);
  });

  it('returns false for blocks in minimaal preset', () => {
    setActivePreset('minimaal');
    expect(isBlockDisabled('daily-todos')).toBe(false);
    expect(isBlockDisabled('dashboard')).toBe(false);
  });

  it('individual override takes precedence', () => {
    setActivePreset('minimaal');
    // brain-state not in minimaal, should be disabled
    expect(isBlockDisabled('brain-state')).toBe(true);
    // Override to enable
    setBlockDisabled('brain-state', false);
    expect(isBlockDisabled('brain-state')).toBe(false);
  });
});

describe('Module presets — clearBlockOverrides', () => {
  it('removes individual overrides', () => {
    setBlockDisabled('brain-state', false);
    setBlockDisabled('dashboard', true);
    clearBlockOverrides();
    // After clear, preset rules apply again
    setActivePreset('minimaal');
    expect(isBlockDisabled('brain-state')).toBe(true); // not in minimaal
    expect(isBlockDisabled('dashboard')).toBe(false); // in minimaal
  });
});

describe('Module presets — applyDefaultPresetForMode', () => {
  it('sets school preset for School mode on first run', () => {
    applyDefaultPresetForMode('School');
    expect(getActivePreset()).toBe('school');
  });

  it('sets bpv preset for BPV mode on first run', () => {
    applyDefaultPresetForMode('BPV');
    expect(getActivePreset()).toBe('bpv');
  });

  it('sets persoonlijk preset for Personal mode on first run', () => {
    applyDefaultPresetForMode('Personal');
    expect(getActivePreset()).toBe('persoonlijk');
  });

  it('does not override existing user preference', () => {
    localStorage.setItem('boris_active_preset', 'alles');
    applyDefaultPresetForMode('School');
    expect(getActivePreset()).toBe('alles');
  });
});
