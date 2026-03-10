import { renderBPVProgress } from './view.js';

export function registerBPVProgressBlock(registry) {
  registry.register({
    id: 'bpv-progress',
    title: 'BPV Voortgang',
    hosts: ['vandaag-hero'],
    modes: ['BPV'],
    enabled: true,
    order: 19,
    mount(container, context) {
      return renderBPVProgress(container, context);
    },
  });
}
