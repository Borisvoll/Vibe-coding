import { renderBPVCheckin } from './view.js';

export function registerBPVCheckinBlock(registry) {
  registry.register({
    id: 'bpv-checkin',
    title: 'Dagelijkse Check-in',
    hosts: ['vandaag-mode'],
    modes: ['BPV'],
    enabled: true,
    order: 6,
    mount(container, context) {
      return renderBPVCheckin(container, context);
    },
  });
}
