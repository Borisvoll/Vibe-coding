import { getAll, getByIndex, getSetting } from '../db.js';
import { icon } from '../icons.js';
import { navigate } from '../router.js';
import { on } from '../state.js';
import {
  getToday, formatDateShort, getISOWeek, formatMinutes,
  getWeeksInBPV, getCurrentWeek, weekNumber, daysRemainingInBPV
} from '../utils.js';
import { WEEKLY_GOAL_HOURS } from '../constants.js';

const DAILY_TASKS = [
  { id: 'plan',     label: 'Dagplan ingevuld',      route: 'planning',         minutes: 3, icon: 'check-circle', color: 'var(--color-purple)' },
  { id: 'hours',    label: 'Uren ingevuld',          route: null,               minutes: 1, icon: 'clock',        color: 'var(--color-emerald)' },
  { id: 'logbook',  label: 'Logboek geschreven',     route: 'logbook/new',      minutes: 5, icon: 'book',         color: 'var(--color-amber)' },
  { id: 'learning', label: 'Leermoment toegevoegd',  route: 'learning-moments', minutes: 3, icon: 'alert-triangle', color: 'var(--color-rose)' },
];

const VERSLAG_MODULES = [
  { id: 'hours',        label: 'Uren',              icon: 'clock',        color: 'var(--color-emerald)',  route: 'hours' },
  { id: 'logbook',      label: 'Logboek',           icon: 'book',         color: 'var(--color-amber)',    route: 'logbook' },
  { id: 'bpv',          label: 'BPV Opdrachten',    icon: 'clipboard',    color: 'var(--color-blue)',     route: 'bpv-opdrachten' },
  { id: 'competencies', label: 'Competenties',       icon: 'chart',        color: 'var(--color-cyan)',     route: 'competencies' },
  { id: 'quality',      label: 'Kwaliteit',         icon: 'shield',       color: 'var(--color-indigo)',   route: 'quality' },
  { id: 'learning',     label: 'Leeranalyse',       icon: 'alert-triangle', color: 'var(--color-rose)',   route: 'learning-moments' },
  { id: 'planning',     label: 'Planning',          icon: 'check-circle', color: 'var(--color-purple)',   route: 'planning' },
  { id: 'report',       label: 'Verslag',           icon: 'file-text',    color: 'var(--color-teal)',     route: 'report' },
];

