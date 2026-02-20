import { renderWorryDump } from './view.js';

export function registerWorryDumpBlock(registry) {
  registry.register({
    id: 'worry-dump',
    title: 'Zorgendump',
    category: 'welzijn',
    description: 'Dump je zorgen → microstap of parkeren',
    hosts: ['vandaag-capture'],
    modes: ['Personal'],
    enabled: true,
    order: 35,
    mount(container, context) {
      return renderWorryDump(container, context);
    },
  });
}
