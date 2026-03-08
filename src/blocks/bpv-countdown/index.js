import { renderBPVCountdown } from './view.js';

export function registerBPVCountdownBlock(registry) {
  registry.register({
    id: 'bpv-countdown',
    title: 'BPV Countdown',
    hosts: ['vandaag-mode'],
    modes: ['BPV'],
    enabled: true,
    order: 5,
    mount(container, context) {
      return renderBPVCountdown(container, context);
    },
  });
}
