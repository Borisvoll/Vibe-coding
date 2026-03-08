/**
 * BPV Data Manager — Export/import all stage data as a local .json file.
 * Privacy-first: all data stays on your device, no server involved.
 */
import { getAll, getStoreNames, put, clearAllData, importAll, exportAllData } from '../../db.js';
import { escapeHTML, getToday, formatMinutes } from '../../utils.js';
import { exportEntries } from '../../stores/bpv.js';
import { APP_VERSION } from '../../version.js';
import { showToast } from '../../toast.js';

const BPV_STORES = ['hours', 'logbook', 'report', 'dailyPlans', 'goals', 'assignments', 'learningMoments'];

export function renderBPVDataManager(container, context) {
  const mountId = `bpv-dm-${crypto.randomUUID()}`;
  const { eventBus } = context;

  container.insertAdjacentHTML('beforeend', `
    <article class="bpv-dm os-mini-card" data-mount-id="${mountId}">
      <h3 class="bpv-dm__title">Stagedata</h3>
      <p class="bpv-dm__desc">Exporteer je uren, logboek, verslag en planning als lokaal bestand. Importeer een eerder opgeslagen bestand om je data te herstellen.</p>
      <div class="bpv-dm__stats" data-dm-stats></div>
      <div class="bpv-dm__actions">
        <button type="button" class="btn btn-primary btn-sm" data-action="export-json">
          Exporteer alles (.json)
        </button>
        <button type="button" class="btn btn-secondary btn-sm" data-action="export-csv">
          Exporteer uren (.csv)
        </button>
        <button type="button" class="btn btn-ghost btn-sm" data-action="import">
          Importeer bestand
        </button>
        <input type="file" accept=".json" style="display:none" data-file-input>
      </div>
      <div class="bpv-dm__status" data-dm-status></div>
    </article>
  `);

  const el = container.querySelector(`[data-mount-id="${mountId}"]`);
  const statsEl = el.querySelector('[data-dm-stats]');
  const statusEl = el.querySelector('[data-dm-status]');
  const fileInput = el.querySelector('[data-file-input]');

  function setStatus(msg, type = 'info') {
    statusEl.textContent = msg;
    statusEl.className = `bpv-dm__status bpv-dm__status--${type}`;
    if (type !== 'error') setTimeout(() => { statusEl.textContent = ''; }, 4000);
  }

  async function loadStats() {
    const counts = {};
    let total = 0;
    for (const store of BPV_STORES) {
      try {
        const records = await getAll(store);
        counts[store] = records.length;
        total += records.length;
      } catch {
        counts[store] = 0;
      }
    }

    statsEl.innerHTML = `
      <div class="bpv-dm__stat-grid">
        <div class="bpv-dm__stat"><span class="bpv-dm__stat-val">${counts.hours || 0}</span><span class="bpv-dm__stat-lbl">Uren</span></div>
        <div class="bpv-dm__stat"><span class="bpv-dm__stat-val">${counts.logbook || 0}</span><span class="bpv-dm__stat-lbl">Logboek</span></div>
        <div class="bpv-dm__stat"><span class="bpv-dm__stat-val">${counts.report || 0}</span><span class="bpv-dm__stat-lbl">Verslag</span></div>
        <div class="bpv-dm__stat"><span class="bpv-dm__stat-val">${counts.dailyPlans || 0}</span><span class="bpv-dm__stat-lbl">Dagplannen</span></div>
        <div class="bpv-dm__stat bpv-dm__stat--total"><span class="bpv-dm__stat-val">${total}</span><span class="bpv-dm__stat-lbl">Totaal</span></div>
      </div>
    `;
  }

  // ── Export all BPV data as JSON ──
  async function exportJSON() {
    try {
      setStatus('Exporteren…');
      const bundle = { _meta: { app: 'boris-bpv', version: APP_VERSION, exportedAt: new Date().toISOString(), stores: {} }, stores: {} };

      for (const store of BPV_STORES) {
        try {
          const records = await getAll(store);
          bundle.stores[store] = records;
          bundle._meta.stores[store] = records.length;
        } catch {
          bundle.stores[store] = [];
          bundle._meta.stores[store] = 0;
        }
      }

      const json = JSON.stringify(bundle, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bpv-stagedata-${getToday()}.json`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 5000);

      const sizeMB = (json.length / 1024 / 1024).toFixed(2);
      setStatus(`Geëxporteerd (${sizeMB} MB)`, 'success');
      showToast('Stagedata geëxporteerd');
    } catch (err) {
      setStatus(`Export mislukt: ${err.message}`, 'error');
    }
  }

  // ── Export hours as CSV ──
  async function exportCSV() {
    try {
      const csv = await exportEntries('csv');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bpv-uren-${getToday()}.csv`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      setStatus('Uren geëxporteerd als CSV', 'success');
    } catch (err) {
      setStatus(`CSV export mislukt: ${err.message}`, 'error');
    }
  }

  // ── Import BPV data from JSON ──
  async function handleImport(file) {
    if (!file || !file.name.endsWith('.json')) {
      setStatus('Selecteer een .json bestand', 'error');
      return;
    }

    try {
      setStatus('Bestand lezen…');
      const text = await file.text();
      const bundle = JSON.parse(text);

      if (!bundle.stores || typeof bundle.stores !== 'object') {
        setStatus('Ongeldig bestand: geen stores gevonden', 'error');
        return;
      }

      // Validate it contains at least some BPV data
      const hasData = BPV_STORES.some(s => Array.isArray(bundle.stores[s]) && bundle.stores[s].length > 0);
      if (!hasData) {
        setStatus('Geen BPV-data gevonden in dit bestand', 'error');
        return;
      }

      // Count records to import
      let totalRecords = 0;
      for (const store of BPV_STORES) {
        if (Array.isArray(bundle.stores[store])) {
          totalRecords += bundle.stores[store].length;
        }
      }

      // Import BPV stores only (merge by upsert via put)
      setStatus(`Importeren: ${totalRecords} records…`);
      for (const store of BPV_STORES) {
        const records = bundle.stores[store];
        if (!Array.isArray(records)) continue;
        for (const record of records) {
          if (record.id || record.key) {
            await put(store, record);
          }
        }
      }

      setStatus(`${totalRecords} records geïmporteerd`, 'success');
      showToast(`Stagedata geïmporteerd (${totalRecords} records)`);
      loadStats();
      eventBus?.emit('bpv:changed');
    } catch (err) {
      setStatus(`Import mislukt: ${err.message}`, 'error');
    }
  }

  // Wire up buttons
  el.querySelector('[data-action="export-json"]').addEventListener('click', exportJSON);
  el.querySelector('[data-action="export-csv"]').addEventListener('click', exportCSV);
  el.querySelector('[data-action="import"]').addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', (e) => {
    if (e.target.files[0]) handleImport(e.target.files[0]);
    fileInput.value = '';
  });

  loadStats();

  const unsubBPV = eventBus?.on('bpv:changed', () => loadStats());

  return {
    unmount() {
      unsubBPV?.();
      el?.remove();
    },
  };
}
