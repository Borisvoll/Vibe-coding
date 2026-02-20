import { renderInbox } from './view.js';

export function registerInboxBlock(registry) {
  registry.register({
    id: 'inbox',
    title: 'Inbox',
    hosts: ['vandaag-core', 'dashboard-cards'],
    modes: ['BPV', 'School', 'Personal'],
    enabled: true,
    order: 10,
    mount(container, context) {
      return renderInbox(container, context);
    },
  });
}
