import { addHoursEntry, getHoursEntry, getUnloggedDays, getLogStreak } from '../../stores/bpv.js';
import { getToday, getISOWeek, formatMinutes, calcNetMinutes, formatDateShort, escapeHTML, getCurrentWeek } from '../../utils.js';
import { DEFAULT_START_TIME, DEFAULT_END_TIME, DEFAULT_BREAK_MINUTES } from '../../constants.js';

const STANDARD_NET = calcNetMinutes(DEFAULT_START_TIME, DEFAULT_END_TIME, DEFAULT_BREAK_MINUTES);

/**
 * Quick daily check-in — one-tap "Log vandaag" + week fill for missed days.
 */
export function renderBPVCheckin(container, context) {
  const { eventBus } = context;
  const mountId = `bpv-ci-${crypto.randomUUID()}`;

  container.insertAdjacentHTML('beforeend', `
    <article class="bpv-checkin os-mini-card" data-mount-id="${mountId}">
      <div class="bpv-checkin__loading">Laden...</div>
    </article>
  `);

  const el = container.querySelector(`[data-mount-id="${mountId}"]`);

  async function render() {
    const today = getToday();
    const entry = await getHoursEntry(today);
    const streak = await getLogStreak();
    const currentWeek = getCurrentWeek();
    const unloggedDays = await getUnloggedDays(currentWeek);

    const todayLogged = !!entry;
    const hasStart = !!entry?.startTime;
    const hasEnd = !!entry?.endTime;

    let html = '';

    if (!todayLogged) {
      // Big "Log Vandaag" button
      html += `
        <div class="bpv-checkin__quick-action">
          <button type="button" class="bpv-checkin__log-today-btn" data-action="log-standard">
            <span class="bpv-checkin__log-today-icon">&#10003;</span>
            <span class="bpv-checkin__log-today-text">
              <span class="bpv-checkin__log-today-label">Log vandaag</span>
              <span class="bpv-checkin__log-today-detail">${escapeHTML(DEFAULT_START_TIME)} – ${escapeHTML(DEFAULT_END_TIME)} | ${DEFAULT_BREAK_MINUTES}m pauze = ${escapeHTML(formatMinutes(STANDARD_NET))} netto</span>
            </span>
          </button>
        </div>
      `;
    } else if (hasStart && hasEnd) {
      // Done state
      const net = calcNetMinutes(entry.startTime, entry.endTime, entry.breakMinutes || 0);
      const activities = (entry.activities || []).filter(a => a && a.trim());
      html += `
        <div class="bpv-checkin__header">
          <span class="bpv-checkin__icon bpv-checkin__icon--done">&#10003;</span>
          <h3 class="bpv-checkin__title">Vandaag gelogd</h3>
        </div>
        <div class="bpv-checkin__summary">
          <span class="bpv-checkin__summary-time">${escapeHTML(entry.startTime)} – ${escapeHTML(entry.endTime)}</span>
          <span class="bpv-checkin__summary-net">${escapeHTML(formatMinutes(net))} netto</span>
        </div>
        ${activities.length > 0 ? `
          <div class="bpv-checkin__summary-acts">
            ${activities.map(a => `<span class="bpv-checkin__act-pill">${escapeHTML(a)}</span>`).join('')}
          </div>
        ` : ''}
      `;
    } else if (hasStart) {
      // Running
      html += `
        <div class="bpv-checkin__header">
          <span class="bpv-checkin__icon">&#9201;</span>
          <h3 class="bpv-checkin__title">Werkdag loopt</h3>
        </div>
        <div class="bpv-checkin__summary">
          <span class="bpv-checkin__summary-time">Gestart om ${escapeHTML(entry.startTime)}</span>
        </div>
      `;
    }

    // Streak
    if (streak > 0) {
      const flame = streak >= 5 ? '&#128293;' : (streak >= 3 ? '&#9733;' : '&#9679;');
      html += `
        <div class="bpv-checkin__streak">
          <span class="bpv-checkin__streak-icon">${flame}</span>
          <span class="bpv-checkin__streak-text">${streak} ${streak === 1 ? 'dag' : 'dagen'} streak</span>
        </div>
      `;
    }

    // Week fill: unlogged days
    if (unloggedDays.length > 0) {
      html += `
        <div class="bpv-checkin__weekfill">
          <div class="bpv-checkin__weekfill-header">
            <span class="bpv-checkin__weekfill-label">Nog niet gelogd deze week</span>
            ${unloggedDays.length > 1 ? `<button type="button" class="btn btn-ghost btn-sm" data-action="fill-all-week">Alles loggen</button>` : ''}
          </div>
          <div class="bpv-checkin__weekfill-days">
            ${unloggedDays.map(d => `
              <div class="bpv-checkin__weekfill-day" data-fill-date="${d}">
                <span class="bpv-checkin__weekfill-day-label">${escapeHTML(formatDateShort(d))}</span>
                <span class="bpv-checkin__weekfill-day-times">${escapeHTML(DEFAULT_START_TIME)} – ${escapeHTML(DEFAULT_END_TIME)}</span>
                <button type="button" class="btn btn-ghost btn-sm bpv-checkin__weekfill-day-btn" data-action="fill-day" data-date="${d}">Log</button>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    el.innerHTML = html;

    // Event handlers
    el.querySelector('[data-action="log-standard"]')?.addEventListener('click', async () => {
      const btn = el.querySelector('[data-action="log-standard"]');
      btn.disabled = true;
      await addHoursEntry(today, {
        type: 'work',
        startTime: DEFAULT_START_TIME,
        endTime: DEFAULT_END_TIME,
        breakMinutes: DEFAULT_BREAK_MINUTES,
      });
      eventBus?.emit('bpv:changed', { date: today });
      render();
    });

    el.querySelectorAll('[data-action="fill-day"]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const date = btn.dataset.date;
        btn.disabled = true;
        btn.textContent = '...';
        await addHoursEntry(date, {
          type: 'work',
          startTime: DEFAULT_START_TIME,
          endTime: DEFAULT_END_TIME,
          breakMinutes: DEFAULT_BREAK_MINUTES,
        });
        eventBus?.emit('bpv:changed', { date });
        render();
      });
    });

    el.querySelector('[data-action="fill-all-week"]')?.addEventListener('click', async () => {
      const btn = el.querySelector('[data-action="fill-all-week"]');
      btn.disabled = true;
      btn.textContent = 'Bezig...';
      for (const date of unloggedDays) {
        await addHoursEntry(date, {
          type: 'work',
          startTime: DEFAULT_START_TIME,
          endTime: DEFAULT_END_TIME,
          breakMinutes: DEFAULT_BREAK_MINUTES,
        });
        eventBus?.emit('bpv:changed', { date });
      }
      render();
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
