import { renderBPVToday } from './view.js';

export function registerBPVTodayBlock(registry) {
  registry.register({
    id: 'bpv-today',
    title: 'BPV Vandaag',
    hosts: ['vandaag-widgets'],
    modes: ['BPV'],
    enabled: true,
    mount(container) {
      return renderBPVToday(container);
    },
  });
}
