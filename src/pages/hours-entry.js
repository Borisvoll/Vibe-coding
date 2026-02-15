import { getHoursByDate, put, softDelete, undoDelete } from '../db.js';
import { icon } from '../icons.js';
import { navigate } from '../router.js';
import { emit } from '../state.js';
import { showToast } from '../toast.js';
import {
  formatDateLong, calcNetMinutes, formatMinutes, isWithinBPV,
  generateId, getISOWeek
} from '../utils.js';
import { DAY_TYPES, DAY_TYPE_LABELS, DEFAULT_BREAK_MINUTES } from '../constants.js';

export function createPage(container, params) {
  const dateStr = params.date;
  if (!dateStr || !isWithinBPV(dateStr)) {
    container.innerHTML = `
      <div class="empty-state">
        <h3>Ongeldige datum</h3>
        <p>Deze datum valt buiten de BPV-periode.</p>
        <button class="btn btn-secondary" onclick="window.location.hash='hours'">Terug naar uren</button>
      </div>
    `;
    return {};
  }

  let entry = null;

  async function load() {
    entry = await getHoursByDate(dateStr);
    render();
  }

  function render() {
    const type = entry?.type || 'work';
    const startTime = entry?.startTime || '08:00';
    const endTime = entry?.endTime || '16:45';
    const breakMin = entry?.breakMinutes ?? DEFAULT_BREAK_MINUTES;
    const note = entry?.note || '';
    const net = type === 'work' ? calcNetMinutes(startTime, endTime, breakMin) : 0;

    container.innerHTML = `
      <div class="hours-entry-header">
        <button class="btn btn-icon btn-ghost" data-action="back">
          ${icon('arrow-left')}
        </button>
        <div class="hours-entry-date">${formatDateLong(dateStr)}</div>
      </div>

      <form id="hours-form">
        <div class="form-group">
          <label class="form-label">Type</label>
          <div class="radio-group">
            ${DAY_TYPES.map(t => `
              <label class="radio-option ${t === type ? 'selected' : ''}">
                <input type="radio" name="type" value="${t}" ${t === type ? 'checked' : ''}>
                ${DAY_TYPE_LABELS[t]}
              </label>
            `).join('')}
          </div>
        </div>

        <div id="work-fields" style="${type !== 'work' ? 'display:none' : ''}">
          <div class="form-row">
            <div class="form-group">
              <label class="form-label" for="start-time">Starttijd</label>
              <input type="time" id="start-time" class="form-input" value="${startTime}">
            </div>
            <div class="form-group">
              <label class="form-label" for="end-time">Eindtijd</label>
              <input type="time" id="end-time" class="form-input" value="${endTime}">
            </div>
          </div>

          <div class="form-group">
            <label class="form-label" for="break-min">Pauze (minuten)</label>
            <input type="number" id="break-min" class="form-input" value="${breakMin}" min="0" max="480" step="5">
          </div>

          <div class="hours-entry-calculated">
            <div class="stat-value" id="net-display">${formatMinutes(net)}</div>
            <div class="stat-label">Netto werktijd</div>
          </div>
        </div>

        <div class="form-group" style="margin-top: var(--space-6)">
          <label class="form-label" for="note">Opmerking (optioneel)</label>
          <input type="text" id="note" class="form-input" value="${note}" placeholder="Korte notitie...">
        </div>

        <div class="hours-entry-actions">
          <button type="submit" class="btn btn-primary" data-action="save">
            ${icon('save', 16)} Opslaan
          </button>
          ${entry ? `
            <button type="button" class="btn btn-danger" data-action="delete">
              ${icon('trash', 16)} Verwijderen
            </button>
          ` : ''}
        </div>
      </form>
    `;

    // Radio group
    container.querySelectorAll('.radio-option').forEach(opt => {
      opt.addEventListener('click', () => {
        container.querySelectorAll('.radio-option').forEach(o => o.classList.remove('selected'));
        opt.classList.add('selected');
        opt.querySelector('input').checked = true;
        const isWork = opt.querySelector('input').value === 'work';
        document.getElementById('work-fields').style.display = isWork ? '' : 'none';
        updateNet();
      });
    });

    // Live calculation
    const startEl = document.getElementById('start-time');
    const endEl = document.getElementById('end-time');
    const breakEl = document.getElementById('break-min');
    const netDisplay = document.getElementById('net-display');

    function updateNet() {
      const st = startEl?.value;
      const en = endEl?.value;
      const br = parseInt(breakEl?.value || '0', 10);
      if (netDisplay) {
        netDisplay.textContent = formatMinutes(calcNetMinutes(st, en, br));
      }
    }

    startEl?.addEventListener('input', updateNet);
    endEl?.addEventListener('input', updateNet);
    breakEl?.addEventListener('input', updateNet);

    // Back
    container.querySelector('[data-action="back"]').addEventListener('click', () => {
      navigate('hours');
    });

    // Save
    container.querySelector('#hours-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      await save();
    });

    // Delete
    container.querySelector('[data-action="delete"]')?.addEventListener('click', async () => {
      await deleteEntry();
    });
  }

  async function save() {
    const form = container.querySelector('#hours-form');
    const type = form.querySelector('input[name="type"]:checked')?.value || 'work';
    const startTime = type === 'work' ? document.getElementById('start-time').value : null;
    const endTime = type === 'work' ? document.getElementById('end-time').value : null;
    const breakMinutes = type === 'work' ? parseInt(document.getElementById('break-min').value || '0', 10) : 0;
    const note = document.getElementById('note').value.trim();

    // Validation
    if (type === 'work') {
      if (!startTime || !endTime) {
        showToast('Vul start- en eindtijd in', { type: 'error' });
        return;
      }
      if (endTime <= startTime) {
        showToast('Eindtijd moet na starttijd liggen', { type: 'error' });
        return;
      }
    }

    const netMinutes = type === 'work' ? calcNetMinutes(startTime, endTime, breakMinutes) : 0;

    const record = {
      id: entry?.id || generateId(),
      date: dateStr,
      week: getISOWeek(dateStr),
      type,
      startTime,
      endTime,
      breakMinutes,
      netMinutes,
      note,
      createdAt: entry?.createdAt || Date.now(),
      updatedAt: Date.now()
    };

    await put('hours', record);
    emit('hours:updated');
    showToast('Uren opgeslagen', { type: 'success' });
    navigate('hours');
  }

  async function deleteEntry() {
    if (!entry) return;
    const id = entry.id;
    await softDelete('hours', id);
    emit('hours:updated');
    showToast('Uren verwijderd', {
      type: 'info',
      action: {
        label: 'Ongedaan maken',
        onClick: async () => {
          await undoDelete(id);
          emit('hours:updated');
          showToast('Hersteld', { type: 'success' });
        }
      }
    });
    navigate('hours');
  }

  load();
  return {};
}
