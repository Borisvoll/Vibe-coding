import { renderBPVHeatmap } from './view.js';

export function registerBPVHeatmapBlock(registry) {
  registry.register({
    id: 'bpv-heatmap',
    title: 'Uren Heatmap',
    hosts: ['vandaag-mode'],
    modes: ['BPV'],
    enabled: true,
    order: 30,
    mount(container, context) {
      return renderBPVHeatmap(container, context);
    },
  });
}
