/**
 * BORIS OS — Block Registry
 * Central registry for all modular blocks.
 * Each block self-registers with its capabilities.
 *
 * A block must declare:
 *   id:           unique string identifier
 *   mode:         "bpv" | "school" | "personal" | "system" (system = always available)
 *   label:        display name
 *   icon:         icon key
 *   route:        URL route (hash-based)
 *   page:         () => import('./path') — lazy loader
 *   nav:          "main" | "secondary" | "none" — where to show in sidebar
 *   bottomNav:    boolean — show in mobile bottom nav
 *   supportsToday: boolean — renders content in Today tab
 *   supportsDashboard: boolean — renders a card on Dashboard
 *   order:        number — sort order in navigation
 *   stores:       string[] — IndexedDB stores this block uses
 *   dependencies: string[] — block IDs this block depends on
 */

const blocks = new Map();
let featureFlags = null;

export function registerBlock(block) {
  if (!block.id) throw new Error('[BlockRegistry] Block must have an id');
  if (blocks.has(block.id)) {
    console.warn(`[BlockRegistry] Block "${block.id}" already registered, overwriting`);
  }

  const normalized = {
    mode: 'system',
    nav: 'main',
    bottomNav: false,
    supportsToday: false,
    supportsDashboard: false,
    order: 100,
    stores: [],
    dependencies: [],
    extraRoutes: {},
    ...block
  };

  blocks.set(block.id, normalized);
}

export function getBlock(id) {
  return blocks.get(id) || null;
}

export function getAllBlocks() {
  return Array.from(blocks.values());
}

export function getBlocksForMode(mode) {
  return getAllBlocks().filter(b => {
    if (!isBlockEnabled(b.id)) return false;
    return b.mode === mode || b.mode === 'system';
  }).sort((a, b) => a.order - b.order);
}

export function getNavBlocks(mode, section = 'main') {
  return getBlocksForMode(mode).filter(b => b.nav === section);
}

export function getBottomNavBlocks(mode) {
  return getBlocksForMode(mode).filter(b => b.bottomNav).sort((a, b) => a.order - b.order);
}

export function getTodayBlocks(mode) {
  return getBlocksForMode(mode).filter(b => b.supportsToday);
}

export function getDashboardBlocks(mode) {
  return getBlocksForMode(mode).filter(b => b.supportsDashboard);
}

// Feature flag integration
export function setFeatureFlags(flags) {
  featureFlags = flags;
}

export function isBlockEnabled(blockId) {
  if (!featureFlags) return true;
  return featureFlags.isEnabled(blockId);
}

// Get all extra routes from all registered blocks
export function getAllExtraRoutes() {
  const routes = {};
  for (const block of blocks.values()) {
    if (block.extraRoutes && isBlockEnabled(block.id)) {
      Object.assign(routes, block.extraRoutes);
    }
  }
  return routes;
}

export function clearRegistry() {
  blocks.clear();
}
