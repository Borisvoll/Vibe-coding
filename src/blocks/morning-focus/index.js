import { renderMorningFocus } from './view.js';

export function registerMorningFocusBlock(registry) {
  registry.register({
    id: 'morning-focus',
    title: 'Ochtendplan',
    hosts: ['vandaag-hero'],
    modes: [],
    enabled: true,
    order: 7,
    mount(container, context) {
      return renderMorningFocus(container, context);
    },
  });
}
