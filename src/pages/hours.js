import { getHoursByWeek } from '../db.js';
import { icon } from '../icons.js';
import { navigate } from '../router.js';
import { on } from '../state.js';
import {
  getCurrentWeek, getWeekDates, getWeeksInBPV, formatDateShort,
  formatMinutes, weekNumber
} from '../utils.js';
import { DAY_TYPE_LABELS, WEEKLY_GOAL_HOURS } from '../constants.js';

export function createPage(container) {
  const weeks = getWeeksInBPV();
  let currentWeekIdx = weeks.indexOf(getCurrentWeek());
  if (currentWeekIdx < 0) currentWeekIdx = 0;

  let unsub;

  async function render() {
    const weekStr = weeks[currentWeekIdx];
    const dates = getWeekDates(weekStr);
    const entries = await getHoursByWeek(weekStr);
    const entryMap = {};
    entries.forEach(e => entryMap[e.date] = e);

    const totalMinutes = entries
      .filter(e => e.type === 'work')
      .reduce((sum, e) => sum + (e.netMinutes || 0), 0);

    const goalMinutes = WEEKLY_GOAL_HOURS * 60;
    const pct = Math.min(100, Math.round((totalMinutes / goalMinutes) * 100));
    const onTarget = pct >= 90;

    container.innerHTML = `
      <div class="page-header">
        <h2>Urenregistratie</h2>
        <p>Week ${weekNumber(weekStr)} — ${formatMinutes(totalMinutes)} van ${WEEKLY_GOAL_HOURS}u doel</p>
      </div>

      <div class="hours-week-nav">
        <button class="btn btn-icon btn-ghost week-prev" ${currentWeekIdx === 0 ? 'disabled' : ''}>
          ${icon('chevron-left')}
        </button>
        <span class="hours-week-label">Week ${weekNumber(weekStr)}</span>
        <button class="btn btn-icon btn-ghost week-next" ${currentWeekIdx === weeks.length - 1 ? 'disabled' : ''}>
          ${icon('chevron-right')}
        </button>
      </div>

      <div class="progress-bar" style="margin-bottom: var(--space-6)">
        <div class="progress-bar-fill ${onTarget ? 'success' : ''}" style="width: ${pct}%"></div>
      </div>

      <div class="card">
        ${dates.map(date => {
          const entry = entryMap[date];
          const dayLabel = formatDateShort(date);
          if (!entry) {
            return `
              <div class="hours-day-row" data-date="${date}">
                <div class="hours-day-date">${dayLabel}</div>
                <div class="hours-day-times" style="color: var(--color-text-tertiary)">Niet ingevuld</div>
                <div class="hours-day-net">—</div>
              </div>
            `;
          }
          const typeLabel = DAY_TYPE_LABELS[entry.type] || entry.type;
          if (entry.type !== 'work') {
            return `
              <div class="hours-day-row" data-date="${date}">
                <div class="hours-day-date">${dayLabel}</div>
                <div class="hours-day-times"><span class="badge badge-warning">${typeLabel}</span></div>
                <div class="hours-day-net">—</div>
              </div>
            `;
          }
          return `
            <div class="hours-day-row" data-date="${date}">
              <div class="hours-day-date">${dayLabel}</div>
              <div class="hours-day-times">${entry.startTime} – ${entry.endTime} (${entry.breakMinutes}m pauze)</div>
              <div class="hours-day-net">${formatMinutes(entry.netMinutes)}</div>
            </div>
          `;
        }).join('')}
        <div class="hours-week-total">
          <span>Totaal week ${weekNumber(weekStr)}</span>
          <span>${formatMinutes(totalMinutes)}</span>
        </div>
      </div>
    `;

    // Event listeners
    container.querySelector('.week-prev')?.addEventListener('click', () => {
      if (currentWeekIdx > 0) { currentWeekIdx--; render(); }
    });
    container.querySelector('.week-next')?.addEventListener('click', () => {
      if (currentWeekIdx < weeks.length - 1) { currentWeekIdx++; render(); }
    });
    container.querySelectorAll('.hours-day-row').forEach(row => {
      row.addEventListener('click', () => {
        navigate(`hours/${row.dataset.date}`);
      });
    });
  }

  render();
  unsub = on('hours:updated', render);

  return {
    destroy() {
      if (unsub) unsub();
    }
  };
}
