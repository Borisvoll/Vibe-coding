import { renderBPVLogSummary } from './view.js';

export function registerBPVLogSummaryBlock(registry) {
  registry.register({
    id: 'bpv-log-summary',
    title: 'BPV Log',
    hosts: ['today-sections'],
    modes: ['BPV'],
    enabled: true,
    order: 30,
    mount(container) {
      return renderBPVLogSummary(container);
    },
  });
}
