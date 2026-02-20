/**
 * Theme Engine — single source of truth for all visual theming.
 *
 * Stores a theme object in IndexedDB (key: 'boris_theme').
 * Backwards-compatible: migrates older accent-only setting on first load.
 * All derived tokens (accent-soft, accent-border, accent-shadow, etc.)
 * are computed from the core values and applied as CSS custom properties.
 */

import { getSetting, setSetting } from '../db.js';
import { ACCENT_COLORS } from '../constants.js';

// ── Color helpers (zero-dep) ──────────────────────────────────

export function hexToHSL(hex) {
  hex = hex.replace('#', '');
  if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
  const r = parseInt(hex.slice(0, 2), 16) / 255;
  const g = parseInt(hex.slice(2, 4), 16) / 255;
  const b = parseInt(hex.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

export function hslToHex(h, s, l) {
  s /= 100; l /= 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs((h / 60) % 2 - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60) { r = c; g = x; }
  else if (h < 120) { r = x; g = c; }
  else if (h < 180) { g = c; b = x; }
  else if (h < 240) { g = x; b = c; }
  else if (h < 300) { r = x; b = c; }
  else { r = c; b = x; }
  const toHex = (v) => Math.round((v + m) * 255).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/** Relative luminance (WCAG) */
export function relativeLuminance(hex) {
  hex = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map(i => {
    let c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio between two hex colors */
export function contrastRatio(hex1, hex2) {
  const l1 = relativeLuminance(hex1);
  const l2 = relativeLuminance(hex2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/** Is the color "dark" (needs light text)? */
export function isDark(hex) {
  return relativeLuminance(hex) < 0.179;
}

// ── Default theme ─────────────────────────────────────────────

const DEFAULT_THEME = {
  accent: '#4f6ef7',
  appBg: null,        // null = use CSS default
  blockBg: null,
  blockFg: null,
  mutedFg: null,
  blockBorder: null,
  danger: null,
  success: null,
  tintStrength: 50,   // 0–100
  shadowStrength: 50,  // 0–100
};

// ── Theme presets ─────────────────────────────────────────────

export const THEME_PRESETS = {
  default: {
    label: 'Standaard',
    theme: { ...DEFAULT_THEME },
  },
  calm: {
    label: 'Rustig',
    theme: { accent: '#6366f1', tintStrength: 30, shadowStrength: 30 },
  },
  contrast: {
    label: 'Hoog Contrast',
    theme: { accent: '#2563eb', tintStrength: 70, shadowStrength: 70 },
  },
  midnight: {
    label: 'Middernacht',
    theme: { accent: '#8b5cf6', tintStrength: 40, shadowStrength: 40 },
  },
  warm: {
    label: 'Warm',
    theme: { accent: '#f97316', tintStrength: 45, shadowStrength: 45 },
  },
};

// ── Core API ──────────────────────────────────────────────────

let currentTheme = { ...DEFAULT_THEME };

/** Get the current in-memory theme */
export function getTheme() {
  return { ...currentTheme };
}

/** Merge partial values into theme, apply, and persist */
export async function setTheme(partial) {
  currentTheme = { ...currentTheme, ...partial };
  applyTheme(currentTheme);
  await setSetting('boris_theme', currentTheme);
}

/** Reset to default theme */
export async function resetTheme() {
  currentTheme = { ...DEFAULT_THEME };
  applyTheme(currentTheme);
  await setSetting('boris_theme', currentTheme);
  // Clear old accent setting for clean state
  await setSetting('accentColor', 'blue');
}

/** Export as JSON string */
export function exportThemeJson() {
  return JSON.stringify(currentTheme, null, 2);
}

/** Import from JSON string */
export async function importThemeJson(json) {
  try {
    const parsed = JSON.parse(json);
    if (!parsed || typeof parsed !== 'object') throw new Error('Invalid theme');
    // Only accept known keys
    const safe = {};
    for (const key of Object.keys(DEFAULT_THEME)) {
      if (key in parsed) safe[key] = parsed[key];
    }
    await setTheme(safe);
    return true;
  } catch {
    return false;
  }
}

/** Load theme from DB on startup (backwards-compatible migration) */
export async function initTheme() {
  try {
    const saved = await getSetting('boris_theme');
    if (saved && typeof saved === 'object' && saved.accent) {
      currentTheme = { ...DEFAULT_THEME, ...saved };
    } else {
      // Migrate from old accent-only setting
      const oldAccentId = await getSetting('accentColor');
      if (oldAccentId) {
        const preset = ACCENT_COLORS.find(c => c.id === oldAccentId);
        if (preset) {
          currentTheme = { ...DEFAULT_THEME, accent: preset.hex };
        }
      }
    }
    applyTheme(currentTheme);
  } catch {
    applyTheme(DEFAULT_THEME);
  }
}

// ── Apply theme to DOM ────────────────────────────────────────

export function applyTheme(theme) {
  const root = document.documentElement;
  const t = { ...DEFAULT_THEME, ...theme };
  const accent = t.accent || DEFAULT_THEME.accent;
  const hsl = hexToHSL(accent);
  const tint = (t.tintStrength ?? 50) / 100;     // 0–1
  const shadow = (t.shadowStrength ?? 50) / 100;  // 0–1

  // Check if we're in dark mode
  const darkMode = root.getAttribute('data-theme') === 'dark' ||
    (root.getAttribute('data-theme') !== 'light' &&
     typeof window !== 'undefined' &&
     window.matchMedia?.('(prefers-color-scheme: dark)').matches);

  // ── Core accent ──
  root.style.setProperty('--color-accent', accent);
  root.style.setProperty('--color-accent-hover', hslToHex(hsl.h, hsl.s, Math.max(hsl.l - 8, 10)));
  root.style.setProperty('--color-accent-text', isDark(accent) ? '#ffffff' : '#1f1f1f');

  // ── Derived accent tokens ──
  const softAlpha = Math.round(8 + tint * 12);    // 8–20% opacity
  const softAlpha2 = Math.round(4 + tint * 8);    // 4–12% opacity
  const borderAlpha = Math.round(15 + tint * 25);  // 15–40% opacity
  const shadowAlpha = Math.round(5 + shadow * 15); // 5–20% opacity

  if (darkMode) {
    root.style.setProperty('--color-accent-light', hslToHex(hsl.h, Math.min(hsl.s, 50), 18));
    root.style.setProperty('--accent-soft', `hsla(${hsl.h}, ${hsl.s}%, ${25}%, ${softAlpha / 100})`);
    root.style.setProperty('--accent-soft-2', `hsla(${hsl.h}, ${hsl.s}%, ${25}%, ${softAlpha2 / 100})`);
    root.style.setProperty('--accent-border', `hsla(${hsl.h}, ${hsl.s}%, ${50}%, ${borderAlpha / 100})`);
    root.style.setProperty('--accent-shadow', `0 2px 12px hsla(${hsl.h}, ${hsl.s}%, ${20}%, ${shadowAlpha / 100})`);
  } else {
    root.style.setProperty('--color-accent-light', `color-mix(in srgb, ${accent} 12%, transparent)`);
    root.style.setProperty('--accent-soft', `hsla(${hsl.h}, ${hsl.s}%, ${hsl.l}%, ${softAlpha / 100})`);
    root.style.setProperty('--accent-soft-2', `hsla(${hsl.h}, ${hsl.s}%, ${hsl.l}%, ${softAlpha2 / 100})`);
    root.style.setProperty('--accent-border', `hsla(${hsl.h}, ${hsl.s}%, ${hsl.l}%, ${borderAlpha / 100})`);
    root.style.setProperty('--accent-shadow', `0 2px 12px hsla(${hsl.h}, ${hsl.s}%, ${hsl.l}%, ${shadowAlpha / 100})`);
  }

  // ── Gradient ──
  root.style.setProperty('--gradient-primary',
    `linear-gradient(135deg, ${accent}, ${hslToHex(hsl.h, hsl.s, Math.max(hsl.l - 15, 10))})`);

  // ── Optional overrides (null = keep CSS default) ──
  const optionals = [
    ['--color-bg', t.appBg],
    ['--color-surface', t.blockBg],
    ['--color-text', t.blockFg],
    ['--color-text-secondary', t.mutedFg],
    ['--color-border', t.blockBorder],
    ['--color-error', t.danger],
    ['--color-success', t.success],
  ];

  for (const [prop, value] of optionals) {
    if (value) {
      root.style.setProperty(prop, value);
    } else {
      root.style.removeProperty(prop);
    }
  }
}

// ── Contrast safeguard ────────────────────────────────────────

/** Check readability and return warnings */
export function checkContrast(theme) {
  const t = { ...DEFAULT_THEME, ...theme };
  const warnings = [];

  // Only check if custom colors are set
  if (t.blockBg && t.blockFg) {
    const ratio = contrastRatio(t.blockBg, t.blockFg);
    if (ratio < 4.5) {
      warnings.push({ field: 'blockFg', ratio: ratio.toFixed(1), message: 'Tekst op blok-achtergrond is moeilijk leesbaar' });
    }
  }

  if (t.blockBg && t.mutedFg) {
    const ratio = contrastRatio(t.blockBg, t.mutedFg);
    if (ratio < 3) {
      warnings.push({ field: 'mutedFg', ratio: ratio.toFixed(1), message: 'Gedempte tekst is nauwelijks leesbaar' });
    }
  }

  return warnings;
}
