/**
 * Pomodoro floating timer widget.
 *
 * Usage:
 *   const pomo = createPomodoro({ eventBus, modeManager });
 *   document.body.appendChild(pomo.el);
 *   pomo.init();
 *   // ...later:
 *   pomo.destroy();
 */

import { addSession, getTodayCount } from '../stores/pomodoro.js';
import { escapeHTML } from '../utils.js';

const WORK_DURATION = 25 * 60;   // seconds
const BREAK_DURATION = 5 * 60;   // seconds
const LONG_BREAK_DURATION = 15 * 60; // every 4 sessions

const CIRCUMFERENCE = 2 * Math.PI * 13; // r=13 on 32px viewBox

export function createPomodoro({ eventBus, modeManager }) {
  let phase = 'work';       // 'work' | 'break' | 'long-break'
  let running = false;
  let secondsLeft = WORK_DURATION;
  let sessionsDone = 0;      // today's session count (loaded from IDB)
  let sessionsDoneToday = 0; // total sessions completed today
  let intervalId = null;
  let panelOpen = false;
  let linkedTask = null;     // { id, text } or null
  let pomodoroColor = 'var(--color-rose)';

  // ── DOM ─────────────────────────────────────────────────

  const widget = document.createElement('div');
  widget.className = 'pomodoro-widget';
  widget.setAttribute('aria-label', 'Pomodoro timer');

  widget.innerHTML = `
    <div class="pomodoro-panel" hidden aria-label="Pomodoro panel">
      <div class="pomodoro-panel__header">
        <span class="pomodoro-panel__title">Pomodoro</span>
        <button type="button" class="pomodoro-panel__close" aria-label="Sluit panel">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <line x1="1" y1="1" x2="11" y2="11"/><line x1="11" y1="1" x2="1" y2="11"/>
          </svg>
        </button>
      </div>

      <div class="pomodoro-panel__timer">
        <div class="pomodoro-panel__countdown" aria-live="polite" aria-atomic="true">25:00</div>
        <div class="pomodoro-panel__phase-label">Focustijd</div>
      </div>

      <div class="pomodoro-panel__task" hidden>
        <svg class="pomodoro-panel__task-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
        <span class="pomodoro-panel__task-text"></span>
      </div>

      <div class="pomodoro-panel__controls">
        <button type="button" class="pomodoro-panel__btn pomodoro-panel__btn--primary" data-action="toggle">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
          Start
        </button>
        <button type="button" class="pomodoro-panel__btn pomodoro-panel__btn--ghost" data-action="reset" title="Reset">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3"/>
          </svg>
          Reset
        </button>
      </div>

      <div class="pomodoro-panel__stats">
        <div class="pomodoro-panel__stat">
          <span class="pomodoro-panel__stat-value" data-stat="today">0</span>
          <span class="pomodoro-panel__stat-label">Vandaag</span>
        </div>
        <div class="pomodoro-panel__dots" aria-label="Sessies"></div>
        <div class="pomodoro-panel__stat">
          <span class="pomodoro-panel__stat-value" data-stat="minutes">0</span>
          <span class="pomodoro-panel__stat-label">Minuten</span>
        </div>
      </div>
    </div>

    <div class="pomodoro-pill" role="button" tabindex="0" aria-label="Pomodoro timer openen">
      <div class="pomodoro-ring">
        <svg width="32" height="32" viewBox="0 0 32 32">
          <circle class="pomodoro-ring__bg" cx="16" cy="16" r="13"/>
          <circle class="pomodoro-ring__progress" cx="16" cy="16" r="13"
            stroke-dasharray="${CIRCUMFERENCE}"
            stroke-dashoffset="0"/>
        </svg>
        <span class="pomodoro-ring__label">🍅</span>
      </div>
      <span class="pomodoro-pill__time">25:00</span>
      <span class="pomodoro-pill__phase">Focus</span>
      <span class="pomodoro-pill__count" hidden>0</span>
    </div>
  `;

  const panel       = widget.querySelector('.pomodoro-panel');
  const pill        = widget.querySelector('.pomodoro-pill');
  const countdown   = widget.querySelector('.pomodoro-panel__countdown');
  const phaseLabel  = widget.querySelector('.pomodoro-panel__phase-label');
  const pillTime    = widget.querySelector('.pomodoro-pill__time');
  const pillPhase   = widget.querySelector('.pomodoro-pill__phase');
  const pillCount   = widget.querySelector('.pomodoro-pill__count');
  const taskEl      = widget.querySelector('.pomodoro-panel__task');
  const taskTextEl  = widget.querySelector('.pomodoro-panel__task-text');
  const toggleBtn   = widget.querySelector('[data-action="toggle"]');
  const resetBtn    = widget.querySelector('[data-action="reset"]');
  const closeBtn    = widget.querySelector('.pomodoro-panel__close');
  const ring        = widget.querySelector('.pomodoro-ring__progress');
  const dotsEl      = widget.querySelector('.pomodoro-panel__dots');
  const statToday   = widget.querySelector('[data-stat="today"]');
  const statMins    = widget.querySelector('[data-stat="minutes"]');

  // ── Helpers ──────────────────────────────────────────────

  function formatTime(secs) {
    const m = String(Math.floor(secs / 60)).padStart(2, '0');
    const s = String(secs % 60).padStart(2, '0');
    return `${m}:${s}`;
  }

  function getPhaseLabel() {
    if (phase === 'work') return 'Focustijd';
    if (phase === 'long-break') return 'Lange pauze';
    return 'Pauze';
  }

  function getPhaseDuration() {
    if (phase === 'work') return WORK_DURATION;
    if (phase === 'long-break') return LONG_BREAK_DURATION;
    return BREAK_DURATION;
  }

  function updateColor() {
    const isWork = phase === 'work';
    pomodoroColor = isWork ? 'var(--color-rose)' : 'var(--color-emerald)';
    widget.style.setProperty('--pomo-color', pomodoroColor);
    pill.classList.toggle('pomodoro-pill--break', !isWork);
  }

  function updateRing() {
    const total = getPhaseDuration();
    const progress = secondsLeft / total;
    const offset = CIRCUMFERENCE * (1 - progress);
    ring.style.strokeDashoffset = String(offset);
  }

  function updateDisplay() {
    const timeStr = formatTime(secondsLeft);
    countdown.textContent = timeStr;
    pillTime.textContent = timeStr;
    pillPhase.textContent = phase === 'work' ? 'Focus' : 'Pauze';
    phaseLabel.textContent = getPhaseLabel();
    updateRing();

    toggleBtn.innerHTML = running
      ? `<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg> Pauzeer`
      : `<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg> Start`;

    pill.classList.toggle('pomodoro-pill--running', running);
  }

  function renderStats() {
    statToday.textContent = String(sessionsDoneToday);
    statMins.textContent = String(sessionsDoneToday * 25);

    // Dots: max 8 shown (4 per row)
    const shown = Math.min(sessionsDoneToday, 8);
    let dots = '';
    for (let i = 0; i < shown; i++) dots += `<span class="pomodoro-panel__dot pomodoro-panel__dot--done"></span>`;
    // Grey placeholders up to next multiple of 4
    const remainder = (4 - (shown % 4)) % 4;
    for (let i = 0; i < remainder; i++) dots += `<span class="pomodoro-panel__dot"></span>`;
    dotsEl.innerHTML = dots;

    if (sessionsDoneToday > 0) {
      pillCount.textContent = String(sessionsDoneToday);
      pillCount.hidden = false;
    } else {
      pillCount.hidden = true;
    }
  }

  // ── Timer logic ──────────────────────────────────────────

  function tick() {
    if (secondsLeft <= 0) {
      onPhaseComplete();
      return;
    }
    secondsLeft -= 1;
    updateDisplay();
  }

  async function onPhaseComplete() {
    clearInterval(intervalId);
    running = false;

    if (phase === 'work') {
      // Save session to IDB
      const mode = modeManager.getMode();
      await addSession({
        taskId: linkedTask?.id || null,
        taskText: linkedTask?.text || null,
        mode,
        duration: 25,
      });
      sessionsDoneToday += 1;
      eventBus.emit('pomodoro:session', { mode, sessionsDoneToday });

      // Celebrate
      widget.classList.add('pomodoro-widget--complete');
      setTimeout(() => widget.classList.remove('pomodoro-widget--complete'), 700);

      // Decide next phase
      if (sessionsDoneToday % 4 === 0) {
        phase = 'long-break';
      } else {
        phase = 'break';
      }
    } else {
      phase = 'work';
    }

    secondsLeft = getPhaseDuration();
    updateColor();
    updateDisplay();
    renderStats();

    // Auto-open panel to show phase transition
    openPanel();
  }

  function startTimer() {
    if (running) return;
    running = true;
    updateDisplay();
    intervalId = setInterval(tick, 1000);
  }

  function pauseTimer() {
    running = false;
    clearInterval(intervalId);
    updateDisplay();
  }

  function resetTimer() {
    pauseTimer();
    secondsLeft = getPhaseDuration();
    updateDisplay();
  }

  // ── Panel open/close ─────────────────────────────────────

  function openPanel() {
    panelOpen = true;
    panel.hidden = false;
    panel.removeAttribute('hidden');
  }

  function closePanel() {
    panelOpen = false;
    panel.hidden = true;
  }

  function togglePanel() {
    if (panelOpen) closePanel();
    else openPanel();
  }

  // ── Task linking ─────────────────────────────────────────

  /**
   * Link the timer to a task. Called from outside (e.g., a task block).
   * @param {{ id: string, text: string } | null} task
   */
  function linkTask(task) {
    linkedTask = task;
    if (task) {
      taskTextEl.textContent = task.text;
      taskEl.hidden = false;
    } else {
      taskEl.hidden = true;
    }
  }

  // ── Event listeners ──────────────────────────────────────

  pill.addEventListener('click', togglePanel);
  pill.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); togglePanel(); }
  });

  closeBtn.addEventListener('click', closePanel);

  toggleBtn.addEventListener('click', () => {
    if (running) pauseTimer();
    else startTimer();
  });

  resetBtn.addEventListener('click', resetTimer);

  // Listen for task-link events emitted from task blocks
  const unsubTaskLink = eventBus.on('pomodoro:link-task', (task) => linkTask(task));

  // ── Initialization ───────────────────────────────────────

  async function init() {
    updateColor();
    updateDisplay();
    try {
      sessionsDoneToday = await getTodayCount();
    } catch {
      sessionsDoneToday = 0;
    }
    renderStats();
  }

  function destroy() {
    clearInterval(intervalId);
    unsubTaskLink?.();
    widget.remove();
  }

  return {
    el: widget,
    init,
    destroy,
    linkTask,
    startTimer,
    pauseTimer,
  };
}
