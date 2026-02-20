import { renderDailyCockpit } from './view.js';

export function registerDailyCockpitBlock(registry) {
  registry.register({
    id: 'daily-cockpit',
    title: 'Cockpit',
    hosts: ['vandaag-cockpit'],
    modes: [],
    enabled: true,
    order: 1,
    mount(container, context) {
      return renderDailyCockpit(container, context);
    },
  });
}
