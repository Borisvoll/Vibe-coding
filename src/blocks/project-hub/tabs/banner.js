import { setCover, setAccentColor } from '../../../stores/projects.js';
import { escapeHTML } from '../../../utils.js';

const MAX_MB = 15;
const MAX_PIXELS = 1_000_000;

const ACCENT_SWATCHES = [
  { id: 'blue',   hex: '#3b82f6' },
  { id: 'purple', hex: '#8b5cf6' },
  { id: 'green',  hex: '#10b981' },
  { id: 'amber',  hex: '#f59e0b' },
  { id: 'red',    hex: '#ef4444' },
  { id: 'pink',   hex: '#ec4899' },
];

/**
 * Banner tab — stacked layout: cover preview on top, accent picker below.
 */
export function renderBannerTab(host, project, context) {
  const { eventBus } = context;

  function render() {
    const currentAccent = project.accentColor || null;
    const isAuto = !currentAccent || currentAccent === 'var(--color-accent)' || !ACCENT_SWATCHES.some((s) => s.hex === currentAccent);

    host.innerHTML = `
      <div class="hub-banner">
        <section class="hub-banner__cover-section">
          ${project.cover ? renderCoverPreview() : renderCoverPlaceholder()}
          <label class="hub-banner__upload-label">
            <input type="file" class="hub-banner__upload-input" accept="image/jpeg,image/png,image/webp,image/gif,.pdf" data-cover-upload hidden />
            <span class="btn btn-ghost btn-sm">\u{1F4C1} Cover uploaden (JPG, PNG, PDF)</span>
          </label>
          <div class="hub-banner__status" data-cover-status hidden></div>
        </section>

        <section class="hub-banner__accent-section">
          <h4 class="hub-banner__section-title">Accentkleur</h4>
          <div class="hub-banner__accent-swatches">
            <button type="button" class="hub-banner__swatch hub-banner__swatch--auto ${isAuto ? 'hub-banner__swatch--active' : ''}"
              data-accent="auto" title="Automatisch uit cover">
              \u{27F3}
            </button>
            ${ACCENT_SWATCHES.map((s) => `
              <button type="button" class="hub-banner__swatch ${currentAccent === s.hex ? 'hub-banner__swatch--active' : ''}"
                data-accent="${s.hex}" style="background:${s.hex}" title="${s.id}"></button>
            `).join('')}
          </div>
        </section>
      </div>
    `;

    bindEvents();
  }

  function renderCoverPreview() {
    const isPdf = project.cover.startsWith('data:application/pdf');
    if (isPdf) {
      return `
        <div class="hub-banner__cover-preview hub-banner__cover-preview--pdf">
          <span>\u{1F4D5}</span>
          <a href="${project.cover}" download="cover.pdf" class="btn btn-ghost btn-sm">Cover downloaden (PDF)</a>
          <button type="button" class="btn btn-ghost btn-sm" data-remove-cover>Verwijder</button>
        </div>`;
    }
    return `
      <div class="hub-banner__cover-preview">
        <img src="${project.cover}" alt="Cover" class="hub-banner__cover-img" />
        <button type="button" class="btn btn-ghost btn-sm hub-banner__cover-remove" data-remove-cover>
          Cover verwijderen
        </button>
      </div>`;
  }

  function renderCoverPlaceholder() {
    return `
      <div class="hub-banner__cover-placeholder" style="background: var(--project-accent, var(--color-accent))">
        <span class="hub-banner__cover-initials">${escapeHTML(project.title.slice(0, 2).toUpperCase())}</span>
      </div>`;
  }

  function bindEvents() {
    host.querySelector('[data-cover-upload]')?.addEventListener('change', async (e) => {
      const file = e.target.files?.[0];
      if (file) await handleCoverUpload(file);
    });

    host.querySelector('[data-remove-cover]')?.addEventListener('click', async () => {
      await setCover(project.id, null);
      await setAccentColor(project.id, null);
      project.cover = null;
      project.accentColor = null;
      propagateAccent('var(--color-accent)');
      eventBus.emit('projects:changed');
      render();
    });

    host.querySelectorAll('[data-accent]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const value = btn.dataset.accent;
        if (value === 'auto') {
          const accent = project.cover ? await extractAvgRGB(project.cover) : null;
          await setAccentColor(project.id, accent);
          project.accentColor = accent;
        } else {
          await setAccentColor(project.id, value);
          project.accentColor = value;
        }
        propagateAccent(project.accentColor || 'var(--color-accent)');
        eventBus.emit('projects:changed');
        render();
      });
    });
  }

  function propagateAccent(accent) {
    const detailEl = host.closest('[data-project-detail]');
    if (detailEl) detailEl.style.setProperty('--project-accent', accent);
  }

  async function handleCoverUpload(file) {
    const statusEl = host.querySelector('[data-cover-status]');
    const sizeMB = file.size / (1024 * 1024);

    statusEl.hidden = false;

    if (sizeMB > MAX_MB) {
      statusEl.textContent = `Bestand te groot (${sizeMB.toFixed(1)} MB). Maximum is ${MAX_MB} MB.`;
      statusEl.className = 'hub-banner__status hub-banner__status--error';
      return;
    }

    statusEl.textContent = 'Verwerken\u2026';
    statusEl.className = 'hub-banner__status';

    try {
      let dataUrl;
      if (file.type === 'application/pdf') {
        dataUrl = await readFileAsDataURL(file);
      } else {
        dataUrl = await processImage(file);
      }

      await setCover(project.id, dataUrl);
      project.cover = dataUrl;

      const accent = await extractAvgRGB(dataUrl);
      await setAccentColor(project.id, accent);
      project.accentColor = accent;

      propagateAccent(accent);
      statusEl.hidden = true;
      eventBus.emit('projects:changed');
      render();
    } catch (err) {
      statusEl.textContent = `Fout: ${err.message}`;
      statusEl.className = 'hub-banner__status hub-banner__status--error';
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

export async function extractAvgRGB(dataUrl) {
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
        const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        if (lum < 30 || lum > 225) continue;
        r += data[i];
        g += data[i + 1];
        b += data[i + 2];
        count++;
      }
      if (count === 0) { resolve('var(--color-accent)'); return; }
      resolve(`rgb(${Math.round(r / count)}, ${Math.round(g / count)}, ${Math.round(b / count)})`);
    };
    img.onerror = () => resolve('var(--color-accent)');
    img.src = dataUrl;
  });
}
