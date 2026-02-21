import { escapeHTML } from '../../utils.js';
import {
  addFocusTask, getCurrentProjectPointer, getLearningCapture,
  listFocusTasks, removeFocusTask, saveLearningCapture,
  listHomework, addHomework, toggleHomework, deleteHomework,
} from './store.js';
import { getTaskCap } from '../../core/modeCaps.js';
import './styles.css';

function getDaysUntil(dateStr) {
  if (!dateStr) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const due = new Date(dateStr + 'T00:00:00');
  return Math.round((due - today) / (1000 * 60 * 60 * 24));
}

function hwUrgencyClass(dueDate) {
  const d = getDaysUntil(dueDate);
  if (d === null) return '';
  if (d < 0) return 'hw-item--overdue';
  if (d === 0) return 'hw-item--today';
  if (d <= 2) return 'hw-item--urgent';
  return '';
}

function hwDueLabel(dueDate) {
  const d = getDaysUntil(dueDate);
  if (d === null) return '';
  if (d < 0) return `${Math.abs(d)}d te laat`;
  if (d === 0) return 'Vandaag';
  if (d === 1) return 'Morgen';
  return `${d}d`;
}

export function renderSchoolToday(container) {
  const mountId = `school-today-${crypto.randomUUID()}`;

  async function render() {
    const host = container.querySelector(`[data-block-id="${mountId}"]`);
    if (!host) return;

    const [tasks, , learning, homework] = await Promise.all([
      listFocusTasks(),
      getCurrentProjectPointer(),
      getLearningCapture(),
      listHomework(),
    ]);
    const cap = getTaskCap('School');
    const pendingHW = homework.filter((h) => !h.done).length;
    const overdueHW = homework.filter((h) => !h.done && getDaysUntil(h.dueDate) < 0).length;

    host.innerHTML = `
      <h3 class="school-block__title">School vandaag</h3>
      <p class="school-block__subtitle">Focustaken (${tasks.length}/${cap})</p>
      <div class="school-inline-form">
        <input class="form-input" data-field="task" placeholder="Nieuwe focustaak">
        <button class="btn btn-secondary btn-sm" data-action="add">Toevoegen</button>
      </div>
      <ul class="personal-list">
        ${tasks.map((item) => `<li>${escapeHTML(item.text || item.title || '')} <button class="btn btn-ghost btn-sm" data-action="del" data-id="${item.id}">×</button></li>`).join('') || '<li><small>Geen focustaken.</small></li>'}
      </ul>
      <p class="school-block__subtitle">Projectfocus: ${escapeHTML(project?.building || '–')} / ${escapeHTML(project?.learning || '–')}</p>
      <label class="school-block__field"><span>Wat heb ik vandaag echt begrepen?</span><input class="form-input" data-field="learning" value="${escapeHTML(learning)}"></label>
      <div class="school-inline-form">
        <a class="btn btn-ghost btn-sm" href="#planning">Naar mijlpalen</a>
        <button class="btn btn-primary btn-sm" data-action="save">Opslaan</button>
      </div>
    `;

    // Focus task handlers
    host.querySelector('[data-action="add"]')?.addEventListener('click', async () => {
      const text = host.querySelector('[data-field="task"]').value.trim();
      if (!text) return;
      await addFocusTask(text);
      render();
    });
    host.querySelector('[data-field="task"]')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') host.querySelector('[data-action="add"]')?.click();
    });
    host.querySelectorAll('[data-action="del"]').forEach((b) => {
      b.addEventListener('click', async () => { await removeFocusTask(b.dataset.id); render(); });
    });

    // Homework handlers
    host.querySelector('[data-action="add-hw"]')?.addEventListener('click', async () => {
      const title = host.querySelector('[data-field="hw-title"]').value.trim();
      const subject = host.querySelector('[data-field="hw-subject"]').value.trim();
      const dueDate = host.querySelector('[data-field="hw-date"]').value;
      if (!title) return;
      await addHomework({ title, subject, dueDate });
      render();
    });
    host.querySelector('[data-field="hw-title"]')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') host.querySelector('[data-action="add-hw"]')?.click();
    });
    host.querySelectorAll('[data-action="toggle-hw"]').forEach((b) => {
      b.addEventListener('click', async () => { await toggleHomework(b.dataset.id); render(); });
    });
    host.querySelectorAll('[data-action="del-hw"]').forEach((b) => {
      b.addEventListener('click', async () => { await deleteHomework(b.dataset.id); render(); });
    });

    // Learning save
    host.querySelector('[data-action="save"]')?.addEventListener('click', async () => {
      await saveLearningCapture(host.querySelector('[data-field="learning"]').value);
      render();
    });
  }

  container.insertAdjacentHTML('beforeend',
    `<article class="os-mini-card school-block school-block--wide" data-block-id="${mountId}"></article>`
  );
  render();
  return { unmount() { container.querySelector(`[data-block-id="${mountId}"]`)?.remove(); } };
}
