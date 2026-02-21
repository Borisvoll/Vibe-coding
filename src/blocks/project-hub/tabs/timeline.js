import { addMilestone, removeMilestone, addPhase, removePhase } from '../../../stores/projects.js';
import { escapeHTML, getToday } from '../../../utils.js';

const MONTH_NAMES = ['Januari', 'Februari', 'Maart', 'April', 'Mei', 'Juni',
  'Juli', 'Augustus', 'September', 'Oktober', 'November', 'December'];
const DAY_NAMES_SHORT = ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo'];

const PHASE_COLORS = [
  'var(--color-accent)',
  '#6366f1',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
];

/**
 * Timeline tab — week-strip (default) ↔ month-view ↔ gantt-view toggle.
 * Gantt: phases shown as draggable horizontal bars.
 * Milestone drag via HTML5 dragdrop in week view.
 */
export function renderTimelineTab(host, project, context) {
  const { eventBus } = context;
  let view = 'week';  // 'week' | 'month' | 'gantt'
  let weekOffset = 0; // weeks from current
  let monthOffset = 0;
  let showMilestoneForm = false;
  let showPhaseForm = false;
  let dragState = null; // { milestoneId, startX, origDate }
  let ganttDrag = null; // { phaseId, type: 'move'|'resize', startX, origStart, origEnd }

  async function render() {
    const milestones = project.milestones || [];
    const phases = project.phases || [];
    const today = getToday();

    const toggleLabel = view === 'week' ? 'Maandoverzicht' : 'Weekoverzicht';

    const viewCycleLabel = view === 'week' ? 'Maand' : view === 'month' ? 'Gantt' : 'Week';

    host.innerHTML = `
      <div class="hub-timeline">
        <div class="hub-timeline__header">
          <h4 class="hub-timeline__title">Tijdlijn</h4>
          <div class="hub-timeline__controls">
            <button type="button" class="btn btn-ghost btn-sm" data-toggle-view>${viewCycleLabel} →</button>
            <button type="button" class="btn btn-ghost btn-sm" data-add-milestone>+ Mijlpaal</button>
            <button type="button" class="btn btn-ghost btn-sm" data-add-phase>+ Fase</button>
          </div>
        </div>
        ${renderForms()}
        ${view === 'week'
          ? renderWeekView(today, milestones, phases)
          : view === 'month'
            ? renderMonthView(today, milestones)
            : renderGanttView(today, milestones, phases)}
        ${phases.length > 0 && view !== 'gantt' ? renderPhaseLegend(phases) : ''}
      </div>
    `;

    bindEvents(today, milestones, phases);
  }

  function renderForms() {
    let html = '';
    if (showMilestoneForm) {
      html += `
        <form class="hub-timeline__form" data-milestone-form>
          <input type="text" class="form-input" placeholder="Mijlpaalnaam..." data-ms-title autocomplete="off" required />
          <input type="date" class="form-input" data-ms-date value="${getToday()}" required />
          <button type="submit" class="btn btn-primary btn-sm">Toevoegen</button>
          <button type="button" class="btn btn-ghost btn-sm" data-cancel-ms>Annuleer</button>
        </form>`;
    }
    if (showPhaseForm) {
      html += `
        <form class="hub-timeline__form" data-phase-form>
          <input type="text" class="form-input" placeholder="Fasenaam..." data-phase-title autocomplete="off" required />
          <div class="hub-timeline__form-row">
            <label>Start <input type="date" class="form-input" data-phase-start value="${getToday()}" required /></label>
            <label>Einde <input type="date" class="form-input" data-phase-end required /></label>
          </div>
          <button type="submit" class="btn btn-primary btn-sm">Toevoegen</button>
          <button type="button" class="btn btn-ghost btn-sm" data-cancel-phase>Annuleer</button>
        </form>`;
    }
    return html;
  }

  function getWeekStart(offsetWeeks) {
    const today = new Date(getToday() + 'T00:00:00');
    const dayOfWeek = (today.getDay() + 6) % 7; // 0=Monday
    today.setDate(today.getDate() - dayOfWeek + offsetWeeks * 7);
    return today;
  }

  function renderWeekView(today, milestones, phases) {
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

    return `
      <div class="hub-timeline__week">
        <div class="hub-timeline__week-nav">
          <button type="button" class="btn btn-ghost btn-sm" data-week-prev>‹</button>
          <span class="hub-timeline__week-label">${weekStartStr} – ${weekEndStr}</span>
          <button type="button" class="btn btn-ghost btn-sm" data-week-next>›</button>
        </div>
        <div class="hub-timeline__week-grid">
          ${days.map((d, i) => {
            const isToday = d === today;
            const dayMilestones = milestones.filter((m) => m.date === d);
            const dayPhases = phases.filter((p) => p.startDate <= d && p.endDate >= d);
            return `
              <div class="hub-timeline__day ${isToday ? 'hub-timeline__day--today' : ''}" data-date="${d}">
                <div class="hub-timeline__day-header">
                  <span class="hub-timeline__day-name">${DAY_NAMES_SHORT[i]}</span>
                  <span class="hub-timeline__day-num">${parseInt(d.slice(8), 10)}</span>
                </div>
                <div class="hub-timeline__day-body">
                  ${dayPhases.map((p) => `
                    <div class="hub-timeline__phase-dot" style="background:${p.color || 'var(--color-accent)'}"
                      title="${escapeHTML(p.title)}"></div>
                  `).join('')}
                  ${dayMilestones.map((m) => `
                    <div class="hub-timeline__milestone-chip" data-milestone-id="${m.id}" draggable="true">
                      <span class="hub-timeline__diamond">◆</span>
                      <span>${escapeHTML(m.title)}</span>
                      <button type="button" class="hub-timeline__remove" data-remove-ms="${m.id}" aria-label="Verwijder">×</button>
                    </div>
                  `).join('')}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  function renderMonthView(today, milestones) {
    const base = new Date(today + 'T00:00:00');
    base.setDate(1);
    base.setMonth(base.getMonth() + monthOffset);
    const year = base.getFullYear();
    const month = base.getMonth();
    const monthName = MONTH_NAMES[month];

    // Grid: pad to Monday start
    const firstDay = (new Date(year, month, 1).getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);

    return `
      <div class="hub-timeline__month">
        <div class="hub-timeline__month-nav">
          <button type="button" class="btn btn-ghost btn-sm" data-month-prev>‹</button>
          <span class="hub-timeline__month-label">${monthName} ${year}</span>
          <button type="button" class="btn btn-ghost btn-sm" data-month-next>›</button>
        </div>
        <div class="hub-timeline__month-grid">
          ${DAY_NAMES_SHORT.map((d) => `<div class="hub-timeline__month-dayname">${d}</div>`).join('')}
          ${cells.map((d) => {
            if (!d) return `<div class="hub-timeline__month-cell hub-timeline__month-cell--empty"></div>`;
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const isToday = dateStr === today;
            const dayMs = milestones.filter((m) => m.date === dateStr);
            return `
              <div class="hub-timeline__month-cell ${isToday ? 'hub-timeline__month-cell--today' : ''}">
                <span class="hub-timeline__month-cell-num">${d}</span>
                ${dayMs.map((m) => `
                  <div class="hub-timeline__month-ms" title="${escapeHTML(m.title)}" data-milestone-id="${m.id}">
                    <span class="hub-timeline__diamond">◆</span>
                    <span class="hub-timeline__month-ms-label">${escapeHTML(m.title)}</span>
                    <button type="button" class="hub-timeline__remove" data-remove-ms="${m.id}" aria-label="Verwijder">×</button>
                  </div>
                `).join('')}
              </div>`;
          }).join('')}
        </div>
      </div>
    `;
  }

  /**
   * Gantt view — horizontal bars for phases, diamonds for milestones.
   * Time window: from earliest phase start to latest phase end (min 4 weeks shown).
   */
  function renderGanttView(today, milestones, phases) {
    if (phases.length === 0 && milestones.length === 0) {
      return `<div class="hub-gantt__empty">Voeg fases of mijlpalen toe om de Gantt-weergave te zien.</div>`;
    }

    // Compute time window
    const allDates = [
      ...phases.flatMap((p) => [p.startDate, p.endDate]),
      ...milestones.map((m) => m.date),
      today,
    ].filter(Boolean);

    let windowStart = allDates.reduce((a, b) => a < b ? a : b);
    let windowEnd = allDates.reduce((a, b) => a > b ? a : b);

    // Ensure minimum 28-day window
    const startD = new Date(windowStart + 'T00:00:00');
    const endD = new Date(windowEnd + 'T00:00:00');
    if ((endD - startD) / 86400000 < 28) {
      endD.setDate(endD.getDate() + 28);
      windowEnd = endD.toISOString().slice(0, 10);
    }
    // Pad 3 days on each side
    startD.setDate(startD.getDate() - 3);
    endD.setDate(endD.getDate() + 3);
    windowStart = startD.toISOString().slice(0, 10);
    windowEnd = endD.toISOString().slice(0, 10);

    const totalDays = Math.round((endD - startD) / 86400000);

    function pct(dateStr) {
      const d = new Date(dateStr + 'T00:00:00');
      return Math.max(0, Math.min(100, ((d - startD) / (endD - startD)) * 100));
    }

    // Week headers
    const weekHeaders = [];
    const cur = new Date(startD);
    cur.setDate(cur.getDate() - ((cur.getDay() + 6) % 7)); // snap to Monday
    while (cur <= endD) {
      weekHeaders.push({
        label: cur.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' }),
        pct: Math.max(0, ((cur - startD) / (endD - startD)) * 100),
      });
      cur.setDate(cur.getDate() + 7);
    }

    const todayPct = pct(today);
    const showTodayMarker = today >= windowStart && today <= windowEnd;

    return `
      <div class="hub-gantt" data-gantt>
        <!-- Time axis -->
        <div class="hub-gantt__axis">
          ${weekHeaders.map((w) => `
            <span class="hub-gantt__week-label" style="left:${w.pct.toFixed(2)}%">${w.label}</span>
          `).join('')}
          ${showTodayMarker ? `
            <span class="hub-gantt__today-marker" style="left:${todayPct.toFixed(2)}%" title="Vandaag">
              <span class="hub-gantt__today-line"></span>
              <span class="hub-gantt__today-dot"></span>
            </span>` : ''}
        </div>

        <!-- Phase bars -->
        <div class="hub-gantt__rows">
          ${phases.map((phase) => {
            if (!phase.startDate || !phase.endDate) return '';
            const left = pct(phase.startDate);
            const right = 100 - pct(phase.endDate);
            const width = Math.max(1, 100 - left - right);
            const isOverdue = phase.endDate < today;
            return `
              <div class="hub-gantt__row">
                <div class="hub-gantt__row-label" title="${escapeHTML(phase.title)}">${escapeHTML(phase.title)}</div>
                <div class="hub-gantt__track">
                  <div class="hub-gantt__bar ${isOverdue ? 'hub-gantt__bar--overdue' : ''}"
                    data-gantt-phase="${phase.id}"
                    style="left:${left.toFixed(2)}%;width:${width.toFixed(2)}%;--phase-color:${phase.color || 'var(--color-accent)'}"
                    title="${escapeHTML(phase.title)}: ${phase.startDate} → ${phase.endDate}">
                    <span class="hub-gantt__bar-label">${escapeHTML(phase.title)}</span>
                    <span class="hub-gantt__bar-dates">${phase.startDate} – ${phase.endDate}</span>
                    <span class="hub-gantt__resize-handle" data-gantt-resize="${phase.id}" title="Sleep om einddatum aan te passen"></span>
                  </div>
                  ${showTodayMarker ? `<span class="hub-gantt__today-overlay" style="left:${todayPct.toFixed(2)}%"></span>` : ''}
                </div>
              </div>
            `;
          }).join('')}

          <!-- Milestone diamonds row -->
          ${milestones.length > 0 ? `
            <div class="hub-gantt__row">
              <div class="hub-gantt__row-label">Mijlpalen</div>
              <div class="hub-gantt__track hub-gantt__track--ms">
                ${milestones.map((m) => {
                  if (!m.date || m.date < windowStart || m.date > windowEnd) return '';
                  const p = pct(m.date);
                  return `
                    <span class="hub-gantt__milestone" style="left:${p.toFixed(2)}%" title="${escapeHTML(m.title)} (${m.date})">
                      ◆
                      <span class="hub-gantt__ms-label">${escapeHTML(m.title)}</span>
                    </span>
                  `;
                }).join('')}
                ${showTodayMarker ? `<span class="hub-gantt__today-overlay" style="left:${todayPct.toFixed(2)}%"></span>` : ''}
              </div>
            </div>
          ` : ''}
        </div>

        <p class="hub-gantt__hint">Sleep de balk om te verplaatsen · sleep de rechterrand om de einddatum aan te passen</p>
      </div>
    `;
  }

  function renderPhaseLegend(phases) {
    return `
      <div class="hub-timeline__phase-legend">
        ${phases.map((p) => `
          <div class="hub-timeline__phase-entry">
            <span class="hub-timeline__phase-swatch" style="background:${p.color || 'var(--color-accent)'}"></span>
            <span>${escapeHTML(p.title)}</span>
            <small>${p.startDate} → ${p.endDate}</small>
            <button type="button" class="hub-timeline__remove" data-remove-phase="${p.id}" aria-label="Verwijder fase">×</button>
          </div>
        `).join('')}
      </div>
    `;
  }

  function bindEvents(today, milestones, phases) {
    // Toggle view (cycle: week → month → gantt → week)
    host.querySelector('[data-toggle-view]')?.addEventListener('click', () => {
      view = view === 'week' ? 'month' : view === 'month' ? 'gantt' : 'week';
      render();
    });

    // Gantt drag handlers
    if (view === 'gantt') {
      bindGanttDrag(phases);
    }

    // Week navigation
    host.querySelector('[data-week-prev]')?.addEventListener('click', () => { weekOffset--; render(); });
    host.querySelector('[data-week-next]')?.addEventListener('click', () => { weekOffset++; render(); });

    // Month navigation
    host.querySelector('[data-month-prev]')?.addEventListener('click', () => { monthOffset--; render(); });
    host.querySelector('[data-month-next]')?.addEventListener('click', () => { monthOffset++; render(); });

    // Toggle forms
    host.querySelector('[data-add-milestone]')?.addEventListener('click', () => {
      showMilestoneForm = !showMilestoneForm;
      showPhaseForm = false;
      render();
    });
    host.querySelector('[data-add-phase]')?.addEventListener('click', () => {
      showPhaseForm = !showPhaseForm;
      showMilestoneForm = false;
      render();
    });
    host.querySelector('[data-cancel-ms]')?.addEventListener('click', () => { showMilestoneForm = false; render(); });
    host.querySelector('[data-cancel-phase]')?.addEventListener('click', () => { showPhaseForm = false; render(); });

    // Milestone form submit
    const msForm = host.querySelector('[data-milestone-form]');
    msForm?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const title = msForm.querySelector('[data-ms-title]').value.trim();
      const date = msForm.querySelector('[data-ms-date]').value;
      if (!title || !date) return;
      const updated = await addMilestone(project.id, title, date);
      if (updated) { project.milestones = updated.milestones; }
      showMilestoneForm = false;
      eventBus.emit('projects:changed');
      await render();
    });

    // Phase form submit
    const phaseForm = host.querySelector('[data-phase-form]');
    phaseForm?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const title = phaseForm.querySelector('[data-phase-title]').value.trim();
      const start = phaseForm.querySelector('[data-phase-start]').value;
      const end = phaseForm.querySelector('[data-phase-end]').value;
      if (!title || !start || !end) return;
      const colorIdx = (project.phases || []).length % PHASE_COLORS.length;
      const updated = await addPhase(project.id, title, start, end, PHASE_COLORS[colorIdx]);
      if (updated) { project.phases = updated.phases; }
      showPhaseForm = false;
      eventBus.emit('projects:changed');
      await render();
    });

    // Remove milestone
    host.querySelectorAll('[data-remove-ms]').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const id = btn.dataset.removeMs;
        const updated = await removeMilestone(project.id, id);
        if (updated) { project.milestones = updated.milestones; }
        eventBus.emit('projects:changed');
        await render();
      });
    });

    // Remove phase
    host.querySelectorAll('[data-remove-phase]').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const id = btn.dataset.removePhase;
        const updated = await removePhase(project.id, id);
        if (updated) { project.phases = updated.phases; }
        eventBus.emit('projects:changed');
        await render();
      });
    });

    // Milestone drag (week view) — drag chip to different day column
    if (view === 'week') {
      bindDragDrop(milestones);
    }
  }

  function bindDragDrop(milestones) {
    const chips = host.querySelectorAll('[data-milestone-id][draggable="true"]');
    const dayEls = host.querySelectorAll('[data-date]');

    chips.forEach((chip) => {
      chip.addEventListener('dragstart', (e) => {
        dragState = { milestoneId: chip.dataset.milestoneId };
        e.dataTransfer.effectAllowed = 'move';
        chip.classList.add('hub-timeline__milestone-chip--dragging');
      });
      chip.addEventListener('dragend', () => {
        chip.classList.remove('hub-timeline__milestone-chip--dragging');
        dragState = null;
      });
    });

    dayEls.forEach((dayEl) => {
      dayEl.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        dayEl.classList.add('hub-timeline__day--drop-target');
      });
      dayEl.addEventListener('dragleave', () => {
        dayEl.classList.remove('hub-timeline__day--drop-target');
      });
      dayEl.addEventListener('drop', async (e) => {
        e.preventDefault();
        dayEl.classList.remove('hub-timeline__day--drop-target');
        if (!dragState) return;
        const newDate = dayEl.dataset.date;
        const milestoneId = dragState.milestoneId;
        dragState = null;
        if (!newDate) return;
        const currentMs = project.milestones || [];
        const milestone = currentMs.find((m) => m.id === milestoneId);
        if (!milestone || milestone.date === newDate) return;
        const updatedMs = currentMs.map((m) => m.id === milestoneId ? { ...m, date: newDate } : m);
        const { updateProject } = await import('../../../stores/projects.js');
        const result = await updateProject(project.id, { milestones: updatedMs });
        if (result) { project.milestones = result.milestones; }
        eventBus.emit('projects:changed');
        await render();
      });
    });
  }

  function bindGanttDrag(phases) {
    const ganttEl = host.querySelector('[data-gantt]');
    if (!ganttEl) return;

    function dateFromOffset(refDateStr, deltaDays) {
      const d = new Date(refDateStr + 'T00:00:00');
      d.setDate(d.getDate() + Math.round(deltaDays));
      return d.toISOString().slice(0, 10);
    }

    function getTrackWidth(bar) {
      return bar.closest('.hub-gantt__track')?.getBoundingClientRect().width || 1;
    }

    function daysPerPx(bar) {
      // Get total days in the gantt window from the time axis
      const axis = ganttEl.querySelector('.hub-gantt__axis');
      const labels = ganttEl.querySelectorAll('.hub-gantt__week-label');
      if (labels.length < 2) return 1;
      const axisRect = axis.getBoundingClientRect();
      const weeks = labels.length - 1;
      return (weeks * 7) / axisRect.width;
    }

    // Drag bar to move phase (both start and end shift)
    ganttEl.querySelectorAll('[data-gantt-phase]').forEach((bar) => {
      bar.addEventListener('mousedown', (e) => {
        // Ignore if clicking the resize handle
        if (e.target.hasAttribute('data-gantt-resize')) return;
        e.preventDefault();
        const phaseId = bar.dataset.ganttPhase;
        const phase = (project.phases || []).find((p) => p.id === phaseId);
        if (!phase) return;
        ganttDrag = {
          phaseId, type: 'move',
          startX: e.clientX,
          origStart: phase.startDate,
          origEnd: phase.endDate,
          dpx: daysPerPx(bar),
        };
        bar.classList.add('hub-gantt__bar--dragging');
      });
    });

    // Drag resize handle (only end date shifts)
    ganttEl.querySelectorAll('[data-gantt-resize]').forEach((handle) => {
      handle.addEventListener('mousedown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const phaseId = handle.dataset.ganttResize;
        const phase = (project.phases || []).find((p) => p.id === phaseId);
        if (!phase) return;
        const bar = ganttEl.querySelector(`[data-gantt-phase="${phaseId}"]`);
        ganttDrag = {
          phaseId, type: 'resize',
          startX: e.clientX,
          origStart: phase.startDate,
          origEnd: phase.endDate,
          dpx: daysPerPx(bar),
        };
        bar?.classList.add('hub-gantt__bar--dragging');
      });
    });

    function onMouseMove(e) {
      if (!ganttDrag) return;
      const deltaPx = e.clientX - ganttDrag.startX;
      const deltaDays = deltaPx * ganttDrag.dpx;
      const bar = ganttEl.querySelector(`[data-gantt-phase="${ganttDrag.phaseId}"]`);

      if (ganttDrag.type === 'move') {
        const newStart = dateFromOffset(ganttDrag.origStart, deltaDays);
        const newEnd = dateFromOffset(ganttDrag.origEnd, deltaDays);
        if (bar) {
          const datesEl = bar.querySelector('.hub-gantt__bar-dates');
          if (datesEl) datesEl.textContent = `${newStart} – ${newEnd}`;
        }
      } else {
        const newEnd = dateFromOffset(ganttDrag.origEnd, deltaDays);
        const safEnd = newEnd > ganttDrag.origStart ? newEnd : ganttDrag.origStart;
        if (bar) {
          const datesEl = bar.querySelector('.hub-gantt__bar-dates');
          if (datesEl) datesEl.textContent = `${ganttDrag.origStart} – ${safEnd}`;
        }
      }
    }

    async function onMouseUp(e) {
      if (!ganttDrag) return;
      const deltaPx = e.clientX - ganttDrag.startX;
      const deltaDays = deltaPx * ganttDrag.dpx;

      let newStart = ganttDrag.origStart;
      let newEnd = ganttDrag.origEnd;

      if (ganttDrag.type === 'move') {
        newStart = dateFromOffset(ganttDrag.origStart, deltaDays);
        newEnd = dateFromOffset(ganttDrag.origEnd, deltaDays);
      } else {
        newEnd = dateFromOffset(ganttDrag.origEnd, deltaDays);
        if (newEnd <= newStart) newEnd = dateFromOffset(newStart, 1);
      }

      const phaseId = ganttDrag.phaseId;
      ganttDrag = null;

      const bar = ganttEl.querySelector(`[data-gantt-phase="${phaseId}"]`);
      bar?.classList.remove('hub-gantt__bar--dragging');

      // Save to store
      const updatedPhases = (project.phases || []).map((p) =>
        p.id === phaseId ? { ...p, startDate: newStart, endDate: newEnd } : p
      );
      const { updateProject } = await import('../../../stores/projects.js');
      const result = await updateProject(project.id, { phases: updatedPhases });
      if (result) project.phases = result.phases;
      eventBus.emit('projects:changed');
      await render();
    }

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);

    // Store cleanup handlers so we can remove them
    ganttEl._cleanupDrag = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
  }

  render();

  return {
    unmount() {
      // Clean up any dangling Gantt drag listeners
      const ganttEl = host.querySelector('[data-gantt]');
      ganttEl?._cleanupDrag?.();
      host.innerHTML = '';
    },
  };
}
