import './styles/reset.css';
import './styles/variables.css';
import './styles/base.css';
import './styles/components.css';
import './styles/pages.css';
import './styles/print.css';

import { initDB, getSetting } from './db.js';
import { createRouter } from './router.js';
import { createShell } from './components/shell.js';
import { initShortcuts } from './shortcuts.js';
import { ACCENT_COLORS, applyAccentColor } from './constants.js';
import { initAutoSync } from './auto-sync.js';
import { getFeatureFlag } from './core/featureFlags.js';
import { createEventBus } from './core/eventBus.js';
import { createModeManager } from './core/modeManager.js';
import { createBlockRegistry } from './core/blockRegistry.js';
import { registerDefaultBlocks } from './blocks/registerBlocks.js';
import { renderSettingsBlock } from './blocks/settings-panel.js';
import { applyDesignTokens } from './core/designSystem.js';
import { APP_VERSION } from './version.js';

export const SCHEMA_VERSION = 2;

// Module registry
export const modules = [
  { id: 'dashboard',        label: 'Dashboard',         icon: 'dashboard',        route: '',                page: () => import('./pages/dashboard.js') },
  { id: 'today',            label: 'Vandaag',           icon: 'clipboard-check',  route: 'today',            page: () => import('./pages/today.js') },
  { id: 'planning',         label: 'Dagplan',           icon: 'check-circle',     route: 'planning',        page: () => import('./pages/planning.js') },
  { id: 'hours',            label: 'Uren',              icon: 'clock',            route: 'hours',            page: () => import('./pages/hours.js') },
  { id: 'logbook',          label: 'Logboek',           icon: 'book',             route: 'logbook',          page: () => import('./pages/logbook.js') },
  { id: 'notebook',         label: 'Notebook',          icon: 'edit',             route: 'notebook',         page: () => import('./pages/notebook.js') },
  { id: 'goals',            label: 'Leerdoelen',        icon: 'target',           route: 'goals',            page: () => import('./pages/goals.js') },
  { id: 'competencies',     label: 'Leermeter',         icon: 'chart',            route: 'competencies',     page: () => import('./pages/competencies.js') },
  { id: 'quality',          label: 'Kwaliteit',         icon: 'shield',           route: 'quality',          page: () => import('./pages/quality.js') },
  { id: 'learning-moments', label: 'Leeranalyse',       icon: 'alert-triangle',   route: 'learning-moments', page: () => import('./pages/learning-moments.js') },
  { id: 'process-map',      label: 'Proceskaart',       icon: 'map',              route: 'process-map',      page: () => import('./pages/process-map.js') },
  { id: 'reference',        label: 'Naslagwerk',        icon: 'search',           route: 'reference',        page: () => import('./pages/reference.js') },
  { id: 'assignments',      label: 'Opdrachten',        icon: 'clipboard',        route: 'assignments',      page: () => import('./pages/assignments.js') },
  { id: 'report',           label: 'Verslag',           icon: 'file-text',        route: 'report',           page: () => import('./pages/report.js') },
  { id: 'sync',             label: 'Sync',              icon: 'upload',           route: 'sync',             page: () => import('./pages/sync.js') },
  { id: 'vault',            label: 'Vault',             icon: 'lock',             route: 'vault',            page: () => import('./pages/vault.js') },
  { id: 'export',           label: 'Export',            icon: 'download',         route: 'export',           page: () => import('./pages/export.js') },
  { id: 'diagnostics',      label: 'Diagnostiek',       icon: 'settings',         route: 'diagnostics',      page: () => import('./pages/diagnostics.js') },
  { id: 'settings',         label: 'Instellingen',      icon: 'settings',         route: 'settings',         page: () => import('./pages/settings.js') },
];

let updateBanner = null;

async function init() {
  applyDesignTokens();
  await initDB();
  await initServiceWorker();

  const enableNewOS = getFeatureFlag('enableNewOS');
  if (enableNewOS) {
    initNewOSShell();
    return;
  }

  await initLegacy();
}

async function initLegacy() {
  // Apply saved theme
  const theme = await getSetting('theme');
  if (theme && theme !== 'system') {
    document.documentElement.setAttribute('data-theme', theme);
  }

  // Apply saved accent color
  const accentId = await getSetting('accentColor');
  if (accentId) {
    const color = ACCENT_COLORS.find(c => c.id === accentId);
    if (color) applyAccentColor(color.hex);
  }

  // Apply compact mode
  const compact = await getSetting('compact');
  if (compact) {
    document.documentElement.setAttribute('data-compact', 'true');
  }

  // Ensure device_id exists
  let deviceId = await getSetting('device_id');
  if (!deviceId) {
    deviceId = crypto.randomUUID();
    const { setSetting: ss } = await import('./db.js');
    await ss('device_id', deviceId);
  }

  const app = document.getElementById('app');
  createShell(app);
  createRouter();
  initShortcuts();

  // Start auto-sync (if configured)
  initAutoSync().catch(() => {});
}

