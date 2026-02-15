/**
 * Show a toast notification
 * @param {string} message
 * @param {Object} options
 * @param {'info'|'success'|'error'|'warning'} options.type
 * @param {number} options.duration - ms before auto-dismiss
 * @param {{ label: string, onClick: Function }|null} options.action
 */
export function showToast(message, { type = 'info', duration = 3000, action = null } = {}) {
  const area = document.getElementById('toast-area');
  if (!area) return;

  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.innerHTML = `
    <span>${message}</span>
    ${action ? `<button class="toast-action">${action.label}</button>` : ''}
  `;

  if (action) {
    el.querySelector('.toast-action').addEventListener('click', () => {
      action.onClick();
      dismiss();
    });
  }

  area.appendChild(el);

  let timer = setTimeout(dismiss, duration);

  function dismiss() {
    clearTimeout(timer);
    el.classList.add('toast-out');
    el.addEventListener('animationend', () => el.remove());
  }
}
