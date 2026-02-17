import { renderPersonalToday } from './view.js';

export function registerPersonalTodayBlock(registry) {
  registry.register({
    id: 'personal-today-block',
    title: 'Personal Today',
    hosts: ['dashboard-cards'],
    modes: ['Personal'],
    enabled: true,
    mount(container, context) {
      return renderPersonalToday(container, context);
    },
  });
}
