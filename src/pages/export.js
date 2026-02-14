import { exportAllData, importAll, clearAllData, getAllHoursSorted } from '../db.js';
import { encryptData, decryptData } from '../crypto.js';
import { icon } from '../icons.js';
import { emit } from '../state.js';
import { showToast } from '../toast.js';
import {
  formatMinutes, formatDateShort, getWeeksInBPV, weekNumber
} from '../utils.js';
import { WEEKLY_GOAL_HOURS, DAY_TYPE_LABELS } from '../constants.js';

export function createPage(container) {
  render();

  function render() {
    container.innerHTML = `
      <div class="page-header">
        <h2>Export & Import</h2>
        <p>Back-up, herstel en printoverzichten</p>
      </div>

      <!-- Export Section -->
      <div class="export-section card">
        <h3>Versleutelde export</h3>
        <p style="color: var(--color-text-secondary); margin-bottom: var(--space-4)">
          Exporteer al je data als een versleuteld bestand. Alleen met het juiste wachtwoord te openen.
        </p>
        <div class="form-group">
          <label class="form-label" for="export-pw">Wachtwoord</label>
          <input type="password" id="export-pw" class="form-input" placeholder="Kies een sterk wachtwoord" autocomplete="new-password">
        </div>
        <div class="form-group">
          <label class="form-label" for="export-pw2">Bevestig wachtwoord</label>
          <input type="password" id="export-pw2" class="form-input" placeholder="Herhaal wachtwoord" autocomplete="new-password">
        </div>
        <button class="btn btn-primary" data-action="export-encrypted">
          ${icon('lock', 16)} Versleuteld exporteren
        </button>
        <button class="btn btn-secondary" style="margin-left: var(--space-2)" data-action="export-plain">
          ${icon('download', 16)} Onversleuteld exporteren
        </button>
      </div>

      <!-- Import Section -->
      <div class="export-section card">
        <h3>Importeren</h3>
        <p style="color: var(--color-text-secondary); margin-bottom: var(--space-4)">
          Herstel data uit een eerder geexporteerd bestand.
        </p>
        <div class="form-group">
          <label class="form-label" for="import-file">Bestand kiezen</label>
          <input type="file" id="import-file" class="form-input" accept=".json,.bpv.json">
        </div>
        <div class="form-group" id="import-pw-group" style="display:none">
          <label class="form-label" for="import-pw">Wachtwoord</label>
          <input type="password" id="import-pw" class="form-input" placeholder="Wachtwoord van export">
        </div>
        <div id="import-preview" style="display:none; margin-bottom: var(--space-4)"></div>
        <button class="btn btn-primary" data-action="import" disabled>
          ${icon('upload', 16)} Importeren
        </button>
      </div>

      <!-- Print Section -->
      <div class="export-section card">
        <h3>Print urenlijst</h3>
        <p style="color: var(--color-text-secondary); margin-bottom: var(--space-4)">
          Genereer een printbare urenverantwoording.
        </p>
        <button class="btn btn-secondary" data-action="print-hours">
          ${icon('printer', 16)} Urenlijst printen
        </button>
      </div>
    `;

    bindEvents();
  }

  let importData = null;

  function bindEvents() {
    // Export encrypted
    container.querySelector('[data-action="export-encrypted"]')?.addEventListener('click', async () => {
      const pw = document.getElementById('export-pw').value;
      const pw2 = document.getElementById('export-pw2').value;
      if (!pw || pw.length < 4) {
        showToast('Wachtwoord moet minimaal 4 tekens zijn', { type: 'error' });
        return;
      }
      if (pw !== pw2) {
        showToast('Wachtwoorden komen niet overeen', { type: 'error' });
        return;
      }
      try {
        const data = await exportAllData();
        // Convert blobs to base64 for export
        const serialized = await serializeForExport(data);
        const jsonStr = JSON.stringify(serialized);
        const encrypted = await encryptData(jsonStr, pw);
        downloadJSON(encrypted, 'bpv-backup.bpv.json');
        showToast('Versleutelde export gedownload', { type: 'success' });
      } catch (err) {
        showToast('Export mislukt: ' + err.message, { type: 'error' });
      }
    });

    // Export plain
    container.querySelector('[data-action="export-plain"]')?.addEventListener('click', async () => {
      try {
        const data = await exportAllData();
        const serialized = await serializeForExport(data);
        downloadJSON(serialized, 'bpv-backup.json');
        showToast('Export gedownload', { type: 'success' });
      } catch (err) {
        showToast('Export mislukt: ' + err.message, { type: 'error' });
      }
    });

    // File input
    document.getElementById('import-file')?.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      try {
        const text = await file.text();
        const json = JSON.parse(text);

        if (json.algorithm && json.data) {
          // Encrypted file
          document.getElementById('import-pw-group').style.display = '';
          document.getElementById('import-preview').style.display = 'none';
          importData = { type: 'encrypted', raw: json };
          container.querySelector('[data-action="import"]').disabled = false;
        } else {
          // Plain file
          document.getElementById('import-pw-group').style.display = 'none';
          importData = { type: 'plain', data: json };
          showImportPreview(json);
          container.querySelector('[data-action="import"]').disabled = false;
        }
      } catch {
        showToast('Ongeldig bestand', { type: 'error' });
      }
    });

    // Import
    container.querySelector('[data-action="import"]')?.addEventListener('click', async () => {
      if (!importData) return;

      try {
        let data;
        if (importData.type === 'encrypted') {
          const pw = document.getElementById('import-pw').value;
          if (!pw) { showToast('Voer het wachtwoord in', { type: 'error' }); return; }
          const decrypted = await decryptData(importData.raw, pw);
          data = JSON.parse(decrypted);
        } else {
          data = importData.data;
        }

        // Deserialize blobs
        const deserialized = deserializeFromImport(data);

        await clearAllData();
        await importAll(deserialized);
        emit('hours:updated');
        emit('logbook:updated');
        emit('competencies:updated');
        emit('assignments:updated');
        showToast('Data succesvol geimporteerd', { type: 'success' });
        importData = null;
        render();
      } catch (err) {
        if (err.name === 'OperationError') {
          showToast('Verkeerd wachtwoord', { type: 'error' });
        } else {
          showToast('Import mislukt: ' + err.message, { type: 'error' });
        }
      }
    });

    // Print hours
    container.querySelector('[data-action="print-hours"]')?.addEventListener('click', async () => {
      await showPrintableHours();
    });
  }

  function showImportPreview(data) {
    const preview = document.getElementById('import-preview');
    if (!preview) return;
    const counts = Object.entries(data)
      .filter(([_, v]) => Array.isArray(v))
      .map(([k, v]) => `${k}: ${v.length} items`);
    preview.innerHTML = `
      <div class="card" style="padding: var(--space-3)">
        <strong>Inhoud:</strong><br>
        ${counts.join('<br>')}
      </div>
    `;
    preview.style.display = '';
  }

  async function showPrintableHours() {
    const hours = await getAllHoursSorted();
    const weeks = getWeeksInBPV();

    const printContent = `
      <div style="padding: 2rem; font-family: -apple-system, sans-serif; max-width: 800px; margin: 0 auto;">
        <h1 style="font-size: 18pt; margin-bottom: 1rem;">Urenverantwoording BPV</h1>
        <table class="hours-print-table" style="width:100%; border-collapse:collapse; font-size:10pt;">
          <thead>
            <tr>
              <th style="border:1px solid #ccc; padding:4px 8px; background:#f0f0f0;">Datum</th>
              <th style="border:1px solid #ccc; padding:4px 8px; background:#f0f0f0;">Type</th>
              <th style="border:1px solid #ccc; padding:4px 8px; background:#f0f0f0;">Start</th>
              <th style="border:1px solid #ccc; padding:4px 8px; background:#f0f0f0;">Eind</th>
              <th style="border:1px solid #ccc; padding:4px 8px; background:#f0f0f0;">Pauze</th>
              <th style="border:1px solid #ccc; padding:4px 8px; background:#f0f0f0;">Netto</th>
            </tr>
          </thead>
          <tbody>
            ${hours.map(h => `
              <tr>
                <td style="border:1px solid #ccc; padding:4px 8px;">${formatDateShort(h.date)}</td>
                <td style="border:1px solid #ccc; padding:4px 8px;">${DAY_TYPE_LABELS[h.type] || h.type}</td>
                <td style="border:1px solid #ccc; padding:4px 8px;">${h.startTime || '—'}</td>
                <td style="border:1px solid #ccc; padding:4px 8px;">${h.endTime || '—'}</td>
                <td style="border:1px solid #ccc; padding:4px 8px;">${h.type === 'work' ? h.breakMinutes + 'm' : '—'}</td>
                <td style="border:1px solid #ccc; padding:4px 8px;">${h.type === 'work' ? formatMinutes(h.netMinutes) : '—'}</td>
              </tr>
            `).join('')}
          </tbody>
          <tfoot>
            <tr style="font-weight:bold">
              <td colspan="5" style="border:1px solid #ccc; padding:4px 8px;">Totaal</td>
              <td style="border:1px solid #ccc; padding:4px 8px;">
                ${formatMinutes(hours.filter(h => h.type === 'work').reduce((s, h) => s + (h.netMinutes || 0), 0))}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    `;

    // Open in new window for printing
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="nl">
      <head><title>Urenverantwoording BPV</title></head>
      <body>${printContent}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  }

  return {};
}

