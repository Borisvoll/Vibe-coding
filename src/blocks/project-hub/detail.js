import { getProjectById, updateProject, setPinned, unpinProject, getPinnedProject } from '../../stores/projects.js';
import { escapeHTML } from '../../utils.js';
import { renderBannerTab } from './tabs/banner.js';
import { renderTasksTab } from './tabs/tasks.js';
import { renderTimelineTab } from './tabs/timeline.js';
import { renderFilesTab } from './tabs/files.js';
import { renderKanbanTab } from './tabs/kanban.js';
import { renderMonthGrid } from '../project-detail/agenda.js';

const TABS = [
  { id: 'banner', label: 'Banner' },
  { id: 'tasks', label: 'Taken' },
  { id: 'kanban', label: 'Kanban' },
  { id: 'agenda', label: 'Agenda' },
  { id: 'timeline', label: 'Tijdlijn' },
  { id: 'mindmap', label: 'Mindmap' },
  { id: 'files', label: 'Bestanden' },
];

/**
 * Project detail view — HeroBanner + 4 tabs.
 * @param {HTMLElement} container
 * @param {object} context
 * @param {string} projectId
 * @param {function} onBack - called when user clicks "← Projecten"
 * @returns {function} cleanup
 */
export function renderProjectDetail(container, context, projectId, onBack) {
  const { eventBus } = context;
  let project = null;
  let activeTab = 'banner';
  let tabCleanup = null;
  let editingTitle = false;
  let isPinned = false;

  container.insertAdjacentHTML('beforeend', `
    <div class="hub-detail" data-project-detail data-project-id="${projectId}">
      <div class="hub-detail__topbar">
        <button type="button" class="btn btn-ghost btn-sm hub-detail__back" data-back>\u2190 Projecten</button>
        <div class="hub-detail__topbar-actions">
          <button type="button" class="btn btn-ghost btn-sm hub-detail__pin-btn" data-pin title="Vast in Vandaag">\u{1F4CC}</button>
          <button type="button" class="btn btn-ghost btn-sm" data-edit-title title="Projectnaam bewerken">\u{270F}\u{FE0F}</button>
        </div>
      </div>
      <div class="hub-detail__hero" data-hero></div>
      <div class="hub-detail__header" data-header></div>
      <nav class="hub-detail__tabs" data-tabs></nav>
      <div class="hub-detail__content" data-content></div>
    </div>
  `);

  const el = container.querySelector('[data-project-detail]');
  const heroEl = el.querySelector('[data-hero]');
  const headerEl = el.querySelector('[data-header]');
  const tabsEl = el.querySelector('[data-tabs]');
  const contentEl = el.querySelector('[data-content]');

  el.querySelector('[data-back]').addEventListener('click', () => {
    cleanup();
    onBack();
  });

  el.querySelector('[data-edit-title]').addEventListener('click', () => {
    editingTitle = true;
    renderHeader();
  });

  el.querySelector('[data-pin]').addEventListener('click', async () => {
    if (!project) return;
    const mode = project.mode || context.modeManager.getMode();
    if (isPinned) {
      await unpinProject(project.id);
      isPinned = false;
    } else {
      await setPinned(project.id, mode);
      isPinned = true;
    }
    updatePinBtn();
    eventBus.emit('projects:changed');
  });

  function updatePinBtn() {
    const pinBtn = el.querySelector('[data-pin]');
    if (!pinBtn) return;
    pinBtn.classList.toggle('hub-detail__pin-btn--active', isPinned);
    pinBtn.title = isPinned ? 'Lospinnen uit Vandaag' : 'Vast in Vandaag';
  }

  async function load() {
    project = await getProjectById(projectId);
    if (!project) {
      container.innerHTML = '<p class="hub-detail__not-found">Project niet gevonden.</p>';
      return;
    }
    // Apply project accent color
    const accent = project.accentColor || 'var(--color-accent)';
    el.style.setProperty('--project-accent', accent);

    // Check pin state
    const mode = project.mode || context.modeManager.getMode();
    const pinned = await getPinnedProject(mode);
    isPinned = pinned?.id === project.id;
    updatePinBtn();

    renderHero();
    renderHeader();
    renderTabs();
    mountTab(activeTab);
  }

  function renderHero() {
    if (project.cover) {
      const isPdf = project.cover.startsWith('data:application/pdf');
      if (isPdf) {
        heroEl.innerHTML = `
          <div class="hub-detail__hero-pdf">
            <span>📕</span>
            <a href="${project.cover}" download="cover.pdf" class="btn btn-ghost btn-sm">Cover downloaden (PDF)</a>
          </div>`;
      } else {
        heroEl.innerHTML = `<img src="${project.cover}" alt="Cover" class="hub-detail__hero-img" />`;
      }
    } else {
      heroEl.innerHTML = `
        <div class="hub-detail__hero-placeholder" style="background: var(--project-accent, var(--color-accent))">
          <span class="hub-detail__hero-initials">${escapeHTML(project.title.slice(0, 2).toUpperCase())}</span>
        </div>`;
    }
  }

  function renderHeader() {
    if (editingTitle) {
      headerEl.innerHTML = `
        <form class="hub-detail__title-form" data-title-form>
          <input type="text" class="form-input hub-detail__title-input" value="${escapeHTML(project.title)}" autocomplete="off" />
          <button type="submit" class="btn btn-primary btn-sm">Opslaan</button>
          <button type="button" class="btn btn-ghost btn-sm" data-cancel-title>Annuleer</button>
        </form>`;

      const form = headerEl.querySelector('[data-title-form]');
      form.querySelector('input').focus();

      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const newTitle = form.querySelector('input').value.trim();
        if (newTitle && newTitle !== project.title) {
          project = await updateProject(projectId, { title: newTitle });
          eventBus.emit('projects:changed');
        }
        editingTitle = false;
        renderHeader();
      });

      form.querySelector('[data-cancel-title]').addEventListener('click', () => {
        editingTitle = false;
        renderHeader();
      });
    } else {
      const statusClass = `hub-detail__status--${project.status || 'active'}`;
      headerEl.innerHTML = `
        <div class="hub-detail__header-inner">
          <h3 class="hub-detail__title">${escapeHTML(project.title)}</h3>
          ${project.goal ? `<p class="hub-detail__goal">${escapeHTML(project.goal)}</p>` : ''}
          <span class="hub-detail__status ${statusClass}" data-status-badge>${statusLabel(project.status)}</span>
          ${isPinned ? `<span class="hub-detail__pinned-badge">\u{1F4CC} Vast in Vandaag</span>` : ''}
        </div>`;
    }
  }

  function renderTabs() {
    tabsEl.innerHTML = TABS.map((tab) => `
      <button type="button" class="hub-detail__tab ${tab.id === activeTab ? 'hub-detail__tab--active' : ''}"
        data-tab="${tab.id}">${tab.label}</button>
    `).join('');

    tabsEl.querySelectorAll('[data-tab]').forEach((btn) => {
      btn.addEventListener('click', () => {
        activeTab = btn.dataset.tab;
        renderTabs();
        mountTab(activeTab);
      });
    });
  }

  function mountTab(tabId) {
    tabCleanup?.unmount?.();
    tabCleanup = null;
    contentEl.innerHTML = '';

    if (tabId === 'banner') {
      tabCleanup = renderBannerTab(contentEl, project, context);
    } else if (tabId === 'tasks') {
      tabCleanup = renderTasksTab(contentEl, project, context);
    } else if (tabId === 'kanban') {
      tabCleanup = renderKanbanTab(contentEl, project, context);
    } else if (tabId === 'agenda') {
      tabCleanup = renderMonthGrid(contentEl, project, context);
    } else if (tabId === 'timeline') {
      tabCleanup = renderTimelineTab(contentEl, project, context);
    } else if (tabId === 'mindmap') {
      // Lazy-load mindmap to protect main context window from heavy SVG
      contentEl.innerHTML = '<p class="hub-detail__loading">Mindmap laden…</p>';
      import('./tabs/mindmap.js').then(({ renderMindmapTab }) => {
        contentEl.innerHTML = '';
        tabCleanup = renderMindmapTab(contentEl, project, context);
      });
      return;
    } else if (tabId === 'files') {
      tabCleanup = renderFilesTab(contentEl, project, context);
    }
  }

  const unsubProjects = eventBus.on('projects:changed', async () => {
    const refreshed = await getProjectById(projectId);
    if (refreshed) {
      project = refreshed;
      const accent = project.accentColor || 'var(--color-accent)';
      el.style.setProperty('--project-accent', accent);
      renderHero();
      if (!editingTitle) renderHeader();
    }
  });

  load();

  function cleanup() {
    tabCleanup?.unmount?.();
    unsubProjects?.();
    el?.remove();
  }

  return cleanup;
}

function statusLabel(status) {
  return { active: 'Actief', paused: 'Gepauzeerd', done: 'Gereed' }[status] || status;
}
