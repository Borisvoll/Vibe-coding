import { addMilestone, removeMilestone, addPhase, removePhase } from '../../stores/projects.js';
import { escapeHTML, getToday } from '../../utils.js';

const PHASE_COLORS = [
  'var(--color-accent)',
  'var(--color-mode-school)',
  'var(--color-mode-personal)',
  'var(--color-mode-bpv)',
  '#6366f1',
  '#f59e0b',
];

export function renderTimeline(host, project, context) {
  const { eventBus } = context;
  let showAddMilestone = false;
  let showAddPhase = false;

  async function render() {
    const milestones = project.milestones || [];
    const phases = project.phases || [];
    const today = getToday();

    // Calculate timeline bounds
    const allDates = [
      today,
      ...milestones.map((m) => m.date),
      ...phases.flatMap((p) => [p.startDate, p.endDate]),
    ].filter(Boolean).sort();

    if (allDates.length === 0) {
      host.innerHTML = `
        <div class="project-timeline">
          <div class="project-timeline__header">
            <h4 class="project-timeline__title">Tijdlijn</h4>
            <div class="project-timeline__actions">
              <button type="button" class="btn btn-ghost btn-sm" data-add-milestone-toggle>+ Mijlpaal</button>
              <button type="button" class="btn btn-ghost btn-sm" data-add-phase-toggle>+ Fase</button>
            </div>
          </div>
          ${renderAddForms()}
          <p class="project-timeline__empty">Voeg een mijlpaal of fase toe om de tijdlijn te starten.</p>
        </div>`;
      bindFormEvents();
      return;
    }

    const minDate = allDates[0];
    const maxDate = allDates[allDates.length - 1];
    // Add 14-day buffer on each side
    const startDate = addDays(minDate, -14);
    const endDate = addDays(maxDate, 14);
    const totalDays = daysBetween(startDate, endDate);
    const timelineWidth = Math.max(totalDays * 4, 600); // 4px per day minimum

    function dateToX(dateStr) {
      const offset = daysBetween(startDate, dateStr);
      return (offset / totalDays) * timelineWidth;
    }

    // Render phases as bars
    const phaseBars = phases.map((phase, i) => {
      const x1 = dateToX(phase.startDate);
      const x2 = dateToX(phase.endDate);
      const color = phase.color || PHASE_COLORS[i % PHASE_COLORS.length];
      return `
        <div class="project-timeline__phase"
          style="left:${x1}px;width:${Math.max(x2 - x1, 2)}px;background:${color}"
          title="${escapeHTML(phase.title)}: ${phase.startDate} → ${phase.endDate}">
          <span class="project-timeline__phase-label">${escapeHTML(phase.title)}</span>
          <button type="button" class="project-timeline__remove" data-remove-phase="${phase.id}" aria-label="Verwijder fase">×</button>
        </div>`;
    }).join('');

    // Render milestones as markers
    const milestoneMarkers = milestones.map((m) => {
      const x = dateToX(m.date);
      return `
        <div class="project-timeline__milestone" style="left:${x}px"
          title="${escapeHTML(m.title)}: ${m.date}">
          <span class="project-timeline__diamond">◆</span>
          <span class="project-timeline__milestone-label">${escapeHTML(m.title)}</span>
          <button type="button" class="project-timeline__remove" data-remove-milestone="${m.id}" aria-label="Verwijder mijlpaal">×</button>
        </div>`;
    }).join('');

    // Today marker
    const todayX = dateToX(today);
    const todayMarker = `
      <div class="project-timeline__today" style="left:${todayX}px">
        <div class="project-timeline__today-line"></div>
        <span class="project-timeline__today-label">Vandaag</span>
      </div>`;

    // Month labels
    const monthLabels = renderMonthLabels(startDate, endDate, dateToX);

    host.innerHTML = `
      <div class="project-timeline">
        <div class="project-timeline__header">
          <h4 class="project-timeline__title">Tijdlijn</h4>
          <div class="project-timeline__actions">
            <button type="button" class="btn btn-ghost btn-sm" data-add-milestone-toggle>+ Mijlpaal</button>
            <button type="button" class="btn btn-ghost btn-sm" data-add-phase-toggle>+ Fase</button>
          </div>
        </div>
        ${renderAddForms()}
        <div class="project-timeline__scroll">
          <div class="project-timeline__track" style="width:${timelineWidth}px">
            <div class="project-timeline__axis"></div>
            ${monthLabels}
            <div class="project-timeline__phases">${phaseBars}</div>
            <div class="project-timeline__milestones">${milestoneMarkers}</div>
            ${todayMarker}
          </div>
        </div>
      </div>`;

    bindFormEvents();

    // Bind remove milestone
    host.querySelectorAll('[data-remove-milestone]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const updated = await removeMilestone(project.id, btn.dataset.removeMilestone);
        if (updated) project.milestones = updated.milestones;
        eventBus.emit('projects:changed');
        await render();
      });
    });

    // Bind remove phase
    host.querySelectorAll('[data-remove-phase]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const updated = await removePhase(project.id, btn.dataset.removePhase);
        if (updated) project.phases = updated.phases;
        eventBus.emit('projects:changed');
        await render();
      });
    });

    // Scroll to today
    const scrollContainer = host.querySelector('.project-timeline__scroll');
    if (scrollContainer) {
      const scrollTo = Math.max(0, todayX - scrollContainer.clientWidth / 2);
      scrollContainer.scrollLeft = scrollTo;
    }
  }

  function renderAddForms() {
    let html = '';
    if (showAddMilestone) {
      html += `
        <form class="project-timeline__form" data-milestone-form>
          <input type="text" class="form-input" placeholder="Naam..." data-milestone-title autocomplete="off" />
          <input type="date" class="form-input" data-milestone-date />
          <button type="submit" class="btn btn-primary btn-sm">Toevoegen</button>
          <button type="button" class="btn btn-ghost btn-sm" data-cancel-milestone>Annuleer</button>
        </form>`;
    }
    if (showAddPhase) {
      html += `
        <form class="project-timeline__form" data-phase-form>
          <input type="text" class="form-input" placeholder="Fasenaam..." data-phase-title autocomplete="off" />
          <label class="project-timeline__date-label">
            Start <input type="date" class="form-input" data-phase-start />
          </label>
          <label class="project-timeline__date-label">
            Einde <input type="date" class="form-input" data-phase-end />
          </label>
          <button type="submit" class="btn btn-primary btn-sm">Toevoegen</button>
          <button type="button" class="btn btn-ghost btn-sm" data-cancel-phase>Annuleer</button>
        </form>`;
    }
    return html;
  }

  function bindFormEvents() {
    // Toggle add milestone
    host.querySelector('[data-add-milestone-toggle]')?.addEventListener('click', () => {
      showAddMilestone = !showAddMilestone;
      showAddPhase = false;
      render();
    });

    // Toggle add phase
    host.querySelector('[data-add-phase-toggle]')?.addEventListener('click', () => {
      showAddPhase = !showAddPhase;
      showAddMilestone = false;
      render();
    });

    // Milestone form submit
    const milestoneForm = host.querySelector('[data-milestone-form]');
    milestoneForm?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const title = milestoneForm.querySelector('[data-milestone-title]').value.trim();
      const date = milestoneForm.querySelector('[data-milestone-date]').value;
      if (!title || !date) return;
      const updated = await addMilestone(project.id, title, date);
      if (updated) project.milestones = updated.milestones;
      showAddMilestone = false;
      eventBus.emit('projects:changed');
      await render();
    });

    // Phase form submit
    const phaseForm = host.querySelector('[data-phase-form]');
    phaseForm?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const title = phaseForm.querySelector('[data-phase-title]').value.trim();
      const startDate = phaseForm.querySelector('[data-phase-start]').value;
      const endDate = phaseForm.querySelector('[data-phase-end]').value;
      if (!title || !startDate || !endDate) return;
      const colorIdx = (project.phases || []).length % PHASE_COLORS.length;
      const updated = await addPhase(project.id, title, startDate, endDate, PHASE_COLORS[colorIdx]);
      if (updated) project.phases = updated.phases;
      showAddPhase = false;
      eventBus.emit('projects:changed');
      await render();
    });

    // Cancel buttons
    host.querySelector('[data-cancel-milestone]')?.addEventListener('click', () => {
      showAddMilestone = false;
      render();
    });
    host.querySelector('[data-cancel-phase]')?.addEventListener('click', () => {
      showAddPhase = false;
      render();
    });
  }

  render();

  return {
    unmount() { host.innerHTML = ''; },
  };
}

// --- Date helpers ---

function daysBetween(a, b) {
  const d1 = new Date(a + 'T00:00:00');
  const d2 = new Date(b + 'T00:00:00');
  return Math.round((d2 - d1) / 86400000);
}

function addDays(dateStr, days) {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function renderMonthLabels(startDate, endDate, dateToX) {
  const labels = [];
  const start = new Date(startDate + 'T00:00:00');
  const end = new Date(endDate + 'T00:00:00');
  const MONTH_NAMES_SHORT = ['Jan', 'Feb', 'Mrt', 'Apr', 'Mei', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dec'];

  const current = new Date(start.getFullYear(), start.getMonth(), 1);
  while (current <= end) {
    const dateStr = current.toISOString().slice(0, 10);
    const x = dateToX(dateStr);
    const label = `${MONTH_NAMES_SHORT[current.getMonth()]} ${current.getFullYear()}`;
    labels.push(`<span class="project-timeline__month-label" style="left:${x}px">${label}</span>`);
    current.setMonth(current.getMonth() + 1);
  }
  return labels.join('');
}
