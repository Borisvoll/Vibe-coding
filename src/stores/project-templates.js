/**
 * Project templates — predefined structures for common project types.
 * Each template includes phases, milestones, and starter tasks.
 * Dates are calculated relative to the creation date.
 */

function daysFromNow(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export const PROJECT_TEMPLATES = [
  {
    id: 'empty',
    label: 'Leeg project',
    description: 'Begin met een schone lei',
    icon: '\uD83D\uDCC4',
    phases: [],
    milestones: [],
    tasks: [],
  },
  {
    id: 'werkstuk',
    label: 'Werkstuk / Verslag',
    description: 'Onderzoek, schrijven, inleveren',
    icon: '\uD83D\uDCDD',
    phases: [
      { title: 'Onderzoek', offsetStart: 0, offsetEnd: 7, color: '#6366f1' },
      { title: 'Schrijven', offsetStart: 7, offsetEnd: 18, color: '#10b981' },
      { title: 'Revisie & afronding', offsetStart: 18, offsetEnd: 24, color: '#f59e0b' },
    ],
    milestones: [
      { title: 'Onderwerp gekozen', offsetDays: 1 },
      { title: 'Eerste versie klaar', offsetDays: 18 },
      { title: 'Inleverdatum', offsetDays: 24 },
    ],
    tasks: [
      'Onderwerp kiezen en goedkeuren',
      'Bronnen verzamelen',
      'Structuur/inhoudsopgave maken',
      'Eerste versie schrijven',
      'Feedback verwerken',
      'Opmaak en referenties checken',
      'Definitieve versie inleveren',
    ],
  },
  {
    id: 'stage',
    label: 'Stage-opdracht',
    description: 'Plan van aanpak t/m eindverslag',
    icon: '\uD83C\uDFE2',
    phases: [
      { title: 'Ori\u00ebntatie', offsetStart: 0, offsetEnd: 5, color: '#6366f1' },
      { title: 'Uitvoering', offsetStart: 5, offsetEnd: 28, color: '#10b981' },
      { title: 'Rapportage', offsetStart: 28, offsetEnd: 35, color: '#f59e0b' },
    ],
    milestones: [
      { title: 'Plan van Aanpak af', offsetDays: 5 },
      { title: 'Halverwege check', offsetDays: 17 },
      { title: 'Eindpresentatie', offsetDays: 35 },
    ],
    tasks: [
      'Plan van Aanpak schrijven',
      'Bedrijf en afdeling in kaart brengen',
      'Leerdoelen formuleren',
      'Wekelijkse logboek bijhouden',
      'Tussentijdse evaluatie plannen',
      'Eindverslag schrijven',
      'Presentatie voorbereiden',
    ],
  },
  {
    id: 'presentatie',
    label: 'Presentatie',
    description: 'Voorbereiding, slides, oefenen',
    icon: '\uD83C\uDFA4',
    phases: [
      { title: 'Onderzoek & opzet', offsetStart: 0, offsetEnd: 4, color: '#6366f1' },
      { title: 'Slides maken', offsetStart: 4, offsetEnd: 8, color: '#10b981' },
      { title: 'Oefenen', offsetStart: 8, offsetEnd: 10, color: '#8b5cf6' },
    ],
    milestones: [
      { title: 'Structuur vastgelegd', offsetDays: 2 },
      { title: 'Slides klaar', offsetDays: 8 },
      { title: 'Presentatiedatum', offsetDays: 10 },
    ],
    tasks: [
      'Kernboodschap bepalen',
      'Structuur uitwerken',
      'Slides ontwerpen',
      'Spreektekst schrijven',
      'Oefenen (minimaal 2x)',
      'Feedback vragen en verwerken',
    ],
  },
];

/**
 * Apply a template to a newly created project.
 * Returns { milestones, phases, tasks } with actual dates.
 */
export function applyTemplate(templateId) {
  const template = PROJECT_TEMPLATES.find((t) => t.id === templateId);
  if (!template || template.id === 'empty') {
    return { milestones: [], phases: [], tasks: [] };
  }

  const milestones = template.milestones.map((m) => ({
    id: crypto.randomUUID(),
    title: m.title,
    date: daysFromNow(m.offsetDays),
  }));

  const phases = template.phases.map((p) => ({
    id: crypto.randomUUID(),
    title: p.title,
    startDate: daysFromNow(p.offsetStart),
    endDate: daysFromNow(p.offsetEnd),
    color: p.color,
  }));

  const tasks = template.tasks.map((text) => text);

  return { milestones, phases, tasks };
}
