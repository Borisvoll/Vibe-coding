import { icon } from '../icons.js';
import { showToast } from '../toast.js';
import { emit } from '../state.js';
import { exportBPV, decryptBPV, applyReplace, applyMerge, undoImport, generateFilename } from '../sync.js';

export function createPage(container) {
  let state = 'choose'; // choose | export | import | summary
  let decryptedImport = null;
  let safetySnapshot = null;
  let undoTimer = null;

  function render() {
    if (state === 'choose') renderChoose();
    else if (state === 'export') renderExport();
    else if (state === 'import') renderImport();
    else if (state === 'summary') renderSummary();
  }

  function renderChoose() {
    container.innerHTML = `
      <div class="page-header"><h2>Sync</h2></div>
      <div class="sync-container">
        <p class="sync-intro">
          Synchroniseer je data tussen apparaten via een versleuteld <strong>.bpv</strong> bestand.
          Geen account nodig — alles blijft lokaal en privé.
        </p>
        <div class="sync-actions">
          <div class="sync-action-card card" data-action="export">
            <div class="sync-icon" style="background: var(--color-accent-light); color: var(--color-accent);">
              ${icon('download', 24)}
            </div>
            <h3>Exporteren</h3>
            <p>Maak een versleutelde backup van al je data</p>
          </div>
          <div class="sync-action-card card" data-action="import">
            <div class="sync-icon" style="background: var(--color-accent-light); color: var(--color-accent);">
              ${icon('upload', 24)}
            </div>
            <h3>Importeren</h3>
            <p>Herstel data vanuit een .bpv bestand</p>
          </div>
        </div>
      </div>
    `;

    container.querySelector('[data-action="export"]').addEventListener('click', () => {
      state = 'export';
      render();
    });
    container.querySelector('[data-action="import"]').addEventListener('click', () => {
      state = 'import';
      render();
    });
  }

  function renderExport() {
    container.innerHTML = `
      <div class="page-header">
        <button class="btn btn-ghost btn-sm" data-action="back">${icon('arrow-left', 16)} Terug</button>
        <h2>Exporteren</h2>
      </div>
      <div class="sync-container">
        <div class="card">
          <div class="sync-password-form">
            <div class="form-group">
              <label class="form-label">Wachtwoord voor versleuteling</label>
              <input type="password" id="export-pw" class="form-input" placeholder="Kies een sterk wachtwoord" autocomplete="new-password">
            </div>
            <div class="form-group">
              <label class="form-label">Bevestig wachtwoord</label>
              <input type="password" id="export-pw2" class="form-input" placeholder="Herhaal wachtwoord" autocomplete="new-password">
            </div>
            <div class="sync-options">
              <label class="checkbox-label">
                <input type="checkbox" id="include-vault"> Vault meenemen
              </label>
            </div>
            <button class="btn btn-primary" id="do-export" style="width:100%">
              ${icon('lock', 16)} Versleutelen & downloaden
            </button>
            <p id="export-status" style="font-size: 0.8125rem; color: var(--color-text-secondary); text-align: center; margin-top: var(--space-3);"></p>
          </div>
        </div>
      </div>
    `;

    container.querySelector('[data-action="back"]').addEventListener('click', () => {
      state = 'choose';
      render();
    });

    container.querySelector('#do-export').addEventListener('click', handleExport);
  }

  async function handleExport() {
    const pw = container.querySelector('#export-pw').value;
    const pw2 = container.querySelector('#export-pw2').value;
    const includeVault = container.querySelector('#include-vault').checked;
    const statusEl = container.querySelector('#export-status');
    const btn = container.querySelector('#do-export');

    if (!pw || pw.length < 4) {
      statusEl.textContent = 'Wachtwoord moet minimaal 4 tekens zijn';
      statusEl.style.color = 'var(--color-error)';
      return;
    }
    if (pw !== pw2) {
      statusEl.textContent = 'Wachtwoorden komen niet overeen';
      statusEl.style.color = 'var(--color-error)';
      return;
    }

    btn.disabled = true;
    statusEl.textContent = 'Bezig met versleutelen...';
    statusEl.style.color = 'var(--color-text-secondary)';

    try {
      const buffer = await exportBPV(pw, includeVault);
      const blob = new Blob([buffer], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = generateFilename();
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      statusEl.textContent = 'Download gestart!';
      statusEl.style.color = 'var(--color-success)';
      showToast('Export succesvol', { type: 'success' });
    } catch (err) {
      statusEl.textContent = 'Fout: ' + err.message;
      statusEl.style.color = 'var(--color-error)';
    } finally {
      btn.disabled = false;
    }
  }

  function renderImport() {
    container.innerHTML = `
      <div class="page-header">
        <button class="btn btn-ghost btn-sm" data-action="back">${icon('arrow-left', 16)} Terug</button>
        <h2>Importeren</h2>
      </div>
      <div class="sync-container">
        <div class="card">
          <div class="sync-password-form">
            <div class="form-group">
              <label class="form-label">Selecteer .bpv bestand</label>
              <input type="file" id="import-file" accept=".bpv" class="form-input">
            </div>
            <div class="form-group">
              <label class="form-label">Wachtwoord</label>
              <input type="password" id="import-pw" class="form-input" placeholder="Wachtwoord van export" autocomplete="current-password">
            </div>
            <div class="sync-options">
              <div class="form-group">
                <label class="form-label">Importmethode</label>
                <label class="radio-label" style="display:flex;gap:var(--space-2);align-items:center;margin-bottom:var(--space-2);">
                  <input type="radio" name="import-mode" value="merge" checked>
                  <span><strong>Samenvoegen</strong> (aanbevolen) — nieuwste versie wint</span>
                </label>
                <label class="radio-label" style="display:flex;gap:var(--space-2);align-items:center;">
                  <input type="radio" name="import-mode" value="replace">
                  <span><strong>Alles vervangen</strong> — lokale data wordt overschreven</span>
                </label>
              </div>
            </div>
            <button class="btn btn-primary" id="do-import" style="width:100%">
              ${icon('upload', 16)} Ontsleutelen & importeren
            </button>
            <p id="import-status" style="font-size: 0.8125rem; color: var(--color-text-secondary); text-align: center; margin-top: var(--space-3);"></p>
          </div>
        </div>
      </div>
    `;

    container.querySelector('[data-action="back"]').addEventListener('click', () => {
      state = 'choose';
      render();
    });

    container.querySelector('#do-import').addEventListener('click', handleImport);
  }

  async function handleImport() {
    const fileInput = container.querySelector('#import-file');
    const pw = container.querySelector('#import-pw').value;
    const mode = container.querySelector('input[name="import-mode"]:checked').value;
    const statusEl = container.querySelector('#import-status');
    const btn = container.querySelector('#do-import');

    if (!fileInput.files.length) {
      statusEl.textContent = 'Selecteer een .bpv bestand';
      statusEl.style.color = 'var(--color-error)';
      return;
    }
    if (!pw) {
      statusEl.textContent = 'Voer het wachtwoord in';
      statusEl.style.color = 'var(--color-error)';
      return;
    }

    btn.disabled = true;
    statusEl.textContent = 'Bezig met ontsleutelen...';
    statusEl.style.color = 'var(--color-text-secondary)';

    try {
      const file = fileInput.files[0];
      const buffer = await file.arrayBuffer();

      // Phase 1: Decrypt and validate
      decryptedImport = await decryptBPV(buffer, pw);

      statusEl.textContent = 'Bezig met importeren...';

      // Phase 2: Apply
      let result;
      if (mode === 'replace') {
        result = await applyReplace(decryptedImport.data);
        safetySnapshot = result.safetySnapshot;
        state = 'summary';
        renderSummary({
          mode: 'replace',
          meta: decryptedImport.meta
        });
      } else {
        result = await applyMerge(decryptedImport.data);
        safetySnapshot = result.safetySnapshot;
        state = 'summary';
        renderSummary({
          mode: 'merge',
          meta: decryptedImport.meta,
          merged: result.merged,
          skipped: result.skipped,
          conflicts: result.conflicts
        });
      }

      // Emit update events
      emit('hours:updated');
      emit('logbook:updated');
      emit('competencies:updated');
      emit('assignments:updated');

      showToast('Import succesvol', { type: 'success' });
    } catch (err) {
      statusEl.textContent = err.message;
      statusEl.style.color = 'var(--color-error)';
      btn.disabled = false;
    }
  }

  function renderSummary(info = {}) {
    const counts = info.meta?.store_counts || {};
    const totalRecords = Object.values(counts).reduce((a, b) => a + b, 0);

    container.innerHTML = `
      <div class="page-header">
        <h2>Import voltooid</h2>
      </div>
      <div class="sync-container">
        <div class="sync-summary card">
          <h3>${info.mode === 'merge' ? 'Samenvoegen voltooid' : 'Data vervangen'}</h3>
          <div class="sync-summary-grid">
            <div class="sync-summary-item">
              <span class="label">Bron</span>
              <span class="value">${info.meta?.device_id?.slice(0, 8) || 'onbekend'}...</span>
            </div>
            <div class="sync-summary-item">
              <span class="label">Geëxporteerd op</span>
              <span class="value">${info.meta?.exported_at ? new Date(info.meta.exported_at).toLocaleString('nl-NL') : '-'}</span>
            </div>
            <div class="sync-summary-item">
              <span class="label">App versie</span>
              <span class="value">${info.meta?.app_version || '-'}</span>
            </div>
            <div class="sync-summary-item">
              <span class="label">Totaal records</span>
              <span class="value">${totalRecords}</span>
            </div>
            ${info.mode === 'merge' ? `
              <div class="sync-summary-item">
                <span class="label">Samengevoegd</span>
                <span class="value">${info.merged || 0}</span>
              </div>
              <div class="sync-summary-item">
                <span class="label">Overgeslagen</span>
                <span class="value">${info.skipped || 0}</span>
              </div>
            ` : ''}
          </div>
        </div>

        <div class="sync-undo-bar" id="undo-bar">
          <span>Ongedaan maken? Veiligheids-snapshot beschikbaar (30 sec)</span>
          <button class="btn btn-sm btn-warning" id="undo-btn">Ongedaan maken</button>
        </div>

        <div style="margin-top: var(--space-6);">
          <button class="btn btn-primary" data-action="done" style="width:100%">Klaar</button>
        </div>
      </div>
    `;

    // Undo timer — 30 seconds
    const undoBar = container.querySelector('#undo-bar');
    const undoBtn = container.querySelector('#undo-btn');

    undoTimer = setTimeout(() => {
      if (undoBar) {
        undoBar.style.opacity = '0.5';
        undoBar.querySelector('span').textContent = 'Undo verlopen';
        undoBtn.disabled = true;
      }
      safetySnapshot = null;
    }, 30000);

    undoBtn.addEventListener('click', async () => {
      if (!safetySnapshot) return;
      clearTimeout(undoTimer);
      try {
        await undoImport(safetySnapshot);
        safetySnapshot = null;
        emit('hours:updated');
        emit('logbook:updated');
        emit('competencies:updated');
        emit('assignments:updated');
        showToast('Import ongedaan gemaakt', { type: 'info' });
        undoBar.querySelector('span').textContent = 'Hersteld naar vorige staat';
        undoBtn.disabled = true;
      } catch (err) {
        showToast('Fout bij herstellen: ' + err.message, { type: 'error' });
      }
    });

    container.querySelector('[data-action="done"]').addEventListener('click', () => {
      clearTimeout(undoTimer);
      safetySnapshot = null;
      state = 'choose';
      render();
    });
  }

  render();
  return {};
}
