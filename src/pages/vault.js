import { getAll, put, remove, getByKey } from '../db.js';
import { icon } from '../icons.js';
import { on, emit } from '../state.js';
import { showToast } from '../toast.js';
import { generateId, escapeHTML, formatDateShort, getToday } from '../utils.js';

const VAULT_KDF_SALT_KEY = 'vault_kdf_salt';
const VAULT_KDF_ITERATIONS_KEY = 'vault_kdf_iterations';
const VAULT_VERIFIER_KEY = 'vault_verifier';
const VAULT_VERIFIER_TEXT = 'vault-verifier-v1';
const DEFAULT_ITERATIONS = 160000;

let vaultKey = null;
let isUnlocked = false;

const viewState = {
  search: '',
  modeFilter: 'all',
};

async function deriveKey(password, salt, iterations = DEFAULT_ITERATIONS) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

async function encryptBytes(key, bytes) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, bytes);
  return {
    iv: bytesToBase64(iv),
    data: bytesToBase64(new Uint8Array(encrypted)),
  };
}

async function decryptBytes(key, encrypted) {
  const iv = base64ToBytes(encrypted.iv);
  const data = base64ToBytes(encrypted.data);
  return crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data);
}

function bytesToBase64(bytes) {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBytes(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function readSettingValue(key) {
  const record = await getByKey('settings', key);
  return record?.value ?? null;
}

async function writeSettingValue(key, value) {
  await put('settings', { key, value });
}

async function getVaultConfig() {
  const saltB64 = await readSettingValue(VAULT_KDF_SALT_KEY);
  const verifier = await readSettingValue(VAULT_VERIFIER_KEY);
  const iterations = Number(await readSettingValue(VAULT_KDF_ITERATIONS_KEY)) || DEFAULT_ITERATIONS;

  return {
    exists: Boolean(saltB64 && verifier),
    salt: saltB64 ? base64ToBytes(saltB64) : null,
    iterations,
    verifier,
  };
}

async function createVaultConfig(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await deriveKey(password, salt, DEFAULT_ITERATIONS);
  const verifierBytes = new TextEncoder().encode(VAULT_VERIFIER_TEXT);
  const verifier = await encryptBytes(key, verifierBytes);

  await writeSettingValue(VAULT_KDF_SALT_KEY, bytesToBase64(salt));
  await writeSettingValue(VAULT_KDF_ITERATIONS_KEY, DEFAULT_ITERATIONS);
  await writeSettingValue(VAULT_VERIFIER_KEY, verifier);

  return { key, salt, iterations: DEFAULT_ITERATIONS };
}

async function unlockVault(password) {
  const config = await getVaultConfig();

  if (!config.exists) {
    return createVaultConfig(password);
  }

  const key = await deriveKey(password, config.salt, config.iterations);
  const decrypted = await decryptBytes(key, config.verifier);
  const text = new TextDecoder().decode(decrypted);
  if (text !== VAULT_VERIFIER_TEXT) {
    throw new Error('Verkeerd wachtwoord');
  }

  return { key, salt: config.salt, iterations: config.iterations };
}

function normalizeText(value) {
  return String(value || '').trim();
}

function parseTags(value) {
  return normalizeText(value)
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function buildSearchText(item) {
  return [
    item.name,
    item.type,
    item.mode,
    item.assignment,
    item.section,
    item.project,
    item.caption,
    ...(item.tags || []),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function fileAccept() {
  return '.png,.jpg,.jpeg,.pdf,.docx,.doc,*/*';
}

function canPreview(type) {
  return type.startsWith('image/') || type === 'application/pdf';
}

export function createPage(container) {
  let unsub;

  async function render() {
    if (!isUnlocked) {
      await renderLockScreen();
      return;
    }

    const items = (await getAll('vault'))
      .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));

    const filtered = items.filter((item) => {
      const byMode = viewState.modeFilter === 'all' || item.mode === viewState.modeFilter;
      const bySearch = !viewState.search || (item.searchText || '').includes(viewState.search.toLowerCase());
      return byMode && bySearch;
    });

    container.innerHTML = `
      <div class="page-header">
        <h2>${icon('lock', 20)} Vault</h2>
        <p>Lokaal versleutelde opslag (AES-GCM + PBKDF2)</p>
      </div>

      <div class="card vault-card">
        <div class="vault-toolbar">
          <button class="btn btn-primary btn-sm" id="vault-upload">${icon('upload', 14)} Upload files</button>
          <button class="btn btn-secondary btn-sm" data-action="lock">${icon('lock', 14)} Vergrendelen</button>
          <input type="file" id="vault-file-input" multiple accept="${fileAccept()}" style="display:none">
        </div>

        <div class="vault-metadata-grid">
          <label class="form-group">
            <span class="form-label">Mode</span>
            <select class="form-select" id="vault-mode">
              <option value="bpv">bpv</option>
              <option value="school">school</option>
              <option value="personal">personal</option>
            </select>
          </label>
          <label class="form-group"><span class="form-label">Assignment (optioneel)</span><input id="vault-assignment" class="form-input" type="text"></label>
          <label class="form-group"><span class="form-label">Section (optioneel)</span><input id="vault-section" class="form-input" type="text"></label>
          <label class="form-group"><span class="form-label">Project (optioneel)</span><input id="vault-project" class="form-input" type="text"></label>
          <label class="form-group vault-full"><span class="form-label">Caption (optioneel)</span><input id="vault-caption" class="form-input" type="text"></label>
          <label class="form-group vault-full"><span class="form-label">Extra tags (comma-separated)</span><input id="vault-tags" class="form-input" type="text" placeholder="bewijs, stage, planning"></label>
        </div>
      </div>

      <div class="card vault-card">
        <div class="vault-toolbar">
          <input type="search" id="vault-search" class="form-input" placeholder="Zoek op naam, type, tags, caption..." value="${escapeHTML(viewState.search)}">
          <select id="vault-mode-filter" class="form-select">
            <option value="all" ${viewState.modeFilter === 'all' ? 'selected' : ''}>Alle modes</option>
            <option value="bpv" ${viewState.modeFilter === 'bpv' ? 'selected' : ''}>bpv</option>
            <option value="school" ${viewState.modeFilter === 'school' ? 'selected' : ''}>school</option>
            <option value="personal" ${viewState.modeFilter === 'personal' ? 'selected' : ''}>personal</option>
          </select>
        </div>

        ${filtered.length === 0 ? `
          <div class="empty-state">
            <div class="empty-state-icon">${icon('lock', 38)}</div>
            <h3>Geen bestanden gevonden</h3>
            <p>Upload png/jpg/pdf/docx of andere bestanden; content wordt encrypted opgeslagen.</p>
          </div>
        ` : `
          <div class="vault-list">
            ${filtered.map((item) => `
              <article class="vault-item">
                <div class="vault-item-main">
                  <h4>${escapeHTML(item.name)}</h4>
                  <p class="vault-meta">${escapeHTML(item.type || 'unknown')} • ${formatFileSize(item.size || 0)} • ${formatDateShort(item.date || getToday())}</p>
                  <p class="vault-meta">mode=${escapeHTML(item.mode || 'bpv')}${item.assignment ? ` • assignment=${escapeHTML(item.assignment)}` : ''}${item.section ? ` • section=${escapeHTML(item.section)}` : ''}${item.project ? ` • project=${escapeHTML(item.project)}` : ''}</p>
                  ${item.caption ? `<p class="vault-caption">${escapeHTML(item.caption)}</p>` : ''}
                  ${(item.tags || []).length ? `<div>${item.tags.map((tag) => `<span class="badge badge-indigo">${escapeHTML(tag)}</span>`).join(' ')}</div>` : ''}
                </div>
                <div class="vault-item-actions">
                  <button class="btn btn-ghost btn-sm" data-action="preview" data-id="${item.id}" ${canPreview(item.type || '') ? '' : 'disabled'}>${icon('image', 14)} Preview</button>
                  <button class="btn btn-ghost btn-sm" data-action="download" data-id="${item.id}">${icon('download', 14)} Download</button>
                  <button class="btn btn-ghost btn-sm" data-action="delete" data-id="${item.id}">${icon('trash', 14)} Delete</button>
                </div>
              </article>
            `).join('')}
          </div>
        `}
      </div>

      <div id="vault-preview-modal" style="display:none"></div>
    `;

    bindEvents();
  }

  async function renderLockScreen() {
    const config = await getVaultConfig();

    container.innerHTML = `
      <div class="page-header">
        <h2>${icon('lock', 20)} Vault</h2>
        <p>Versleuteld met AES-GCM, sleutel via PBKDF2 + salt</p>
      </div>

      <div class="card vault-lock-card">
        <div class="vault-lock-icon">${icon('lock', 44)}</div>
        <h3>${config.exists ? 'Ontgrendel Vault' : 'Stel Vault wachtwoord in'}</h3>
        <form id="vault-unlock-form">
          <div class="form-group">
            <label class="form-label" for="vault-password">Wachtwoord</label>
            <input type="password" id="vault-password" class="form-input" required autocomplete="off" minlength="6">
          </div>
          ${config.exists ? '' : `
            <div class="form-group">
              <label class="form-label" for="vault-password-confirm">Bevestig wachtwoord</label>
              <input type="password" id="vault-password-confirm" class="form-input" required autocomplete="off" minlength="6">
            </div>
          `}
          <button type="submit" class="btn btn-primary" style="width:100%">${icon('lock', 16)} ${config.exists ? 'Ontgrendelen' : 'Vault aanmaken'}</button>
        </form>
        <p class="vault-lock-note">Zonder correct wachtwoord zijn bestanden niet te ontsleutelen.</p>
      </div>
    `;

    container.querySelector('#vault-unlock-form')?.addEventListener('submit', async (event) => {
      event.preventDefault();
      const password = normalizeText(container.querySelector('#vault-password')?.value);
      const confirm = normalizeText(container.querySelector('#vault-password-confirm')?.value);
      if (!password) return;
      if (!config.exists && password !== confirm) {
        showToast('Wachtwoorden komen niet overeen', { type: 'warning' });
        return;
      }

      try {
        const unlocked = await unlockVault(password);
        vaultKey = unlocked.key;
        isUnlocked = true;
        showToast(config.exists ? 'Vault ontgrendeld' : 'Vault ingesteld en ontgrendeld', { type: 'success' });
        render();
      } catch {
        showToast('Verkeerd wachtwoord', { type: 'error' });
      }
    });
  }

  function bindEvents() {
    container.querySelector('[data-action="lock"]')?.addEventListener('click', () => {
      vaultKey = null;
      isUnlocked = false;
      render();
    });

    container.querySelector('#vault-search')?.addEventListener('input', (event) => {
      viewState.search = event.target.value || '';
      render();
    });

    container.querySelector('#vault-mode-filter')?.addEventListener('change', (event) => {
      viewState.modeFilter = event.target.value || 'all';
      render();
    });

    container.querySelector('#vault-upload')?.addEventListener('click', () => {
      container.querySelector('#vault-file-input')?.click();
    });

    container.querySelector('#vault-file-input')?.addEventListener('change', async (event) => {
      const files = event.target.files;
      if (!files || !vaultKey) return;

      const mode = container.querySelector('#vault-mode')?.value || 'bpv';
      const assignment = normalizeText(container.querySelector('#vault-assignment')?.value);
      const section = normalizeText(container.querySelector('#vault-section')?.value);
      const project = normalizeText(container.querySelector('#vault-project')?.value);
      const caption = normalizeText(container.querySelector('#vault-caption')?.value);
      const tags = parseTags(container.querySelector('#vault-tags')?.value);

      for (const file of files) {
        try {
          const bytes = new Uint8Array(await file.arrayBuffer());
          const encrypted = await encryptBytes(vaultKey, bytes);

          const meta = {
            id: generateId(),
            name: file.name,
            type: file.type || 'application/octet-stream',
            size: file.size,
            date: getToday(),
            mode,
            assignment,
            section,
            project,
            caption,
            tags,
            createdAt: new Date().toISOString(),
          };
          meta.searchText = buildSearchText(meta);

          await put('vault', meta);
          await put('vaultFiles', {
            id: meta.id,
            encrypted,
            encryption: {
              algorithm: 'AES-GCM',
              kdf: 'PBKDF2',
              iterations: Number(await readSettingValue(VAULT_KDF_ITERATIONS_KEY)) || DEFAULT_ITERATIONS,
            },
          });
        } catch {
          showToast(`Upload mislukt: ${file.name}`, { type: 'error' });
        }
      }

      event.target.value = '';
      emit('vault:updated');
      showToast('Bestanden encrypted opgeslagen', { type: 'success' });
      render();
    });

    container.querySelectorAll('[data-action="delete"]').forEach((button) => {
      button.addEventListener('click', async () => {
        const id = button.dataset.id;
        await remove('vault', id);
        await remove('vaultFiles', id);
        emit('vault:updated');
        showToast('Bestand verwijderd', { type: 'info' });
        render();
      });
    });

    container.querySelectorAll('[data-action="preview"]').forEach((button) => {
      button.addEventListener('click', async () => {
        await previewFile(button.dataset.id);
      });
    });

    container.querySelectorAll('[data-action="download"]').forEach((button) => {
      button.addEventListener('click', async () => {
        await downloadFile(button.dataset.id);
      });
    });
  }

  async function decryptToBlob(id) {
    const meta = await getByKey('vault', id);
    const fileData = await getByKey('vaultFiles', id);
    if (!meta || !fileData || !vaultKey) return null;

    const decrypted = await decryptBytes(vaultKey, fileData.encrypted);
    return {
      meta,
      blob: new Blob([decrypted], { type: meta.type || 'application/octet-stream' }),
    };
  }

  async function previewFile(id) {
    try {
      const decrypted = await decryptToBlob(id);
      if (!decrypted) return;
      const { meta, blob } = decrypted;
      const url = URL.createObjectURL(blob);

      const modal = container.querySelector('#vault-preview-modal');
      if (!modal) return;

      const body = meta.type.startsWith('image/')
        ? `<img src="${url}" class="vault-preview-image">`
        : `<iframe src="${url}" class="vault-preview-pdf" title="${escapeHTML(meta.name)}"></iframe>`;

      modal.innerHTML = `
        <div class="modal-overlay" style="display:flex">
          <div class="modal vault-preview-modal">
            <div class="vault-preview-header">
              <h3>${escapeHTML(meta.name)}</h3>
              <button class="btn btn-icon btn-ghost close-preview">${icon('x')}</button>
            </div>
            ${body}
          </div>
        </div>
      `;
      modal.style.display = 'block';

      const close = () => {
        URL.revokeObjectURL(url);
        modal.style.display = 'none';
        modal.innerHTML = '';
      };

      modal.querySelector('.close-preview')?.addEventListener('click', close);
      modal.querySelector('.modal-overlay')?.addEventListener('click', (event) => {
        if (event.target.classList.contains('modal-overlay')) close();
      });
    } catch {
      showToast('Preview mislukt', { type: 'error' });
    }
  }

  async function downloadFile(id) {
    try {
      const decrypted = await decryptToBlob(id);
      if (!decrypted) return;
      const { meta, blob } = decrypted;
      const url = URL.createObjectURL(blob);

      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = meta.name;
      anchor.click();
      URL.revokeObjectURL(url);
      showToast('Bestand klaar voor openen/download', { type: 'success' });
    } catch {
      showToast('Download mislukt', { type: 'error' });
    }
  }

  render();
  unsub = on('vault:updated', render);

  return {
    destroy() {
      if (unsub) unsub();
    },
  };
}

function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
