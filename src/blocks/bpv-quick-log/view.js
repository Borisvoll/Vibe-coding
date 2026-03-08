import { addHoursEntry, getHoursEntry, addPhoto, getPhotosForDate, deletePhoto } from '../../stores/bpv.js';
import { getToday, getISOWeek, getWeekDates, formatDateShort, formatDateISO, calcNetMinutes, formatMinutes, escapeHTML, sanitizeDataURL, debounce, resizeImage } from '../../utils.js';
import { DAY_TYPES, DAY_TYPE_LABELS, BPV_START, BPV_END } from '../../constants.js';

const DAY_TEMPLATES = [
  { id: 'productie', label: 'Productiedag', startTime: '07:30', endTime: '16:00', breakMinutes: 45, activities: ['CNC-productie', 'Kwaliteitscontrole', 'Opruimen werkplek'] },
  { id: 'kantoor', label: 'Kantoordag', startTime: '08:30', endTime: '17:00', breakMinutes: 60, activities: ['Tekeningen uitwerken', 'Overleg team', 'Administratie'] },
  { id: 'meet', label: 'Meetdag', startTime: '08:00', endTime: '16:30', breakMinutes: 45, activities: ['Meetinstrumenten kalibreren', 'Producten inmeten', 'Meetrapporten opstellen'] },
];
import { expandBPVNote } from '../../ai/client.js';

const WEEKDAY_SHORT = ['ma', 'di', 'wo', 'do', 'vr'];

