import { escapeHTML, getToday, purgeOldLocalStorageKeys } from '../utils.js';
import { getDailyEntry, saveOutcomes } from '../stores/daily.js';
import { getActiveProjects, setPinned, getPinnedProject } from '../stores/projects.js';
import { getByKey } from '../db.js';

const STEPS = ['outcomes', 'actions', 'focus', 'confirm'];

// ── LocalStorage persistence ──────────────────────────────────

// Remove morning-flow keys older than 14 days on first import
purgeOldLocalStorageKeys('boris_morning_', 14);

function stateKey(date, mode) {
  return `boris_morning_${date}_${mode}`;
}

export function getFlowState(date, mode) {
  try {
    const raw = localStorage.getItem(stateKey(date, mode));
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function saveFlowState(date, mode, state) {
  try {
    localStorage.setItem(stateKey(date, mode), JSON.stringify(state));
  } catch {}
}

/**
 * Check whether the morning flow should auto-open.
 * True when: outcomes not yet filled AND flow not completed/dismissed today.
 */
export async function shouldAutoOpen(modeManager) {
  const mode = modeManager.getMode();
  const today = getToday();
  const state = getFlowState(today, mode);
  if (state?.completed || state?.dismissed) return false;
  const entry = await getDailyEntry(mode, today);
  const outcomes = entry?.outcomes || ['', '', ''];
  return outcomes.every((o) => !o.trim());
}

// ── Morning Flow Stepper ──────────────────────────────────────

/**
 * Creates the morning flow stepper overlay.
 *
 * @param {Object} opts
 * @param {Object} opts.modeManager
 * @param {Object} opts.eventBus
 * @returns {{ open, close, destroy, isOpen }}
 */
export function createMorningFlow({ modeManager, eventBus }) {
  let isOpen = false;
  let currentStep = 0;
  let outcomes = ['', '', ''];
  let projects = [];
  let selectedFocusId = null;

  const today = getToday();

  // ── DOM ──────────────────────────────────────────────────
  const overlay = document.createElement('div');
  overlay.className = 'morning-flow';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-label', 'Ochtendplan');
  overlay.setAttribute('aria-modal', 'true');
  overlay.hidden = true;

  overlay.innerHTML = `
    <div class="morning-flow__backdrop"></div>
    <div class="morning-flow__panel">
      <div class="morning-flow__header">
        <span class="morning-flow__title">Ochtendplan</span>
        <div class="morning-flow__dots"></div>
        <button type="button" class="morning-flow__close" aria-label="Sluiten">&times;</button>
      </div>
      <div class="morning-flow__body"></div>
      <div class="morning-flow__footer"></div>
    </div>
  `;

  const backdrop = overlay.querySelector('.morning-flow__backdrop');
  const dotsEl = overlay.querySelector('.morning-flow__dots');
  const bodyEl = overlay.querySelector('.morning-flow__body');
  const footerEl = overlay.querySelector('.morning-flow__footer');
  const closeBtn = overlay.querySelector('.morning-flow__close');

  // ── Step rendering ────────────────────────────────────────

  function renderDots() {
    dotsEl.innerHTML = STEPS.map((_, i) =>
      `<span class="morning-flow__dot${i === currentStep ? ' morning-flow__dot--active' : ''}${i < currentStep ? ' morning-flow__dot--done' : ''}"></span>`
    ).join('');
  }

  function renderFooter() {
    const isFirst = currentStep === 0;
    const isLast = currentStep === STEPS.length - 1;
    const nextLabel = isLast ? 'Start je dag' : 'Volgende';
    const backHtml = !isFirst
      ? `<button type="button" class="btn btn-ghost morning-flow__back">Terug</button>`
      : '<span></span>';
    footerEl.innerHTML = `
      ${backHtml}
      <button type="button" class="btn btn-primary morning-flow__next">${nextLabel} →</button>
    `;
    footerEl.querySelector('.morning-flow__back')?.addEventListener('click', goBack);
    footerEl.querySelector('.morning-flow__next').addEventListener('click', goNext);
  }

  // Step 1: Top 3
  function renderOutcomes() {
    const mode = modeManager.getMode();
    const modeColors = {
      School: 'var(--color-purple)',
      Personal: 'var(--color-emerald)',
      BPV: 'var(--color-blue)',
    };
    const color = modeColors[mode] || modeColors.School;
    const placeholders = [
      'Belangrijkste uitkomst\u2026',
      'Tweede prioriteit\u2026',
      'Derde (optioneel)\u2026',
    ];

    bodyEl.innerHTML = `
      <div class="morning-flow__step">
        <h3 class="morning-flow__step-title" style="color:${color}">Wat wil je vandaag bereiken?</h3>
        <div class="morning-flow__outcomes">
          ${outcomes.map((val, i) => `
            <label class="morning-flow__outcome">
              <span class="morning-flow__outcome-num" style="color:${color}">${i + 1}</span>
              <input type="text" class="form-input morning-flow__outcome-input"
                data-idx="${i}" value="${escapeHTML(val)}"
                placeholder="${placeholders[i]}" autocomplete="off" />
            </label>
          `).join('')}
        </div>
      </div>
    `;

    // Focus first empty input
    const inputs = bodyEl.querySelectorAll('.morning-flow__outcome-input');
    const firstEmpty = Array.from(inputs).find((inp) => !inp.value.trim());
    (firstEmpty || inputs[0])?.focus();

    // Sync values on input
    inputs.forEach((inp) => {
      inp.addEventListener('input', () => {
        outcomes[parseInt(inp.dataset.idx, 10)] = inp.value;
      });
      inp.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          const idx = parseInt(inp.dataset.idx, 10);
          if (idx < 2) inputs[idx + 1]?.focus();
          else goNext();
        }
      });
    });
  }

  // Step 2: Next Actions (read-only overview)
  async function renderActions() {
    const mode = modeManager.getMode();
    projects = await getActiveProjects(mode);

    if (projects.length === 0) {
      bodyEl.innerHTML = `
        <div class="morning-flow__step">
          <h3 class="morning-flow__step-title">Volgende acties</h3>
          <p class="morning-flow__empty">Geen actieve projecten in deze modus.</p>
        </div>
      `;
      return;
    }

    const rows = await Promise.all(projects.map(async (p) => {
      let nextText = 'Geen volgende actie';
      if (p.nextActionId) {
        const task = await getByKey('os_tasks', p.nextActionId);
        if (task) nextText = task.text;
      }
      const hasAction = p.nextActionId != null;
      return `
        <div class="morning-flow__action-row">
          <span class="morning-flow__action-check">${hasAction ? '✓' : '○'}</span>
          <div class="morning-flow__action-info">
            <span class="morning-flow__action-project">${escapeHTML(p.title)}</span>
            <span class="morning-flow__action-next ${hasAction ? '' : 'morning-flow__action-next--empty'}">→ ${escapeHTML(nextText)}</span>
          </div>
        </div>
      `;
    }));

    bodyEl.innerHTML = `
      <div class="morning-flow__step">
        <h3 class="morning-flow__step-title">Volgende acties</h3>
        <div class="morning-flow__actions-list">${rows.join('')}</div>
      </div>
    `;
  }

  // Step 3: Project Focus (optional picker)
  async function renderFocus() {
    const mode = modeManager.getMode();
    if (projects.length === 0) {
      projects = await getActiveProjects(mode);
    }
    const pinned = await getPinnedProject(mode);
    if (!selectedFocusId && pinned) selectedFocusId = pinned.id;

    const options = [
      ...projects.map((p) => ({
        id: p.id,
        label: p.title,
        selected: selectedFocusId === p.id,
      })),
      { id: '__none__', label: 'Geen focus vandaag', selected: !selectedFocusId },
    ];

    bodyEl.innerHTML = `
      <div class="morning-flow__step">
        <h3 class="morning-flow__step-title">Kies je projectfocus</h3>
        <p class="morning-flow__step-sub">Optioneel — helpt je om gefocust te blijven.</p>
        <div class="morning-flow__focus-list">
          ${options.map((opt) => `
            <label class="morning-flow__focus-option${opt.selected ? ' morning-flow__focus-option--selected' : ''}">
              <input type="radio" name="morning-focus" value="${escapeHTML(opt.id)}"
                ${opt.selected ? 'checked' : ''} class="morning-flow__focus-radio" />
              <span class="morning-flow__focus-label">${escapeHTML(opt.label)}</span>
            </label>
          `).join('')}
        </div>
      </div>
    `;

    bodyEl.querySelectorAll('.morning-flow__focus-radio').forEach((radio) => {
      radio.addEventListener('change', () => {
        selectedFocusId = radio.value === '__none__' ? null : radio.value;
        // Update visual selection
        bodyEl.querySelectorAll('.morning-flow__focus-option').forEach((opt) => {
          opt.classList.toggle('morning-flow__focus-option--selected',
            opt.querySelector('input').checked);
        });
      });
    });
  }

  // Step 4: Confirm / Summary
  async function renderConfirm() {
    const mode = modeManager.getMode();
    const modeColors = {
      School: 'var(--color-purple)',
      Personal: 'var(--color-emerald)',
      BPV: 'var(--color-blue)',
    };
    const color = modeColors[mode] || modeColors.School;

    const filledOutcomes = outcomes.filter((o) => o.trim());

    let focusHtml = '';
    if (selectedFocusId) {
      const project = projects.find((p) => p.id === selectedFocusId);
      if (project) {
        let nextText = '';
        if (project.nextActionId) {
          const task = await getByKey('os_tasks', project.nextActionId);
          if (task) nextText = task.text;
        }
        focusHtml = `
          <div class="morning-flow__confirm-focus">
            <span class="morning-flow__confirm-focus-label">Projectfocus</span>
            <span class="morning-flow__confirm-focus-title">${escapeHTML(project.title)}</span>
            ${nextText ? `<span class="morning-flow__confirm-focus-action">→ ${escapeHTML(nextText)}</span>` : ''}
          </div>
        `;
      }
    }

    bodyEl.innerHTML = `
      <div class="morning-flow__step morning-flow__step--confirm">
        <h3 class="morning-flow__step-title" style="color:${color}">Je ochtendplan</h3>
        <div class="morning-flow__confirm-outcomes">
          ${filledOutcomes.length > 0
            ? filledOutcomes.map((o, i) => `
                <div class="morning-flow__confirm-outcome">
                  <span class="morning-flow__confirm-num" style="color:${color}">${i + 1}</span>
                  <span>${escapeHTML(o)}</span>
                </div>
              `).join('')
            : '<p class="morning-flow__empty">Geen doelen ingesteld</p>'
          }
        </div>
        ${focusHtml}
      </div>
    `;
  }

  // ── Step logic ────────────────────────────────────────────

  async function renderStep() {
    renderDots();
    renderFooter();

    switch (STEPS[currentStep]) {
      case 'outcomes': renderOutcomes(); break;
      case 'actions': await renderActions(); break;
      case 'focus': await renderFocus(); break;
      case 'confirm': await renderConfirm(); break;
    }
  }

  function collectOutcomes() {
    bodyEl.querySelectorAll('.morning-flow__outcome-input').forEach((inp) => {
      outcomes[parseInt(inp.dataset.idx, 10)] = inp.value;
    });
  }

  async function goNext() {
    const mode = modeManager.getMode();
    const step = STEPS[currentStep];

    // Save data at step boundaries
    if (step === 'outcomes') {
      collectOutcomes();
      await saveOutcomes(mode, today, outcomes);
      eventBus.emit('daily:changed', { mode, date: today });
    }

    if (step === 'focus' && selectedFocusId) {
      await setPinned(selectedFocusId, mode);
      eventBus.emit('projects:changed');
    }

    if (currentStep < STEPS.length - 1) {
      currentStep++;
      saveFlowState(today, mode, { step: currentStep, completed: false, dismissed: false });
      await renderStep();
    } else {
      // Complete
      saveFlowState(today, mode, { step: currentStep, completed: true, dismissed: false });
      eventBus.emit('morning:completed', { mode, date: today });
      close();
    }
  }

  async function goBack() {
    if (currentStep > 0) {
      if (STEPS[currentStep] === 'actions') {
        collectOutcomes();
      }
      currentStep--;
      const mode = modeManager.getMode();
      saveFlowState(today, mode, { step: currentStep, completed: false, dismissed: false });
      await renderStep();
    }
  }

  function dismiss() {
    const mode = modeManager.getMode();
    const state = getFlowState(today, mode) || {};
    saveFlowState(today, mode, { ...state, dismissed: true });
    close();
  }

  // ── Keyboard ─────────────────────────────────────────────
  function handleKeydown(e) {
    if (e.key === 'Escape') {
      e.preventDefault();
      dismiss();
    }
  }

  // ── Public API ────────────────────────────────────────────

  async function open() {
    if (isOpen) return;
    isOpen = true;

    const mode = modeManager.getMode();

    // Load existing data
    const entry = await getDailyEntry(mode, today);
    outcomes = entry?.outcomes?.map((o) => o || '') || ['', '', ''];

    // Resume from saved step
    const state = getFlowState(today, mode);
    if (state && !state.completed && !state.dismissed && typeof state.step === 'number') {
      currentStep = Math.min(state.step, STEPS.length - 1);
    } else {
      currentStep = 0;
    }

    // Load projects for step 2/3
    projects = await getActiveProjects(mode);

    // Check existing pin
    const pinned = await getPinnedProject(mode);
    selectedFocusId = pinned?.id || null;

    overlay.hidden = false;
    requestAnimationFrame(() => {
      overlay.classList.add('morning-flow--visible');
      renderStep();
    });

    overlay.addEventListener('keydown', handleKeydown);
  }

  function close() {
    if (!isOpen) return;
    isOpen = false;
    overlay.classList.remove('morning-flow--visible');
    overlay.removeEventListener('keydown', handleKeydown);
    const hide = () => { overlay.hidden = true; };
    overlay.addEventListener('transitionend', hide, { once: true });
    setTimeout(hide, 350);
  }

  function destroy() {
    close();
    overlay.remove();
  }

  // ── Events ─────────────────────────────────────────────
  backdrop.addEventListener('click', dismiss);
  closeBtn.addEventListener('click', dismiss);

  return {
    el: overlay,
    open,
    close,
    destroy,
    get isOpen() { return isOpen; },
  };
}
