import { escapeHTML } from '../../utils.js';
import { addFocusTask, getCurrentProjectPointer, getLearningCapture, listFocusTasks, removeFocusTask, saveLearningCapture } from './store.js';
import { getTaskCap } from '../../core/modeCaps.js';

export function renderSchoolToday(container) {
  const mountId = `school-today-${crypto.randomUUID()}`;

  async function render() {
    const host = container.querySelector(`[data-block-id="${mountId}"]`);
    if (!host) return;

    const [tasks, project, learning] = await Promise.all([
      listFocusTasks(),
      getCurrentProjectPointer(),
      getLearningCapture(),
    ]);
    const cap = getTaskCap('School');

    host.innerHTML = `
      <h3 class="school-block__title">School Vandaag</h3>
      <p class="school-block__subtitle">Focustaken (${tasks.length}/${cap})</p>
      <div class="school-inline-form">
        <input class="form-input" data-field="task" placeholder="Nieuwe focustaak">
        <button class="btn btn-secondary btn-sm" data-action="add" ${tasks.length >= cap ? 'disabled' : ''}>Toevoegen</button>
      </div>
      <ul class="personal-list">
        ${tasks.map((item) => `<li>${escapeHTML(item.title || '')} <button class="btn btn-ghost btn-sm" data-action="del" data-id="${item.id}">x</button></li>`).join('') || '<li><small>Geen focustaken.</small></li>'}
      </ul>
      <p class="school-block__subtitle">Projectfocus: ${escapeHTML(project?.building || 'Nog niet ingevuld.')} / ${escapeHTML(project?.learning || 'Nog niet ingevuld.')}</p>
      <label class="school-block__field"><span>Wat heb ik vandaag echt begrepen?</span><input class="form-input" data-field="learning" value="${escapeHTML(learning)}"></label>
      <div class="school-inline-form">
        <a class="btn btn-ghost btn-sm" href="#planning">Naar mijlpalen</a>
        <button class="btn btn-primary btn-sm" data-action="save">Opslaan</button>
      </div>
    `;

    host.querySelector('[data-action="add"]')?.addEventListener('click', async () => {
      const text = host.querySelector('[data-field="task"]').value.trim();
      if (!text) return;
      await addFocusTask(text);
      render();
    });
    host.querySelectorAll('[data-action="del"]').forEach((button) => {
      button.addEventListener('click', async () => {
        await removeFocusTask(button.dataset.id);
        render();
      });
    });
    host.querySelector('[data-action="save"]')?.addEventListener('click', async () => {
      await saveLearningCapture(host.querySelector('[data-field="learning"]').value);
      render();
    });
  }

  container.insertAdjacentHTML('beforeend', `<article class="os-mini-card school-block" data-block-id="${mountId}"></article>`);
  render();
  return { unmount() { container.querySelector(`[data-block-id="${mountId}"]`)?.remove(); } };
}
