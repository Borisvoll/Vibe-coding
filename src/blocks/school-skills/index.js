import { getAll, put } from '../../db.js';
import { icon } from '../../icons.js';
import { on, emit } from '../../core/eventBus.js';
import { generateId } from '../../utils.js';
import { showToast } from '../../toast.js';

const DEFAULT_SKILLS = [
  { name: 'CNC frezen', category: 'Machines' },
  { name: 'CNC draaien', category: 'Machines' },
  { name: 'Conventioneel draaien', category: 'Machines' },
  { name: 'Conventioneel frezen', category: 'Machines' },
  { name: 'CAD/CAM', category: 'Digitaal' },
  { name: 'Technisch tekenen', category: 'Digitaal' },
  { name: 'Toleranties & passingen', category: 'Theorie' },
  { name: 'Meettechniek', category: 'Theorie' },
  { name: 'Materiaalkunde', category: 'Theorie' },
  { name: 'Procesdenken', category: 'Theorie' },
  { name: 'Kwaliteitsborging', category: 'Werkhouding' },
  { name: 'Probleemoplossing', category: 'Werkhouding' },
];

const LEVEL_LABELS = ['Onbekend', 'Beginner', 'Basis', 'Competent', 'Gevorderd', 'Expert'];

const CATEGORY_ORDER = ['Machines', 'Digitaal', 'Theorie', 'Werkhouding'];

