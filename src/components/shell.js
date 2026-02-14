import { modules } from '../main.js';
import { icon } from '../icons.js';
import { getSetting, setSetting } from '../db.js';

// Only show these modules in bottom nav (mobile) — max 5
const bottomNavIds = ['dashboard', 'planning', 'hours', 'logbook', 'export'];
// Sidebar shows all modules, grouped
const sidebarMainIds = ['dashboard', 'planning', 'hours', 'logbook', 'goals', 'competencies', 'quality', 'assignments', 'report'];
const sidebarSecondaryIds = ['export', 'settings'];

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
            ${icon(m.icon)} ${m.label}
          </a>
        `).join('')}
      </div>
      <div style="flex:1"></div>
      <div class="app-nav-secondary">
        ${sidebarSecondaryItems.map(m => `
          <a href="#${m.route}" class="nav-link" data-route="${m.route}">
            ${icon(m.icon)} ${m.label}
          </a>
        `).join('')}
      </div>
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
