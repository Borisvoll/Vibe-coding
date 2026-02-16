import { getAll, put, remove } from '../db.js';
import { icon } from '../icons.js';
import { on, emit } from '../state.js';
import { showToast } from '../toast.js';
import { generateId, getToday, formatDateLong, escapeHTML } from '../utils.js';

// Default checklists seeded on first visit
const DEFAULT_CHECKLISTS = [
  {
    title: 'Afbramen',
    steps: [
      'Werkstuk inspannen / vastzetten',
      'Juiste vijl of ontbraamgereedschap pakken',
      'Bramen verwijderen langs alle randen',
      'Controleer op scherpe randen met vinger (voorzichtig)',
      'Werkstuk schoonmaken',
    ]
  },
  {
    title: 'Opspannen',
    steps: [
      'Machineklem / opspanmiddel controleren',
      'Werkstuk correct positioneren',
      'Klem vastzetten (niet te strak, niet te los)',
      'Controleer of werkstuk niet beweegt',
      'Veiligheid check: geen losliggende onderdelen',
    ]
  },
  {
    title: 'Nulpunten instellen',
    steps: [
      'Machine in handmatig/setup-modus zetten',
      'Kantentaster of meetklok pakken',
      'X-nulpunt bepalen',
      'Y-nulpunt bepalen',
      'Z-nulpunt bepalen (bovenkant werkstuk)',
      'Nulpunt opslaan in werkoffset (G54)',
      'Controleer nulpunt met proefverplaatsing',
    ]
  },
  {
    title: 'Meten (3-punts nulstelling)',
    steps: [
      'Buitenmicrometer / schuifmaat kalibreren op nul',
      'Eerste meting uitvoeren',
      'Tweede meting uitvoeren (andere positie)',
      'Derde meting uitvoeren (controle)',
      'Gemiddelde berekenen en vergelijken met tolerantie',
      'Resultaat noteren',
    ]
  },
  {
    title: 'Machine start-up',
    steps: [
      'Hoofdschakelaar aan',
      'Noodstop controleren (indrukken + loslaten)',
      'Referentierit uitvoeren (homing)',
      'Koelvloeistof niveau controleren',
      'Smeerpunten controleren',
      'Spindel kort proefdraaien',
      'Werkgebied visueel controleren op obstakels',
    ]
  },
  {
    title: 'Machine shutdown',
    steps: [
      'Programma stoppen / spindel uit',
      'Werkstuk verwijderen',
      'Machine schoonmaken (spanen verwijderen)',
      'Koelvloeistof afzetten',
      'Tafel naar veilige positie verplaatsen',
      'Machine uitschakelen',
    ]
  },
];

