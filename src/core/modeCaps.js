import { getTaskCapFromConfig } from './modeConfig.js';

// Fallback caps used synchronously before config loads
export const MODE_TASK_CAPS = {
  BPV: 3,
  School: 3,
  Personal: 5,
};

/**
 * Get task cap for a mode (synchronous fallback).
 * For async config-aware cap, use getTaskCapFromConfig() directly.
 */
export function getTaskCap(mode) {
  return MODE_TASK_CAPS[mode] ?? 5;
}

// Re-export the async variant for consumers that can await
export { getTaskCapFromConfig };
