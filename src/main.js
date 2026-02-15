import './styles/reset.css';
import './styles/variables.css';
import './styles/base.css';
import './styles/components.css';
import './styles/pages.css';
import './styles/print.css';

import { initDB } from './db.js';
import { createRouter } from './router.js';
import { createShell } from './components/shell.js';
import { initShortcuts } from './shortcuts.js';
import { getSetting } from './db.js';

// Module registry — nav builds from this
export const modules = [
  { id: 'dashboard',        label: 'Dashboard',         icon: 'dashboard',        route: '',                page: () => import('./pages/dashboard.js') },
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
  { id: 'vault',            label: 'Vault',             icon: 'lock',             route: 'vault',            page: () => import('./pages/vault.js') },
  { id: 'export',           label: 'Export',             icon: 'download',         route: 'export',           page: () => import('./pages/export.js') },
  { id: 'settings',         label: 'Instellingen',      icon: 'settings',         route: 'settings',         page: () => import('./pages/settings.js') },
];

async function init() {
  // Init IndexedDB
  await initDB();

  // Apply saved theme
  const theme = await getSetting('theme');
  if (theme && theme !== 'system') {
    document.documentElement.setAttribute('data-theme', theme);
  }

  // Create app shell
  const app = document.getElementById('app');
  createShell(app);

  // Init router
  createRouter();

  // Init keyboard shortcuts
  initShortcuts();

  // Register service worker
  if ('serviceWorker' in navigator) {
    try {
      await navigator.serviceWorker.register(import.meta.env.BASE_URL + 'sw.js');
    } catch (e) {
      // SW registration failed — app still works
    }
  }
}

init();
