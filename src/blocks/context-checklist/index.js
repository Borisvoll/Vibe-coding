import { renderContextChecklist } from './view.js';

export function registerContextChecklistBlock(registry) {
  registry.register({
    id: 'context-checklist',
    title: 'Dagchecklist',
    category: 'productiviteit',
    description: 'Mode-specifieke checklist die dagelijks reset',
    hosts: ['vandaag-tasks'],
    modes: [],
    enabled: true,
    order: 7,
    mount(container, context) {
      return renderContextChecklist(container, context);
    },
  });
}
