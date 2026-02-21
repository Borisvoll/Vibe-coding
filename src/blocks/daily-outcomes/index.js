import { renderDailyOutcomes } from './view.js';

export function registerDailyOutcomesBlock(registry) {
  registry.register({
    id: 'daily-outcomes',
    title: 'Top 3 vandaag',
    hosts: ['vandaag-hero'],
    modes: ['BPV', 'School', 'Personal'],
    enabled: true,
    order: 5,
    mount(container, context) {
      return renderDailyOutcomes(container, context);
    },
  });
}
