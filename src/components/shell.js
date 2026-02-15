import { modules } from '../main.js';
import { icon } from '../icons.js';
import { getSetting, setSetting } from '../db.js';

// Only show these modules in bottom nav (mobile) — max 5
const bottomNavIds = ['dashboard', 'planning', 'hours', 'logbook', 'notebook'];
// Sidebar shows all modules, grouped
const sidebarMainIds = ['dashboard', 'planning', 'hours', 'logbook', 'notebook', 'goals', 'competencies', 'quality', 'learning-moments', 'process-map', 'reference', 'assignments', 'report'];
const sidebarSecondaryIds = ['vault', 'export', 'settings'];

// Color dots for sidebar nav items
const navColors = {
  dashboard: '#4f6ef7',
  planning: '#8b5cf6',
  hours: '#10b981',
  logbook: '#f59e0b',
  notebook: '#ec4899',
  goals: '#f43f5e',
  competencies: '#06b6d4',
  quality: '#6366f1',
  'learning-moments': '#f43f5e',
  'process-map': '#10b981',
  reference: '#06b6d4',
  assignments: '#f97316',
  report: '#14b8a6',
  vault: '#6366f1',
  export: '#9094ad',
  settings: '#9094ad',
};

export function createShell(container) {
  const bottomNavItems = modules.filter(m => bottomNavIds.includes(m.id));
  const sidebarMainItems = modules.filter(m => sidebarMainIds.includes(m.id));
  const sidebarSecondaryItems = modules.filter(m => sidebarSecondaryIds.includes(m.id));

  container.innerHTML = `
    <nav class="app-nav" aria-label="Hoofdnavigatie">
      <div class="app-nav-brand">BPV Tracker</div>
      <div class="app-nav-main">
        ${sidebarMainItems.map(m => `
          <a href="#${m.route}" class="nav-link" data-route="${m.route}">
            <span class="nav-icon-dot" style="background:${navColors[m.id] || '#9094ad'}"></span>
            ${icon(m.icon)} ${m.label}
          </a>
        `).join('')}
      </div>
      <div class="app-nav-divider"></div>
      <div class="app-nav-secondary">
        ${sidebarSecondaryItems.map(m => `
          <a href="#${m.route}" class="nav-link" data-route="${m.route}">
            ${icon(m.icon)} ${m.label}
          </a>
        `).join('')}
      </div>
      <div style="flex:1"></div>
    </nav>
    <div class="app-shell">
      <header class="app-header">
        <h1>BPV Tracker</h1>
        <div class="app-header-actions">
          <button class="btn btn-icon theme-toggle" title="Thema wisselen" aria-label="Thema wisselen">
            ${icon('moon')}
          </button>
        </div>
      </header>
      <main class="app-main" id="main-content">
      </main>
      <nav class="bottom-nav" aria-label="Navigatie">
        ${bottomNavItems.map(m => `
          <a href="#${m.route}" class="nav-link" data-route="${m.route}">
            ${icon(m.icon)}
            <span>${m.label}</span>
          </a>
        `).join('')}
      </nav>
    </div>
  `;

  // Theme toggle
  const themeBtn = container.querySelector('.theme-toggle');
  themeBtn.addEventListener('click', async () => {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    themeBtn.innerHTML = icon(next === 'dark' ? 'sun' : 'moon');
    await setSetting('theme', next);
  });

  // Set initial theme icon
  (async () => {
    const theme = await getSetting('theme');
    if (theme === 'dark') {
      themeBtn.innerHTML = icon('sun');
    }
  })();
}
