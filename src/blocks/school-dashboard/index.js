import { getAll, getSetting } from '../../db.js';
import { icon } from '../../icons.js';
import { navigate } from '../../router.js';
import { on } from '../../core/eventBus.js';

export function createPage(container) {
  const unsubs = [];

  async function render() {
    const [projects, skills, concepts, userName] = await Promise.all([
      getAll('schoolProjects').catch(() => []),
      getAll('schoolSkills').catch(() => []),
      getAll('schoolConcepts').catch(() => []),
      getSetting('user_name'),
    ]);

    const activeProject = projects.find(p => p.status === 'active') || projects[0] || null;
    const masteredConcepts = concepts.filter(c => c.clarity >= 4).length;
    const avgSkillLevel = skills.length > 0 ? (skills.reduce((s, sk) => s + (sk.level || 0), 0) / skills.length).toFixed(1) : '0';

    container.innerHTML = `
      <div class="dashboard-welcome">
        <h2>School Dashboard${userName ? ` — ${userName}` : ''}</h2>
        <p>Groei en meesterschap</p>
      </div>

      ${activeProject ? `
        <div class="card" style="border-left: 3px solid var(--color-purple); margin-bottom: var(--space-8); padding: var(--space-6)">
          <div style="font-size: 0.6875rem; text-transform: uppercase; letter-spacing: 0.06em; color: var(--color-text-tertiary); margin-bottom: var(--space-2)">Huidig project</div>
          <h2 style="margin-bottom: var(--space-3)">${activeProject.name || 'Naamloos'}</h2>
          ${activeProject.whatBuilding ? `<p style="color: var(--color-text-secondary); margin-bottom: var(--space-2)">${icon('target', 14)} <strong>Wat ik bouw:</strong> ${activeProject.whatBuilding}</p>` : ''}
          ${activeProject.whatLearning ? `<p style="color: var(--color-text-secondary); margin-bottom: var(--space-2)">${icon('book', 14)} <strong>Wat ik wil leren:</strong> ${activeProject.whatLearning}</p>` : ''}
          ${activeProject.nextMilestone ? `<p style="color: var(--color-purple); margin-top: var(--space-3)">${icon('check-circle', 14)} Volgende mijlpaal: ${activeProject.nextMilestone}</p>` : ''}
        </div>
      ` : `
        <div class="card" style="margin-bottom: var(--space-8); text-align: center; padding: var(--space-8)">
          <p style="color: var(--color-text-tertiary)">Nog geen project aangemaakt</p>
          <button class="btn btn-primary" style="margin-top: var(--space-4)" data-nav="projects">${icon('plus', 14)} Nieuw project</button>
        </div>
      `}

      <div class="dashboard-stats">
        <div class="card stat-card" style="--stat-color: var(--color-purple)">
          <div class="stat-value" style="color: var(--color-purple)">${projects.length}</div>
          <div class="stat-label">Projecten</div>
        </div>
        <div class="card stat-card" style="--stat-color: var(--color-emerald)">
          <div class="stat-value" style="color: var(--color-emerald)">${avgSkillLevel}</div>
          <div class="stat-label">Gem. skill niveau</div>
        </div>
        <div class="card stat-card" style="--stat-color: var(--color-blue)">
          <div class="stat-value" style="color: var(--color-blue)">${concepts.length}</div>
          <div class="stat-label">Concepten</div>
        </div>
        <div class="card stat-card" style="--stat-color: var(--color-amber)">
          <div class="stat-value" style="color: var(--color-amber)">${masteredConcepts}</div>
          <div class="stat-label">Beheerst</div>
        </div>
      </div>

      <h3 style="margin: var(--space-8) 0 var(--space-4)">Skill focus</h3>
      <div class="dashboard-grid">
        ${skills.length > 0 ? skills.slice(0, 6).map(skill => `
          <div class="card card-clickable" data-nav="skills">
            <h4>${skill.name}</h4>
            <div class="progress-bar" style="margin-top: var(--space-2)">
              <div class="progress-bar-fill purple" style="width: ${(skill.level / 5) * 100}%"></div>
            </div>
            <div class="form-hint" style="margin-top: var(--space-1)">Niveau ${skill.level}/5</div>
          </div>
        `).join('') : `
          <div class="card" style="grid-column: 1/-1; text-align: center; padding: var(--space-6)">
            <p style="color: var(--color-text-tertiary)">Voeg skills toe om je voortgang bij te houden</p>
            <button class="btn btn-secondary btn-sm" style="margin-top: var(--space-3)" data-nav="skills">${icon('plus', 14)} Skills toevoegen</button>
          </div>
        `}
      </div>
    `;

    container.querySelectorAll('[data-nav]').forEach(el => {
      el.addEventListener('click', () => navigate(el.dataset.nav));
    });
  }

  render();
  unsubs.push(on('schoolProjects:updated', render));
  unsubs.push(on('schoolSkills:updated', render));

  return { destroy() { unsubs.forEach(fn => fn()); } };
}
