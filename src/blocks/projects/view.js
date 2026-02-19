import {
  getProjects, addProject, updateProject,
  setNextAction, clearNextAction, deleteProject,
} from '../../stores/projects.js';
import { addTask } from '../../stores/tasks.js';
import { getByKey } from '../../db.js';
import { escapeHTML } from '../../utils.js';

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

    const rows = await Promise.all(projects.map(async (project) => {
      const isExpanded = project.id === expandedId;
      let nextActionTask = null;
      if (project.nextActionId) {
        nextActionTask = await getByKey('os_tasks', project.nextActionId);
      }

      const badge = STATUS_BADGES[project.status] || 'badge-default';
      const statusLabel = STATUS_LABELS[project.status] || project.status;
      const nextPreview = nextActionTask
        ? escapeHTML(nextActionTask.text)
        : '<span class="projects-block__no-action">Geen volgende actie</span>';

      const detailHtml = isExpanded ? renderDetail(project, nextActionTask) : '';

      return `
        <div class="projects-block__item ${isExpanded ? 'projects-block__item--open' : ''}"
             data-project-id="${project.id}">
          <div class="projects-block__summary" data-expand>
            <span class="badge ${badge} projects-block__status">${statusLabel}</span>
            <span class="projects-block__name">${escapeHTML(project.title)}</span>
            <span class="projects-block__chevron">${isExpanded ? '▲' : '▼'}</span>
          </div>
          <div class="projects-block__next-preview">→ ${nextPreview}</div>
          ${detailHtml}
        </div>
      `;
    }));

    listEl.innerHTML = rows.join('');
    bindEvents(projects);
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
                data-clear-next-action title="Verwijder volgende actie" aria-label="Verwijder volgende actie">×</button>
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
