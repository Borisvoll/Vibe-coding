import { escapeHTML, getToday } from '../../utils.js';
import { getHoursEntry } from '../../stores/bpv.js';
import { getCockpitStats } from '../../os/cockpitData.js';
import { getReportProgress } from '../../stores/report.js';
import './styles.css';

const MOTIVATIONS = [
  'Kleine stappen, groot resultaat.',
  'Elke dag een beetje beter.',
  'Focus op het proces.',
  'Je bent op de goede weg.',
  'Vakmanschap groeit elke dag.',
];

export function renderBPVMiniCard(container, context) {
  const mountId = `bpv-mini-${crypto.randomUUID()}`;
  const { eventBus } = context || {};

  container.insertAdjacentHTML('beforeend',
    `<article class="os-mini-card os-mini-card--bpv mini-card" data-mount-id="${mountId}"></article>`
  );

  const el = container.querySelector(`[data-mount-id="${mountId}"]`);

  async function render() {
    const today = getToday();
    const [hours, stats, reportProgress] = await Promise.all([
      getHoursEntry(today).catch(() => null),
      getCockpitStats('BPV').catch(() => ({ done: 0, streak: 0, inbox: 0 })),
      getReportProgress().catch(() => ({ percent: 0 })),
    ]);

    const hoursLabel = hours?.startTime && hours?.endTime
      ? `${escapeHTML(hours.startTime)} – ${escapeHTML(hours.endTime)}`
      : 'Nog niet gelogd';

    const tip = MOTIVATIONS[new Date().getDate() % MOTIVATIONS.length];

    el.innerHTML = `
      <div class="mini-card__row">
        <span class="mini-card__icon">🏢</span>
        <span class="mini-card__title">BPV</span>
      </div>
      <div class="mini-card__stats">
        <div class="mini-card__stat">
          <span class="mini-card__stat-value">${hoursLabel}</span>
          <span class="mini-card__stat-label">Uren</span>
        </div>
        <div class="mini-card__stat">
          <span class="mini-card__stat-value">${stats.streak}d</span>
          <span class="mini-card__stat-label">Streak</span>
        </div>
        <div class="mini-card__stat">
          <span class="mini-card__stat-value">${stats.done}</span>
          <span class="mini-card__stat-label">Gedaan</span>
        </div>
        <div class="mini-card__stat mini-card__stat--link" data-action="open-report" style="cursor:pointer" title="Open stageverslag">
          <span class="mini-card__stat-value">${reportProgress.percent}%</span>
          <span class="mini-card__stat-label">Verslag</span>
        </div>
      </div>
      <p class="mini-card__tip">${escapeHTML(tip)}</p>
    `;
  }

  render();

  el.addEventListener('click', (e) => {
    if (e.target.closest('[data-action="open-report"]')) {
      window.location.hash = '#verslag';
    }
  });

  const unsub = eventBus?.on('bpv:changed', () => render());

  return {
    unmount() {
      unsub?.();
      el?.remove();
    },
  };
}
