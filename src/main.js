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

import { initDB, getSetting, purgeDeletedOlderThan } from './db.js';
import { seedModeConfigIfNeeded, getModeById, archiveMode } from './core/modeConfig.js';
import { initTheme } from './core/themeEngine.js';
import { createEventBus } from './core/eventBus.js';
import { createModeManager } from './core/modeManager.js';
import { createBlockRegistry } from './core/blockRegistry.js';
import { registerDefaultBlocks } from './blocks/registerBlocks.js';
import { applyDesignTokens } from './core/designSystem.js';
import { APP_VERSION } from './version.js';
import { createOSShell } from './os/shell.js';
import { initBalatro } from './ui/balatro.js';
import { initClickSound } from './ui/clickSound.js';

export const SCHEMA_VERSION = 9;

let updateBanner = null;
let swControllerChangeBound = false;

async function applyUserSettings() {
  // Theme engine handles accent, dark/light mode, and all derived tokens
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
  await seedModeConfigIfNeeded();
  await checkBPVRetirement();
  await migratePersonalTasks();
  await checkExportReminder();
  // Purge soft-deleted tombstones older than 30 days (fire-and-forget)
  purgeDeletedOlderThan(30).catch(() => { /* non-critical */ });
  await initServiceWorker();
  initBalatro();

  await initNewOSShell();
}

async function checkBPVRetirement() {
  try {
    const { BPV_END } = await import('./constants.js');
    const { getToday } = await import('./utils.js');
    const today = getToday();
    if (today <= BPV_END) return;

    const bpv = await getModeById('BPV');
    if (!bpv || bpv.status === 'archived') return;

    // BPV period is over — auto-archive
    await archiveMode('BPV');

    // Show one-time notification (deferred so it doesn't block init)
    const notified = await getSetting('bpv_retirement_notified');
    if (!notified) {
      const { setSetting } = await import('./db.js');
      await setSetting('bpv_retirement_notified', true);
      setTimeout(async () => {
        const { showToast } = await import('./toast.js');
        showToast('Je BPV-periode is afgelopen. BPV-modus is gearchiveerd. Je data blijft bewaard.', { type: 'info', duration: 8000 });
      }, 2000);
    }
  } catch { /* non-critical */ }
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
  await modeManager.loadModes();

  // Set mode-appropriate preset on first run (before blocks mount)
  const { applyDefaultPresetForMode } = await import('./core/modulePresets.js');
  applyDefaultPresetForMode(modeManager.getMode());

  const blockRegistry = createBlockRegistry();
  registerDefaultBlocks(blockRegistry);

  createOSShell(app, { eventBus, modeManager, blockRegistry });
  initClickSound(eventBus, modeManager);
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
