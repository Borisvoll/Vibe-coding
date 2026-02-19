import { getToday, formatDateShort } from '../../utils.js';

export function renderSchedulePlaceholder(container, context) {
  const mountId = crypto.randomUUID();
  const today = getToday();
  const label = formatDateShort(today);

  container.insertAdjacentHTML('beforeend', `
    <article class="schedule-placeholder os-mini-card" data-mount-id="${mountId}">
      <h3 class="schedule-placeholder__title">Agenda</h3>
      <p class="schedule-placeholder__date">${label}</p>
      <div class="schedule-placeholder__empty">
        <p>Agenda-integratie volgt in een volgende iteratie.</p>
        <p class="schedule-placeholder__hint">Tip: plan je dag met de Top 3 hierboven.</p>
      </div>
    </article>
  `);

  const el = container.querySelector(`[data-mount-id="${mountId}"]`);

  return {
    unmount() {
      el?.remove();
    },
  };
}
