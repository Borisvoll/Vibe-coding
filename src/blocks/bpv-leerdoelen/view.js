import { getAll, put, remove } from '../../db.js';
import { escapeHTML } from '../../utils.js';

const GOALS_STORE = 'goals';

/**
 * Leerdoel-tracker with progress bars.
 * Each goal has: title, description, progress (0-100), weekly updates log.
 * Daily prompt: "Welk leerdoel heb je vandaag aangeraakt?"
 */
export function renderBPVLeerdoelen(container, context) {
  const { eventBus } = context;
  const mountId = `bpv-ld-${crypto.randomUUID()}`;

  container.insertAdjacentHTML('beforeend', `
    <article class="bpv-leerdoelen os-mini-card" data-mount-id="${mountId}">
      <div class="bpv-leerdoelen__loading">Laden...</div>
    </article>
  `);

  const el = container.querySelector(`[data-mount-id="${mountId}"]`);

  async function getGoals() {
    const all = await getAll(GOALS_STORE);
    return all.sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));
  }

  async function render() {
    const goals = await getGoals();
    const todayKey = `bpv_leerdoel_today_${new Date().toISOString().slice(0, 10)}`;
    const todayGoalId = localStorage.getItem(todayKey) || null;

    el.innerHTML = `
      <div class="bpv-leerdoelen__header">
        <h3 class="bpv-leerdoelen__title">Leerdoelen</h3>
        <button type="button" class="btn btn-ghost btn-sm" data-action="add-goal">+ Leerdoel</button>
      </div>
      ${goals.length === 0 ? `
        <p class="bpv-leerdoelen__empty">Nog geen leerdoelen. Voeg er een toe om je voortgang bij te houden.</p>
      ` : `
        <div class="bpv-leerdoelen__list">
          ${goals.map(g => {
            const progress = g.progress || 0;
            const progressColor = progress >= 80 ? 'var(--color-success)' :
              progress >= 40 ? 'var(--color-warning)' : 'var(--color-accent)';
            const isToday = todayGoalId === g.id;
            return `
              <div class="bpv-leerdoelen__goal ${isToday ? 'bpv-leerdoelen__goal--active' : ''}" data-goal-id="${g.id}">
                <div class="bpv-leerdoelen__goal-header">
                  <span class="bpv-leerdoelen__goal-title">${escapeHTML(g.title || 'Naamloos leerdoel')}</span>
                  <span class="bpv-leerdoelen__goal-pct">${progress}%</span>
                </div>
                ${g.description ? `<p class="bpv-leerdoelen__goal-desc">${escapeHTML(g.description)}</p>` : ''}
                <div class="bpv-leerdoelen__progress-bar">
                  <div class="bpv-leerdoelen__progress-fill" style="width:${progress}%;background:${progressColor}"></div>
                </div>
                <div class="bpv-leerdoelen__goal-actions">
                  <input type="range" class="bpv-leerdoelen__slider" data-action="update-progress" data-goal-id="${g.id}"
                    min="0" max="100" step="5" value="${progress}" title="Voortgang aanpassen">
                  <button type="button" class="btn btn-ghost btn-sm" data-action="touch-goal" data-goal-id="${g.id}"
                    ${isToday ? 'disabled' : ''} title="Vandaag aan dit leerdoel gewerkt">
                    ${isToday ? '✓ Aangeraakt' : 'Aanraken'}
                  </button>
                  <button type="button" class="btn btn-ghost btn-sm" data-action="delete-goal" data-goal-id="${g.id}" title="Verwijder">×</button>
                </div>
                ${(g.updates || []).length > 0 ? `
                  <div class="bpv-leerdoelen__updates">
                    ${g.updates.slice(-3).reverse().map(u => `
                      <span class="bpv-leerdoelen__update">${escapeHTML(u.date)}: ${u.progress}%</span>
                    `).join('')}
                  </div>
                ` : ''}
              </div>
            `;
          }).join('')}
        </div>
      `}
      ${goals.length > 0 && !todayGoalId ? `
        <div class="bpv-leerdoelen__prompt">
          <span>Welk leerdoel heb je vandaag aangeraakt?</span>
          <div class="bpv-leerdoelen__prompt-btns">
            ${goals.map(g => `
              <button type="button" class="btn btn-ghost btn-sm" data-action="touch-goal" data-goal-id="${g.id}">
                ${escapeHTML(g.title || 'Naamloos')}
              </button>
            `).join('')}
          </div>
        </div>
      ` : ''}
      <div class="bpv-leerdoelen__add-form" data-add-form hidden>
        <input type="text" class="form-input" data-field="goal-title" placeholder="Leerdoel titel (bijv. CNC programmeren)" maxlength="100">
        <input type="text" class="form-input" data-field="goal-desc" placeholder="Beschrijving (optioneel)" maxlength="200">
        <div class="bpv-leerdoelen__form-actions">
          <button type="button" class="btn btn-primary btn-sm" data-action="save-goal">Toevoegen</button>
          <button type="button" class="btn btn-ghost btn-sm" data-action="cancel-add">Annuleren</button>
        </div>
      </div>
    `;

    // Event handlers
    el.querySelector('[data-action="add-goal"]')?.addEventListener('click', () => {
      const form = el.querySelector('[data-add-form]');
      form.hidden = !form.hidden;
      if (!form.hidden) form.querySelector('[data-field="goal-title"]')?.focus();
    });

    el.querySelector('[data-action="cancel-add"]')?.addEventListener('click', () => {
      el.querySelector('[data-add-form]').hidden = true;
    });

    el.querySelector('[data-action="save-goal"]')?.addEventListener('click', async () => {
      const title = el.querySelector('[data-field="goal-title"]')?.value?.trim();
      if (!title) return;
      const description = el.querySelector('[data-field="goal-desc"]')?.value?.trim() || '';
      const goal = {
        id: crypto.randomUUID(),
        title,
        description,
        progress: 0,
        status: 'active',
        updates: [],
        createdAt: new Date().toISOString(),
      };
      await put(GOALS_STORE, goal);
      render();
    });

    el.querySelectorAll('[data-action="update-progress"]').forEach(slider => {
      slider.addEventListener('input', async () => {
        const goalId = slider.dataset.goalId;
        const goals = await getGoals();
        const goal = goals.find(g => g.id === goalId);
        if (!goal) return;
        const newProgress = Number(slider.value);
        const today = new Date().toISOString().slice(0, 10);
        const updates = goal.updates || [];
        // Update or add today's entry
        const todayUpdate = updates.find(u => u.date === today);
        if (todayUpdate) {
          todayUpdate.progress = newProgress;
        } else {
          updates.push({ date: today, progress: newProgress });
        }
        await put(GOALS_STORE, { ...goal, progress: newProgress, updates });
        render();
      });
    });

    el.querySelectorAll('[data-action="touch-goal"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const goalId = btn.dataset.goalId;
        localStorage.setItem(todayKey, goalId);
        render();
      });
    });

    el.querySelectorAll('[data-action="delete-goal"]').forEach(btn => {
      btn.addEventListener('click', async () => {
        await remove(GOALS_STORE, btn.dataset.goalId);
        render();
      });
    });
  }

  render();
  const unsub = eventBus?.on('bpv:changed', () => render());

  return {
    unmount() {
      unsub?.();
      el?.remove();
    },
  };
}
