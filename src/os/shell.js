import { getSetting } from '../db.js';
import { renderSettingsBlock } from '../blocks/settings-panel.js';
import { formatDateShort, getToday, getISOWeek } from '../utils.js';
import { isFriday, isReviewSent } from '../stores/weekly-review.js';

const SHELL_TABS = ['dashboard', 'today', 'inbox', 'planning', 'reflectie', 'archief'];

const MODE_META = {
  BPV: {
    label: 'BPV',
    description: 'Beroepspraktijkvorming',
    color: 'var(--color-blue)',
    colorLight: 'var(--color-blue-light)',
    emoji: '🏢',
  },
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

      <header class="os-shell__header">
        <div class="os-shell__header-inner">
          <div class="os-shell__header-left">
            <h1 class="os-shell__title">BORIS</h1>
            <span class="os-shell__date">${todayLabel}</span>
          </div>
          <button id="mode-btn" type="button" class="os-mode-btn" aria-label="Verander modus" aria-haspopup="dialog">
            <span class="os-mode-btn__dot"></span>
            <span class="os-mode-btn__label"></span>
            <svg class="os-mode-btn__chevron" width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
              <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
        </div>
      </header>

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

      <nav id="os-nav" class="os-nav" aria-label="BORIS navigatie">
        <div class="os-nav__inner">
          <button class="os-nav__button" type="button" data-os-tab="dashboard">Dashboard</button>
          <button class="os-nav__button" type="button" data-os-tab="today">Vandaag</button>
          <button class="os-nav__button" type="button" data-os-tab="inbox">
            Inbox <span class="os-nav__badge" id="inbox-badge" hidden>0</span>
          </button>
          <button class="os-nav__button" type="button" data-os-tab="planning">Planning</button>
          <button class="os-nav__button" type="button" data-os-tab="reflectie">Reflectie</button>
          <button class="os-nav__button" type="button" data-os-tab="archief">Archief</button>
        </div>
      </nav>

      <main id="new-os-content" class="os-shell__content">
        <section class="os-section" data-os-section="dashboard" hidden>
          <h2 class="os-section__title">Dashboard</h2>
          <div class="os-host-grid" data-os-host="dashboard-cards"></div>
        </section>
        <section class="os-section" data-os-section="today">
          <h2 class="os-section__title">Vandaag</h2>
          <div class="os-host-stack" data-os-host="today-sections"></div>
          <div class="os-host-grid" data-os-host="vandaag-widgets"></div>
        </section>
        <section class="os-section" data-os-section="inbox" hidden>
          <div class="os-host-stack" data-os-host="inbox-screen"></div>
        </section>
        <section class="os-section" data-os-section="planning" hidden>
          <h2 class="os-section__title">Planning</h2>
          <p class="os-host-empty">Planningmodules volgen in een volgende iteratie.</p>
        </section>
        <section class="os-section" data-os-section="reflectie" hidden>
          <h2 class="os-section__title">Reflectie</h2>
          <p class="os-host-empty">Reflectie-overzicht volgt in een volgende iteratie.</p>
        </section>
        <section class="os-section" data-os-section="archief" hidden>
          <h2 class="os-section__title">Archief</h2>
          <p class="os-host-empty">Archiefweergave volgt in een volgende iteratie.</p>
        </section>
        <section class="os-section" data-os-section="settings">
          <div id="new-os-settings-block"></div>
        </section>
      </main>
    </div>
  `;

  function setActiveTab(tab) {
    activeTab = SHELL_TABS.includes(tab) ? tab : 'today';
    app.querySelectorAll('[data-os-section]').forEach((section) => {
      const name = section.getAttribute('data-os-section');
      if (name === 'settings') return;
      section.hidden = name !== activeTab;
    });
    app.querySelectorAll('[data-os-tab]').forEach((button) => {
      button.setAttribute('aria-pressed', String(button.getAttribute('data-os-tab') === activeTab));
    });
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

    sorted.forEach((block) => {
      const hosts = Array.isArray(block.hosts) ? block.hosts : [];
      hosts.forEach((hostName) => {
        const hostEl = app.querySelector(`[data-os-host="${hostName}"]`);
        if (!hostEl || typeof block.mount !== 'function') return;
        const instance = block.mount(hostEl, context) || null;
        mountedBlocks.push({ blockId: block.id, hostName, instance });
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
    const btn = app.querySelector('#mode-btn');
    if (!btn) return;
    btn.querySelector('.os-mode-btn__dot').style.background = meta.color;
    btn.querySelector('.os-mode-btn__label').textContent = meta.label;
    btn.style.setProperty('--mode-color', meta.color);
    btn.style.setProperty('--mode-color-light', meta.colorLight);

    // Update active card in picker
    app.querySelectorAll('.mode-card').forEach((card) => {
      card.classList.toggle('mode-card--active', card.getAttribute('data-mode') === mode);
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
    if (!picker) return;
    focusTrapCleanup?.();
    focusTrapCleanup = null;
    picker.classList.remove('mode-picker--visible');
    picker.addEventListener('transitionend', () => { picker.hidden = true; }, { once: true });
    // Return focus to trigger button
    app.querySelector('#mode-btn')?.focus();
  }

  // Mode picker — card clicks
  app.querySelectorAll('.mode-card').forEach((card) => {
    card.addEventListener('click', () => {
      modeManager.setMode(card.getAttribute('data-mode'));
      hideModePicker();
    });
  });

  // Mode button pill click
  app.querySelector('#mode-btn')?.addEventListener('click', () => showModePicker());

  // Backdrop click closes picker
  app.querySelector('.mode-picker__backdrop')?.addEventListener('click', () => hideModePicker());

  // Escape key closes picker
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !app.querySelector('#mode-picker')?.hidden) {
      hideModePicker();
    }
  });

  app.querySelectorAll('[data-os-tab]').forEach((tabButton) => {
    tabButton.addEventListener('click', () => {
      setActiveTab(tabButton.getAttribute('data-os-tab'));
    });
  });

  const unsubscribeMode = eventBus.on('mode:changed', ({ mode }) => {
    triggerModeWash(mode);
    updateModeBtn();
    renderHosts();
  });

  // Listen for inbox:open event (from quick-action or Ctrl+I)
  const unsubscribeInboxOpen = eventBus.on('inbox:open', () => {
    setActiveTab('inbox');
  });

  // Global Ctrl+I shortcut to open inbox
  function handleGlobalKeydown(e) {
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
    onChange: async ({ key }) => {
      // Settings that require live re-rendering
    },
  });

  updateModeBtn();
  renderHosts();
  setActiveTab(activeTab);

  // Show mode picker on first visit so user can set their context
  if (modeManager.isFirstVisit?.()) {
    setTimeout(() => showModePicker(), 400);
  }

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
    document.removeEventListener('keydown', handleGlobalKeydown);
    eventBus.clear();
  }, { once: true });
}
