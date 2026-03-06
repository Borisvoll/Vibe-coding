import { describe, it, expect, beforeEach } from 'vitest';
import { initDB } from '../../src/db.js';
import {
  REPORT_SECTIONS,
  getAllReportSections,
  getReportSection,
  saveReportSection,
  deleteReportSection,
  getReportProgress,
} from '../../src/stores/report.js';

beforeEach(async () => {
  await initDB();
});

describe('Report store', () => {
  it('REPORT_SECTIONS has all expected sections', () => {
    const ids = REPORT_SECTIONS.map(s => s.id);
    expect(ids).toContain('inleiding');
    expect(ids).toContain('bedrijfsorientatie');
    expect(ids).toContain('bedrijfsprocessen');
    expect(ids).toContain('leerdoelen');
    expect(ids).toContain('product');
    expect(ids).toContain('engels');
    expect(ids).toContain('reflectie');
    expect(ids).toContain('bijlagen');
    expect(REPORT_SECTIONS).toHaveLength(8);
  });

  it('each section has id, title, description and fields', () => {
    for (const section of REPORT_SECTIONS) {
      expect(section.id).toBeTruthy();
      expect(section.title).toBeTruthy();
      expect(section.description).toBeTruthy();
      expect(Array.isArray(section.fields)).toBe(true);
      expect(section.fields.length).toBeGreaterThan(0);
    }
  });

  it('saveReportSection creates a record', async () => {
    const result = await saveReportSection('inleiding', {
      stage_uitleg: 'Stage bij Boers & Co',
      bedrijf: 'Boers & Co',
      periode: '2026-02-09 t/m 2026-04-24',
    });
    expect(result.id).toBe('inleiding');
    expect(result.data.stage_uitleg).toBe('Stage bij Boers & Co');
    expect(result.createdAt).toBeDefined();
    expect(result.updatedAt).toBeDefined();
  });

  it('saveReportSection upserts existing record', async () => {
    const first = await saveReportSection('inleiding', { stage_uitleg: 'v1' });
    const second = await saveReportSection('inleiding', { stage_uitleg: 'v2' });
    expect(second.createdAt).toBe(first.createdAt);
    expect(second.data.stage_uitleg).toBe('v2');
  });

  it('saveReportSection rejects empty sectionId', async () => {
    await expect(saveReportSection('', {})).rejects.toThrow('sectionId');
  });

  it('saveReportSection rejects unknown sectionId', async () => {
    await expect(saveReportSection('nonexistent', {})).rejects.toThrow('unknown section');
  });

  it('getReportSection returns saved data', async () => {
    await saveReportSection('reflectie', { wat_goed: 'Samenwerken' });
    const section = await getReportSection('reflectie');
    expect(section).not.toBeNull();
    expect(section.data.wat_goed).toBe('Samenwerken');
  });

  it('getReportSection returns null for unsaved section', async () => {
    const section = await getReportSection('inleiding');
    expect(section).toBeNull();
  });

  it('getAllReportSections returns all saved sections', async () => {
    await saveReportSection('inleiding', { bedrijf: 'Test' });
    await saveReportSection('reflectie', { wat_goed: 'Alles' });
    const all = await getAllReportSections();
    expect(all).toHaveLength(2);
  });

  it('deleteReportSection removes the record', async () => {
    await saveReportSection('inleiding', { bedrijf: 'Test' });
    await deleteReportSection('inleiding');
    const section = await getReportSection('inleiding');
    expect(section).toBeNull();
  });

  describe('getReportProgress', () => {
    it('returns 0% when no data saved', async () => {
      const progress = await getReportProgress();
      expect(progress.filled).toBe(0);
      expect(progress.total).toBeGreaterThan(0);
      expect(progress.percent).toBe(0);
    });

    it('counts filled fields correctly', async () => {
      const inleidingFields = REPORT_SECTIONS.find(s => s.id === 'inleiding').fields;
      const data = {};
      for (const f of inleidingFields) {
        data[f.key] = 'filled';
      }
      await saveReportSection('inleiding', data);

      const progress = await getReportProgress();
      expect(progress.filled).toBe(inleidingFields.length);
      expect(progress.percent).toBeGreaterThan(0);
    });

    it('ignores empty/whitespace-only values', async () => {
      await saveReportSection('inleiding', {
        stage_uitleg: '  ',
        bedrijf: '',
        periode: 'filled',
      });

      const progress = await getReportProgress();
      expect(progress.filled).toBe(1);
    });
  });
});
