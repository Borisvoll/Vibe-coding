import { getAll, getStoreNames, exportAllData, importAll, clearAllData } from '../db.js';
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
 * Export bundle as a downloadable JSON file.
 */
export async function downloadBundle() {
  const bundle = await exportBundle();
  const json = JSON.stringify(bundle, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `boris-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  return bundle._meta;
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
 * Creates a safety backup before overwriting, stored in localStorage.
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

  // Safety: create a quick backup before import
  try {
    const safetyData = await exportAllData();
    const safetyJson = JSON.stringify({ _safety: true, data: safetyData, at: new Date().toISOString() });
    // Store max 5MB in localStorage as safety net
    if (safetyJson.length < 5_000_000) {
      localStorage.setItem('boris_safety_backup', safetyJson);
    }
  } catch {
    // Non-critical — proceed with import
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
 * Restore from the safety backup in localStorage (if available).
 */
export async function restoreFromSafetyBackup() {
  const raw = localStorage.getItem('boris_safety_backup');
  if (!raw) throw new Error('Geen safety backup beschikbaar');

  const parsed = JSON.parse(raw);
  if (!parsed._safety || !parsed.data) {
    throw new Error('Ongeldige safety backup');
  }

  await clearAllData();
  await importAll(parsed.data);
  localStorage.removeItem('boris_safety_backup');

  return { restoredAt: parsed.at };
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
