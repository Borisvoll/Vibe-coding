import { escapeHTML, getISOWeek, getToday } from '../../utils.js';
import { getReflection, saveReflection } from './store.js';

export function renderPersonalWeeklyReflection(container) {
  const mountId = `personal-reflection-${crypto.randomUUID()}`;
  const weekKey = getISOWeek(getToday());

  async function render() {
    const reflection = await getReflection(weekKey);
    const host = container.querySelector(`[data-block-id="${mountId}"]`);
    if (!host) return;

    host.innerHTML = `
      <h3 class="school-block__title">Wekelijkse balansreflectie</h3>
      <p class="school-block__subtitle">Week ${escapeHTML(weekKey)}</p>
      <label class="school-block__field"><span>Wat voelde in balans?</span><textarea class="form-textarea" data-field="balanced" rows="2">${escapeHTML(reflection?.balanced || '')}</textarea></label>
      <label class="school-block__field"><span>Wat wil ik bijsturen?</span><textarea class="form-textarea" data-field="adjust" rows="2">${escapeHTML(reflection?.adjust || '')}</textarea></label>
      <div class="school-block__actions"><button class="btn btn-primary btn-sm" data-action="save">Opslaan</button></div>
    `;

    host.querySelector('[data-action="save"]')?.addEventListener('click', async () => {
      await saveReflection(weekKey, {
        balanced: host.querySelector('[data-field="balanced"]').value.trim(),
        adjust: host.querySelector('[data-field="adjust"]').value.trim(),
      });
      render();
    });
  }

  container.insertAdjacentHTML('beforeend', `<article class="os-mini-card school-block" data-block-id="${mountId}"></article>`);
  render();
  return { unmount() { container.querySelector(`[data-block-id="${mountId}"]`)?.remove(); } };
}
