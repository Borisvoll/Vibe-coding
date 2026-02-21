import { renderProjectDetail } from './view.js';

export function registerProjectDetailBlock(registry) {
  // Planning tab — compact, project picker tabs
  registry.register({
    id: 'project-detail',
    title: 'Projectplanning',
    hosts: ['planning-main'],
    modes: ['School', 'BPV', 'Personal'],
    enabled: true,
    order: 1,
    mount(container, context) {
      return renderProjectDetail(container, context);
    },
  });

  // Full-screen project space — triggered by #projects/[id] deep link
  registry.register({
    id: 'project-detail-fullscreen',
    title: 'Project ruimte',
    hosts: ['project-detail-view'],
    modes: ['School', 'BPV', 'Personal'],
    enabled: true,
    order: 1,
    mount(container, context) {
      return renderProjectDetail(container, { ...context, fullScreen: true });
    },
  });
}
