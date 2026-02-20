import { renderProjectDetail } from '../project-hub/detail.js';

/**
 * Project Detail View block — mounts into `project-detail-view` host slot.
 * The project ID comes from context.params.id (set by the router).
 * The back button navigates to #projects via hash.
 */
export function registerProjectDetailViewBlock(registry) {
  registry.register({
    id: 'project-detail-view',
    title: 'Project Detail',
    hosts: ['project-detail-view'],
    modes: [],  // all modes
    enabled: true,
    order: 1,
    mount(container, context) {
      const projectId = context.params?.id;
      if (!projectId) {
        container.innerHTML = '<p class="hub-detail__not-found">Geen project geselecteerd.</p>';
        return { unmount() {} };
      }

      let cleanupCalled = false;
      const cleanup = renderProjectDetail(container, context, projectId, () => {
        // onBack: navigate to projects list via hash
        window.location.hash = '#projects';
      });

      return {
        unmount() {
          if (!cleanupCalled) {
            cleanupCalled = true;
            cleanup?.();
          }
        },
      };
    },
  });
}
