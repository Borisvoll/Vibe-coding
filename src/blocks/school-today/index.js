import { renderSchoolToday } from './view.js';

export function registerSchoolTodayBlock(registry) {
  registry.register({
    id: 'school-today',
    title: 'School Vandaag',
    hosts: ['vandaag-widgets'],
    modes: ['School'],
    enabled: true,
    mount(container) {
      return renderSchoolToday(container);
    },
  });
}
