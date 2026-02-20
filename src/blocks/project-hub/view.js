import { renderProjectList } from './list.js';

/**
 * Project Hub — list view.
 * Card clicks navigate to #projects/:id via hash (template router handles detail).
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

  const cleanup = renderProjectList(viewEl, context, (projectId) => {
    window.location.hash = `#projects/${projectId}`;
  });

  return {
    unmount() {
      cleanup?.();
      el?.remove();
    },
  };
}
