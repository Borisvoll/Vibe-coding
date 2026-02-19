import { renderPersonalToday } from './view.js';

export function registerPersonalTodayBlock(registry) {
  registry.register({
    id: 'personal-today-block',
    title: 'Personal Today',
    hosts: ['today-sections', 'vandaag-widgets'],
    modes: ['Personal'],
    enabled: true,
    order: 40,
    mount(container, context) {
      return renderPersonalToday(container, context);
    },
  });
}
