import { escapeHTML, getToday, formatMinutes } from '../../utils.js';
import { showToast } from '../../toast.js';
import { getBPVTodaySnapshot, getQuickReflection, getTimerState, saveQuickReflection, setTimerState } from './store.js';
import { addHoursEntry } from '../../stores/bpv.js';

export function renderBPVToday(container, context) {
  const { eventBus } = context || {};
  const mountId = `bpv-today-${crypto.randomUUID()}`;
  let timerInterval = null;

  async function render() {
    const host = container.querySelector(`[data-block-id="${mountId}"]`);
    if (!host) return;
    const [snapshot, timer, reflection] = await Promise.all([
      getBPVTodaySnapshot(),
      getTimerState(),
      getQuickReflection(),
    ]);

    // Calculate elapsed time for running timer
    let elapsedLabel = '';
    if (timer.running && timer.startedAt) {
      const elapsed = Date.now() - new Date(timer.startedAt).getTime() - (timer.totalPausedMs || 0);
      if (timer.paused && timer.pausedAt) {
        const currentPauseMs = Date.now() - new Date(timer.pausedAt).getTime();
        elapsedLabel = formatMinutes(Math.max(0, Math.round((elapsed - currentPauseMs) / 60000)));
      } else {
        elapsedLabel = formatMinutes(Math.max(0, Math.round(elapsed / 60000)));
      }
    }

    const timerStatus = timer.running
      ? (timer.paused ? 'gepauzeerd' : 'actief')
      : 'gestopt';

    host.innerHTML = `
      <div class="bpv-today__timer-section">
        <div class="bpv-today__timer-header">
          <h3 class="bpv-today__title">Timer</h3>
          <span class="bpv-today__timer-status bpv-today__timer-status--${timer.running ? (timer.paused ? 'paused' : 'active') : 'stopped'}">${escapeHTML(timerStatus)}</span>
        </div>
        ${elapsedLabel ? `<span class="bpv-today__elapsed" data-timer-elapsed>${escapeHTML(elapsedLabel)}</span>` : ''}
        <div class="bpv-today__timer-controls">
          <button class="btn btn-secondary btn-sm" data-action="start" ${timer.running ? 'disabled' : ''}>Start</button>
          <button class="btn btn-secondary btn-sm" data-action="pauze" ${!timer.running ? 'disabled' : ''}>${timer.paused ? 'Hervat' : 'Pauze'}</button>
          <button class="btn btn-secondary btn-sm" data-action="stop" ${!timer.running ? 'disabled' : ''}>Stop</button>
        </div>
      </div>
      <div class="bpv-today__learning">
        <span class="bpv-today__learning-label">Leermoment</span>
        <span class="bpv-today__learning-value">${escapeHTML(snapshot.learningMoment?.title || snapshot.learningMoment?.lesson || 'Nog geen leermoment vandaag.')}</span>
      </div>
      <label class="bpv-today__reflection">
        <span class="bpv-today__reflection-label">Reflectie</span>
        <input class="form-input" data-field="reflectie" value="${escapeHTML(reflection)}" placeholder="Wat ging goed en wat neem je mee?" maxlength="500">
      </label>
      <button class="btn btn-primary btn-sm bpv-today__save" data-action="save">Opslaan</button>
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
        try {
          await addHoursEntry(getToday(), {
            type: 'work',
            startTime: toHHMM(start),
            endTime: toHHMM(now),
            breakMinutes,
          });
          showToast('Uren opgeslagen via timer');
        } catch (err) {
          showToast(`Fout bij opslaan: ${err.message}`);
        }
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
