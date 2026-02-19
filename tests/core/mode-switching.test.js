import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createEventBus } from '../../src/core/eventBus.js';
import { createModeManager } from '../../src/core/modeManager.js';
import { createBlockRegistry } from '../../src/core/blockRegistry.js';

// Mock localStorage for Node.js test environment
const store = {};
const mockLocalStorage = {
  getItem: vi.fn((key) => store[key] ?? null),
  setItem: vi.fn((key, value) => { store[key] = String(value); }),
  removeItem: vi.fn((key) => { delete store[key]; }),
  clear: vi.fn(() => { Object.keys(store).forEach((k) => delete store[k]); }),
};

vi.stubGlobal('localStorage', mockLocalStorage);

describe('Mode Switching Integration', () => {
  let eventBus;
  let modeManager;
  let blockRegistry;

  beforeEach(() => {
    mockLocalStorage.clear();
    vi.clearAllMocks();
    eventBus = createEventBus();
    modeManager = createModeManager(eventBus, 'School');
    blockRegistry = createBlockRegistry();
  });

  // ── EventBus + ModeManager ────────────────────────────────

  it('should emit mode:changed event with correct payload', () => {
    const events = [];
    eventBus.on('mode:changed', (payload) => events.push(payload));

    modeManager.setMode('Personal');

    expect(events).toHaveLength(1);
    expect(events[0]).toEqual({ mode: 'Personal' });
  });

  it('should not emit when setting the same mode', () => {
    const events = [];
    eventBus.on('mode:changed', (payload) => events.push(payload));

    // Default is School (no persisted mode), setting School again should not emit
    modeManager.setMode('School');

    expect(events).toHaveLength(0);
  });

  it('should not emit for invalid mode', () => {
    const events = [];
    eventBus.on('mode:changed', (payload) => events.push(payload));

    modeManager.setMode('InvalidMode');

    expect(events).toHaveLength(0);
  });

  it('should persist mode to localStorage', () => {
    modeManager.setMode('BPV');
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith('boris_mode', 'BPV');
  });

  it('should respect persisted mode from localStorage', () => {
    store['boris_mode'] = 'Personal';
    const mm = createModeManager(eventBus, 'School');

    expect(mm.getMode()).toBe('Personal');
  });

  it('should default to School for new users (no persisted mode)', () => {
    expect(modeManager.getMode()).toBe('School');
  });

  it('should detect first visit when no persisted mode', () => {
    expect(modeManager.isFirstVisit()).toBe(true);
  });

  it('should not be first visit when mode is persisted', () => {
    store['boris_mode'] = 'BPV';
    const mm = createModeManager(eventBus, 'School');
    expect(mm.isFirstVisit()).toBe(false);
  });

  it('should update getMode after setMode', () => {
    expect(modeManager.getMode()).toBe('School');
    modeManager.setMode('BPV');
    expect(modeManager.getMode()).toBe('BPV');
    modeManager.setMode('Personal');
    expect(modeManager.getMode()).toBe('Personal');
  });

  it('should return all available modes', () => {
    expect(modeManager.getModes()).toEqual(['BPV', 'School', 'Personal']);
  });

  // ── BlockRegistry Mode Filtering ──────────────────────────

  it('should filter blocks by mode', () => {
    blockRegistry.register({ id: 'bpv-only', modes: ['BPV'], enabled: true });
    blockRegistry.register({ id: 'school-only', modes: ['School'], enabled: true });
    blockRegistry.register({ id: 'personal-only', modes: ['Personal'], enabled: true });
    blockRegistry.register({ id: 'shared', modes: [], enabled: true });

    const filterForMode = (mode) =>
      blockRegistry.getEnabled().filter((block) => {
        if (!Array.isArray(block.modes) || block.modes.length === 0) return true;
        return block.modes.includes(mode);
      });

    const schoolBlocks = filterForMode('School');
    expect(schoolBlocks.map((b) => b.id)).toEqual(['school-only', 'shared']);

    const bpvBlocks = filterForMode('BPV');
    expect(bpvBlocks.map((b) => b.id)).toEqual(['bpv-only', 'shared']);

    const personalBlocks = filterForMode('Personal');
    expect(personalBlocks.map((b) => b.id)).toEqual(['personal-only', 'shared']);
  });

  it('should include blocks with no modes property in all modes', () => {
    blockRegistry.register({ id: 'no-modes', enabled: true });

    const filter = (mode) =>
      blockRegistry.getEnabled().filter((block) => {
        if (!Array.isArray(block.modes) || block.modes.length === 0) return true;
        return block.modes.includes(mode);
      });

    expect(filter('BPV').map((b) => b.id)).toContain('no-modes');
    expect(filter('School').map((b) => b.id)).toContain('no-modes');
    expect(filter('Personal').map((b) => b.id)).toContain('no-modes');
  });

  it('should sort blocks by order', () => {
    blockRegistry.register({ id: 'last', order: 50, modes: [], enabled: true });
    blockRegistry.register({ id: 'first', order: 5, modes: [], enabled: true });
    blockRegistry.register({ id: 'middle', order: 20, modes: [], enabled: true });
    blockRegistry.register({ id: 'no-order', modes: [], enabled: true });

    const all = blockRegistry.getEnabled();
    const sorted = [...all].sort((a, b) => (a.order ?? 999) - (b.order ?? 999));

    expect(sorted.map((b) => b.id)).toEqual(['first', 'middle', 'last', 'no-order']);
  });

  // ── Full Mode Switch Flow ─────────────────────────────────

  it('should trigger re-render on mode change (event flow)', () => {
    let renderCount = 0;
    let lastMode = null;

    eventBus.on('mode:changed', ({ mode }) => {
      renderCount++;
      lastMode = mode;
    });

    modeManager.setMode('BPV');
    expect(renderCount).toBe(1);
    expect(lastMode).toBe('BPV');

    modeManager.setMode('Personal');
    expect(renderCount).toBe(2);
    expect(lastMode).toBe('Personal');

    modeManager.setMode('School');
    expect(renderCount).toBe(3);
    expect(lastMode).toBe('School');
  });

  it('should unsubscribe cleanly', () => {
    let count = 0;
    const unsub = eventBus.on('mode:changed', () => count++);

    modeManager.setMode('BPV');
    expect(count).toBe(1);

    unsub();
    modeManager.setMode('Personal');
    expect(count).toBe(1); // No increment after unsubscribe
  });
});
