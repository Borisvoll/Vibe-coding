import { renderProjects } from './view.js';

export function registerProjectsBlock(registry) {
  registry.register({
    id: 'projects',
    title: 'Projecten',
    hosts: ['today-sections'],
    modes: ['BPV', 'School', 'Personal'],
    enabled: true,
    order: 12,
    mount(container, context) {
      return renderProjects(container, context);
    },
  });
}
