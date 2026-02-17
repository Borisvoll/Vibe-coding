import './styles.css';

export function renderSchoolMiniCard(container, context) {
  const mountId = `school-mini-${crypto.randomUUID()}`;
  container.insertAdjacentHTML(
    'beforeend',
    `<article class="os-mini-card os-mini-card--school" data-mount-id="${mountId}">School-modus actief</article>`
  );

  return {
    unmount() {
      const node = container.querySelector(`[data-mount-id="${mountId}"]`);
      if (node) node.remove();
    },
  };
}
