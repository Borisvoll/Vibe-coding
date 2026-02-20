import { renderConversationDebrief } from './view.js';

export function registerConversationDebriefBlock(registry) {
  registry.register({
    id: 'conversation-debrief',
    title: 'Gesprekscheck',
    category: 'welzijn',
    description: 'Hoe ging dat gesprek? 3 knoppen + reden',
    hosts: ['vandaag-reflection'],
    modes: ['Personal'],
    enabled: true,
    order: 55,
    mount(container, context) {
      return renderConversationDebrief(container, context);
    },
  });
}
