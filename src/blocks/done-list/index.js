import { renderDoneList } from './view.js';

export function registerDoneListBlock(registry) {
  registry.register({
    id: 'done-list',
    title: 'Gedaan-lijst',
    category: 'productiviteit',
    description: 'Geen to-dos — registreer wat je WEL hebt gedaan',
    hosts: ['vandaag-cockpit'],
    modes: [],
    enabled: true,
    order: 4,
    mount(container, context) {
      return renderDoneList(container, context);
    },
  });
}
