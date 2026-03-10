/**
 * Legacy state module — re-exports from core/eventBus.js for backward compatibility.
 * Existing pages import { emit, on, off } from './state.js'.
 * New blocks should import from './core/eventBus.js' directly.
 */
export { emit, on, off } from './core/eventBus.js';
