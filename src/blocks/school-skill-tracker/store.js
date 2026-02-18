import { getAll, put } from '../../db.js';

const STORE = 'os_school_skills';
const DEFAULT_SKILLS = [
  'CNC',
  'CAD/CAM',
  'Tolerances',
  'Measuring',
  'Process thinking',
];

export async function listSkills() {
  const all = await getAll(STORE).catch(() => []);
  const byName = new Map(all.map((entry) => [entry.name, entry]));

  return DEFAULT_SKILLS.map((name) => byName.get(name) || {
    id: `skill_${name.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`,
    name,
    levelNotes: '',
    nextStep: '',
    evidenceLinks: '',
  });
}

export async function saveSkill(skill) {
  return put(STORE, {
    ...skill,
    updated_at: new Date().toISOString(),
  });
}
