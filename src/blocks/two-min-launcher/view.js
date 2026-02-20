import { escapeHTML } from '../../utils.js';

const ACTIVITIES = [
  { id: 'opruimen', label: 'Opruimen', emoji: '🧹' },
  { id: 'mail',     label: 'Mail',     emoji: '📧' },
  { id: 'logboek',  label: 'Logboek',  emoji: '📝' },
  { id: 'leren',    label: 'Leren',    emoji: '📖' },
  { id: 'bewegen',  label: 'Bewegen',  emoji: '🏃' },
  { id: 'admin',    label: 'Admin',    emoji: '📋' },
];

export function renderTwoMinLauncher(container, context) {
  let timerId = null;
  let activeBtn = null;

  const wrapper = document.createElement('article');
  wrapper.className = 'two-min-launcher os-mini-card';
  wrapper.innerHTML = `
    <div class="two-min-launcher__header">
      <h3 class="two-min-launcher__title">2 minuten</h3>
      <span class="two-min-launcher__hint">Kies iets — je hoeft maar 2 minuten</span>
    </div>
    <div class="two-min-launcher__grid">
      ${ACTIVITIES.map(a => `
        <button type="button" class="two-min-launcher__btn" data-activity="${escapeHTML(a.id)}">
          <span class="two-min-launcher__emoji">${a.emoji}</span>
          <span class="two-min-launcher__label">${escapeHTML(a.label)}</span>
          <span class="two-min-launcher__timer" hidden>2:00</span>
        </button>
      `).join('')}
    </div>
  `;

  function startTimer(btn) {
    if (timerId) stopTimer();
    activeBtn = btn;
    let seconds = 120;
    const timerEl = btn.querySelector('.two-min-launcher__timer');
    const labelEl = btn.querySelector('.two-min-launcher__label');
    const emojiEl = btn.querySelector('.two-min-launcher__emoji');

    btn.classList.add('two-min-launcher__btn--active');
    timerEl.hidden = false;
    emojiEl.hidden = true;
    labelEl.hidden = true;

    function tick() {
      const m = Math.floor(seconds / 60);
      const s = seconds % 60;
      timerEl.textContent = `${m}:${String(s).padStart(2, '0')}`;

      if (seconds <= 0) {
        stopTimer();
        btn.classList.remove('two-min-launcher__btn--active');
        btn.classList.add('two-min-launcher__btn--done');
        timerEl.textContent = '✓';
        setTimeout(() => {
          btn.classList.remove('two-min-launcher__btn--done');
          timerEl.hidden = true;
          emojiEl.hidden = false;
          labelEl.hidden = false;
        }, 3000);
        return;
      }
      seconds--;
    }

    tick();
    timerId = setInterval(tick, 1000);
  }

  function stopTimer() {
    if (timerId) {
      clearInterval(timerId);
      timerId = null;
    }
    if (activeBtn) {
      activeBtn.classList.remove('two-min-launcher__btn--active');
      const timerEl = activeBtn.querySelector('.two-min-launcher__timer');
      const labelEl = activeBtn.querySelector('.two-min-launcher__label');
      const emojiEl = activeBtn.querySelector('.two-min-launcher__emoji');
      if (timerEl) timerEl.hidden = true;
      if (labelEl) labelEl.hidden = false;
      if (emojiEl) emojiEl.hidden = false;
      activeBtn = null;
    }
  }

  wrapper.querySelectorAll('.two-min-launcher__btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.classList.contains('two-min-launcher__btn--active')) {
        stopTimer();
      } else {
        startTimer(btn);
      }
    });
  });

  container.appendChild(wrapper);

  return {
    unmount() {
      stopTimer();
      wrapper.remove();
    },
  };
}
