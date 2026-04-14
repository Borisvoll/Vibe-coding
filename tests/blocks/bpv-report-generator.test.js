/**
 * Smoke test — confirms the stageverslag generator produces valid output
 * for (a) an empty store and (b) partially filled data + hours.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { initDB, put, clearAllData } from '../../src/db.js';
import { buildReportMarkdown } from '../../src/blocks/bpv-report-generator/markdown.js';

describe('bpv-report-generator: buildReportMarkdown', () => {
  beforeEach(async () => {
    await initDB();
    await clearAllData();
  });

  it('produces a well-formed document for an empty database', async () => {
    const md = await buildReportMarkdown();
    expect(md).toContain('# BPV Stageverslag');
    expect(md).toContain('## Inleiding');
    expect(md).toContain('## Werkzaamheden');
    expect(md).toContain('## Leerdoelen (SMART)');
    expect(md).toContain('## Reflectie');
    expect(md).toContain('## Ontwikkeling');
    expect(md).toContain('## Urenregistratie');
    expect(md).toContain('## Conclusie');
    // Default student data appears in the titelpagina
    expect(md).toContain('Boris Jan Vollebregt');
    expect(md).toContain('10002102');
    expect(md).toContain('Boers en Co.');
    // "Nog geen uren geregistreerd." when hours store is empty
    expect(md).toContain('Nog geen uren geregistreerd');
  });

  it('includes user text as-is and computes hours correctly', async () => {
    // Save one section
    await put('os_report', {
      id: 'bedrijfsbeschrijving',
      data: {
        wat_doet_bedrijf: 'boers en co maakt cnc onderdelen voor de medische sector.',
        afdelingen: 'productie, kwaliteit, expeditie',
        jouw_rol: 'ik werk op de CNC-afdeling',
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Save one hours entry: 08:00–17:00 minus 45 min pauze = 495 min (8u 15m)
    await put('hours', {
      id: 'test-hours-1',
      date: '2026-04-14',
      week: '2026-W16',
      type: 'work',
      startTime: '08:00',
      endTime: '17:00',
      breakMinutes: 45,
      netMinutes: 495,
      note: '',
      activities: ['Draaien', 'Meten', ''],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const md = await buildReportMarkdown();

    // User text kept as-is (with initial capital)
    expect(md).toContain('Boers en co maakt cnc onderdelen voor de medische sector.');
    expect(md).toContain('Productie, kwaliteit, expeditie');
    expect(md).toContain('Ik werk op de CNC-afdeling');

    // Hours table contains the right row + correct net time
    expect(md).toContain('Week 2026-W16');
    expect(md).toContain('14-04');
    expect(md).toContain('08:00–17:00');
    expect(md).toContain('8u 15m');
    // Activities
    expect(md).toContain('Draaien; Meten');
    // Grand total
    expect(md).toContain('**Gewerkte dagen:** 1');
    expect(md).toContain('**Totaal netto tijd:** 8u 15m');
  });

  it('handles missing netMinutes by recomputing from start/end/break', async () => {
    await put('hours', {
      id: 'test-hours-2',
      date: '2026-04-15',
      week: '2026-W16',
      type: 'work',
      startTime: '09:00',
      endTime: '17:30',
      breakMinutes: 30,
      // netMinutes deliberately omitted
      activities: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const md = await buildReportMarkdown();
    // 09:00–17:30 = 510 min − 30 pauze = 480 min = 8u
    expect(md).toContain('8u');
    expect(md).toContain('09:00–17:30');
  });
});
