import { escapeHTML } from '../../utils.js';
import { getWellbeing, saveWellbeing } from './store.js';

export function renderPersonalEnergy(container) {
  const mountId = `personal-energy-${crypto.randomUUID()}`;

  async function render() {
    const value = await getWellbeing();
    const host = container.querySelector(`[data-block-id="${mountId}"]`);
    if (!host) return;

    host.innerHTML = `
      <h3 class="school-block__title">Energy + Mood + Gratitude</h3>
      <label class="school-block__field"><span>Energy (1-10)</span><input class="form-input" data-field="energy" type="number" min="1" max="10" value="${escapeHTML(value?.energy || '')}"></label>
      <label class="school-block__field"><span>Mood</span><input class="form-input" data-field="mood" value="${escapeHTML(value?.mood || '')}"></label>
      <label class="school-block__field"><span>Gratitude</span><textarea class="form-textarea" data-field="gratitude" rows="2">${escapeHTML(value?.gratitude || '')}</textarea></label>
      <div class="school-block__actions"><button class="btn btn-primary btn-sm" data-action="save">Opslaan</button></div>
    `;

    host.querySelector('[data-action="save"]')?.addEventListener('click', async () => {
      await saveWellbeing({
        energy: host.querySelector('[data-field="energy"]').value,
        mood: host.querySelector('[data-field="mood"]').value.trim(),
        gratitude: host.querySelector('[data-field="gratitude"]').value.trim(),
      });
      render();
    });
  }

  container.insertAdjacentHTML('beforeend', `<article class="os-mini-card school-block" data-block-id="${mountId}"></article>`);
  render();
  return { unmount() { container.querySelector(`[data-block-id="${mountId}"]`)?.remove(); } };
}
