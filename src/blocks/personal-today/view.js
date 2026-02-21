import { escapeHTML } from '../../utils.js';
import { getTaskCap } from '../../core/modeCaps.js';
import { addAgenda, addTask, getMeaningfulAction, getWellbeingLine, listAgenda, listTasks, removeAgenda, removeTask, saveMeaningfulAction, saveWellbeingLine } from './store.js';
import './styles.css';

export function renderPersonalToday(container, context) {
  const mountId = `personal-today-${crypto.randomUUID()}`;

  async function render() {
    const cap = getTaskCap(context?.mode || 'Personal');
    const [tasks, agenda, action, wellbeingLine] = await Promise.all([
      listTasks(),
      listAgenda(),
      getMeaningfulAction(),
      getWellbeingLine(),
    ]);
    const host = container.querySelector(`[data-block-id="${mountId}"]`);
    if (!host) return;

    host.innerHTML = `
      <h3 class="school-block__title">Persoonlijk vandaag</h3>
      <p class="school-block__subtitle">Taken (${tasks.length}/${cap}) • agenda • energie/stemming • betekenisvolle actie</p>
      <div class="school-inline-form">
        <input class="form-input" data-field="task" placeholder="Nieuwe taak">
        <button class="btn btn-secondary btn-sm" data-action="add-task" ${tasks.length >= cap ? 'disabled' : ''}>Taak toevoegen</button>
      </div>
      <ul class="personal-list">${tasks.map((t) => `<li>${escapeHTML(t.text)} <button class="btn btn-ghost btn-sm" data-action="del-task" data-id="${t.id}">×</button></li>`).join('') || '<li><small>Geen taken.</small></li>'}</ul>

      <div class="school-inline-form">
        <input class="form-input" data-field="agenda-start" type="time">
        <input class="form-input" data-field="agenda-end" type="time">
        <input class="form-input" data-field="agenda-title" placeholder="Agenda blok">
        <button class="btn btn-secondary btn-sm" data-action="add-agenda">Blok toevoegen</button>
      </div>
      <ul class="personal-list">${agenda.map((a) => `<li>${escapeHTML(a.start || '--:--')}–${escapeHTML(a.end || '--:--')} ${escapeHTML(a.title || '')} <button class="btn btn-ghost btn-sm" data-action="del-agenda" data-id="${a.id}">×</button></li>`).join('') || '<li><small>Geen agendablokken.</small></li>'}</ul>

      <label class="school-block__field"><span>Energie/stemming + dankbaarheid (1 regel)</span><input class="form-input" data-field="wellbeing" value="${escapeHTML(wellbeingLine)}" placeholder="Bijv. 7/10, rustig, dankbaar voor ..."></label>
      <label class="school-block__field"><span>Eén betekenisvolle actie</span><input class="form-input" data-field="meaningful" value="${escapeHTML(action?.text || '')}"></label>
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
      await saveWellbeingLine(host.querySelector('[data-field="wellbeing"]').value.trim());
      await saveMeaningfulAction(host.querySelector('[data-field="meaningful"]').value.trim());
      render();
    });
  }

  container.insertAdjacentHTML('beforeend', `<article class="os-mini-card school-block school-block--wide" data-block-id="${mountId}"></article>`);
  render();
  return { unmount() { container.querySelector(`[data-block-id="${mountId}"]`)?.remove(); } };
}
