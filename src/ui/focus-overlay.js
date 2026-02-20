import { getTasksForToday } from '../stores/tasks.js';
import { escapeHTML } from '../utils.js';

const MAX_ACTIONS = 3;
const AUTO_DISMISS_MS = 8000;

/**
 * createFocusOverlay — post-switch ambient prompt showing max 3 next actions
 * for the newly selected mode.  Fades in over 300ms, auto-dismisses after 8s.
 * Returns { el, showFor(mode, modeMeta), hide(), destroy() }.
 */
export function createFocusOverlay() {
  let dismissTimer = null;
  let keyHandler = null;

  const overlay = document.createElement('div');
  overlay.className = 'focus-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', 'Volgende acties');
  overlay.hidden = true;
  overlay.style.pointerEvents = 'none';

  overlay.innerHTML = `
    <div class="focus-overlay__panel">
      <p class="focus-overlay__eyebrow">Volgende acties</p>
      <ul class="focus-overlay__list" aria-label="Taken"></ul>
      <button type="button" class="focus-overlay__skip">Overslaan</button>
    </div>
  `;

  function hide() {
    clearTimeout(dismissTimer);
    dismissTimer = null;
    if (keyHandler) {
      document.removeEventListener('keydown', keyHandler);
      keyHandler = null;
    }
    overlay.classList.remove('focus-overlay--visible');
    overlay.style.pointerEvents = 'none';
    // Wait for CSS transition, then set hidden for DOM cleanup
    const onEnd = () => { overlay.hidden = true; };
    overlay.addEventListener('transitionend', onEnd, { once: true });
    setTimeout(onEnd, 400); // fallback if transition doesn't fire
  }

  overlay.querySelector('.focus-overlay__skip').addEventListener('click', hide);

  // Clicking the backdrop (outside the panel) also dismisses
  overlay.addEventListener('click', (e) => {
    if (!e.target.closest('.focus-overlay__panel')) hide();
  });

  async function showFor(mode, modeMeta) {
    // Don't stack overlays
    if (overlay.classList.contains('focus-overlay--visible')) hide();

    let pending = [];
    try {
      const all = await getTasksForToday(mode);
      pending = all.filter((t) => t.status !== 'done').slice(0, MAX_ACTIONS);
    } catch { /* non-critical — show nothing */ }

    // Nothing pending → no overlay needed
    if (pending.length === 0) return;

    const list = overlay.querySelector('.focus-overlay__list');
    list.innerHTML = pending
      .map(
        (t) => `
          <li>
            <button type="button" class="focus-overlay__action-item" data-id="${t.id}">
              <span class="focus-overlay__action-dot" style="background:${modeMeta.color}"></span>
              <span class="focus-overlay__action-text">${escapeHTML(t.text)}</span>
            </button>
          </li>
        `,
      )
      .join('');

    // Tapping a task just dismisses the overlay (focus context is set)
    list.querySelectorAll('.focus-overlay__action-item').forEach((btn) => {
      btn.addEventListener('click', hide);
    });

    overlay.hidden = false;
    // Next frame so the initial state is rendered before adding --visible
    requestAnimationFrame(() => {
      overlay.style.pointerEvents = 'auto';
      overlay.classList.add('focus-overlay--visible');
    });

    dismissTimer = setTimeout(hide, AUTO_DISMISS_MS);

    keyHandler = (e) => {
      if (e.key === 'Escape') hide();
    };
    document.addEventListener('keydown', keyHandler);
  }

  function destroy() {
    clearTimeout(dismissTimer);
    if (keyHandler) document.removeEventListener('keydown', keyHandler);
    overlay.remove();
  }

  return { el: overlay, showFor, hide, destroy };
}