export function createPage(container) {
  let unsubs = [];
  let activeView = 'list'; // 'list' | 'run' | 'edit' | 'history'
  let activeChecklistId = null;
  let editingChecklist = null;

  async function seedDefaults() {
    const existing = await getAll('checklists');
    if (existing.length > 0) return;
    for (const def of DEFAULT_CHECKLISTS) {
      await put('checklists', {
        id: generateId(),
        title: def.title,
        steps: def.steps.map(label => ({ id: generateId(), label })),
        createdAt: new Date().toISOString(),
      });
    }
    emit('checklists:updated');
  }

  async function render() {
    await seedDefaults();
    const checklists = (await getAll('checklists')).sort((a, b) => a.title.localeCompare(b.title));
    const logs = await getAll('checklistLogs');

    if (activeView === 'run' && activeChecklistId) {
      renderRun(checklists.find(c => c.id === activeChecklistId), logs);
    } else if (activeView === 'edit') {
      renderEdit();
    } else if (activeView === 'history' && activeChecklistId) {
      renderHistory(checklists.find(c => c.id === activeChecklistId), logs);
    } else {
      renderList(checklists, logs);
    }
  }

  // ===== LIST VIEW =====
  function renderList(checklists, logs) {
    const today = getToday();
    container.innerHTML = `
      <div class="page-header">
        <h2>Checklists Werkplaats</h2>
        <p>Standaard procedures stap voor stap afvinken</p>
      </div>
      <div style="display:flex; gap:var(--space-3); margin-bottom:var(--space-6); flex-wrap:wrap">
        <button class="btn btn-primary btn-sm" data-action="new-checklist">${icon('plus', 14)} Nieuwe checklist</button>
      </div>
      ${checklists.map(cl => {
        const todayLog = logs.find(l => l.checklistId === cl.id && l.date === today);
        const totalLogs = logs.filter(l => l.checklistId === cl.id).length;
        const done = todayLog && todayLog.completedSteps.length === cl.steps.length;
        return `
          <div class="card" style="margin-bottom:var(--space-3); ${done ? 'border-left:3px solid var(--color-green, #10b981)' : ''}">
            <div style="display:flex; justify-content:space-between; align-items:center; gap:var(--space-3)">
              <div style="flex:1; min-width:0">
                <h3 style="margin:0; font-size:1rem">${escapeHTML(cl.title)}</h3>
                <p style="margin:var(--space-1) 0 0; font-size:0.8rem; color:var(--color-text-tertiary)">
                  ${cl.steps.length} stappen${done ? ' &mdash; vandaag afgerond' : todayLog ? ` &mdash; ${todayLog.completedSteps.length}/${cl.steps.length} gedaan` : ''}${totalLogs > 0 ? ` &middot; ${totalLogs}x uitgevoerd` : ''}
                </p>
              </div>
              <div style="display:flex; gap:var(--space-2); flex-shrink:0">
                <button class="btn btn-sm btn-primary" data-start="${cl.id}">${done ? 'Bekijk' : 'Start'}</button>
                <button class="btn btn-sm btn-secondary" data-history="${cl.id}" title="Geschiedenis">${icon('clock', 14)}</button>
                <button class="btn btn-sm btn-ghost" data-edit="${cl.id}" title="Bewerk">${icon('edit', 14)}</button>
              </div>
            </div>
          </div>
        `;
      }).join('')}
      ${checklists.length === 0 ? `
        <div class="empty-state">
          <div class="empty-state-icon">${icon('clipboard-check', 48)}</div>
          <h3>Geen checklists</h3>
          <p>Maak je eerste checklist aan</p>
        </div>
      ` : ''}
    `;

    container.querySelector('[data-action="new-checklist"]')?.addEventListener('click', () => {
      editingChecklist = { id: generateId(), title: '', steps: [{ id: generateId(), label: '' }], createdAt: new Date().toISOString() };
      activeView = 'edit';
      render();
    });

    checklists.forEach(cl => {
      container.querySelector(`[data-start="${cl.id}"]`)?.addEventListener('click', () => {
        activeChecklistId = cl.id;
        activeView = 'run';
        render();
      });
      container.querySelector(`[data-history="${cl.id}"]`)?.addEventListener('click', () => {
        activeChecklistId = cl.id;
        activeView = 'history';
        render();
      });
      container.querySelector(`[data-edit="${cl.id}"]`)?.addEventListener('click', () => {
        editingChecklist = JSON.parse(JSON.stringify(cl));
        activeView = 'edit';
        render();
      });
    });
  }

  // ===== RUN VIEW =====
  function renderRun(checklist, logs) {
    if (!checklist) { activeView = 'list'; render(); return; }
    const today = getToday();
    let log = logs.find(l => l.checklistId === checklist.id && l.date === today);
    if (!log) {
      log = { id: generateId(), checklistId: checklist.id, date: today, completedSteps: [], notes: '', createdAt: new Date().toISOString() };
    }
    const allDone = log.completedSteps.length === checklist.steps.length;

    container.innerHTML = `
      <div style="display:flex; align-items:center; gap:var(--space-3); margin-bottom:var(--space-4)">
        <button class="btn btn-ghost btn-sm" data-action="back">${icon('arrow-left', 16)} Terug</button>
        <h2 style="margin:0; font-size:1.125rem">${escapeHTML(checklist.title)}</h2>
      </div>
      <p style="color:var(--color-text-secondary); font-size:0.875rem; margin-bottom:var(--space-4)">${formatDateLong(today)}</p>
      <div class="card" style="margin-bottom:var(--space-4)">
        <div class="progress-bar" style="margin-bottom:var(--space-4)">
          <div class="progress-bar-fill" style="width:${checklist.steps.length ? Math.round((log.completedSteps.length / checklist.steps.length) * 100) : 0}%; background:var(--color-blue); transition:width 0.3s"></div>
        </div>
        <p style="text-align:center; font-size:0.875rem; color:var(--color-text-secondary); margin-bottom:var(--space-4)">
          ${log.completedSteps.length} / ${checklist.steps.length} stappen
        </p>
        ${checklist.steps.map((step, i) => {
          const checked = log.completedSteps.includes(step.id);
          return `
            <label data-step="${step.id}" style="
              display:flex; align-items:center; gap:var(--space-3); padding:var(--space-3);
              background:${checked ? 'var(--color-bg-secondary)' : 'transparent'};
              border-radius:var(--radius-md); margin-bottom:var(--space-2); cursor:pointer;
              transition: background 0.2s; opacity:${checked ? '0.7' : '1'}
            ">
              <input type="checkbox" ${checked ? 'checked' : ''} style="width:20px; height:20px; accent-color:var(--color-blue); cursor:pointer; flex-shrink:0">
              <span style="font-size:0.9375rem; ${checked ? 'text-decoration:line-through; color:var(--color-text-tertiary)' : ''}">
                <strong style="color:var(--color-text-secondary); margin-right:var(--space-2)">${i + 1}.</strong>
                ${escapeHTML(step.label)}
              </span>
            </label>
          `;
        }).join('')}
      </div>
      <div class="card" style="margin-bottom:var(--space-4)">
        <div class="form-group" style="margin-bottom:0">
          <label class="form-label">Notities (optioneel)</label>
          <textarea class="form-textarea" id="cl-notes" rows="2" placeholder="Bijzonderheden...">${escapeHTML(log.notes)}</textarea>
        </div>
      </div>
      <button class="btn btn-primary" data-action="save-log" style="width:100%">${icon('save', 16)} Opslaan</button>
      ${allDone ? '<div id="confetti-anchor"></div>' : ''}
    `;

    // Bind step checkboxes
    checklist.steps.forEach(step => {
      const label = container.querySelector(`[data-step="${step.id}"]`);
      const checkbox = label?.querySelector('input[type="checkbox"]');
      if (!checkbox) return;
      checkbox.addEventListener('change', async () => {
        if (checkbox.checked) {
          if (!log.completedSteps.includes(step.id)) log.completedSteps.push(step.id);
        } else {
          log.completedSteps = log.completedSteps.filter(s => s !== step.id);
        }
        log.notes = container.querySelector('#cl-notes')?.value || '';
        await put('checklistLogs', log);
        emit('checklists:updated');

        // Check if all done
        if (log.completedSteps.length === checklist.steps.length) {
          showToast('Checklist compleet!', { type: 'success' });
          launchConfetti();
        }
        render();
      });
    });

    container.querySelector('[data-action="back"]')?.addEventListener('click', () => {
      activeView = 'list';
      activeChecklistId = null;
      render();
    });

    container.querySelector('[data-action="save-log"]')?.addEventListener('click', async () => {
      log.notes = container.querySelector('#cl-notes')?.value || '';
      await put('checklistLogs', log);
      emit('checklists:updated');
      showToast('Checklist log opgeslagen', { type: 'success' });
      if (log.completedSteps.length === checklist.steps.length) {
        launchConfetti();
      }
    });

    // If already all done, show confetti once
    if (allDone) {
      setTimeout(() => launchConfetti(), 300);
    }
  }

  // ===== EDIT VIEW =====
  function renderEdit() {
    const cl = editingChecklist;
    if (!cl) { activeView = 'list'; render(); return; }
    const isNew = !cl.updatedAt && !cl.createdAt?.includes('T');

    container.innerHTML = `
      <div style="display:flex; align-items:center; gap:var(--space-3); margin-bottom:var(--space-4)">
        <button class="btn btn-ghost btn-sm" data-action="back">${icon('arrow-left', 16)} Terug</button>
        <h2 style="margin:0; font-size:1.125rem">${cl.title ? 'Bewerk checklist' : 'Nieuwe checklist'}</h2>
      </div>
      <div class="card" style="margin-bottom:var(--space-4)">
        <div class="form-group">
          <label class="form-label">Naam</label>
          <input type="text" class="form-input" id="cl-title" value="${escapeHTML(cl.title)}" placeholder="Bijv. Machine start-up">
        </div>
        <div class="form-group">
          <label class="form-label">Stappen</label>
          <div id="steps-list">
            ${cl.steps.map((step, i) => `
              <div style="display:flex; gap:var(--space-2); align-items:center; margin-bottom:var(--space-2)" data-step-idx="${i}">
                <span style="font-weight:600; color:var(--color-text-tertiary); min-width:24px; text-align:center">${i + 1}</span>
                <input type="text" class="form-input" style="flex:1" value="${escapeHTML(step.label)}" data-step-input="${i}" placeholder="Beschrijf de stap...">
                <button class="btn btn-ghost btn-sm" data-remove-step="${i}" title="Verwijder" style="padding:var(--space-1)">${icon('x', 16)}</button>
              </div>
            `).join('')}
          </div>
          <button class="btn btn-secondary btn-sm" data-action="add-step" style="margin-top:var(--space-2)">${icon('plus', 14)} Stap toevoegen</button>
        </div>
      </div>
      <div style="display:flex; gap:var(--space-3)">
        <button class="btn btn-primary" data-action="save-checklist" style="flex:1">${icon('save', 16)} Opslaan</button>
        ${cl.updatedAt || (cl.createdAt && cl.createdAt.includes('T')) ? `
          <button class="btn btn-danger btn-sm" data-action="delete-checklist">${icon('trash', 16)} Verwijder</button>
        ` : ''}
      </div>
    `;

    container.querySelector('[data-action="back"]')?.addEventListener('click', () => {
      editingChecklist = null;
      activeView = 'list';
      render();
    });

    container.querySelector('[data-action="add-step"]')?.addEventListener('click', () => {
      syncEditFields();
      cl.steps.push({ id: generateId(), label: '' });
      renderEdit();
      // Focus last input
      setTimeout(() => {
        const inputs = container.querySelectorAll('[data-step-input]');
        inputs[inputs.length - 1]?.focus();
      }, 50);
    });

    cl.steps.forEach((_, i) => {
      container.querySelector(`[data-remove-step="${i}"]`)?.addEventListener('click', () => {
        syncEditFields();
        cl.steps.splice(i, 1);
        renderEdit();
      });
    });

    container.querySelector('[data-action="save-checklist"]')?.addEventListener('click', async () => {
      syncEditFields();
      if (!cl.title.trim()) { showToast('Vul een naam in', { type: 'error' }); return; }
      const validSteps = cl.steps.filter(s => s.label.trim());
      if (validSteps.length === 0) { showToast('Voeg minimaal 1 stap toe', { type: 'error' }); return; }
      cl.steps = validSteps;
      cl.updatedAt = new Date().toISOString();
      await put('checklists', cl);
      emit('checklists:updated');
      showToast('Checklist opgeslagen', { type: 'success' });
      editingChecklist = null;
      activeView = 'list';
      render();
    });

    container.querySelector('[data-action="delete-checklist"]')?.addEventListener('click', async () => {
      if (!confirm(`'${cl.title}' verwijderen?`)) return;
      await remove('checklists', cl.id);
      // Also remove related logs
      const logs = await getAll('checklistLogs');
      for (const log of logs.filter(l => l.checklistId === cl.id)) {
        await remove('checklistLogs', log.id);
      }
      emit('checklists:updated');
      showToast('Checklist verwijderd', { type: 'success' });
      editingChecklist = null;
      activeView = 'list';
      render();
    });
  }

  function syncEditFields() {
    if (!editingChecklist) return;
    const titleInput = container.querySelector('#cl-title');
    if (titleInput) editingChecklist.title = titleInput.value;
    editingChecklist.steps.forEach((step, i) => {
      const input = container.querySelector(`[data-step-input="${i}"]`);
      if (input) step.label = input.value;
    });
  }

  // ===== HISTORY VIEW =====
  function renderHistory(checklist, logs) {
    if (!checklist) { activeView = 'list'; render(); return; }
    const clLogs = logs
      .filter(l => l.checklistId === checklist.id)
      .sort((a, b) => b.date.localeCompare(a.date));

    container.innerHTML = `
      <div style="display:flex; align-items:center; gap:var(--space-3); margin-bottom:var(--space-4)">
        <button class="btn btn-ghost btn-sm" data-action="back">${icon('arrow-left', 16)} Terug</button>
        <h2 style="margin:0; font-size:1.125rem">${escapeHTML(checklist.title)} &mdash; Geschiedenis</h2>
      </div>
      ${clLogs.length === 0 ? `
        <div class="empty-state">
          <h3>Nog geen logs</h3>
          <p>Start de checklist om een log aan te maken</p>
        </div>
      ` : clLogs.map(log => {
        const total = checklist.steps.length;
        const done = log.completedSteps.length;
        const complete = done === total;
        return `
          <div class="card" style="margin-bottom:var(--space-3); ${complete ? 'border-left:3px solid var(--color-green, #10b981)' : ''}">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:var(--space-2)">
              <strong>${formatDateLong(log.date)}</strong>
              <span style="font-size:0.8rem; padding:2px 8px; border-radius:var(--radius-full); background:${complete ? 'var(--color-green, #10b981)' : 'var(--color-bg-secondary)'}; color:${complete ? '#fff' : 'var(--color-text-secondary)'}">
                ${done}/${total}
              </span>
            </div>
            ${log.notes ? `<p style="font-size:0.875rem; color:var(--color-text-secondary); margin:0">${escapeHTML(log.notes)}</p>` : ''}
          </div>
        `;
      }).join('')}
    `;

    container.querySelector('[data-action="back"]')?.addEventListener('click', () => {
      activeView = 'list';
      activeChecklistId = null;
      render();
    });
  }

  // ===== CONFETTI =====
  function launchConfetti() {
    const canvas = document.createElement('canvas');
    canvas.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; pointer-events:none; z-index:9999';
    document.body.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const colors = ['#f43f5e', '#f97316', '#f59e0b', '#10b981', '#4f6ef7', '#8b5cf6', '#ec4899'];
    const particles = [];

    for (let i = 0; i < 120; i++) {
      particles.push({
        x: canvas.width / 2 + (Math.random() - 0.5) * 200,
        y: canvas.height / 2 - 100,
        vx: (Math.random() - 0.5) * 16,
        vy: Math.random() * -14 - 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.random() * 8 + 4,
        rotation: Math.random() * 360,
        rotSpeed: (Math.random() - 0.5) * 12,
        gravity: 0.3 + Math.random() * 0.15,
        opacity: 1,
      });
    }

    let frame = 0;
    function animate() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = 0;
      for (const p of particles) {
        p.x += p.vx;
        p.vy += p.gravity;
        p.y += p.vy;
        p.rotation += p.rotSpeed;
        p.vx *= 0.99;
        if (frame > 40) p.opacity -= 0.015;

        if (p.opacity <= 0 || p.y > canvas.height + 50) continue;
        alive++;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.globalAlpha = Math.max(0, p.opacity);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        ctx.restore();
      }
      frame++;
      if (alive > 0 && frame < 180) {
        requestAnimationFrame(animate);
      } else {
        canvas.remove();
      }
    }
    requestAnimationFrame(animate);
  }

  render();
  unsubs.push(on('checklists:updated', render));
  return {
    destroy() { unsubs.forEach(fn => fn()); }
  };
}