async function serializeForExport(data) {
  const result = { ...data };
  // Convert photo blobs to base64
  if (result.photos) {
    result.photos = await Promise.all(result.photos.map(async (photo) => {
      const serialized = { ...photo };
      if (photo.blob instanceof Blob) {
        serialized.blob = await blobToBase64(photo.blob);
        serialized._blobType = photo.blob.type;
      }
      if (photo.thumbnail instanceof Blob) {
        serialized.thumbnail = await blobToBase64(photo.thumbnail);
        serialized._thumbnailType = photo.thumbnail.type;
      }
      return serialized;
    }));
  }
  return result;
}

function deserializeFromImport(data) {
  const result = { ...data };
  if (result.photos) {
    result.photos = result.photos.map(photo => {
      const deserialized = { ...photo };
      if (typeof photo.blob === 'string' && photo._blobType) {
        deserialized.blob = base64ToBlob(photo.blob, photo._blobType);
        delete deserialized._blobType;
      }
      if (typeof photo.thumbnail === 'string' && photo._thumbnailType) {
        deserialized.thumbnail = base64ToBlob(photo.thumbnail, photo._thumbnailType);
        delete deserialized._thumbnailType;
      }
      return deserialized;
    });
  }
  return result;
}

function downloadJSON(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function base64ToBlob(dataUrl, type) {
  try {
    const parts = dataUrl.split(',');
    const base64 = parts.length > 1 ? parts[1] : parts[0];
    const binary = atob(base64);
    const array = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      array[i] = binary.charCodeAt(i);
    }
    return new Blob([array], { type });
  } catch {
    return new Blob([], { type });
  }
}
