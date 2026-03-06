import { renderBPVReport } from './view.js';

export function registerBPVReportBlock(registry) {
  registry.register({
    id: 'bpv-report',
    title: 'Stageverslag',
    hosts: ['report-screen'],
    modes: ['BPV'],
    enabled: true,
    order: 1,
    mount(container, context) {
      return renderBPVReport(container, context);
    },
  });
}