export function createPage(container) {
  const unsubs = [];
  const today = getToday();

  async function render() {
    // Load all data
    const [
      allHours, allLogbook, allPlans, allWeekReviews,
      allGoals, allCompetencies, allQuality, allLearning,
      bpvLeerdoelen, bpvProducten, bpvReflecties, bpvBedrijfRecords,
      assignments,
      userName, companyName,
      todayPlan
    ] = await Promise.all([
      getAll('hours'),
      getAll('logbook'),
      getAll('dailyPlans'),
      getAll('weekReviews'),
      getAll('goals'),
      getAll('competencies'),
      getAll('quality'),
      getAll('learningMoments'),
      getAll('bpvLeerdoelen'),
      getAll('bpvProducten'),
      getAll('bpvReflecties'),
      getAll('bpvBedrijf'),
      getAll('assignments'),
      getSetting('user_name'),
      getSetting('company_name'),
      getByIndex('dailyPlans', 'date', today).catch(() => []),
    ]);

    const bpvBedrijf = bpvBedrijfRecords[0] || null;
    const leerdoelen = assignments.find(a => a.type === 'leerdoelen');
    const productgericht = assignments.find(a => a.type === 'productgericht');
    const reflectie = assignments.find(a => a.type === 'reflectie');

    // Week & time calculations
    const weeks = getWeeksInBPV();
    const currentWeek = getCurrentWeek();
    const totalMinutes = allHours.filter(h => h.type === 'work').reduce((s, h) => s + (h.netMinutes || 0), 0);
    const totalGoalMinutes = weeks.length * WEEKLY_GOAL_HOURS * 60;
    const totalPct = Math.min(100, Math.round((totalMinutes / totalGoalMinutes) * 100));
    const weekMinutes = allHours.filter(h => h.week === currentWeek && h.type === 'work').reduce((s, h) => s + (h.netMinutes || 0), 0);
    const weekPct = Math.min(100, Math.round((weekMinutes / (WEEKLY_GOAL_HOURS * 60)) * 100));
    const daysLeft = daysRemainingInBPV();

    // Today status
    const todayHours = allHours.filter(e => e.date === today);
    const todayLogs = allLogbook.filter(e => e.date === today);
    const todayLearning = allLearning.filter(e => e.date === today);
    const hasPlan = Array.isArray(todayPlan) ? todayPlan.length > 0 : !!todayPlan;

    const taskStatus = {
      plan: hasPlan,
      hours: todayHours.length > 0,
      logbook: todayLogs.length > 0,
      learning: todayLearning.length > 0,
    };
    const openTasks = DAILY_TASKS.filter(t => !taskStatus[t.id]);
    const doneTasks = DAILY_TASKS.filter(t => taskStatus[t.id]);
    const allDone = openTasks.length === 0;

    // Verslag progress checks
    const hasNewBedrijf = bpvBedrijf?.beschrijving?.trim();
    const hasNewLeerdoelen = bpvLeerdoelen.length > 0;
    const hasNewProducten = bpvProducten.length > 0;
    const hasNewReflecties = bpvReflecties.length > 0;

    const checks = [
      { label: 'Uren geregistreerd',       ok: allHours.length > 0,                                                                          route: 'hours' },
      { label: 'Logboek entries',           ok: allLogbook.length > 0,                                                                        route: 'logbook' },
      { label: 'Bedrijfsbeschrijving',      ok: !!(hasNewBedrijf || leerdoelen?.fields?.bedrijfsbeschrijving?.trim()),                         route: 'bpv-opdrachten' },
      { label: 'SMART leerdoelen',          ok: hasNewLeerdoelen || !!leerdoelen?.fields?.leerdoel1?.trim(),                                   route: 'bpv-opdrachten' },
      { label: 'Werkzaamheden beschreven',  ok: hasNewProducten || !!productgericht?.fields?.project1_beschrijving?.trim(),                    route: 'bpv-opdrachten' },
      { label: 'Competenties ingevuld',     ok: allCompetencies.length > 0,                                                                   route: 'competencies' },
      { label: 'Kwaliteitsplannen',         ok: allQuality.length > 0,                                                                        route: 'quality' },
      { label: 'Leermomenten',              ok: allLearning.length > 0,                                                                       route: 'learning-moments' },
      { label: 'Weekreviews',               ok: allWeekReviews.length > 0,                                                                    route: 'planning' },
      { label: 'Reflectie',                 ok: hasNewReflecties || !!reflectie?.fields?.wat_goed?.trim(),                                     route: 'bpv-opdrachten' },
      { label: 'Engelse beschrijving',      ok: bpvProducten.some(p => p.engelsToelichting?.trim()) || !!productgericht?.fields?.engelse_uitleg?.trim(), route: 'bpv-opdrachten' },
    ];
    const checksDone = checks.filter(c => c.ok).length;
    const checksPct = Math.round((checksDone / checks.length) * 100);

    container.innerHTML = `
      <!-- Welcome -->
      <div class="hub-header">
        <div class="hub-header-text">
          <h2>${userName ? `Hoi ${userName}` : 'Vandaag'}</h2>
          <p>${formatDateShort(today)}${companyName ? ` — ${companyName}` : ''} — Week ${weekNumber(currentWeek)} van ${weeks.length}</p>
        </div>
      </div>

      <!-- Key Stats -->
      <div class="hub-stats">
        <div class="hub-stat" style="--stat-color: var(--color-emerald)">
          <div class="hub-stat-value">${formatMinutes(totalMinutes)}</div>
          <div class="hub-stat-label">Totaal</div>
          <div class="hub-stat-bar"><div class="hub-stat-fill emerald" style="width:${totalPct}%"></div></div>
          <div class="hub-stat-hint">${totalPct}%</div>
        </div>
        <div class="hub-stat" style="--stat-color: var(--color-blue)">
          <div class="hub-stat-value">${formatMinutes(weekMinutes)}</div>
          <div class="hub-stat-label">Week ${weekNumber(currentWeek)}</div>
          <div class="hub-stat-bar"><div class="hub-stat-fill ${weekPct >= 90 ? 'emerald' : weekPct >= 50 ? 'blue' : 'amber'}" style="width:${weekPct}%"></div></div>
          <div class="hub-stat-hint">${weekPct}% van ${WEEKLY_GOAL_HOURS}u</div>
        </div>
        <div class="hub-stat" style="--stat-color: var(--color-purple)">
          <div class="hub-stat-value">${daysLeft}</div>
          <div class="hub-stat-label">Dagen over</div>
        </div>
        <div class="hub-stat" style="--stat-color: var(--color-amber)">
          <div class="hub-stat-value">${allLogbook.length}</div>
          <div class="hub-stat-label">Logboek</div>
        </div>
      </div>

      <!-- Daily Tasks -->
      <div class="hub-section">
        <div class="hub-section-header">
          <h3>${icon('clipboard-check', 18)} Dagelijkse taken</h3>
          <span class="hub-section-badge ${allDone ? 'badge-emerald' : 'badge-amber'}">${doneTasks.length}/${DAILY_TASKS.length}</span>
        </div>
        ${allDone ? `
          <div class="hub-done-banner">
            ${icon('check-circle', 28)}
            <span>Alles gedaan! Goed bezig.</span>
          </div>
        ` : ''}
        <div class="hub-tasks">
          ${DAILY_TASKS.map(task => {
            const done = taskStatus[task.id];
            const route = task.id === 'hours' ? `hours/${today}` : task.route;
            return `
              <div class="hub-task ${done ? 'hub-task-done' : ''}" data-route="${route}">
                <div class="hub-task-check" style="--task-color: ${task.color}">
                  ${done
                    ? `<span class="hub-check-filled">${icon('check-circle', 20)}</span>`
                    : `<span class="hub-check-empty"></span>`
                  }
                </div>
                <span class="hub-task-label ${done ? 'hub-task-struck' : ''}">${task.label}</span>
                ${!done ? `<button class="btn btn-primary btn-sm hub-task-go" data-go="${route}">Invullen</button>` : ''}
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <!-- Verslag Progress -->
      <div class="hub-section">
        <div class="hub-section-header">
          <h3>${icon('file-text', 18)} Verslag voortgang</h3>
          <span class="hub-section-badge ${checksPct === 100 ? 'badge-emerald' : checksPct >= 60 ? 'badge-blue' : 'badge-amber'}">${checksDone}/${checks.length}</span>
        </div>
        <div class="hub-progress-bar"><div class="hub-progress-fill ${checksPct === 100 ? 'emerald' : checksPct >= 60 ? 'blue' : 'amber'}" style="width:${checksPct}%"></div></div>
        <div class="hub-checks">
          ${checks.map(c => `
            <div class="hub-check-item ${c.ok ? 'hub-check-ok' : ''}" ${!c.ok ? `data-go="${c.route}"` : ''}>
              <span class="hub-check-icon">${c.ok ? icon('check-circle', 16) : '&#9675;'}</span>
              <span class="hub-check-label">${c.label}</span>
              ${!c.ok ? `<span class="hub-check-action">${icon('chevron-right', 14)}</span>` : ''}
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Quick Access -->
      <div class="hub-section">
        <div class="hub-section-header">
          <h3>${icon('zap', 18)} Snel naar</h3>
        </div>
        <div class="hub-modules">
          ${VERSLAG_MODULES.map(m => `
            <div class="hub-module" data-nav="${m.route}">
              <div class="hub-module-icon" style="color:${m.color}">${icon(m.icon, 20)}</div>
              <span>${m.label}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    // Event listeners: task CTA buttons
    container.querySelectorAll('[data-go]').forEach(el => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        navigate(el.dataset.go);
      });
    });

    // Event listeners: task card clicks
    container.querySelectorAll('.hub-task').forEach(card => {
      card.addEventListener('click', () => {
        const route = card.dataset.route;
        if (route) navigate(route);
      });
    });

    // Event listeners: quick access modules
    container.querySelectorAll('[data-nav]').forEach(el => {
      el.addEventListener('click', () => navigate(el.dataset.nav));
    });
  }

  render();

  // Re-render on relevant data changes
  const events = [
    'hours:updated', 'logbook:updated', 'planning:updated',
    'learningMoments:updated', 'competencies:updated', 'assignments:updated'
  ];
  events.forEach(evt => unsubs.push(on(evt, render)));

  return {
    destroy() { unsubs.forEach(fn => fn()); }
  };
}
