import './styles.css';

export function renderPersonalMiniCard(container, context) {
  const mountId = `personal-mini-${crypto.randomUUID()}`;
  container.insertAdjacentHTML(
    'beforeend',
    `<article class="os-mini-card os-mini-card--personal" data-mount-id="${mountId}">Persoonlijke modus actief</article>`
  );

  return {
    unmount() {
      const node = container.querySelector(`[data-mount-id="${mountId}"]`);
      if (node) node.remove();
    },
  };
}
