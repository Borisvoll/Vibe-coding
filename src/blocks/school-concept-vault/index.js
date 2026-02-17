import { renderSchoolConceptVault } from './view.js';

export function registerSchoolConceptVaultBlock(registry) {
  registry.register({
    id: 'school-concept-vault',
    title: 'School Concept Vault',
    hosts: ['dashboard-cards'],
    modes: ['School'],
    enabled: true,
    mount(container) {
      return renderSchoolConceptVault(container);
    },
  });
}
