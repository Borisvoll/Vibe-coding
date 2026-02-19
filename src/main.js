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
import { applyDesignTokens } from './core/designSystem.js';
import { APP_VERSION } from './version.js';
import { createOSShell } from './os/shell.js';

export const SCHEMA_VERSION = 5;

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
let swControllerChangeBound = false;

async function applyUserSettings() {
  const theme = await getSetting('theme');
  if (theme && theme !== 'system') {
    document.documentElement.setAttribute('data-theme', theme);
  }

  const accentId = await getSetting('accentColor');
  if (accentId) {
    const color = ACCENT_COLORS.find((c) => c.id === accentId);
    if (color) applyAccentColor(color.hex);
  }

  const compact = await getSetting('compact');
  if (compact) {
    document.documentElement.setAttribute('data-compact', 'true');
  }
}

async function init() {
  applyDesignTokens();
  await initDB();
  await applyUserSettings();
  await ensureDeviceId();
  await migratePersonalTasks();
  await checkExportReminder();
  await initServiceWorker();

  const enableNewOS = getFeatureFlag('enableNewOS');
  if (enableNewOS) {
    try {
      initNewOSShell();
      return;
    } catch (err) {
      console.error('BORIS OS failed to load, falling back to legacy:', err);
    }
  }

  await initLegacy();
}

async function ensureDeviceId() {
  const existing = await getSetting('device_id');
  if (!existing) {
    const { setSetting } = await import('./db.js');
    await setSetting('device_id', crypto.randomUUID());
  }
}

async function migratePersonalTasks() {
  const migrated = await getSetting('migration_personal_tasks_done');
  if (migrated) return;

  const { getAll, put, setSetting } = await import('./db.js');
  const oldTasks = await getAll('os_personal_tasks');
  if (oldTasks.length > 0) {
    for (const task of oldTasks) {
      await put('os_tasks', {
        id: task.id,
        text: task.text || task.title || '',
        mode: 'Personal',
        status: task.status || 'todo',
        priority: task.priority ?? 3,
        date: task.date || null,
        doneAt: task.doneAt || null,
        createdAt: task.createdAt || task.created_at || new Date().toISOString(),
        updated_at: task.updated_at || new Date().toISOString(),
      });
    }
  }
  await setSetting('migration_personal_tasks_done', true);
}

async function checkExportReminder() {
  const lastExport = await getSetting('last_export_date');
  if (!lastExport) return; // Don't nag new users who never exported
  const daysSince = Math.floor((Date.now() - new Date(lastExport).getTime()) / 86400000);
  if (daysSince >= 7) {
    // Defer the toast so it doesn't block init
    setTimeout(async () => {
      const { showToast } = await import('./toast.js');
      showToast(`Laatste backup: ${daysSince} dagen geleden. Exporteer je data via Instellingen.`, { type: 'info', duration: 8000 });
    }, 2000);
  }
}

async function initLegacy() {
  const app = document.getElementById('app');
  createShell(app);
  createRouter();
  initShortcuts();

  initAutoSync().catch(() => {});
}

function initNewOSShell() {
  const app = document.getElementById('app');
  if (!app) return;

  const eventBus = createEventBus();
  const modeManager = createModeManager(eventBus, 'BPV');
  const blockRegistry = createBlockRegistry();
  registerDefaultBlocks(blockRegistry);

  createOSShell(app, { eventBus, modeManager, blockRegistry });
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

    if (!swControllerChangeBound) {
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        window.location.reload();
      });
      swControllerChangeBound = true;
    }
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
