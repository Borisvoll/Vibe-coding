import { renderProjectHub } from './view.js';

export function registerProjectHubBlock(registry) {
  registry.register({
    id: 'project-hub',
    title: 'Projects Hub',
    hosts: ['projects-hub'],
    modes: [],  // all modes
    enabled: true,
    order: 1,
    mount(container, context) {
      return renderProjectHub(container, context);
    },
  });
}
