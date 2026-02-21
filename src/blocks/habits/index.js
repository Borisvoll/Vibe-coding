import { renderHabitsBlock } from './view.js';

export function registerHabitsBlock(registry) {
  registry.register({
    id: 'habits',
    title: 'Gewoontes',
    hosts: ['vandaag-tasks'],
    modes: ['School', 'Personal'],
    enabled: true,
    order: 7,
    mount(container, context) {
      return renderHabitsBlock(container, context);
    },
  });
}
