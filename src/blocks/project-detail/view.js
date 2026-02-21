import { getActiveProjects, getProjectById } from '../../stores/projects.js';
import { getProjectMomentum } from '../../stores/momentum.js';
import { renderSparkline } from '../../ui/sparkline.js';
import { escapeHTML } from '../../utils.js';
import { renderMonthGrid } from './agenda.js';
import { renderProjectTasks } from './task-list.js';
import { renderTimeline } from './timeline.js';
import './styles.css';

export function renderProjectDetail(container, context) {
  const mountId = `project-detail-${crypto.randomUUID()}`;
  const { eventBus, modeManager, routeParams = {}, fullScreen = false } = context;

  // If launched from a deep link (#projects/[id]), pre-select that project
  let selectedProjectId = routeParams.id || null;
  let subCleanups = [];

  const fsClass = fullScreen ? ' project-detail--fullscreen' : '';
  container.insertAdjacentHTML('beforeend', `
    <article class="project-detail${fsClass}" data-mount-id="${mountId}">
      <div class="project-detail__picker"></div>
      <div class="project-detail__content"></div>
    </article>
  `);

  const el = container.querySelector(`[data-mount-id="${mountId}"]`);
  const pickerEl = el.querySelector('.project-detail__picker');
  const contentEl = el.querySelector('.project-detail__content');

  async function render() {
    const mode = modeManager.getMode();
    const projects = await getActiveProjects(mode);

    // Auto-select first project if none selected or selected is gone
    if (!selectedProjectId || !projects.find((p) => p.id === selectedProjectId)) {
      selectedProjectId = projects.length > 0 ? projects[0].id : null;
    }

    renderPicker(projects);
    await renderContent();
  }

  function renderPicker(projects) {
    if (projects.length === 0) {
      pickerEl.innerHTML = `
        <p class="project-detail__empty">
          Geen actieve projecten. Maak een project aan via Vandaag → Projecten.
        </p>`;
      return;
    }

    pickerEl.innerHTML = `
      <div class="project-detail__tabs">
        ${projects.map((p) => `
          <button type="button"
            class="project-detail__tab ${p.id === selectedProjectId ? 'project-detail__tab--active' : ''}"
            data-project-tab="${p.id}">
            ${escapeHTML(p.title)}
          </button>
        `).join('')}
      </div>
    `;

    pickerEl.querySelectorAll('[data-project-tab]').forEach((btn) => {
      btn.addEventListener('click', () => {
        selectedProjectId = btn.dataset.projectTab;
        render();
      });
    });
  }

  async function renderContent() {
    // Cleanup previous sub-components
    subCleanups.forEach((fn) => fn());
    subCleanups = [];
    contentEl.innerHTML = '';

    if (!selectedProjectId) return;

    const project = await getProjectById(selectedProjectId);
    if (!project) return;

    // Momentum data (non-blocking)
    let momentumHtml = '';
    try {
      const momentum = await getProjectMomentum(project.id, project);
      const spark = renderSparkline(momentum.weeklyActivity, { isStalled: momentum.isStalled });
      let lastLabel = '';
      if (momentum.lastActiveDate) {
        const daysAgo = Math.floor((Date.now() - new Date(momentum.lastActiveDate + 'T00:00:00').getTime()) / (24 * 60 * 60 * 1000));
        lastLabel = daysAgo === 0 ? 'Vandaag actief' : daysAgo === 1 ? '1 dag geleden' : `${daysAgo}d geleden`;
      }
      momentumHtml = `
        <div class="project-detail__momentum">
          ${spark}
          ${lastLabel ? `<span class="project-detail__last-active${momentum.isStalled ? ' project-detail__last-active--stalled' : ''}">${escapeHTML(lastLabel)}</span>` : ''}
        </div>`;
    } catch { /* non-critical */ }

    const headerTag = fullScreen ? 'h1' : 'h3';
    contentEl.innerHTML = `
      <div class="project-detail__header${fullScreen ? ' project-detail__header--fullscreen' : ''}">
        <${headerTag} class="project-detail__title${fullScreen ? ' project-detail__title--fullscreen' : ''}">${escapeHTML(project.title)}</${headerTag}>
        ${project.goal ? `<p class="project-detail__goal">${escapeHTML(project.goal)}</p>` : ''}
        ${momentumHtml}
      </div>
      <div class="project-detail__agenda" data-section="agenda"></div>
      <div class="project-detail__tasks" data-section="tasks"></div>
      <div class="project-detail__timeline" data-section="timeline"></div>
    `;

    const agendaHost = contentEl.querySelector('[data-section="agenda"]');
    const tasksHost = contentEl.querySelector('[data-section="tasks"]');
    const timelineHost = contentEl.querySelector('[data-section="timeline"]');

    const agendaCleanup = renderMonthGrid(agendaHost, project, context);
    const tasksCleanup = renderProjectTasks(tasksHost, project, context);
    const timelineCleanup = renderTimeline(timelineHost, project, context);

    subCleanups.push(
      agendaCleanup?.unmount || (() => {}),
      tasksCleanup?.unmount || (() => {}),
      timelineCleanup?.unmount || (() => {}),
    );
  }

  // Check for deep-link project selection from URL hash
  function checkDeepLink() {
    const hash = window.location.hash;
    const match = hash.match(/planning\/([a-f0-9-]+)/);
    if (match) {
      selectedProjectId = match[1];
    }
  }

  checkDeepLink();

  const unsubMode = eventBus.on('mode:changed', () => render());
  const unsubProjects = eventBus.on('projects:changed', () => render());
  const unsubTasks = eventBus.on('tasks:changed', () => render());

  render();

  return {
    unmount() {
      unsubMode?.();
      unsubProjects?.();
      unsubTasks?.();
      subCleanups.forEach((fn) => fn());
      el?.remove();
    },
  };
}
