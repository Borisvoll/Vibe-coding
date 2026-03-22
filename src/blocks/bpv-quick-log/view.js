import { addHoursEntry, getHoursEntry, deleteHoursEntry, getUnloggedDays, addPhoto, getPhotosForDate, deletePhoto } from '../../stores/bpv.js';
import { getToday, getISOWeek, getWeekDates, formatDateShort, formatDateISO, calcNetMinutes, formatMinutes, escapeHTML, sanitizeDataURL, debounce, resizeImage, getCurrentWeek } from '../../utils.js';
import { DAY_TYPES, DAY_TYPE_LABELS, BPV_START, BPV_END, DEFAULT_START_TIME, DEFAULT_END_TIME, DEFAULT_BREAK_MINUTES } from '../../constants.js';
import { showToast } from '../../toast.js';


const WEEKDAY_SHORT = ['ma', 'di', 'wo', 'do', 'vr'];

export function renderBPVQuickLog(container, context) {
  const mountId = `bpv-ql-${crypto.randomUUID()}`;
  const { eventBus } = context;
  const today = getToday();
  let selectedDate = today;

  const STANDARD_NET = calcNetMinutes(DEFAULT_START_TIME, DEFAULT_END_TIME, DEFAULT_BREAK_MINUTES);

  container.insertAdjacentHTML('beforeend', `
    <article class="bpv-ql os-mini-card" data-mount-id="${mountId}">
      <div class="bpv-ql__quick-actions" data-quick-actions></div>
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
      <div class="bpv-ql__month-calendar" data-month-calendar></div>
      <div class="bpv-ql__footer">
        <span class="bpv-ql__status" data-status></span>
        <div class="bpv-ql__footer-actions">
          <button type="button" class="btn btn-ghost btn-sm" data-action="toggle-calendar" title="Maandoverzicht">Kalender</button>
          <button type="button" class="btn btn-ghost btn-sm" data-action="today" title="Ga naar vandaag">Vandaag</button>
          <button type="button" class="btn btn-ghost btn-sm bpv-ql__delete-btn" data-action="delete" hidden title="Verwijder deze dag">Verwijder</button>
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

  // ── Quick actions (one-tap log today + fill unlogged days) ──
  async function renderQuickActions() {
    const quickEl = el.querySelector('[data-quick-actions]');
    if (!quickEl) return;

    const todayEntry = await getHoursEntry(getToday());
    const currentWeek = getCurrentWeek();
    const unloggedDays = await getUnloggedDays(currentWeek);

    let html = '';

    // Quick "Log vandaag" button when today isn't logged
    if (!todayEntry) {
      html += `
        <button type="button" class="bpv-ql__quick-btn" data-action="log-today-quick">
          <span class="bpv-ql__quick-btn-icon">&#10003;</span>
          <span class="bpv-ql__quick-btn-text">
            <strong>Log vandaag</strong>
            <span>${escapeHTML(DEFAULT_START_TIME)} – ${escapeHTML(DEFAULT_END_TIME)} | ${DEFAULT_BREAK_MINUTES}m pauze = ${escapeHTML(formatMinutes(STANDARD_NET))}</span>
          </span>
        </button>
      `;
    }

    // Fill unlogged days this week
    const missedDays = unloggedDays.filter(d => d !== getToday());
    if (missedDays.length > 0) {
      html += `
        <div class="bpv-ql__missed">
          <span class="bpv-ql__missed-label">Nog niet gelogd:</span>
          ${missedDays.map(d => `<button type="button" class="btn btn-ghost btn-sm" data-action="fill-day" data-date="${d}">${escapeHTML(formatDateShort(d))}</button>`).join('')}
          ${missedDays.length > 1 ? `<button type="button" class="btn btn-ghost btn-sm" data-action="fill-all">Alles loggen</button>` : ''}
        </div>
      `;
    }

    quickEl.innerHTML = html;

    // Quick log today
    quickEl.querySelector('[data-action="log-today-quick"]')?.addEventListener('click', async (e) => {
      const btn = e.currentTarget;
      btn.disabled = true;
      try {
        await addHoursEntry(getToday(), {
          type: 'work',
          startTime: DEFAULT_START_TIME,
          endTime: DEFAULT_END_TIME,
          breakMinutes: DEFAULT_BREAK_MINUTES,
        });
        eventBus?.emit('bpv:changed', { date: getToday() });
        showToast('Vandaag gelogd');
        populateFromExisting();
        renderWeekStrip();
      } catch (err) {
        showToast(`Fout: ${err.message}`);
        btn.disabled = false;
      }
    });

    // Fill individual missed day
    quickEl.querySelectorAll('[data-action="fill-day"]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const date = btn.dataset.date;
        btn.disabled = true;
        btn.textContent = '...';
        try {
          await addHoursEntry(date, {
            type: 'work',
            startTime: DEFAULT_START_TIME,
            endTime: DEFAULT_END_TIME,
            breakMinutes: DEFAULT_BREAK_MINUTES,
          });
          eventBus?.emit('bpv:changed', { date });
          renderQuickActions();
          renderWeekStrip();
        } catch (err) {
          showToast(`Fout: ${err.message}`);
        }
      });
    });

    // Fill all missed days
    quickEl.querySelector('[data-action="fill-all"]')?.addEventListener('click', async (e) => {
      const btn = e.currentTarget;
      btn.disabled = true;
      btn.textContent = 'Bezig...';
      try {
        for (const date of missedDays) {
          await addHoursEntry(date, {
            type: 'work',
            startTime: DEFAULT_START_TIME,
            endTime: DEFAULT_END_TIME,
            breakMinutes: DEFAULT_BREAK_MINUTES,
          });
          eventBus?.emit('bpv:changed', { date });
        }
        renderQuickActions();
        renderWeekStrip();
      } catch (err) {
        showToast(`Fout: ${err.message}`);
      }
    });
  }

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

  let currentEntryId = null;

  async function populateFromExisting() {
    const entry = await getHoursEntry(selectedDate);
    currentEntryId = entry?.id || null;
    renderQuickActions();

    // Show/hide delete button
    const deleteBtn = el.querySelector('[data-action="delete"]');
    if (deleteBtn) deleteBtn.hidden = !entry;

    if (!entry) {
      setType('work');
      el.querySelector('[data-field="startTime"]').value = DEFAULT_START_TIME;
      el.querySelector('[data-field="endTime"]').value = DEFAULT_END_TIME;
      el.querySelector('[data-field="breakMinutes"]').value = String(DEFAULT_BREAK_MINUTES);
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
    currentEntryId = (await getHoursEntry(selectedDate))?.id || null;
    const deleteBtn = el.querySelector('[data-action="delete"]');
    if (deleteBtn) deleteBtn.hidden = !currentEntryId;
    updateNet();
    renderWeekStrip();
    if (calendarVisible) renderMonthCalendar();
    eventBus?.emit('bpv:changed', { date: selectedDate });
    return true;
  }

  // Type buttons
  typeRow.addEventListener('click', (e) => {
    const btn = e.target.closest('.bpv-ql__type-btn');
    if (!btn) return;
    setType(btn.dataset.type);
    if (btn.dataset.type !== 'work') doSave({ silent: true }).catch(() => {});
  });

  // Auto-save on field change (debounced)
  const autoSave = debounce(() => doSave({ silent: true }).catch(() => {}), 800);

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

  // ── Delete entry ──
  el.querySelector('[data-action="delete"]')?.addEventListener('click', async () => {
    if (!currentEntryId) return;
    if (!confirm(`Uren voor ${formatDateShort(selectedDate)} verwijderen?`)) return;
    try {
      await deleteHoursEntry(currentEntryId);
      currentEntryId = null;
      eventBus?.emit('bpv:changed', { date: selectedDate });
      showToast('Uren verwijderd');
      populateFromExisting();
      renderWeekStrip();
      renderMonthCalendar();
    } catch (err) {
      showToast(`Fout: ${err.message}`);
    }
  });

  // ── Month calendar ──
  const calendarEl = el.querySelector('[data-month-calendar]');
  let calendarVisible = false;
  let calendarMonth = new Date(selectedDate + 'T00:00:00');

  el.querySelector('[data-action="toggle-calendar"]')?.addEventListener('click', () => {
    calendarVisible = !calendarVisible;
    calendarEl.hidden = !calendarVisible;
    if (calendarVisible) {
      calendarMonth = new Date(selectedDate + 'T00:00:00');
      renderMonthCalendar();
    }
  });
  calendarEl.hidden = true;

  async function renderMonthCalendar() {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const monthNames = ['Januari', 'Februari', 'Maart', 'April', 'Mei', 'Juni',
      'Juli', 'Augustus', 'September', 'Oktober', 'November', 'December'];

    // Get all entries for this month
    const dates = [];
    for (let d = 1; d <= lastDay.getDate(); d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      dates.push(dateStr);
    }
    const entries = await Promise.all(dates.map(d => getHoursEntry(d).catch(() => null)));
    const entryMap = {};
    dates.forEach((d, i) => { if (entries[i]) entryMap[d] = entries[i]; });

    // Calendar grid: start on Monday (1)
    let startDow = firstDay.getDay(); // 0=Sun
    startDow = startDow === 0 ? 6 : startDow - 1; // Convert to Mon=0

    let cells = '';
    // Empty cells before first day
    for (let i = 0; i < startDow; i++) cells += '<div class="bpv-ql__cal-cell bpv-ql__cal-cell--empty"></div>';

    for (let d = 1; d <= lastDay.getDate(); d++) {
      const dateStr = dates[d - 1];
      const entry = entryMap[dateStr];
      const isSelected = dateStr === selectedDate;
      const isToday = dateStr === getToday();
      const isWeekend = new Date(year, month, d).getDay() === 0 || new Date(year, month, d).getDay() === 6;
      const inRange = dateStr >= BPV_START && dateStr <= BPV_END;
      const cls = [
        'bpv-ql__cal-cell',
        entry ? 'bpv-ql__cal-cell--filled' : '',
        isSelected ? 'bpv-ql__cal-cell--active' : '',
        isToday ? 'bpv-ql__cal-cell--today' : '',
        isWeekend ? 'bpv-ql__cal-cell--weekend' : '',
        !inRange ? 'bpv-ql__cal-cell--disabled' : '',
      ].filter(Boolean).join(' ');

      const netLabel = entry?.netMinutes ? formatMinutes(entry.netMinutes) : '';
      cells += `<button type="button" class="${cls}" data-cal-date="${dateStr}" ${!inRange ? 'disabled' : ''} title="${escapeHTML(formatDateShort(dateStr))}${netLabel ? ' — ' + netLabel : ''}">
        <span class="bpv-ql__cal-num">${d}</span>
        ${netLabel ? `<span class="bpv-ql__cal-hours">${escapeHTML(netLabel)}</span>` : ''}
      </button>`;
    }

    calendarEl.innerHTML = `
      <div class="bpv-ql__cal-header">
        <button type="button" class="bpv-ql__date-btn" data-action="cal-prev">&larr;</button>
        <span class="bpv-ql__cal-month">${monthNames[month]} ${year}</span>
        <button type="button" class="bpv-ql__date-btn" data-action="cal-next">&rarr;</button>
      </div>
      <div class="bpv-ql__cal-days">
        <span>ma</span><span>di</span><span>wo</span><span>do</span><span>vr</span><span>za</span><span>zo</span>
      </div>
      <div class="bpv-ql__cal-grid">${cells}</div>
    `;

    // Calendar navigation
    calendarEl.querySelector('[data-action="cal-prev"]')?.addEventListener('click', () => {
      calendarMonth.setMonth(calendarMonth.getMonth() - 1);
      renderMonthCalendar();
    });
    calendarEl.querySelector('[data-action="cal-next"]')?.addEventListener('click', () => {
      calendarMonth.setMonth(calendarMonth.getMonth() + 1);
      renderMonthCalendar();
    });

    // Day click
    calendarEl.querySelectorAll('[data-cal-date]').forEach(btn => {
      btn.addEventListener('click', () => {
        const d = btn.dataset.calDate;
        if (d < BPV_START || d > BPV_END) return;
        selectedDate = d;
        const dateInput = el.querySelector('[data-action="pick-date"]');
        if (dateInput) dateInput.value = selectedDate;
        updateDateLabel();
        populateFromExisting();
        renderWeekStrip();
        renderMonthCalendar();
      });
    });
  }

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
  populateFromExisting(); // also calls renderQuickActions()
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
