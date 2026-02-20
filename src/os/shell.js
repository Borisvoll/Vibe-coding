import { getSetting, setSetting } from '../db.js';
import { renderSettingsBlock } from '../blocks/settings-panel.js';
import { formatDateShort, formatDateLong, getToday, getISOWeek } from '../utils.js';
import { isFriday, isReviewSent } from '../stores/weekly-review.js';
import { startTutorial } from '../core/tutorial.js';
import { ACCENT_COLORS, WEEKDAY_FULL } from '../constants.js';
import { setTheme } from '../core/themeEngine.js';
import { createCollapsibleSection } from '../ui/collapsible-section.js';
import { createCommandPalette } from '../ui/command-palette.js';
import { parseHash, updateHash, scrollToFocus } from './deepLinks.js';

const SHELL_TABS = ['dashboard', 'today', 'inbox', 'lijsten', 'planning', 'settings'];

// Mode order: School & Personal first, BPV secondary (Rams: match user's primary context)
const MODE_META = {
  School: {
    label: 'School',
    description: 'Opleiding & studie',
    color: 'var(--color-purple)',
    colorLight: 'var(--color-purple-light)',
    emoji: '📚',
  },
  Personal: {
    label: 'Persoonlijk',
    description: 'Persoonlijke groei & leven',
    color: 'var(--color-emerald)',
    colorLight: 'var(--color-emerald-light)',
    emoji: '🌱',
  },
  BPV: {
    label: 'BPV',
    description: 'Beroepspraktijkvorming',
    color: 'var(--color-blue)',
    colorLight: 'var(--color-blue-light)',
    emoji: '🏢',
  },
};

export { MODE_META };

