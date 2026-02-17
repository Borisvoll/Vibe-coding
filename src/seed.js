import { put, getAll } from './db.js';
import { generateId, getISOWeek } from './utils.js';
import { DEFAULT_COMPETENCIES } from './constants.js';

export async function loadSeedData() {
  // Only seed if empty
  const existingHours = await getAll('hours');
  if (existingHours.length > 0) {
    // Overwrite anyway for demo purposes
  }

  await seedHours();
  await seedLogbook();
  await seedCompetencies();
  await seedAssignments();
}

async function seedHours() {
  const entries = [
    // Week 7 (09-02 t/m 13-02)
    { date: '2026-02-09', type: 'work', startTime: '08:00', endTime: '16:30', breakMinutes: 30 },
    { date: '2026-02-10', type: 'work', startTime: '08:00', endTime: '16:30', breakMinutes: 30 },
    { date: '2026-02-11', type: 'work', startTime: '08:00', endTime: '16:00', breakMinutes: 30 },
    { date: '2026-02-12', type: 'work', startTime: '08:30', endTime: '17:00', breakMinutes: 30 },
    { date: '2026-02-13', type: 'work', startTime: '08:00', endTime: '16:30', breakMinutes: 30 },
    // Week 8 (16-02 t/m 20-02)
    { date: '2026-02-16', type: 'work', startTime: '08:00', endTime: '16:30', breakMinutes: 30 },
    { date: '2026-02-17', type: 'sick', startTime: null, endTime: null, breakMinutes: 0 },
    { date: '2026-02-18', type: 'sick', startTime: null, endTime: null, breakMinutes: 0 },
    { date: '2026-02-19', type: 'work', startTime: '08:00', endTime: '16:30', breakMinutes: 30 },
    { date: '2026-02-20', type: 'work', startTime: '08:00', endTime: '16:00', breakMinutes: 30 },
    // Week 9 (23-02 t/m 27-02)
    { date: '2026-02-23', type: 'work', startTime: '08:00', endTime: '16:30', breakMinutes: 30 },
    { date: '2026-02-24', type: 'work', startTime: '07:30', endTime: '16:00', breakMinutes: 30 },
    { date: '2026-02-25', type: 'work', startTime: '08:00', endTime: '16:30', breakMinutes: 30 },
    { date: '2026-02-26', type: 'work', startTime: '08:00', endTime: '17:00', breakMinutes: 30 },
    { date: '2026-02-27', type: 'work', startTime: '08:00', endTime: '15:30', breakMinutes: 30 },
  ];

  for (const e of entries) {
    const netMinutes = e.type === 'work'
      ? calcNet(e.startTime, e.endTime, e.breakMinutes)
      : 0;

    await put('hours', {
      id: generateId(),
      date: e.date,
      week: getISOWeek(e.date),
      type: e.type,
      startTime: e.startTime,
      endTime: e.endTime,
      breakMinutes: e.breakMinutes,
      netMinutes,
      note: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  }
}

async function seedLogbook() {
  const entries = [
    {
      date: '2026-02-09',
      description: 'Eerste dag op de werkplaats. Rondleiding gehad van de werkplaatsbegeleider. Veiligheidsvoorschriften doorgenomen en persoonlijke beschermingsmiddelen ontvangen (veiligheidsbril, werkschoenen, gehoorbescherming).',
      withWhom: 'Begeleider, collega werkplaats',
      machines: '',
      problems: 'Veel nieuwe informatie in een keer.',
      learnings: 'Overzicht van de werkplaats, nooduitgangen, EHBO-post locatie.',
      tags: ['veiligheid', 'overleg']
    },
    {
      date: '2026-02-10',
      description: 'Kennismaking met de CNC draaibank. Uitleg over het instellen van het nulpunt en het laden van programma\'s. Eerste eenvoudige draaibewerking uitgevoerd onder begeleiding.',
      withWhom: 'Begeleider',
      machines: 'CNC draaibank (Mazak QT-250)',
      problems: 'Nulpunt instellen was even zoeken.',
      learnings: 'Basis CNC-bediening, G-code structuur (G00, G01), nulpunt instellen.',
      tags: ['CNC', 'draaien']
    },
    {
      date: '2026-02-12',
      description: 'Zelfstandig een serie van 20 asbussen gedraaid op de CNC. Tolerantie van 0.05mm moest worden aangehouden. Na meting met micrometer bleken alle maten binnen tolerantie.',
      withWhom: 'Zelfstandig, controle door begeleider',
      machines: 'CNC draaibank, micrometer, schuifmaat',
      problems: 'Bij de eerste 3 stuks moest ik de offsetwaarde aanpassen.',
      learnings: 'Offset-correctie toepassen, serieproductie workflow, meetresultaten loggen.',
      tags: ['CNC', 'draaien', 'meten', 'kwaliteit']
    },
    {
      date: '2026-02-16',
      description: 'Gestart met freeswerk. Uitleg over de 3-assige CNC frees. Eerste proefstuk gefreesd (rechthoekig blokje met 2 kamers). CAM-programma was al aangeleverd.',
      withWhom: 'Begeleider, collega programmeur',
      machines: 'CNC freesmachine (Haas VF-2), meetklok',
      problems: 'Opspanning was niet stabiel genoeg, waardoor er trillingen ontstonden.',
      learnings: 'Belang van juiste opspanning, verschil tussen conventioneel en meelopend frezen.',
      tags: ['CNC', 'frezen']
    },
    {
      date: '2026-02-19',
      description: 'Kwaliteitscontrole uitgevoerd op een serie gedraaide onderdelen. Met schuifmaat en micrometer 50 stuks gecontroleerd. 3 stuks afgekeurd wegens tolerantieoverschrijding.',
      withWhom: 'Kwaliteitsmedewerker',
      machines: 'Schuifmaat (Mitutoyo), micrometer, ruwheidsmeteter',
      problems: 'Twee afgekeurde stuks hadden een braam die ik eerst niet opmerkte.',
      learnings: 'Belang van ontbramen, meetprotocol volgen, registratie van meet-resultaten.',
      tags: ['meten', 'kwaliteit']
    },
    {
      date: '2026-02-23',
      description: 'Vergadering bijgewoond over de planning van een nieuwe order. Geleerd hoe werkopdrachten worden verdeeld en hoe de productie-planning werkt.',
      withWhom: 'Teamleider, productie-planner',
      machines: '',
      problems: '',
      learnings: 'Productie-planning, werkopdracht-systeem, communicatie tussen afdelingen.',
      tags: ['overleg']
    },
    {
      date: '2026-02-24',
      description: 'Conventioneel draaien geoefend op de draaibank. Een as gedraaid met verschillende diameters en een schouder. Handmatig draaien geeft goed gevoel voor het materiaal.',
      withWhom: 'Begeleider',
      machines: 'Conventionele draaibank, schuifmaat',
      problems: 'Oppervlakteruwheid was bij de eerste poging niet goed genoeg (Ra 3.2 i.p.v. Ra 1.6).',
      learnings: 'Snijsnelheid en voeding aanpassen voor betere oppervlaktekwaliteit.',
      tags: ['draaien', 'meten']
    },
    {
      date: '2026-02-26',
      description: 'Onderhoud uitgevoerd aan de CNC draaibank. Smeerpunten gecontroleerd, koelvloeistof bijgevuld, spanen verwijderd. Checklist doorlopen voor dagelijks onderhoud.',
      withWhom: 'Collega onderhoudsmonteur',
      machines: 'CNC draaibank, smeerapparatuur',
      problems: '',
      learnings: 'Dagelijks onderhoud CNC, belang van preventief onderhoud voor nauwkeurigheid.',
      tags: ['onderhoud', 'CNC']
    },
  ];

  for (const e of entries) {
    await put('logbook', {
      id: generateId(),
      date: e.date,
      week: getISOWeek(e.date),
      description: e.description,
      withWhom: e.withWhom,
      machines: e.machines,
      problems: e.problems,
      learnings: e.learnings,
      tags: e.tags,
      photos: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  }
}

async function seedCompetencies() {
  const existing = await getAll('competencies');
  if (existing.length > 0) return;

  const seedLevels = [1, 1, 2, 1, 2, 1, 1, 0, 1, 2, 1, 2];
  const seedNotes = [
    'CNC draaibank zelfstandig kunnen bedienen (10-02)',
    'Meetresultaten controleren en registreren (19-02)',
    'Micrometer en schuifmaat correct gebruiken (19-02)',
    'Eenvoudige werktekeningen lezen (12-02)',
    'Schuifmaat, micrometer, ruwheidsmeteter (19-02)',
    'Samengewerkt bij productieplanning vergadering (23-02)',
    'Duidelijk vragen stellen aan begeleider',
    '',
    'Offset-correctie zelfstandig toegepast (12-02)',
    'Veiligheidsvoorschriften direct goed toegepast (09-02)',
    'Dagplanning bijgehouden in logboek',
    'Elke dag op tijd, afspraken nagekomen',
  ];

  for (let i = 0; i < DEFAULT_COMPETENCIES.length; i++) {
    const def = DEFAULT_COMPETENCIES[i];
    await put('competencies', {
      id: generateId(),
      name: def.name,
      category: def.category,
      level: seedLevels[i] ?? 0,
      notes: seedNotes[i] || '',
      logbookRefs: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  }
}

async function seedAssignments() {
  const existing = await getAll('assignments');
  if (existing.length > 0) return;

  await put('assignments', {
    id: generateId(),
    type: 'leerdoelen',
    title: 'Persoonlijke leerdoelen',
    fields: {
      bedrijfsbeschrijving: 'Het stagebedrijf is een metaalbewerkingsbedrijf gespecialiseerd in precisie-onderdelen voor de machinebouw en automotive. Het bedrijf beschikt over een modern machinepark met CNC draaibanken, CNC freesmachines en conventionele verspaningsmachines. De productie bestaat uit zowel enkelstuks als seriewerk. Mijn werkplek is in de CNC-afdeling waar ik samenwerk met ervaren operators.',
      motivatie: 'Ik heb voor dit bedrijf gekozen omdat ze een breed scala aan verspaningstechnieken aanbieden en een goede naam hebben in de regio voor hun leerbedrijf-begeleiding.',
      leerdoel1: 'Aan het einde van de stage kan ik zelfstandig een CNC draaibank instellen en een serie van minimaal 25 stuks draaien binnen de gevraagde tolerantie (0.05mm). Dit meet ik door middel van een meetrapport per serie.',
      leerdoel2: 'Halverwege de stage kan ik een technische werktekening lezen en de belangrijkste maten, toleranties en oppervlakte-eisen interpreteren. Dit toon ik aan door minimaal 5 werktekeningen correct te hebben uitgelezen.',
      leerdoel3: 'Aan het einde van de stage kan ik een kwaliteitscontrole uitvoeren met micrometer en schuifmaat en de resultaten registreren in het kwaliteitssysteem.',
      leerdoel4: '',
      leerdoel5: '',
    },
    draft: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });
}

function calcNet(start, end, breakMin) {
  if (!start || !end) return 0;
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  return Math.max(0, (eh * 60 + em) - (sh * 60 + sm) - breakMin);
}
