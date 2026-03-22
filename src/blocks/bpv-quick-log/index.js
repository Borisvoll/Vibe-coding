import { renderBPVQuickLog } from './view.js';

export function registerBPVQuickLogBlock(registry) {
  registry.register({
    id: 'bpv-quick-log',
    title: 'Stage-uren',
    hosts: ['vandaag-mode'],
    modes: ['BPV'],
    enabled: true,
    order: 10,
    mount(container, context) {
      return renderBPVQuickLog(container, context);
    },
  });
}
