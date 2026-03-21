import { getTotalProgress } from '../../stores/bpv.js';
import { escapeHTML, formatMinutes, daysRemainingInBPV, getToday } from '../../utils.js';
import { BPV_TOTAL_GOAL_HOURS, BPV_START, BPV_END } from '../../constants.js';
import { getAllHoursSorted } from '../../db.js';

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

    // Average needed per remaining workday
    const avgNeeded = p.remainingWorkdays > 0
      ? formatMinutes(Math.ceil(p.remainingMinutes / p.remainingWorkdays))
      : null;

    // Projection: at current pace
    let projectionText = '';
    const allHours = await getAllHoursSorted();
    const workdaysLogged = allHours.filter(h => h.type === 'work' && h.netMinutes > 0).length;
    if (workdaysLogged > 0 && p.remainingWorkdays > 0) {
      const avgPerDay = p.totalMinutes / workdaysLogged;
      const projected = p.totalMinutes + (p.remainingWorkdays * avgPerDay);
      projectionText = `Bij dit tempo haal je ${formatMinutes(Math.round(projected))}`;
    }

    // Period progress (days)
    const startDate = new Date(BPV_START + 'T00:00:00');
    const endDate = new Date(BPV_END + 'T00:00:00');
    const todayDate = new Date(getToday() + 'T00:00:00');
    const totalDays = Math.round((endDate - startDate) / 86400000);
    const elapsedDays = Math.max(0, Math.round((todayDate - startDate) / 86400000));
    const daysPct = Math.min(100, Math.round((elapsedDays / totalDays) * 100));

    el.innerHTML = `
      <div class="bpv-progress__header">
        <h3 class="bpv-progress__title">Stage</h3>
        <span class="bpv-progress__pct" style="color:${progressColor}">${p.percentComplete}%</span>
      </div>
      <div class="bpv-progress__bar-container">
        <div class="bpv-progress__bar">
          <div class="bpv-progress__bar-fill" style="width:${p.percentComplete}%;background:${progressColor}"></div>
        </div>
        <div class="bpv-progress__bar-labels">
          <span>${escapeHTML(p.formattedTotal)}</span>
          <span>${escapeHTML(p.formattedGoal)}</span>
        </div>
      </div>
      <div class="bpv-progress__stats">
        <div class="bpv-progress__stat">
          <span class="bpv-progress__stat-value">${p.totalWorkDays}</span>
          <span class="bpv-progress__stat-label">Gelogd</span>
        </div>
        <div class="bpv-progress__stat">
          <span class="bpv-progress__stat-value">${daysLeft}</span>
          <span class="bpv-progress__stat-label">Resterend</span>
        </div>
        <div class="bpv-progress__stat">
          <span class="bpv-progress__stat-value">dag ${elapsedDays}</span>
          <span class="bpv-progress__stat-label">van ${totalDays}</span>
        </div>
      </div>
      ${avgNeeded ? `
        <div class="bpv-progress__footer">
          ${projectionText ? `<span class="bpv-progress__projection">${escapeHTML(projectionText)}</span>` : ''}
          <span class="bpv-progress__avg">${escapeHTML(avgNeeded)}/dag nodig</span>
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
