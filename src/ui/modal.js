/* ═══════════════════════════════════════════════════════════════
   Modal — Vanilla JS modal with focus trap

   Usage:
     import { showModal, showConfirm, showPrompt } from './ui/modal.js';

     // Custom modal
     const result = await showModal({
       title: 'Bevestig',
       body: '<p>Weet je het zeker?</p>',
       actions: [
         { label: 'Annuleer', value: false },
         { label: 'Verwijder', value: true, variant: 'danger' },
       ],
     });

     // Quick confirm (replaces window.confirm)
     if (await showConfirm('Item verwijderen?')) { ... }

     // Quick prompt (replaces window.prompt)
     const name = await showPrompt('Nieuwe naam:', 'Huidige naam');
   ═══════════════════════════════════════════════════════════════ */

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Trap focus within a container element.
 * Returns a cleanup function to release the trap.
 */
function createFocusTrap(container) {
  const previouslyFocused = document.activeElement;

  function handleKeyDown(e) {
    if (e.key !== 'Tab') return;

    const focusable = Array.from(container.querySelectorAll(FOCUSABLE));
    if (focusable.length === 0) {
      e.preventDefault();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }

  container.addEventListener('keydown', handleKeyDown);

  // Focus first focusable element
  requestAnimationFrame(() => {
    const focusable = container.querySelectorAll(FOCUSABLE);
    if (focusable.length > 0) focusable[0].focus();
  });

  return function release() {
    container.removeEventListener('keydown', handleKeyDown);
    if (previouslyFocused && previouslyFocused.focus) {
      previouslyFocused.focus();
    }
  };
}

/**
 * Show a modal dialog. Returns a promise that resolves with the chosen action value.
 */
export function showModal({ title = '', body = '', actions = [], className = '' }) {
  return new Promise((resolve) => {
    let resolved = false;
    const escapeHTML = (s) => s.replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[m]);

    // Build HTML
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal ${className}" role="dialog" aria-modal="true" ${title ? `aria-label="${escapeHTML(title)}"` : ''}>
        ${title ? `<div class="modal__header"><h3 class="modal__title">${escapeHTML(title)}</h3></div>` : ''}
        ${body ? `<div class="modal__body">${body}</div>` : ''}
        <div class="modal__actions">
          ${actions.map((a, i) => `
            <button type="button" class="modal__btn ${a.variant === 'danger' ? 'modal__btn--danger' : ''} ${a.variant === 'primary' ? 'modal__btn--primary' : ''}" data-action-idx="${i}">
              ${escapeHTML(a.label)}
            </button>
          `).join('')}
        </div>
      </div>
    `;

    function close(value) {
      if (resolved) return;
      resolved = true;
      overlay.classList.add('modal-overlay--closing');
      releaseTrap();
      setTimeout(() => {
        overlay.remove();
        resolve(value);
      }, 180);
    }

    // Overlay click dismisses (resolves null)
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) close(null);
    });

    // Action buttons
    overlay.querySelectorAll('.modal__btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.actionIdx, 10);
        close(actions[idx]?.value ?? null);
      });
    });

    // Escape key
    function onKeyDown(e) {
      if (e.key === 'Escape') {
        e.preventDefault();
        close(null);
      }
    }
    document.addEventListener('keydown', onKeyDown);

    // Mount + animate
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('modal-overlay--open'));

    // Focus trap
    const dialog = overlay.querySelector('.modal');
    const releaseTrap = createFocusTrap(dialog);

    // Cleanup keydown on close
    const origClose = close;
    const wrappedClose = (value) => {
      document.removeEventListener('keydown', onKeyDown);
      origClose(value);
    };
    // Re-bind
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) wrappedClose(null);
    });
  });
}

/**
 * Confirm dialog — replaces window.confirm().
 * Returns true/false.
 */
export function showConfirm(message, { title = 'Bevestig', confirmLabel = 'OK', cancelLabel = 'Annuleer', danger = false } = {}) {
  return showModal({
    title,
    body: `<p>${message}</p>`,
    actions: [
      { label: cancelLabel, value: false },
      { label: confirmLabel, value: true, variant: danger ? 'danger' : 'primary' },
    ],
  });
}

/**
 * Prompt dialog — replaces window.prompt().
 * Returns the entered string or null if cancelled.
 */
export function showPrompt(message, defaultValue = '', { title = '', placeholder = '' } = {}) {
  return new Promise((resolve) => {
    let resolved = false;
    const escapeHTML = (s) => s.replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[m]);

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal" role="dialog" aria-modal="true" ${title ? `aria-label="${escapeHTML(title)}"` : ''}>
        ${title ? `<div class="modal__header"><h3 class="modal__title">${escapeHTML(title)}</h3></div>` : ''}
        <div class="modal__body">
          <p>${escapeHTML(message)}</p>
          <input type="text" class="modal__input form-input" value="${escapeHTML(defaultValue)}" placeholder="${escapeHTML(placeholder)}" autocomplete="off" />
        </div>
        <div class="modal__actions">
          <button type="button" class="modal__btn" data-action="cancel">Annuleer</button>
          <button type="button" class="modal__btn modal__btn--primary" data-action="confirm">OK</button>
        </div>
      </div>
    `;

    const input = overlay.querySelector('.modal__input');

    function close(value) {
      if (resolved) return;
      resolved = true;
      overlay.classList.add('modal-overlay--closing');
      document.removeEventListener('keydown', onKeyDown);
      releaseTrap();
      setTimeout(() => {
        overlay.remove();
        resolve(value);
      }, 180);
    }

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) close(null);
    });

    overlay.querySelector('[data-action="cancel"]').addEventListener('click', () => close(null));
    overlay.querySelector('[data-action="confirm"]').addEventListener('click', () => close(input.value));

    function onKeyDown(e) {
      if (e.key === 'Escape') {
        e.preventDefault();
        close(null);
      }
    }
    document.addEventListener('keydown', onKeyDown);

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        close(input.value);
      }
    });

    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('modal-overlay--open'));

    const dialog = overlay.querySelector('.modal');
    const releaseTrap = createFocusTrap(dialog);

    // Focus input instead of first button
    requestAnimationFrame(() => {
      input.focus();
      input.select();
    });
  });
}
