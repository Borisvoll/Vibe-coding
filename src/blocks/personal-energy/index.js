import { renderPersonalEnergy } from './view.js';

export function registerPersonalEnergyBlock(registry) {
  registry.register({
    id: 'personal-energy-block',
    title: 'Personal Energy',
    hosts: ['dashboard-cards'],
    modes: ['Personal'],
    enabled: true,
    mount(container) {
      return renderPersonalEnergy(container);
    },
  });
}
