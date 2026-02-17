import { renderSchoolSkillTracker } from './view.js';

export function registerSchoolSkillTrackerBlock(registry) {
  registry.register({
    id: 'school-skill-tracker',
    title: 'School Skill Tracker',
    hosts: ['dashboard-cards'],
    modes: ['School'],
    enabled: true,
    mount(container) {
      return renderSchoolSkillTracker(container);
    },
  });
}
