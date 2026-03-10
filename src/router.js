import { modules } from './main.js';
import { emit } from './state.js';
import { getBlocksForMode, getAllExtraRoutes } from './core/blockRegistry.js';
import { getCurrentMode } from './core/modeManager.js';

let currentPage = null;
let mainEl = null;

// Legacy extra routes — still needed for BPV mode sub-pages
const legacyExtraRoutes = {
  'hours/:date': () => import('./pages/hours-entry.js'),
  'logbook/new': () => import('./pages/logbook-entry.js'),
  'logbook/:id': () => import('./pages/logbook-entry.js'),
};

export function createRouter() {
  mainEl = document.getElementById('main-content');
  window.addEventListener('hashchange', handleRoute);
  handleRoute();
}

export function navigate(hash) {
  window.location.hash = hash;
}

function parseHash() {
  const raw = window.location.hash.slice(1) || '';
  return raw.split('/').filter(Boolean);
}

function handleRoute() {
  const parts = parseHash();
  const path = parts.join('/');

  if (currentPage && currentPage.destroy) {
    currentPage.destroy();
  }
  currentPage = null;

  const mode = getCurrentMode();

  // Merge legacy extra routes with block extra routes
  const blockExtraRoutes = getAllExtraRoutes();
  const allExtraRoutes = { ...legacyExtraRoutes, ...blockExtraRoutes };

  // Try extra routes first (sub-pages like hours/:date)
  for (const [pattern, loader] of Object.entries(allExtraRoutes)) {
    const params = matchRoute(pattern, parts);
    if (params !== null) {
      loadPage(loader, params);
      emit('navigate', { path, params });
      updateActiveNav(parts[0] || '');
      // Find label from blocks or legacy modules
      const blocks = getBlocksForMode(mode);
      const block = blocks.find(b => b.route === (parts[0] || ''));
      const parentMod = block || modules.find(m => m.route === (parts[0] || ''));
      if (parentMod) updateHeaderTitle(parentMod.label);
      return;
    }
  }

  // Try block routes for current mode
  const blocks = getBlocksForMode(mode);
  const block = blocks.find(b => b.route === (parts[0] || ''));
  if (block) {
    loadPage(block.page, {});
    emit('navigate', { path, params: {} });
    updateActiveNav(block.route);
    updateHeaderTitle(block.label);
    return;
  }

  // Fallback: try legacy module routes (for backward compatibility)
  const mod = modules.find(m => m.route === (parts[0] || ''));
  if (mod) {
    loadPage(mod.page, {});
    emit('navigate', { path, params: {} });
    updateActiveNav(mod.route);
    updateHeaderTitle(mod.label);
    return;
  }

  // Default: go to home
  navigate('');
}

function matchRoute(pattern, parts) {
  const patternParts = pattern.split('/').filter(Boolean);
  if (patternParts.length !== parts.length) return null;

  const params = {};
  for (let i = 0; i < patternParts.length; i++) {
    if (patternParts[i].startsWith(':')) {
      params[patternParts[i].slice(1)] = parts[i];
    } else if (patternParts[i] !== parts[i]) {
      return null;
    }
  }
  return params;
}

async function loadPage(loader, params) {
  if (!mainEl) return;

  // Trigger page enter animation
  mainEl.classList.remove('page-enter');
  void mainEl.offsetWidth; // force reflow to restart animation
  mainEl.classList.add('page-enter');

  try {
    const mod = await loader();
    const createFn = mod.createPage || mod.default;
    if (createFn) {
      currentPage = createFn(mainEl, params);
    }
  } catch (err) {
    console.error('Page load error:', err);
    mainEl.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">!</div>
        <h3>Pagina kon niet geladen worden</h3>
        <p>${err.message}</p>
      </div>
    `;
  }
}

function updateActiveNav(route) {
  document.querySelectorAll('.nav-link').forEach(link => {
    const linkRoute = link.getAttribute('data-route') || '';
    link.classList.toggle('active', linkRoute === route);
  });
}

function updateHeaderTitle(label) {
  const titleEl = document.getElementById('header-title');
  if (titleEl) titleEl.textContent = label;
}
