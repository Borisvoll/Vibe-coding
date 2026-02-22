import { getTasksByProject, updateTask } from '../../stores/tasks.js';
import { escapeHTML, getToday } from '../../utils.js';

const DAY_NAMES = ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo'];
const MONTH_NAMES = [
  'Januari', 'Februari', 'Maart', 'April', 'Mei', 'Juni',
  'Juli', 'Augustus', 'September', 'Oktober', 'November', 'December',
];

export function renderMonthGrid(host, project, context) {
  const { eventBus } = context;
  const today = getToday();
  let viewYear = parseInt(today.slice(0, 4), 10);
  let viewMonth = parseInt(today.slice(5, 7), 10) - 1;
  let selectedDay = null;
  let viewMode = 'month'; // 'month' | 'week'
  let weekOffset = 0;
  let dragTaskId = null;

  function getWeekStart(offset) {
    const d = new Date(getToday() + 'T00:00:00');
    const dayOfWeek = (d.getDay() + 6) % 7;
    d.setDate(d.getDate() - dayOfWeek + offset * 7);
    return d;
  }

  async function render() {
    const tasks = await getTasksByProject(project.id);
    const tasksByDate = {};
    for (const t of tasks) {
      if (!t.date) continue;
      if (!tasksByDate[t.date]) tasksByDate[t.date] = [];
      tasksByDate[t.date].push(t);
    }

    if (viewMode === 'week') {
      renderWeekView(tasksByDate, tasks);
    } else {
      renderMonthView(tasksByDate);
    }
  }

  function renderWeekView(tasksByDate, allTasks) {
    const weekStart = getWeekStart(weekOffset);
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      days.push(d.toISOString().slice(0, 10));
    }

    const weekStartStr = weekStart.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' });
    const weekEndDate = new Date(weekStart);
    weekEndDate.setDate(weekEndDate.getDate() + 6);
    const weekEndStr = weekEndDate.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' });

    // Tasks without a date (backlog)
    const unplanned = allTasks.filter((t) => !t.date && t.status !== 'done');

    host.innerHTML = `
      <div class="agenda-grid">
        <div class="agenda-grid__nav">
          <button type="button" class="btn btn-ghost btn-sm" data-view-toggle>Maand</button>
          <button type="button" class="btn btn-ghost btn-sm" data-week-prev>\u2190</button>
          <span class="agenda-grid__month-label">${weekStartStr} \u2013 ${weekEndStr}</span>
          <button type="button" class="btn btn-ghost btn-sm" data-week-next>\u2192</button>
        </div>
        <div class="agenda-week-grid">
          ${days.map((d, i) => {
            const isToday = d === today;
            const dayTasks = tasksByDate[d] || [];
            return `
              <div class="agenda-week-col ${isToday ? 'agenda-week-col--today' : ''}" data-drop-date="${d}">
                <div class="agenda-week-col__header">
                  <span class="agenda-week-col__name">${DAY_NAMES[i]}</span>
                  <span class="agenda-week-col__num">${parseInt(d.slice(8), 10)}</span>
                </div>
                <div class="agenda-week-col__body" data-drop-zone="${d}">
                  ${dayTasks.map((t) => renderWeekTask(t)).join('')}
                </div>
              </div>
            `;
          }).join('')}
        </div>
        ${unplanned.length > 0 ? `
          <div class="agenda-week-backlog">
            <span class="agenda-week-backlog__label">Ongepland (${unplanned.length})</span>
            <div class="agenda-week-backlog__items" data-drop-zone="backlog">
              ${unplanned.map((t) => renderWeekTask(t)).join('')}
            </div>
          </div>
        ` : ''}
      </div>
    `;

    bindWeekEvents();
  }

  function renderWeekTask(task) {
    const isDone = task.status === 'done';
    return `
      <div class="agenda-week-task ${isDone ? 'agenda-week-task--done' : ''}"
        draggable="${isDone ? 'false' : 'true'}" data-task-drag="${task.id}">
        <span class="agenda-week-task__dot ${isDone ? 'agenda-week-task__dot--done' : ''}"></span>
        <span class="agenda-week-task__text">${escapeHTML(task.text)}</span>
      </div>
    `;
  }

  function bindWeekEvents() {
    // View toggle
    host.querySelector('[data-view-toggle]')?.addEventListener('click', () => {
      viewMode = 'month';
      render();
    });

    // Week navigation
    host.querySelector('[data-week-prev]')?.addEventListener('click', () => { weekOffset--; render(); });
    host.querySelector('[data-week-next]')?.addEventListener('click', () => { weekOffset++; render(); });

    // Drag & drop
    const draggables = host.querySelectorAll('[data-task-drag]');
    const dropZones = host.querySelectorAll('[data-drop-zone]');

    draggables.forEach((el) => {
      el.addEventListener('dragstart', (e) => {
        dragTaskId = el.dataset.taskDrag;
        e.dataTransfer.effectAllowed = 'move';
        el.classList.add('agenda-week-task--dragging');
      });
      el.addEventListener('dragend', () => {
        el.classList.remove('agenda-week-task--dragging');
        dragTaskId = null;
        host.querySelectorAll('.agenda-week-col--drop-target').forEach((z) => {
          z.classList.remove('agenda-week-col--drop-target');
        });
      });
    });

    dropZones.forEach((zone) => {
      const col = zone.closest('[data-drop-date]') || zone;
      zone.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        col.classList.add('agenda-week-col--drop-target');
      });
      zone.addEventListener('dragleave', (e) => {
        if (!zone.contains(e.relatedTarget)) {
          col.classList.remove('agenda-week-col--drop-target');
        }
      });
      zone.addEventListener('drop', async (e) => {
        e.preventDefault();
        col.classList.remove('agenda-week-col--drop-target');
        if (!dragTaskId) return;
        const newDate = zone.dataset.dropZone === 'backlog' ? null : zone.dataset.dropZone;
        await updateTask(dragTaskId, { date: newDate });
        dragTaskId = null;
        eventBus?.emit('tasks:changed');
        await render();
      });
    });
  }

  function renderMonthView(tasksByDate) {
    const firstDay = new Date(viewYear, viewMonth, 1);
    const lastDay = new Date(viewYear, viewMonth + 1, 0);
    const startOffset = (firstDay.getDay() + 6) % 7;
    const daysInMonth = lastDay.getDate();

    const monthLabel = `${MONTH_NAMES[viewMonth]} ${viewYear}`;

    let gridHtml = '';
    for (let i = 0; i < startOffset; i++) {
      gridHtml += '<div class="agenda-grid__cell agenda-grid__cell--empty"></div>';
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const isToday = dateStr === today;
      const isSelected = dateStr === selectedDay;
      const dayTasks = tasksByDate[dateStr] || [];
      const hasTasks = dayTasks.length > 0;
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

    const milestones = (project.milestones || []).filter((m) => {
      return m.date && m.date.startsWith(`${viewYear}-${String(viewMonth + 1).padStart(2, '0')}`);
    });
    const milestoneHtml = milestones.length > 0 ? `
      <div class="agenda-grid__milestones">
        ${milestones.map((m) => `
          <span class="agenda-grid__milestone" title="${escapeHTML(m.title)}">
            \u25C6 ${escapeHTML(m.title)} \u2014 ${formatDate(m.date)}
          </span>
        `).join('')}
      </div>` : '';

    host.innerHTML = `
      <div class="agenda-grid">
        <div class="agenda-grid__nav">
          <button type="button" class="btn btn-ghost btn-sm" data-view-toggle>Week</button>
          <button type="button" class="btn btn-ghost btn-sm" data-month-prev>\u2190</button>
          <span class="agenda-grid__month-label">${monthLabel}</span>
          <button type="button" class="btn btn-ghost btn-sm" data-month-next>\u2192</button>
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

    bindMonthEvents();
  }

  function bindMonthEvents() {
    host.querySelector('[data-view-toggle]')?.addEventListener('click', () => {
      viewMode = 'week';
      render();
    });

    host.querySelectorAll('[data-date]').forEach((cell) => {
      cell.addEventListener('click', () => {
        selectedDay = selectedDay === cell.dataset.date ? null : cell.dataset.date;
        render();
      });
    });

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
