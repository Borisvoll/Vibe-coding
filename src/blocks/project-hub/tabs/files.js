import { addFile, removeFile } from '../../../stores/projects.js';
import { escapeHTML } from '../../../utils.js';

const MAX_MB = 15;

/**
 * Files tab — file attachments (vault-links). Cover moved to Banner tab.
 */
export function renderFilesTab(host, project, context) {
  const { eventBus } = context;

  function render() {
    const files = project.files || [];
    host.innerHTML = `
      <div class="hub-files">
        <section class="hub-files__attachments-section">
          <h4 class="hub-files__section-title">Bijlagen</h4>
          ${files.length === 0 ? `<p class="hub-files__empty">Geen bestanden bijgevoegd.</p>` : ''}
          <ul class="hub-files__list">
            ${files.map((f) => `
              <li class="hub-files__item" data-file-id="${f.id}">
                <span class="hub-files__file-icon">${fileIcon(f.type)}</span>
                <span class="hub-files__file-name">${escapeHTML(f.name)}</span>
                <span class="hub-files__file-size">${formatSize(f.size)}</span>
                <a href="${f.dataUrl}" download="${escapeHTML(f.name)}" class="btn btn-ghost btn-sm">Download</a>
                <button type="button" class="btn btn-danger btn-sm" data-remove-file="${f.id}">\u00d7</button>
              </li>
            `).join('')}
          </ul>
          <label class="hub-files__upload-label">
            <input type="file" class="hub-files__upload-input" data-file-upload hidden multiple />
            <span class="btn btn-ghost btn-sm">+ Bestand toevoegen</span>
          </label>
          <div class="hub-files__upload-status" data-file-status hidden></div>
        </section>
      </div>
    `;

    bindEvents();
  }

  function bindEvents() {
    host.querySelector('[data-file-upload]')?.addEventListener('change', async (e) => {
      const files = Array.from(e.target.files || []);
      const statusEl = host.querySelector('[data-file-status]');
      for (const file of files) {
        await handleFileUpload(file, statusEl);
      }
    });

    host.querySelectorAll('[data-remove-file]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const fileId = btn.dataset.removeFile;
        await removeFile(project.id, fileId);
        project.files = (project.files || []).filter((f) => f.id !== fileId);
        eventBus.emit('projects:changed');
        render();
      });
    });
  }

  async function handleFileUpload(file, statusEl) {
    const sizeMB = file.size / (1024 * 1024);

    if (sizeMB > MAX_MB) {
      if (statusEl) {
        statusEl.hidden = false;
        statusEl.textContent = `${file.name}: te groot (${sizeMB.toFixed(1)} MB). Maximum ${MAX_MB} MB.`;
        statusEl.className = 'hub-files__upload-status hub-files__upload-status--error';
      }
      return;
    }

    try {
      const dataUrl = await readFileAsDataURL(file);
      const entry = {
        id: crypto.randomUUID(),
        name: file.name,
        size: file.size,
        type: file.type,
        dataUrl,
      };
      await addFile(project.id, entry);
      if (!project.files) project.files = [];
      project.files.push(entry);
      if (statusEl) statusEl.hidden = true;
      eventBus.emit('projects:changed');
      render();
    } catch (err) {
      if (statusEl) {
        statusEl.hidden = false;
        statusEl.textContent = `Fout bij ${file.name}: ${err.message}`;
        statusEl.className = 'hub-files__upload-status hub-files__upload-status--error';
      }
    }
  }

  render();

  return {
    unmount() { host.innerHTML = ''; },
  };
}

// ── Helpers ──────────────────────────────────────────────────

function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = () => reject(new Error('Kan bestand niet lezen'));
    reader.readAsDataURL(file);
  });
}

function fileIcon(type) {
  if (!type) return '\u{1F4C4}';
  if (type.startsWith('image/')) return '\u{1F5BC}\u{FE0F}';
  if (type === 'application/pdf') return '\u{1F4D5}';
  if (type.includes('word')) return '\u{1F4DD}';
  if (type.includes('sheet') || type.includes('excel')) return '\u{1F4CA}';
  return '\u{1F4C4}';
}

function formatSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
