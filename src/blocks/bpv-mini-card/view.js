import './styles.css';

export function renderBPVMiniCard(container, context) {
  const mountId = `bpv-mini-${crypto.randomUUID()}`;
  container.insertAdjacentHTML(
    'beforeend',
    `<article class="os-mini-card os-mini-card--bpv" data-mount-id="${mountId}">BPV mode active</article>`
  );

  return {
    unmount() {
      const node = container.querySelector(`[data-mount-id="${mountId}"]`);
      if (node) node.remove();
    },
  };
}
