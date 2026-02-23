import { escapeHTML, getToday, formatDateShort } from '../../utils.js';
import { getDailyEntry } from '../../stores/daily.js';

export function renderSchedulePlaceholder(container, context) {
  const { modeManager, eventBus } = context;
  const mountId = crypto.randomUUID();

  container.insertAdjacentHTML('beforeend', `
    <article class="schedule-placeholder os-mini-card" data-mount-id="${mountId}"></article>
  `);

  const el = container.querySelector(`[data-mount-id="${mountId}"]`);

  async function render() {
    if (!el) return;
    const today = getToday();
    const label = formatDateShort(today);
    const mode = modeManager?.getMode() || 'School';
    const entry = await getDailyEntry(mode, today);

    const outcomes = (entry?.outcomes || []).filter(Boolean);
    const todos = entry?.todos || [];
    const pending = todos.filter(t => !t.done);
    const done = todos.filter(t => t.done);

    el.innerHTML = `
      <h3 class="schedule-placeholder__title">Dagplanning</h3>
      <p class="schedule-placeholder__date">${label}</p>
      ${outcomes.length > 0 ? `
        <div class="schedule-placeholder__section">
          <h4 class="schedule-placeholder__subtitle">Doelen vandaag</h4>
          <ul class="schedule-placeholder__list">
            ${outcomes.map(o => `<li class="schedule-placeholder__goal">${escapeHTML(o)}</li>`).join('')}
          </ul>
        </div>
      ` : ''}
      ${pending.length > 0 ? `
        <div class="schedule-placeholder__section">
          <h4 class="schedule-placeholder__subtitle">Nog te doen (${pending.length})</h4>
          <ul class="schedule-placeholder__list">
            ${pending.map(t => `<li class="schedule-placeholder__todo">${escapeHTML(t.text)}</li>`).join('')}
          </ul>
        </div>
      ` : ''}
      ${done.length > 0 ? `
        <div class="schedule-placeholder__section">
          <h4 class="schedule-placeholder__subtitle">Afgerond (${done.length})</h4>
          <ul class="schedule-placeholder__list schedule-placeholder__list--done">
            ${done.map(t => `<li class="schedule-placeholder__todo schedule-placeholder__todo--done">${escapeHTML(t.text)}</li>`).join('')}
          </ul>
        </div>
      ` : ''}
      ${outcomes.length === 0 && todos.length === 0 ? `
        <div class="schedule-placeholder__empty">
          <p>Nog geen planning voor vandaag.</p>
          <p class="schedule-placeholder__hint">Stel je Top 3 doelen in om te beginnen.</p>
        </div>
      ` : ''}
    `;
  }

  render();

  const unsubMode = eventBus?.on('mode:changed', () => render());
  const unsubDaily = eventBus?.on('daily:changed', () => render());

  return {
    unmount() {
      unsubMode?.();
      unsubDaily?.();
      el?.remove();
    },
  };
}
