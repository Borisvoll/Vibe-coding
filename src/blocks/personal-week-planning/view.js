import { escapeHTML } from '../../utils.js';
import { addWeekItem, deleteWeekItem, listWeekPlan } from './store.js';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function renderPersonalWeekPlanning(container) {
  const mountId = `personal-week-planning-${crypto.randomUUID()}`;

  async function render() {
    const items = await listWeekPlan();
    const host = container.querySelector(`[data-block-id="${mountId}"]`);
    if (!host) return;

    host.innerHTML = `
      <h3 class="school-block__title">Simple planning week view</h3>
      <div class="school-inline-form">
        <select class="form-select" data-field="day">${DAYS.map((d) => `<option value="${d}">${d}</option>`).join('')}</select>
        <input class="form-input" data-field="plan" placeholder="Plan item">
        <button class="btn btn-secondary btn-sm" data-action="add">Toevoegen</button>
      </div>
      <ul class="personal-list">
        ${items.map((item) => `<li><strong>${escapeHTML(item.day)}</strong> ${escapeHTML(item.plan || '')} <button class="btn btn-ghost btn-sm" data-action="delete" data-id="${item.id}">x</button></li>`).join('') || '<li><small>Geen weekplanning items</small></li>'}
      </ul>
    `;

    host.querySelector('[data-action="add"]')?.addEventListener('click', async () => {
      const day = host.querySelector('[data-field="day"]').value;
      const plan = host.querySelector('[data-field="plan"]').value.trim();
      if (!plan) return;
      await addWeekItem({ day, plan });
      render();
    });

    host.querySelectorAll('[data-action="delete"]').forEach((b) => b.addEventListener('click', async () => {
      await deleteWeekItem(b.dataset.id);
      render();
    }));
  }

  container.insertAdjacentHTML('beforeend', `<article class="os-mini-card school-block" data-block-id="${mountId}"></article>`);
  render();
  return { unmount() { container.querySelector(`[data-block-id="${mountId}"]`)?.remove(); } };
}
