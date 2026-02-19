import { getSchoolDashboardData } from './store.js';
import { toggleTask } from '../../stores/tasks.js';
import { escapeHTML, formatDateShort } from '../../utils.js';

export function renderSchoolDashboard(container, context) {
  const mountId = `school-dash-${crypto.randomUUID()}`;
  const { eventBus } = context;

  container.insertAdjacentHTML('beforeend', `
    <article class="school-dash os-mini-card" data-mount-id="${mountId}" aria-label="School Dashboard">
      <div class="school-dash__loading">Laden…</div>
    </article>
  `);

  const el = container.querySelector(`[data-mount-id="${mountId}"]`);

  async function render() {
    const d = await getSchoolDashboardData();

    el.innerHTML = `
      ${nextActionHTML(d.nextAction)}
      ${deadlinesHTML(d.deadlines)}
      ${bpvHTML(d.bpvWeek)}
      ${projectsHTML(d.schoolProjects)}
    `;

    // Mark next action done
    el.querySelector('[data-action="done-next"]')?.addEventListener('click', async () => {
      const id = el.querySelector('[data-action="done-next"]').dataset.taskId;
      if (id) { await toggleTask(id); await render(); eventBus?.emit('tasks:changed'); }
    });
  }

  const unsubMode = eventBus?.on('mode:changed', render);
  const unsubTasks = eventBus?.on('tasks:changed', render);
  const unsubBPV = eventBus?.on('bpv:changed', render);

  render();

  return {
    unmount() {
      unsubMode?.();
      unsubTasks?.();
      unsubBPV?.();
      el?.remove();
    },
  };
}

// ─── Section renderers ────────────────────────────────────────────────────────

function nextActionHTML(task) {
  if (!task) {
    return section(
      'Volgende actie',
      `<p class="school-dash__empty">Geen openstaande acties</p>`,
    );
  }
  return section(
    'Volgende actie',
    `<div class="school-dash__next">
      <button class="school-dash__done-btn" data-action="done-next" data-task-id="${escapeHTML(task.id)}"
        aria-label="Markeer als gedaan" title="Gedaan">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
          <circle cx="7" cy="7" r="6" stroke="currentColor" stroke-width="1.5"/>
        </svg>
      </button>
      <span class="school-dash__next-text">${escapeHTML(task.text)}</span>
    </div>`,
  );
}

function deadlinesHTML(deadlines) {
  if (!deadlines.length) {
    return section(
      'Aankomende deadlines',
      `<p class="school-dash__empty">Geen deadlines komende 14 dagen</p>`,
    );
  }

  const items = deadlines.map((dl) => {
    const label = formatDateShort(dl.date);
    const urgency = urgencyLabel(dl.daysLeft);
    const typeIcon = dl.type === 'milestone' ? '🏁' : '·';
    return `
      <li class="school-dash__dl-row">
        <span class="school-dash__dl-icon" aria-hidden="true">${typeIcon}</span>
        <span class="school-dash__dl-title">${escapeHTML(dl.label)}</span>
        <span class="school-dash__dl-date" title="${escapeHTML(dl.date)}">${escapeHTML(label)}</span>
        <span class="school-dash__dl-urgency ${urgency.cls}">${escapeHTML(urgency.text)}</span>
      </li>
    `;
  }).join('');

  return section('Aankomende deadlines', `<ul class="school-dash__dl-list">${items}</ul>`);
}

function bpvHTML(bpvWeek) {
  if (!bpvWeek) return '';
  const pct = bpvWeek.percentComplete;
  const color = pct >= 80 ? 'var(--color-success)' : pct >= 50 ? 'var(--color-warning)' : 'var(--color-error)';
  return section(
    'BPV week',
    `<div class="school-dash__bpv">
      <div class="school-dash__bpv-bar" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100">
        <div class="school-dash__bpv-fill" style="width:${pct}%;background:${color}"></div>
      </div>
      <span class="school-dash__bpv-label">${escapeHTML(bpvWeek.formattedTotal)} / ${escapeHTML(bpvWeek.formattedTarget)}</span>
    </div>`,
  );
}

function projectsHTML(projects) {
  if (!projects.length) return '';
  const chips = projects.map((p) => `
    <span class="school-dash__chip">${escapeHTML(p.title)}</span>
  `).join('');
  return section('Schoolprojecten', `<div class="school-dash__chips">${chips}</div>`);
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function section(label, content) {
  return `
    <section class="school-dash__section">
      <h4 class="school-dash__section-label">${escapeHTML(label)}</h4>
      ${content}
    </section>
  `;
}

function urgencyLabel(days) {
  if (days === 0) return { text: 'vandaag', cls: 'school-dash__dl-urgency--red' };
  if (days === 1) return { text: 'morgen', cls: 'school-dash__dl-urgency--red' };
  if (days <= 3) return { text: `${days}d`, cls: 'school-dash__dl-urgency--amber' };
  if (days <= 7) return { text: `${days}d`, cls: 'school-dash__dl-urgency--amber' };
  return { text: `${days}d`, cls: 'school-dash__dl-urgency--muted' };
}
