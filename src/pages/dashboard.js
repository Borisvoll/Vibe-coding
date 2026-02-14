import { getAll, getHoursByWeek } from '../db.js';
import { icon } from '../icons.js';
import { navigate } from '../router.js';
import { on } from '../state.js';
import {
  getWeeksInBPV, getCurrentWeek, formatMinutes, weekNumber,
  daysRemainingInBPV, getToday, formatDateShort
} from '../utils.js';
import { WEEKLY_GOAL_HOURS } from '../constants.js';

export function createPage(container) {
  let unsubs = [];

  async function render() {
    const allHours = await getAll('hours');
    const allLogbook = await getAll('logbook');
    const weeks = getWeeksInBPV();
    const currentWeek = getCurrentWeek();

    // Total work minutes
    const totalMinutes = allHours
      .filter(h => h.type === 'work')
      .reduce((sum, h) => sum + (h.netMinutes || 0), 0);

    const totalGoalMinutes = weeks.length * WEEKLY_GOAL_HOURS * 60;
    const totalPct = Math.min(100, Math.round((totalMinutes / totalGoalMinutes) * 100));

    // Current week
    const weekEntries = allHours.filter(h => h.week === currentWeek && h.type === 'work');
    const weekMinutes = weekEntries.reduce((sum, h) => sum + (h.netMinutes || 0), 0);
    const weekGoal = WEEKLY_GOAL_HOURS * 60;
    const weekPct = Math.min(100, Math.round((weekMinutes / weekGoal) * 100));

    // Days remaining
    const daysLeft = daysRemainingInBPV();

    // Week bar chart data
    const weekData = await Promise.all(weeks.map(async (w) => {
      const entries = allHours.filter(h => h.week === w && h.type === 'work');
      const mins = entries.reduce((sum, h) => sum + (h.netMinutes || 0), 0);
      return { week: w, minutes: mins, isCurrent: w === currentWeek };
    }));
    const maxWeekMin = Math.max(...weekData.map(d => d.minutes), weekGoal);

    // Today
    const today = getToday();
    const todayEntry = allHours.find(h => h.date === today);
    const todayLogs = allLogbook.filter(l => l.date === today);

    container.innerHTML = `
      <div class="page-header">
        <h2>Dashboard</h2>
        <p>BPV Voortgang Tracker</p>
      </div>

      <div class="dashboard-stats">
        <div class="card stat-card">
          <div class="stat-value">${formatMinutes(totalMinutes)}</div>
          <div class="stat-label">Totaal gewerkt</div>
          <div class="progress-bar" style="margin-top: var(--space-3)">
            <div class="progress-bar-fill" style="width: ${totalPct}%"></div>
          </div>
          <div class="form-hint" style="margin-top: var(--space-1)">${totalPct}% van ${formatMinutes(totalGoalMinutes)}</div>
        </div>
        <div class="card stat-card">
          <div class="stat-value">${formatMinutes(weekMinutes)}</div>
          <div class="stat-label">Week ${weekNumber(currentWeek)}</div>
          <div class="progress-bar" style="margin-top: var(--space-3)">
            <div class="progress-bar-fill ${weekPct >= 90 ? 'success' : weekPct >= 50 ? '' : 'warning'}" style="width: ${weekPct}%"></div>
          </div>
          <div class="form-hint" style="margin-top: var(--space-1)">${weekPct}% van ${WEEKLY_GOAL_HOURS}u doel</div>
        </div>
        <div class="card stat-card">
          <div class="stat-value">${daysLeft}</div>
          <div class="stat-label">Dagen resterend</div>
        </div>
        <div class="card stat-card">
          <div class="stat-value">${allLogbook.length}</div>
          <div class="stat-label">Logboek entries</div>
        </div>
      </div>

      <div class="card dashboard-today">
        <h3 style="margin-bottom: var(--space-4)">Vandaag — ${formatDateShort(today)}</h3>
        ${todayEntry
          ? `<p>Uren: ${todayEntry.type === 'work'
              ? `${todayEntry.startTime} – ${todayEntry.endTime} (${formatMinutes(todayEntry.netMinutes)} netto)`
              : todayEntry.type === 'sick' ? 'Ziek' : todayEntry.type === 'absent' ? 'Afwezig' : 'Vrij'
            }</p>`
          : `<p style="color: var(--color-text-tertiary)">Nog geen uren geregistreerd</p>`
        }
        ${todayLogs.length > 0
          ? `<p style="margin-top: var(--space-2)">${todayLogs.length} logboek entr${todayLogs.length === 1 ? 'y' : 'ies'} vandaag</p>`
          : ''
        }
        <div class="dashboard-quick-actions">
          <button class="btn btn-primary btn-sm" data-action="add-hours">
            ${icon('clock', 14)} Uren registreren
          </button>
          <button class="btn btn-secondary btn-sm" data-action="add-log">
            ${icon('book', 14)} Logboek toevoegen
          </button>
        </div>
      </div>

      <div class="card">
        <h3 style="margin-bottom: var(--space-4)">Weekoverzicht</h3>
        <div class="week-bars">
          ${weekData.map(d => {
            const height = maxWeekMin > 0 ? Math.max(2, (d.minutes / maxWeekMin) * 70) : 2;
            return `
              <div class="week-bar">
                <div class="week-bar-fill ${d.isCurrent ? 'current' : ''}" style="height: ${height}px"></div>
                <span class="week-bar-label">W${weekNumber(d.week)}</span>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;

    // Quick action listeners
    container.querySelector('[data-action="add-hours"]')?.addEventListener('click', () => {
      navigate(`hours/${today}`);
    });
    container.querySelector('[data-action="add-log"]')?.addEventListener('click', () => {
      navigate('logbook/new');
    });
  }

  render();
  unsubs.push(on('hours:updated', render));
  unsubs.push(on('logbook:updated', render));

  return {
    destroy() {
      unsubs.forEach(fn => fn());
    }
  };
}
