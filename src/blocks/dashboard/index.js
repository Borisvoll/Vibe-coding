import { renderDashboard } from './view.js';

export function registerDashboardBlock(registry) {
  registry.register({
    id: 'main-dashboard',
    hosts: ['dashboard-cards'],
    modes: [],
    order: 1,
    enabled: true,
    mount(container, context) {
      return renderDashboard(container, context);
    },
  });
}
