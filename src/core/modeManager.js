/**
 * BORIS OS — Mode Manager
 * Manages the three operating modes: bpv, school, personal.
 * Switching mode dynamically loads/unloads relevant blocks.
 */

import { emit, on } from './eventBus.js';
import { getSetting, setSetting } from '../db.js';

const MODES = ['bpv', 'school', 'personal'];
const MODE_LABELS = {
  bpv: 'BPV',
  school: 'School',
  personal: 'Persoonlijk'
};
const MODE_ICONS = {
  bpv: 'clipboard',
  school: 'book',
  personal: 'sun'
};

let currentMode = 'bpv';

export function getModes() {
  return MODES;
}

export function getModeLabel(mode) {
  return MODE_LABELS[mode] || mode;
}

export function getModeIcon(mode) {
  return MODE_ICONS[mode] || 'dashboard';
}

export function getCurrentMode() {
  return currentMode;
}

export async function setMode(mode) {
  if (!MODES.includes(mode)) {
    console.warn(`[ModeManager] Invalid mode: "${mode}"`);
    return;
  }
  if (mode === currentMode) return;

  const previousMode = currentMode;
  currentMode = mode;

  await setSetting('active_mode', mode);
  emit('mode:changed', { mode, previousMode });
}

export async function initMode() {
  const saved = await getSetting('active_mode');
  if (saved && MODES.includes(saved)) {
    currentMode = saved;
  }
  return currentMode;
}
