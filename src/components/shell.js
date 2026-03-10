import { modules } from '../main.js';
import { icon } from '../icons.js';
import { getSetting, setSetting } from '../db.js';
import { ACCENT_COLORS, applyAccentColor } from '../constants.js';
import { getNavBlocks, getBottomNavBlocks } from '../core/blockRegistry.js';
import { getCurrentMode, setMode, getModes, getModeLabel } from '../core/modeManager.js';
import { on } from '../core/eventBus.js';
import { navigate } from '../router.js';

export function createShell(container) {
  const mode = getCurrentMode();

  function renderNav() {
    const currentMode = getCurrentMode();
    const mainBlocks = getNavBlocks(currentMode, 'main');
    const secondaryBlocks = getNavBlocks(currentMode, 'secondary');
    const bottomBlocks = getBottomNavBlocks(currentMode);

    // Update sidebar nav
    const mainNav = container.querySelector('.app-nav-main');
    const secondaryNav = container.querySelector('.app-nav-secondary');
    const bottomNav = container.querySelector('.bottom-nav');

    if (mainNav) {
      mainNav.innerHTML = mainBlocks.map(b => `
        <a href="#${b.route}" class="nav-link" data-route="${b.route}">
          <span class="nav-icon">${icon(b.icon)}</span>
          ${b.label}
        </a>
      `).join('');

      // Re-bind click handlers for mobile close
      mainNav.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
          if (window.innerWidth < 768) {
            container.querySelector('.app-nav')?.classList.remove('mobile-open');
            container.querySelector('.sidebar-overlay')?.classList.remove('active');
          }
        });
      });
    }

    if (secondaryNav) {
      secondaryNav.innerHTML = secondaryBlocks.map(b => `
        <a href="#${b.route}" class="nav-link" data-route="${b.route}">
          <span class="nav-icon">${icon(b.icon)}</span>
          ${b.label}
        </a>
      `).join('');

      secondaryNav.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
          if (window.innerWidth < 768) {
            container.querySelector('.app-nav')?.classList.remove('mobile-open');
            container.querySelector('.sidebar-overlay')?.classList.remove('active');
          }
        });
      });
    }

    if (bottomNav) {
      bottomNav.innerHTML = bottomBlocks.map(b => `
        <a href="#${b.route}" class="nav-link" data-route="${b.route}">
          <span class="nav-icon">${icon(b.icon)}</span>
          <span>${b.label}</span>
        </a>
      `).join('');
    }

    // Update mode switcher active state
    container.querySelectorAll('.mode-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.mode === currentMode);
    });

    // Update brand text
    const brandText = container.querySelector('.app-nav-brand-text');
    if (brandText) {
      const modeLabels = { bpv: 'BPV', school: 'School', personal: 'Persoonlijk' };
      brandText.textContent = `BORIS OS`;
    }
  }

  // Build initial shell HTML
  const modes = getModes();

  container.innerHTML = `
    <div class="sidebar-overlay"></div>
    <nav class="app-nav" aria-label="Hoofdnavigatie">
      <div class="app-nav-brand">
        <div class="app-nav-brand-icon">B</div>
        <span class="app-nav-brand-text">BORIS OS</span>
      </div>
      <div class="mode-switcher">
        ${modes.map(m => `
          <button class="mode-btn ${m === mode ? 'active' : ''}" data-mode="${m}">
            ${getModeLabel(m)}
          </button>
        `).join('')}
      </div>
      <div class="app-nav-section-label">Modules</div>
      <div class="app-nav-main"></div>
      <div class="app-nav-divider"></div>
      <div class="app-nav-section-label">Systeem</div>
      <div class="app-nav-secondary"></div>
      <div style="flex:1"></div>
      <div class="app-nav-footer">
        <span class="app-version">v3.0.0</span>
      </div>
    </nav>
    <div class="app-shell">
      <header class="app-header">
        <div class="app-header-left">
          <button class="sidebar-toggle" title="Menu" aria-label="Menu">
            ${icon('menu')}
          </button>
          <span id="header-title">Vandaag</span>
        </div>
        <div class="app-header-center">
          <div class="mode-switcher-header">
            ${modes.map(m => `
              <button class="mode-btn-header ${m === mode ? 'active' : ''}" data-mode="${m}">
                ${getModeLabel(m)}
              </button>
            `).join('')}
          </div>
        </div>
        <div class="app-header-actions">
          <button class="sidebar-toggle hamburger-btn" title="Opties" aria-label="Opties">
            ${icon('settings')}
          </button>
          <div class="hamburger-menu" id="hamburger-menu">
            <div class="hamburger-menu-label">Thema</div>
            <div class="theme-switcher" id="theme-switcher">
              <button class="theme-option" data-theme="light">${icon('sun')} Licht</button>
              <button class="theme-option" data-theme="system">${icon('monitor')} Auto</button>
              <button class="theme-option" data-theme="dark">${icon('moon')} Donker</button>
            </div>
            <div class="hamburger-menu-divider"></div>
            <div class="hamburger-menu-label">Accentkleur</div>
            <div class="accent-picker" id="accent-picker">
              ${ACCENT_COLORS.map(c => `
                <div class="accent-dot" data-color="${c.id}" data-hex="${c.hex}" title="${c.label}" style="background:${c.hex}"></div>
              `).join('')}
            </div>
            <div class="hamburger-menu-divider"></div>
            <button class="hamburger-menu-item" data-action="compact">
              Compacte modus
              <span class="toggle compact-toggle" id="compact-toggle"></span>
            </button>
            <div class="hamburger-menu-divider"></div>
            <a href="#sync" class="hamburger-menu-item" data-action="nav">
              ${icon('upload')} Sync
            </a>
            <a href="#settings" class="hamburger-menu-item" data-action="nav">
              ${icon('settings')} Instellingen
            </a>
          </div>
        </div>
      </header>
      <main class="app-main" id="main-content"></main>
      <nav class="bottom-nav" aria-label="Navigatie"></nav>
    </div>
  `;

  // Render nav for current mode
  renderNav();

  const nav = container.querySelector('.app-nav');
  const shell = container.querySelector('.app-shell');
  const overlay = container.querySelector('.sidebar-overlay');
  const sidebarBtn = container.querySelector('.sidebar-toggle');
  const hamburgerBtn = container.querySelector('.hamburger-btn');
  const hamburgerMenu = container.querySelector('#hamburger-menu');
  const isMobile = () => window.innerWidth < 768;

  // Sidebar toggle
  sidebarBtn.addEventListener('click', () => {
    if (isMobile()) {
      nav.classList.toggle('mobile-open');
      overlay.classList.toggle('active');
    } else {
      nav.classList.toggle('collapsed');
      shell.classList.toggle('sidebar-collapsed');
    }
  });

  overlay.addEventListener('click', () => {
    nav.classList.remove('mobile-open');
    overlay.classList.remove('active');
  });

  // Mode switcher (sidebar + header)
  function handleModeSwitch(e) {
    const newMode = e.target.dataset.mode;
    if (!newMode) return;
    setMode(newMode);
  }

  container.querySelectorAll('.mode-btn, .mode-btn-header').forEach(btn => {
    btn.addEventListener('click', handleModeSwitch);
  });

  // Listen for mode changes
  on('mode:changed', ({ mode: newMode }) => {
    document.documentElement.setAttribute('data-mode', newMode);
    renderNav();

    // Update header mode buttons
    container.querySelectorAll('.mode-btn-header').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.mode === newMode);
    });

    // Navigate to home for the new mode
    navigate('');
  });

  // Hamburger menu toggle
  hamburgerBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    hamburgerMenu.classList.toggle('open');
  });

  document.addEventListener('click', (e) => {
    if (!hamburgerMenu.contains(e.target) && !hamburgerBtn.contains(e.target)) {
      hamburgerMenu.classList.remove('open');
    }
  });

  hamburgerMenu.querySelectorAll('[data-action="nav"]').forEach(link => {
    link.addEventListener('click', () => hamburgerMenu.classList.remove('open'));
  });

  // Theme switcher
  const themeSwitcher = container.querySelector('#theme-switcher');
  async function setActiveTheme(theme) {
    themeSwitcher.querySelectorAll('.theme-option').forEach(opt => {
      opt.classList.toggle('active', opt.dataset.theme === theme);
    });
    await setSetting('theme', theme);
    if (theme === 'system') {
      document.documentElement.removeAttribute('data-theme');
    } else {
      document.documentElement.setAttribute('data-theme', theme);
    }
  }

  themeSwitcher.querySelectorAll('.theme-option').forEach(opt => {
    opt.addEventListener('click', () => setActiveTheme(opt.dataset.theme));
  });

  // Accent picker
  const accentPicker = container.querySelector('#accent-picker');
  async function setActiveAccent(colorId, hex) {
    accentPicker.querySelectorAll('.accent-dot').forEach(d => {
      d.classList.toggle('active', d.dataset.color === colorId);
    });
    applyAccentColor(hex);
    await setSetting('accentColor', colorId);
  }

  accentPicker.querySelectorAll('.accent-dot').forEach(dot => {
    dot.addEventListener('click', () => setActiveAccent(dot.dataset.color, dot.dataset.hex));
  });

  // Compact mode toggle
  const compactToggle = container.querySelector('#compact-toggle');
  container.querySelector('[data-action="compact"]').addEventListener('click', async () => {
    const isCompact = document.documentElement.getAttribute('data-compact') === 'true';
    const next = !isCompact;
    document.documentElement.setAttribute('data-compact', String(next));
    compactToggle.classList.toggle('active', next);
    await setSetting('compact', next);
  });

  // Load saved settings
  (async () => {
    const theme = await getSetting('theme') || 'system';
    setActiveTheme(theme);

    const accentId = await getSetting('accentColor');
    if (accentId) {
      const color = ACCENT_COLORS.find(c => c.id === accentId);
      if (color) setActiveAccent(color.id, color.hex);
    } else {
      accentPicker.querySelector('[data-color="blue"]')?.classList.add('active');
    }

    const compact = await getSetting('compact');
    if (compact) {
      document.documentElement.setAttribute('data-compact', 'true');
      compactToggle.classList.add('active');
    }
  })();
}
