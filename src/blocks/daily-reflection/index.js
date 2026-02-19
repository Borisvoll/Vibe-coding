import { renderDailyReflection } from './view.js';

export function registerDailyReflectionBlock(registry) {
  registry.register({
    id: 'daily-reflection',
    title: 'Reflectie',
    hosts: ['today-sections'],
    modes: ['BPV', 'School', 'Personal'],
    enabled: true,
    order: 50,
    mount(container, context) {
      return renderDailyReflection(container, context);
    },
  });
}
