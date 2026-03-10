import { getAll, put, getSetting } from '../../db.js';
import { icon } from '../../icons.js';
import { navigate } from '../../router.js';
import { on, emit } from '../../core/eventBus.js';
import { getToday, formatDateShort, generateId } from '../../utils.js';
import { showToast } from '../../toast.js';

const ENERGY_LABELS = ['Leeg', 'Laag', 'Ok\u00e9', 'Goed', 'Vol energie'];
const MOOD_LABELS = ['Zwaar', 'Mwah', 'Neutraal', 'Blij', 'Stralend'];

export function createPage(container) {
  const unsubs = [];
  const today = getToday();
  let saveTimer = null;

  async function render() {
    const [tasks, energyRecords, userName] = await Promise.all([
      getAll('personalTasks').then(t => t.filter(x => x.date === today)).catch(() => []),
      getAll('energy').then(e => e.filter(x => x.date === today)).catch(() => []),
      getSetting('user_name'),
    ]);

    const energyData = energyRecords[0] || null;
    const currentLevel = energyData?.level || 0;
    const currentMood = energyData?.mood || 0;
    const currentGratitude = energyData?.gratitude || '';
    const currentPhysical = energyData?.physicalState || '';

    const openTasks = tasks.filter(t => !t.done);
    const doneTasks = tasks.filter(t => t.done);

    container.innerHTML = `
      <div class="hub-header" style="padding: var(--space-6) 0 var(--space-4)">
        <div class="hub-header-text">
          <h2 style="font-weight: 500; letter-spacing: -0.01em">
            ${icon('sun', 22)} Vandaag \u2014 ${formatDateShort(today)}
          </h2>
          <p style="color: var(--color-text-tertiary); font-size: 0.8125rem; margin-top: var(--space-1)">Persoonlijk</p>
        </div>
      </div>

      <!-- Energy & Mood -->
      <div class="card" style="border-left: 3px solid var(--color-teal); margin-bottom: var(--space-6); padding: var(--space-5)">
        <div style="font-size: 0.75rem; color: var(--color-text-tertiary); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: var(--space-4)">
          ${icon('zap', 14)} Energie & Stemming
        </div>

        <!-- Energy level -->
        <div style="margin-bottom: var(--space-5)">
          <label style="display: block; font-size: 0.8125rem; color: var(--color-text-secondary); margin-bottom: var(--space-2); font-weight: 500">Energieniveau</label>
          <div class="energy-selector" data-type="energy" style="display: flex; align-items: center; gap: var(--space-3)">
            ${[1, 2, 3, 4, 5].map(level => `
              <button class="energy-dot ${currentLevel === level ? 'active' : ''}"
                data-level="${level}"
                style="
                  width: 36px; height: 36px; border-radius: 50%; border: 2px solid var(--color-teal);
                  background: ${currentLevel === level ? 'var(--color-teal)' : 'transparent'};
                  color: ${currentLevel === level ? '#fff' : 'var(--color-teal)'};
                  font-size: 0.75rem; font-weight: 600; cursor: pointer;
                  display: flex; align-items: center; justify-content: center;
                  transition: all 0.2s ease;
                "
                title="${ENERGY_LABELS[level - 1]}"
              >${level}</button>
            `).join('')}
            <span style="font-size: 0.75rem; color: var(--color-text-tertiary); margin-left: var(--space-2)">${currentLevel ? ENERGY_LABELS[currentLevel - 1] : ''}</span>
          </div>
        </div>

        <!-- Mood -->
        <div style="margin-bottom: var(--space-5)">
          <label style="display: block; font-size: 0.8125rem; color: var(--color-text-secondary); margin-bottom: var(--space-2); font-weight: 500">Stemming</label>
          <div class="energy-selector" data-type="mood" style="display: flex; align-items: center; gap: var(--space-3)">
            ${[1, 2, 3, 4, 5].map(level => `
              <button class="energy-dot ${currentMood === level ? 'active' : ''}"
                data-level="${level}"
                style="
                  width: 36px; height: 36px; border-radius: 50%; border: 2px solid var(--color-teal);
                  background: ${currentMood === level ? 'var(--color-teal)' : 'transparent'};
                  color: ${currentMood === level ? '#fff' : 'var(--color-teal)'};
                  font-size: 0.75rem; font-weight: 600; cursor: pointer;
                  display: flex; align-items: center; justify-content: center;
                  transition: all 0.2s ease;
                "
                title="${MOOD_LABELS[level - 1]}"
              >${level}</button>
            `).join('')}
            <span style="font-size: 0.75rem; color: var(--color-text-tertiary); margin-left: var(--space-2)">${currentMood ? MOOD_LABELS[currentMood - 1] : ''}</span>
          </div>
        </div>

        <!-- Gratitude -->
        <div style="margin-bottom: var(--space-4)">
          <label style="display: block; font-size: 0.8125rem; color: var(--color-text-secondary); margin-bottom: var(--space-2); font-weight: 500">Dankbaarheid</label>
          <input type="text" class="form-input" id="gratitude-input"
            placeholder="Waar ben ik dankbaar voor?"
            value="${currentGratitude.replace(/"/g, '&quot;')}"
            style="width: 100%; font-size: 0.875rem"
          >
        </div>

        <!-- Physical state -->
        <div>
          <label style="display: block; font-size: 0.8125rem; color: var(--color-text-secondary); margin-bottom: var(--space-2); font-weight: 500">Lichaam</label>
          <input type="text" class="form-input" id="physical-input"
            placeholder="Hoe voelt mijn lichaam?"
            value="${currentPhysical.replace(/"/g, '&quot;')}"
            style="width: 100%; font-size: 0.875rem"
          >
        </div>
      </div>

      <!-- Tasks -->
      <div class="hub-section" style="padding: var(--space-5) 0">
        <div class="hub-section-header">
          <h3>${icon('clipboard-check', 18)} Taken (max 5)</h3>
          <span class="hub-section-badge ${openTasks.length === 0 && doneTasks.length > 0 ? 'badge-emerald' : ''}" style="color: var(--color-teal)">${doneTasks.length}/${tasks.length || 0}</span>
        </div>

        <div class="hub-tasks" style="margin-top: var(--space-3)">
          ${tasks.length === 0 ? `
            <div style="padding: var(--space-5); color: var(--color-text-tertiary); text-align: center; font-size: 0.875rem">
              Nog geen taken voor vandaag
            </div>
          ` : tasks.map(task => `
            <div class="hub-task ${task.done ? 'hub-task-done' : ''}" data-task-id="${task.id}" style="padding: var(--space-3); display: flex; align-items: center; gap: var(--space-3)">
              <div class="hub-task-check" data-action="toggle" style="--task-color: var(--color-teal); cursor: pointer; flex-shrink: 0">
                ${task.done
                  ? `<span class="hub-check-filled" style="color: var(--color-teal)">${icon('check-circle', 20)}</span>`
                  : `<span class="hub-check-empty"></span>`
                }
              </div>
              <span class="hub-task-label ${task.done ? 'hub-task-struck' : ''}" style="flex: 1; font-size: 0.875rem">${task.title}</span>
              <button class="meaningful-toggle" data-action="meaningful" data-task-id="${task.id}"
                title="${task.meaningful ? 'Betekenisvolle actie (actief)' : 'Markeer als betekenisvolle actie'}"
                style="
                  background: none; border: none; cursor: pointer; padding: var(--space-1);
                  color: ${task.meaningful ? 'var(--color-teal)' : 'var(--color-text-tertiary)'};
                  opacity: ${task.meaningful ? '1' : '0.4'};
                  transition: all 0.2s ease;
                  flex-shrink: 0;
                "
              >${icon('target', 16)}</button>
            </div>
          `).join('')}
        </div>

        ${tasks.length < 5 ? `
          <div style="margin-top: var(--space-4)">
            <div class="inline-add-form" id="add-task-form" style="display: flex; gap: var(--space-2)">
              <input type="text" class="form-input" id="new-task-input" placeholder="Nieuwe taak..." maxlength="200" style="flex:1; font-size: 0.875rem">
              <button class="btn btn-primary btn-sm" id="add-task-btn" style="background: var(--color-teal); border-color: var(--color-teal)">${icon('plus', 14)} Toevoegen</button>
            </div>
          </div>
        ` : ''}
      </div>

      <!-- Quick nav -->
      <div class="hub-section" style="padding: var(--space-5) 0">
        <div class="hub-section-header">
          <h3>${icon('zap', 18)} Snel naar</h3>
        </div>
        <div class="hub-modules" style="margin-top: var(--space-3)">
          <div class="hub-module" data-nav="personal-planning" style="cursor: pointer">
            <div class="hub-module-icon" style="color: var(--color-teal)">${icon('clipboard-check', 20)}</div>
            <span>Planning</span>
          </div>
          <div class="hub-module" data-nav="personal-reflectie" style="cursor: pointer">
            <div class="hub-module-icon" style="color: var(--color-teal)">${icon('edit', 20)}</div>
            <span>Reflectie</span>
          </div>
        </div>
      </div>
    `;

    // --- Event listeners ---

    // Energy & mood dot selectors
    container.querySelectorAll('.energy-selector').forEach(selector => {
      const type = selector.dataset.type; // 'energy' or 'mood'
      selector.querySelectorAll('.energy-dot').forEach(dot => {
        dot.addEventListener('click', async () => {
          const level = parseInt(dot.dataset.level, 10);
          await saveEnergyField(type === 'energy' ? 'level' : 'mood', level, energyData);
          render();
        });
      });
    });

    // Gratitude & physical state inputs — auto-save with debounce
    const gratitudeInput = container.querySelector('#gratitude-input');
    const physicalInput = container.querySelector('#physical-input');

    [gratitudeInput, physicalInput].forEach(input => {
      if (!input) return;
      input.addEventListener('input', () => {
        clearTimeout(saveTimer);
        saveTimer = setTimeout(async () => {
          const gratitude = container.querySelector('#gratitude-input')?.value || '';
          const physicalState = container.querySelector('#physical-input')?.value || '';
          await saveEnergyFields({ gratitude, physicalState }, energyData);
          showToast('Opgeslagen', { type: 'success', duration: 1500 });
        }, 800);
      });
    });

    // Toggle task done
    container.querySelectorAll('.hub-task-check[data-action="toggle"]').forEach(el => {
      el.addEventListener('click', async (e) => {
        e.stopPropagation();
        const taskEl = el.closest('.hub-task');
        const id = taskEl?.dataset.taskId;
        const task = tasks.find(t => t.id === id);
        if (task) {
          task.done = !task.done;
          task.updatedAt = new Date().toISOString();
          await put('personalTasks', task);
          emit('personalTasks:updated');
          render();
        }
      });
    });

    // Meaningful action toggle
    container.querySelectorAll('[data-action="meaningful"]').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const taskId = btn.dataset.taskId;
        const task = tasks.find(t => t.id === taskId);
        if (!task) return;

        if (!task.meaningful) {
          // Unmark any other meaningful task first
          for (const t of tasks) {
            if (t.meaningful && t.id !== taskId) {
              t.meaningful = false;
              t.updatedAt = new Date().toISOString();
              await put('personalTasks', t);
            }
          }
          task.meaningful = true;
        } else {
          task.meaningful = false;
        }
        task.updatedAt = new Date().toISOString();
        await put('personalTasks', task);
        emit('personalTasks:updated');
        render();
      });
    });

    // Add task
    const addBtn = container.querySelector('#add-task-btn');
    const taskInput = container.querySelector('#new-task-input');
    if (addBtn && taskInput) {
      const addTask = async () => {
        const title = taskInput.value.trim();
        if (!title) return;
        await put('personalTasks', {
          id: generateId(),
          title,
          date: today,
          done: false,
          meaningful: false,
          mode: 'personal',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
        emit('personalTasks:updated');
        render();
      };
      addBtn.addEventListener('click', addTask);
      taskInput.addEventListener('keydown', e => { if (e.key === 'Enter') addTask(); });
    }

    // Navigation
    container.querySelectorAll('[data-nav]').forEach(el => {
      el.addEventListener('click', () => navigate(el.dataset.nav));
    });
  }

  async function saveEnergyField(field, value, existing) {
    const record = existing || {
      id: generateId(),
      date: today,
      level: 0,
      mood: 0,
      gratitude: '',
      physicalState: '',
      mode: 'personal',
      createdAt: new Date().toISOString(),
    };
    record[field] = value;
    record.updatedAt = new Date().toISOString();
    await put('energy', record);
    emit('energy:updated');
  }

  async function saveEnergyFields(fields, existing) {
    const record = existing || {
      id: generateId(),
      date: today,
      level: 0,
      mood: 0,
      gratitude: '',
      physicalState: '',
      mode: 'personal',
      createdAt: new Date().toISOString(),
    };
    Object.assign(record, fields);
    record.updatedAt = new Date().toISOString();
    await put('energy', record);
    emit('energy:updated');
  }

  render();
  unsubs.push(on('personalTasks:updated', render));
  unsubs.push(on('energy:updated', render));

  return { destroy() { unsubs.forEach(fn => fn()); } };
}
