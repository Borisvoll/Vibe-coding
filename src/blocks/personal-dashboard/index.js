import { getAll, getSetting } from '../../db.js';
import { icon } from '../../icons.js';
import { navigate } from '../../router.js';
import { on } from '../../core/eventBus.js';
import { getToday } from '../../utils.js';

export function createPage(container) {
  const unsubs = [];

  async function render() {
    const today = getToday();
    const [tasks, energyRecords, goals, userName] = await Promise.all([
      getAll('personalTasks').catch(() => []),
      getAll('energy').catch(() => []),
      getAll('personalGoals').catch(() => []),
      getSetting('user_name'),
    ]);

    // Today's energy record
    const todayEnergy = energyRecords.find(r => r.date === today) || null;

    // Last 7 days for averages and trend
    const last7Dates = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      last7Dates.push(d.toISOString().slice(0, 10));
    }
    const last7Energy = energyRecords.filter(r => last7Dates.includes(r.date));

    const avgEnergy = last7Energy.length > 0
      ? (last7Energy.reduce((sum, r) => sum + (r.level || 0), 0) / last7Energy.length).toFixed(1)
      : '—';
    const avgMood = last7Energy.length > 0
      ? (last7Energy.reduce((sum, r) => sum + (r.mood || 0), 0) / last7Energy.length).toFixed(1)
      : '—';

    // Tasks completed today
    const todayTasks = tasks.filter(t => t.date === today);
    const completedToday = todayTasks.filter(t => t.done || t.completed).length;

    // Active life goals
    const activeGoals = goals.filter(g => g.status === 'active' || g.status === 'in-progress');

    // Day labels for trend chart (short Dutch day names)
    const dayLabelsNL = ['zo', 'ma', 'di', 'wo', 'do', 'vr', 'za'];

    container.innerHTML = `
      <div class="dashboard-welcome" style="margin-bottom: var(--space-6)">
        <h2>${icon('sun', 22)} Welkom${userName ? `, ${userName}` : ''}!</h2>
        <p style="color: var(--color-text-secondary); margin-top: var(--space-2)">
          ${todayEnergy
            ? `Je energieniveau vandaag: <strong>${todayEnergy.level}/5</strong>`
            : 'Hoe voel je je vandaag? Leg je energie vast.'}
        </p>
      </div>

      ${todayEnergy ? `
        <div class="card" style="border-left: 3px solid var(--color-teal); margin-bottom: var(--space-6); padding: var(--space-6)">
          <div style="font-size: 0.6875rem; text-transform: uppercase; letter-spacing: 0.06em; color: var(--color-text-tertiary); margin-bottom: var(--space-3)">Energie vandaag</div>
          <div style="display: flex; gap: var(--space-6); align-items: center; flex-wrap: wrap">
            <div>
              <div style="display: flex; align-items: center; gap: var(--space-2); margin-bottom: var(--space-2)">
                ${icon('zap', 16)}
                <span style="font-weight: 600">Energie</span>
              </div>
              <div class="progress-bar" style="width: 120px; height: 8px">
                <div class="progress-bar-fill" style="width: ${(todayEnergy.level / 5) * 100}%; background: var(--color-teal)"></div>
              </div>
              <div style="font-size: 0.75rem; color: var(--color-text-tertiary); margin-top: var(--space-1)">${todayEnergy.level}/5</div>
            </div>
            <div>
              <div style="display: flex; align-items: center; gap: var(--space-2); margin-bottom: var(--space-2)">
                ${icon('sun', 16)}
                <span style="font-weight: 600">Stemming</span>
              </div>
              <div class="progress-bar" style="width: 120px; height: 8px">
                <div class="progress-bar-fill" style="width: ${(todayEnergy.mood / 5) * 100}%; background: var(--color-teal)"></div>
              </div>
              <div style="font-size: 0.75rem; color: var(--color-text-tertiary); margin-top: var(--space-1)">${todayEnergy.mood}/5</div>
            </div>
            ${todayEnergy.physicalState ? `
              <div style="font-size: 0.8125rem; color: var(--color-text-secondary)">
                <span style="font-weight: 600">Fysiek:</span> ${todayEnergy.physicalState}
              </div>
            ` : ''}
          </div>
          ${todayEnergy.gratitude ? `
            <div style="margin-top: var(--space-4); padding-top: var(--space-3); border-top: 1px solid var(--color-border); font-size: 0.8125rem; color: var(--color-text-secondary)">
              <em>"${todayEnergy.gratitude}"</em>
            </div>
          ` : ''}
        </div>
      ` : ''}

      <div class="dashboard-stats" style="margin-bottom: var(--space-6)">
        <div class="card stat-card" style="--stat-color: var(--color-teal)">
          <div class="stat-value" style="color: var(--color-teal)">${avgEnergy}</div>
          <div class="stat-label">Gem. energie (7d)</div>
        </div>
        <div class="card stat-card" style="--stat-color: var(--color-teal)">
          <div class="stat-value" style="color: var(--color-teal)">${avgMood}</div>
          <div class="stat-label">Gem. stemming (7d)</div>
        </div>
        <div class="card stat-card" style="--stat-color: var(--color-teal)">
          <div class="stat-value" style="color: var(--color-teal)">${completedToday}/${todayTasks.length}</div>
          <div class="stat-label">Taken vandaag</div>
        </div>
        <div class="card stat-card" style="--stat-color: var(--color-teal)">
          <div class="stat-value" style="color: var(--color-teal)">${activeGoals.length}</div>
          <div class="stat-label">Actieve doelen</div>
        </div>
      </div>

      <h3 style="margin: var(--space-8) 0 var(--space-4)">${icon('chart', 18)} Energietrend (7 dagen)</h3>
      <div class="card" style="padding: var(--space-6); margin-bottom: var(--space-6)">
        <div style="display: flex; align-items: flex-end; gap: var(--space-3); height: 100px">
          ${last7Dates.map(date => {
            const record = last7Energy.find(r => r.date === date);
            const level = record ? record.level : 0;
            const pct = level > 0 ? (level / 5) * 100 : 4;
            const dayDate = new Date(date + 'T00:00:00');
            const label = dayLabelsNL[dayDate.getDay()];
            const isToday = date === today;
            return `
              <div style="flex: 1; display: flex; flex-direction: column; align-items: center; gap: var(--space-1)">
                <div style="font-size: 0.6875rem; color: var(--color-text-tertiary)">${level > 0 ? level : ''}</div>
                <div style="
                  width: 100%;
                  max-width: 36px;
                  height: ${pct}%;
                  min-height: 4px;
                  background: ${isToday ? 'var(--color-teal)' : level > 0 ? 'var(--color-teal)' : 'var(--color-border)'};
                  opacity: ${isToday ? 1 : level > 0 ? 0.6 : 0.3};
                  border-radius: var(--radius-sm);
                  transition: height 0.3s ease;
                "></div>
                <div style="font-size: 0.6875rem; color: ${isToday ? 'var(--color-teal)' : 'var(--color-text-tertiary)'}; font-weight: ${isToday ? '600' : '400'}">${label}</div>
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <h3 style="margin: var(--space-8) 0 var(--space-4)">${icon('target', 18)} Levensdoelen</h3>
      ${activeGoals.length > 0 ? `
        <div class="dashboard-grid" style="margin-bottom: var(--space-6)">
          ${activeGoals.map(goal => `
            <div class="card card-clickable" data-nav="personal-goals" style="border-left: 3px solid var(--color-teal)">
              <h4>${goal.title}</h4>
              ${goal.description ? `<p style="font-size: 0.8125rem; color: var(--color-text-secondary); margin-top: var(--space-2)">${goal.description}</p>` : ''}
              <span class="badge" style="margin-top: var(--space-3); background: color-mix(in srgb, var(--color-teal) 15%, transparent); color: var(--color-teal)">${goal.status}</span>
            </div>
          `).join('')}
        </div>
      ` : `
        <div class="card" style="text-align: center; padding: var(--space-8); margin-bottom: var(--space-6)">
          <p style="color: var(--color-text-tertiary)">Nog geen doelen ingesteld</p>
          <button class="btn btn-secondary btn-sm" style="margin-top: var(--space-3)" data-nav="personal-goals">${icon('plus', 14)} Doel toevoegen</button>
        </div>
      `}

      <div style="display: flex; gap: var(--space-3); flex-wrap: wrap; margin-top: var(--space-6)">
        <button class="btn btn-primary" data-nav="personal-today" style="background: var(--color-teal)">
          ${icon('sun', 16)} Vandaag
        </button>
        <button class="btn btn-secondary" data-nav="personal-planning">
          ${icon('clock', 16)} Planning
        </button>
        <button class="btn btn-secondary" data-nav="personal-reflectie">
          ${icon('edit', 16)} Reflectie
        </button>
      </div>
    `;

    container.querySelectorAll('[data-nav]').forEach(el => {
      el.addEventListener('click', () => navigate(el.dataset.nav));
    });
  }

  render();
  unsubs.push(on('personalTasks:updated', render));
  unsubs.push(on('energy:updated', render));
  unsubs.push(on('personalGoals:updated', render));

  return { destroy() { unsubs.forEach(fn => fn()); } };
}
