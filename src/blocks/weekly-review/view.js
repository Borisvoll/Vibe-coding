import {
  aggregateWeeklyReview,
  sendWeeklyReview,
  isReviewSent,
  markReviewSent,
  getWeeklyPrompt,
} from '../../stores/weekly-review.js';
import { getISOWeek, getToday, formatMinutes, escapeHTML } from '../../utils.js';

const HABIT_LABELS = { water: '💧 Water', movement: '🚶 Bewegen', focus: '🎯 Focus' };

export function mountWeeklyReview(container, { eventBus }) {
  const wrapper = document.createElement('div');
  wrapper.className = 'card weekly-review';
  container.appendChild(wrapper);

  let currentData = null;

  async function render() {
    const week = getISOWeek(getToday());
    const sent = await isReviewSent(week);
    const data = await aggregateWeeklyReview(week);
    currentData = data;

    const {
      completedTaskCount, openTaskCount, bpv, gratitude, reflections,
      journalNotes, habitsSummary, activeProjects, processedInboxCount, prompt,
      weekStartFormatted, weekEndFormatted,
    } = data;

    const bpvPct = bpv.percentComplete || 0;
    const bpvColorClass = bpvPct >= 80 ? 'wr__bar-fill--green' : bpvPct >= 50 ? 'wr__bar-fill--amber' : 'wr__bar-fill--red';

    const habitsHtml = Object.entries(habitsSummary).map(([key, val]) => {
      const pct = val.total > 0 ? Math.round((val.done / val.total) * 100) : 0;
      return `<span class="wr__habit-chip">${HABIT_LABELS[key] || key} <span class="wr__muted">${pct}%</span></span>`;
    }).join('');

    wrapper.innerHTML = `
      <div class="wr__header">
        <div>
          <h3 class="wr__title">Weekoverzicht</h3>
          <span class="wr__subtitle">${escapeHTML(week)} · ${escapeHTML(weekStartFormatted)} — ${escapeHTML(weekEndFormatted)}</span>
        </div>
        ${sent
          ? '<span class="wr__sent-badge">Verstuurd ✓</span>'
          : ''}
      </div>

      <!-- Stats -->
      <div class="wr__stats">
        <div class="wr__stat">
          <span class="wr__stat-value">${completedTaskCount}</span>
          <span class="wr__stat-label">taken klaar</span>
        </div>
        <div class="wr__stat">
          <span class="wr__stat-value">${escapeHTML(bpv.formattedTotal || '0u')}</span>
          <span class="wr__stat-label">BPV-uren</span>
        </div>
        <div class="wr__stat">
          <span class="wr__stat-value">${processedInboxCount}</span>
          <span class="wr__stat-label">verwerkt</span>
        </div>
      </div>

      <!-- BPV bar -->
      ${bpv.totalMinutes > 0 ? `
        <div class="wr__section">
          <span class="wr__label">BPV voortgang</span>
          <div class="wr__bar">
            <div class="wr__bar-fill ${bpvColorClass}" style="width:${Math.min(100, bpvPct)}%"></div>
          </div>
          <span class="wr__bar-text">${escapeHTML(bpv.formattedTotal || '0u')} / ${escapeHTML(bpv.formattedTarget || '40u')}</span>
        </div>
      ` : ''}

      <!-- Completed tasks (top 8) -->
      ${completedTaskCount > 0 ? `
        <div class="wr__section">
          <span class="wr__label">Afgeronde taken</span>
          <ul class="wr__list">
            ${completedTasks(data).map((t) => `
              <li class="wr__list-item"><span class="wr__check">✓</span> ${escapeHTML(t.text)}</li>
            `).join('')}
          </ul>
          ${completedTaskCount > 8 ? `<span class="wr__muted">+ ${completedTaskCount - 8} meer</span>` : ''}
          ${openTaskCount > 0 ? `<span class="wr__muted">${openTaskCount} taken nog open</span>` : ''}
        </div>
      ` : ''}

      <!-- Habits -->
      ${habitsHtml ? `
        <div class="wr__section">
          <span class="wr__label">Gewoontes</span>
          <div class="wr__habits">${habitsHtml}</div>
        </div>
      ` : ''}

      <!-- Gratitude -->
      ${gratitude.length > 0 ? `
        <div class="wr__section">
          <span class="wr__label">Dankbaarheid</span>
          <ul class="wr__list wr__list--warm">
            ${gratitude.map((g) => `<li class="wr__list-item"><span class="wr__spark">✦</span> ${escapeHTML(g.text)}</li>`).join('')}
          </ul>
        </div>
      ` : ''}

      <!-- Reflections -->
      ${reflections.length > 0 ? `
        <div class="wr__section">
          <span class="wr__label">Reflecties</span>
          ${reflections.map((r) => `
            <div class="wr__entry">
              <span class="wr__entry-date">${escapeHTML(r.date)}</span>
              <p class="wr__entry-text">${escapeHTML(r.text)}</p>
            </div>
          `).join('')}
        </div>
      ` : ''}

      <!-- Journal -->
      ${journalNotes.length > 0 ? `
        <div class="wr__section">
          <span class="wr__label">Dagboek</span>
          ${journalNotes.map((j) => `
            <div class="wr__entry wr__entry--journal">
              <span class="wr__entry-date">${escapeHTML(j.date)}</span>
              <p class="wr__entry-text">${escapeHTML(j.text)}</p>
            </div>
          `).join('')}
        </div>
      ` : ''}

      <!-- Projects -->
      ${activeProjects.length > 0 ? `
        <div class="wr__section">
          <span class="wr__label">Actieve projecten</span>
          <div class="wr__chips">
            ${activeProjects.map((p) => `<span class="wr__chip">${escapeHTML(p.title)}</span>`).join('')}
          </div>
        </div>
      ` : ''}

      <!-- Prompt -->
      <div class="wr__prompt">
        <span class="wr__prompt-label">Even stilstaan</span>
        <p class="wr__prompt-text">"${escapeHTML(prompt)}"</p>
        <p class="wr__prompt-note">Neem een moment. Niet wat je deed, maar hoe het voelde.</p>
      </div>

      <!-- Send button -->
      <div class="wr__actions">
        <button type="button" class="wr__send-btn" ${sent ? 'disabled' : ''} data-action="send">
          ${sent ? 'Verstuurd ✓' : 'Verstuur naar email'}
        </button>
        <span class="wr__status" id="wr-status"></span>
      </div>
    `;

    // Send button
    wrapper.querySelector('[data-action="send"]')?.addEventListener('click', handleSend);
  }

  function completedTasks(data) {
    return (data.completedTasks || []).slice(0, 8);
  }

  async function handleSend() {
    const btn = wrapper.querySelector('[data-action="send"]');
    const status = wrapper.querySelector('#wr-status');
    if (!btn || !currentData) return;

    btn.disabled = true;
    btn.textContent = 'Versturen...';
    status.textContent = '';

    try {
      const result = await sendWeeklyReview(currentData);
      await markReviewSent(currentData.week);
      if (result?.method === 'mailto') {
        btn.textContent = 'Geopend in email-app ✓';
      } else {
        btn.textContent = 'Verstuurd ✓';
      }
      status.textContent = '';
      status.className = 'wr__status';
    } catch (err) {
      btn.disabled = false;
      btn.textContent = 'Verstuur naar email';
      status.textContent = err.message || 'Versturen mislukt';
      status.className = 'wr__status wr__status--error';
    }
  }

  render();

  const unsubs = [
    eventBus?.on('tasks:changed', () => render()),
    eventBus?.on('bpv:changed', () => render()),
  ];

  return {
    unmount() {
      unsubs.forEach((u) => u?.());
      wrapper.remove();
    },
  };
}
