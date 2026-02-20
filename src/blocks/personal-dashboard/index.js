import { mountPersonalDashboard } from './view.js';

export function registerPersonalDashboardBlock(registry) {
  registry.register({
    id: 'personal-dashboard',
    title: 'Persoonlijk Dashboard',
    hosts: ['vandaag-mode'],
    modes: ['Personal'],
    enabled: true,
    order: 5,
    mount(container, context) {
      return mountPersonalDashboard(container, context);
    },
  });
}
