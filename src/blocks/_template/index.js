import { renderTemplateBlock } from './view.js';

export function registerBlock(registry) {
  registry.register({
    id: 'template-example',
    title: 'Template Example',
    hosts: ['dashboard-cards'],
    modes: ['BPV', 'School', 'Personal'],
    enabled: false,
    mount(container, context) {
      return renderTemplateBlock(container, context);
    },
  });
}
