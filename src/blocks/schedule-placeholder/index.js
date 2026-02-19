import { renderSchedulePlaceholder } from './view.js';

export function registerSchedulePlaceholderBlock(registry) {
  registry.register({
    id: 'schedule-placeholder',
    title: 'Agenda',
    hosts: ['today-sections'],
    modes: ['BPV', 'School', 'Personal'],
    enabled: true,
    order: 25,
    mount(container, context) {
      return renderSchedulePlaceholder(container, context);
    },
  });
}
