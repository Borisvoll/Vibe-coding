import { escapeHTML } from '../../utils.js';
import { addMilestone, deleteMilestone, listMilestones } from './store.js';
import { getTaskCap } from '../../core/modeCaps.js';
import './styles.css';

/**
 * Calculate days until a due date from today.
 * Returns: positive = days remaining, 0 = today, negative = overdue
 */
function getDaysUntil(dateStr) {
  if (!dateStr) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dateStr + 'T00:00:00');
  return Math.round((due - today) / (1000 * 60 * 60 * 24));
}

function getUrgencyMeta(days) {
  if (days === null) return { label: '', cls: '', icon: '' };
  if (days < 0)  return { label: `${Math.abs(days)}d te laat`, cls: 'milestone--overdue', icon: '⚠' };
  if (days === 0) return { label: 'Vandaag!', cls: 'milestone--today', icon: '🔥' };
  if (days <= 3)  return { label: `${days}d`, cls: 'milestone--urgent', icon: '⏰' };
  if (days <= 7)  return { label: `${days}d`, cls: 'milestone--soon', icon: '📅' };
  return { label: `${days}d`, cls: 'milestone--ok', icon: '✓' };
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' });
}

export function renderSchoolMilestones(container) {
  const mountId = `school-milestones-${crypto.randomUUID()}`;

  async function render() {
    const list = await listMilestones();
    const cap = getTaskCap('School');
    const host = container.querySelector(`[data-block-id="${mountId}"]`);
    if (!host) return;

    const overdueCount = list.filter((m) => {
      const d = getDaysUntil(m.dueDate);
      return d !== null && d < 0;
    }).length;

    host.innerHTML = `
      <div class="milestones-header">
        <h3 class="milestones-title">Mijlpalen</h3>
        <div class="milestones-meta">
          ${overdueCount > 0 ? `<span class="milestones-overdue-badge">${overdueCount} te laat</span>` : ''}
          <span class="milestones-count">${list.length}/${cap}</span>
        </div>
      </div>

      <div class="milestones-add-form">
        <input class="form-input milestones-add-title" data-field="title" placeholder="Mijlpaal omschrijving..." />
        <input class="form-input milestones-add-date" data-field="dueDate" type="date" />
        <button class="btn btn-primary btn-sm milestones-add-btn" data-action="add"
          ${list.length >= cap ? 'disabled' : ''}>+</button>
      </div>

      ${list.length === 0
        ? `<div class="milestones-empty">Nog geen mijlpalen gepland</div>`
        : `<ul class="milestones-list">
          ${list.map((item) => {
            const days = getDaysUntil(item.dueDate);
            const urgency = getUrgencyMeta(days);
            return `
              <li class="milestone-card ${urgency.cls}" data-id="${item.id}">
                <div class="milestone-card__urgency" title="${urgency.label}">
                  <span class="milestone-card__icon">${urgency.icon}</span>
                  <span class="milestone-card__days">${urgency.label}</span>
                </div>
                <div class="milestone-card__content">
                  <strong class="milestone-card__title">${escapeHTML(item.title || 'Zonder titel')}</strong>
                  <span class="milestone-card__date">${formatDate(item.dueDate)}</span>
                </div>
                <button class="milestone-card__delete btn btn-ghost btn-sm"
                  data-action="delete" data-id="${item.id}" aria-label="Verwijder">×</button>
              </li>
            `;
          }).join('')}
        </ul>`
      }
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

    // Allow Enter key to add
    host.querySelector('[data-field="title"]')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') host.querySelector('[data-action="add"]')?.click();
    });
  }

  container.insertAdjacentHTML('beforeend',
    `<article class="os-mini-card school-block milestones-block" data-block-id="${mountId}"></article>`
  );
  render();

  return { unmount() { container.querySelector(`[data-block-id="${mountId}"]`)?.remove(); } };
}
