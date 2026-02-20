import { renderProjectDetail } from './view.js';

export function registerProjectDetailBlock(registry) {
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
}
