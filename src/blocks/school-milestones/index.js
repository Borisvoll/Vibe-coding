import { renderSchoolMilestones } from './view.js';

export function registerSchoolMilestonesBlock(registry) {
  registry.register({
    id: 'school-milestones',
    title: 'School Milestones',
    hosts: ['dashboard-cards'],
    modes: ['School'],
    enabled: true,
    mount(container) {
      return renderSchoolMilestones(container);
    },
  });
}
