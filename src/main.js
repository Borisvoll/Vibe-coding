import './styles/reset.css';
import './styles/variables.css';
import './ui/tokens.css';
import './ui/card.css';
import './ui/typography.css';
import './ui/layout.css';
import './ui/balatro.css';
import './ui/tooltip.css';
import './ui/modal.css';
import './styles/base.css';
import './styles/components.css';
import './styles/pages.css';
import './styles/print.css';
import './react/tailwind.css';

import { createRoot } from 'react-dom/client';
import { createElement } from 'react';
import { App } from './react/App.jsx';
import { initDB, getSetting } from './db.js';
import { initTheme } from './core/themeEngine.js';
import { createEventBus } from './core/eventBus.js';
import { createModeManager } from './core/modeManager.js';
import { createBlockRegistry } from './core/blockRegistry.js';
import { registerDefaultBlocks } from './blocks/registerBlocks.js';
import { applyDesignTokens } from './core/designSystem.js';
import { APP_VERSION } from './version.js';
import { initBalatro } from './ui/balatro.js';

export const SCHEMA_VERSION = 6;

let updateBanner = null;
let swControllerChangeBound = false;

async function applyUserSettings() {
  const theme = await getSetting('theme');
  if (theme && theme !== 'system') {
    document.documentElement.setAttribute('data-theme', theme);
  }

  // Theme engine handles accent + all derived tokens (backwards-compatible)
  await initTheme();

  const compact = await getSetting('compact');
  if (compact) {
    document.documentElement.setAttribute('data-compact', 'true');
  }

  // Reduce-motion preference (user-controlled, independent of OS setting)
  const reduceMotion = await getSetting('reduceMotion');
  if (reduceMotion) {
    document.documentElement.setAttribute('data-reduce-motion', 'true');
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
  initBalatro();

  await initNewOSShell();
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

async function initNewOSShell() {
  const app = document.getElementById('app');
  if (!app) return;

  // Read mode from IDB (set in previous session); fall back to localStorage cache
  const savedMode = await getSetting('boris_mode').catch(() => null);
  const eventBus = createEventBus();
  const modeManager = createModeManager(eventBus, savedMode || 'School');

  // Create block registry and register all vanilla blocks
  const blockRegistry = createBlockRegistry();
  registerDefaultBlocks(blockRegistry);

  // Mount React app
  const root = createRoot(app);
  root.render(createElement(App, { eventBus, modeManager, blockRegistry }));
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
