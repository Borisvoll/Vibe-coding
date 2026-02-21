import { renderHistoryBrowser } from './view.js';

export function registerHistoryBrowserBlock(registry) {
  registry.register({
    id: 'history-browser',
    title: 'Geschiedenis',
    hosts: ['vandaag-history'],
    modes: [],
    enabled: true,
    order: 1,
    mount(container, context) {
      return renderHistoryBrowser(container, context);
    },
  });
}
