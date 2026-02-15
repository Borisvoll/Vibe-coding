import { modules } from './main.js';
import { emit } from './state.js';

let currentPage = null;
let mainEl = null;

const extraRoutes = {
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

  // Try extra routes first
  for (const [pattern, loader] of Object.entries(extraRoutes)) {
    const params = matchRoute(pattern, parts);
    if (params !== null) {
      loadPage(loader, params);
      emit('navigate', { path, params });
      updateActiveNav(parts[0] || '');
      // Set header title based on parent module
      const parentMod = modules.find(m => m.route === (parts[0] || ''));
      if (parentMod) updateHeaderTitle(parentMod.label);
      return;
    }
  }

  // Try module routes
  const mod = modules.find(m => m.route === (parts[0] || ''));
  if (mod) {
    loadPage(mod.page, {});
    emit('navigate', { path, params: {} });
    updateActiveNav(mod.route);
    updateHeaderTitle(mod.label);
    return;
  }

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
