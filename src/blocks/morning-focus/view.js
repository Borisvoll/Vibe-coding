import { getDailyEntry } from '../../stores/daily.js';
import { getPinnedProject } from '../../stores/projects.js';
import { getByKey } from '../../db.js';
import { getToday, escapeHTML } from '../../utils.js';
import { getFlowState } from '../../ui/morning-flow.js';

const MODE_ACCENT = {
  School:   { color: 'var(--color-purple)',  light: 'var(--color-purple-light)' },
  Personal: { color: 'var(--color-emerald)', light: 'var(--color-emerald-light)' },
  BPV:      { color: 'var(--color-blue)',    light: 'var(--color-blue-light)' },
};

export function renderMorningFocus(container, context) {
  const mountId = crypto.randomUUID();
  const { eventBus, modeManager } = context;
  const today = getToday();

  container.insertAdjacentHTML('beforeend', `
    <div class="morning-focus" data-mount-id="${mountId}"></div>
  `);

  const el = container.querySelector(`[data-mount-id="${mountId}"]`);

  async function render() {
    const mode = modeManager.getMode();
    const state = getFlowState(today, mode);

    // Only show if flow completed today
    if (!state?.completed) {
      el.hidden = true;
      el.innerHTML = '';
      return;
    }

    el.hidden = false;
    const meta = MODE_ACCENT[mode] || MODE_ACCENT.School;
    const entry = await getDailyEntry(mode, today);
    const outcomes = (entry?.outcomes || []).filter((o) => o.trim());

    // Focus project
    const pinned = await getPinnedProject(mode);
    let focusHtml = '';
    if (pinned) {
      let nextText = '';
      if (pinned.nextActionId) {
        const task = await getByKey('os_tasks', pinned.nextActionId);
        if (task) nextText = task.text;
      }
      focusHtml = `
        <div class="morning-focus__project">
          <span class="morning-focus__project-label">Focus</span>
          <span class="morning-focus__project-title">${escapeHTML(pinned.title)}</span>
          ${nextText ? `<span class="morning-focus__project-action">→ ${escapeHTML(nextText)}</span>` : ''}
        </div>
      `;
    }

    el.innerHTML = `
      <div class="morning-focus__card" style="--focus-color:${meta.color};--focus-light:${meta.light}">
        <div class="morning-focus__header">
          <span class="morning-focus__check">✓</span>
          <span class="morning-focus__label">Ochtendplan klaar</span>
        </div>
        ${outcomes.length > 0 ? `
          <div class="morning-focus__outcomes">
            ${outcomes.map((o, i) => `
              <div class="morning-focus__outcome">
                <span class="morning-focus__num" style="color:${meta.color}">${i + 1}</span>
                <span>${escapeHTML(o)}</span>
              </div>
            `).join('')}
          </div>
        ` : ''}
        ${focusHtml}
      </div>
    `;
  }

  const unsubs = [
    eventBus.on('mode:changed', () => render()),
    eventBus.on('daily:changed', () => render()),
    eventBus.on('projects:changed', () => render()),
    eventBus.on('morning:completed', () => render()),
  ];

  render();

  return {
    unmount() {
      unsubs.forEach((u) => u?.());
      el?.remove();
    },
  };
}