export function createPage(container) {
  const unsubs = [];
  let expandedSkillId = null;

  async function seedDefaults() {
    const existing = await getAll('schoolSkills').catch(() => []);
    if (existing.length > 0) return existing;

    const now = new Date().toISOString();
    const seeded = [];
    for (const def of DEFAULT_SKILLS) {
      const record = {
        id: generateId(),
        name: def.name,
        category: def.category,
        level: 0,
        notes: '',
        history: [],
        mode: 'school',
        createdAt: now,
        updatedAt: now
      };
      await put('schoolSkills', record);
      seeded.push(record);
    }
    return seeded;
  }

  function groupByCategory(skills) {
    const groups = {};
    for (const s of skills) {
      const cat = s.category || 'Overig';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(s);
    }
    // Sort by defined order, then alphabetical for custom categories
    const sorted = {};
    const knownCats = CATEGORY_ORDER.filter(c => groups[c]);
    const extraCats = Object.keys(groups).filter(c => !CATEGORY_ORDER.includes(c)).sort();
    for (const cat of [...knownCats, ...extraCats]) {
      sorted[cat] = groups[cat];
    }
    return sorted;
  }

  function categoryAverage(skills) {
    if (skills.length === 0) return 0;
    const sum = skills.reduce((acc, s) => acc + (s.level || 0), 0);
    return (sum / skills.length).toFixed(1);
  }

  function overallAverage(skills) {
    if (skills.length === 0) return 0;
    const sum = skills.reduce((acc, s) => acc + (s.level || 0), 0);
    return (sum / skills.length).toFixed(1);
  }

  function renderProgressBar(level) {
    const pct = (level / 5) * 100;
    return `
      <div class="progress-bar" style="height: 8px; border-radius: 4px; background: var(--color-border); overflow: hidden; flex: 1;">
        <div class="progress-bar-fill" style="width: ${pct}%; height: 100%; border-radius: 4px; background: linear-gradient(90deg, var(--color-purple), var(--color-purple)); transition: width 0.3s ease;"></div>
      </div>
    `;
  }

  function renderSkillCard(skill) {
    const isExpanded = expandedSkillId === skill.id;
    return `
      <div class="card" style="margin-bottom: var(--space-3); border-left: 3px solid var(--color-purple); cursor: pointer;" data-skill-id="${skill.id}">
        <div class="skill-summary" data-toggle="${skill.id}" style="display: flex; align-items: center; gap: var(--space-3);">
          <div style="flex: 1; min-width: 0;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--space-1);">
              <span style="font-weight: 600; font-size: 0.9375rem;">${skill.name}</span>
              <span class="badge" style="background: var(--color-purple); color: white; font-size: 0.75rem;">${LEVEL_LABELS[skill.level || 0]}</span>
            </div>
            <div style="display: flex; align-items: center; gap: var(--space-2);">
              ${renderProgressBar(skill.level || 0)}
              <span style="font-size: 0.75rem; color: var(--color-text-secondary); min-width: 20px; text-align: right;">${skill.level || 0}/5</span>
            </div>
          </div>
        </div>
        ${isExpanded ? `
          <div class="skill-detail" style="margin-top: var(--space-4); padding-top: var(--space-4); border-top: 1px solid var(--color-border);">
            <div style="display: flex; align-items: center; gap: var(--space-2); margin-bottom: var(--space-3);">
              <span style="font-size: 0.8125rem; color: var(--color-text-secondary);">Niveau:</span>
              <button class="btn btn-secondary btn-sm" data-level-down="${skill.id}" ${(skill.level || 0) <= 0 ? 'disabled' : ''} style="padding: 2px 10px; font-size: 1rem;">-</button>
              <span style="font-weight: 600; min-width: 24px; text-align: center;">${skill.level || 0}</span>
              <button class="btn btn-secondary btn-sm" data-level-up="${skill.id}" ${(skill.level || 0) >= 5 ? 'disabled' : ''} style="padding: 2px 10px; font-size: 1rem;">+</button>
              <span style="font-size: 0.8125rem; color: var(--color-purple); margin-left: var(--space-1);">${LEVEL_LABELS[skill.level || 0]}</span>
            </div>
            <div class="form-group" style="margin-bottom: var(--space-3);">
              <label class="form-label">Notities</label>
              <textarea class="form-textarea" data-notes="${skill.id}" rows="2" placeholder="Observaties, aandachtspunten...">${skill.notes || ''}</textarea>
            </div>
            <button class="btn btn-primary btn-sm" data-save-notes="${skill.id}" style="margin-top: var(--space-1);">
              ${icon('save', 14)} Opslaan
            </button>
          </div>
        ` : ''}
      </div>
    `;
  }

  async function render() {
    const skills = await seedDefaults();
    skills.sort((a, b) => a.name.localeCompare(b.name));

    const groups = groupByCategory(skills);
    const avg = overallAverage(skills);

    container.innerHTML = `
      <div class="page-header">
        <h2>${icon('chart', 22)} Skill Tracker</h2>
        <p>Volg je groei als Research Instrumentmaker</p>
      </div>

      <div class="card" style="margin-bottom: var(--space-6); text-align: center;">
        <div style="font-size: 0.8125rem; color: var(--color-text-secondary); margin-bottom: var(--space-1);">Gemiddeld niveau</div>
        <div style="font-size: 1.75rem; font-weight: 700; color: var(--color-purple);">${avg}</div>
        <div style="font-size: 0.75rem; color: var(--color-text-secondary);">van 5.0</div>
        <div style="margin-top: var(--space-2);">
          ${renderProgressBar(parseFloat(avg))}
        </div>
      </div>

      <div id="skills-categories">
        ${Object.entries(groups).map(([cat, catSkills]) => `
          <div style="margin-bottom: var(--space-6);">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--space-3);">
              <h3 style="font-size: 1rem; font-weight: 600; color: var(--color-text);">${cat}</h3>
              <span class="badge" style="background: var(--color-purple); color: white; font-size: 0.75rem;">gem. ${categoryAverage(catSkills)}</span>
            </div>
            ${catSkills.map(s => renderSkillCard(s)).join('')}
          </div>
        `).join('')}
      </div>

      <div id="add-skill-section" style="margin-top: var(--space-4);">
        <button class="btn btn-secondary" id="add-skill-btn" style="width: 100%;">
          ${icon('plus', 14)} Voeg skill toe
        </button>
        <div id="add-skill-form" style="display: none; margin-top: var(--space-4);" class="card">
          <h3 style="margin-bottom: var(--space-3);">Nieuwe skill</h3>
          <div class="form-group">
            <label class="form-label">Naam</label>
            <input type="text" class="form-input" id="new-skill-name" placeholder="Naam van de skill" maxlength="100">
          </div>
          <div class="form-group">
            <label class="form-label">Categorie</label>
            <input type="text" class="form-input" id="new-skill-category" placeholder="bijv. Machines, Digitaal, Theorie..." maxlength="50">
          </div>
          <div style="display: flex; gap: var(--space-2); margin-top: var(--space-3);">
            <button class="btn btn-primary" id="save-new-skill-btn">${icon('save', 14)} Toevoegen</button>
            <button class="btn btn-secondary" id="cancel-new-skill-btn">Annuleren</button>
          </div>
        </div>
      </div>
    `;

    // Bind toggle expand
    container.querySelectorAll('[data-toggle]').forEach(el => {
      el.addEventListener('click', () => {
        const id = el.dataset.toggle;
        expandedSkillId = expandedSkillId === id ? null : id;
        render();
      });
    });

    // Bind level up/down
    container.querySelectorAll('[data-level-up]').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const skill = skills.find(s => s.id === btn.dataset.levelUp);
        if (!skill || skill.level >= 5) return;
        skill.level = (skill.level || 0) + 1;
        skill.updatedAt = new Date().toISOString();
        skill.history = skill.history || [];
        skill.history.push({ date: new Date().toISOString(), level: skill.level, note: '' });
        await put('schoolSkills', skill);
        emit('schoolSkills:updated');
        showToast(`${skill.name}: ${LEVEL_LABELS[skill.level]}`, { type: 'success' });
        render();
      });
    });

    container.querySelectorAll('[data-level-down]').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const skill = skills.find(s => s.id === btn.dataset.levelDown);
        if (!skill || skill.level <= 0) return;
        skill.level = (skill.level || 0) - 1;
        skill.updatedAt = new Date().toISOString();
        skill.history = skill.history || [];
        skill.history.push({ date: new Date().toISOString(), level: skill.level, note: '' });
        await put('schoolSkills', skill);
        emit('schoolSkills:updated');
        showToast(`${skill.name}: ${LEVEL_LABELS[skill.level]}`, { type: 'success' });
        render();
      });
    });

    // Bind save notes
    container.querySelectorAll('[data-save-notes]').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const id = btn.dataset.saveNotes;
        const skill = skills.find(s => s.id === id);
        if (!skill) return;
        const textarea = container.querySelector(`textarea[data-notes="${id}"]`);
        skill.notes = textarea ? textarea.value.trim() : '';
        skill.updatedAt = new Date().toISOString();
        await put('schoolSkills', skill);
        emit('schoolSkills:updated');
        showToast('Notitie opgeslagen', { type: 'success' });
      });
    });

    // Add skill form toggle
    const addBtn = container.querySelector('#add-skill-btn');
    const addForm = container.querySelector('#add-skill-form');
    if (addBtn && addForm) {
      addBtn.addEventListener('click', () => {
        addForm.style.display = 'block';
        addBtn.style.display = 'none';
      });

      container.querySelector('#cancel-new-skill-btn').addEventListener('click', () => {
        addForm.style.display = 'none';
        addBtn.style.display = '';
      });

      container.querySelector('#save-new-skill-btn').addEventListener('click', async () => {
        const name = container.querySelector('#new-skill-name').value.trim();
        const category = container.querySelector('#new-skill-category').value.trim() || 'Overig';
        if (!name) { showToast('Vul een naam in', { type: 'warning' }); return; }

        const now = new Date().toISOString();
        const record = {
          id: generateId(),
          name,
          category,
          level: 0,
          notes: '',
          history: [],
          mode: 'school',
          createdAt: now,
          updatedAt: now
        };
        await put('schoolSkills', record);
        emit('schoolSkills:updated');
        showToast(`${name} toegevoegd`, { type: 'success' });
        expandedSkillId = null;
        render();
      });
    }
  }

  render();
  unsubs.push(on('schoolSkills:updated', render));

  return { destroy() { unsubs.forEach(fn => fn()); } };
}
