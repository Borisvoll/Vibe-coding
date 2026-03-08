import { getTodayHours, getTodayLogbook, formatHoursSummary } from './store.js';
import { getToday, escapeHTML, truncate } from '../../utils.js';
import { DAY_TYPE_LABELS } from '../../constants.js';

export function renderBPVLogSummary(container, context) {
  const { eventBus } = context || {};
  const mountId = crypto.randomUUID();

  container.insertAdjacentHTML('beforeend', `
    <article class="bpv-log os-mini-card" data-mount-id="${mountId}">
      <h3 class="bpv-log__title">BPV Log</h3>
      <div class="bpv-log__rows"></div>
    </article>
  `);

  const el = container.querySelector(`[data-mount-id="${mountId}"]`);
  const rows = el.querySelector('.bpv-log__rows');

  async function render() {
    const [hours, logbook] = await Promise.all([getTodayHours(), getTodayLogbook()]);
    const hoursSummary = formatHoursSummary(hours);
    const activities = Array.isArray(hours?.activities) ? hours.activities.filter(a => a && a.trim()) : [];

    // Show type label for non-work types
    const typeLabel = hours && hours.type !== 'work'
      ? `<span class="bpv-log__type-badge">${escapeHTML(DAY_TYPE_LABELS[hours.type] || hours.type)}</span>`
      : '';

    rows.innerHTML = `
      <div class="bpv-log__row">
        <div class="bpv-log__row-label">Uren vandaag</div>
        <div class="bpv-log__row-value">
          ${hoursSummary
            ? `${typeLabel}<span>${escapeHTML(hoursSummary.formatted)}</span> <span class="bpv-log__detail">${escapeHTML(hoursSummary.detail)}</span>`
            : '<span class="bpv-log__empty-val">Nog niet ingevuld</span>'}
        </div>
        <a href="#today?focus=mode" class="btn btn-ghost btn-sm">${hoursSummary ? 'Bewerken' : 'Nu invullen'}</a>
      </div>
      ${activities.length > 0 ? `
        <div class="bpv-log__row">
          <div class="bpv-log__row-label">Activiteiten</div>
          <div class="bpv-log__row-value">
            <span>${activities.map(a => escapeHTML(truncate(a, 40))).join(' · ')}</span>
          </div>
          <a href="#today?focus=mode" class="btn btn-ghost btn-sm">Bewerken</a>
        </div>
      ` : ''}
      <div class="bpv-log__row">
        <div class="bpv-log__row-label">Logboek</div>
        <div class="bpv-log__row-value">
          ${logbook
            ? `<span>${escapeHTML(truncate(logbook.description, 60))}${logbook.description && logbook.description.length > 60 ? '…' : ''}</span>`
            : '<span class="bpv-log__empty-val">Nog niet geschreven</span>'}
        </div>
        <a href="#today?focus=mode" class="btn btn-ghost btn-sm">${logbook ? 'Bekijken' : 'Schrijven'}</a>
      </div>
    `;
  }

  render();

  const unsubBPV = eventBus?.on('bpv:changed', () => render());

  return {
    unmount() {
      unsubBPV?.();
      el?.remove();
    },
  };
}
