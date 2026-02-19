import { getSetting } from '../db.js';
import { renderSettingsBlock } from '../blocks/settings-panel.js';
import { formatDateShort, getToday } from '../utils.js';

const SHELL_TABS = ['dashboard', 'today', 'planning', 'reflectie', 'archief'];

export function createOSShell(app, { eventBus, modeManager, blockRegistry }) {
  let activeTab = 'today';
  let mountedBlocks = [];

  const todayLabel = formatDateShort(getToday());

  app.innerHTML = `
    <div id="new-os-shell" class="os-shell">
      <header class="os-shell__header">
        <div class="os-shell__header-left">
          <h1 class="os-shell__title">BORIS</h1>
          <span class="os-shell__date">${todayLabel}</span>
        </div>
        <div id="mode-switch" class="os-mode-switch" role="group" aria-label="Moduskeuze">
          <button type="button" class="btn btn-secondary btn-sm" data-mode="BPV">BPV</button>
          <button type="button" class="btn btn-secondary btn-sm" data-mode="School">School</button>
          <button type="button" class="btn btn-secondary btn-sm" data-mode="Personal">Persoonlijk</button>
        </div>
      </header>
      <nav id="os-nav" class="os-nav" aria-label="BORIS navigatie">
        <button class="os-nav__button" type="button" data-os-tab="dashboard">Dashboard</button>
        <button class="os-nav__button" type="button" data-os-tab="today">Vandaag</button>
        <button class="os-nav__button" type="button" data-os-tab="planning">Planning</button>
        <button class="os-nav__button" type="button" data-os-tab="reflectie">Reflectie</button>
        <button class="os-nav__button" type="button" data-os-tab="archief">Archief</button>
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

  async function applyFocusMode() {
    const focusMode = await getSetting('focusMode');
    const sections = app.querySelectorAll('[data-os-section]');
    const navTabs = app.querySelectorAll('[data-os-tab]');

    if (focusMode) {
      activeTab = 'today';
      sections.forEach((section) => {
        const name = section.getAttribute('data-os-section');
        section.hidden = !(name === 'today' || name === 'settings');
      });
      navTabs.forEach((tab) => {
        tab.hidden = tab.getAttribute('data-os-tab') !== 'today';
      });
    } else {
      navTabs.forEach((tab) => { tab.hidden = false; });
      setActiveTab(activeTab);
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

    // Sort by order (lower first), blocks without order go last
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

  function updateModeButtons() {
    const mode = modeManager.getMode();
    app.querySelectorAll('#mode-switch [data-mode]').forEach((button) => {
      const active = button.getAttribute('data-mode') === mode;
      button.setAttribute('aria-pressed', String(active));
      button.classList.toggle('btn-primary', active);
      button.classList.toggle('btn-secondary', !active);
    });
  }

  // Event listeners
  app.querySelectorAll('#mode-switch [data-mode]').forEach((button) => {
    button.addEventListener('click', () => {
      modeManager.setMode(button.getAttribute('data-mode'));
    });
  });

  app.querySelectorAll('[data-os-tab]').forEach((tabButton) => {
    tabButton.addEventListener('click', () => {
      setActiveTab(tabButton.getAttribute('data-os-tab'));
    });
  });

  const unsubscribeMode = eventBus.on('mode:changed', () => {
    updateModeButtons();
    renderHosts();
  });

  renderSettingsBlock(app.querySelector('#new-os-settings-block'), {
    onChange: async ({ key }) => {
      if (key === 'focusMode') {
        await applyFocusMode();
      }
    },
  });

  updateModeButtons();
  renderHosts();
  setActiveTab(activeTab);
  applyFocusMode();

  window.addEventListener('beforeunload', () => {
    unsubscribeMode?.();
    eventBus.clear();
  }, { once: true });
}
