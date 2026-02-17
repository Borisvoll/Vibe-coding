import { APP_VERSION } from '../version.js';
import { DB_NAME, DB_VERSION } from '../db.js';

export function createPage(container) {
  async function render() {
    const originUrl = window.location.origin;
    const swSupported = 'serviceWorker' in navigator;
    const controlling = swSupported && Boolean(navigator.serviceWorker.controller);
    const registration = swSupported ? await navigator.serviceWorker.getRegistration().catch(() => null) : null;
    const registered = Boolean(registration);
    const waiting = Boolean(registration?.waiting);

    container.innerHTML = `
      <div class="page-header"><h2>Diagnostiek</h2></div>
      <div class="card settings-section">
        <div class="settings-row">
          <div><div class="settings-label">App version</div><div class="settings-desc">${APP_VERSION}</div></div>
        </div>
        <div class="settings-row">
          <div><div class="settings-label">Service worker</div><div class="settings-desc">${registered ? 'registered' : 'not registered'}</div></div>
        </div>
        <div class="settings-row">
          <div><div class="settings-label">Controlling</div><div class="settings-desc">${controlling ? 'yes' : 'no'}</div></div>
        </div>
        <div class="settings-row">
          <div><div class="settings-label">Waiting</div><div class="settings-desc">${waiting ? 'yes' : 'no'}</div></div>
        </div>
        <div class="settings-row">
          <div><div class="settings-label">Origin URL</div><div class="settings-desc">${originUrl}</div></div>
        </div>
        <div class="settings-row">
          <div><div class="settings-label">IndexedDB</div><div class="settings-desc">${DB_NAME} (v${DB_VERSION})</div></div>
        </div>
      </div>
    `;
  }

  render();
  return { destroy() {} };
}
