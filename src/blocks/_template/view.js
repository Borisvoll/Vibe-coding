import './styles.css';
import { getTemplateState, setTemplateState } from './store.js';

export function renderTemplateBlock(container, context) {
  const mountId = crypto.randomUUID();
  const seen = getTemplateState('seenCount', 0) + 1;
  setTemplateState('seenCount', seen);

  container.insertAdjacentHTML(
    'beforeend',
    `
      <article class="os-block-template" data-mount-id="${mountId}">
        <h3 class="os-block-template__title">Template block</h3>
        <p class="os-block-template__text">Mode: ${context.mode}</p>
        <small class="os-block-template__meta">Rendered ${seen} times</small>
      </article>
    `
  );

  return {
    unmount() {
      const node = container.querySelector(`[data-mount-id="${mountId}"]`);
      if (node) node.remove();
    },
  };
}
