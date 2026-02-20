import { escapeHTML, generateId, getToday } from '../../utils.js';
import { put } from '../../db.js';

export function renderWorryDump(container, context) {
  const { eventBus, modeManager } = context;

  const wrapper = document.createElement('article');
  wrapper.className = 'worry-dump os-mini-card';

  let step = 'input'; // 'input' | 'triage' | 'done'
  let currentWorry = '';

  function render() {
    if (step === 'input') {
      wrapper.innerHTML = `
        <h3 class="worry-dump__title">Zorgendump</h3>
        <p class="worry-dump__hint">Waar maak je je zorgen over?</p>
        <form class="worry-dump__form">
          <textarea class="worry-dump__textarea" rows="2" maxlength="280" placeholder="Typ je zorg..."></textarea>
          <button type="submit" class="worry-dump__submit">Dumpen</button>
        </form>
      `;

      const form = wrapper.querySelector('.worry-dump__form');
      const textarea = wrapper.querySelector('.worry-dump__textarea');

      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const text = textarea.value.trim();
        if (!text) return;
        currentWorry = text;
        step = 'triage';
        render();
      });
    } else if (step === 'triage') {
      wrapper.innerHTML = `
        <h3 class="worry-dump__title">Triage</h3>
        <p class="worry-dump__worry">"${escapeHTML(currentWorry)}"</p>
        <p class="worry-dump__question">Is dit vandaag oplosbaar?</p>
        <div class="worry-dump__choices">
          <button type="button" class="worry-dump__choice worry-dump__choice--yes" data-choice="yes">
            Ja → maak microstap
          </button>
          <button type="button" class="worry-dump__choice worry-dump__choice--no" data-choice="no">
            Nee → parkeren
          </button>
        </div>
      `;

      wrapper.querySelector('[data-choice="yes"]').addEventListener('click', async () => {
        // Create a microstep task
        const now = new Date().toISOString();
        const mode = modeManager?.getMode() || 'Personal';
        await put('os_tasks', {
          id: generateId(),
          text: currentWorry,
          mode,
          status: 'todo',
          priority: 1,
          date: getToday(),
          doneAt: null,
          createdAt: now,
          updated_at: now,
        });
        eventBus?.emit('tasks:changed');
        step = 'done';
        render();
      });

      wrapper.querySelector('[data-choice="no"]').addEventListener('click', async () => {
        // Park as inbox item with worry type
        const now = new Date().toISOString();
        await put('os_inbox', {
          id: generateId(),
          text: currentWorry,
          type: 'worry',
          mode: null,
          url: null,
          status: 'inbox',
          promotedTo: null,
          createdAt: now,
          updated_at: now,
        });
        eventBus?.emit('inbox:changed');
        step = 'done';
        render();
      });
    } else {
      wrapper.innerHTML = `
        <div class="worry-dump__done">
          <span class="worry-dump__done-check">✓</span>
          <p class="worry-dump__done-text">Verwerkt. Laat het even los.</p>
          <button type="button" class="worry-dump__reset">Nog een zorg?</button>
        </div>
      `;

      wrapper.querySelector('.worry-dump__reset').addEventListener('click', () => {
        step = 'input';
        currentWorry = '';
        render();
      });
    }
  }

  render();
  container.appendChild(wrapper);

  return {
    unmount() {
      wrapper.remove();
    },
  };
}
