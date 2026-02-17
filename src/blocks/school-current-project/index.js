import { renderSchoolCurrentProject } from './view.js';

export function registerSchoolCurrentProjectBlock(registry) {
  registry.register({
    id: 'school-current-project',
    title: 'School Current Project',
    hosts: ['dashboard-cards'],
    modes: ['School'],
    enabled: true,
    mount(container) {
      return renderSchoolCurrentProject(container);
    },
  });
}
