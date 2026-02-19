import { getTodayHours, getTodayLogbook, formatHoursSummary } from './store.js';
import { getToday, escapeHTML, truncate } from '../../utils.js';

export function renderBPVLogSummary(container) {
  const mountId = crypto.randomUUID();
  const today = getToday();

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

    rows.innerHTML = `
      <div class="bpv-log__row">
        <div class="bpv-log__row-label">Uren vandaag</div>
        <div class="bpv-log__row-value">
          ${hoursSummary
            ? `<span>${escapeHTML(hoursSummary.formatted)}</span> <span class="bpv-log__detail">${escapeHTML(hoursSummary.detail)}</span>`
            : '<span class="bpv-log__empty-val">Nog niet ingevuld</span>'}
        </div>
        <a href="#hours/${today}" class="btn btn-ghost btn-sm">${hoursSummary ? 'Bewerken' : 'Nu invullen'}</a>
      </div>
      <div class="bpv-log__row">
        <div class="bpv-log__row-label">Logboek</div>
        <div class="bpv-log__row-value">
          ${logbook
            ? `<span>${escapeHTML(truncate(logbook.description, 60))}</span>`
            : '<span class="bpv-log__empty-val">Nog niet geschreven</span>'}
        </div>
        <a href="${logbook ? `#logbook/${logbook.id}` : '#logbook/new'}" class="btn btn-ghost btn-sm">${logbook ? 'Bekijken' : 'Schrijven'}</a>
      </div>
    `;
  }

  render();

  return {
    unmount() {
      el?.remove();
    },
  };
}
