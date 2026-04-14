import { renderBPVReportGenerator } from './view.js';

export function registerBPVReportGeneratorBlock(registry) {
  registry.register({
    id: 'bpv-report-generator',
    title: 'Stageverslag generator',
    hosts: ['vandaag-mode'],
    modes: ['BPV'],
    enabled: true,
    order: 38,
    mount(container, context) {
      return renderBPVReportGenerator(container, context);
    },
  });
}
