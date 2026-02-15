import { getByIndex, put, getAll } from '../db.js';
import { icon } from '../icons.js';
import { on, emit } from '../state.js';
import { showToast } from '../toast.js';
import {
  generateId, getToday, formatDateLong, getISOWeek,
  getCurrentWeek, weekNumber, escapeHTML, formatDateISO
} from '../utils.js';
import { WEEKDAYS } from '../constants.js';

export function createPage(container) {
  let unsub;
  const today = getToday();
  const currentWeek = getCurrentWeek();
  let activeTab = 'dag';
  let focusState = { running: false, paused: false, elapsed: 0, interval: null };

  async function render() {
    const dailyPlan = await getDailyPlan(today);
    const weekReview = await getWeekReview(currentWeek);
    const allReviews = (await getAll('weekReviews')).sort((a, b) => b.week.localeCompare(a.week));
    const energyEntries = await getAll('energy');

    container.innerHTML = `
      <div class="page-header">
        <h2>Plannen & Organiseren</h2>
        <p>Rust in je hoofd, focus op je werk</p>
      </div>

      <div style="display:flex; gap:var(--space-2); margin-bottom:var(--space-6); flex-wrap:wrap">
        <button class="btn ${activeTab === 'dag' ? 'btn-primary' : 'btn-secondary'} btn-sm" data-tab="dag">Dagplan</button>
        <button class="btn ${activeTab === 'week' ? 'btn-primary' : 'btn-secondary'} btn-sm" data-tab="week">Weekreview</button>
        <button class="btn ${activeTab === 'focus' ? 'btn-primary' : 'btn-secondary'} btn-sm" data-tab="focus">${icon('clock', 14)} Focus</button>
        <button class="btn ${activeTab === 'energie' ? 'btn-primary' : 'btn-secondary'} btn-sm" data-tab="energie">Energie</button>
      </div>

      ${activeTab === 'dag' ? renderDailyPlan(dailyPlan)
        : activeTab === 'week' ? renderWeekReview(weekReview, allReviews)
        : activeTab === 'focus' ? renderFocusMode(dailyPlan)
        : renderEnergyMeter(energyEntries)}
    `;

    container.querySelectorAll('[data-tab]').forEach(btn => {
      btn.addEventListener('click', () => {
        activeTab = btn.dataset.tab;
        render();
      });
    });

    if (activeTab === 'dag') bindDailyEvents(dailyPlan);
    else if (activeTab === 'week') bindWeekEvents(weekReview);
    else if (activeTab === 'focus') bindFocusEvents();
    else if (activeTab === 'energie') bindEnergyEvents(energyEntries);
  }

  // ===== FOCUS MODE =====
  function renderFocusMode(dailyPlan) {
    const tasks = dailyPlan?.tasks || [];
    const totalSeconds = 45 * 60;
    const remaining = Math.max(0, totalSeconds - focusState.elapsed);
    const mins = Math.floor(remaining / 60);
    const secs = remaining % 60;
    const pct = Math.round((focusState.elapsed / totalSeconds) * 100);

    return `
      <div class="card focus-card" style="text-align:center; padding:var(--space-8)">
        <h3 style="margin-bottom:var(--space-6)">Focus Mode — 45 minuten</h3>
        <div class="focus-timer" style="font-size:3rem; font-weight:700; font-variant-numeric:tabular-nums; color:${focusState.running ? 'var(--color-blue)' : 'var(--color-text-primary)'}; margin-bottom:var(--space-4)">
          ${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}
        </div>
        <div class="progress-bar" style="margin-bottom:var(--space-6); max-width:300px; margin-left:auto; margin-right:auto">
          <div class="progress-bar-fill blue" style="width:${pct}%"></div>
        </div>
        <div style="display:flex; gap:var(--space-3); justify-content:center; margin-bottom:var(--space-8)">
          ${!focusState.running && !focusState.paused ? `
            <button class="btn btn-primary" data-focus="start">${icon('check-circle', 16)} Start</button>
          ` : focusState.running ? `
            <button class="btn btn-secondary" data-focus="pause">Pauze</button>
            <button class="btn btn-danger btn-sm" data-focus="stop">Stop</button>
          ` : `
            <button class="btn btn-primary" data-focus="resume">Hervat</button>
            <button class="btn btn-danger btn-sm" data-focus="stop">Stop</button>
          `}
          ${focusState.elapsed > 0 && !focusState.running ? `
            <button class="btn btn-ghost btn-sm" data-focus="reset">Reset</button>
          ` : ''}
        </div>
        ${tasks.length > 0 ? `
          <div style="text-align:left; max-width:400px; margin:0 auto">
            <h4 style="margin-bottom:var(--space-3); color:var(--color-text-secondary)">Top 3 taken vandaag</h4>
            ${tasks.map((t, i) => `
              <div style="display:flex; align-items:center; gap:var(--space-3); padding:var(--space-3); background:var(--color-bg-secondary); border-radius:var(--radius-md); margin-bottom:var(--space-2)">
                <span style="font-weight:600; color:var(--color-blue)">${i + 1}</span>
                <span>${escapeHTML(t)}</span>
              </div>
            `).join('')}
          </div>
        ` : `<p style="color:var(--color-text-tertiary)">Vul eerst je dagplan in om taken te zien.</p>`}
      </div>
    `;
  }

  function bindFocusEvents() {
    container.querySelector('[data-focus="start"]')?.addEventListener('click', () => startFocusTimer());
    container.querySelector('[data-focus="pause"]')?.addEventListener('click', () => pauseFocusTimer());
    container.querySelector('[data-focus="resume"]')?.addEventListener('click', () => startFocusTimer());
    container.querySelector('[data-focus="stop"]')?.addEventListener('click', () => stopFocusTimer());
    container.querySelector('[data-focus="reset"]')?.addEventListener('click', () => { focusState.elapsed = 0; render(); });
  }

  function startFocusTimer() {
    focusState.running = true;
    focusState.paused = false;
    focusState.interval = setInterval(() => {
      focusState.elapsed++;
      if (focusState.elapsed >= 45 * 60) {
        stopFocusTimer();
        showToast('Focus sessie voltooid!', { type: 'success' });
      }
      const remaining = Math.max(0, 45 * 60 - focusState.elapsed);
      const m = Math.floor(remaining / 60);
      const s = remaining % 60;
      const el = container.querySelector('.focus-timer');
      if (el) el.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
      const fill = container.querySelector('.progress-bar-fill');
      if (fill) fill.style.width = Math.round((focusState.elapsed / (45 * 60)) * 100) + '%';
    }, 1000);
    render();
  }

  function pauseFocusTimer() {
    clearInterval(focusState.interval);
    focusState.running = false;
    focusState.paused = true;
    render();
  }

  function stopFocusTimer() {
    clearInterval(focusState.interval);
    focusState.running = false;
    focusState.paused = false;
    render();
  }

  // ===== ENERGY METER =====
  function renderEnergyMeter(entries) {
    const todayEnergy = entries.find(e => e.date === today);
    const currentLevel = todayEnergy?.level || 0;

    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = formatDateISO(d);
      const entry = entries.find(e => e.date === dateStr);
      const dayIdx = (d.getDay() + 6) % 7;
      days.push({ date: dateStr, day: WEEKDAYS[dayIdx] || '??', level: entry?.level || 0 });
    }

    return `
      <div class="card" style="margin-bottom:var(--space-6)">
        <h3 style="margin-bottom:var(--space-4)">Energie vandaag — ${formatDateLong(today)}</h3>
        <p style="color:var(--color-text-secondary); font-size:0.875rem; margin-bottom:var(--space-4)">Hoe voel je je vandaag?</p>
        <div style="display:flex; gap:var(--space-3); justify-content:center; margin-bottom:var(--space-4)">
          ${[1,2,3,4,5].map(level => `
            <button class="energy-btn" data-level="${level}" style="
              width:56px; height:56px; border-radius:50%; border:2px solid ${getEnergyColor(level)};
              background: ${currentLevel === level ? getEnergyColor(level) : 'transparent'};
              color: ${currentLevel === level ? '#fff' : getEnergyColor(level)};
              font-size:1.25rem; font-weight:700; cursor:pointer; transition: all 0.2s;
            ">${level}</button>
          `).join('')}
        </div>
        <div style="display:flex; justify-content:space-between; font-size:0.75rem; color:var(--color-text-tertiary); max-width:320px; margin:0 auto">
          <span>Uitgeput</span><span>Vol energie</span>
        </div>
      </div>
      <div class="card">
        <h3 style="margin-bottom:var(--space-4)">Laatste 7 dagen</h3>
        <div style="display:flex; gap:var(--space-3); align-items:flex-end; justify-content:center; height:120px">
          ${days.map(d => {
            const height = d.level > 0 ? (d.level / 5) * 100 : 4;
            return `
              <div style="display:flex; flex-direction:column; align-items:center; gap:var(--space-1)">
                <span style="font-size:0.75rem; font-weight:600">${d.level || '-'}</span>
                <div style="width:32px; height:${height}px; background:${d.level > 0 ? getEnergyColor(d.level) : 'var(--color-border)'}; border-radius:var(--radius-sm); transition:height 0.3s"></div>
                <span style="font-size:0.75rem; color:var(--color-text-secondary)">${d.day}</span>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  function getEnergyColor(level) {
    return { 1: '#f43f5e', 2: '#f97316', 3: '#f59e0b', 4: '#10b981', 5: '#4f6ef7' }[level] || '#9094ad';
  }

  function bindEnergyEvents(entries) {
    container.querySelectorAll('[data-level]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const level = parseInt(btn.dataset.level, 10);
        const existing = entries.find(e => e.date === today);
        await put('energy', {
          id: existing?.id || generateId(),
          date: today,
          level,
          createdAt: existing?.createdAt || Date.now(),
          updatedAt: Date.now()
        });
        emit('energy:updated');
        showToast(`Energie: ${level}/5`, { type: 'success' });
        render();
      });
    });
  }

  // ===== DAILY PLAN =====
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
            <textarea id="evaluation" class="form-textarea" rows="3" placeholder="Hoe is de dag verlopen?">${escapeHTML(evaluation)}</textarea>
          </div>
          <div class="form-group">
            <label class="form-label" for="next-step">Wat is de volgende stap?</label>
            <input type="text" id="next-step" class="form-input" value="${escapeHTML(nextStep)}" placeholder="Eerste actie voor morgen...">
          </div>
          <button type="submit" class="btn btn-primary">${icon('save', 16)} Opslaan</button>
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
            <label class="form-label" for="wr-vraag">Inhoudelijke vraag (overleg)</label>
            <textarea id="wr-vraag" class="form-textarea" rows="2">${escapeHTML(r.vraag || '')}</textarea>
          </div>
          <div class="form-group">
            <label class="form-label" for="wr-focus">Focus volgende week</label>
            <textarea id="wr-focus" class="form-textarea" rows="2">${escapeHTML(r.focus || '')}</textarea>
          </div>
          <button type="submit" class="btn btn-primary">${icon('save', 16)} Opslaan</button>
        </form>
      </div>
      ${allReviews.filter(r => r.week !== currentWeek).length > 0 ? `
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
  return {
    destroy() {
      if (unsub) unsub();
      clearInterval(focusState.interval);
    }
  };
}
