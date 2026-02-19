import { renderBPVWeeklyOverview } from './view.js';

export function registerBPVWeeklyOverviewBlock(registry) {
  registry.register({
    id: 'bpv-weekly-overview',
    title: 'Weekoverzicht BPV',
    hosts: ['today-sections'],
    modes: ['BPV'],
    enabled: true,
    order: 14,
    mount(container, context) {
      return renderBPVWeeklyOverview(container, context);
    },
  });
}
