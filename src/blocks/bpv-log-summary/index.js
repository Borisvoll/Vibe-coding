import { renderBPVLogSummary } from './view.js';

export function registerBPVLogSummaryBlock(registry) {
  registry.register({
    id: 'bpv-log-summary',
    title: 'BPV Log',
    hosts: ['vandaag-secondary'],
    modes: ['BPV'],
    enabled: true,
    order: 30,
    mount(container) {
      return renderBPVLogSummary(container);
    },
  });
}
