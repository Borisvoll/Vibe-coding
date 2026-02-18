import { renderPersonalWeekPlanning } from './view.js';

export function registerPersonalWeekPlanningBlock(registry) {
  registry.register({
    id: 'personal-week-planning',
    title: 'Personal Week Planning',
    hosts: ['dashboard-cards'],
    modes: ['Personal'],
    enabled: true,
    mount(container) {
      return renderPersonalWeekPlanning(container);
    },
  });
}
