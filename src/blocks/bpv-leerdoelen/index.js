import { renderBPVLeerdoelen } from './view.js';

export function registerBPVLeerdoelenBlock(registry) {
  registry.register({
    id: 'bpv-leerdoelen',
    title: 'Leerdoelen',
    hosts: ['vandaag-mode'],
    modes: ['BPV'],
    enabled: true,
    order: 35,
    mount(container, context) {
      return renderBPVLeerdoelen(container, context);
    },
  });
}
