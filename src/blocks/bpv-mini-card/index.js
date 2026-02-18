import { renderBPVMiniCard } from './view.js';

export function registerBPVMiniCard(registry) {
  registry.register({
    id: 'bpv-mini-card',
    title: 'BPV Mini Card',
    hosts: ['dashboard-cards', 'vandaag-widgets'],
    modes: ['BPV'],
    enabled: true,
    mount(container, context) {
      return renderBPVMiniCard(container, context);
    },
  });
}
