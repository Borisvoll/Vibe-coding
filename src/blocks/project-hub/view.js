import { renderProjectList } from './list.js';
import { renderProjectDetail } from './detail.js';

/**
 * Project Hub — main controller.
 * Manages two internal states: list-view ↔ detail-view.
 * Uses a simple internal router (no URL changes needed — already on `projects` tab).
 */
export function renderProjectHub(container, context) {
  const mountId = `project-hub-${crypto.randomUUID()}`;

  container.insertAdjacentHTML('beforeend', `
    <div class="project-hub" data-mount-id="${mountId}">
      <div class="project-hub__view" data-hub-view></div>
    </div>
  `);

  const el = container.querySelector(`[data-mount-id="${mountId}"]`);
  const viewEl = el.querySelector('[data-hub-view]');

  let currentCleanup = null;

  function showList() {
    currentCleanup?.();
    viewEl.innerHTML = '';
    currentCleanup = renderProjectList(viewEl, context, (projectId) => {
      showDetail(projectId);
    });
  }

  function showDetail(projectId) {
    currentCleanup?.();
    viewEl.innerHTML = '';
    currentCleanup = renderProjectDetail(viewEl, context, projectId, () => {
      showList();
    });
  }

  // Check for deep-link: #tab=projects&project=<id>
  const hash = window.location.hash;
  const deepProject = new URLSearchParams(hash.replace(/^#/, '')).get('project');
  if (deepProject) {
    showDetail(deepProject);
  } else {
    showList();
  }

  // Listen for projects:open event from other blocks
  const unsubOpen = context.eventBus.on('projects:open', ({ projectId }) => {
    showDetail(projectId);
  });

  return {
    unmount() {
      currentCleanup?.();
      unsubOpen?.();
      el?.remove();
    },
  };
}
