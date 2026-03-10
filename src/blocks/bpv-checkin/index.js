import { renderBPVCheckin } from './view.js';

export function registerBPVCheckinBlock(registry) {
  registry.register({
    id: 'bpv-checkin',
    title: 'Dagelijkse Check-in',
    hosts: ['vandaag-hero'],
    modes: ['BPV'],
    enabled: true,
    order: 20,
    mount(container, context) {
      return renderBPVCheckin(container, context);
    },
  });
}
