import { renderBrainState } from './view.js';

export function registerBrainStateBlock(registry) {
  registry.register({
    id: 'brain-state',
    title: 'Stoplicht',
    category: 'welzijn',
    description: 'Hoe voelt je hoofd? Groen/Oranje/Rood',
    hosts: ['vandaag-hero'],
    modes: ['Personal'],
    enabled: true,
    order: 2,
    mount(container, context) {
      return renderBrainState(container, context);
    },
  });
}
