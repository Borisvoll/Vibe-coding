import { getByIndex, put, getAll } from '../db.js';
import { icon } from '../icons.js';
import { on, emit } from '../state.js';
import { showToast } from '../toast.js';
import {
  generateId, getToday, formatDateLong, getISOWeek,
  getCurrentWeek, weekNumber, escapeHTML
} from '../utils.js';

export function createPage(container) {
  let unsub;
  const today = getToday();
  const currentWeek = getCurrentWeek();
  let activeTab = 'dag'; // 'dag' | 'week'

  async function render() {
    const dailyPlan = await getDailyPlan(today);
    const weekReview = await getWeekReview(currentWeek);
    const allReviews = (await getAll('weekReviews')).sort((a, b) => b.week.localeCompare(a.week));

    container.innerHTML = `
      <div class="page-header">
        <h2>Plannen & Organiseren</h2>
        <p>Rust in je hoofd, focus op je werk</p>
      </div>

      <div style="display:flex; gap:var(--space-2); margin-bottom:var(--space-6)">
        <button class="btn ${activeTab === 'dag' ? 'btn-primary' : 'btn-secondary'} btn-sm" data-tab="dag">Dagplan</button>
        <button class="btn ${activeTab === 'week' ? 'btn-primary' : 'btn-secondary'} btn-sm" data-tab="week">Weekreview</button>
      </div>

      ${activeTab === 'dag' ? renderDailyPlan(dailyPlan) : renderWeekReview(weekReview, allReviews)}
    `;

    // Tab switching
    container.querySelectorAll('[data-tab]').forEach(btn => {
      btn.addEventListener('click', () => {
        activeTab = btn.dataset.tab;
        render();
      });
    });

    if (activeTab === 'dag') bindDailyEvents(dailyPlan);
    else bindWeekEvents(weekReview);
  }

  function renderDailyPlan(plan) {
    const task1 = plan?.tasks?.[0] || '';
    const task2 = plan?.tasks?.[1] || '';
    const task3 = plan?.tasks?.[2] || '';
    const evaluation = plan?.evaluation || '';
    const nextStep = plan?.nextStep || '';

    return `
      <div class="card" style="margin-bottom:var(--space-6)">
        <h3 style="margin-bottom:var(--space-4)">Dagstart — ${formatDateLong(today)}</h3>
        <p style="color:var(--color-text-secondary); margin-bottom:var(--space-4); font-size:0.875rem">
          Wat zijn je Top 3 taken voor vandaag?
        </p>
        <form id="daily-form">
          <div class="form-group">
            <label class="form-label" for="task-1">Taak 1</label>
            <input type="text" id="task-1" class="form-input" value="${escapeHTML(task1)}" placeholder="Belangrijkste taak...">
          </div>
          <div class="form-group">
            <label class="form-label" for="task-2">Taak 2</label>
            <input type="text" id="task-2" class="form-input" value="${escapeHTML(task2)}" placeholder="Tweede taak...">
          </div>
          <div class="form-group">
            <label class="form-label" for="task-3">Taak 3</label>
            <input type="text" id="task-3" class="form-input" value="${escapeHTML(task3)}" placeholder="Derde taak (optioneel)">
          </div>

          <div class="divider"></div>

          <h3 style="margin-bottom:var(--space-4)">Einde dag</h3>
          <div class="form-group">
            <label class="form-label" for="evaluation">Kort geevalueerd</label>
            <textarea id="evaluation" class="form-textarea" rows="3" placeholder="Hoe is de dag verlopen? Wat is gelukt, wat niet?">${escapeHTML(evaluation)}</textarea>
          </div>
          <div class="form-group">
            <label class="form-label" for="next-step">Wat is de volgende stap?</label>
            <input type="text" id="next-step" class="form-input" value="${escapeHTML(nextStep)}" placeholder="Eerste actie voor morgen...">
          </div>

          <button type="submit" class="btn btn-primary" data-action="save">${icon('save', 16)} Opslaan</button>
        </form>
      </div>
    `;
  }

  function renderWeekReview(review, allReviews) {
    const r = review || {};

    return `
      <div class="card" style="margin-bottom:var(--space-6)">
        <h3 style="margin-bottom:var(--space-4)">Weekreview — Week ${weekNumber(currentWeek)}</h3>
        <form id="week-form">
          <div class="form-group">
            <label class="form-label" for="wr-goed">1 ding dat goed ging</label>
            <textarea id="wr-goed" class="form-textarea" rows="2">${escapeHTML(r.goed || '')}</textarea>
          </div>
          <div class="form-group">
            <label class="form-label" for="wr-lastig">1 ding dat fout/lastig was</label>
            <textarea id="wr-lastig" class="form-textarea" rows="2">${escapeHTML(r.lastig || '')}</textarea>
          </div>
          <div class="form-group">
            <label class="form-label" for="wr-proces">Proces dat ik beter snap</label>
            <textarea id="wr-proces" class="form-textarea" rows="2">${escapeHTML(r.proces || '')}</textarea>
          </div>
          <div class="form-group">
            <label class="form-label" for="wr-vraag">Inhoudelijke vraag die ik stelde (in overleg)</label>
            <textarea id="wr-vraag" class="form-textarea" rows="2">${escapeHTML(r.vraag || '')}</textarea>
          </div>
          <div class="form-group">
            <label class="form-label" for="wr-focus">Focus voor volgende week</label>
            <textarea id="wr-focus" class="form-textarea" rows="2">${escapeHTML(r.focus || '')}</textarea>
          </div>

          <button type="submit" class="btn btn-primary" data-action="save">${icon('save', 16)} Opslaan</button>
        </form>
      </div>

      ${allReviews.length > 0 ? `
        <h3 style="margin-bottom:var(--space-4)">Eerdere reviews</h3>
        ${allReviews.filter(r => r.week !== currentWeek).map(r => `
          <div class="card" style="margin-bottom:var(--space-3)">
            <h4 style="margin-bottom:var(--space-2)">Week ${weekNumber(r.week)}</h4>
            <div style="font-size:0.875rem; color:var(--color-text-secondary)">
              ${r.goed ? `<p><strong>Goed:</strong> ${escapeHTML(r.goed)}</p>` : ''}
              ${r.lastig ? `<p><strong>Lastig:</strong> ${escapeHTML(r.lastig)}</p>` : ''}
              ${r.focus ? `<p><strong>Focus:</strong> ${escapeHTML(r.focus)}</p>` : ''}
            </div>
          </div>
        `).join('')}
      ` : ''}
    `;
  }

  async function getDailyPlan(date) {
    const results = await getByIndex('dailyPlans', 'date', date);
    return Array.isArray(results) ? results[0] : results;
  }

  async function getWeekReview(week) {
    const results = await getByIndex('weekReviews', 'week', week);
    return Array.isArray(results) ? results[0] : results;
  }

  function bindDailyEvents(existing) {
    container.querySelector('#daily-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const record = {
        id: existing?.id || generateId(),
        date: today,
        tasks: [
          document.getElementById('task-1').value.trim(),
          document.getElementById('task-2').value.trim(),
          document.getElementById('task-3').value.trim(),
        ].filter(Boolean),
        evaluation: document.getElementById('evaluation').value.trim(),
        nextStep: document.getElementById('next-step').value.trim(),
        createdAt: existing?.createdAt || Date.now(),
        updatedAt: Date.now()
      };
      await put('dailyPlans', record);
      emit('planning:updated');
      showToast('Dagplan opgeslagen', { type: 'success' });
    });
  }

  function bindWeekEvents(existing) {
    container.querySelector('#week-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const record = {
        id: existing?.id || generateId(),
        week: currentWeek,
        goed: document.getElementById('wr-goed').value.trim(),
        lastig: document.getElementById('wr-lastig').value.trim(),
        proces: document.getElementById('wr-proces').value.trim(),
        vraag: document.getElementById('wr-vraag').value.trim(),
        focus: document.getElementById('wr-focus').value.trim(),
        createdAt: existing?.createdAt || Date.now(),
        updatedAt: Date.now()
      };
      await put('weekReviews', record);
      emit('planning:updated');
      showToast('Weekreview opgeslagen', { type: 'success' });
    });
  }

  render();
  unsub = on('planning:updated', render);
  return { destroy() { if (unsub) unsub(); } };
}
