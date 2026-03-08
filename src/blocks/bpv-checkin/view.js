import { addHoursEntry, getHoursEntry } from '../../stores/bpv.js';
import { getToday, formatMinutes, calcNetMinutes, escapeHTML } from '../../utils.js';

/**
 * Quick daily check-in flow (30 seconds).
 * Morning: "Hoe laat begin je?" (one tap on common times)
 * Evening: "Hoe laat stop je?" + "3 dingen gedaan" quick flow.
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

  function currentHHMM() {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  }

  function roundToQuarter(hhmm) {
    const [h, m] = hhmm.split(':').map(Number);
    const rounded = Math.round(m / 15) * 15;
    const finalH = rounded === 60 ? h + 1 : h;
    const finalM = rounded === 60 ? 0 : rounded;
    return `${String(finalH).padStart(2, '0')}:${String(finalM).padStart(2, '0')}`;
  }

  async function render() {
    const today = getToday();
    const entry = await getHoursEntry(today);
    const hour = new Date().getHours();
    const isEvening = hour >= 14;

    // Determine check-in state
    const hasStart = !!entry?.startTime;
    const hasEnd = !!entry?.endTime;
    const activities = entry?.activities || ['', '', ''];
    const hasActivities = activities.some(a => a && a.trim());

    if (!hasStart) {
      // Morning flow: quick start time selection
      const currentTime = roundToQuarter(currentHHMM());
      const quickTimes = ['07:00', '07:30', '08:00', '08:30', '09:00'];
      el.innerHTML = `
        <div class="bpv-checkin__header">
          <span class="bpv-checkin__icon">☀️</span>
          <h3 class="bpv-checkin__title">Goedemorgen!</h3>
        </div>
        <p class="bpv-checkin__prompt">Hoe laat begin je vandaag?</p>
        <div class="bpv-checkin__quick-times">
          ${quickTimes.map(t => `
            <button type="button" class="btn btn-ghost bpv-checkin__time-btn" data-action="set-start" data-time="${t}">${t}</button>
          `).join('')}
          <button type="button" class="btn btn-ghost bpv-checkin__time-btn bpv-checkin__time-btn--now" data-action="set-start" data-time="${currentTime}">Nu (${currentTime})</button>
        </div>
      `;
      el.querySelectorAll('[data-action="set-start"]').forEach(btn => {
        btn.addEventListener('click', async () => {
          await addHoursEntry(today, { type: 'work', startTime: btn.dataset.time, breakMinutes: 45 });
          eventBus?.emit('bpv:changed', { date: today });
          render();
        });
      });
    } else if (isEvening && !hasEnd) {
      // Evening flow: end time + activities
      const currentTime = roundToQuarter(currentHHMM());
      const quickTimes = ['15:30', '16:00', '16:30', '17:00', '17:30'];
      el.innerHTML = `
        <div class="bpv-checkin__header">
          <span class="bpv-checkin__icon">🌙</span>
          <h3 class="bpv-checkin__title">Einde werkdag</h3>
        </div>
        <p class="bpv-checkin__prompt">Hoe laat stop je?</p>
        <div class="bpv-checkin__quick-times">
          ${quickTimes.map(t => `
            <button type="button" class="btn btn-ghost bpv-checkin__time-btn" data-action="set-end" data-time="${t}">${t}</button>
          `).join('')}
          <button type="button" class="btn btn-ghost bpv-checkin__time-btn bpv-checkin__time-btn--now" data-action="set-end" data-time="${currentTime}">Nu (${currentTime})</button>
        </div>
        <div class="bpv-checkin__activities">
          <p class="bpv-checkin__prompt">3 dingen gedaan vandaag:</p>
          <input type="text" class="form-input bpv-checkin__input" data-field="act-0" placeholder="1. Wat heb je gedaan?" maxlength="200" value="${escapeHTML(activities[0])}">
          <input type="text" class="form-input bpv-checkin__input" data-field="act-1" placeholder="2. Wat nog meer?" maxlength="200" value="${escapeHTML(activities[1])}">
          <input type="text" class="form-input bpv-checkin__input" data-field="act-2" placeholder="3. En verder?" maxlength="200" value="${escapeHTML(activities[2])}">
        </div>
      `;
      el.querySelectorAll('[data-action="set-end"]').forEach(btn => {
        btn.addEventListener('click', async () => {
          const acts = [
            el.querySelector('[data-field="act-0"]')?.value || '',
            el.querySelector('[data-field="act-1"]')?.value || '',
            el.querySelector('[data-field="act-2"]')?.value || '',
          ];
          await addHoursEntry(today, {
            type: 'work',
            startTime: entry.startTime,
            endTime: btn.dataset.time,
            breakMinutes: entry.breakMinutes || 45,
            activities: acts,
            note: entry.note || '',
          });
          eventBus?.emit('bpv:changed', { date: today });
          render();
        });
      });
    } else if (hasStart && hasEnd) {
      // Done state: show summary
      const net = calcNetMinutes(entry.startTime, entry.endTime, entry.breakMinutes || 0);
      const filledActs = activities.filter(a => a && a.trim());
      el.innerHTML = `
        <div class="bpv-checkin__header">
          <span class="bpv-checkin__icon">✅</span>
          <h3 class="bpv-checkin__title">Dag ingepland</h3>
        </div>
        <div class="bpv-checkin__summary">
          <span class="bpv-checkin__summary-time">${escapeHTML(entry.startTime)} – ${escapeHTML(entry.endTime)}</span>
          <span class="bpv-checkin__summary-net">${escapeHTML(formatMinutes(net))} netto</span>
        </div>
        ${filledActs.length > 0 ? `
          <div class="bpv-checkin__summary-acts">
            ${filledActs.map(a => `<span class="bpv-checkin__act-pill">${escapeHTML(a)}</span>`).join('')}
          </div>
        ` : ''}
      `;
    } else {
      // Has start but not evening yet
      const elapsed = calcNetMinutes(entry.startTime, currentHHMM(), 0);
      el.innerHTML = `
        <div class="bpv-checkin__header">
          <span class="bpv-checkin__icon">⏱️</span>
          <h3 class="bpv-checkin__title">Werkdag loopt</h3>
        </div>
        <div class="bpv-checkin__summary">
          <span class="bpv-checkin__summary-time">Gestart om ${escapeHTML(entry.startTime)}</span>
          <span class="bpv-checkin__summary-net">${escapeHTML(formatMinutes(elapsed))} bezig</span>
        </div>
      `;
    }
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
