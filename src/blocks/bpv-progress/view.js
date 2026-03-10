import { getTotalProgress } from '../../stores/bpv.js';
import { escapeHTML, formatMinutes, daysRemainingInBPV } from '../../utils.js';
import { BPV_TOTAL_GOAL_HOURS } from '../../constants.js';

export function renderBPVProgress(container, context) {
  const { eventBus } = context;
  const mountId = `bpv-prog-${crypto.randomUUID()}`;

  container.insertAdjacentHTML('beforeend', `
    <article class="bpv-progress os-mini-card" data-mount-id="${mountId}">
      <div class="bpv-progress__loading">Laden...</div>
    </article>
  `);

  const el = container.querySelector(`[data-mount-id="${mountId}"]`);

  async function render() {
    const p = await getTotalProgress();
    const daysLeft = daysRemainingInBPV();

    const progressColor = p.percentComplete >= 80
      ? 'var(--color-success)'
      : (p.percentComplete >= 50 ? 'var(--color-warning)' : 'var(--color-error)');

    // Calculate average needed per remaining workday
    const avgNeeded = p.remainingWorkdays > 0
      ? formatMinutes(Math.ceil(p.remainingMinutes / p.remainingWorkdays))
      : '-';

    el.innerHTML = `
      <div class="bpv-progress__header">
        <h3 class="bpv-progress__title">BPV Voortgang</h3>
        <span class="bpv-progress__pct" style="color:${progressColor}">${p.percentComplete}%</span>
      </div>
      <div class="bpv-progress__bar-container">
        <div class="bpv-progress__bar">
          <div class="bpv-progress__bar-fill" style="width:${p.percentComplete}%;background:${progressColor}"></div>
        </div>
      </div>
      <div class="bpv-progress__stats">
        <div class="bpv-progress__stat">
          <span class="bpv-progress__stat-value">${escapeHTML(p.formattedTotal)}</span>
          <span class="bpv-progress__stat-label">Gelogd</span>
        </div>
        <div class="bpv-progress__stat">
          <span class="bpv-progress__stat-value">${escapeHTML(p.formattedRemaining)}</span>
          <span class="bpv-progress__stat-label">Resterend</span>
        </div>
        <div class="bpv-progress__stat">
          <span class="bpv-progress__stat-value">${p.totalWorkDays}</span>
          <span class="bpv-progress__stat-label">Werkdagen</span>
        </div>
        <div class="bpv-progress__stat">
          <span class="bpv-progress__stat-value">${daysLeft}</span>
          <span class="bpv-progress__stat-label">Dagen over</span>
        </div>
      </div>
      ${p.remainingWorkdays > 0 ? `
        <div class="bpv-progress__avg">
          Gemiddeld <strong>${escapeHTML(avgNeeded)}</strong> per werkdag nodig om ${BPV_TOTAL_GOAL_HOURS}u te halen
        </div>
      ` : ''}
    `;
  }

  render();
  const unsub = eventBus?.on('bpv:changed', () => render());

  return {
    unmount() {
      unsub?.();
      el?.remove();
    },
  };
}
