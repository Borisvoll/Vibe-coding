import { getCockpitItems } from '../../os/cockpitData.js';

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
      <div class="daily-cockpit__header">
        <span class="daily-cockpit__title">Nog te doen</span>
        <span class="daily-cockpit__pill"></span>
      </div>
      <ul class="daily-cockpit__list"></ul>
    </div>
  `);

  const el = container.querySelector(`[data-mount-id="${mountId}"]`);
  const pillEl = el.querySelector('.daily-cockpit__pill');
  const listEl = el.querySelector('.daily-cockpit__list');

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
  const unsubs = [
    eventBus.on('mode:changed', () => render()),
    eventBus.on('daily:changed', () => render()),
    eventBus.on('tasks:changed', () => render()),
    eventBus.on('inbox:changed', () => render()),
    eventBus.on('projects:changed', () => render()),
    eventBus.on('bpv:changed', () => render()),
  ];

  render();

  return {
    unmount() {
      unsubs.forEach((u) => u?.());
      el?.remove();
    },
  };
}
