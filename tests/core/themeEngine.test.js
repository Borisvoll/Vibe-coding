import { describe, it, expect, beforeEach } from 'vitest';
import {
  hexToHSL, hslToHex, relativeLuminance, contrastRatio, isDark,
  checkContrast,
} from '../../src/core/themeEngine.js';

// ── Color helper tests (pure functions, no DOM needed) ────────

describe('hexToHSL', () => {
  it('converts blue to correct HSL', () => {
    const hsl = hexToHSL('#4f6ef7');
    expect(hsl.h).toBeGreaterThanOrEqual(225);
    expect(hsl.h).toBeLessThanOrEqual(235);
    expect(hsl.s).toBeGreaterThan(80);
    expect(hsl.l).toBeGreaterThan(50);
    expect(hsl.l).toBeLessThan(75);
  });

  it('converts pure red', () => {
    const hsl = hexToHSL('#ff0000');
    expect(hsl.h).toBe(0);
    expect(hsl.s).toBe(100);
    expect(hsl.l).toBe(50);
  });

  it('converts white', () => {
    const hsl = hexToHSL('#ffffff');
    expect(hsl.l).toBe(100);
    expect(hsl.s).toBe(0);
  });

  it('converts black', () => {
    const hsl = hexToHSL('#000000');
    expect(hsl.l).toBe(0);
  });

  it('handles 3-char hex', () => {
    const hsl = hexToHSL('#f00');
    expect(hsl.h).toBe(0);
    expect(hsl.s).toBe(100);
  });

  it('handles hex without #', () => {
    const hsl = hexToHSL('4f6ef7');
    expect(hsl.h).toBeGreaterThanOrEqual(225);
  });
});

describe('hslToHex', () => {
  it('converts pure red HSL to hex', () => {
    expect(hslToHex(0, 100, 50)).toBe('#ff0000');
  });

  it('converts blue HSL', () => {
    const hex = hslToHex(240, 100, 50);
    expect(hex).toBe('#0000ff');
  });

  it('converts white', () => {
    expect(hslToHex(0, 0, 100)).toBe('#ffffff');
  });

  it('converts black', () => {
    expect(hslToHex(0, 0, 0)).toBe('#000000');
  });

  it('round-trips correctly', () => {
    const original = '#10b981';
    const hsl = hexToHSL(original);
    const result = hslToHex(hsl.h, hsl.s, hsl.l);
    // Allow small rounding differences
    const oR = parseInt(original.slice(1, 3), 16);
    const oG = parseInt(original.slice(3, 5), 16);
    const oB = parseInt(original.slice(5, 7), 16);
    const rR = parseInt(result.slice(1, 3), 16);
    const rG = parseInt(result.slice(3, 5), 16);
    const rB = parseInt(result.slice(5, 7), 16);
    expect(Math.abs(oR - rR)).toBeLessThanOrEqual(2);
    expect(Math.abs(oG - rG)).toBeLessThanOrEqual(2);
    expect(Math.abs(oB - rB)).toBeLessThanOrEqual(2);
  });
});

describe('relativeLuminance', () => {
  it('white has luminance close to 1', () => {
    expect(relativeLuminance('#ffffff')).toBeCloseTo(1, 2);
  });

  it('black has luminance close to 0', () => {
    expect(relativeLuminance('#000000')).toBeCloseTo(0, 2);
  });

  it('mid-gray is between 0 and 1', () => {
    const lum = relativeLuminance('#808080');
    expect(lum).toBeGreaterThan(0.1);
    expect(lum).toBeLessThan(0.5);
  });
});

describe('contrastRatio', () => {
  it('black on white = 21:1', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 0);
  });

  it('same color = 1:1', () => {
    expect(contrastRatio('#4f6ef7', '#4f6ef7')).toBeCloseTo(1, 1);
  });

  it('is symmetric', () => {
    const r1 = contrastRatio('#ff0000', '#ffffff');
    const r2 = contrastRatio('#ffffff', '#ff0000');
    expect(r1).toBeCloseTo(r2, 5);
  });
});

describe('isDark', () => {
  it('black is dark', () => {
    expect(isDark('#000000')).toBe(true);
  });

  it('white is not dark', () => {
    expect(isDark('#ffffff')).toBe(false);
  });

  it('dark blue is dark', () => {
    expect(isDark('#1a1a4a')).toBe(true);
  });

  it('light yellow is not dark', () => {
    expect(isDark('#fffbeb')).toBe(false);
  });
});

// ── checkContrast tests ──────────────────────────────────────

describe('checkContrast', () => {
  it('returns no warnings for readable colors', () => {
    const warnings = checkContrast({
      blockBg: '#ffffff',
      blockFg: '#1f1f1f',
      mutedFg: '#6b6b6b',
    });
    expect(warnings).toHaveLength(0);
  });

  it('warns when text on block bg has low contrast', () => {
    const warnings = checkContrast({
      blockBg: '#333333',
      blockFg: '#555555',
    });
    expect(warnings.length).toBeGreaterThan(0);
    expect(warnings[0].field).toBe('blockFg');
  });

  it('warns when muted text on block bg has low contrast', () => {
    const warnings = checkContrast({
      blockBg: '#333333',
      mutedFg: '#444444',
    });
    expect(warnings.length).toBeGreaterThan(0);
    expect(warnings[0].field).toBe('mutedFg');
  });

  it('returns no warnings when no custom colors set', () => {
    const warnings = checkContrast({ accent: '#4f6ef7' });
    expect(warnings).toHaveLength(0);
  });
});

// ── THEME_PRESETS structure tests ─────────────────────────────

describe('THEME_PRESETS', () => {
  it('exports known presets', async () => {
    const { THEME_PRESETS } = await import('../../src/core/themeEngine.js');
    expect(THEME_PRESETS).toHaveProperty('default');
    expect(THEME_PRESETS).toHaveProperty('calm');
    expect(THEME_PRESETS).toHaveProperty('contrast');
    expect(THEME_PRESETS).toHaveProperty('midnight');
    expect(THEME_PRESETS).toHaveProperty('warm');
  });

  it('each preset has label and theme with accent', async () => {
    const { THEME_PRESETS } = await import('../../src/core/themeEngine.js');
    for (const [id, preset] of Object.entries(THEME_PRESETS)) {
      expect(preset.label).toBeTruthy();
      expect(preset.theme).toBeTruthy();
      expect(preset.theme.accent).toMatch(/^#[0-9a-fA-F]{6}$/);
    }
  });
});

// ── getTheme / exportThemeJson tests ──────────────────────────

describe('getTheme', () => {
  it('returns an object with accent', async () => {
    const { getTheme } = await import('../../src/core/themeEngine.js');
    const theme = getTheme();
    expect(theme).toHaveProperty('accent');
    expect(typeof theme.accent).toBe('string');
  });

  it('returns a copy, not the internal reference', async () => {
    const { getTheme } = await import('../../src/core/themeEngine.js');
    const t1 = getTheme();
    const t2 = getTheme();
    expect(t1).not.toBe(t2);
    expect(t1).toEqual(t2);
  });
});

describe('exportThemeJson', () => {
  it('returns valid JSON string', async () => {
    const { exportThemeJson } = await import('../../src/core/themeEngine.js');
    const json = exportThemeJson();
    const parsed = JSON.parse(json);
    expect(parsed).toHaveProperty('accent');
    expect(parsed).toHaveProperty('tintStrength');
    expect(parsed).toHaveProperty('shadowStrength');
  });
});
