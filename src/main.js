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

import { initDB, getSetting, setSetting, getAll, put, purgeDeletedOlderThan } from './db.js';
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
import { BPV_END } from './constants.js';
import { getToday } from './utils.js';
import { showToast } from './toast.js';
import { purgeOldReviewMarkers } from './stores/weekly-review.js';
import { purgeOldDoneTasks } from './stores/tasks.js';
import { applyDefaultPresetForMode } from './core/modulePresets.js';
import { cloudSync } from './sync-cloud.js';

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
  await checkImportRecovery();
  // Purge soft-deleted tombstones older than 30 days (fire-and-forget)
  purgeDeletedOlderThan(30).catch(() => { /* non-critical */ });
  // Purge weekly-review sent markers older than 52 weeks (fire-and-forget)
  purgeOldReviewMarkers(52).catch(() => { /* non-critical */ });
  // Purge completed tasks older than 30 days to keep os_tasks store lean (fire-and-forget)
  purgeOldDoneTasks(30).catch(() => { /* non-critical */ });
  await initServiceWorker();
  initBalatro();

  await initNewOSShell();
}

async function checkBPVRetirement() {
  try {
    const today = getToday();
    if (today <= BPV_END) return;

    const bpv = await getModeById('BPV');
    if (!bpv || bpv.status === 'archived') return;

    // BPV period is over — auto-archive
    await archiveMode('BPV');

    // Show one-time notification (deferred so it doesn't block init)
    const notified = await getSetting('bpv_retirement_notified');
    if (!notified) {
      await setSetting('bpv_retirement_notified', true);
      setTimeout(() => {
        showToast('Je BPV-periode is afgelopen. BPV-modus is gearchiveerd. Je data blijft bewaard.', { type: 'info', duration: 8000 });
      }, 2000);
    }
  } catch { /* non-critical */ }
}

async function ensureDeviceId() {
  const existing = await getSetting('device_id');
  if (!existing) {
    await setSetting('device_id', crypto.randomUUID());
  }
}

async function migratePersonalTasks() {
  const migrated = await getSetting('migration_personal_tasks_done');
  if (migrated) return;

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
    setTimeout(() => {
      showToast(`Laatste backup: ${daysSince} dagen geleden. Exporteer je data via Instellingen.`, { type: 'info', duration: 8000 });
    }, 2000);
  }
}

async function checkImportRecovery() {
  try {
    const raw = localStorage.getItem('boris_import_recovery');
    if (!raw) return;
    const critical = JSON.parse(raw);
    // Check if hours store is empty — if so, a previous import crashed
    const hours = await getAll('hours').catch(() => []);
    if (hours.length === 0 && critical.hours?.length > 0) {
      for (const record of critical.hours) await put('hours', record);
      for (const record of (critical.logbook || [])) await put('logbook', record);
      showToast('Uren hersteld na mislukte import', { type: 'warning', duration: 8000 });
    }
    localStorage.removeItem('boris_import_recovery');
  } catch { /* non-critical */ }
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
  applyDefaultPresetForMode(modeManager.getMode());

  const blockRegistry = createBlockRegistry();
  registerDefaultBlocks(blockRegistry);

  createOSShell(app, { eventBus, modeManager, blockRegistry });
  initClickSound(eventBus, modeManager);

  // Initialize cloud sync (non-blocking — resumes if previously configured)
  cloudSync.init(eventBus).catch(() => { /* non-critical */ });
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
