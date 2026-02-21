import { getSetting, setSetting } from '../db.js';
import { renderSettingsBlock } from '../blocks/settings-panel.js';
import { mountCuriosityPage } from './curiosity.js';
import { formatDateShort, formatDateLong, getToday, getISOWeek } from '../utils.js';
import { isFriday, isReviewSent } from '../stores/weekly-review.js';
import { startTutorial } from '../core/tutorial.js';
import { WEEKDAY_FULL } from '../constants.js';
import { setTheme } from '../core/themeEngine.js';
import { createCollapsibleSection } from '../ui/collapsible-section.js';
import { createCommandPalette } from '../ui/command-palette.js';
import { parseHash, updateHash, scrollToFocus } from './deepLinks.js';
import { createFocusOverlay } from '../ui/focus-overlay.js';

const SHELL_TABS = ['dashboard', 'today', 'inbox', 'lijsten', 'planning', 'projects', 'settings', 'curiosity'];

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

  // ── Hydrate shell chrome (already in DOM via index.html) ──
  const todayLabel = formatDateShort(getToday());
  const sidebarDate = app.querySelector('.os-sidebar__date');
  if (sidebarDate) sidebarDate.textContent = todayLabel;
  const mobileDate = app.querySelector('.os-shell__date');
  if (mobileDate) mobileDate.textContent = todayLabel;

  // Route container — templates get cloned into here
  const routeContainer = app.querySelector('[data-route-container]');

  // Current route params (e.g. { id: 'abc123' } for #projects/abc123)
  let routeParams = {};

  // ── Route mounting (template cloning) ─────────────────────
  function mountRoute(tab, params = {}) {
    // Determine which template to use
    let templateName = tab;
    if (tab === 'projects' && params.id) {
      templateName = 'project-detail';
    }

    const template = document.querySelector(`template[data-route="${templateName}"]`);
    if (!template) return;

    const clone = template.content.cloneNode(true);
    routeContainer.appendChild(clone);

    const mode = modeManager.getMode();

    // Route-specific hydration
    if (tab === 'today') {
      buildVandaagLayout(mode);
      renderVandaagHeader(mode);
      initSearchBar();
    }
    if (tab === 'dashboard') {
      updateSectionTitles(mode);
      updateModeHero(mode);
    }
    if (tab === 'planning') {
      updateSectionTitles(mode);
    }
    if (tab === 'settings') {
      renderSettingsBlock(routeContainer.querySelector('#new-os-settings-block'), {
        modeManager,
        eventBus,
        onChange: async () => {},
      });
    }
    if (tab === 'curiosity') {
      const mount = routeContainer.querySelector('#curiosity-route-mount');
      if (mount) mountCuriosityPage(mount);
    }

    // Breadcrumb visibility + handler
    const homeLink = routeContainer.querySelector('.os-section__home-link');
    if (homeLink) {
      homeLink.hidden = tab === 'dashboard';
      if (templateName === 'project-detail') {
        homeLink.addEventListener('click', () => setActiveTab('projects'));
      } else {
        homeLink.addEventListener('click', () => setActiveTab('dashboard'));
      }
    }

    renderHosts();
  }

  function unmountRoute(tab) {
    unmountAll();
    if (tab === 'today') {
      Object.values(vandaagSections).forEach(s => s?.destroy());
      Object.keys(vandaagSections).forEach(k => delete vandaagSections[k]);
    }
    routeContainer.innerHTML = '';
  }

  // ── Tab navigation ────────────────────────────────────────
  function setActiveTab(tab, opts) {
    const prevTab = activeTab;
    activeTab = SHELL_TABS.includes(tab) ? tab : 'today';
    routeParams = opts?.params || {};

    // Unmount previous route (skip if nothing mounted yet)
    if (routeContainer.firstChild) {
      unmountRoute(prevTab);
    }

    // Mount new route with params
    mountRoute(activeTab, routeParams);

    // Update all nav buttons (both sidebar and mobile nav)
    app.querySelectorAll('[data-os-tab]').forEach((button) => {
      const isActive = button.getAttribute('data-os-tab') === activeTab;
      button.setAttribute('aria-pressed', String(isActive));
      button.classList.toggle('os-sidebar__item--active', isActive);
    });

    // Deep link: update URL hash
    const focus = opts?.focus || null;
    updateHash(activeTab, focus, routeParams);
    if (focus) {
      scrollToFocus(routeContainer, focus);
    }
  }

  // ── Block mounting ────────────────────────────────────────
  function ensureHostEmptyStates() {
    routeContainer.querySelectorAll('[data-os-host]').forEach((host) => {
      if (host.children.length === 0) {
        host.innerHTML = '<p class="os-host-empty">Nog geen actieve blokken voor deze weergave.</p>';
      }
    });
  }

  function unmountAll() {
    mountedBlocks.forEach((entry) => { entry.instance?.unmount?.(); });
    mountedBlocks = [];
    routeContainer.querySelectorAll('[data-os-host]').forEach((host) => { host.innerHTML = ''; });
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

    const hostStagger = {};
    sorted.forEach((block) => {
      const hosts = Array.isArray(block.hosts) ? block.hosts : [];
      hosts.forEach((hostName) => {
        const hostEl = routeContainer.querySelector(`[data-os-host="${hostName}"]`);
        if (!hostEl || typeof block.mount !== 'function') return;
        try {
          const instance = block.mount(hostEl, context) || null;
          mountedBlocks.push({ blockId: block.id, hostName, instance });

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
    void wash.offsetWidth;
    wash.classList.add('os-mode-wash--active');
    wash.addEventListener('animationend', () => {
      wash.classList.remove('os-mode-wash--active');
    }, { once: true });
  }

  function updateModeBtn() {
    const mode = modeManager.getMode();
    const meta = MODE_META[mode] || MODE_META.BPV;

    app.querySelectorAll('#mode-btn, #mobile-mode-btn').forEach((btn) => {
      const dot = btn.querySelector('.os-mode-btn__dot');
      const label = btn.querySelector('.os-mode-btn__label');
      if (dot) dot.style.background = meta.color;
      if (label) label.textContent = meta.label;
      btn.style.setProperty('--mode-color', meta.color);
      btn.style.setProperty('--mode-color-light', meta.colorLight);
    });

    app.querySelectorAll('.mode-card').forEach((card) => {
      card.classList.toggle('mode-card--active', card.getAttribute('data-mode') === mode);
    });
  }

  function setShellMode(mode) {
    const shell = app.querySelector('#new-os-shell');
    if (shell) shell.setAttribute('data-mode', mode);
  }

  // ── Vandaag page layout with collapsible zones ────────────

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
      const zoneEl = routeContainer.querySelector(`[data-vandaag-zone="${cfg.zone}"]`);
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
    const headerEl = routeContainer.querySelector('[data-vandaag-header]');
    if (!headerEl) return;
    const meta = MODE_META[mode] || MODE_META.School;
    const today = getToday();
    const d = new Date(today + 'T00:00:00');
    const dayIdx = (d.getDay() + 6) % 7;
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

  // ── Search bar ────────────────────────────────────────────
  function initSearchBar() {
    const searchEl = routeContainer.querySelector('[data-vandaag-search]');
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

  // ── Section titles + mode hero ────────────────────────────
  function updateSectionTitles(mode) {
    const meta = MODE_META[mode] || MODE_META.School;
    const badge = `<span class="os-section__mode-badge" style="--badge-color:${meta.color};--badge-color-light:${meta.colorLight}">${meta.emoji} ${meta.label}</span>`;
    const titleMap = {
      dashboard: `Dashboard ${badge}`,
      planning: `Planning ${badge}`,
    };
    Object.entries(titleMap).forEach(([section, html]) => {
      const el = routeContainer.querySelector(`[data-os-section="${section}"] .os-section__title`);
      if (el) el.innerHTML = html;
    });
  }

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

    ['dashboard'].forEach((section) => {
      const sectionEl = routeContainer.querySelector(`[data-os-section="${section}"]`);
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

  // ── Mode picker ───────────────────────────────────────────
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
    const setHidden = () => { picker.hidden = true; };
    picker.addEventListener('transitionend', setHidden, { once: true });
    setTimeout(setHidden, 500);
    app.querySelector('#mode-btn')?.focus();
  }

  // ── Shell chrome event listeners ──────────────────────────

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

  // Tab navigation (sidebar + mobile nav)
  app.querySelectorAll('[data-os-tab]').forEach((tabButton) => {
    tabButton.addEventListener('click', () => {
      setActiveTab(tabButton.getAttribute('data-os-tab'));
    });
  });

  // Desktop topbar — sidebar toggle
  app.querySelector('#sidebar-toggle-btn')?.addEventListener('click', () => {
    const shell = app.querySelector('#new-os-shell');
    if (shell) shell.classList.toggle('os-shell--sidebar-collapsed');
  });

  // Desktop topbar — gear dropdown
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

  // Theme switcher
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

  // Accent picker
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

  // Mode radiogroup in gear menu
  const topbarModeRadio = app.querySelector('#topbar-mode-radio');

  function updateTopbarModeRadio(mode) {
    topbarModeRadio?.querySelectorAll('input[name="topbar-mode"]').forEach((input) => {
      input.checked = input.value === mode;
      input.closest('.os-topbar__mode-opt')?.classList.toggle('os-topbar__mode-opt--active', input.value === mode);
    });
  }

  topbarModeRadio?.addEventListener('change', (e) => {
    const mode = e.target.value;
    if (mode) {
      modeManager.setMode(mode);
      gearMenu.classList.remove('os-topbar__menu--open');
    }
  });

  updateTopbarModeRadio(modeManager.getMode());

  // ── Focus overlay ─────────────────────────────────────────
  const focusOverlay = createFocusOverlay();
  app.querySelector('#new-os-shell')?.appendChild(focusOverlay.el);

  // Load saved theme + accent
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

  // ── Mode change handler ───────────────────────────────────
  let modeTransitionTimer = null;

  const unsubscribeMode = eventBus.on('mode:changed', ({ mode }) => {
    // Shell chrome updates (always)
    setShellMode(mode);
    triggerModeWash(mode);
    updateModeBtn();
    updateTopbarModeRadio(mode);
    focusOverlay.showFor(mode, MODE_META[mode]);

    // Route-specific updates
    if (activeTab === 'today') {
      renderVandaagHeader(mode);
      updateVandaagCollapse(mode);
    }
    updateSectionTitles(mode);
    if (activeTab === 'dashboard') {
      updateModeHero(mode);
    }

    // Content crossfade + remount blocks
    if (routeContainer) {
      if (modeTransitionTimer) clearTimeout(modeTransitionTimer);
      routeContainer.classList.add('os-content--switching');
      modeTransitionTimer = setTimeout(() => {
        modeTransitionTimer = null;
        renderHosts();
        routeContainer.classList.remove('os-content--switching');
      }, 120);
    } else {
      renderHosts();
    }
  });

  // inbox:open event
  const unsubscribeInboxOpen = eventBus.on('inbox:open', () => {
    setActiveTab('inbox');
  });

  // ── Command palette ───────────────────────────────────────
  const cmdPalette = createCommandPalette({
    onNavigate: ({ tab, focus }) => {
      setActiveTab(tab, { focus });
    },
    eventBus,
  });
  app.querySelector('#new-os-shell')?.appendChild(cmdPalette.el);

  // Global keyboard shortcuts
  function handleGlobalKeydown(e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k' && !e.shiftKey && !e.altKey) {
      e.preventDefault();
      if (cmdPalette.isOpen) { cmdPalette.close(); } else { cmdPalette.open(); }
      return;
    }
    if (e.ctrlKey && e.key === 'i' && !e.shiftKey && !e.altKey && !e.metaKey) {
      e.preventDefault();
      setActiveTab('inbox');
      setTimeout(() => {
        const input = routeContainer.querySelector('.inbox-screen__capture-input');
        input?.focus();
      }, 50);
    }
    if (e.altKey && e.key === 'g' && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      setActiveTab('projects');
    }
  }
  document.addEventListener('keydown', handleGlobalKeydown);

  // ── Initialize ────────────────────────────────────────────
  setShellMode(modeManager.getMode());
  updateModeBtn();

  // Deep links: determine initial tab from URL hash
  const hashState = parseHash();
  if (hashState.tab) {
    activeTab = hashState.tab;
  }
  if (hashState.mode && ['School', 'Personal', 'BPV'].includes(hashState.mode)) {
    modeManager.setMode(hashState.mode);
  }

  // Mount initial route (this calls renderHosts internally)
  setActiveTab(activeTab, { focus: hashState.focus, params: hashState.params || {} });

  // Hash change listener
  function handleHashChange() {
    const h = parseHash();
    const paramsChanged = JSON.stringify(h.params || {}) !== JSON.stringify(routeParams);
    if (h.tab && (h.tab !== activeTab || paramsChanged)) {
      setActiveTab(h.tab, { focus: h.focus, params: h.params || {} });
    } else if (h.focus) {
      scrollToFocus(routeContainer, h.focus);
    }
  }
  window.addEventListener('hashchange', handleHashChange);

  // First visit: mode picker
  if (modeManager.isFirstVisit?.()) {
    setTimeout(() => showModePicker(), 400);
  }

  // Tutorial
  const tutorialDelay = modeManager.isFirstVisit?.() ? 1200 : 800;
  setTimeout(() => startTutorial(), tutorialDelay);

  // ── Friday prompt ─────────────────────────────────────────
  (async () => {
    try {
      if (!isFriday()) return;
      const week = getISOWeek(getToday());
      const sent = await isReviewSent(week);
      if (sent) return;
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
            const review = routeContainer.querySelector('.weekly-review');
            review?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }, 100);
        });
        banner.querySelector('.os-friday-prompt__close')?.addEventListener('click', () => banner.remove());
        routeContainer?.prepend(banner);
      }, 2000);
    } catch { /* non-critical */ }
  })();

  // ── Cleanup ───────────────────────────────────────────────
  window.addEventListener('beforeunload', () => {
    unsubscribeMode?.();
    unsubscribeInboxOpen?.();
    Object.values(vandaagSections).forEach(s => s?.destroy());
    cmdPalette.destroy();
    focusOverlay.destroy();
    document.removeEventListener('keydown', handleGlobalKeydown);
    document.removeEventListener('keydown', handleEscapeKey);
    document.removeEventListener('click', closeGearMenu);
    window.removeEventListener('hashchange', handleHashChange);
    eventBus.clear();
  }, { once: true });
}
