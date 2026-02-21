import { useCallback, useState, useRef } from 'react';
import { VanillaBridge } from '../components/VanillaBridge.jsx';
import { useMode } from '../hooks/useMode.jsx';
import { useEventBus } from '../hooks/useEventBus.jsx';
import { useKernel } from '../hooks/useKernel.jsx';
import { renderSettingsBlock } from '../../blocks/settings-panel.js';

export function Settings() {
  const { mode, modeManager } = useMode();
  const eventBus = useEventBus();
  const kernel = useKernel();
  const [exportStatus, setExportStatus] = useState(null);
  const [importStatus, setImportStatus] = useState(null);
  const fileRef = useRef(null);

  const context = { mode, eventBus, modeManager };

  const mountSettings = useCallback((container, ctx) => {
    renderSettingsBlock(container, {
      modeManager: ctx.modeManager,
      eventBus: ctx.eventBus,
    });
    return { unmount() { container.innerHTML = ''; } };
  }, []);

  async function handleExport() {
    try {
      setExportStatus('Exporteren...');
      // Kernel returns pure data; UI handles the download side effect
      const bundle = await kernel.queries.backup.exportBundle();
      const json = JSON.stringify(bundle, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `boris-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setExportStatus(`Export succesvol (${bundle._meta?.storeCount || '?'} stores)`);
      setTimeout(() => setExportStatus(null), 3000);
    } catch (err) {
      setExportStatus(`Fout: ${err.message}`);
    }
  }

  async function handleImport(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setImportStatus('Valideren...');
      const bundle = await kernel.queries.backup.readBundleFile(file);
      const validation = kernel.queries.backup.validateBundle(bundle);

      if (!validation.valid) {
        setImportStatus(`Ongeldige backup: ${validation.errors.join(', ')}`);
        return;
      }

      setImportStatus('Importeren...');
      const result = await kernel.commands.backup.import(bundle);
      setImportStatus(`Import succesvol: ${result.imported} records uit ${result.stores} stores. Ververs de pagina.`);
    } catch (err) {
      setImportStatus(`Fout: ${err.message}`);
    }

    // Reset file input
    if (fileRef.current) fileRef.current.value = '';
  }

  return (
    <section className="p-6 max-w-[var(--max-os-content-width)]">
      <h2 className="text-2xl font-semibold text-[var(--color-text)] mb-4">Instellingen</h2>

      {/* Vanilla settings panel (theme, mode, accent, density, tutorial) */}
      <VanillaBridge
        key={`settings-${mode}`}
        mount={mountSettings}
        context={context}
      />

      {/* Data export/import section */}
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 mt-5">
        <h3 className="text-base font-semibold text-[var(--color-text)] mb-3">Data</h3>

        <div className="flex flex-wrap gap-3 mb-3">
          <button
            type="button"
            className="px-4 py-2 rounded-lg text-sm font-medium bg-[var(--color-accent)] text-[var(--color-accent-text)] hover:bg-[var(--color-accent-hover)] transition-colors"
            onClick={handleExport}
          >
            Exporteer backup
          </button>

          <label className="px-4 py-2 rounded-lg text-sm font-medium border border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-surface-hover)] transition-colors cursor-pointer">
            Importeer backup
            <input
              ref={fileRef}
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleImport}
            />
          </label>
        </div>

        {exportStatus && (
          <p className="text-xs text-[var(--color-text-secondary)]">{exportStatus}</p>
        )}
        {importStatus && (
          <p className="text-xs text-[var(--color-text-secondary)]">{importStatus}</p>
        )}
      </div>
    </section>
  );
}
