import { renderTwoMinLauncher } from './view.js';

export function registerTwoMinLauncherBlock(registry) {
  registry.register({
    id: 'two-min-launcher',
    title: '2-Minuten Launcher',
    category: 'productiviteit',
    description: 'Start met 2 minuten — verlaag de drempel',
    hosts: ['vandaag-hero'],
    modes: [],
    enabled: true,
    order: 3,
    mount(container, context) {
      return renderTwoMinLauncher(container, context);
    },
  });
}
