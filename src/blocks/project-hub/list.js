import { getProjects, addProject, updateProject, getPinnedProject } from '../../stores/projects.js';
import { getTasksByProject, addTask } from '../../stores/tasks.js';
import { getAllProjectsMomentum } from '../../stores/momentum.js';
import { renderSparkline } from '../../ui/sparkline.js';
import { escapeHTML, getToday } from '../../utils.js';
import { PROJECT_TEMPLATES, applyTemplate } from '../../stores/project-templates.js';

const PAGE_SIZE = 3;
const STATUS_LABELS = { active: 'Actief', paused: 'Gepauzeerd', done: 'Gereed' };

/**
 * Render the project list (card grid, 3 per page, pagination).
 * @param {HTMLElement} container
 * @param {object} context
 * @param {function} onOpen - called with projectId when a card is clicked
 * @returns {function} cleanup
 */
export function renderProjectList(container, context, onOpen) {
  const { eventBus, modeManager } = context;
  let page = 0;
  let showNewForm = false;

  container.insertAdjacentHTML('beforeend', `
    <div class="hub-list">
      <div class="hub-list__header">
        <h3 class="hub-list__title">Alle projecten</h3>
        <button type="button" class="btn btn-primary btn-sm hub-list__new-btn">+ Nieuw project</button>
      </div>
      <form class="hub-list__new-form" hidden>
        <div class="hub-list__templates" data-templates>
          ${PROJECT_TEMPLATES.map((t) => `
            <button type="button" class="hub-list__template-btn ${t.id === 'empty' ? 'hub-list__template-btn--active' : ''}"
              data-template="${t.id}">
              <span class="hub-list__template-icon">${t.icon}</span>
              <span class="hub-list__template-label">${escapeHTML(t.label)}</span>
            </button>
          `).join('')}
        </div>
        <input type="text" class="form-input hub-list__new-title" placeholder="Projectnaam..." autocomplete="off" required />
        <textarea class="form-input hub-list__new-goal" placeholder="Doel (optioneel)" rows="2"></textarea>
        <input type="hidden" name="template" value="empty" data-template-value />
        <div class="hub-list__new-actions">
          <button type="submit" class="btn btn-primary btn-sm">Aanmaken</button>
          <button type="button" class="btn btn-ghost btn-sm" data-cancel>Annuleer</button>
        </div>
      </form>
      <div class="hub-list__grid" data-grid></div>
      <div class="hub-list__pagination" data-pagination hidden></div>
    </div>
  `);

  const listEl = container.querySelector('.hub-list');
  const gridEl = listEl.querySelector('[data-grid]');
  const paginationEl = listEl.querySelector('[data-pagination]');
  const newBtn = listEl.querySelector('.hub-list__new-btn');
  const newForm = listEl.querySelector('.hub-list__new-form');
  const newTitleInput = listEl.querySelector('.hub-list__new-title');

  newBtn.addEventListener('click', () => {
    showNewForm = !showNewForm;
    newForm.hidden = !showNewForm;
    if (showNewForm) newTitleInput.focus();
  });

  listEl.querySelector('[data-cancel]').addEventListener('click', () => {
    showNewForm = false;
    newForm.hidden = true;
    newForm.reset();
  });

  // Template selection
  listEl.querySelectorAll('[data-template]').forEach((btn) => {
    btn.addEventListener('click', () => {
      listEl.querySelectorAll('[data-template]').forEach((b) => b.classList.remove('hub-list__template-btn--active'));
      btn.classList.add('hub-list__template-btn--active');
      const templateInput = listEl.querySelector('[data-template-value]');
      if (templateInput) templateInput.value = btn.dataset.template;
    });
  });

  newForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = newTitleInput.value.trim();
    if (!title) return;
    const goal = listEl.querySelector('.hub-list__new-goal').value.trim();
    const mode = modeManager.getMode();
    const templateId = listEl.querySelector('[data-template-value]')?.value || 'empty';

    const project = await addProject(title, goal, mode);

    // Apply template if not empty
    if (templateId !== 'empty' && project) {
      const { milestones, phases, tasks } = applyTemplate(templateId);
      if (milestones.length || phases.length) {
        await updateProject(project.id, { milestones, phases });
      }
      for (const taskText of tasks) {
        await addTask(taskText, mode, null, project.id);
      }
    }

    showNewForm = false;
    newForm.hidden = true;
    newForm.reset();
    eventBus.emit('projects:changed');
    eventBus.emit('tasks:changed');
    await render();
  });

  async function render() {
    const mode = modeManager.getMode();
    const projects = await getProjects(mode);
    const total = projects.length;
    const totalPages = Math.ceil(total / PAGE_SIZE);

    if (page >= totalPages && totalPages > 0) page = totalPages - 1;

    const slice = projects.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

    if (total === 0) {
      gridEl.innerHTML = `
        <div class="hub-list__empty">
          <p>Geen projecten — maak je eerste project aan.</p>
        </div>
      `;
      paginationEl.hidden = true;
      return;
    }

    // Load task counts + pin state + momentum
    const [pinned, momentumMap] = await Promise.all([
      getPinnedProject(mode),
      getAllProjectsMomentum(mode),
    ]);
    const pinnedId = pinned?.id || null;

    const cardData = await Promise.all(slice.map(async (project, idx) => {
      const tasks = await getTasksByProject(project.id);
      const totalTasks = tasks.length;
      const doneTasks = tasks.filter((t) => t.status === 'done').length;
      const pct = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;
      const accentColor = project.accentColor || 'var(--color-accent)';
      const statusLabel = STATUS_LABELS[project.status] || project.status;
      const isCardPinned = project.id === pinnedId;
      // SVG progress ring: r=18, circ ~ 113.1
      const r = 18;
      const circ = 2 * Math.PI * r;
      const dash = ((pct / 100) * circ).toFixed(2);
      const stagger = idx * 60;

      // Momentum sparkline + last active
      const momentum = momentumMap.get(project.id);
      const sparkHtml = momentum ? renderSparkline(momentum.weeklyActivity, { isStalled: momentum.isStalled }) : '';
      let lastActiveHtml = '';
      if (momentum?.lastActiveDate) {
        const daysAgo = Math.floor((Date.now() - new Date(momentum.lastActiveDate + 'T00:00:00').getTime()) / (24 * 60 * 60 * 1000));
        const label = daysAgo === 0 ? 'Vandaag actief' : daysAgo === 1 ? '1 dag geleden' : `${daysAgo}d geleden`;
        lastActiveHtml = `<span class="hub-card__last-active${momentum.isStalled ? ' hub-card__last-active--stalled' : ''}">${escapeHTML(label)}</span>`;
      }

      return {
        project,
        html: `
          <article class="hub-card ${isCardPinned ? 'hub-card--pinned' : ''}" data-project-id="${project.id}"
            style="--project-accent: ${accentColor}; --card-stagger: ${stagger}ms"
            role="button" tabindex="0" aria-label="Open project ${escapeHTML(project.title)}">
            ${isCardPinned ? `<span class="hub-card__pin-indicator" aria-label="Vastgepind">\u{1F4CC}</span>` : ''}
            <div class="hub-card__cover" data-cover-target>
              ${!project.cover ? `<span class="hub-card__cover-placeholder" aria-hidden="true">${escapeHTML(project.title.slice(0, 2).toUpperCase())}</span>` : ''}
            </div>
            <div class="hub-card__body">
              <div class="hub-card__meta">
                <span class="hub-card__status hub-card__status--${project.status || 'active'}"
                  aria-label="Status: ${statusLabel}">${statusLabel}</span>
                <div class="hub-card__ring" role="img" aria-label="${doneTasks} van ${totalTasks} taken gereed (${pct}%)">
                  <svg width="44" height="44" viewBox="0 0 44 44" aria-hidden="true">
                    <circle cx="22" cy="22" r="${r}" fill="none" stroke="var(--color-border)" stroke-width="3.5"/>
                    <circle cx="22" cy="22" r="${r}" fill="none" stroke="${accentColor}" stroke-width="3.5"
                      stroke-dasharray="${dash} ${circ.toFixed(2)}"
                      stroke-dashoffset="${(circ / 4).toFixed(2)}"
                      stroke-linecap="round"
                      style="transition: stroke-dasharray 400ms var(--ease-out)"/>
                    <text x="22" y="26" text-anchor="middle" font-size="9" fill="currentColor"
                      font-family="var(--font-sans)" font-weight="600">${pct}%</text>
                  </svg>
                </div>
              </div>
              <h4 class="hub-card__title">${escapeHTML(project.title)}</h4>
              ${project.goal ? `<p class="hub-card__goal">${escapeHTML(project.goal.slice(0, 90))}${project.goal.length > 90 ? '…' : ''}</p>` : ''}
              <div class="hub-card__momentum">
                ${sparkHtml}
                ${lastActiveHtml}
              </div>
            </div>
          </article>
        `,
        cover: project.cover || null,
      };
    }));

    gridEl.innerHTML = cardData.map((d) => d.html).join('');

    // Apply cover images via JS (avoids embedding large base64 in HTML attributes)
    gridEl.querySelectorAll('.hub-card').forEach((card, idx) => {
      const cover = cardData[idx]?.cover;
      if (cover) {
        const coverEl = card.querySelector('[data-cover-target]');
        if (coverEl) {
          coverEl.style.backgroundImage = `url('${cover}')`;
          coverEl.style.backgroundSize = 'cover';
          coverEl.style.backgroundPosition = 'center';
        }
      }
    });

    // Bind card clicks
    gridEl.querySelectorAll('.hub-card').forEach((card) => {
      const projectId = card.dataset.projectId;
      card.addEventListener('click', () => onOpen(projectId));
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen(projectId);
        }
      });
    });

    // Pagination
    if (totalPages > 1) {
      paginationEl.hidden = false;
      paginationEl.innerHTML = `
        <button type="button" class="hub-list__page-btn" data-page-prev
          aria-label="Vorige pagina" ${page === 0 ? 'disabled aria-disabled="true"' : ''}>‹</button>
        <span class="hub-list__page-info" aria-live="polite">${page + 1} / ${totalPages}</span>
        <button type="button" class="hub-list__page-btn" data-page-next
          aria-label="Volgende pagina" ${page >= totalPages - 1 ? 'disabled aria-disabled="true"' : ''}>›</button>
      `;

      paginationEl.querySelector('[data-page-prev]')?.addEventListener('click', () => {
        if (page > 0) { page--; render(); }
      });
      paginationEl.querySelector('[data-page-next]')?.addEventListener('click', () => {
        if (page < totalPages - 1) { page++; render(); }
      });
    } else {
      paginationEl.hidden = true;
    }
  }

  const unsubMode = eventBus.on('mode:changed', () => { page = 0; render(); });
  const unsubProjects = eventBus.on('projects:changed', () => render());

  render();

  return function cleanup() {
    unsubMode?.();
    unsubProjects?.();
    listEl?.remove();
  };
}
