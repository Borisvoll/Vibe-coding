import { escapeHTML } from '../../utils.js';
import { deleteConcept, listConcepts, saveConcept } from './store.js';
import './styles.css';

function parseTags(value) {
  return String(value || '').split(',').map((tag) => tag.trim()).filter(Boolean);
}

export function renderSchoolConceptVault(container) {
  const mountId = `school-concept-vault-${crypto.randomUUID()}`;
  let query = '';

  async function render() {
    const items = await listConcepts();
    const filtered = !query ? items : items.filter((item) => (item.searchText || '').includes(query.toLowerCase()));
    const host = container.querySelector(`[data-block-id="${mountId}"]`);
    if (!host) return;

    host.innerHTML = `
      <h3 class="school-block__title">Concept Vault</h3>
      <p class="school-block__subtitle">Personal explanations in your own words</p>
      <div class="school-inline-form school-inline-form--concept">
        <input class="form-input" data-field="title" placeholder="Concept title">
        <input class="form-input" data-field="projectLink" placeholder="Linked project">
        <input class="form-input" data-field="tags" placeholder="tags, comma-separated">
        <textarea class="form-textarea" data-field="explanation" rows="3" placeholder="Explain in your own words"></textarea>
        <button class="btn btn-secondary btn-sm" data-action="save">Opslaan</button>
      </div>
      <input type="search" class="form-input" data-field="search" placeholder="Zoek concepten..." value="${escapeHTML(query)}">
      <div class="school-concept-list">
        ${filtered.map((item) => `
          <article class="school-concept-item">
            <div>
              <strong>${escapeHTML(item.title || 'Untitled')}</strong>
              ${item.projectLink ? `<small>Project: ${escapeHTML(item.projectLink)}</small>` : ''}
              <p>${escapeHTML(item.explanation || '')}</p>
              ${(item.tags || []).length ? `<div>${item.tags.map((tag) => `<span class="badge badge-indigo">${escapeHTML(tag)}</span>`).join(' ')}</div>` : ''}
            </div>
            <button class="btn btn-ghost btn-sm" data-action="delete" data-id="${item.id}">Verwijder</button>
          </article>
        `).join('') || '<p class="school-block__subtitle">Nog geen concepten.</p>'}
      </div>
    `;

    host.querySelector('[data-action="save"]')?.addEventListener('click', async () => {
      const title = host.querySelector('[data-field="title"]').value.trim();
      const projectLink = host.querySelector('[data-field="projectLink"]').value.trim();
      const explanation = host.querySelector('[data-field="explanation"]').value.trim();
      const tags = parseTags(host.querySelector('[data-field="tags"]').value);
      if (!title || !explanation) return;
      await saveConcept({ title, projectLink, explanation, tags });
      render();
    });

    host.querySelector('[data-field="search"]')?.addEventListener('input', (event) => {
      query = event.target.value || '';
      render();
    });

    host.querySelectorAll('[data-action="delete"]').forEach((button) => {
      button.addEventListener('click', async () => {
        await deleteConcept(button.dataset.id);
        render();
      });
    });
  }

  container.insertAdjacentHTML('beforeend', `<article class="os-mini-card school-block school-block--wide" data-block-id="${mountId}"></article>`);
  render();

  return { unmount() { container.querySelector(`[data-block-id="${mountId}"]`)?.remove(); } };
}
