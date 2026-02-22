import { getCockpitItems, getCockpitStats } from '../../os/cockpitData.js';
import { getSetting } from '../../db.js';

/**
 * Deep link handlers per action type.
 * Each returns a function that performs the navigation.
 */
function createDeepLinks(context) {
  const { eventBus } = context;

  function scrollTo(selector) {
    const el = document.querySelector(selector);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  return {
    outcomes:   () => scrollTo('.daily-outcomes'),
    todos:      () => scrollTo('.daily-todos'),
    inbox:      () => eventBus.emit('inbox:open'),
    projects:   () => scrollTo('.projects-block'),
    reflection: () => {
      // Open the reflection collapsible, then scroll
      const header = document.querySelector('[data-collapse-id="vandaag-reflection"] .collapsible-section__header');
      if (header?.getAttribute('aria-expanded') === 'false') header.click();
      setTimeout(() => scrollTo('.daily-reflection'), 150);
    },
    hours:      () => { window.location.hash = '#hours-entry'; },
    logbook:    () => { window.location.hash = '#logbook-entry'; },
  };
}

export function renderDailyCockpit(container, context) {
  const mountId = crypto.randomUUID();
  const { eventBus, modeManager } = context;
  const deepLinks = createDeepLinks(context);

  container.insertAdjacentHTML('beforeend', `
    <div class="daily-cockpit" data-mount-id="${mountId}">
      <div class="daily-cockpit__stats" data-cockpit-stats></div>
      <div class="daily-cockpit__header">
        <span class="daily-cockpit__title">Nog te doen</span>
        <span class="daily-cockpit__pill"></span>
      </div>
      <ul class="daily-cockpit__list"></ul>
    </div>
  `);

  // Morning flow setting: 'manual' hides cockpit until user clicks
  getSetting('morning_flow').then((flow) => {
    if (flow === 'manual') {
      el.style.display = 'none';
      const toggle = document.createElement('button');
      toggle.type = 'button';
      toggle.className = 'daily-cockpit__show-toggle';
      toggle.textContent = 'Toon dagchecklist';
      toggle.addEventListener('click', () => { el.style.display = ''; toggle.remove(); });
      container.insertBefore(toggle, el);
    }
  }).catch(() => {});

  const el = container.querySelector(`[data-mount-id="${mountId}"]`);
  const pillEl = el.querySelector('.daily-cockpit__pill');
  const listEl = el.querySelector('.daily-cockpit__list');

  const statsEl = el.querySelector('[data-cockpit-stats]');

  async function renderStats() {
    try {
      const mode = modeManager.getMode();
      const stats = await getCockpitStats(mode);
      statsEl.innerHTML = `
        <div class="daily-cockpit__stat">
          <span class="daily-cockpit__stat-num">${stats.done}</span>
          <span class="daily-cockpit__stat-label">gedaan</span>
        </div>
        <div class="daily-cockpit__stat">
          <span class="daily-cockpit__stat-num daily-cockpit__stat-num--streak">${stats.streak > 0 ? stats.streak : '–'}</span>
          <span class="daily-cockpit__stat-label">streak</span>
        </div>
        <div class="daily-cockpit__stat">
          <span class="daily-cockpit__stat-num">${stats.momentum}</span>
          <span class="daily-cockpit__stat-label">momentum</span>
        </div>
        <div class="daily-cockpit__stat ${stats.inbox > 0 ? 'daily-cockpit__stat--warn' : ''}">
          <span class="daily-cockpit__stat-num">${stats.inbox}</span>
          <span class="daily-cockpit__stat-label">inbox</span>
        </div>
      `;
    } catch { /* non-critical */ }
  }

  async function render() {
    let items;
    try {
      const mode = modeManager.getMode();
      items = await getCockpitItems(mode);
    } catch (err) {
      console.error('[daily-cockpit] Failed to load cockpit data:', err);
      return;
    }
    const doneCount = items.filter((i) => i.done).length;
    const openCount = items.length - doneCount;

    // Update pill
    if (openCount === 0) {
      pillEl.textContent = 'Alles klaar!';
      pillEl.className = 'daily-cockpit__pill daily-cockpit__pill--done';
    } else {
      pillEl.textContent = `${doneCount}/${items.length}`;
      pillEl.className = 'daily-cockpit__pill';
    }

    // Render items
    listEl.innerHTML = items.map((item) => `
      <li class="daily-cockpit__item ${item.done ? 'daily-cockpit__item--done' : ''}" data-link="${item.deepLink}">
        <span class="daily-cockpit__check">${item.done ? '✓' : ''}</span>
        <span class="daily-cockpit__label">${item.label}</span>
        ${!item.done ? '<span class="daily-cockpit__go">Nu →</span>' : ''}
      </li>
    `).join('');

    // Attach deep link handlers
    listEl.querySelectorAll('.daily-cockpit__item').forEach((li) => {
      li.addEventListener('click', () => {
        const link = li.dataset.link;
        if (deepLinks[link]) deepLinks[link]();
      });
    });
  }

  // Event subscriptions for reactive updates
  function refreshAll() { render(); renderStats(); }
  const unsubs = [
    eventBus.on('mode:changed', refreshAll),
    eventBus.on('daily:changed', refreshAll),
    eventBus.on('tasks:changed', refreshAll),
    eventBus.on('inbox:changed', refreshAll),
    eventBus.on('projects:changed', refreshAll),
    eventBus.on('bpv:changed', refreshAll),
  ];

  render();
  renderStats();

  return {
    unmount() {
      unsubs.forEach((u) => u?.());
      el?.remove();
    },
  };
}
