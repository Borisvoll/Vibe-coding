import { escapeHTML } from '../../utils.js';
import { getBPVTodaySnapshot, getQuickReflection, getTimerState, saveQuickReflection, setTimerState } from './store.js';

export function renderBPVToday(container) {
  const mountId = `bpv-today-${crypto.randomUUID()}`;

  async function render() {
    const host = container.querySelector(`[data-block-id="${mountId}"]`);
    if (!host) return;
    const [snapshot, timer, reflection] = await Promise.all([
      getBPVTodaySnapshot(),
      getTimerState(),
      getQuickReflection(),
    ]);

    host.innerHTML = `
      <h3 class="school-block__title">BPV vandaag</h3>
      <p class="school-block__subtitle">Focus 3 • uren snelinvoer • leermoment • reflectie</p>
      <ul class="personal-list">
        ${(snapshot.topTasks || []).map((task) => `<li>${escapeHTML(task)}</li>`).join('') || '<li><small>Geen Top 3 voor vandaag.</small></li>'}
      </ul>
      <div class="school-inline-form">
        <span class="badge badge-default">Uren: ${escapeHTML(String(snapshot.netHours ?? '--:--'))}</span>
        <button class="btn btn-secondary btn-sm" data-action="start">Start</button>
        <button class="btn btn-secondary btn-sm" data-action="pauze">Pauze</button>
        <button class="btn btn-secondary btn-sm" data-action="stop">Stop</button>
      </div>
      <p class="school-block__subtitle">Timerstatus: ${timer.running ? (timer.paused ? 'gepauzeerd' : 'actief') : 'gestopt'}</p>
      <p class="school-block__subtitle">Leermoment: ${escapeHTML(snapshot.learningMoment?.title || snapshot.learningMoment?.lesson || 'Nog geen leermoment vandaag.')}</p>
      <label class="school-block__field"><span>Korte reflectie</span><input class="form-input" data-field="reflectie" value="${escapeHTML(reflection)}" placeholder="Wat ging goed en wat neem je mee?"></label>
      <div class="school-inline-form">
        <a class="btn btn-ghost btn-sm" href="#planning">BPV-doelen</a>
        <a class="btn btn-ghost btn-sm" href="#projects">Actief project</a>
        <button class="btn btn-primary btn-sm" data-action="save">Opslaan</button>
      </div>
    `;

    host.querySelector('[data-action="start"]')?.addEventListener('click', async () => {
      await setTimerState({ running: true, paused: false, startedAt: new Date().toISOString() });
      render();
    });
    host.querySelector('[data-action="pauze"]')?.addEventListener('click', async () => {
      await setTimerState({ ...timer, running: true, paused: true, pausedAt: new Date().toISOString() });
      render();
    });
    host.querySelector('[data-action="stop"]')?.addEventListener('click', async () => {
      await setTimerState({ running: false, paused: false, stoppedAt: new Date().toISOString() });
      render();
    });
    host.querySelector('[data-action="save"]')?.addEventListener('click', async () => {
      const value = host.querySelector('[data-field="reflectie"]').value;
      await saveQuickReflection(value);
      render();
    });
  }

  container.insertAdjacentHTML('beforeend', `<article class="os-mini-card school-block" data-block-id="${mountId}"></article>`);
  render();
  return { unmount() { container.querySelector(`[data-block-id="${mountId}"]`)?.remove(); } };
}
