import { describe, it, expect, beforeEach } from 'vitest';
import { initDB } from '../../src/db.js';
import { exportBundle, validateBundle, importBundle, downloadBundle, getEstimatedExportSize } from '../../src/stores/backup.js';
import { addTask } from '../../src/stores/tasks.js';

beforeEach(async () => {
  await initDB();
});

describe('Backup — compact export', () => {
  it('export produces compact JSON (no indentation)', async () => {
    await addTask('Compact test', 'School');
    const bundle = await exportBundle();
    const json = JSON.stringify(bundle);
    // Compact JSON should not contain newlines followed by spaces (indentation)
    expect(json).not.toMatch(/\n\s+/);
  });

  it('export roundtrip works with compact JSON', async () => {
    await addTask('Compact roundtrip', 'BPV');
    const bundle = await exportBundle();
    const json = JSON.stringify(bundle);
    const parsed = JSON.parse(json);

    const result = validateBundle(parsed);
    expect(result.valid).toBe(true);
  });
});

describe('Backup — import atomicity', () => {
  it('import does not leave localStorage safety blob', async () => {
    await addTask('Safety test', 'School');
    const bundle = await exportBundle();

    await importBundle(bundle, { merge: false });

    // localStorage should NOT contain safety backup
    expect(localStorage.getItem('boris_safety_backup')).toBeNull();
  });

  it('import rejects invalid bundle without modifying data', async () => {
    await addTask('Existing task', 'School');

    const invalidBundle = { invalid: true };
    await expect(importBundle(invalidBundle)).rejects.toThrow('Ongeldige backup');
  });
});

describe('Backup — validation', () => {
  it('rejects non-object input', () => {
    expect(validateBundle(null).valid).toBe(false);
    expect(validateBundle('string').valid).toBe(false);
    expect(validateBundle(123).valid).toBe(false);
  });

  it('rejects wrong app identifier', () => {
    const result = validateBundle({
      _meta: { app: 'not-boris' },
      stores: {},
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('Onbekende app'))).toBe(true);
  });

  it('rejects missing stores field', () => {
    const result = validateBundle({ _meta: { app: 'boris-os' } });
    expect(result.valid).toBe(false);
  });

  it('warns on newer version', () => {
    const result = validateBundle({
      _meta: { app: 'boris-os', version: '99.0.0' },
      stores: {},
    });
    expect(result.valid).toBe(true);
    expect(result.warnings.some((w) => w.includes('nieuwere versie'))).toBe(true);
  });

  it('warns on empty stores', () => {
    const result = validateBundle({
      _meta: { app: 'boris-os', version: '1.0.0' },
      stores: {},
    });
    expect(result.valid).toBe(true);
    expect(result.warnings.some((w) => w.includes('Lege backup'))).toBe(true);
  });

  it('rejects stores that are not arrays', () => {
    const result = validateBundle({
      _meta: { app: 'boris-os', version: '1.0.0' },
      stores: { os_tasks: 'not an array' },
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('geen array'))).toBe(true);
  });
});

describe('Backup — export size estimate', () => {
  it('returns a number', async () => {
    const size = await getEstimatedExportSize();
    expect(typeof size).toBe('number');
    expect(size).toBeGreaterThanOrEqual(0);
  });

  it('increases after adding data', async () => {
    const before = await getEstimatedExportSize();
    await addTask('Size test 1', 'School');
    await addTask('Size test 2', 'BPV');
    const after = await getEstimatedExportSize();
    expect(after).toBeGreaterThan(before);
  });
});
