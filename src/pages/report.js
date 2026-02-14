import { getAll, getAllHoursSorted, getAllLogbookSorted, getSetting } from '../db.js';
import { icon } from '../icons.js';
import {
  formatMinutes, formatDateRef, formatDateShort, getWeeksInBPV,
  weekNumber, formatHoursDecimal
} from '../utils.js';
import { COMPETENCY_LEVELS, WEEKLY_GOAL_HOURS, BPV_START, BPV_END } from '../constants.js';

export function createPage(container) {

  async function render() {
    const hours = await getAllHoursSorted();
    const logbook = await getAllLogbookSorted();
    const competencies = await getAll('competencies');
    const assignments = await getAll('assignments');

    const leerdoelen = assignments.find(a => a.type === 'leerdoelen');
    const productgericht = assignments.find(a => a.type === 'productgericht');
    const reflectie = assignments.find(a => a.type === 'reflectie');

    // Hours aggregation
    const totalMinutes = hours.filter(h => h.type === 'work').reduce((s, h) => s + (h.netMinutes || 0), 0);
    const weeks = getWeeksInBPV();
    const weekTotals = weeks.map(w => {
      const wEntries = hours.filter(h => h.week === w && h.type === 'work');
      return { week: w, minutes: wEntries.reduce((s, h) => s + (h.netMinutes || 0), 0) };
    });
    const avgMinutes = weeks.length > 0 ? Math.round(totalMinutes / weeks.length) : 0;

    // Group competencies by category
    const compGrouped = {};
    competencies.forEach(c => {
      const cat = c.category || 'Overig';
      if (!compGrouped[cat]) compGrouped[cat] = [];
      compGrouped[cat].push(c);
    });

    // Select logbook entries for appendix (up to 12)
    const appendixLogs = logbook.slice(0, 12);

    container.innerHTML = `
      <div class="report-controls no-print">
        <button class="btn btn-primary" data-action="print">
          ${icon('printer', 16)} Print / PDF
        </button>
        <span style="color:var(--color-text-secondary); font-size:0.875rem">
          Gebruik de browser print-functie (Ctrl+P) om een PDF te maken
        </span>
      </div>

      <div class="report-preview">
        <!-- 1. Voorblad -->
        <h1>BPV Stageverslag</h1>
        <table>
          <tr><td><strong>Student</strong></td><td>${ph('naam student')}</td></tr>
          <tr><td><strong>Opleiding</strong></td><td>${ph('opleiding')}</td></tr>
          <tr><td><strong>Bedrijf</strong></td><td>${ph('bedrijfsnaam')}</td></tr>
          <tr><td><strong>Periode</strong></td><td>${BPV_START} t/m ${BPV_END}</td></tr>
          <tr><td><strong>Begeleider</strong></td><td>${ph('naam/rol begeleider')}</td></tr>
          <tr><td><strong>Datum</strong></td><td>${new Date().toLocaleDateString('nl-NL')}</td></tr>
        </table>

        <!-- 2. Bedrijfsorientatie -->
        <h2>2. Bedrijfsorientatie</h2>
        ${field(leerdoelen, 'bedrijfsbeschrijving', 'Beschrijf het bedrijf, producten/diensten, workflow en jouw plek daarin.')}

        <!-- 3. Persoonlijke leerdoelen (SMART) -->
        <h2>3. Persoonlijke leerdoelen</h2>
        ${field(leerdoelen, 'motivatie', 'Motivatie voor de stageplaats')}
        <h3>Leerdoel 1</h3>
        ${field(leerdoelen, 'leerdoel1', 'SMART leerdoel 1')}
        <h3>Leerdoel 2</h3>
        ${field(leerdoelen, 'leerdoel2', 'SMART leerdoel 2')}
        <h3>Leerdoel 3</h3>
        ${field(leerdoelen, 'leerdoel3', 'SMART leerdoel 3')}
        ${leerdoelen?.fields?.leerdoel4 ? `<h3>Leerdoel 4</h3>${field(leerdoelen, 'leerdoel4', '')}` : ''}
        ${leerdoelen?.fields?.leerdoel5 ? `<h3>Leerdoel 5</h3>${field(leerdoelen, 'leerdoel5', '')}` : ''}

        <!-- 4. Werkzaamheden & Productgericht werken -->
        <h2>4. Werkzaamheden & Productgericht werken</h2>

        <h3>4.1 Project / Werkzaamheid 1</h3>
        ${field(productgericht, 'project1_beschrijving', 'Beschrijving van het project, processtappen')}
        <p><strong>Machines & materialen:</strong> ${field(productgericht, 'project1_middelen', 'machines, gereedschappen, materialen')}</p>
        <p><strong>Kwaliteitscontrole & resultaat:</strong> ${field(productgericht, 'project1_kwaliteit', 'meetmethoden, toleranties, resultaat')}</p>

        ${productgericht?.fields?.project2_beschrijving ? `
          <h3>4.2 Project / Werkzaamheid 2</h3>
          ${field(productgericht, 'project2_beschrijving', '')}
          <p><strong>Machines & materialen:</strong> ${field(productgericht, 'project2_middelen', '')}</p>
          <p><strong>Kwaliteitscontrole & resultaat:</strong> ${field(productgericht, 'project2_kwaliteit', '')}</p>
        ` : ''}

        <h3>4.${productgericht?.fields?.project2_beschrijving ? '3' : '2'} Verbetering</h3>
        ${field(productgericht, 'verbetering', 'Oorzaak, voorstel, risico/impact, KPI/meetmethode')}

        <h3>Product / Process Description (English)</h3>
        ${field(productgericht, 'engelse_uitleg', 'Write a 120-180 word description of a product or process in English.')}

        <!-- 5. Competentieontwikkeling -->
        <h2>5. Competentieontwikkeling</h2>
        ${competencies.length === 0 ? ph('Vul de leermeter in om competenties te tonen') : `
          <table>
            <thead>
              <tr>
                <th>Competentie</th>
                <th>Niveau</th>
                <th>Toelichting</th>
              </tr>
            </thead>
            <tbody>
              ${competencies.map(c => `
                <tr>
                  <td>${c.name}</td>
                  <td>${COMPETENCY_LEVELS[c.level ?? 0]}</td>
                  <td>${c.notes || '—'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        `}

        <!-- 6. Urenverantwoording -->
        <h2>6. Urenverantwoording</h2>
        <p><strong>Totaal gewerkte uren:</strong> ${formatMinutes(totalMinutes)} (${formatHoursDecimal(totalMinutes)} uur)</p>
        <p><strong>Periode:</strong> ${BPV_START} t/m ${BPV_END}</p>
        <p><strong>Weekgemiddelde:</strong> ${formatMinutes(avgMinutes)}</p>
        <table>
          <thead>
            <tr>
              <th>Week</th>
              <th>Uren</th>
              <th>Doel</th>
            </tr>
          </thead>
          <tbody>
            ${weekTotals.map(w => `
              <tr>
                <td>Week ${weekNumber(w.week)}</td>
                <td>${formatMinutes(w.minutes)}</td>
                <td>${WEEKLY_GOAL_HOURS}u</td>
              </tr>
            `).join('')}
            <tr style="font-weight:600">
              <td>Totaal</td>
              <td>${formatMinutes(totalMinutes)}</td>
              <td>${formatMinutes(weeks.length * WEEKLY_GOAL_HOURS * 60)}</td>
            </tr>
          </tbody>
        </table>

        <!-- 7. Reflectie -->
        <h2>7. Reflectie</h2>
        ${reflectie ? `
          <p><strong>Wat ging goed:</strong> ${reflectie.fields?.wat_goed || ph('invullen')}</p>
          <p><strong>Wat was lastig:</strong> ${reflectie.fields?.wat_lastig || ph('invullen')}</p>
          <p><strong>Hoe ermee omgegaan:</strong> ${reflectie.fields?.hoe_omgegaan || ph('invullen')}</p>
          <p><strong>Wat geleerd:</strong> ${reflectie.fields?.wat_geleerd || ph('invullen')}</p>
          <p><strong>Wat meenemen:</strong> ${reflectie.fields?.wat_meenemen || ph('invullen')}</p>
          <p><strong>Wat verdiepen:</strong> ${reflectie.fields?.wat_verdiepen || ph('invullen')}</p>
        ` : ph('Vul eerst de reflectie-opdracht in via de opdrachten-module')}

        <!-- 8. Bijlagen -->
        <h2>8. Bijlagen</h2>
        <h3>Selectie daglogboek</h3>
        ${appendixLogs.length === 0 ? ph('Nog geen logboek entries') : `
          ${appendixLogs.map(log => `
            <div style="margin-bottom:var(--space-4); padding-bottom:var(--space-4); border-bottom:1px solid var(--color-border-light)">
              <p><strong>${formatDateShort(log.date)}</strong> ${formatDateRef(log.date)}</p>
              <p>${log.description}</p>
              ${log.machines ? `<p><em>Machines/materialen:</em> ${log.machines}</p>` : ''}
              ${log.learnings ? `<p><em>Leerpunten:</em> ${log.learnings}</p>` : ''}
              ${(log.tags && log.tags.length) ? `<p><em>Tags:</em> ${log.tags.join(', ')}</p>` : ''}
            </div>
          `).join('')}
        `}
      </div>
    `;

    // Print button
    container.querySelector('[data-action="print"]')?.addEventListener('click', () => {
      window.print();
    });
  }

  function ph(text) {
    return `<span class="report-placeholder">[NOG INVULLEN: ${text}]</span>`;
  }

  function field(assignment, key, fallbackText) {
    const val = assignment?.fields?.[key];
    if (val && val.trim()) {
      return `<p>${val}</p>`;
    }
    return ph(fallbackText || key);
  }

  render();
  return {};
}
