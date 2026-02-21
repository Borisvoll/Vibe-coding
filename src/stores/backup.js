import { getStoreNames, exportAllData, importAll, clearAllData, getDbHealthMetrics } from '../db.js';
import { APP_VERSION } from '../version.js';

/**
 * Export a full JSON backup bundle.
 * Includes metadata for validation on import.
 */
export async function exportBundle() {
  const data = await exportAllData();
  const storeNames = getStoreNames();

  const bundle = {
    _meta: {
      app: 'boris-os',
      version: APP_VERSION,
      exportedAt: new Date().toISOString(),
      storeCount: storeNames.length,
      recordCounts: {},
    },
    stores: {},
  };

  for (const name of storeNames) {
    const records = data[name] || [];
    bundle.stores[name] = records;
    bundle._meta.recordCounts[name] = records.length;
  }

  return bundle;
}

/**
 * Get the estimated export size in bytes (without actually exporting).
 */
export async function getEstimatedExportSize() {
  const metrics = await getDbHealthMetrics();
  return metrics.estimatedExportBytes;
}

/**
 * Export bundle as a downloadable JSON file.
 * Uses compact JSON (no pretty-print) to minimize file size.
 */
export async function downloadBundle() {
  const bundle = await exportBundle();
  const json = JSON.stringify(bundle);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `boris-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  return { ...bundle._meta, exportSizeBytes: json.length };
}

/**
 * Validate a backup bundle before importing.
 * Returns { valid: boolean, errors: string[], warnings: string[], meta }
 */
export function validateBundle(bundle) {
  const errors = [];
  const warnings = [];

  if (!bundle || typeof bundle !== 'object') {
    return { valid: false, errors: ['Ongeldig bestand: geen JSON object'], warnings, meta: null };
  }

  if (!bundle._meta) {
    errors.push('Ontbrekende metadata (_meta veld)');
  }

  if (bundle._meta?.app !== 'boris-os') {
    errors.push(`Onbekende app: "${bundle._meta?.app}" (verwacht: boris-os)`);
  }

  if (!bundle.stores || typeof bundle.stores !== 'object') {
    errors.push('Ontbrekend stores veld');
  }

  if (errors.length > 0) {
    return { valid: false, errors, warnings, meta: bundle._meta || null };
  }

  // Version check: warn if backup is from a newer version
  if (bundle._meta.version && bundle._meta.version > APP_VERSION) {
    warnings.push(`Backup is van een nieuwere versie (${bundle._meta.version}). Sommige data kan onbekend zijn.`);
  }

  // Check store contents
  const storeNames = Object.keys(bundle.stores);
  let totalRecords = 0;

  for (const name of storeNames) {
    const records = bundle.stores[name];
    if (!Array.isArray(records)) {
      errors.push(`Store "${name}" is geen array`);
      continue;
    }
    totalRecords += records.length;

    // Spot check: records should have an id
    const withoutId = records.filter((r) => !r.id && !r.key);
    if (withoutId.length > 0 && name !== 'settings') {
      warnings.push(`Store "${name}": ${withoutId.length} records zonder id`);
    }
  }

  if (totalRecords === 0) {
    warnings.push('Lege backup: 0 records gevonden');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    meta: {
      ...bundle._meta,
      storeCount: storeNames.length,
      totalRecords,
    },
  };
}

/**
 * Import a backup bundle.
 * No localStorage safety blob (unreliable for large datasets).
 * Both clearAllData() and importAll() use individual IDB transactions
 * which are each atomic. The gap between clear and import is minimal.
 *
 * @param {object} bundle - The parsed bundle to import
 * @param {boolean} merge - If true, merge with existing data. If false, replace.
 * @returns {{ imported: number, stores: number }}
 */
export async function importBundle(bundle, { merge = false } = {}) {
  const validation = validateBundle(bundle);
  if (!validation.valid) {
    throw new Error(`Ongeldige backup: ${validation.errors.join('; ')}`);
  }

  if (!merge) {
    await clearAllData();
  }

  await importAll(bundle.stores);

  let totalImported = 0;
  for (const records of Object.values(bundle.stores)) {
    if (Array.isArray(records)) totalImported += records.length;
  }

  return {
    imported: totalImported,
    stores: Object.keys(bundle.stores).length,
  };
}

/**
 * Read a File object as a parsed JSON bundle.
 */
export function readBundleFile(file) {
  return new Promise((resolve, reject) => {
    if (!file || !file.name.endsWith('.json')) {
      reject(new Error('Selecteer een .json bestand'));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const bundle = JSON.parse(reader.result);
        resolve(bundle);
      } catch {
        reject(new Error('Bestand is geen geldig JSON'));
      }
    };
    reader.onerror = () => reject(new Error('Kan bestand niet lezen'));
    reader.readAsText(file);
  });
}
