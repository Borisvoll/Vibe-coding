import { getAll } from '../db.js';
import { icon } from '../icons.js';
import { navigate } from '../router.js';
import { on } from '../state.js';
import {
  getWeeksInBPV, getCurrentWeek, formatMinutes, weekNumber,
  daysRemainingInBPV, getToday, formatDateShort
} from '../utils.js';
import { WEEKLY_GOAL_HOURS, COMPETENCY_LEVELS } from '../constants.js';

export function createPage(container) {
  let unsubs = [];

  async function render() {
    const [allHours, allLogbook, allGoals, allCompetencies, allQuality, allPlans, allWeekReviews] = await Promise.all([
      getAll('hours'),
      getAll('logbook'),
      getAll('goals'),
      getAll('competencies'),
      getAll('quality'),
      getAll('dailyPlans'),
      getAll('weekReviews'),
    ]);

    const weeks = getWeeksInBPV();
    const currentWeek = getCurrentWeek();
    const today = getToday();

    // Total work
    const totalMinutes = allHours.filter(h => h.type === 'work').reduce((s, h) => s + (h.netMinutes || 0), 0);
    const totalGoalMinutes = weeks.length * WEEKLY_GOAL_HOURS * 60;
    const totalPct = Math.min(100, Math.round((totalMinutes / totalGoalMinutes) * 100));

    // Current week
    const weekMinutes = allHours.filter(h => h.week === currentWeek && h.type === 'work').reduce((s, h) => s + (h.netMinutes || 0), 0);
    const weekGoal = WEEKLY_GOAL_HOURS * 60;
    const weekPct = Math.min(100, Math.round((weekMinutes / weekGoal) * 100));

    const daysLeft = daysRemainingInBPV();

    // Sick/absent days
    const sickDays = allHours.filter(h => h.type === 'sick').length;
    const absentDays = allHours.filter(h => h.type === 'absent').length;

    // Week bars
    const weekData = weeks.map(w => {
      const mins = allHours.filter(h => h.week === w && h.type === 'work').reduce((s, h) => s + (h.netMinutes || 0), 0);
      return { week: w, minutes: mins, isCurrent: w === currentWeek };
    });
    const maxWeekMin = Math.max(...weekData.map(d => d.minutes), weekGoal);

    // Today
    const todayEntry = allHours.find(h => h.date === today);
    const todayLogs = allLogbook.filter(l => l.date === today);

    // Goals summary
    const goalsActive = allGoals.filter(g => g.status === 'active' || g.status === 'in_progress').length;
    const goalsCompleted = allGoals.filter(g => g.status === 'completed').length;
    const goalsTotal = allGoals.length;

    // Competencies summary
    const avgLevel = allCompetencies.length > 0
      ? (allCompetencies.reduce((s, c) => s + (c.level || 0), 0) / allCompetencies.length).toFixed(1)
      : '0';
    const compByLevel = [0, 1, 2, 3].map(l => allCompetencies.filter(c => c.level === l).length);

    // Most used tags
    const tagCounts = {};
    allLogbook.forEach(l => (l.tags || []).forEach(t => { tagCounts[t] = (tagCounts[t] || 0) + 1; }));
    const topTags = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);

    container.innerHTML = `
      <div class="dashboard-welcome">
        <h2>Welkom terug, Boris</h2>
        <p>BPV Stage bij Boers & Co — Week ${weekNumber(currentWeek)} van ${weeks.length}</p>
      </div>

      <div class="dashboard-stats">
        <div class="card stat-card" style="--stat-color: var(--color-emerald)">
          <div class="stat-value" style="color: var(--color-emerald)">${formatMinutes(totalMinutes)}</div>
          <div class="stat-label">Totaal gewerkt</div>
          <div class="progress-bar" style="margin-top: var(--space-3)">
            <div class="progress-bar-fill emerald" style="width: ${totalPct}%"></div>
          </div>
          <div class="form-hint" style="margin-top: var(--space-1)">${totalPct}% van ${formatMinutes(totalGoalMinutes)}</div>
        </div>
        <div class="card stat-card" style="--stat-color: var(--color-blue)">
          <div class="stat-value" style="color: var(--color-blue)">${formatMinutes(weekMinutes)}</div>
          <div class="stat-label">Week ${weekNumber(currentWeek)}</div>
          <div class="progress-bar" style="margin-top: var(--space-3)">
            <div class="progress-bar-fill ${weekPct >= 90 ? 'emerald' : weekPct >= 50 ? 'blue' : 'amber'}" style="width: ${weekPct}%"></div>
          </div>
          <div class="form-hint" style="margin-top: var(--space-1)">${weekPct}% van ${WEEKLY_GOAL_HOURS}u doel</div>
        </div>
        <div class="card stat-card" style="--stat-color: var(--color-purple)">
          <div class="stat-value" style="color: var(--color-purple)">${daysLeft}</div>
          <div class="stat-label">Dagen resterend</div>
        </div>
        <div class="card stat-card" style="--stat-color: var(--color-amber)">
          <div class="stat-value" style="color: var(--color-amber)">${allLogbook.length}</div>
          <div class="stat-label">Logboek entries</div>
        </div>
      </div>

      <div class="card dashboard-today" style="border-left: 3px solid var(--color-blue)">
        <h3 style="margin-bottom: var(--space-4)">Vandaag — ${formatDateShort(today)}</h3>
        ${todayEntry
          ? `<p>${icon('check-circle', 14)} ${todayEntry.type === 'work'
              ? `${todayEntry.startTime} – ${todayEntry.endTime} (${formatMinutes(todayEntry.netMinutes)} netto)`
              : todayEntry.type === 'sick' ? 'Ziek gemeld' : todayEntry.type === 'absent' ? 'Afwezig' : 'Vrij'
            }</p>`
          : `<p style="color: var(--color-text-tertiary)">Nog geen uren geregistreerd</p>`
        }
        ${todayLogs.length > 0
          ? `<p style="margin-top: var(--space-2)">${icon('book', 14)} ${todayLogs.length} logboek entr${todayLogs.length === 1 ? 'y' : 'ies'} vandaag</p>`
          : ''
        }
        <div class="dashboard-quick-actions">
          <button class="btn btn-primary btn-sm" data-action="add-hours">
            ${icon('clock', 14)} Uren registreren
          </button>
          <button class="btn btn-secondary btn-sm" data-action="add-log">
            ${icon('book', 14)} Logboek toevoegen
          </button>
          <button class="btn btn-secondary btn-sm" data-action="go-notebook">
            ${icon('edit', 14)} Notebook
          </button>
        </div>
      </div>

      <div class="card" style="margin-bottom: var(--space-8)">
        <h3 style="margin-bottom: var(--space-4)">Weekoverzicht</h3>
        <div class="week-bars">
          ${weekData.map(d => {
            const height = maxWeekMin > 0 ? Math.max(2, (d.minutes / maxWeekMin) * 80) : 2;
            return `
              <div class="week-bar">
                <div class="week-bar-fill ${d.isCurrent ? 'current' : ''}" style="height: ${height}px"></div>
                <span class="week-bar-label">W${weekNumber(d.week)}</span>
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <h3 style="margin-bottom: var(--space-4)">Overzicht per module</h3>
      <div class="dashboard-grid">
        <div class="card card-clickable dashboard-module-card card-color-left" style="--card-color: var(--color-emerald)" data-nav="hours">
          <div class="icon-circle icon-circle-emerald">${icon('clock')}</div>
          <div class="dashboard-module-info">
            <h4>Uren</h4>
            <p>${allHours.filter(h => h.type === 'work').length} werkdagen geregistreerd</p>
            <div class="dashboard-module-stat" style="color: var(--color-emerald)">${formatMinutes(totalMinutes)}</div>
            ${sickDays > 0 || absentDays > 0 ? `<div class="form-hint">${sickDays > 0 ? `${sickDays} ziek` : ''}${sickDays > 0 && absentDays > 0 ? ' / ' : ''}${absentDays > 0 ? `${absentDays} afwezig` : ''}</div>` : ''}
          </div>
        </div>

        <div class="card card-clickable dashboard-module-card card-color-left" style="--card-color: var(--color-amber)" data-nav="logbook">
          <div class="icon-circle icon-circle-amber">${icon('book')}</div>
          <div class="dashboard-module-info">
            <h4>Logboek</h4>
            <p>${allLogbook.length} entries</p>
            ${topTags.length > 0
              ? `<div style="display:flex;gap:4px;flex-wrap:wrap;margin-top:var(--space-1)">${topTags.map(([tag, count]) => `<span class="badge badge-amber">${tag} (${count})</span>`).join('')}</div>`
              : '<div class="form-hint">Nog geen entries</div>'
            }
          </div>
        </div>

        <div class="card card-clickable dashboard-module-card card-color-left" style="--card-color: var(--color-rose)" data-nav="goals">
          <div class="icon-circle icon-circle-rose">${icon('target')}</div>
          <div class="dashboard-module-info">
            <h4>Leerdoelen</h4>
            <p>${goalsTotal} doelen${goalsCompleted > 0 ? ` — ${goalsCompleted} afgerond` : ''}</p>
            ${goalsTotal > 0
              ? `<div class="progress-bar" style="margin-top:var(--space-2)"><div class="progress-bar-fill rose" style="width:${goalsTotal > 0 ? Math.round((goalsCompleted / goalsTotal) * 100) : 0}%"></div></div>`
              : '<div class="form-hint">Nog geen doelen</div>'
            }
          </div>
        </div>

        <div class="card card-clickable dashboard-module-card card-color-left" style="--card-color: var(--color-cyan)" data-nav="competencies">
          <div class="icon-circle icon-circle-cyan">${icon('chart')}</div>
          <div class="dashboard-module-info">
            <h4>Competenties</h4>
            <p>${allCompetencies.length} competenties — gem. ${avgLevel}</p>
            ${allCompetencies.length > 0
              ? `<div style="display:flex;gap:6px;margin-top:var(--space-1);font-size:0.75rem">
                  <span class="badge badge-default">${compByLevel[0]} Starter</span>
                  <span class="badge badge-amber">${compByLevel[1]} Ontw.</span>
                  <span class="badge badge-emerald">${compByLevel[2]} Gewenst</span>
                  <span class="badge badge-blue">${compByLevel[3]} Gevord.</span>
                </div>`
              : '<div class="form-hint">Nog niet ingevuld</div>'
            }
          </div>
        </div>

        <div class="card card-clickable dashboard-module-card card-color-left" style="--card-color: var(--color-indigo)" data-nav="quality">
          <div class="icon-circle icon-circle-indigo">${icon('shield')}</div>
          <div class="dashboard-module-info">
            <h4>Kwaliteit</h4>
            <p>${allQuality.length} meetplannen</p>
            <div class="form-hint">${allQuality.length > 0 ? 'Kwaliteitsborging actief' : 'Nog geen meetplannen'}</div>
          </div>
        </div>

        <div class="card card-clickable dashboard-module-card card-color-left" style="--card-color: var(--color-purple)" data-nav="planning">
          <div class="icon-circle icon-circle-purple">${icon('check-circle')}</div>
          <div class="dashboard-module-info">
            <h4>Dagplannen</h4>
            <p>${allPlans.length} dagplannen</p>
            <div class="form-hint">${allWeekReviews.length} weekreviews</div>
          </div>
        </div>

        <div class="card card-clickable dashboard-module-card card-color-left" style="--card-color: var(--color-pink)" data-nav="notebook">
          <div class="icon-circle icon-circle-pink">${icon('edit')}</div>
          <div class="dashboard-module-info">
            <h4>Notebook</h4>
            <p>Notities voor je verslag</p>
            <div class="form-hint">Schrijf en bewaar</div>
          </div>
        </div>

        <div class="card card-clickable dashboard-module-card card-color-left" style="--card-color: var(--color-teal)" data-nav="report">
          <div class="icon-circle icon-circle-teal">${icon('file-text')}</div>
          <div class="dashboard-module-info">
            <h4>Verslag</h4>
            <p>BPV Verslag genereren</p>
            <div class="form-hint">Print-ready HTML export</div>
          </div>
        </div>
      </div>
    `;

    // Event listeners
    container.querySelector('[data-action="add-hours"]')?.addEventListener('click', () => navigate(`hours/${today}`));
    container.querySelector('[data-action="add-log"]')?.addEventListener('click', () => navigate('logbook/new'));
    container.querySelector('[data-action="go-notebook"]')?.addEventListener('click', () => navigate('notebook'));

    container.querySelectorAll('[data-nav]').forEach(card => {
      card.addEventListener('click', () => navigate(card.dataset.nav));
    });
  }

  render();
  unsubs.push(on('hours:updated', render));
  unsubs.push(on('logbook:updated', render));

  return {
    destroy() { unsubs.forEach(fn => fn()); }
  };
}
