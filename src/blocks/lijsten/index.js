import { renderLijsten } from './view.js';

export function registerLijstenBlock(registry) {
  registry.register({
    id: 'lijsten',
    title: 'Lijsten',
    hosts: ['vandaag-projects'],
    modes: ['BPV', 'School', 'Personal'],
    enabled: true,
    order: 25,
    mount(container, context) {
      return renderLijsten(container, context);
    },
  });
}