export function renderBPVQuickLog(container, context) {
  const mountId = `bpv-ql-${crypto.randomUUID()}`;
  const { eventBus } = context;
  const today = getToday();
  let selectedDate = today;

  container.insertAdjacentHTML('beforeend', `
    <article class="bpv-ql os-mini-card" data-mount-id="${mountId}">
      <div class="bpv-ql__header">
        <h3 class="bpv-ql__title">Uren &amp; activiteiten</h3>
        <div class="bpv-ql__date-nav">
          <button type="button" class="bpv-ql__date-btn" data-action="prev-week" title="Vorige week">&#171;</button>
          <button type="button" class="bpv-ql__date-btn" data-action="prev-day" title="Vorige dag">&larr;</button>
          <input type="date" class="bpv-ql__date-input" data-action="pick-date"
            value="${today}" min="${BPV_START}" max="${BPV_END}">
          <button type="button" class="bpv-ql__date-btn" data-action="next-day" title="Volgende dag">&rarr;</button>
          <button type="button" class="bpv-ql__date-btn" data-action="next-week" title="Volgende week">&#187;</button>
        </div>
      </div>
      <div class="bpv-ql__week-strip" data-week-strip></div>
      <div class="bpv-ql__date-label" data-date-label>${escapeHTML(formatDateShort(today))}${today === getToday() ? ' (vandaag)' : ''}</div>
      <div class="bpv-ql__templates" data-templates>
        <button type="button" class="btn btn-ghost btn-sm" data-action="copy-yesterday" title="Kopieer uren en activiteiten van gisteren">Kopieer van gisteren</button>
        ${DAY_TEMPLATES.map(t => `<button type="button" class="btn btn-ghost btn-sm" data-template="${t.id}" title="${escapeHTML(t.label)}">${escapeHTML(t.label)}</button>`).join('')}
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
      <div class="bpv-ql__activities" data-activities-section>
        <div class="bpv-ql__activities-label">Wat heb je vandaag gedaan?</div>
        <div class="bpv-ql__activities-fields">
          <div class="bpv-ql__activity-row">
            <span class="bpv-ql__activity-num">1</span>
            <input type="text" class="form-input bpv-ql__input" data-field="activity-0"
              placeholder="Bijv. CNC-freeswerk afgerond" maxlength="200">
          </div>
          <div class="bpv-ql__activity-row">
            <span class="bpv-ql__activity-num">2</span>
            <input type="text" class="form-input bpv-ql__input" data-field="activity-1"
              placeholder="Bijv. Tekening uitgewerkt in SolidWorks" maxlength="200">
          </div>
          <div class="bpv-ql__activity-row">
            <span class="bpv-ql__activity-num">3</span>
            <input type="text" class="form-input bpv-ql__input" data-field="activity-2"
              placeholder="Bijv. Kwaliteitscontrole uitgevoerd" maxlength="200">
          </div>
        </div>
      </div>
      <div class="bpv-ql__field bpv-ql__field--full">
        <div style="display:flex;align-items:center;gap:var(--space-2);margin-bottom:var(--space-1)">
          <span>Notitie</span>
          <button type="button" class="btn btn-ghost btn-sm" data-action="ai-note" title="Schrijf professionele notitie met AI">✨</button>
        </div>
        <input type="text" class="form-input bpv-ql__input"
          data-field="note" placeholder="Korte notitie over de dag…" maxlength="200">
      </div>
      <div class="bpv-ql__photos-section" data-photos-section>
        <div class="bpv-ql__photos-header">
          <span class="bpv-ql__photos-label">Foto's</span>
          <label class="btn btn-ghost btn-sm bpv-ql__photo-btn" title="Foto toevoegen">
            📷 Foto
            <input type="file" accept="image/*" capture="environment" class="bpv-ql__photo-input" data-action="add-photo" hidden>
          </label>
        </div>
        <div class="bpv-ql__photos-grid" data-photos-grid></div>
      </div>
      <div class="bpv-ql__footer">
        <span class="bpv-ql__status" data-status></span>
        <div class="bpv-ql__footer-actions">
          <button type="button" class="btn btn-ghost btn-sm" data-action="today" title="Ga naar vandaag">Vandaag</button>
          <button type="button" class="btn btn-primary btn-sm bpv-ql__save" data-action="save">
            Opslaan
          </button>
        </div>
      </div>
    </article>
  `);

  const el = container.querySelector(`[data-mount-id="${mountId}"]`);
  const typeRow = el.querySelector('.bpv-ql__type-row');
  const timeFields = el.querySelector('[data-time-fields]');
  const netDisplay = el.querySelector('[data-net-display]');
  const statusEl = el.querySelector('[data-status]');
  const saveBtn = el.querySelector('[data-action="save"]');
  const weekStrip = el.querySelector('[data-week-strip]');

  let activeType = 'work';

  // ── Week strip rendering ──
  async function renderWeekStrip() {
    const week = getISOWeek(selectedDate);
    const dates = getWeekDates(week);
    const entries = await Promise.all(dates.map(d => getHoursEntry(d).catch(() => null)));

    weekStrip.innerHTML = dates.map((d, i) => {
      const entry = entries[i];
      const isSelected = d === selectedDate;
      const isToday = d === getToday();
      const hasEntry = !!entry;
      const dayNum = d.split('-')[2].replace(/^0/, '');
      const statusCls = hasEntry ? 'bpv-ql__ws-day--filled' : '';
      const selectedCls = isSelected ? 'bpv-ql__ws-day--active' : '';
      const todayCls = isToday ? 'bpv-ql__ws-day--today' : '';
      const inRange = d >= BPV_START && d <= BPV_END;
      return `
        <button type="button" class="bpv-ql__ws-day ${statusCls} ${selectedCls} ${todayCls}"
          data-ws-date="${d}" ${!inRange ? 'disabled' : ''} title="${escapeHTML(formatDateShort(d))}">
          <span class="bpv-ql__ws-name">${WEEKDAY_SHORT[i]}</span>
          <span class="bpv-ql__ws-num">${dayNum}</span>
          ${hasEntry ? '<span class="bpv-ql__ws-dot"></span>' : ''}
        </button>
      `;
    }).join('');

    weekStrip.querySelectorAll('[data-ws-date]').forEach(btn => {
      btn.addEventListener('click', () => {
        const d = btn.dataset.wsDate;
        if (d >= BPV_START && d <= BPV_END) {
          selectedDate = d;
          const dateInput = el.querySelector('[data-action="pick-date"]');
          if (dateInput) dateInput.value = selectedDate;
          updateDateLabel();
          populateFromExisting();
          renderWeekStrip();
        }
      });
    });
  }

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

  function getActivities() {
    return [
      el.querySelector('[data-field="activity-0"]')?.value || '',
      el.querySelector('[data-field="activity-1"]')?.value || '',
      el.querySelector('[data-field="activity-2"]')?.value || '',
    ];
  }

  function setActivities(activities) {
    const acts = Array.isArray(activities) ? activities : [];
    for (let i = 0; i < 3; i++) {
      const input = el.querySelector(`[data-field="activity-${i}"]`);
      if (input) input.value = acts[i] || '';
    }
  }

  async function populateFromExisting() {
    const entry = await getHoursEntry(selectedDate);
    if (!entry) {
      setType('work');
      el.querySelector('[data-field="startTime"]').value = '08:00';
      el.querySelector('[data-field="endTime"]').value = '';
      el.querySelector('[data-field="breakMinutes"]').value = '45';
      el.querySelector('[data-field="note"]').value = '';
      setActivities([]);
      updateNet();
      updateActivitiesLabel();
      return;
    }
    setType(entry.type || 'work');
    if (entry.type === 'work') {
      if (entry.startTime) el.querySelector('[data-field="startTime"]').value = entry.startTime;
      if (entry.endTime) el.querySelector('[data-field="endTime"]').value = entry.endTime;
      el.querySelector('[data-field="breakMinutes"]').value = entry.breakMinutes ?? 45;
    }
    el.querySelector('[data-field="note"]').value = entry.note || '';
    setActivities(entry.activities);
    updateNet();
    updateActivitiesLabel();
    setStatus('Bestaande invoer geladen');
  }

  function updateActivitiesLabel() {
    const label = el.querySelector('.bpv-ql__activities-label');
    if (!label) return;
    const isToday = selectedDate === getToday();
    label.textContent = isToday
      ? 'Wat heb je vandaag gedaan?'
      : `Wat heb je gedaan op ${formatDateShort(selectedDate)}?`;
  }

  function updateDateLabel() {
    const label = el.querySelector('[data-date-label]');
    if (label) {
      const suffix = selectedDate === getToday() ? ' (vandaag)' : '';
      label.textContent = formatDateShort(selectedDate) + suffix;
    }
  }

  function navigateDate(offset) {
    const d = new Date(selectedDate + 'T00:00:00');
    d.setDate(d.getDate() + offset);
    const newDate = formatDateISO(d);
    if (newDate < BPV_START || newDate > BPV_END) return;
    selectedDate = newDate;
    const dateInput = el.querySelector('[data-action="pick-date"]');
    if (dateInput) dateInput.value = selectedDate;
    updateDateLabel();
    populateFromExisting();
    renderWeekStrip();
  }

  // ── Core save logic (shared between manual + auto-save) ──
  async function doSave({ silent = false } = {}) {
    const startTime = el.querySelector('[data-field="startTime"]').value || null;
    const endTime = el.querySelector('[data-field="endTime"]').value || null;
    const breakMinutes = Number(el.querySelector('[data-field="breakMinutes"]').value) || 0;
    const note = el.querySelector('[data-field="note"]').value;
    const activities = getActivities();

    if (activeType === 'work') {
      if (!startTime || !endTime) {
        if (!silent) {
          setStatus('Vul start- en eindtijd in.', true);
          const focusField = !startTime ? 'startTime' : 'endTime';
          el.querySelector(`[data-field="${focusField}"]`)?.focus();
        }
        return false;
      }
      const net = calcNetMinutes(startTime, endTime, breakMinutes);
      if (net <= 0) {
        if (!silent) setStatus('Eindtijd moet na starttijd liggen.', true);
        return false;
      }
    }

    await addHoursEntry(selectedDate, { type: activeType, startTime, endTime, breakMinutes, note, activities });
    if (!silent) setStatus('Opgeslagen ✓');
    updateNet();
    renderWeekStrip();
    eventBus?.emit('bpv:changed', { date: selectedDate });
    return true;
  }

  // Type buttons
  typeRow.addEventListener('click', (e) => {
    const btn = e.target.closest('.bpv-ql__type-btn');
    if (!btn) return;
    setType(btn.dataset.type);
    if (btn.dataset.type !== 'work') doSave({ silent: true });
  });

  // Auto-save on field change (debounced)
  const autoSave = debounce(() => doSave({ silent: true }), 800);

  // Live net calculation + auto-save
  el.querySelectorAll('[data-field="startTime"], [data-field="endTime"], [data-field="breakMinutes"]')
    .forEach((input) => input.addEventListener('input', () => { updateNet(); autoSave(); }));

  // Auto-save note changes
  el.querySelector('[data-field="note"]')?.addEventListener('input', autoSave);

  // Auto-save activity changes
  el.querySelectorAll('[data-field="activity-0"], [data-field="activity-1"], [data-field="activity-2"]')
    .forEach((input) => input.addEventListener('input', autoSave));

  // Manual save (fallback)
  saveBtn.addEventListener('click', async () => {
    saveBtn.disabled = true;
    try {
      await doSave();
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

  // Date navigation
  el.querySelector('[data-action="prev-day"]')?.addEventListener('click', () => navigateDate(-1));
  el.querySelector('[data-action="next-day"]')?.addEventListener('click', () => navigateDate(1));
  el.querySelector('[data-action="prev-week"]')?.addEventListener('click', () => navigateDate(-7));
  el.querySelector('[data-action="next-week"]')?.addEventListener('click', () => navigateDate(7));
  el.querySelector('[data-action="today"]')?.addEventListener('click', () => {
    selectedDate = getToday();
    const dateInput = el.querySelector('[data-action="pick-date"]');
    if (dateInput) dateInput.value = selectedDate;
    updateDateLabel();
    populateFromExisting();
    renderWeekStrip();
  });
  el.querySelector('[data-action="pick-date"]')?.addEventListener('change', (e) => {
    const newDate = e.target.value;
    if (newDate >= BPV_START && newDate <= BPV_END) {
      selectedDate = newDate;
      updateDateLabel();
      populateFromExisting();
      renderWeekStrip();
    }
  });

  // ── Templates ──
  el.querySelector('[data-action="copy-yesterday"]')?.addEventListener('click', async () => {
    const d = new Date(selectedDate + 'T00:00:00');
    d.setDate(d.getDate() - 1);
    const yesterday = formatDateISO(d);
    const entry = await getHoursEntry(yesterday);
    if (!entry) {
      setStatus('Geen gegevens van gisteren gevonden.', true);
      return;
    }
    setType(entry.type || 'work');
    if (entry.startTime) el.querySelector('[data-field="startTime"]').value = entry.startTime;
    if (entry.endTime) el.querySelector('[data-field="endTime"]').value = entry.endTime;
    el.querySelector('[data-field="breakMinutes"]').value = entry.breakMinutes ?? 45;
    setActivities(entry.activities);
    updateNet();
    setStatus('Gekopieerd van gisteren');
  });

  el.querySelectorAll('[data-template]').forEach(btn => {
    btn.addEventListener('click', () => {
      const tmpl = DAY_TEMPLATES.find(t => t.id === btn.dataset.template);
      if (!tmpl) return;
      setType('work');
      el.querySelector('[data-field="startTime"]').value = tmpl.startTime;
      el.querySelector('[data-field="endTime"]').value = tmpl.endTime;
      el.querySelector('[data-field="breakMinutes"]').value = tmpl.breakMinutes;
      setActivities(tmpl.activities);
      updateNet();
      setStatus(`Template "${tmpl.label}" toegepast`);
    });
  });

  // ── Photos ──
  const photosGrid = el.querySelector('[data-photos-grid]');

  async function renderPhotos() {
    const photos = await getPhotosForDate(selectedDate);
    if (photos.length === 0) {
      photosGrid.innerHTML = '<span class="bpv-ql__photos-empty">Nog geen foto\'s</span>';
      return;
    }
    photosGrid.innerHTML = photos.map(p => `
      <div class="bpv-ql__photo-item" data-photo-id="${p.id}">
        <img src="${sanitizeDataURL(p.data)}" alt="Foto" class="bpv-ql__photo-thumb">
        <button type="button" class="bpv-ql__photo-delete" data-action="delete-photo" data-photo-id="${p.id}" title="Verwijder foto">&times;</button>
      </div>
    `).join('');
    photosGrid.querySelectorAll('[data-action="delete-photo"]').forEach(btn => {
      btn.addEventListener('click', async () => {
        await deletePhoto(btn.dataset.photoId);
        renderPhotos();
      });
    });
  }

  el.querySelector('[data-action="add-photo"]')?.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const resized = await resizeImage(file, 800);
      const reader = new FileReader();
      reader.onload = async () => {
        await addPhoto(selectedDate, reader.result);
        renderPhotos();
        setStatus('Foto toegevoegd');
      };
      reader.readAsDataURL(resized);
    } catch (err) {
      setStatus('Foto kon niet worden verwerkt', true);
    }
    e.target.value = '';
  });

  setType('work');
  populateFromExisting();
  renderPhotos();
  renderWeekStrip();

  const unsubBPV = eventBus?.on('bpv:changed', ({ date } = {}) => {
    // Only reload if the event is for a different source (avoid loops)
    if (date && date !== selectedDate) renderWeekStrip();
  });

  return {
    unmount() {
      unsubBPV?.();
      el?.remove();
    },
  };
}
