export const BPV_START = '2026-02-09';
export const BPV_END = '2026-04-24';
export const WEEKLY_GOAL_HOURS = 40;
export const DEFAULT_BREAK_MINUTES = 30;

export const TAGS = [
  'CNC', 'draaien', 'frezen', 'meten', 'kwaliteit',
  'boren', 'zagen', 'lassen', 'slijpen', 'tekenen',
  'overleg', 'veiligheid', 'onderhoud', 'assemblage',
  'programmeren', 'anders'
];

export const DAY_TYPES = ['work', 'sick', 'absent', 'holiday'];

export const DAY_TYPE_LABELS = {
  work: 'Gewerkt',
  sick: 'Ziek',
  absent: 'Afwezig',
  holiday: 'Vrij/Feestdag'
};

export const DAY_TYPE_ICONS = {
  work: 'check-circle',
  sick: 'thermometer',
  absent: 'x-circle',
  holiday: 'sun'
};

export const COMPETENCY_LEVELS = [
  'Starter',
  'In ontwikkeling',
  'Gewenst niveau',
  'Gevorderd'
];

export const DEFAULT_COMPETENCIES = [
  { name: 'Vakkennis & vaardigheden', category: 'Vakinhoudelijk' },
  { name: 'Kwaliteitsbewustzijn', category: 'Vakinhoudelijk' },
  { name: 'Machines & gereedschappen', category: 'Vakinhoudelijk' },
  { name: 'Tekeningen lezen', category: 'Vakinhoudelijk' },
  { name: 'Meten & controleren', category: 'Vakinhoudelijk' },
  { name: 'Samenwerken', category: 'Persoonlijk' },
  { name: 'Communicatie', category: 'Persoonlijk' },
  { name: 'Zelfstandigheid', category: 'Persoonlijk' },
  { name: 'Initiatief & probleemoplossing', category: 'Persoonlijk' },
  { name: 'Veilig werken', category: 'Werkhouding' },
  { name: 'Planning & organisatie', category: 'Werkhouding' },
  { name: 'Stiptheid & betrouwbaarheid', category: 'Werkhouding' },
];

export const ASSIGNMENT_TYPES = {
  leerdoelen: {
    label: 'Persoonlijke leerdoelen',
    description: 'SMART leerdoelen + bedrijfsorientatie',
    fields: [
      { key: 'bedrijfsbeschrijving', label: 'Bedrijfsbeschrijving', type: 'textarea', hint: 'Wat doet het bedrijf? Producten, diensten, workflow, jouw plek.' },
      { key: 'motivatie', label: 'Motivatie', type: 'textarea', hint: 'Waarom heb je voor dit bedrijf/deze stage gekozen?' },
      { key: 'leerdoel1', label: 'Leerdoel 1 (SMART)', type: 'textarea', hint: 'Specifiek, Meetbaar, Acceptabel, Realistisch, Tijdgebonden' },
      { key: 'leerdoel2', label: 'Leerdoel 2 (SMART)', type: 'textarea', hint: '' },
      { key: 'leerdoel3', label: 'Leerdoel 3 (SMART)', type: 'textarea', hint: '' },
      { key: 'leerdoel4', label: 'Leerdoel 4 (SMART)', type: 'textarea', hint: 'Optioneel' },
      { key: 'leerdoel5', label: 'Leerdoel 5 (SMART)', type: 'textarea', hint: 'Optioneel' },
    ]
  },
  productgericht: {
    label: 'Productgericht werken & verbeteren',
    description: 'Werkzaamheden, processen, verbeteringen',
    fields: [
      { key: 'project1_beschrijving', label: 'Project/werkzaamheid 1 — beschrijving', type: 'textarea', hint: 'Wat was de opdracht? Welke processtappen?' },
      { key: 'project1_middelen', label: 'Machines, gereedschappen, materialen', type: 'textarea', hint: '' },
      { key: 'project1_kwaliteit', label: 'Kwaliteitscontrole & resultaat', type: 'textarea', hint: 'Hoe gecontroleerd? Toleranties? Meetinstrumenten?' },
      { key: 'project2_beschrijving', label: 'Project/werkzaamheid 2 — beschrijving', type: 'textarea', hint: 'Optioneel' },
      { key: 'project2_middelen', label: 'Machines, gereedschappen, materialen (project 2)', type: 'textarea', hint: '' },
      { key: 'project2_kwaliteit', label: 'Kwaliteitscontrole & resultaat (project 2)', type: 'textarea', hint: '' },
      { key: 'verbetering', label: 'Verbeterpunt', type: 'textarea', hint: 'Oorzaak -> voorstel -> risico/impact -> KPI/meetmethode' },
      { key: 'engelse_uitleg', label: 'Product/process description (English)', type: 'textarea', hint: 'Write 120-180 words in English explaining a product or process.' },
    ]
  },
  reflectie: {
    label: 'Reflectie op de BPV',
    description: 'Terugblik (max 1 A4)',
    fields: [
      { key: 'wat_goed', label: 'Wat ging goed?', type: 'textarea', hint: '' },
      { key: 'wat_lastig', label: 'Wat vond je lastig?', type: 'textarea', hint: '' },
      { key: 'hoe_omgegaan', label: 'Hoe ben je daarmee omgegaan?', type: 'textarea', hint: '' },
      { key: 'wat_geleerd', label: 'Wat heb je geleerd?', type: 'textarea', hint: '' },
      { key: 'wat_meenemen', label: 'Wat neem je mee naar de toekomst?', type: 'textarea', hint: '' },
      { key: 'wat_verdiepen', label: 'Wat wil je nog verdiepen?', type: 'textarea', hint: '' },
    ]
  }
};

export const WEEKDAYS = ['ma', 'di', 'wo', 'do', 'vr'];
export const WEEKDAY_FULL = ['maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag'];
export const MONTHS_NL = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];

export const ACCENT_COLORS = [
  { id: 'blue',   label: 'Blauw',   hex: '#4f6ef7' },
  { id: 'purple', label: 'Paars',   hex: '#8b5cf6' },
  { id: 'green',  label: 'Groen',   hex: '#10b981' },
  { id: 'rose',   label: 'Roze',    hex: '#f43f5e' },
  { id: 'orange', label: 'Oranje',  hex: '#f97316' },
  { id: 'cyan',   label: 'Cyaan',   hex: '#06b6d4' },
  { id: 'indigo', label: 'Indigo',  hex: '#6366f1' },
  { id: 'teal',   label: 'Teal',    hex: '#14b8a6' },
];

export function applyAccentColor(hex) {
  const root = document.documentElement;
  root.style.setProperty('--color-accent', hex);
  root.style.setProperty('--color-accent-light', `color-mix(in srgb, ${hex} 12%, transparent)`);
  root.style.setProperty('--gradient-primary', `linear-gradient(135deg, ${hex}, color-mix(in srgb, ${hex} 80%, black))`);
}
