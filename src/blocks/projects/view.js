import {
  getProjects, addProject, updateProject,
  setNextAction, clearNextAction, deleteProject,
  getPinnedProject, unpinProject,
} from '../../stores/projects.js';
import { addTask, getTasksByProject } from '../../stores/tasks.js';
import { getByKey } from '../../db.js';
import { escapeHTML } from '../../utils.js';
import { getProjectMomentum } from '../../stores/momentum.js';

const STATUS_LABELS = { active: 'Actief', paused: 'Gepauzeerd', done: 'Gereed' };
const STATUS_BADGES = { active: 'badge-accent', paused: 'badge-warning', done: 'badge-success' };

export function renderProjects(container, context) {
  const mountId = crypto.randomUUID();
  const { eventBus, modeManager } = context;

  let expandedId = null;

  container.insertAdjacentHTML('beforeend', `
    <article class="projects-block os-mini-card" data-mount-id="${mountId}">
      <div class="projects-block__header">
        <h3 class="projects-block__title">Projecten</h3>
        <button type="button" class="projects-block__add btn btn-ghost btn-sm">+ Nieuw</button>
      </div>
      <form class="projects-block__new-form" hidden>
        <input type="text" class="form-input projects-block__new-title"
          placeholder="Projectnaam..." autocomplete="off" />
        <textarea class="form-input projects-block__new-goal"
          placeholder="Doel (optioneel)" rows="2"></textarea>
        <div class="projects-block__new-actions">
          <button type="submit" class="btn btn-primary btn-sm">Aanmaken</button>
          <button type="button" class="btn btn-ghost btn-sm" data-cancel>Annuleer</button>
        </div>
      </form>
      <div class="projects-block__list"></div>
    </article>
  `);

  const el = container.querySelector(`[data-mount-id="${mountId}"]`);
  const listEl = el.querySelector('.projects-block__list');
  const addBtn = el.querySelector('.projects-block__add');
  const newForm = el.querySelector('.projects-block__new-form');
  const newTitleInput = el.querySelector('.projects-block__new-title');

  // --- New project form ---
  addBtn.addEventListener('click', () => {
    const isOpen = !newForm.hidden;
    newForm.hidden = isOpen;
    if (!isOpen) newTitleInput.focus();
  });

  el.querySelector('[data-cancel]').addEventListener('click', () => {
    newForm.hidden = true;
    newForm.reset();
  });

  newForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = newTitleInput.value.trim();
    if (!title) return;
    const goal = el.querySelector('.projects-block__new-goal').value.trim();
    const mode = modeManager.getMode();
    await addProject(title, goal, mode);
    newForm.hidden = true;
    newForm.reset();
    eventBus.emit('projects:changed');
    await render();
  });

  // --- Render ---
  async function render() {
    const mode = modeManager.getMode();
    const projects = await getProjects(mode);

    if (projects.length === 0) {
      listEl.innerHTML = `
        <p class="projects-block__empty">Geen projecten — maak je eerste project aan.</p>
      `;
      return;
    }

    // Focus strip for pinned project
    const pinned = await getPinnedProject(mode);
    let focusStripHtml = '';
    if (pinned) {
      let nextActionTask = null;
      if (pinned.nextActionId) {
        nextActionTask = await getByKey('os_tasks', pinned.nextActionId);
      }
      const tasks = await getTasksByProject(pinned.id);
      const totalTasks = tasks.length;
      const doneTasks = tasks.filter((t) => t.status === 'done').length;
      const pct = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;
      const accent = pinned.accentColor || 'var(--color-accent)';

      focusStripHtml = `
        <div class="projects-block__focus-strip" style="--strip-accent:${accent}">
          <div class="projects-block__focus-header">
            <span class="projects-block__focus-pin">\u{1F4CC}</span>
            <span class="projects-block__focus-title">${escapeHTML(pinned.title)}</span>
            <button type="button" class="btn btn-ghost btn-sm projects-block__focus-unpin" data-unpin="${pinned.id}">Lospinnen</button>
          </div>
          <div class="projects-block__focus-next">
            \u{2192} ${nextActionTask ? escapeHTML(nextActionTask.text) : '<em>Geen volgende actie</em>'}
          </div>
          <div class="projects-block__focus-progress">
            <div class="projects-block__focus-bar" style="width:${pct}%;background:${accent}"></div>
          </div>
          <span class="projects-block__focus-pct">${pct}%</span>
        </div>
      `;
    }

    const rows = await Promise.all(projects.map(async (project) => {
      const isExpanded = project.id === expandedId;
      let nextActionTask = null;
      if (project.nextActionId) {
        nextActionTask = await getByKey('os_tasks', project.nextActionId);
      }

      const tasks = await getTasksByProject(project.id);
      const doneTasks = tasks.filter((t) => t.status === 'done').length;
      const pct = tasks.length > 0 ? Math.round((doneTasks / tasks.length) * 100) : 0;

      const momentum = await getProjectMomentum(project.id, project);
      const maxAct = Math.max(1, ...momentum.weeklyActivity);
      const sparkBars = momentum.weeklyActivity.map((v, i) => {
        const h = Math.max(3, Math.round((v / maxAct) * 20));
        return `<span class="projects-block__spark-bar ${i === 3 ? 'projects-block__spark-bar--now' : ''}" style="height:${h}px"></span>`;
      }).join('');

      const badge = STATUS_BADGES[project.status] || 'badge-default';
      const statusLabel = STATUS_LABELS[project.status] || project.status;

      const detailHtml = isExpanded ? renderDetail(project, nextActionTask) : '';

      return `
        <div class="projects-block__item ${isExpanded ? 'projects-block__item--open' : ''} ${momentum.isStalled ? 'projects-block__item--stalled' : ''}"
             data-project-id="${project.id}">
          <div class="projects-block__summary" data-expand>
            <span class="projects-block__name">${escapeHTML(project.title)}</span>
            <div class="projects-block__momentum">
              <div class="projects-block__spark">${sparkBars}</div>
              <span class="projects-block__pct">${pct}%</span>
              ${momentum.isStalled ? '<span class="projects-block__stall-badge">stagnatie</span>' : ''}
            </div>
            <button type="button" class="projects-block__open-btn" data-open-project="${project.id}" title="Open project">↗</button>
            <span class="projects-block__chevron">${isExpanded ? '▲' : '▼'}</span>
          </div>
          <div class="projects-block__progress-bar">
            <div class="projects-block__progress-fill" style="width:${pct}%"></div>
          </div>
          ${detailHtml}
        </div>
      `;
    }));

    listEl.innerHTML = focusStripHtml + rows.join('');
    bindEvents(projects);

    // Unpin handler
    listEl.querySelector('[data-unpin]')?.addEventListener('click', async (e) => {
      const projectId = e.currentTarget.dataset.unpin;
      await unpinProject(projectId);
      eventBus.emit('projects:changed');
      await render();
    });
  }

  function renderDetail(project, nextActionTask) {
    const hasNextAction = !!nextActionTask;
    return `
      <div class="projects-block__detail">
        ${project.goal ? `<p class="projects-block__goal">${escapeHTML(project.goal)}</p>` : ''}

        <div class="projects-block__next-action-section">
          <h4 class="projects-block__section-label">
            Volgende actie <small>(één per project)</small>
          </h4>
          ${hasNextAction ? `
            <div class="projects-block__current-action">
              <span class="projects-block__action-text">${escapeHTML(nextActionTask.text)}</span>
              <button type="button" class="btn btn-ghost btn-sm"
                data-clear-next-action aria-label="Verwijder volgende actie" data-tooltip="Verwijder actie">×</button>
            </div>
          ` : `
            <p class="projects-block__action-empty">Geen volgende actie ingesteld</p>
          `}
          <form class="projects-block__next-action-form" data-set-next-action>
            <input type="text" class="form-input" data-next-action-input
              placeholder="${hasNextAction ? 'Vervang door nieuwe actie...' : 'Stel volgende actie in...'}"
              autocomplete="off" />
          </form>
        </div>

        <div class="projects-block__detail-actions">
          ${project.status === 'active' ? `
            <button type="button" class="btn btn-ghost btn-sm"
              data-project-status="paused">Pauzeer</button>
            <button type="button" class="btn btn-ghost btn-sm"
              data-project-status="done">Afronden</button>
          ` : `
            <button type="button" class="btn btn-ghost btn-sm"
              data-project-status="active">Activeer</button>
          `}
          <button type="button" class="btn btn-danger btn-sm"
            data-delete-project>Verwijder</button>
        </div>
      </div>
    `;
  }

  function bindEvents(projects) {
    // Open project in Planning tab
    listEl.querySelectorAll('[data-open-project]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const projectId = btn.dataset.openProject;
        window.location.hash = `planning/${projectId}`;
      });
    });

    // Expand/collapse
    listEl.querySelectorAll('[data-expand]').forEach((summary) => {
      summary.addEventListener('click', () => {
        const projectId = summary.closest('[data-project-id]').dataset.projectId;
        expandedId = (expandedId === projectId) ? null : projectId;
        render();
      });
    });

    // Set next action (creates new task + links it)
    listEl.querySelectorAll('[data-set-next-action]').forEach((form) => {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const projectId = form.closest('[data-project-id]').dataset.projectId;
        const input = form.querySelector('[data-next-action-input]');
        const text = input.value.trim();
        if (!text) return;
        const project = projects.find((p) => p.id === projectId);
        const mode = project?.mode || modeManager.getMode();
        const task = await addTask(text, mode);
        await setNextAction(projectId, task.id);
        eventBus.emit('tasks:changed');
        eventBus.emit('projects:changed');
        await render();
      });
    });

    // Clear next action
    listEl.querySelectorAll('[data-clear-next-action]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const projectId = btn.closest('[data-project-id]').dataset.projectId;
        await clearNextAction(projectId);
        eventBus.emit('projects:changed');
        await render();
      });
    });

    // Status change (active/paused/done)
    listEl.querySelectorAll('[data-project-status]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const projectId = btn.closest('[data-project-id]').dataset.projectId;
        const status = btn.dataset.projectStatus;
        await updateProject(projectId, { status });
        if (expandedId === projectId) expandedId = null;
        eventBus.emit('projects:changed');
        await render();
      });
    });

    // Delete
    listEl.querySelectorAll('[data-delete-project]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const projectId = btn.closest('[data-project-id]').dataset.projectId;
        await deleteProject(projectId);
        if (expandedId === projectId) expandedId = null;
        eventBus.emit('projects:changed');
        await render();
      });
    });
  }

  const unsubMode = eventBus.on('mode:changed', () => render());
  const unsubProjects = eventBus.on('projects:changed', () => render());

  render();

  return {
    unmount() {
      unsubMode?.();
      unsubProjects?.();
      el?.remove();
    },
  };
}
