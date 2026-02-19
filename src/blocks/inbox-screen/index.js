import { renderInboxScreen } from './view.js';

export function registerInboxScreenBlock(registry) {
  registry.register({
    id: 'inbox-screen',
    title: 'Inbox Verwerken',
    hosts: ['inbox-screen'],
    modes: ['BPV', 'School', 'Personal'],
    enabled: true,
    order: 1,
    mount(container, context) {
      return renderInboxScreen(container, context);
    },
  });
}
