import { escapeHTML } from '../../utils.js';
import { addMilestone, deleteMilestone, listMilestones } from './store.js';
import { getTaskCap } from '../../core/modeCaps.js';
import './styles.css';

export function renderSchoolMilestones(container) {
  const mountId = `school-milestones-${crypto.randomUUID()}`;

  async function render() {
    const list = await listMilestones();
    const cap = getTaskCap('School');
    const host = container.querySelector(`[data-block-id="${mountId}"]`);
    if (!host) return;

    host.innerHTML = `
      <h3 class="school-block__title">Milestones / Planning</h3>
      <p class="school-block__subtitle">Items (${list.length}/${cap})</p>
      <div class="school-inline-form">
        <input class="form-input" data-field="title" placeholder="Milestone">
        <input class="form-input" data-field="dueDate" type="date">
        <button class="btn btn-secondary btn-sm" data-action="add" ${list.length >= cap ? 'disabled' : ''}>Toevoegen</button>
      </div>
      <ul class="school-timeline">
        ${list.map((item) => `
          <li>
            <div>
              <strong>${escapeHTML(item.title || 'Untitled')}</strong>
              <small>${escapeHTML(item.dueDate || '-')}</small>
            </div>
            <button class="btn btn-ghost btn-sm" data-action="delete" data-id="${item.id}">Verwijder</button>
          </li>
        `).join('') || '<li><small>Geen milestones</small></li>'}
      </ul>
    `;

    host.querySelector('[data-action="add"]')?.addEventListener('click', async () => {
      const title = host.querySelector('[data-field="title"]').value.trim();
      const dueDate = host.querySelector('[data-field="dueDate"]').value;
      if (!title || list.length >= cap) return;
      await addMilestone({ title, dueDate });
      render();
    });

    host.querySelectorAll('[data-action="delete"]').forEach((button) => {
      button.addEventListener('click', async () => {
        await deleteMilestone(button.dataset.id);
        render();
      });
    });
  }

  container.insertAdjacentHTML('beforeend', `<article class="os-mini-card school-block" data-block-id="${mountId}"></article>`);
  render();

  return { unmount() { container.querySelector(`[data-block-id="${mountId}"]`)?.remove(); } };
}
