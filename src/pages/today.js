import { getAll, getByIndex } from '../db.js';
import { icon } from '../icons.js';
import { navigate } from '../router.js';
import { on } from '../state.js';
import { getToday, formatDateShort, getISOWeek } from '../utils.js';

const TASKS = [
  { id: 'plan',     label: 'Dagplan ingevuld',          route: 'planning',         minutes: 3,  icon: 'check-circle', color: 'var(--color-purple)' },
  { id: 'hours',    label: 'Uren ingevuld',             route: null,               minutes: 1,  icon: 'clock',        color: 'var(--color-emerald)' },
  { id: 'logbook',  label: 'Logboek geschreven',        route: 'logbook/new',      minutes: 5,  icon: 'book',         color: 'var(--color-amber)' },
  { id: 'learning', label: 'Leermoment toegevoegd',     route: 'learning-moments', minutes: 3,  icon: 'alert-triangle', color: 'var(--color-rose)' },
];

/**
 * Check today's completion status for each daily task.
 */
async function getTodayStatus() {
  const today = getToday();
  const week = getISOWeek(today);

  const [allPlans, allHours, allLogbook, allLearning] = await Promise.all([
    getByIndex('dailyPlans', 'date', today).catch(() => []),
    getAll('hours').then(h => h.filter(e => e.date === today)).catch(() => []),
    getAll('logbook').then(l => l.filter(e => e.date === today)).catch(() => []),
    getAll('learningMoments').then(l => l.filter(e => e.date === today)).catch(() => []),
  ]);

  // dailyPlans index returns a single record or array
  const hasPlan = Array.isArray(allPlans) ? allPlans.length > 0 : !!allPlans;

  return {
    plan:     hasPlan,
    hours:    allHours.length > 0,
    logbook:  allLogbook.length > 0,
    learning: allLearning.length > 0,
  };
}

export function createPage(container) {
  const unsubs = [];
  const today = getToday();

  async function render() {
    const status = await getTodayStatus();
    const openTasks = TASKS.filter(t => !status[t.id]);
    const doneTasks = TASKS.filter(t => status[t.id]);
    const allDone = openTasks.length === 0;
    const totalMinutes = openTasks.reduce((s, t) => s + t.minutes, 0);

    container.innerHTML = `
      <div class="page-header">
        <h2>Vandaag</h2>
        <span class="today-date">${formatDateShort(today)}</span>
      </div>

      ${allDone ? `
        <div class="today-complete card">
          <div class="today-complete-icon">${icon('check-circle', 48)}</div>
          <h3>Alles gedaan!</h3>
          <p>Je dagelijkse taken zijn compleet. Goed bezig!</p>
        </div>
      ` : `
        <div class="today-summary card">
          <div class="today-summary-count">${openTasks.length}</div>
          <div class="today-summary-text">
            <strong>Nog ${openTasks.length} ${openTasks.length === 1 ? 'ding' : 'dingen'} open</strong>
            <span class="today-summary-time">${totalMinutes} min</span>
          </div>
        </div>
      `}

      <div class="today-tasks">
        ${TASKS.map(task => {
          const done = status[task.id];
          const route = task.id === 'hours' ? `hours/${today}` : task.route;
          return `
            <div class="today-task card ${done ? 'today-task-done' : ''}" data-route="${route}">
              <div class="today-task-check" style="--task-color: ${task.color}">
                ${done
                  ? `<span class="today-check-filled">${icon('check-circle', 24)}</span>`
                  : `<span class="today-check-empty"></span>`
                }
              </div>
              <div class="today-task-info">
                <div class="today-task-label ${done ? 'today-task-label-done' : ''}">${task.label}</div>
                ${!done ? `<div class="today-task-time">${task.minutes} min</div>` : ''}
              </div>
              ${!done ? `
                <button class="btn btn-primary btn-sm today-task-cta" data-go="${route}">
                  Nu invullen
                </button>
              ` : ''}
            </div>
          `;
        }).join('')}
      </div>

      <div class="today-progress">
        <div class="today-progress-bar">
          <div class="today-progress-fill" style="width: ${Math.round((doneTasks.length / TASKS.length) * 100)}%"></div>
        </div>
        <div class="today-progress-label">${doneTasks.length}/${TASKS.length} taken</div>
      </div>
    `;

    // Navigate on CTA click
    container.querySelectorAll('[data-go]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        navigate(btn.dataset.go);
      });
    });

    // Navigate on card click (for done tasks, go to the page to review)
    container.querySelectorAll('.today-task').forEach(card => {
      card.addEventListener('click', () => {
        const route = card.dataset.route;
        if (route) navigate(route);
      });
    });
  }

  render();

  // Re-render when any relevant data changes
  const events = [
    'hours:updated', 'logbook:updated', 'planning:updated',
    'learningMoments:updated'
  ];
  events.forEach(evt => unsubs.push(on(evt, render)));

  return {
    destroy() { unsubs.forEach(fn => fn()); }
  };
}
