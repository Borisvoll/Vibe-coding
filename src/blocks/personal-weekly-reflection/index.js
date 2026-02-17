import { renderPersonalWeeklyReflection } from './view.js';

export function registerPersonalWeeklyReflectionBlock(registry) {
  registry.register({
    id: 'personal-weekly-reflection',
    title: 'Personal Weekly Reflection',
    hosts: ['dashboard-cards'],
    modes: ['Personal'],
    enabled: true,
    mount(container) {
      return renderPersonalWeeklyReflection(container);
    },
  });
}
