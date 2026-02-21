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
      <div class="school-today-block">

        <!-- Focus tasks -->
        <div class="st-section">
          <div class="st-section__header">
            <span class="st-section__title">Focustaken</span>
            <span class="st-section__badge">${tasks.length}/${cap}</span>
          </div>
          <div class="st-add-form">
            <input class="form-input" data-field="task" placeholder="Nieuwe focustaak...">
            <button class="btn btn-primary btn-sm" data-action="add"
              ${tasks.length >= cap ? 'disabled' : ''}>+</button>
          </div>
          <ul class="st-task-list">
            ${tasks.length === 0
              ? `<li class="st-empty">Geen focustaken — goed bezig!</li>`
              : tasks.map((item) => `
                <li class="st-task-item">
                  <span class="st-task-dot"></span>
                  <span class="st-task-text">${escapeHTML(item.text || item.title || '')}</span>
                  <button class="btn btn-ghost btn-sm st-task-del" data-action="del" data-id="${item.id}" aria-label="Verwijder">×</button>
                </li>
              `).join('')}
          </ul>
        </div>

        <!-- Homework queue -->
        <div class="st-section">
          <div class="st-section__header">
            <span class="st-section__title">Huiswerk & opdrachten</span>
            <div style="display:flex;gap:var(--space-1)">
              ${overdueHW > 0 ? `<span class="st-badge st-badge--red">${overdueHW} te laat</span>` : ''}
              ${pendingHW > 0 ? `<span class="st-badge st-badge--dim">${pendingHW} open</span>` : ''}
            </div>
          </div>
          <div class="hw-add-form">
            <input class="form-input" data-field="hw-title" placeholder="Opdracht omschrijving..." style="flex:1;min-width:0" />
            <input class="form-input" data-field="hw-subject" placeholder="Vak" style="width:90px" />
            <input class="form-input" data-field="hw-date" type="date" style="width:130px" />
            <button class="btn btn-secondary btn-sm" data-action="add-hw">+</button>
          </div>
          ${homework.length === 0
            ? `<div class="st-empty">Geen huiswerk — genieten!</div>`
            : `<ul class="hw-list">
              ${homework.map((hw) => `
                <li class="hw-item ${hw.done ? 'hw-item--done' : ''} ${!hw.done ? hwUrgencyClass(hw.dueDate) : ''}">
                  <button class="hw-check" data-action="toggle-hw" data-id="${hw.id}"
                    aria-label="${hw.done ? 'Markeer open' : 'Markeer klaar'}" aria-pressed="${hw.done}">
                    ${hw.done ? '✓' : ''}
                  </button>
                  <div class="hw-content">
                    <span class="hw-title">${escapeHTML(hw.title)}</span>
                    ${hw.subject ? `<span class="hw-subject">${escapeHTML(hw.subject)}</span>` : ''}
                  </div>
                  ${hw.dueDate && !hw.done ? `<span class="hw-due">${hwDueLabel(hw.dueDate)}</span>` : ''}
                  <button class="hw-del btn btn-ghost btn-sm" data-action="del-hw" data-id="${hw.id}" aria-label="Verwijder">×</button>
                </li>
              `).join('')}
            </ul>`}
        </div>

        <!-- Learning capture -->
        <div class="st-section">
          <div class="st-section__header">
            <span class="st-section__title">Wat heb ik vandaag geleerd?</span>
          </div>
          <input class="form-input" data-field="learning" value="${escapeHTML(learning)}"
            placeholder="Bijv. het verschil tussen X en Y..." />
          <div style="margin-top:var(--space-2)">
            <button class="btn btn-primary btn-sm" data-action="save">Opslaan</button>
          </div>
        </div>

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
