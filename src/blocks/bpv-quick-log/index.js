import { renderBPVQuickLog } from './view.js';

export function registerBPVQuickLogBlock(registry) {
  registry.register({
    id: 'bpv-quick-log',
    title: 'Snel loggen',
    hosts: ['vandaag-mode'],
    modes: ['BPV'],
    enabled: true,
    order: 8,
    mount(container, context) {
      return renderBPVQuickLog(container, context);
    },
  });
}
