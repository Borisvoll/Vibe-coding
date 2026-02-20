import { getTasksByProject } from '../../stores/tasks.js';
import { escapeHTML, getToday } from '../../utils.js';

const DAY_NAMES = ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo'];
const MONTH_NAMES = [
  'Januari', 'Februari', 'Maart', 'April', 'Mei', 'Juni',
  'Juli', 'Augustus', 'September', 'Oktober', 'November', 'December',
];

export function renderMonthGrid(host, project, context) {
  const today = getToday();
  let viewYear = parseInt(today.slice(0, 4), 10);
  let viewMonth = parseInt(today.slice(5, 7), 10) - 1; // 0-based
  let selectedDay = null;

  async function render() {
    const tasks = await getTasksByProject(project.id);
    const tasksByDate = {};
    for (const t of tasks) {
      if (!t.date) continue;
      if (!tasksByDate[t.date]) tasksByDate[t.date] = [];
      tasksByDate[t.date].push(t);
    }

    const firstDay = new Date(viewYear, viewMonth, 1);
    const lastDay = new Date(viewYear, viewMonth + 1, 0);
    // Monday-based: 0=Mon, 6=Sun
    const startOffset = (firstDay.getDay() + 6) % 7;
    const daysInMonth = lastDay.getDate();

    const monthLabel = `${MONTH_NAMES[viewMonth]} ${viewYear}`;

    let gridHtml = '';
    // Empty cells before first day
    for (let i = 0; i < startOffset; i++) {
      gridHtml += '<div class="agenda-grid__cell agenda-grid__cell--empty"></div>';
    }
    // Day cells
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const isToday = dateStr === today;
      const isSelected = dateStr === selectedDay;
      const dayTasks = tasksByDate[dateStr] || [];
      const hasTasks = dayTasks.length > 0;
      const hasDone = dayTasks.some((t) => t.status === 'done');
      const allDone = hasTasks && dayTasks.every((t) => t.status === 'done');

      const classes = [
        'agenda-grid__cell',
        isToday ? 'agenda-grid__cell--today' : '',
        isSelected ? 'agenda-grid__cell--selected' : '',
        hasTasks ? 'agenda-grid__cell--has-tasks' : '',
      ].filter(Boolean).join(' ');

      const dot = hasTasks
        ? `<span class="agenda-grid__dot ${allDone ? 'agenda-grid__dot--done' : ''}"></span>`
        : '';

      gridHtml += `
        <button type="button" class="${classes}" data-date="${dateStr}">
          <span class="agenda-grid__day-num">${d}</span>
          ${dot}
        </button>`;
    }

    // Day detail (tasks for selected day)
    let dayDetailHtml = '';
    if (selectedDay && tasksByDate[selectedDay]) {
      const dayTasks = tasksByDate[selectedDay];
      dayDetailHtml = `
        <div class="agenda-grid__day-detail">
          <h4 class="agenda-grid__day-label">${formatDate(selectedDay)}</h4>
          <ul class="agenda-grid__day-tasks">
            ${dayTasks.map((t) => `
              <li class="agenda-grid__task-item ${t.status === 'done' ? 'agenda-grid__task-item--done' : ''}">
                ${escapeHTML(t.text)}
              </li>
            `).join('')}
          </ul>
        </div>`;
    } else if (selectedDay) {
      dayDetailHtml = `
        <div class="agenda-grid__day-detail">
          <h4 class="agenda-grid__day-label">${formatDate(selectedDay)}</h4>
          <p class="agenda-grid__no-tasks">Geen taken op deze dag.</p>
        </div>`;
    }

    // Milestone markers on month
    const milestones = (project.milestones || []).filter((m) => {
      return m.date && m.date.startsWith(`${viewYear}-${String(viewMonth + 1).padStart(2, '0')}`);
    });
    const milestoneHtml = milestones.length > 0 ? `
      <div class="agenda-grid__milestones">
        ${milestones.map((m) => `
          <span class="agenda-grid__milestone" title="${escapeHTML(m.title)}">
            ◆ ${escapeHTML(m.title)} — ${formatDate(m.date)}
          </span>
        `).join('')}
      </div>` : '';

    host.innerHTML = `
      <div class="agenda-grid">
        <div class="agenda-grid__nav">
          <button type="button" class="btn btn-ghost btn-sm" data-month-prev>←</button>
          <span class="agenda-grid__month-label">${monthLabel}</span>
          <button type="button" class="btn btn-ghost btn-sm" data-month-next>→</button>
        </div>
        <div class="agenda-grid__header">
          ${DAY_NAMES.map((d) => `<div class="agenda-grid__day-name">${d}</div>`).join('')}
        </div>
        <div class="agenda-grid__body">
          ${gridHtml}
        </div>
        ${milestoneHtml}
        ${dayDetailHtml}
      </div>
    `;

    // Bind day clicks
    host.querySelectorAll('[data-date]').forEach((cell) => {
      cell.addEventListener('click', () => {
        selectedDay = selectedDay === cell.dataset.date ? null : cell.dataset.date;
        render();
      });
    });

    // Bind month navigation
    host.querySelector('[data-month-prev]')?.addEventListener('click', () => {
      viewMonth--;
      if (viewMonth < 0) { viewMonth = 11; viewYear--; }
      selectedDay = null;
      render();
    });
    host.querySelector('[data-month-next]')?.addEventListener('click', () => {
      viewMonth++;
      if (viewMonth > 11) { viewMonth = 0; viewYear++; }
      selectedDay = null;
      render();
    });
  }

  render();

  return {
    unmount() { host.innerHTML = ''; },
  };
}

function formatDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return `${d} ${MONTH_NAMES[m - 1]} ${y}`;
}
