import { describe, it, expect, beforeEach } from 'vitest';
import { initDB } from '../../src/db.js';
import {
  REPORT_SECTIONS,
  STUDENT_DEFAULTS,
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
    // Titelpagina
    expect(ids).toContain('titelpagina');
    // OP1: Leerdoelen & bedrijfsoriëntatie (5 stappen)
    expect(ids).toContain('bedrijfsbeschrijving');
    expect(ids).toContain('bedrijfsprocessen');
    expect(ids).toContain('competenties');
    expect(ids).toContain('leerdoelen');
    expect(ids).toContain('motivatie');
    // OP2: Productgericht (5 onderdelen)
    expect(ids).toContain('product_machines');
    expect(ids).toContain('product_proces');
    expect(ids).toContain('product_assemblage');
    expect(ids).toContain('product_verbetering');
    expect(ids).toContain('product_engels');
    // OP4: Presentatie
    expect(ids).toContain('presentatie');
    // Reflectie
    expect(ids).toContain('reflectie');
    expect(REPORT_SECTIONS).toHaveLength(13);
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

  it('STUDENT_DEFAULTS contains pre-filled data', () => {
    expect(STUDENT_DEFAULTS.naam).toBe('Boris Jan Vollebregt');
    expect(STUDENT_DEFAULTS.studentnummer).toBe('10002102');
    expect(STUDENT_DEFAULTS.bedrijf).toBe('Boers en Co.');
    expect(STUDENT_DEFAULTS.periode).toContain('t/m');
  });

  it('titelpagina fields have prefill values', () => {
    const titelpagina = REPORT_SECTIONS.find(s => s.id === 'titelpagina');
    expect(titelpagina).toBeDefined();
    const prefilled = titelpagina.fields.filter(f => f.prefill);
    expect(prefilled.length).toBe(4);
    expect(prefilled.find(f => f.key === 'naam').prefill).toBe('Boris Jan Vollebregt');
  });

  it('saveReportSection creates a record', async () => {
    const result = await saveReportSection('bedrijfsbeschrijving', {
      wat_doet_bedrijf: 'Medische componenten',
      afdelingen: 'Draaien, frezen, controle',
      jouw_rol: 'Productie / draaien',
    });
    expect(result.id).toBe('bedrijfsbeschrijving');
    expect(result.data.wat_doet_bedrijf).toBe('Medische componenten');
    expect(result.createdAt).toBeDefined();
    expect(result.updatedAt).toBeDefined();
  });

  it('saveReportSection upserts existing record', async () => {
    const first = await saveReportSection('bedrijfsbeschrijving', { wat_doet_bedrijf: 'v1' });
    const second = await saveReportSection('bedrijfsbeschrijving', { wat_doet_bedrijf: 'v2' });
    expect(second.createdAt).toBe(first.createdAt);
    expect(second.data.wat_doet_bedrijf).toBe('v2');
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
    const section = await getReportSection('bedrijfsbeschrijving');
    expect(section).toBeNull();
  });

  it('getAllReportSections returns all saved sections', async () => {
    await saveReportSection('bedrijfsbeschrijving', { wat_doet_bedrijf: 'Test' });
    await saveReportSection('reflectie', { wat_goed: 'Alles' });
    const all = await getAllReportSections();
    expect(all).toHaveLength(2);
  });

  it('deleteReportSection removes the record', async () => {
    await saveReportSection('bedrijfsbeschrijving', { wat_doet_bedrijf: 'Test' });
    await deleteReportSection('bedrijfsbeschrijving');
    const section = await getReportSection('bedrijfsbeschrijving');
    expect(section).toBeNull();
  });

  it('presentatie section has all 7 questions', () => {
    const pres = REPORT_SECTIONS.find(s => s.id === 'presentatie');
    expect(pres).toBeDefined();
    expect(pres.fields).toHaveLength(7);
    expect(pres.fields[0].key).toBe('wat_doet_bedrijf');
    expect(pres.fields[6].key).toBe('past_bij_jou');
  });

  it('product_engels section has English description field', () => {
    const eng = REPORT_SECTIONS.find(s => s.id === 'product_engels');
    expect(eng).toBeDefined();
    expect(eng.fields[0].key).toBe('english_description');
  });

  describe('getReportProgress', () => {
    it('returns 0% when no data saved', async () => {
      const progress = await getReportProgress();
      expect(progress.filled).toBe(0);
      expect(progress.total).toBeGreaterThan(0);
      expect(progress.percent).toBe(0);
    });

    it('counts filled fields correctly', async () => {
      const section = REPORT_SECTIONS.find(s => s.id === 'bedrijfsbeschrijving');
      const data = {};
      for (const f of section.fields) {
        data[f.key] = 'filled';
      }
      await saveReportSection('bedrijfsbeschrijving', data);

      const progress = await getReportProgress();
      expect(progress.filled).toBe(section.fields.length);
      expect(progress.percent).toBeGreaterThan(0);
    });

    it('ignores empty/whitespace-only values', async () => {
      await saveReportSection('bedrijfsbeschrijving', {
        wat_doet_bedrijf: '  ',
        afdelingen: '',
        jouw_rol: 'filled',
      });

      const progress = await getReportProgress();
      expect(progress.filled).toBe(1);
    });
  });
});
