import { renderBPVDataManager } from './view.js';

export function registerBPVDataManagerBlock(registry) {
  registry.register({
    id: 'bpv-data-manager',
    title: 'Stagedata beheren',
    hosts: ['vandaag-mode'],
    modes: ['BPV'],
    enabled: true,
    order: 20,
    mount(container, context) {
      return renderBPVDataManager(container, context);
    },
  });
}
