import { BPV_START, BPV_END } from '../../constants.js';
import { getToday, formatMinutes, escapeHTML } from '../../utils.js';
import { getAllHoursSorted } from '../../db.js';

/**
 * BPV Countdown + Progress widget.
 * Shows: "Dag X van Y — Z% klaar — Xu van Tu"
 * Plus projection line: "Als je zo doorgaat, haal je X uren."
 */
export function renderBPVCountdown(container, context) {
  const { eventBus } = context;
  const mountId = `bpv-cd-${crypto.randomUUID()}`;

  container.insertAdjacentHTML('beforeend', `
    <article class="bpv-countdown os-mini-card" data-mount-id="${mountId}">
      <div class="bpv-countdown__loading">Laden...</div>
    </article>
  `);

  const el = container.querySelector(`[data-mount-id="${mountId}"]`);

  async function render() {
    const today = getToday();
    const startDate = new Date(BPV_START + 'T00:00:00');
    const endDate = new Date(BPV_END + 'T00:00:00');
    const todayDate = new Date(today + 'T00:00:00');

    const totalDays = Math.round((endDate - startDate) / 86400000);
    const elapsedDays = Math.max(0, Math.round((todayDate - startDate) / 86400000));
    const remainingDays = Math.max(0, totalDays - elapsedDays);
    const percentDays = Math.min(100, Math.round((elapsedDays / totalDays) * 100));

    // Get all hours entries to sum total
    const allHours = await getAllHoursSorted();
    const totalMinutes = allHours.reduce((sum, h) => sum + (h.netMinutes || 0), 0);
    const totalHoursFormatted = formatMinutes(totalMinutes);

    // Count actual workdays logged
    const workdaysLogged = allHours.filter(h => h.type === 'work' && h.netMinutes > 0).length;

    // Calculate target: count weekdays (Mon-Fri) in BPV period
    let totalWeekdays = 0;
    const d = new Date(startDate);
    while (d <= endDate) {
      const dow = d.getDay();
      if (dow >= 1 && dow <= 5) totalWeekdays++;
      d.setDate(d.getDate() + 1);
    }
    const targetMinutes = totalWeekdays * 8 * 60; // 8 hours per workday
    const targetFormatted = formatMinutes(targetMinutes);
    const percentHours = Math.min(100, Math.round((totalMinutes / targetMinutes) * 100));

    // Projection: if they keep this average pace
    let projectionText = '';
    if (workdaysLogged > 0 && elapsedDays > 0) {
      const avgMinutesPerWorkday = totalMinutes / workdaysLogged;
      // Estimate remaining workdays
      let remainingWeekdays = 0;
      const rd = new Date(todayDate);
      rd.setDate(rd.getDate() + 1);
      while (rd <= endDate) {
        const dow = rd.getDay();
        if (dow >= 1 && dow <= 5) remainingWeekdays++;
        rd.setDate(rd.getDate() + 1);
      }
      const projectedTotal = totalMinutes + (remainingWeekdays * avgMinutesPerWorkday);
      projectionText = `Bij dit tempo haal je ${formatMinutes(Math.round(projectedTotal))}`;
    }

    // Progress bar color
    const progressColor = percentHours >= 80 ? 'var(--color-success)' :
      percentHours >= 50 ? 'var(--color-warning)' : 'var(--color-error)';

    el.innerHTML = `
      <div class="bpv-countdown__header">
        <span class="bpv-countdown__icon">📅</span>
        <h3 class="bpv-countdown__title">BPV Voortgang</h3>
      </div>
      <div class="bpv-countdown__stats">
        <div class="bpv-countdown__stat">
          <span class="bpv-countdown__stat-value">${elapsedDays}</span>
          <span class="bpv-countdown__stat-label">van ${totalDays} dagen</span>
        </div>
        <div class="bpv-countdown__stat">
          <span class="bpv-countdown__stat-value">${remainingDays}</span>
          <span class="bpv-countdown__stat-label">dagen resterend</span>
        </div>
        <div class="bpv-countdown__stat">
          <span class="bpv-countdown__stat-value">${percentDays}%</span>
          <span class="bpv-countdown__stat-label">periode klaar</span>
        </div>
      </div>
      <div class="bpv-countdown__progress-section">
        <div class="bpv-countdown__progress-label">
          ${escapeHTML(totalHoursFormatted)} / ${escapeHTML(targetFormatted)}
          <span class="bpv-countdown__pct">(${percentHours}%)</span>
        </div>
        <div class="bpv-countdown__progress-bar" role="progressbar"
          aria-valuenow="${percentHours}" aria-valuemin="0" aria-valuemax="100">
          <div class="bpv-countdown__progress-fill"
            style="width:${percentHours}%;background:${progressColor}"></div>
        </div>
      </div>
      ${projectionText ? `
        <div class="bpv-countdown__projection">
          ${escapeHTML(projectionText)}
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
