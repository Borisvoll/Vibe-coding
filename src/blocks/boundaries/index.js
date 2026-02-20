import { renderBoundaries } from './view.js';

export function registerBoundariesBlock(registry) {
  registry.register({
    id: 'boundaries',
    title: 'Grenzen-board',
    category: 'welzijn',
    description: 'Snelle zinnen als je hoofd vol zit',
    hosts: ['vandaag-mode'],
    modes: ['Personal'],
    enabled: true,
    order: 80,
    mount(container, context) {
      return renderBoundaries(container, context);
    },
  });
}
