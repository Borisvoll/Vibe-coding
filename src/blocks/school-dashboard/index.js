import { renderSchoolDashboard } from './view.js';

export function registerSchoolDashboardBlock(registry) {
  registry.register({
    id: 'school-dashboard',
    title: 'School Dashboard',
    hosts: ['vandaag-mode'],
    modes: ['School'],
    enabled: true,
    order: 6,
    mount(container, context) {
      return renderSchoolDashboard(container, context);
    },
  });
}
