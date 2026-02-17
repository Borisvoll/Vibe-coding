import { renderSchoolMiniCard } from './view.js';

export function registerSchoolMiniCard(registry) {
  registry.register({
    id: 'school-mini-card',
    title: 'School Mini Card',
    hosts: ['dashboard-cards', 'vandaag-widgets'],
    modes: ['School'],
    enabled: true,
    mount(container, context) {
      return renderSchoolMiniCard(container, context);
    },
  });
}
