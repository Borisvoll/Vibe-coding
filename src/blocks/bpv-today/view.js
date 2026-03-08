import { escapeHTML, getToday, formatMinutes } from '../../utils.js';
import { showToast } from '../../toast.js';
import { getBPVTodaySnapshot, getQuickReflection, getTimerState, saveQuickReflection, setTimerState } from './store.js';
import { addHoursEntry, getHoursEntry } from '../../stores/bpv.js';
import { getReportProgress } from '../../stores/report.js';

export function renderBPVToday(container, context) {
  const { eventBus } = context || {};
  const mountId = `bpv-today-${crypto.randomUUID()}`;
  let timerInterval = null;

  async function render() {
    const host = container.querySelector(`[data-block-id="${mountId}"]`);
    if (!host) return;
    const [snapshot, timer, reflection, reportProgress, todayHours] = await Promise.all([
      getBPVTodaySnapshot(),
      getTimerState(),
      getQuickReflection(),
      getReportProgress().catch(() => ({ filled: 0, total: 52, percent: 0 })),
      getHoursEntry(getToday()).catch(() => null),
    ]);

    // Calculate elapsed time for running timer
    let elapsedLabel = '';
    if (timer.running && timer.startedAt) {
      const elapsed = Date.now() - new Date(timer.startedAt).getTime() - (timer.totalPausedMs || 0);
      if (timer.paused && timer.pausedAt) {
        const pauseElapsed = Date.now() - new Date(timer.pausedAt).getTime();
        elapsedLabel = formatMinutes(Math.max(0, Math.round((elapsed + pauseElapsed - (Date.now() - new Date(timer.pausedAt).getTime())) / 60000)));
      } else {
        elapsedLabel = formatMinutes(Math.max(0, Math.round(elapsed / 60000)));
      }
    }

    // Activities from today's hours entry
    const activities = Array.isArray(todayHours?.activities) ? todayHours.activities.filter(a => a && a.trim()) : [];

    host.innerHTML = `
      <h3 class="school-block__title">BPV vandaag</h3>
      <p class="school-block__subtitle">Focus 3 • uren • leermoment • reflectie</p>
      <ul class="personal-list">
        ${(snapshot.topTasks || []).map((task) => `<li>${escapeHTML(task)}</li>`).join('') || '<li><small>Geen Top 3 voor vandaag.</small></li>'}
      </ul>
      ${activities.length > 0 ? `
        <div class="bpv-today__activities">
          <span class="bpv-today__activities-label">Vandaag gedaan:</span>
          ${activities.map(a => `<span class="bpv-today__activity-pill">${escapeHTML(a)}</span>`).join('')}
        </div>
      ` : ''}
      <div class="school-inline-form">
        <span class="badge badge-default">Uren: ${escapeHTML(String(snapshot.netHours ?? '--:--'))}</span>
        ${elapsedLabel ? `<span class="badge badge-default bpv-today__timer-badge" data-timer-elapsed>${escapeHTML(elapsedLabel)}</span>` : ''}
        <button class="btn btn-secondary btn-sm" data-action="start" ${timer.running ? 'disabled' : ''}>Start</button>
        <button class="btn btn-secondary btn-sm" data-action="pauze" ${!timer.running ? 'disabled' : ''}>${timer.paused ? 'Hervat' : 'Pauze'}</button>
        <button class="btn btn-secondary btn-sm" data-action="stop" ${!timer.running ? 'disabled' : ''}>Stop</button>
      </div>
      <p class="school-block__subtitle">Timer: ${timer.running ? (timer.paused ? 'gepauzeerd' : 'actief') : 'gestopt'}</p>
      <p class="school-block__subtitle">Leermoment: ${escapeHTML(snapshot.learningMoment?.title || snapshot.learningMoment?.lesson || 'Nog geen leermoment vandaag.')}</p>
      <label class="school-block__field">
        <span>Korte reflectie</span>
        <input class="form-input" data-field="reflectie" value="${escapeHTML(reflection)}" placeholder="Wat ging goed en wat neem je mee?" maxlength="500">
      </label>
      <div class="bpv-report-shortcut" style="margin:0.75rem 0;padding:0.6rem 0.75rem;border:1px solid var(--color-border,#e5e7eb);border-radius:8px;display:flex;align-items:center;justify-content:space-between;gap:0.5rem">
        <div style="display:flex;align-items:center;gap:0.5rem">
          <span style="font-size:1.1rem">📄</span>
          <div>
            <div style="font-size:0.8rem;font-weight:600">Stageverslag</div>
            <div style="font-size:0.7rem;color:var(--color-text-muted,#6b7280)">${reportProgress.filled}/${reportProgress.total} velden (${reportProgress.percent}%)</div>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:0.5rem">
          <div style="width:60px;height:5px;border-radius:3px;background:var(--color-surface-alt,#f3f4f6);overflow:hidden"><div style="height:100%;width:${reportProgress.percent}%;background:var(--color-accent,#4f6ef7);border-radius:3px"></div></div>
          <a class="btn btn-secondary btn-sm" href="#verslag" style="white-space:nowrap">Openen</a>
        </div>
      </div>
      <div class="school-inline-form">
        <a class="btn btn-ghost btn-sm" href="#planning">BPV-doelen</a>
        <a class="btn btn-ghost btn-sm" href="#projects">Actief project</a>
        <button class="btn btn-primary btn-sm" data-action="save">Opslaan</button>
      </div>
    `;

    // Timer tick interval for elapsed display
    clearInterval(timerInterval);
    if (timer.running && !timer.paused) {
      timerInterval = setInterval(() => {
        const timerEl = host.querySelector('[data-timer-elapsed]');
        if (!timerEl || !timer.startedAt) return;
        const now = Date.now();
        const elapsed = now - new Date(timer.startedAt).getTime() - (timer.totalPausedMs || 0);
        timerEl.textContent = formatMinutes(Math.max(0, Math.round(elapsed / 60000)));
      }, 30000); // Update every 30 seconds
    }

    host.querySelector('[data-action="start"]')?.addEventListener('click', async () => {
      await setTimerState({ running: true, paused: false, startedAt: new Date().toISOString(), totalPausedMs: 0 });
      eventBus?.emit('bpv:changed');
      render();
    });
    host.querySelector('[data-action="pauze"]')?.addEventListener('click', async () => {
      if (timer.paused) {
        const pausedMs = (timer.totalPausedMs || 0) + (Date.now() - new Date(timer.pausedAt).getTime());
        await setTimerState({ ...timer, paused: false, pausedAt: null, totalPausedMs: pausedMs });
      } else {
        await setTimerState({ ...timer, paused: true, pausedAt: new Date().toISOString() });
      }
      eventBus?.emit('bpv:changed');
      render();
    });
    host.querySelector('[data-action="stop"]')?.addEventListener('click', async () => {
      const now = new Date();
      await setTimerState({ running: false, paused: false, stoppedAt: now.toISOString() });
      if (timer.startedAt) {
        const start = new Date(timer.startedAt);
        const toHHMM = (d) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
        let pausedMs = timer.totalPausedMs || 0;
        if (timer.paused && timer.pausedAt) {
          pausedMs += now.getTime() - new Date(timer.pausedAt).getTime();
        }
        const breakMinutes = Math.round(pausedMs / 60000);
        await addHoursEntry(getToday(), {
          type: 'work',
          startTime: toHHMM(start),
          endTime: toHHMM(now),
          breakMinutes,
        });
        showToast('Uren opgeslagen via timer');
      }
      eventBus?.emit('bpv:changed');
      render();
    });
    host.querySelector('[data-action="save"]')?.addEventListener('click', async () => {
      const value = host.querySelector('[data-field="reflectie"]')?.value || '';
      await saveQuickReflection(value);
      showToast('Reflectie opgeslagen');
    });
  }

  container.insertAdjacentHTML('beforeend', `<article class="os-mini-card school-block" data-block-id="${mountId}"></article>`);
  render();

  const unsub = eventBus?.on('bpv:changed', () => render());

  return {
    unmount() {
      clearInterval(timerInterval);
      unsub?.();
      container.querySelector(`[data-block-id="${mountId}"]`)?.remove();
    },
  };
}
