import { escapeHTML } from '../../utils.js';
import { getCurrentProject, saveCurrentProject } from './store.js';
import './styles.css';

export function renderSchoolCurrentProject(container) {
  const mountId = `school-current-project-${crypto.randomUUID()}`;

  async function render() {
    const project = await getCurrentProject();
    const host = container.querySelector(`[data-block-id="${mountId}"]`);
    if (!host) return;

    host.innerHTML = `
      <h3 class="school-block__title">Current Project</h3>
      <p class="school-block__subtitle">Big-picture school focus</p>
      <label class="school-block__field">
        <span>What I'm building</span>
        <textarea class="form-textarea" data-field="building" rows="3">${escapeHTML(project?.building || '')}</textarea>
      </label>
      <label class="school-block__field">
        <span>What I want to learn</span>
        <textarea class="form-textarea" data-field="learning" rows="3">${escapeHTML(project?.learning || '')}</textarea>
      </label>
      <label class="school-block__field">
        <span>Next milestone</span>
        <input class="form-input" data-field="milestone" value="${escapeHTML(project?.milestone || '')}">
      </label>
      <div class="school-block__actions">
        <button class="btn btn-primary btn-sm" data-action="save">Opslaan</button>
      </div>
    `;

    host.querySelector('[data-action="save"]')?.addEventListener('click', async () => {
      const building = host.querySelector('[data-field="building"]').value.trim();
      const learning = host.querySelector('[data-field="learning"]').value.trim();
      const milestone = host.querySelector('[data-field="milestone"]').value.trim();
      await saveCurrentProject({ building, learning, milestone });
      render();
    });
  }

  container.insertAdjacentHTML('beforeend', `<article class="os-mini-card school-block school-block--wide" data-block-id="${mountId}"></article>`);
  render();

  return {
    unmount() {
      container.querySelector(`[data-block-id="${mountId}"]`)?.remove();
    },
  };
}
