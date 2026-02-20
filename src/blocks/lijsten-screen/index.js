import { mountLijstenScreen } from './view.js';

export function registerLijstenScreenBlock(registry) {
  registry.register({
    id: 'lijsten-screen',
    title: 'Lijsten (volledig)',
    hosts: ['lijsten-screen'],
    modes: [],  // All modes
    enabled: true,
    mount(container, context) {
      return mountLijstenScreen(container, context);
    },
  });
}
