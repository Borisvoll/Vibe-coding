import { getAll, put, remove, getByKey } from '../db.js';
import { icon } from '../icons.js';
import { on, emit } from '../state.js';
import { showToast } from '../toast.js';
import { generateId, escapeHTML, formatDateShort, getToday } from '../utils.js';

let vaultKey = null; // Derived CryptoKey, kept in memory only
let isUnlocked = false;

async function deriveKey(password, salt) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

async function encryptBlob(key, data) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, data);
  return { iv: Array.from(iv), data: new Uint8Array(encrypted) };
}

async function decryptBlob(key, iv, data) {
  const ivArr = new Uint8Array(iv);
  return crypto.subtle.decrypt({ name: 'AES-GCM', iv: ivArr }, key, data);
}

function bufToBase64(buf) {
  const bytes = new Uint8Array(buf);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function base64ToBuf(b64) {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export function createPage(container) {
  let unsub;

  async function render() {
    if (!isUnlocked) {
      renderLockScreen();
      return;
    }

    const items = (await getAll('vault')).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

    container.innerHTML = `
      <div class="page-header">
        <h2>${icon('lock', 20)} Vault</h2>
        <p>Versleutelde opslag — alleen in dit apparaat</p>
      </div>

      <div style="display:flex; gap:var(--space-3); margin-bottom:var(--space-6); flex-wrap:wrap">
        <button class="btn btn-primary btn-sm" id="vault-upload">${icon('upload', 14)} Bestand uploaden</button>
        <button class="btn btn-secondary btn-sm" data-action="lock">${icon('lock', 14)} Vergrendelen</button>
        <input type="file" id="vault-file-input" multiple style="display:none">
      </div>

      ${items.length === 0 ? `
        <div class="empty-state">
          <div class="empty-state-icon">${icon('lock', 48)}</div>
          <h3>Vault is leeg</h3>
          <p>Upload bestanden. Ze worden AES-256 versleuteld opgeslagen.</p>
        </div>
      ` : `
        <div style="display:flex; flex-direction:column; gap:var(--space-3)">
          ${items.map(item => `
            <div class="card" style="border-left: 3px solid var(--color-indigo)">
              <div style="display:flex; justify-content:space-between; align-items:flex-start">
                <div>
                  <h4>${escapeHTML(item.name)}</h4>
                  <span style="font-size:0.8125rem; color:var(--color-text-secondary)">${formatDateShort(item.date || getToday())} — ${formatFileSize(item.size || 0)}</span>
                  ${(item.tags || []).length > 0 ? `
                    <div style="margin-top:var(--space-1)">${item.tags.map(t => `<span class="badge badge-indigo">${t}</span>`).join(' ')}</div>
                  ` : ''}
                </div>
                <div style="display:flex; gap:var(--space-2)">
                  <button class="btn btn-ghost btn-sm" data-action="preview" data-id="${item.id}" title="Bekijken">${icon('image', 14)}</button>
                  <button class="btn btn-ghost btn-sm" data-action="download" data-id="${item.id}" title="Downloaden">${icon('download', 14)}</button>
                  <button class="btn btn-ghost btn-sm" data-action="delete" data-id="${item.id}" title="Verwijderen">${icon('trash', 14)}</button>
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      `}

      <div id="vault-preview-modal" style="display:none"></div>
    `;

    bindEvents();
  }

  function renderLockScreen() {
    container.innerHTML = `
      <div class="page-header">
        <h2>${icon('lock', 20)} Vault</h2>
        <p>Versleutelde opslag</p>
      </div>

      <div class="card" style="max-width:400px; margin: var(--space-8) auto; text-align:center">
        <div style="margin-bottom:var(--space-6)">${icon('lock', 48)}</div>
        <h3 style="margin-bottom:var(--space-4)">Vault ontgrendelen</h3>
        <form id="vault-unlock-form">
          <div class="form-group">
            <label class="form-label" for="vault-password">Wachtwoord</label>
            <input type="password" id="vault-password" class="form-input" placeholder="Voer wachtwoord in..." required autocomplete="off">
          </div>
          <button type="submit" class="btn btn-primary" style="width:100%">${icon('lock', 16)} Ontgrendelen</button>
        </form>
        <p style="font-size:0.75rem; color:var(--color-text-tertiary); margin-top:var(--space-4)">
          Eerste keer? Kies een wachtwoord. Dit wordt je vault wachtwoord.
        </p>
      </div>
    `;

    container.querySelector('#vault-unlock-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const password = document.getElementById('vault-password').value;
      if (!password) return;

      try {
        // Check if we have a salt stored
        const stored = await getByKey('settings', 'vault_salt');
        let salt;
        if (stored && stored.value) {
          salt = base64ToBuf(stored.value);
        } else {
          salt = crypto.getRandomValues(new Uint8Array(16));
          await put('settings', { key: 'vault_salt', value: bufToBase64(salt) });
        }

        vaultKey = await deriveKey(password, salt);

        // Verify by trying to read existing vault items
        const items = await getAll('vault');
        if (items.length > 0) {
          // Try to verify with the first item
          const firstFile = await getByKey('vaultFiles', items[0].id);
          if (firstFile && firstFile.encrypted) {
            try {
              await decryptBlob(vaultKey, firstFile.encrypted.iv, firstFile.encrypted.data);
            } catch {
              vaultKey = null;
              showToast('Verkeerd wachtwoord', { type: 'error' });
              return;
            }
          }
        }

        isUnlocked = true;
        showToast('Vault ontgrendeld', { type: 'success' });
        render();
      } catch (err) {
        showToast('Fout bij ontgrendelen', { type: 'error' });
      }
    });
  }

  function bindEvents() {
    container.querySelector('[data-action="lock"]')?.addEventListener('click', () => {
      vaultKey = null;
      isUnlocked = false;
      showToast('Vault vergrendeld', { type: 'info' });
      render();
    });

    container.querySelector('#vault-upload')?.addEventListener('click', () => {
      container.querySelector('#vault-file-input')?.click();
    });

    container.querySelector('#vault-file-input')?.addEventListener('change', async (e) => {
      const files = e.target.files;
      if (!files || !vaultKey) return;

      for (const file of files) {
        try {
          const buffer = await file.arrayBuffer();
          const encrypted = await encryptBlob(vaultKey, buffer);

          const meta = {
            id: generateId(),
            name: file.name,
            type: file.type,
            size: file.size,
            date: getToday(),
            tags: [],
            createdAt: new Date().toISOString()
          };

          await put('vault', meta);
          await put('vaultFiles', { id: meta.id, encrypted });

          showToast(`${file.name} versleuteld opgeslagen`, { type: 'success' });
        } catch (err) {
          showToast(`Fout bij uploaden: ${file.name}`, { type: 'error' });
        }
      }
      emit('vault:updated');
      render();
    });

    container.querySelectorAll('[data-action="delete"]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        await remove('vault', id);
        await remove('vaultFiles', id);
        emit('vault:updated');
        showToast('Bestand verwijderd', { type: 'info' });
        render();
      });
    });

    container.querySelectorAll('[data-action="preview"]').forEach(btn => {
      btn.addEventListener('click', async () => {
        await previewFile(btn.dataset.id);
      });
    });

    container.querySelectorAll('[data-action="download"]').forEach(btn => {
      btn.addEventListener('click', async () => {
        await downloadFile(btn.dataset.id);
      });
    });
  }

  async function previewFile(id) {
    if (!vaultKey) return;
    try {
      const meta = await getByKey('vault', id);
      const fileData = await getByKey('vaultFiles', id);
      if (!meta || !fileData) return;

      const decrypted = await decryptBlob(vaultKey, fileData.encrypted.iv, fileData.encrypted.data);
      const blob = new Blob([decrypted], { type: meta.type });
      const url = URL.createObjectURL(blob);

      const modal = container.querySelector('#vault-preview-modal');
      if (!modal) return;

      if (meta.type.startsWith('image/')) {
        modal.innerHTML = `
          <div class="modal-overlay" style="display:flex">
            <div class="modal" style="max-width:90vw">
              <div style="display:flex; justify-content:space-between; margin-bottom:var(--space-4)">
                <h3>${escapeHTML(meta.name)}</h3>
                <button class="btn btn-icon btn-ghost close-preview">${icon('x')}</button>
              </div>
              <img src="${url}" style="max-width:100%; max-height:70vh; object-fit:contain; border-radius:var(--radius-md)">
            </div>
          </div>
        `;
      } else {
        modal.innerHTML = `
          <div class="modal-overlay" style="display:flex">
            <div class="modal">
              <div style="display:flex; justify-content:space-between; margin-bottom:var(--space-4)">
                <h3>${escapeHTML(meta.name)}</h3>
                <button class="btn btn-icon btn-ghost close-preview">${icon('x')}</button>
              </div>
              <p>Preview niet beschikbaar voor dit bestandstype. Gebruik download.</p>
            </div>
          </div>
        `;
      }

      modal.style.display = 'block';
      modal.querySelector('.close-preview')?.addEventListener('click', () => {
        URL.revokeObjectURL(url);
        modal.style.display = 'none';
        modal.innerHTML = '';
      });
      modal.querySelector('.modal-overlay')?.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal-overlay')) {
          URL.revokeObjectURL(url);
          modal.style.display = 'none';
          modal.innerHTML = '';
        }
      });
    } catch {
      showToast('Kan bestand niet openen', { type: 'error' });
    }
  }

  async function downloadFile(id) {
    if (!vaultKey) return;
    try {
      const meta = await getByKey('vault', id);
      const fileData = await getByKey('vaultFiles', id);
      if (!meta || !fileData) return;

      const decrypted = await decryptBlob(vaultKey, fileData.encrypted.iv, fileData.encrypted.data);
      const blob = new Blob([decrypted], { type: meta.type });
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = meta.name;
      a.click();
      URL.revokeObjectURL(url);
      showToast('Bestand gedownload', { type: 'success' });
    } catch {
      showToast('Kan bestand niet downloaden', { type: 'error' });
    }
  }

  function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  }

  render();
  unsub = on('vault:updated', render);
  return {
    destroy() {
      if (unsub) unsub();
      // Don't clear vaultKey on page navigation, only on explicit lock
    }
  };
}