export function createOSShell(app, { eventBus, modeManager, blockRegistry }) {
  let activeTab = 'today';
  let mountedBlocks = [];

  const todayLabel = formatDateShort(getToday());

  app.innerHTML = `
    <div id="new-os-shell" class="os-shell">
      <!-- Ambient wash layer for mode transitions -->
      <div class="os-mode-wash" aria-hidden="true"></div>

      <div id="mode-picker" class="mode-picker" role="dialog" aria-label="Kies een modus" aria-modal="true" hidden>
        <div class="mode-picker__backdrop"></div>
        <div class="mode-picker__panel">
          <p class="mode-picker__eyebrow">Jouw context</p>
          <h2 class="mode-picker__title">Welke modus?</h2>
          <div class="mode-picker__cards">
            ${Object.entries(MODE_META).map(([key, m]) => `
              <button type="button" class="mode-card" data-mode="${key}"
                style="--mode-color:${m.color};--mode-color-light:${m.colorLight}">
                <span class="mode-card__emoji">${m.emoji}</span>
                <span class="mode-card__label">${m.label}</span>
                <span class="mode-card__desc">${m.description}</span>
                <span class="mode-card__check" aria-hidden="true">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M3 8L6.5 11.5L13 4.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                </span>
              </button>
            `).join('')}
          </div>
        </div>
      </div>

      <!-- Desktop sidebar (hidden on mobile via CSS) -->
      <aside class="os-sidebar" aria-label="Navigatie">
        <div class="os-sidebar__brand">
          <h1 class="os-sidebar__title">BORIS</h1>
          <span class="os-sidebar__date">${todayLabel}</span>
        </div>

        <div class="os-sidebar__section-label">Modules</div>
        <nav class="os-sidebar__nav">
          <button class="os-sidebar__item" type="button" data-os-tab="dashboard">
            <svg class="os-sidebar__icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
            <span class="os-sidebar__label">Dashboard</span>
          </button>
          <button class="os-sidebar__item" type="button" data-os-tab="today">
            <svg class="os-sidebar__icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
            <span class="os-sidebar__label">Vandaag</span>
          </button>
          <button class="os-sidebar__item" type="button" data-os-tab="inbox">
            <svg class="os-sidebar__icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>
            <span class="os-sidebar__label">Inbox</span>
            <span class="os-sidebar__badge" id="sidebar-inbox-badge" hidden>0</span>
          </button>
          <button class="os-sidebar__item" type="button" data-os-tab="lijsten">
            <svg class="os-sidebar__icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
            <span class="os-sidebar__label">Lijsten</span>
          </button>
          <button class="os-sidebar__item" type="button" data-os-tab="planning">
            <svg class="os-sidebar__icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            <span class="os-sidebar__label">Planning</span>
          </button>
        </nav>

        <div class="os-sidebar__divider"></div>

        <div class="os-sidebar__section-label">Systeem</div>
        <nav class="os-sidebar__system">
          <button class="os-sidebar__item" type="button" data-os-tab="settings">
            <svg class="os-sidebar__icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
            <span class="os-sidebar__label">Instellingen</span>
          </button>
          <button id="legacy-switch-btn" type="button" class="os-sidebar__item os-sidebar__item--muted">
            <svg class="os-sidebar__icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>
            <span class="os-sidebar__label">Legacy</span>
          </button>
        </nav>

        <div class="os-sidebar__mode">
          <button id="mode-btn" type="button" class="os-mode-btn" aria-label="Verander modus" aria-haspopup="dialog">
            <span class="os-mode-btn__dot"></span>
            <span class="os-mode-btn__label"></span>
            <svg class="os-mode-btn__chevron" width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
              <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
        </div>
      </aside>

      <!-- Desktop top bar (hidden on mobile via CSS) -->
      <header class="os-shell__topbar">
        <div class="os-shell__topbar-inner">
          <button id="sidebar-toggle-btn" type="button" class="os-topbar__hamburger" aria-label="Menu" data-tooltip="Menu" data-tooltip-pos="bottom">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>
          <span class="os-topbar__spacer"></span>
          <div class="os-topbar__gear-wrap">
            <button id="topbar-settings-btn" type="button" class="os-topbar__gear" aria-label="Instellingen" aria-haspopup="true" data-tooltip="Instellingen" data-tooltip-pos="bottom">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="3"/>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
              </svg>
            </button>
            <div class="os-topbar__menu" id="topbar-menu">
              <div class="os-topbar__menu-label">Thema</div>
              <div class="os-topbar__theme-switcher" id="os-theme-switcher">
                <button class="os-topbar__theme-option" data-theme="light">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
                  Licht
                </button>
                <button class="os-topbar__theme-option" data-theme="system">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
                  Auto
                </button>
                <button class="os-topbar__theme-option" data-theme="dark">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
                  Donker
                </button>
              </div>
              <div class="os-topbar__menu-divider"></div>
              <div class="os-topbar__menu-label">Accentkleur</div>
              <div class="os-topbar__accent-picker" id="os-accent-picker">
                ${ACCENT_COLORS.map(c => `
                  <div class="os-topbar__accent-dot" data-color="${c.id}" data-hex="${c.hex}" data-tooltip="${c.label}" style="background:${c.hex}"></div>
                `).join('')}
              </div>
              <div class="os-topbar__menu-divider"></div>
              <button class="os-topbar__menu-item" data-action="settings">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                Alle instellingen
              </button>
            </div>
          </div>
        </div>
      </header>

      <!-- Mobile top bar (hidden on desktop via CSS) -->
      <header class="os-shell__header os-shell__header--mobile">
        <div class="os-shell__header-inner">
          <div class="os-shell__header-left">
            <h1 class="os-shell__title">BORIS</h1>
            <span class="os-shell__date">${todayLabel}</span>
          </div>
          <div class="os-shell__header-actions">
            <button id="mobile-mode-btn" type="button" class="os-mode-btn" aria-label="Verander modus" aria-haspopup="dialog">
              <span class="os-mode-btn__dot"></span>
              <span class="os-mode-btn__label"></span>
              <svg class="os-mode-btn__chevron" width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>
          </div>
        </div>
      </header>

      <!-- Mobile horizontal nav (hidden on desktop via CSS) -->
      <nav id="os-nav" class="os-nav os-nav--mobile" aria-label="BORIS navigatie">
        <div class="os-nav__inner">
          <button class="os-nav__button" type="button" data-os-tab="dashboard">Dashboard</button>
          <button class="os-nav__button" type="button" data-os-tab="today">Vandaag</button>
          <button class="os-nav__button" type="button" data-os-tab="inbox">
            Inbox <span class="os-nav__badge" id="inbox-badge" hidden>0</span>
          </button>
          <button class="os-nav__button" type="button" data-os-tab="lijsten">Lijsten</button>
          <button class="os-nav__button" type="button" data-os-tab="planning">Planning</button>
          <button class="os-nav__button" type="button" data-os-tab="settings">Instellingen</button>
        </div>
      </nav>

      <main id="new-os-content" class="os-shell__content">
        <section class="os-section" data-os-section="dashboard" hidden>
          <h2 class="os-section__title">Dashboard</h2>
          <div class="os-host-grid" data-os-host="dashboard-cards"></div>
        </section>
        <section class="os-section" data-os-section="today">
          <button type="button" class="os-section__home-link" hidden>← Dashboard</button>
          <div class="vandaag-header" data-vandaag-header></div>
          <div class="vandaag-search" data-vandaag-search></div>
          <!-- Level 1 — Focus (Today) -->
          <div class="vandaag-level vandaag-level--focus" data-vandaag-level="1">
            <div class="os-host-stack" data-os-host="vandaag-hero"></div>
            <div class="os-host-stack" data-os-host="vandaag-cockpit"></div>
            <div data-vandaag-zone="tasks"></div>
          </div>
          <hr class="vandaag-level-divider" aria-hidden="true">
          <!-- Level 2 — Projects & Lists -->
          <div class="vandaag-level vandaag-level--projects" data-vandaag-level="2">
            <div data-vandaag-zone="projects"></div>
            <div data-vandaag-zone="capture"></div>
          </div>
          <hr class="vandaag-level-divider" aria-hidden="true">
          <!-- Level 3 — Context & Review -->
          <div class="vandaag-level vandaag-level--review" data-vandaag-level="3">
            <div data-vandaag-zone="reflection"></div>
            <div data-vandaag-zone="mode"></div>
            <div data-vandaag-zone="weekly"></div>
          </div>
        </section>
        <section class="os-section" data-os-section="inbox" hidden>
          <button type="button" class="os-section__home-link" hidden>← Dashboard</button>
          <div class="os-host-stack" data-os-host="inbox-screen"></div>
        </section>
        <section class="os-section" data-os-section="lijsten" hidden>
          <button type="button" class="os-section__home-link" hidden>← Dashboard</button>
          <h2 class="os-section__title">Lijsten</h2>
          <div class="os-host-stack" data-os-host="lijsten-screen"></div>
        </section>
        <section class="os-section" data-os-section="planning" hidden>
          <button type="button" class="os-section__home-link" hidden>← Dashboard</button>
          <h2 class="os-section__title">Planning</h2>
          <p class="os-host-empty">Planningmodules volgen in een volgende iteratie.</p>
        </section>
        <section class="os-section" data-os-section="settings" hidden>
          <button type="button" class="os-section__home-link" hidden>← Dashboard</button>
          <h2 class="os-section__title">Instellingen</h2>
          <div id="new-os-settings-block"></div>
        </section>
      </main>
    </div>
  `;

  function setActiveTab(tab, opts) {
    activeTab = SHELL_TABS.includes(tab) ? tab : 'today';
    app.querySelectorAll('[data-os-section]').forEach((section) => {
      const name = section.getAttribute('data-os-section');
      section.hidden = name !== activeTab;
    });
    // Update all nav buttons (both sidebar and mobile nav)
    app.querySelectorAll('[data-os-tab]').forEach((button) => {
      const isActive = button.getAttribute('data-os-tab') === activeTab;
      button.setAttribute('aria-pressed', String(isActive));
      button.classList.toggle('os-sidebar__item--active', isActive);
    });
    // Update dashboard breadcrumb visibility
    app.querySelectorAll('.os-section__home-link').forEach((link) => {
      link.hidden = activeTab === 'dashboard';
    });
    // Deep link: update URL hash (skip during initial load if hash already set)
    const focus = opts?.focus || null;
    updateHash(activeTab, focus);
    // Scroll to focus target if specified
    if (focus) {
      scrollToFocus(app.querySelector('#new-os-shell'), focus);
    }
  }

  function ensureHostEmptyStates() {
    app.querySelectorAll('[data-os-host]').forEach((host) => {
      if (host.children.length === 0) {
        host.innerHTML = '<p class="os-host-empty">Nog geen actieve blokken voor deze weergave.</p>';
      }
    });
  }

  function unmountAll() {
    mountedBlocks.forEach((entry) => { entry.instance?.unmount?.(); });
    mountedBlocks = [];
    app.querySelectorAll('[data-os-host]').forEach((host) => { host.innerHTML = ''; });
  }

  function renderHosts() {
    unmountAll();
    const mode = modeManager.getMode();
    const context = { mode, eventBus, modeManager };
    const eligibleBlocks = blockRegistry.getEnabled().filter((block) => {
      if (!Array.isArray(block.modes) || block.modes.length === 0) return true;
      return block.modes.includes(mode);
    });

    const sorted = [...eligibleBlocks].sort((a, b) => (a.order ?? 999) - (b.order ?? 999));

    // Track stagger per host for sequential entrance animation
    const hostStagger = {};
    sorted.forEach((block) => {
      const hosts = Array.isArray(block.hosts) ? block.hosts : [];
      hosts.forEach((hostName) => {
        const hostEl = app.querySelector(`[data-os-host="${hostName}"]`);
        if (!hostEl || typeof block.mount !== 'function') return;
        try {
          const instance = block.mount(hostEl, context) || null;
          mountedBlocks.push({ blockId: block.id, hostName, instance });

          // Assign stagger delay for block entrance animation
          if (!hostStagger[hostName]) hostStagger[hostName] = 0;
          const lastChild = hostEl.lastElementChild;
          if (lastChild) {
            lastChild.style.setProperty('--stagger', `${hostStagger[hostName]}ms`);
          }
          hostStagger[hostName] += 30;
        } catch (err) {
          console.error(`Block "${block.id}" failed to mount:`, err);
        }
      });
    });

    ensureHostEmptyStates();
  }

  // ── Ambient mode wash (Eno-inspired transition) ──────────────
  function triggerModeWash(mode) {
    const wash = app.querySelector('.os-mode-wash');
    if (!wash) return;
    const meta = MODE_META[mode] || MODE_META.BPV;
    wash.style.setProperty('--wash-color', meta.color);
    wash.classList.remove('os-mode-wash--active');
    // Force reflow to restart the animation
    void wash.offsetWidth;
    wash.classList.add('os-mode-wash--active');
    wash.addEventListener('animationend', () => {
      wash.classList.remove('os-mode-wash--active');
    }, { once: true });
  }

  function updateModeBtn() {
    const mode = modeManager.getMode();
    const meta = MODE_META[mode] || MODE_META.BPV;

    // Update all mode buttons (sidebar + mobile)
    app.querySelectorAll('#mode-btn, #mobile-mode-btn').forEach((btn) => {
      const dot = btn.querySelector('.os-mode-btn__dot');
      const label = btn.querySelector('.os-mode-btn__label');
      if (dot) dot.style.background = meta.color;
      if (label) label.textContent = meta.label;
      btn.style.setProperty('--mode-color', meta.color);
      btn.style.setProperty('--mode-color-light', meta.colorLight);
    });

    // Update active card in picker
    app.querySelectorAll('.mode-card').forEach((card) => {
      card.classList.toggle('mode-card--active', card.getAttribute('data-mode') === mode);
    });
  }

  // Set data-mode on shell root for mode-aware CSS accents
  function setShellMode(mode) {
    const shell = app.querySelector('#new-os-shell');
    if (shell) shell.setAttribute('data-mode', mode);
  }

  // ── Vandaag page layout with collapsible zones (Notion-style) ──

  const VANDAAG_SECTIONS = [
    { zone: 'tasks',      id: 'vandaag-tasks',      title: 'Taken',                hostName: 'vandaag-tasks' },
    { zone: 'projects',   id: 'vandaag-projects',   title: 'Projecten & Lijsten',  hostName: 'vandaag-projects' },
    { zone: 'capture',    id: 'vandaag-capture',     title: 'Inbox',                hostName: 'vandaag-capture' },
    { zone: 'reflection', id: 'vandaag-reflection',  title: 'Reflectie',            hostName: 'vandaag-reflection' },
    { zone: 'mode',       id: 'vandaag-mode',        title: 'Context',              hostName: 'vandaag-mode' },
    { zone: 'weekly',     id: 'vandaag-weekly',      title: 'Weekoverzicht',        hostName: 'vandaag-weekly' },
  ];

  const COLLAPSE_DEFAULTS = {
    School:   { tasks: true, projects: true, capture: true, reflection: false, mode: false, weekly: false },
    Personal: { tasks: true, projects: true, capture: true, reflection: true,  mode: false, weekly: false },
    BPV:      { tasks: true, projects: true, capture: true, reflection: false, mode: true,  weekly: false },
  };

  const vandaagSections = {};

  function buildVandaagLayout(mode) {
    const defaults = COLLAPSE_DEFAULTS[mode] || COLLAPSE_DEFAULTS.School;

    VANDAAG_SECTIONS.forEach((cfg) => {
      const zoneEl = app.querySelector(`[data-vandaag-zone="${cfg.zone}"]`);
      if (!zoneEl) return;
      const section = createCollapsibleSection({
        id: cfg.id,
        title: cfg.title,
        hostName: cfg.hostName,
        defaultOpen: defaults[cfg.zone] ?? true,
        mode,
      });
      zoneEl.appendChild(section.el);
      vandaagSections[cfg.zone] = section;
    });
  }

  function updateVandaagCollapse(mode) {
    const defaults = COLLAPSE_DEFAULTS[mode] || COLLAPSE_DEFAULTS.School;
    Object.entries(vandaagSections).forEach(([zone, section]) => {
      section?.setMode(mode, defaults[zone] ?? true);
    });
  }

  function renderVandaagHeader(mode) {
    const headerEl = app.querySelector('[data-vandaag-header]');
    if (!headerEl) return;
    const meta = MODE_META[mode] || MODE_META.School;
    const today = getToday();
    const d = new Date(today + 'T00:00:00');
    const dayIdx = (d.getDay() + 6) % 7; // 0=Mon
    const dayName = WEEKDAY_FULL[dayIdx] || '';
    const dateLong = formatDateLong(today);
    const weekStr = getISOWeek(today);
    const weekNum = weekStr.split('-W')[1]?.replace(/^0/, '') || '';

    const badge = `<span class="os-section__mode-badge" style="--badge-color:${meta.color};--badge-color-light:${meta.colorLight}">${meta.emoji} ${meta.label}</span>`;
    headerEl.innerHTML = `
      <div class="vandaag-header__top">
        <h2 class="vandaag-header__title">Vandaag</h2>
        ${badge}
      </div>
      <span class="vandaag-header__date">${dayName} ${dateLong} · week ${weekNum}</span>
    `;
  }

  // ── Search bar (uses globalSearch from stores/search.js) ────
  function initSearchBar() {
    const searchEl = app.querySelector('[data-vandaag-search]');
    if (!searchEl) return;
    searchEl.innerHTML = `
      <div class="vandaag-search__wrap">
        <svg class="vandaag-search__icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input type="search" class="vandaag-search__input" placeholder="Zoek in taken, projecten, inbox..." />
      </div>
      <div class="vandaag-search__results" hidden></div>
    `;
    const input = searchEl.querySelector('.vandaag-search__input');
    const results = searchEl.querySelector('.vandaag-search__results');
    let debounceTimer = null;

    input.addEventListener('input', () => {
      clearTimeout(debounceTimer);
      const q = input.value.trim();
      if (q.length < 2) { results.hidden = true; results.innerHTML = ''; return; }
      debounceTimer = setTimeout(async () => {
        try {
          const { globalSearch } = await import('../stores/search.js');
          const hits = await globalSearch(q);
          if (hits.length === 0) {
            results.innerHTML = '<p class="vandaag-search__empty">Geen resultaten</p>';
          } else {
            const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
            results.innerHTML = hits.slice(0, 8).map(h => {
              const title = esc(h.title || '');
              const type = esc(h.type || '');
              return `<div class="vandaag-search__hit"><span class="vandaag-search__hit-store">${type}</span><span class="vandaag-search__hit-text">${title}</span></div>`;
            }).join('');
          }
          results.hidden = false;
        } catch { results.hidden = true; }
      }, 300);
    });

    input.addEventListener('blur', () => {
      setTimeout(() => { results.hidden = true; }, 200);
    });

    input.addEventListener('focus', () => {
      if (input.value.trim().length >= 2 && results.innerHTML) results.hidden = false;
    });
  }

  // Update section titles with mode label so mode change is unmissable
  function updateSectionTitles(mode) {
    const meta = MODE_META[mode] || MODE_META.School;
    const badge = `<span class="os-section__mode-badge" style="--badge-color:${meta.color};--badge-color-light:${meta.colorLight}">${meta.emoji} ${meta.label}</span>`;
    const titleMap = {
      dashboard: `Dashboard ${badge}`,
      planning: `Planning ${badge}`,
    };
    Object.entries(titleMap).forEach(([section, html]) => {
      const el = app.querySelector(`[data-os-section="${section}"] .os-section__title`);
      if (el) el.innerHTML = html;
    });
  }

  // Mode hero banner — large colored bar at top of visible sections
  function updateModeHero(mode) {
    const meta = MODE_META[mode] || MODE_META.School;
    const heroHTML = `
      <div class="os-mode-hero">
        <span class="os-mode-hero__emoji">${meta.emoji}</span>
        <div class="os-mode-hero__text">
          <span class="os-mode-hero__label">${meta.label}</span>
          <span class="os-mode-hero__desc">${meta.description}</span>
        </div>
      </div>`;

    // Insert or replace hero in dashboard section
    ['dashboard'].forEach((section) => {
      const sectionEl = app.querySelector(`[data-os-section="${section}"]`);
      if (!sectionEl) return;
      const existing = sectionEl.querySelector('.os-mode-hero');
      if (existing) {
        existing.outerHTML = heroHTML;
      } else {
        const title = sectionEl.querySelector('.os-section__title');
        if (title) {
          title.insertAdjacentHTML('afterend', heroHTML);
        }
      }
    });
  }

  let focusTrapCleanup = null;

  function showModePicker() {
    const picker = app.querySelector('#mode-picker');
    if (!picker) return;
    picker.hidden = false;
    requestAnimationFrame(() => picker.classList.add('mode-picker--visible'));
    setTimeout(() => {
      const active = picker.querySelector('.mode-card--active') || picker.querySelector('.mode-card');
      active?.focus();
    }, 50);

    // Focus trap: keep Tab cycling within the picker
    const cards = picker.querySelectorAll('.mode-card');
    if (cards.length > 0) {
      const first = cards[0];
      const last = cards[cards.length - 1];
      function trapFocus(e) {
        if (e.key !== 'Tab') return;
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
      picker.addEventListener('keydown', trapFocus);
      focusTrapCleanup = () => picker.removeEventListener('keydown', trapFocus);
    }
  }

  function hideModePicker() {
    const picker = app.querySelector('#mode-picker');
    if (!picker || picker.hidden) return;
    focusTrapCleanup?.();
    focusTrapCleanup = null;
    picker.classList.remove('mode-picker--visible');
    // pointer-events: none kicks in immediately via CSS (no --visible = no clicks)
    // Set hidden after exit animation for DOM cleanup
    const setHidden = () => { picker.hidden = true; };
    picker.addEventListener('transitionend', setHidden, { once: true });
    setTimeout(setHidden, 500);
    app.querySelector('#mode-btn')?.focus();
  }

  // Mode picker — card clicks
  app.querySelectorAll('.mode-card').forEach((card) => {
    card.addEventListener('click', () => {
      modeManager.setMode(card.getAttribute('data-mode'));
      hideModePicker();
    });
  });

  // Mode button pill click (both sidebar and mobile)
  app.querySelectorAll('#mode-btn, #mobile-mode-btn').forEach((btn) => {
    btn.addEventListener('click', () => showModePicker());
  });

  // Backdrop click closes picker
  app.querySelector('.mode-picker__backdrop')?.addEventListener('click', () => hideModePicker());

  // Escape key closes picker
  function handleEscapeKey(e) {
    if (e.key === 'Escape' && !app.querySelector('#mode-picker')?.hidden) {
      hideModePicker();
    }
  }
  document.addEventListener('keydown', handleEscapeKey);

  app.querySelectorAll('[data-os-tab]').forEach((tabButton) => {
    tabButton.addEventListener('click', () => {
      setActiveTab(tabButton.getAttribute('data-os-tab'));
    });
  });

  // Desktop topbar — sidebar toggle (hamburger)
  app.querySelector('#sidebar-toggle-btn')?.addEventListener('click', () => {
    const shell = app.querySelector('#new-os-shell');
    if (shell) shell.classList.toggle('os-shell--sidebar-collapsed');
  });

  // Desktop topbar — gear dropdown menu
  const gearBtn = app.querySelector('#topbar-settings-btn');
  const gearMenu = app.querySelector('#topbar-menu');

  gearBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    gearMenu.classList.toggle('os-topbar__menu--open');
  });

  function closeGearMenu(e) {
    if (gearMenu && !gearMenu.contains(e.target) && !gearBtn.contains(e.target)) {
      gearMenu.classList.remove('os-topbar__menu--open');
    }
  }
  document.addEventListener('click', closeGearMenu);

  // Theme switcher in gear menu
  const osThemeSwitcher = app.querySelector('#os-theme-switcher');
  async function setOSTheme(theme) {
    osThemeSwitcher?.querySelectorAll('.os-topbar__theme-option').forEach(opt => {
      opt.classList.toggle('os-topbar__theme-option--active', opt.dataset.theme === theme);
    });
    await setSetting('theme', theme);
    if (theme === 'system') {
      document.documentElement.removeAttribute('data-theme');
    } else {
      document.documentElement.setAttribute('data-theme', theme);
    }
  }

  osThemeSwitcher?.querySelectorAll('.os-topbar__theme-option').forEach(opt => {
    opt.addEventListener('click', () => setOSTheme(opt.dataset.theme));
  });

  // Accent picker in gear menu
  const osAccentPicker = app.querySelector('#os-accent-picker');
  async function setOSAccent(colorId, hex) {
    osAccentPicker?.querySelectorAll('.os-topbar__accent-dot').forEach(d => {
      d.classList.toggle('os-topbar__accent-dot--active', d.dataset.color === colorId);
    });
    await setTheme({ accent: hex });
    await setSetting('accentColor', colorId);
  }

  osAccentPicker?.querySelectorAll('.os-topbar__accent-dot').forEach(dot => {
    dot.addEventListener('click', () => setOSAccent(dot.dataset.color, dot.dataset.hex));
  });

  // "Alle instellingen" button in gear menu
  gearMenu?.querySelector('[data-action="settings"]')?.addEventListener('click', () => {
    gearMenu.classList.remove('os-topbar__menu--open');
    setActiveTab('settings');
  });

  // Load saved theme + accent into gear menu
  (async () => {
    const savedTheme = await getSetting('theme') || 'system';
    osThemeSwitcher?.querySelectorAll('.os-topbar__theme-option').forEach(opt => {
      opt.classList.toggle('os-topbar__theme-option--active', opt.dataset.theme === savedTheme);
    });
    const savedAccent = await getSetting('accentColor');
    if (savedAccent) {
      osAccentPicker?.querySelectorAll('.os-topbar__accent-dot').forEach(d => {
        d.classList.toggle('os-topbar__accent-dot--active', d.dataset.color === savedAccent);
      });
    }
  })();

  // Legacy switch button — switch back to legacy interface
  app.querySelector('#legacy-switch-btn')?.addEventListener('click', () => {
    import('../core/featureFlags.js').then(({ setFeatureFlag }) => {
      setFeatureFlag('enableNewOS', false);
      window.location.hash = '';
      window.location.reload();
    });
  });

  // "← Dashboard" breadcrumb links
  app.querySelectorAll('.os-section__home-link').forEach((link) => {
    link.addEventListener('click', () => setActiveTab('dashboard'));
  });

  let modeTransitionTimer = null;

  const unsubscribeMode = eventBus.on('mode:changed', ({ mode }) => {
    setShellMode(mode);
    triggerModeWash(mode);
    updateModeBtn();
    updateSectionTitles(mode);
    updateModeHero(mode);
    renderVandaagHeader(mode);
    updateVandaagCollapse(mode);

    // Content crossfade: brief fade-out, remount blocks, fade-in
    const content = app.querySelector('.os-shell__content');
    if (content) {
      if (modeTransitionTimer) clearTimeout(modeTransitionTimer);
      content.classList.add('os-content--switching');
      modeTransitionTimer = setTimeout(() => {
        modeTransitionTimer = null;
        renderHosts();
        content.classList.remove('os-content--switching');
      }, 120);
    } else {
      renderHosts();
    }
  });

  // Listen for inbox:open event (from quick-action or Ctrl+I)
  const unsubscribeInboxOpen = eventBus.on('inbox:open', () => {
    setActiveTab('inbox');
  });

  // ── Command palette (Ctrl+K global search) ─────────────────
  const cmdPalette = createCommandPalette({
    onNavigate: ({ tab, focus }) => {
      setActiveTab(tab, { focus });
    },
  });
  app.querySelector('#new-os-shell')?.appendChild(cmdPalette.el);

  // Global keyboard shortcuts: Ctrl+K (search), Ctrl+I (inbox)
  function handleGlobalKeydown(e) {
    // Ctrl+K — open command palette
    if ((e.ctrlKey || e.metaKey) && e.key === 'k' && !e.shiftKey && !e.altKey) {
      e.preventDefault();
      if (cmdPalette.isOpen) {
        cmdPalette.close();
      } else {
        cmdPalette.open();
      }
      return;
    }
    // Ctrl+I — open inbox
    if (e.ctrlKey && e.key === 'i' && !e.shiftKey && !e.altKey && !e.metaKey) {
      e.preventDefault();
      setActiveTab('inbox');
      setTimeout(() => {
        const input = app.querySelector('.inbox-screen__capture-input');
        input?.focus();
      }, 50);
    }
  }
  document.addEventListener('keydown', handleGlobalKeydown);

  // ── Settings with mode-switch callback ──────────────────────
  renderSettingsBlock(app.querySelector('#new-os-settings-block'), {
    modeManager,
    eventBus,
    onChange: async ({ key }) => {
      // Settings that require live re-rendering
    },
  });

  setShellMode(modeManager.getMode());
  updateModeBtn();
  updateSectionTitles(modeManager.getMode());
  updateModeHero(modeManager.getMode());
  buildVandaagLayout(modeManager.getMode());
  renderVandaagHeader(modeManager.getMode());
  initSearchBar();
  renderHosts();

  // ── Deep links: restore tab from URL hash on load ─────────
  const hashState = parseHash();
  if (hashState.tab) {
    activeTab = hashState.tab;
  }
  if (hashState.mode && ['School', 'Personal', 'BPV'].includes(hashState.mode)) {
    modeManager.setMode(hashState.mode);
  }
  setActiveTab(activeTab, { focus: hashState.focus });

  function handleHashChange() {
    const h = parseHash();
    if (h.tab && h.tab !== activeTab) {
      setActiveTab(h.tab, { focus: h.focus });
    } else if (h.focus) {
      scrollToFocus(app.querySelector('#new-os-shell'), h.focus);
    }
  }
  window.addEventListener('hashchange', handleHashChange);

  // Show mode picker on first visit so user can set their context
  if (modeManager.isFirstVisit?.()) {
    setTimeout(() => showModePicker(), 400);
  }

  // Start tutorial for new users (after mode picker)
  const tutorialDelay = modeManager.isFirstVisit?.() ? 1200 : 800;
  setTimeout(() => startTutorial(), tutorialDelay);

  // ── Friday prompt: gentle nudge to send weekly review ───────
  (async () => {
    try {
      if (!isFriday()) return;
      const week = getISOWeek(getToday());
      const sent = await isReviewSent(week);
      if (sent) return;
      // Show a non-intrusive banner after a short delay
      setTimeout(() => {
        const banner = document.createElement('div');
        banner.className = 'os-friday-prompt';
        banner.innerHTML = `
          <span class="os-friday-prompt__text">Het is vrijdag — tijd voor je weekoverzicht?</span>
          <button type="button" class="os-friday-prompt__btn" data-action="scroll-review">Bekijk</button>
          <button type="button" class="os-friday-prompt__close" aria-label="Sluiten">&times;</button>
        `;
        banner.querySelector('[data-action="scroll-review"]')?.addEventListener('click', () => {
          setActiveTab('today');
          banner.remove();
          setTimeout(() => {
            const review = app.querySelector('.weekly-review');
            review?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }, 100);
        });
        banner.querySelector('.os-friday-prompt__close')?.addEventListener('click', () => banner.remove());
        app.querySelector('.os-shell__content')?.prepend(banner);
      }, 2000);
    } catch { /* non-critical */ }
  })();

  window.addEventListener('beforeunload', () => {
    unsubscribeMode?.();
    unsubscribeInboxOpen?.();
    Object.values(vandaagSections).forEach(s => s?.destroy());
    cmdPalette.destroy();
    document.removeEventListener('keydown', handleGlobalKeydown);
    document.removeEventListener('keydown', handleEscapeKey);
    document.removeEventListener('click', closeGearMenu);
    window.removeEventListener('hashchange', handleHashChange);
    eventBus.clear();
  }, { once: true });
}
