import { renderBPVToday } from './view.js';

export function registerBPVTodayBlock(registry) {
  registry.register({
    id: 'bpv-today',
    title: 'BPV Vandaag',
    hosts: ['today-sections', 'vandaag-widgets'],
    modes: ['BPV'],
    enabled: true,
    order: 40,
    mount(container) {
      return renderBPVToday(container);
    },
  });
}
