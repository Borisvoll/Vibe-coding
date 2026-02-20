import { renderDailyTodos } from './view.js';

export function registerDailyTodosBlock(registry) {
  registry.register({
    id: 'daily-todos',
    title: 'Taken Vandaag',
    hosts: ['vandaag-tasks'],
    modes: [],
    enabled: true,
    order: 6,
    mount(container, context) {
      return renderDailyTodos(container, context);
    },
  });
}
