import { getAll, getAllHoursSorted, getAllLogbookSorted, getSetting } from '../db.js';
import { icon } from '../icons.js';
import { navigate } from '../router.js';
import {
  formatMinutes, formatDateRef, formatDateShort, getWeeksInBPV,
  weekNumber, formatHoursDecimal, escapeHTML
} from '../utils.js';
import { COMPETENCY_LEVELS, WEEKLY_GOAL_HOURS, BPV_START, BPV_END } from '../constants.js';

const BPV_TOTAL_REQUIRED_HOURS = 440;

export function createPage(container) {

  async function render() {
    // Load all data sources
    const hours = await getAllHoursSorted();
    const logbook = await getAllLogbookSorted();
    const competencies = await getAll('competencies');
    const assignments = await getAll('assignments');
    const goals = await getAll('goals');
    const quality = await getAll('quality');
    const learningMoments = (await getAll('learningMoments')).sort((a, b) => b.date.localeCompare(a.date));
    const weekReviews = (await getAll('weekReviews')).sort((a, b) => a.week.localeCompare(b.week));

    // New structured BPV data
    const bpvLeerdoelen = (await getAll('bpvLeerdoelen')).sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));
    const bpvProducten = (await getAll('bpvProducten')).sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));
    const bpvReflecties = (await getAll('bpvReflecties')).sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));
    const bpvBedrijfRecords = await getAll('bpvBedrijf');
    const bpvBedrijf = bpvBedrijfRecords[0] || null;

    const studentName = await getSetting('studentName') || await getSetting('user_name') || '';
    const schoolName = await getSetting('schoolName') || '';
    const companyName = await getSetting('companyName') || await getSetting('company_name') || '';
    const supervisorName = await getSetting('supervisorName') || '';

    // Legacy assignment data (fallback)
    const leerdoelen = assignments.find(a => a.type === 'leerdoelen');
    const productgericht = assignments.find(a => a.type === 'productgericht');
    const reflectie = assignments.find(a => a.type === 'reflectie');

    // Decide data source: use new structured data if available, fall back to legacy
    const hasNewBedrijf = bpvBedrijf?.beschrijving?.trim();
    const hasNewLeerdoelen = bpvLeerdoelen.length > 0;
    const hasNewProducten = bpvProducten.length > 0;
    const hasNewReflecties = bpvReflecties.length > 0;

    // Hours aggregation
    const totalMinutes = hours.filter(h => h.type === 'work').reduce((s, h) => s + (h.netMinutes || 0), 0);
    const weeks = getWeeksInBPV();
    const weekTotals = weeks.map(w => {
      const wEntries = hours.filter(h => h.week === w && h.type === 'work');
      return { week: w, minutes: wEntries.reduce((s, h) => s + (h.netMinutes || 0), 0) };
    });
    const avgMinutes = weeks.length > 0 ? Math.round(totalMinutes / weeks.length) : 0;
    const progressPct = Math.min(100, Math.round((totalMinutes / 60 / BPV_TOTAL_REQUIRED_HOURS) * 100));

    // Group competencies by category
    const compGrouped = {};
    competencies.forEach(c => {
      const cat = c.category || 'Overig';
      if (!compGrouped[cat]) compGrouped[cat] = [];
      compGrouped[cat].push(c);
    });

    const appendixLogs = logbook.slice(0, 15);

    // Progress checklist
    const checks = [
      { label: 'Uren geregistreerd', ok: hours.length > 0, link: 'hours' },
      { label: 'Logboek entries', ok: logbook.length > 0, link: 'logbook' },
      { label: 'Bedrijfsbeschrijving', ok: !!(hasNewBedrijf || leerdoelen?.fields?.bedrijfsbeschrijving?.trim()), link: 'bpv-opdrachten' },
      { label: 'SMART leerdoelen', ok: hasNewLeerdoelen || !!leerdoelen?.fields?.leerdoel1?.trim(), link: 'bpv-opdrachten' },
      { label: 'Werkzaamheden beschreven', ok: hasNewProducten || !!productgericht?.fields?.project1_beschrijving?.trim(), link: 'bpv-opdrachten' },
      { label: 'Competenties ingevuld', ok: competencies.length > 0, link: 'competencies' },
      { label: 'Kwaliteitsplannen', ok: quality.length > 0, link: 'quality' },
      { label: 'Leermomenten', ok: learningMoments.length > 0, link: 'learning-moments' },
      { label: 'Weekreviews', ok: weekReviews.length > 0, link: 'planning' },
      { label: 'Reflectie', ok: hasNewReflecties || !!reflectie?.fields?.wat_goed?.trim(), link: 'bpv-opdrachten' },
      { label: 'Engelse beschrijving', ok: bpvProducten.some(p => p.engelsToelichting?.trim()) || !!productgericht?.fields?.engelse_uitleg?.trim(), link: 'bpv-opdrachten' },
    ];
    const checksDone = checks.filter(c => c.ok).length;
    const checksPct = Math.round((checksDone / checks.length) * 100);

    container.innerHTML = `
      <div class="report-controls no-print">
        <div style="display:flex; gap:var(--space-3); align-items:center; flex-wrap:wrap">
          <button class="btn btn-primary" data-action="print">
            ${icon('printer', 16)} Print / PDF
          </button>
          <span style="color:var(--color-text-secondary); font-size:0.875rem">
            Ctrl+P om PDF te maken
          </span>
        </div>
      </div>

      <!-- Progress checklist -->
      <div class="card no-print" style="margin-bottom:var(--space-6)">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:var(--space-4)">
          <h3>Voortgang verslag</h3>
          <span style="font-weight:600; color:${checksPct === 100 ? 'var(--color-success)' : checksPct >= 60 ? 'var(--color-accent)' : 'var(--color-warning)'}">
            ${checksDone}/${checks.length} (${checksPct}%)
          </span>
        </div>
        <div class="progress-bar" style="margin-bottom:var(--space-4)">
          <div class="progress-bar-fill ${checksPct === 100 ? 'emerald' : checksPct >= 60 ? 'blue' : 'amber'}" style="width:${checksPct}%"></div>
        </div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:var(--space-2)">
          ${checks.map(c => `
            <div style="display:flex; align-items:center; gap:var(--space-2); font-size:0.875rem; padding:var(--space-1) 0">
              <span style="color:${c.ok ? 'var(--color-success)' : 'var(--color-text-tertiary)'}">
                ${c.ok ? '&#10003;' : '&#9675;'}
              </span>
              <span style="flex:1; color:${c.ok ? 'var(--color-text)' : 'var(--color-text-secondary)'}">${c.label}</span>
              ${!c.ok ? `<a href="#${c.link}" class="btn btn-ghost btn-sm" style="font-size:0.75rem; padding:2px 8px" data-nav="${c.link}">invullen</a>` : ''}
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Voorblad gegevens -->
      <div class="card no-print" style="margin-bottom:var(--space-6)">
        <h3 style="margin-bottom:var(--space-4)">Voorblad gegevens</h3>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:var(--space-3)">
          <div class="form-group">
            <label class="form-label" for="rp-student">Student</label>
            <input type="text" id="rp-student" class="form-input" value="${escapeHTML(studentName)}" placeholder="Je naam">
          </div>
          <div class="form-group">
            <label class="form-label" for="rp-school">Opleiding</label>
            <input type="text" id="rp-school" class="form-input" value="${escapeHTML(schoolName)}" placeholder="Opleiding / school">
          </div>
          <div class="form-group">
            <label class="form-label" for="rp-company">Bedrijf</label>
            <input type="text" id="rp-company" class="form-input" value="${escapeHTML(companyName)}" placeholder="Bedrijfsnaam">
          </div>
          <div class="form-group">
            <label class="form-label" for="rp-supervisor">Begeleider</label>
            <input type="text" id="rp-supervisor" class="form-input" value="${escapeHTML(supervisorName)}" placeholder="Naam begeleider">
          </div>
        </div>
      </div>

      <!-- REPORT PREVIEW -->
      <div class="report-preview">
        <!-- 1. Voorblad -->
        <h1>BPV Stageverslag</h1>
        <table>
          <tr><td><strong>Student</strong></td><td>${studentName || ph('naam student')}</td></tr>
          <tr><td><strong>Opleiding</strong></td><td>${schoolName || ph('opleiding')}</td></tr>
          <tr><td><strong>Bedrijf</strong></td><td>${companyName || ph('bedrijfsnaam')}</td></tr>
          <tr><td><strong>Periode</strong></td><td>${BPV_START} t/m ${BPV_END}</td></tr>
          <tr><td><strong>Begeleider</strong></td><td>${supervisorName || ph('naam begeleider')}</td></tr>
          <tr><td><strong>Datum</strong></td><td>${new Date().toLocaleDateString('nl-NL')}</td></tr>
        </table>

        <!-- 2. Bedrijfsorientatie -->
        <h2>2. Bedrijfsorientatie</h2>
        ${hasNewBedrijf ? `
          <h3>Bedrijfsbeschrijving</h3>
          <p>${escapeHTML(bpvBedrijf.beschrijving)}</p>
          ${bpvBedrijf.processen?.trim() ? `
            <h3>Bedrijfsprocessen</h3>
            <p>${escapeHTML(bpvBedrijf.processen)}</p>
          ` : ''}
          ${bpvBedrijf.competenties?.trim() ? `
            <h3>Beroepscompetenties</h3>
            <p>${escapeHTML(bpvBedrijf.competenties)}</p>
          ` : ''}
        ` : field(leerdoelen, 'bedrijfsbeschrijving', 'Beschrijf het bedrijf via BPV Opdrachten → Leerdoelen')}

        <!-- 3. Persoonlijke leerdoelen (SMART) -->
        <h2>3. Persoonlijke leerdoelen</h2>
        ${hasNewLeerdoelen ? `
          ${bpvLeerdoelen.map((ld, i) => `
            <h3>Leerdoel ${i + 1}: ${escapeHTML(ld.competentie || '')}</h3>
            <table>
              <tr><td style="width:100px"><strong>Specifiek</strong></td><td>${escapeHTML(ld.specifiek || '—')}</td></tr>
              <tr><td><strong>Meetbaar</strong></td><td>${escapeHTML(ld.meetbaar || '—')}</td></tr>
              <tr><td><strong>Acceptabel</strong></td><td>${escapeHTML(ld.acceptabel || '—')}</td></tr>
              <tr><td><strong>Realistisch</strong></td><td>${escapeHTML(ld.realistisch || '—')}</td></tr>
              <tr><td><strong>Tijdgebonden</strong></td><td>${escapeHTML(ld.tijdgebonden || '—')}</td></tr>
            </table>
            ${ld.motivatie?.trim() ? `<p><strong>Motivatie:</strong> ${escapeHTML(ld.motivatie)}</p>` : ''}
            <p><strong>Status:</strong> ${ld.status === 'behaald' ? 'Behaald' : ld.status === 'niet_behaald' ? 'Niet behaald' : 'In uitvoering'}
            ${ld.evidence?.trim() ? ` — <em>Bewijs: ${escapeHTML(ld.evidence)}</em>` : ''}</p>
          `).join('')}
        ` : `
          ${field(leerdoelen, 'motivatie', 'Motivatie voor de stageplaats')}
          <h3>Leerdoel 1</h3>
          ${field(leerdoelen, 'leerdoel1', 'SMART leerdoel 1')}
          <h3>Leerdoel 2</h3>
          ${field(leerdoelen, 'leerdoel2', 'SMART leerdoel 2')}
          <h3>Leerdoel 3</h3>
          ${field(leerdoelen, 'leerdoel3', 'SMART leerdoel 3')}
          ${leerdoelen?.fields?.leerdoel4 ? `<h3>Leerdoel 4</h3>${field(leerdoelen, 'leerdoel4', '')}` : ''}
          ${leerdoelen?.fields?.leerdoel5 ? `<h3>Leerdoel 5</h3>${field(leerdoelen, 'leerdoel5', '')}` : ''}
        `}

        ${goals.length > 0 && !hasNewLeerdoelen ? `
          <h3>SMART Leerdoelen (voortgang)</h3>
          <table>
            <thead><tr><th>Leerdoel</th><th>Status</th><th>Bewijs</th></tr></thead>
            <tbody>
              ${goals.map(g => `
                <tr>
                  <td><strong>${escapeHTML(g.title)}</strong></td>
                  <td>${g.status === 'behaald' ? 'Behaald' : g.status === 'loopt' ? 'Loopt' : 'Gestart'}</td>
                  <td>${escapeHTML(g.bewijs || '\u2014')}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        ` : ''}

        <!-- 4. Werkzaamheden & Productgericht werken -->
        <h2>4. Werkzaamheden & Productgericht werken</h2>
        ${hasNewProducten ? `
          ${bpvProducten.map((pr, i) => `
            <h3>4.${i + 1} ${escapeHTML(pr.projectNaam || 'Project ' + (i + 1))}</h3>
            ${pr.procesStappen?.trim() ? `
              <p><strong>Processtappen:</strong></p>
              <p>${escapeHTML(pr.procesStappen)}</p>
            ` : ''}
            ${pr.machines?.trim() ? `<p><strong>Machines & gereedschappen:</strong> ${escapeHTML(pr.machines)}</p>` : ''}
            ${pr.materialen?.trim() ? `<p><strong>Materialen:</strong> ${escapeHTML(pr.materialen)}</p>` : ''}
            ${pr.assemblage?.trim() ? `<p><strong>Assemblage:</strong> ${escapeHTML(pr.assemblage)}</p>` : ''}
            ${pr.testMethode?.trim() ? `<p><strong>Kwaliteitscontrole:</strong> ${escapeHTML(pr.testMethode)}</p>` : ''}
            ${pr.verbeterpunten?.trim() ? `
              <h4>Verbeterpunten</h4>
              <p>${escapeHTML(pr.verbeterpunten)}</p>
            ` : ''}
            ${pr.risicos?.trim() ? `<p><strong>Risico's:</strong> ${escapeHTML(pr.risicos)}</p>` : ''}
            ${pr.kpis?.trim() ? `<p><strong>KPI's:</strong> ${escapeHTML(pr.kpis)}</p>` : ''}
            ${pr.engelsToelichting?.trim() ? `
              <h4>Product/Process Description (English)</h4>
              <p><em>${escapeHTML(pr.engelsToelichting)}</em></p>
            ` : ''}
          `).join('')}
        ` : `
          <h3>4.1 Project / Werkzaamheid 1</h3>
          ${field(productgericht, 'project1_beschrijving', 'Beschrijving van het project, processtappen')}
          <p><strong>Machines & materialen:</strong> ${fieldInline(productgericht, 'project1_middelen', 'machines, gereedschappen, materialen')}</p>
          <p><strong>Kwaliteitscontrole & resultaat:</strong> ${fieldInline(productgericht, 'project1_kwaliteit', 'meetmethoden, toleranties, resultaat')}</p>
          ${productgericht?.fields?.project2_beschrijving ? `
            <h3>4.2 Project / Werkzaamheid 2</h3>
            ${field(productgericht, 'project2_beschrijving', '')}
            <p><strong>Machines & materialen:</strong> ${fieldInline(productgericht, 'project2_middelen', '')}</p>
            <p><strong>Kwaliteitscontrole & resultaat:</strong> ${fieldInline(productgericht, 'project2_kwaliteit', '')}</p>
          ` : ''}
          <h3>Verbetering</h3>
          ${field(productgericht, 'verbetering', 'Oorzaak, voorstel, risico/impact, KPI/meetmethode')}
          <h3>Product / Process Description (English)</h3>
          ${field(productgericht, 'engelse_uitleg', 'Write a 120-180 word description of a product or process in English.')}
        `}

        <!-- 5. Competentieontwikkeling -->
        <h2>5. Competentieontwikkeling</h2>
        ${competencies.length === 0 ? ph('Vul de leermeter in om competenties te tonen') : `
          ${Object.entries(compGrouped).map(([cat, comps]) => `
            <h3>${escapeHTML(cat)}</h3>
            <table>
              <thead><tr><th>Competentie</th><th>Niveau</th><th>Toelichting</th></tr></thead>
              <tbody>
                ${comps.map(c => `
                  <tr>
                    <td>${escapeHTML(c.name)}</td>
                    <td>${COMPETENCY_LEVELS[c.level ?? 0]}</td>
                    <td>${escapeHTML(c.notes || '\u2014')}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          `).join('')}
        `}

        ${quality.length > 0 ? `
          <h2>5b. Kwaliteitsborging</h2>
          ${quality.map(q => `
            <div style="margin-bottom:var(--space-4)">
              <h3>${escapeHTML(q.title || 'Meetplan')}</h3>
              ${q.dimension ? `<p><strong>Maat/dimensie:</strong> ${escapeHTML(q.dimension)}</p>` : ''}
              ${q.tolerance ? `<p><strong>Tolerantie:</strong> ${escapeHTML(q.tolerance)}</p>` : ''}
              ${q.instrument ? `<p><strong>Meetinstrument:</strong> ${escapeHTML(q.instrument)}</p>` : ''}
              ${q.method ? `<p><strong>Methode:</strong> ${escapeHTML(q.method)}</p>` : ''}
              ${q.result ? `<p><strong>Resultaat:</strong> ${escapeHTML(q.result)}</p>` : ''}
            </div>
          `).join('')}
        ` : ''}

        <!-- 6. Urenverantwoording -->
        <h2>6. Urenverantwoording</h2>
        <p><strong>Totaal gewerkte uren:</strong> ${formatMinutes(totalMinutes)} (${formatHoursDecimal(totalMinutes)} uur)</p>
        <p><strong>Periode:</strong> ${BPV_START} t/m ${BPV_END}</p>
        <p><strong>Weekgemiddelde:</strong> ${formatMinutes(avgMinutes)}</p>
        <p><strong>Voortgang:</strong> ${progressPct}% van ${BPV_TOTAL_REQUIRED_HOURS} verplichte uren</p>
        <table>
          <thead><tr><th>Week</th><th>Uren</th><th>Doel</th></tr></thead>
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

        ${weekReviews.length > 0 ? `
          <h2>6b. Weekreviews</h2>
          <table>
            <thead><tr><th>Week</th><th>Goed</th><th>Lastig</th><th>Focus</th></tr></thead>
            <tbody>
              ${weekReviews.map(r => `
                <tr>
                  <td>W${weekNumber(r.week)}</td>
                  <td>${escapeHTML(r.goed || '\u2014')}</td>
                  <td>${escapeHTML(r.lastig || '\u2014')}</td>
                  <td>${escapeHTML(r.focus || '\u2014')}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        ` : ''}

        ${learningMoments.length > 0 ? `
          <h2>6c. Fouten & Leermomenten</h2>
          ${learningMoments.slice(0, 10).map(m => `
            <div style="margin-bottom:var(--space-3); padding-bottom:var(--space-3); border-bottom:1px solid var(--color-border-light)">
              <p><strong>${formatDateShort(m.date)}</strong> \u2014 ${escapeHTML(m.what || '')}</p>
              ${m.cause ? `<p style="font-size:0.875rem"><em>Oorzaak:</em> ${escapeHTML(m.cause)}</p>` : ''}
              ${m.adjustment ? `<p style="font-size:0.875rem"><em>Aanpassing:</em> ${escapeHTML(m.adjustment)}</p>` : ''}
              ${m.prevention ? `<p style="font-size:0.875rem"><em>Preventie:</em> ${escapeHTML(m.prevention)}</p>` : ''}
            </div>
          `).join('')}
        ` : ''}

        <!-- 7. Reflectie -->
        <h2>7. Reflectie</h2>
        ${hasNewReflecties ? `
          ${bpvReflecties.map((rf, i) => `
            ${bpvReflecties.length > 1 ? `<h3>Reflectie: ${escapeHTML(rf.periode || 'Periode ' + (i + 1))}</h3>` : ''}
            ${rf.watGingGoed?.trim() ? `<p><strong>Wat ging goed:</strong> ${escapeHTML(rf.watGingGoed)}</p>` : ''}
            ${rf.watKanBeter?.trim() ? `<p><strong>Wat kan beter:</strong> ${escapeHTML(rf.watKanBeter)}</p>` : ''}
            ${rf.leerdoelenStatus?.length > 0 ? `
              <p><strong>Leerdoelen voortgang:</strong></p>
              <ul>
                ${rf.leerdoelenStatus.filter(ls => ls.note?.trim()).map(ls => `
                  <li><strong>${escapeHTML(ls.competentie || 'Leerdoel')}:</strong> ${escapeHTML(ls.note)}</li>
                `).join('')}
              </ul>
            ` : ''}
            ${rf.feedbackBegeleider?.trim() ? `<p><strong>Feedback begeleider:</strong> ${escapeHTML(rf.feedbackBegeleider)}</p>` : ''}
            ${rf.toekomstfocus?.trim() ? `<p><strong>Toekomstfocus:</strong> ${escapeHTML(rf.toekomstfocus)}</p>` : ''}
          `).join('')}
        ` : reflectie ? `
          ${reflField(reflectie, 'wat_goed', 'Wat ging goed')}
          ${reflField(reflectie, 'wat_lastig', 'Wat was lastig')}
          ${reflField(reflectie, 'hoe_omgegaan', 'Hoe ermee omgegaan')}
          ${reflField(reflectie, 'wat_geleerd', 'Wat geleerd')}
          ${reflField(reflectie, 'wat_meenemen', 'Wat meenemen')}
          ${reflField(reflectie, 'wat_verdiepen', 'Wat verdiepen')}
        ` : ph('Vul reflecties in via BPV Opdrachten → Reflectie')}

        <!-- 8. Bijlagen -->
        <h2>8. Bijlagen</h2>
        <h3>Selectie daglogboek (${appendixLogs.length} van ${logbook.length})</h3>
        ${appendixLogs.length === 0 ? ph('Nog geen logboek entries') : `
          ${appendixLogs.map(log => `
            <div style="margin-bottom:var(--space-4); padding-bottom:var(--space-4); border-bottom:1px solid var(--color-border-light)">
              <p><strong>${formatDateShort(log.date)}</strong> ${formatDateRef(log.date)}</p>
              <p>${escapeHTML(log.description || '')}</p>
              ${log.machines ? `<p><em>Machines/materialen:</em> ${escapeHTML(log.machines)}</p>` : ''}
              ${log.learnings ? `<p><em>Leerpunten:</em> ${escapeHTML(log.learnings)}</p>` : ''}
              ${(log.tags && log.tags.length) ? `<p><em>Tags:</em> ${log.tags.join(', ')}</p>` : ''}
            </div>
          `).join('')}
        `}
      </div>
    `;

    // Print button
    container.querySelector('[data-action="print"]')?.addEventListener('click', () => window.print());

    // Quick-nav links
    container.querySelectorAll('[data-nav]').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        navigate(link.dataset.nav);
      });
    });

    // Auto-save cover fields
    const coverFields = [
      { id: 'rp-student', key: 'studentName' },
      { id: 'rp-school', key: 'schoolName' },
      { id: 'rp-company', key: 'companyName' },
      { id: 'rp-supervisor', key: 'supervisorName' },
    ];
    let saveTimer;
    coverFields.forEach(f => {
      const el = container.querySelector(`#${f.id}`);
      if (el) {
        el.addEventListener('input', () => {
          clearTimeout(saveTimer);
          saveTimer = setTimeout(async () => {
            const { setSetting } = await import('../db.js');
            for (const ff of coverFields) {
              const val = container.querySelector(`#${ff.id}`)?.value || '';
              await setSetting(ff.key, val);
            }
          }, 500);
        });
      }
    });
  }

  function ph(text) {
    return `<span class="report-placeholder">[${text}]</span>`;
  }

  function field(assignment, key, fallbackText) {
    const val = assignment?.fields?.[key];
    if (val && val.trim()) return `<p>${escapeHTML(val)}</p>`;
    return ph(fallbackText || key);
  }

  function fieldInline(assignment, key, fallbackText) {
    const val = assignment?.fields?.[key];
    if (val && val.trim()) return escapeHTML(val);
    return ph(fallbackText || key);
  }

  function reflField(assignment, key, label) {
    const val = assignment?.fields?.[key];
    if (val && val.trim()) return `<p><strong>${label}:</strong> ${escapeHTML(val)}</p>`;
    return `<p><strong>${label}:</strong> ${ph('invullen')}</p>`;
  }

  render();
  return {};
}
