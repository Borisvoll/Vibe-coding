import { renderTasks } from './view.js';

export function registerTasksBlock(registry) {
  registry.register({
    id: 'tasks',
    title: 'Taken',
    hosts: ['vandaag-mode'],
    modes: ['BPV', 'School', 'Personal'],
    enabled: true,
    order: 20,
    mount(container, context) {
      return renderTasks(container, context);
    },
  });
}
