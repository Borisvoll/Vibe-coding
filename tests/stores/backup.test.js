import { describe, it, expect, beforeEach } from 'vitest';
import { initDB } from '../../src/db.js';
import { exportBundle, validateBundle, importBundle } from '../../src/stores/backup.js';
import { addTask, getTasksByMode } from '../../src/stores/tasks.js';
import { addInboxItem, getInboxItems } from '../../src/stores/inbox.js';
import { addProject, getProjects } from '../../src/stores/projects.js';
import { saveTodayEntry, getTodayEntry } from '../../src/stores/personal.js';
import { addHoursEntry, getHoursEntry } from '../../src/stores/bpv.js';

beforeEach(async () => {
  await initDB();
});

// ─── Export ──────────────────────────────────────────────────

describe('Backup — exportBundle', () => {
  it('returns a bundle with _meta and stores', async () => {
    const bundle = await exportBundle();
    expect(bundle._meta).toBeDefined();
    expect(bundle._meta.app).toBe('boris-os');
    expect(bundle._meta.version).toBe('2.0.1');
    expect(bundle._meta.exportedAt).toBeDefined();
    expect(bundle.stores).toBeDefined();
    expect(typeof bundle.stores).toBe('object');
  });

  it('includes data from all stores', async () => {
    await addTask('Backup test task', 'BPV');
    await addInboxItem('Backup inbox item');

    const bundle = await exportBundle();
    const taskRecords = bundle.stores.os_tasks || [];
    const inboxRecords = bundle.stores.os_inbox || [];
    expect(taskRecords.find((t) => t.text === 'Backup test task')).toBeDefined();
    expect(inboxRecords.find((i) => i.text === 'Backup inbox item')).toBeDefined();
  });

  it('_meta.recordCounts reflects actual data', async () => {
    await addTask('Task 1', 'BPV');
    await addTask('Task 2', 'School');

    const bundle = await exportBundle();
    expect(bundle._meta.recordCounts.os_tasks).toBeGreaterThanOrEqual(2);
  });
});

// ─── Validate ────────────────────────────────────────────────

describe('Backup — validateBundle', () => {
  it('accepts a valid bundle', async () => {
    const bundle = await exportBundle();
    const result = validateBundle(bundle);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('rejects null input', () => {
    const result = validateBundle(null);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('rejects bundle without _meta', () => {
    const result = validateBundle({ stores: {} });
    expect(result.valid).toBe(false);
  });

  it('rejects bundle with wrong app name', () => {
    const result = validateBundle({ _meta: { app: 'other-app' }, stores: {} });
    expect(result.valid).toBe(false);
  });

  it('rejects bundle without stores', () => {
    const result = validateBundle({ _meta: { app: 'boris-os' } });
    expect(result.valid).toBe(false);
  });

  it('warns on empty backup', () => {
    const result = validateBundle({ _meta: { app: 'boris-os' }, stores: {} });
    expect(result.valid).toBe(true);
    expect(result.warnings.some((w) => w.includes('Lege backup'))).toBe(true);
  });
});

// ─── Import ──────────────────────────────────────────────────

describe('Backup — importBundle', () => {
  it('imports a valid bundle', async () => {
    await addTask('Pre-import task', 'BPV');
    const bundle = await exportBundle();

    // Clear and reimport
    const result = await importBundle(bundle);
    expect(result.imported).toBeGreaterThanOrEqual(1);
    expect(result.stores).toBeGreaterThanOrEqual(1);
  });

  it('rejects an invalid bundle', async () => {
    await expect(importBundle({ invalid: true })).rejects.toThrow('Ongeldige backup');
  });
});

// ─── Roundtrip ───────────────────────────────────────────────

describe('Backup — export/import roundtrip', () => {
  it('preserves tasks through roundtrip', async () => {
    await addTask('Roundtrip task A', 'BPV');
    await addTask('Roundtrip task B', 'School');

    const bundle = await exportBundle();
    await importBundle(bundle, { merge: false });

    const bpvTasks = await getTasksByMode('BPV');
    const schoolTasks = await getTasksByMode('School');
    expect(bpvTasks.find((t) => t.text === 'Roundtrip task A')).toBeDefined();
    expect(schoolTasks.find((t) => t.text === 'Roundtrip task B')).toBeDefined();
  });

  it('preserves inbox items through roundtrip', async () => {
    await addInboxItem('Roundtrip inbox');
    const bundle = await exportBundle();
    await importBundle(bundle, { merge: false });

    const items = await getInboxItems();
    expect(items.find((i) => i.text === 'Roundtrip inbox')).toBeDefined();
  });

  it('preserves projects through roundtrip', async () => {
    await addProject('Roundtrip project', 'goal', 'School');
    const bundle = await exportBundle();
    await importBundle(bundle, { merge: false });

    const projects = await getProjects('School');
    expect(projects.find((p) => p.title === 'Roundtrip project')).toBeDefined();
  });

  it('preserves BPV hours through roundtrip', async () => {
    await addHoursEntry('2026-03-20', {
      type: 'work', startTime: '08:00', endTime: '16:00', breakMinutes: 30,
    });
    const bundle = await exportBundle();
    await importBundle(bundle, { merge: false });

    const entry = await getHoursEntry('2026-03-20');
    expect(entry).not.toBeNull();
    expect(entry.startTime).toBe('08:00');
    expect(entry.netMinutes).toBe(450);
  });

  it('preserves personal wellbeing through roundtrip', async () => {
    await saveTodayEntry({ gratitude: 'Roundtrip gratitude', journalNote: 'Roundtrip journal' });
    const bundle = await exportBundle();
    await importBundle(bundle, { merge: false });

    const entry = await getTodayEntry();
    expect(entry.gratitude).toBe('Roundtrip gratitude');
    expect(entry.journalNote).toBe('Roundtrip journal');
  });

  it('bundle is valid JSON (serializable)', async () => {
    await addTask('JSON test', 'Personal');
    const bundle = await exportBundle();

    // Serialize and deserialize
    const json = JSON.stringify(bundle);
    const parsed = JSON.parse(json);

    const result = validateBundle(parsed);
    expect(result.valid).toBe(true);
  });
});
