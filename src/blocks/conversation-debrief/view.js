import { escapeHTML, getToday } from '../../utils.js';
import { getAll, put } from '../../db.js';

const RATINGS = [
  { value: 'good',    label: 'Ging goed',    emoji: '😊', color: '#10b981', colorLight: '#d1fae5' },
  { value: 'neutral', label: 'Neutraal',     emoji: '😐', color: '#6b7280', colorLight: '#f3f4f6' },
  { value: 'draining', label: 'Kostte veel', emoji: '😮‍💨', color: '#ef4444', colorLight: '#fee2e2' },
];

const MAX_LOG_ENTRIES = 100;

export function renderConversationDebrief(container) {
  const wrapper = document.createElement('article');
  wrapper.className = 'conv-debrief os-mini-card';

  let step = 'rate'; // 'rate' | 'reason' | 'done'
  let selectedRating = null;

  async function getTodayWellbeing() {
    const today = getToday();
    const all = await getAll('os_personal_wellbeing').catch(() => []);
    return all.find(w => w.id === today || w.date === today) || null;
  }

  async function getRecentLogs() {
    const all = await getAll('os_personal_wellbeing').catch(() => []);
    const logs = [];
    for (const entry of all) {
      if (Array.isArray(entry.socialLog)) {
        for (const log of entry.socialLog) {
          logs.push({ ...log, date: entry.date || entry.id });
        }
      }
    }
    return logs.sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || '')).slice(0, 10);
  }

  function render() {
    if (step === 'rate') {
      wrapper.innerHTML = `
        <h3 class="conv-debrief__title">Gesprekscheck</h3>
        <p class="conv-debrief__hint">Hoe ging je laatste gesprek?</p>
        <div class="conv-debrief__buttons">
          ${RATINGS.map(r => `
            <button type="button" class="conv-debrief__btn" data-rating="${r.value}"
              style="--rate-color:${r.color};--rate-light:${r.colorLight}">
              <span class="conv-debrief__emoji">${r.emoji}</span>
              <span class="conv-debrief__label">${r.label}</span>
            </button>
          `).join('')}
        </div>
      `;

      wrapper.querySelectorAll('.conv-debrief__btn').forEach(btn => {
        btn.addEventListener('click', () => {
          selectedRating = btn.dataset.rating;
          step = 'reason';
          render();
        });
      });
    } else if (step === 'reason') {
      const rating = RATINGS.find(r => r.value === selectedRating) || RATINGS[1];
      wrapper.innerHTML = `
        <h3 class="conv-debrief__title">${rating.emoji} ${escapeHTML(rating.label)}</h3>
        <form class="conv-debrief__form">
          <input type="text" class="conv-debrief__input" placeholder="Korte reden (optioneel)" maxlength="100" />
          <button type="submit" class="conv-debrief__save">Opslaan</button>
        </form>
      `;

      const form = wrapper.querySelector('.conv-debrief__form');
      const input = wrapper.querySelector('.conv-debrief__input');
      input.focus();

      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const reason = input.value.trim();
        const today = getToday();
        const existing = await getTodayWellbeing();
        const now = new Date().toISOString();

        const socialLog = Array.isArray(existing?.socialLog) ? [...existing.socialLog] : [];
        socialLog.push({
          rating: selectedRating,
          reason: reason || null,
          timestamp: now,
        });

        // Cap to prevent unbounded growth
        while (socialLog.length > MAX_LOG_ENTRIES) socialLog.shift();

        const record = {
          ...(existing || {}),
          id: today,
          date: today,
          socialLog,
          updated_at: now,
        };

        await put('os_personal_wellbeing', record);
        step = 'done';
        render();
      });
    } else {
      renderHistory();
    }
  }

  async function renderHistory() {
    const logs = await getRecentLogs();

    wrapper.innerHTML = `
      <div class="conv-debrief__done">
        <span class="conv-debrief__done-check">✓ Opgeslagen</span>
        <button type="button" class="conv-debrief__reset">Nog een gesprek</button>
      </div>
      ${logs.length > 0 ? `
        <div class="conv-debrief__history">
          <h4 class="conv-debrief__history-title">Recent</h4>
          ${logs.slice(0, 5).map(log => {
            const r = RATINGS.find(x => x.value === log.rating) || RATINGS[1];
            return `<div class="conv-debrief__log">
              <span class="conv-debrief__log-emoji">${r.emoji}</span>
              <span class="conv-debrief__log-text">${log.reason ? escapeHTML(log.reason) : '<em>geen reden</em>'}</span>
            </div>`;
          }).join('')}
        </div>
      ` : ''}
    `;

    wrapper.querySelector('.conv-debrief__reset').addEventListener('click', () => {
      step = 'rate';
      selectedRating = null;
      render();
    });
  }

  render();
  container.appendChild(wrapper);

  return {
    unmount() {
      wrapper.remove();
    },
  };
}