function initNewOSShell() {
  const app = document.getElementById('app');
  if (!app) return;

  const eventBus = createEventBus();
  const modeManager = createModeManager(eventBus, 'BPV');
  const blockRegistry = createBlockRegistry();
  registerDefaultBlocks(blockRegistry);

  app.innerHTML = `
    <div id="new-os-shell" style="min-height:100vh;display:flex;flex-direction:column;">
      <header style="display:flex;justify-content:space-between;align-items:center;padding:16px;border-bottom:1px solid var(--color-border);">
        <strong>New OS Shell (Experimental)</strong>
        <div id="mode-switch" role="group" aria-label="Mode switch">
          <button type="button" data-mode="BPV">BPV</button>
          <button type="button" data-mode="School">School</button>
          <button type="button" data-mode="Personal">Personal</button>
        </div>
      </header>
      <nav id="os-nav" style="padding:12px 16px;border-bottom:1px solid var(--color-border);display:flex;gap:16px;flex-wrap:wrap;">
        <span data-os-tab="dashboard">Dashboard</span>
        <span data-os-tab="today">Vandaag</span>
        <span data-os-tab="planning">Planning</span>
        <span data-os-tab="reflectie">Reflectie</span>
        <span data-os-tab="archief">Archief</span>
      </nav>
      <main id="new-os-content" style="padding:16px;flex:1;display:grid;gap:16px;">
        <section data-os-section="dashboard">
          <h2 style="margin:0 0 10px;font-size:16px;">Dashboard</h2>
          <div class="os-host-grid" data-os-host="dashboard-cards"></div>
        </section>
        <section data-os-section="today">
          <h2 style="margin:0 0 10px;font-size:16px;">Vandaag</h2>
          <div class="os-host-grid" data-os-host="vandaag-widgets"></div>
        </section>
        <section data-os-section="settings">
          <div id="new-os-settings-block"></div>
        </section>
      </main>
    </div>
  `;

  const applyFocusMode = async () => {
    const focusMode = await getSetting('focusMode');
    const sections = app.querySelectorAll('[data-os-section]');
    const navTabs = app.querySelectorAll('[data-os-tab]');

    if (focusMode) {
      sections.forEach((section) => {
        const keep = section.getAttribute('data-os-section') === 'today';
        section.setAttribute('style', keep ? '' : 'display:none');
      });
      navTabs.forEach((tab) => {
        const keep = tab.getAttribute('data-os-tab') === 'today';
        tab.setAttribute('style', keep ? '' : 'display:none');
      });
    } else {
      sections.forEach((section) => section.removeAttribute('style'));
      navTabs.forEach((tab) => tab.removeAttribute('style'));
    }
  };

  const modeButtons = app.querySelectorAll('#mode-switch [data-mode]');
  let mountedBlocks = [];

  const unmountAll = () => {
    mountedBlocks.forEach((entry) => {
      if (entry.instance?.unmount) {
        entry.instance.unmount();
      }
    });
    mountedBlocks = [];
    app.querySelectorAll('[data-os-host]').forEach((host) => {
      host.innerHTML = '';
    });
  };

  const renderHosts = () => {
    unmountAll();

    const mode = modeManager.getMode();
    const context = { mode, eventBus, modeManager };

    const eligibleBlocks = blockRegistry.getEnabled().filter((block) => {
      if (!Array.isArray(block.modes) || block.modes.length === 0) return true;
      return block.modes.includes(mode);
    });

    eligibleBlocks.forEach((block) => {
      const hosts = Array.isArray(block.hosts) ? block.hosts : [];
      hosts.forEach((hostName) => {
        const hostEl = app.querySelector(`[data-os-host="${hostName}"]`);
        if (!hostEl || typeof block.mount !== 'function') return;
        const instance = block.mount(hostEl, context) || null;
        mountedBlocks.push({ blockId: block.id, hostName, instance });
      });
    });
  };

  const updateModeButtons = () => {
    const mode = modeManager.getMode();
    modeButtons.forEach((button) => {
      const active = button.getAttribute('data-mode') === mode;
      button.setAttribute('aria-pressed', String(active));
    });
  };

  modeButtons.forEach((button) => {
    button.addEventListener('click', () => {
      modeManager.setMode(button.getAttribute('data-mode'));
    });
  });

  eventBus.on('mode:changed', () => {
    updateModeButtons();
    renderHosts();
  });

  renderSettingsBlock(app.querySelector('#new-os-settings-block'), {
    onChange: async ({ key }) => {
      if (key === 'focusMode') {
        await applyFocusMode();
      }
    },
  });

  updateModeButtons();
  renderHosts();
  applyFocusMode();
}

async function initServiceWorker() {
  if (!('serviceWorker' in navigator)) return;

  const swUrl = `${import.meta.env.BASE_URL}sw.js?v=${encodeURIComponent(APP_VERSION)}`;

  try {
    const registration = await navigator.serviceWorker.register(swUrl);

    if (registration.waiting) {
      showUpdateBanner(registration);
    }

    registration.addEventListener('updatefound', () => {
      const installing = registration.installing;
      if (!installing) return;

      installing.addEventListener('statechange', () => {
        if (installing.state === 'installed' && navigator.serviceWorker.controller) {
          showUpdateBanner(registration);
        }
      });
    });

    navigator.serviceWorker.addEventListener('controllerchange', () => {
      window.location.reload();
    });
  } catch (error) {
    console.warn('Service worker registration failed', error);
  }
}

function showUpdateBanner(registration) {
  if (updateBanner) return;

  const banner = document.createElement('aside');
  banner.className = 'update-banner';
  banner.innerHTML = `
    <span>Nieuwe versie beschikbaar</span>
    <button type="button" class="btn btn-secondary btn-sm">Ververs</button>
  `;

  banner.querySelector('button')?.addEventListener('click', () => {
    registration.waiting?.postMessage({ type: 'SKIP_WAITING' });
  });

  document.body.appendChild(banner);
  updateBanner = banner;
}

init();
