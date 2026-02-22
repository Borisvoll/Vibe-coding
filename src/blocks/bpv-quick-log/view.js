import { addHoursEntry, getHoursEntry } from '../../stores/bpv.js';
import { getToday, formatDateShort, calcNetMinutes, formatMinutes, escapeHTML } from '../../utils.js';
import { DAY_TYPES, DAY_TYPE_LABELS } from '../../constants.js';
import { expandBPVNote } from '../../ai/client.js';

export function renderBPVQuickLog(container, context) {
  const mountId = `bpv-ql-${crypto.randomUUID()}`;
  const { eventBus } = context;
  const today = getToday();
  const todayLabel = formatDateShort(today);

  container.insertAdjacentHTML('beforeend', `
    <article class="bpv-ql os-mini-card" data-mount-id="${mountId}">
      <div class="bpv-ql__header">
        <h3 class="bpv-ql__title">Snel loggen</h3>
        <span class="bpv-ql__date">${escapeHTML(todayLabel)}</span>
      </div>
      <div class="bpv-ql__type-row" role="group" aria-label="Dagtype">
        ${DAY_TYPES.map((t) => `
          <button type="button" class="bpv-ql__type-btn" data-type="${t}">${DAY_TYPE_LABELS[t]}</button>
        `).join('')}
      </div>
      <div class="bpv-ql__time-row" data-time-fields>
        <label class="bpv-ql__field">
          <span>Start</span>
          <input type="time" class="form-input bpv-ql__input" data-field="startTime" step="300">
        </label>
        <label class="bpv-ql__field">
          <span>Einde</span>
          <input type="time" class="form-input bpv-ql__input" data-field="endTime" step="300">
        </label>
        <label class="bpv-ql__field">
          <span>Pauze (min)</span>
          <input type="number" class="form-input bpv-ql__input bpv-ql__input--break"
            data-field="breakMinutes" min="0" max="240" value="45">
        </label>
        <div class="bpv-ql__net" data-net-display>Netto: —</div>
      </div>
      <div class="bpv-ql__field bpv-ql__field--full">
        <div style="display:flex;align-items:center;gap:var(--space-2);margin-bottom:var(--space-1)">
          <span>Notitie</span>
          <button type="button" class="btn btn-ghost btn-sm" data-action="ai-note" title="Schrijf professionele notitie met AI">✨</button>
        </div>
        <input type="text" class="form-input bpv-ql__input"
          data-field="note" placeholder="Korte notitie over de dag…" maxlength="200">
      </div>
      <div class="bpv-ql__footer">
        <span class="bpv-ql__status" data-status></span>
        <button type="button" class="btn btn-primary btn-sm bpv-ql__save" data-action="save">
          Opslaan
        </button>
      </div>
    </article>
  `);

  const el = container.querySelector(`[data-mount-id="${mountId}"]`);
  const typeRow = el.querySelector('.bpv-ql__type-row');
  const timeFields = el.querySelector('[data-time-fields]');
  const netDisplay = el.querySelector('[data-net-display]');
  const statusEl = el.querySelector('[data-status]');
  const saveBtn = el.querySelector('[data-action="save"]');

  let activeType = 'work';

  function setType(type) {
    activeType = type;
    typeRow.querySelectorAll('.bpv-ql__type-btn').forEach((btn) => {
      btn.classList.toggle('bpv-ql__type-btn--active', btn.dataset.type === type);
      btn.setAttribute('aria-pressed', String(btn.dataset.type === type));
    });
    timeFields.hidden = type !== 'work';
  }

  function updateNet() {
    const start = el.querySelector('[data-field="startTime"]').value;
    const end = el.querySelector('[data-field="endTime"]').value;
    const brk = Number(el.querySelector('[data-field="breakMinutes"]').value) || 0;
    if (start && end) {
      const net = calcNetMinutes(start, end, brk);
      netDisplay.textContent = `Netto: ${formatMinutes(net)}`;
      netDisplay.classList.toggle('bpv-ql__net--ok', net > 0);
    } else {
      netDisplay.textContent = 'Netto: —';
      netDisplay.classList.remove('bpv-ql__net--ok');
    }
  }

  function setStatus(msg, isError = false) {
    statusEl.textContent = msg;
    statusEl.classList.toggle('bpv-ql__status--error', isError);
    if (!isError) setTimeout(() => { statusEl.textContent = ''; }, 2500);
  }

  async function populateFromExisting() {
    const entry = await getHoursEntry(today);
    if (!entry) {
      setType('work');
      return;
    }
    setType(entry.type || 'work');
    if (entry.type === 'work') {
      if (entry.startTime) el.querySelector('[data-field="startTime"]').value = entry.startTime;
      if (entry.endTime) el.querySelector('[data-field="endTime"]').value = entry.endTime;
      el.querySelector('[data-field="breakMinutes"]').value = entry.breakMinutes ?? 45;
    }
    el.querySelector('[data-field="note"]').value = entry.note || '';
    updateNet();
    setStatus('Bestaande invoer geladen');
  }

  // Type buttons
  typeRow.addEventListener('click', (e) => {
    const btn = e.target.closest('.bpv-ql__type-btn');
    if (btn) setType(btn.dataset.type);
  });

  // Live net calculation
  el.querySelectorAll('[data-field="startTime"], [data-field="endTime"], [data-field="breakMinutes"]')
    .forEach((input) => input.addEventListener('input', updateNet));

  // Save
  saveBtn.addEventListener('click', async () => {
    saveBtn.disabled = true;
    try {
      const startTime = el.querySelector('[data-field="startTime"]').value || null;
      const endTime = el.querySelector('[data-field="endTime"]').value || null;
      const breakMinutes = Number(el.querySelector('[data-field="breakMinutes"]').value) || 0;
      const note = el.querySelector('[data-field="note"]').value;

      if (activeType === 'work' && startTime && endTime) {
        const net = calcNetMinutes(startTime, endTime, breakMinutes);
        if (net <= 0) {
          setStatus('Eindtijd moet na starttijd liggen.', true);
          return;
        }
      }

      await addHoursEntry(today, { type: activeType, startTime, endTime, breakMinutes, note });
      setStatus('Opgeslagen ✓');
      updateNet();
      eventBus?.emit('bpv:changed', { date: today });
    } catch (err) {
      setStatus(`Fout: ${err.message}`, true);
    } finally {
      saveBtn.disabled = false;
    }
  });

  // ── AI Note Expansion ──
  const aiNoteBtn = el.querySelector('[data-action="ai-note"]');
  aiNoteBtn?.addEventListener('click', async () => {
    const noteInput = el.querySelector('[data-field="note"]');
    const shortNote = noteInput.value.trim();
    if (!shortNote) { setStatus('Typ eerst een korte notitie.', true); return; }
    aiNoteBtn.disabled = true;
    aiNoteBtn.textContent = '…';
    try {
      const expanded = await expandBPVNote(shortNote);
      noteInput.value = expanded.trim().slice(0, 200);
      setStatus('Notitie uitgebreid ✓');
    } catch (err) {
      setStatus(err.message, true);
    } finally {
      aiNoteBtn.disabled = false;
      aiNoteBtn.textContent = '✨';
    }
  });

  setType('work');
  populateFromExisting();

  const unsubBPV = eventBus?.on('bpv:changed', () => populateFromExisting());

  return {
    unmount() {
      unsubBPV?.();
      el?.remove();
    },
  };
}
