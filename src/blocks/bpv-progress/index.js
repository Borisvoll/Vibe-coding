import { renderBPVProgress } from './view.js';

export function registerBPVProgressBlock(registry) {
  registry.register({
    id: 'bpv-progress',
    title: 'BPV Voortgang',
    hosts: ['vandaag-mode'],
    modes: ['BPV'],
    enabled: true,
    order: 5,
    mount(container, context) {
      return renderBPVProgress(container, context);
    },
  });
}
