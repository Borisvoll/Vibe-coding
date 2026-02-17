import { escapeHTML } from '../../utils.js';
import { getTaskCap } from '../../core/modeCaps.js';
import { addAgenda, addTask, getMeaningfulAction, listAgenda, listTasks, removeAgenda, removeTask, saveMeaningfulAction } from './store.js';
import './styles.css';

export function renderPersonalToday(container, context) {
  const mountId = `personal-today-${crypto.randomUUID()}`;

  async function render() {
    const cap = getTaskCap(context?.mode || 'Personal');
    const tasks = await listTasks();
    const agenda = await listAgenda();
    const action = await getMeaningfulAction();
    const host = container.querySelector(`[data-block-id="${mountId}"]`);
    if (!host) return;

    host.innerHTML = `
      <h3 class="school-block__title">Today</h3>
      <p class="school-block__subtitle">Tasks (${tasks.length}/${cap}) + simple agenda + one meaningful action</p>
      <div class="school-inline-form">
        <input class="form-input" data-field="task" placeholder="Nieuwe taak">
        <button class="btn btn-secondary btn-sm" data-action="add-task" ${tasks.length >= cap ? 'disabled' : ''}>Taak toevoegen</button>
      </div>
      <ul class="personal-list">${tasks.map(t => `<li>${escapeHTML(t.text)} <button class="btn btn-ghost btn-sm" data-action="del-task" data-id="${t.id}">x</button></li>`).join('') || '<li><small>Geen taken</small></li>'}</ul>

      <div class="school-inline-form">
        <input class="form-input" data-field="agenda-start" type="time">
        <input class="form-input" data-field="agenda-end" type="time">
        <input class="form-input" data-field="agenda-title" placeholder="Agenda blok">
        <button class="btn btn-secondary btn-sm" data-action="add-agenda">Blok toevoegen</button>
      </div>
      <ul class="personal-list">${agenda.map(a => `<li>${escapeHTML(a.start || '--:--')}–${escapeHTML(a.end || '--:--')} ${escapeHTML(a.title || '')} <button class="btn btn-ghost btn-sm" data-action="del-agenda" data-id="${a.id}">x</button></li>`).join('') || '<li><small>Geen agenda blokken</small></li>'}</ul>

      <label class="school-block__field"><span>One meaningful action</span><input class="form-input" data-field="meaningful" value="${escapeHTML(action?.text || '')}"></label>
      <div class="school-block__actions"><button class="btn btn-primary btn-sm" data-action="save-action">Opslaan</button></div>
    `;

    host.querySelector('[data-action="add-task"]')?.addEventListener('click', async () => {
      if (tasks.length >= cap) return;
      const text = host.querySelector('[data-field="task"]').value.trim();
      if (!text) return;
      await addTask(text);
      render();
    });
    host.querySelectorAll('[data-action="del-task"]').forEach((b) => b.addEventListener('click', async () => { await removeTask(b.dataset.id); render(); }));

    host.querySelector('[data-action="add-agenda"]')?.addEventListener('click', async () => {
      const start = host.querySelector('[data-field="agenda-start"]').value;
      const end = host.querySelector('[data-field="agenda-end"]').value;
      const title = host.querySelector('[data-field="agenda-title"]').value.trim();
      if (!title) return;
      await addAgenda({ start, end, title });
      render();
    });
    host.querySelectorAll('[data-action="del-agenda"]').forEach((b) => b.addEventListener('click', async () => { await removeAgenda(b.dataset.id); render(); }));

    host.querySelector('[data-action="save-action"]')?.addEventListener('click', async () => {
      await saveMeaningfulAction(host.querySelector('[data-field="meaningful"]').value.trim());
      render();
    });
  }

  container.insertAdjacentHTML('beforeend', `<article class="os-mini-card school-block school-block--wide" data-block-id="${mountId}"></article>`);
  render();
  return { unmount() { container.querySelector(`[data-block-id="${mountId}"]`)?.remove(); } };
}
