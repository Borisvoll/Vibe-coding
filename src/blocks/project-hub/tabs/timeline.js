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
 * Timeline tab — week-strip (default) ↔ month-view toggle.
 * Milestone drag via mouse events.
 */
export function renderTimelineTab(host, project, context) {
  const { eventBus } = context;
  let view = 'week';  // 'week' | 'month'
  let weekOffset = 0; // weeks from current
  let monthOffset = 0;
  let showMilestoneForm = false;
  let showPhaseForm = false;
  let dragState = null; // { milestoneId, startX, origDate }

  async function render() {
    const milestones = project.milestones || [];
    const phases = project.phases || [];
    const today = getToday();

    const toggleLabel = view === 'week' ? 'Maandoverzicht' : 'Weekoverzicht';

    host.innerHTML = `
      <div class="hub-timeline">
        <div class="hub-timeline__header">
          <h4 class="hub-timeline__title">Tijdlijn</h4>
          <div class="hub-timeline__controls">
            <button type="button" class="btn btn-ghost btn-sm" data-toggle-view>${toggleLabel}</button>
            <button type="button" class="btn btn-ghost btn-sm" data-add-milestone>+ Mijlpaal</button>
            <button type="button" class="btn btn-ghost btn-sm" data-add-phase>+ Fase</button>
          </div>
        </div>
        ${renderForms()}
        ${view === 'week' ? renderWeekView(today, milestones, phases) : renderMonthView(today, milestones)}
        ${phases.length > 0 ? renderPhaseLegend(phases) : ''}
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
    // Toggle view
    host.querySelector('[data-toggle-view]')?.addEventListener('click', () => {
      view = view === 'week' ? 'month' : 'week';
      render();
    });

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
        const updated = await addMilestone(project.id, '_temp_', newDate); // get project
        // Actually: update existing milestone date
        const milestone = (project.milestones || []).find((m) => m.id === dragState.milestoneId);
        if (!milestone || !newDate) return;
        const currentMs = project.milestones || [];
        const updatedMs = currentMs.map((m) => m.id === dragState.milestoneId ? { ...m, date: newDate } : m);
        const result = await import('../../../stores/projects.js').then((s) =>
          s.updateProject(project.id, { milestones: updatedMs })
        );
        if (result) { project.milestones = result.milestones; }
        dragState = null;
        eventBus.emit('projects:changed');
        await render();
      });
    });
  }

  render();

  return {
    unmount() { host.innerHTML = ''; },
  };
}
