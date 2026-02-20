import { renderPersonalMiniCard } from './view.js';

export function registerPersonalMiniCard(registry) {
  registry.register({
    id: 'personal-mini-card',
    title: 'Personal Mini Card',
    hosts: ['dashboard-cards'],
    modes: ['Personal'],
    enabled: true,
    mount(container, context) {
      return renderPersonalMiniCard(container, context);
    },
  });
}
