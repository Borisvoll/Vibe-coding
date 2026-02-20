import { setCover, setAccentColor, addFile, removeFile } from '../../../stores/projects.js';
import { escapeHTML } from '../../../utils.js';

const WARN_MB = 10;
const MAX_MB = 15;
const MAX_PIXELS = 1_000_000; // 1 MP

/**
 * Files tab — cover upload (with avg-RGB accent derivation) + file attachments.
 */
export function renderFilesTab(host, project, context) {
  const { eventBus } = context;

  function render() {
    const files = project.files || [];
    host.innerHTML = `
      <div class="hub-files">
        <section class="hub-files__cover-section">
          <h4 class="hub-files__section-title">Cover-afbeelding</h4>
          ${project.cover ? `
            <div class="hub-files__cover-preview">
              <img src="${project.cover}" alt="Cover" class="hub-files__cover-img" />
              <button type="button" class="btn btn-ghost btn-sm hub-files__cover-remove" data-remove-cover>
                Cover verwijderen
              </button>
            </div>
          ` : `
            <div class="hub-files__cover-placeholder">
              <span>Geen cover</span>
            </div>
          `}
          <label class="hub-files__upload-label">
            <input type="file" class="hub-files__upload-input" accept="image/jpeg,image/png,image/webp,image/gif,.pdf" data-cover-upload hidden />
            <span class="btn btn-ghost btn-sm">📁 Cover uploaden (JPG, PNG, PDF)</span>
          </label>
          <div class="hub-files__upload-status" data-cover-status hidden></div>

          ${project.accentColor ? `
            <div class="hub-files__accent-preview">
              <span class="hub-files__accent-dot" style="background:${project.accentColor}"></span>
              <span class="hub-files__accent-label">Accentkleur: ${escapeHTML(project.accentColor)}</span>
              <button type="button" class="btn btn-ghost btn-sm" data-reset-accent>Reset naar auto</button>
            </div>
          ` : ''}
        </section>

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
                <button type="button" class="btn btn-danger btn-sm" data-remove-file="${f.id}">×</button>
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
    // Cover upload
    host.querySelector('[data-cover-upload]')?.addEventListener('change', async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      await handleCoverUpload(file);
    });

    // Remove cover
    host.querySelector('[data-remove-cover]')?.addEventListener('click', async () => {
      await setCover(project.id, null);
      await setAccentColor(project.id, null);
      project.cover = null;
      project.accentColor = null;
      eventBus.emit('projects:changed');
      render();
    });

    // Reset accent
    host.querySelector('[data-reset-accent]')?.addEventListener('click', async () => {
      if (project.cover) {
        const accent = await extractAvgRGB(project.cover);
        await setAccentColor(project.id, accent);
        project.accentColor = accent;
        eventBus.emit('projects:changed');
        render();
      }
    });

    // File upload
    host.querySelector('[data-file-upload]')?.addEventListener('change', async (e) => {
      const files = Array.from(e.target.files || []);
      const statusEl = host.querySelector('[data-file-status]');
      for (const file of files) {
        await handleFileUpload(file, statusEl);
      }
    });

    // Remove file
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

  async function handleCoverUpload(file) {
    const statusEl = host.querySelector('[data-cover-status]');
    const sizeMB = file.size / (1024 * 1024);

    statusEl.hidden = false;

    if (sizeMB > MAX_MB) {
      statusEl.textContent = `Bestand te groot (${sizeMB.toFixed(1)} MB). Maximum is ${MAX_MB} MB.`;
      statusEl.className = 'hub-files__upload-status hub-files__upload-status--error';
      return;
    }
    if (sizeMB > WARN_MB) {
      statusEl.textContent = `Let op: bestand is ${sizeMB.toFixed(1)} MB. Dit kan traag laden.`;
      statusEl.className = 'hub-files__upload-status hub-files__upload-status--warn';
    } else {
      statusEl.textContent = 'Verwerken…';
      statusEl.className = 'hub-files__upload-status';
    }

    try {
      let dataUrl;

      if (file.type === 'application/pdf') {
        // For PDF: just store as dataURL (browser will handle preview via <embed> or download)
        dataUrl = await readFileAsDataURL(file);
      } else {
        // Downscale images > 1 MP
        dataUrl = await processImage(file);
      }

      await setCover(project.id, dataUrl);
      project.cover = dataUrl;

      // Extract accent color from image
      const accent = await extractAvgRGB(dataUrl);
      await setAccentColor(project.id, accent);
      project.accentColor = accent;

      // Propagate accent to detail container if present
      const detailEl = host.closest('[data-project-detail]');
      if (detailEl) detailEl.style.setProperty('--project-accent', accent);

      statusEl.hidden = true;
      eventBus.emit('projects:changed');
      render();
    } catch (err) {
      statusEl.textContent = `Fout: ${err.message}`;
      statusEl.className = 'hub-files__upload-status hub-files__upload-status--error';
    }
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

async function processImage(file) {
  // Use createImageBitmap for efficient decoding, downscale if > 1 MP
  const bitmap = await createImageBitmap(file);
  const { width, height } = bitmap;
  const pixels = width * height;

  let outW = width;
  let outH = height;
  if (pixels > MAX_PIXELS) {
    const scale = Math.sqrt(MAX_PIXELS / pixels);
    outW = Math.round(width * scale);
    outH = Math.round(height * scale);
  }

  const canvas = new OffscreenCanvas(outW, outH);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(bitmap, 0, 0, outW, outH);
  bitmap.close();

  const blob = await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.85 });
  return readBlobAsDataURL(blob);
}

function readBlobAsDataURL(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = () => reject(new Error('Blob lezen mislukt'));
    reader.readAsDataURL(blob);
  });
}

async function extractAvgRGB(dataUrl) {
  // Skip for PDFs
  if (dataUrl.startsWith('data:application/pdf')) return 'var(--color-accent)';

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const SAMPLE = 50;
      canvas.width = SAMPLE;
      canvas.height = SAMPLE;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, SAMPLE, SAMPLE);
      const data = ctx.getImageData(0, 0, SAMPLE, SAMPLE).data;
      let r = 0, g = 0, b = 0, count = 0;
      for (let i = 0; i < data.length; i += 4) {
        // Skip near-white and near-black (likely borders)
        const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        if (lum < 30 || lum > 225) continue;
        r += data[i];
        g += data[i + 1];
        b += data[i + 2];
        count++;
      }
      if (count === 0) { resolve('var(--color-accent)'); return; }
      const ar = Math.round(r / count);
      const ag = Math.round(g / count);
      const ab = Math.round(b / count);
      // Boost saturation slightly
      resolve(`rgb(${ar}, ${ag}, ${ab})`);
    };
    img.onerror = () => resolve('var(--color-accent)');
    img.src = dataUrl;
  });
}

function fileIcon(type) {
  if (!type) return '📄';
  if (type.startsWith('image/')) return '🖼️';
  if (type === 'application/pdf') return '📕';
  if (type.includes('word')) return '📝';
  if (type.includes('sheet') || type.includes('excel')) return '📊';
  return '📄';
}

function formatSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
