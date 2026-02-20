import { renderSchoolToday } from './view.js';

export function registerSchoolTodayBlock(registry) {
  registry.register({
    id: 'school-today',
    title: 'School Vandaag',
    hosts: ['vandaag-secondary'],
    modes: ['School'],
    enabled: true,
    order: 40,
    mount(container) {
      return renderSchoolToday(container);
    },
  });
}
