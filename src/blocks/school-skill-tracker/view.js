import { escapeHTML } from '../../utils.js';
import { listSkills, saveSkill } from './store.js';
import './styles.css';

export function renderSchoolSkillTracker(container) {
  const mountId = `school-skill-tracker-${crypto.randomUUID()}`;

  async function render() {
    const skills = await listSkills();
    const host = container.querySelector(`[data-block-id="${mountId}"]`);
    if (!host) return;

    host.innerHTML = `
      <h3 class="school-block__title">Vaardighedentracker</h3>
      <div class="school-skill-list">
        ${skills.map((skill) => `
          <section class="school-skill-item" data-skill-id="${skill.id}">
            <h4>${escapeHTML(skill.name)}</h4>
            <label class="school-block__field"><span>Niveaunotities</span><textarea class="form-textarea" data-field="levelNotes" rows="2">${escapeHTML(skill.levelNotes || '')}</textarea></label>
            <label class="school-block__field"><span>Volgende stap</span><input class="form-input" data-field="nextStep" value="${escapeHTML(skill.nextStep || '')}"></label>
            <label class="school-block__field"><span>Bewijslinks</span><input class="form-input" data-field="evidenceLinks" value="${escapeHTML(skill.evidenceLinks || '')}" placeholder="https://..."></label>
            <button class="btn btn-secondary btn-sm" data-action="save">Opslaan</button>
          </section>
        `).join('')}
      </div>
    `;

    host.querySelectorAll('[data-action="save"]').forEach((button) => {
      button.addEventListener('click', async () => {
        const item = button.closest('.school-skill-item');
        const name = item.querySelector('h4').textContent.trim();
        const skill = {
          id: item.dataset.skillId,
          name,
          levelNotes: item.querySelector('[data-field="levelNotes"]').value.trim(),
          nextStep: item.querySelector('[data-field="nextStep"]').value.trim(),
          evidenceLinks: item.querySelector('[data-field="evidenceLinks"]').value.trim(),
        };
        await saveSkill(skill);
      });
    });
  }

  container.insertAdjacentHTML('beforeend', `<article class="os-mini-card school-block" data-block-id="${mountId}"></article>`);
  render();

  return { unmount() { container.querySelector(`[data-block-id="${mountId}"]`)?.remove(); } };
}
