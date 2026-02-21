import { APP_VERSION } from '../version.js';
import { ACCENT_COLORS } from '../constants.js';
import { setTheme } from '../core/themeEngine.js';
import { getSetting, setSetting } from '../db.js';
import { isTutorialEnabled, setTutorialEnabled, resetTutorial, getTipsList } from '../core/tutorial.js';
import { createThemeStudio } from '../ui/theme-studio.js';
import { getModeConfig, renameMode, archiveMode, unarchiveMode } from '../core/modeConfig.js';

const ACCENT_PRESETS = ['blue', 'indigo', 'teal', 'green', 'purple'];

function getPresets() {
  return ACCENT_COLORS.filter((c) => ACCENT_PRESETS.includes(c.id));
}

const MODE_STORAGE_KEY = 'boris_mode';

function getLocalModeManager(activeModes) {
  return {
    getMode() {
      try {
        const saved = localStorage.getItem(MODE_STORAGE_KEY);
        return activeModes.includes(saved) ? saved : activeModes[0] || 'School';
      } catch { return activeModes[0] || 'School'; }
    },
    setMode(mode) {
      if (!activeModes.includes(mode)) return;
      try { localStorage.setItem(MODE_STORAGE_KEY, mode); } catch { /* ignore */ }
    },
  };
}

export async function renderSettingsBlock(container, { modeManager, eventBus, onChange } = {}) {
  // Load mode config first so mode pills and management UI are config-driven
  const allModes = await getModeConfig();
  const activeModes = allModes.filter((m) => m.status === 'active');
  const activeModeIds = activeModes.map((m) => m.id);

  // Fallback: if no modeManager provided (legacy path), use localStorage directly
  if (!modeManager) modeManager = getLocalModeManager(activeModeIds);

  const theme = (await getSetting('theme')) || 'system';
  const accentId = (await getSetting('accentColor')) || 'blue';
  const compact = (await getSetting('compact')) || false;
  const reduceMotion = (await getSetting('reduceMotion')) || false;
  const fridayBannerDisabled = (await getSetting('friday_banner_disabled')) || false;
  const morningFlow = (await getSetting('morning_flow')) || 'gentle';
  const accents = getPresets();
  const currentMode = modeManager.getMode();

  const archivedModes = allModes.filter((m) => m.status === 'archived');

  function renderModePills() {
    return activeModes.map((m) => `
      <button type="button" class="settings-mode-pill ${m.id === currentMode ? 'settings-mode-pill--active' : ''}" data-mode="${m.id}" style="--pill-color:${m.color};--pill-color-light:${m.colorLight}">
        <span class="settings-mode-pill__dot" style="background:${m.color}"></span>
        ${m.emoji} ${m.name}
      </button>
    `).join('');
  }

  function renderModeMgmtRows() {
    const activeRows = activeModes.map((m) => `
      <div class="settings-mode-mgmt-row" data-mgmt-mode="${m.id}">
        <span class="settings-mode-mgmt-name" style="color:${m.color}">${m.emoji} <span class="settings-mode-mgmt-label">${m.name}</span></span>
        <span class="settings-mode-mgmt-desc">${m.description}</span>
        <div class="settings-mode-mgmt-actions">
          <button type="button" class="settings-mode-pill" data-action="rename" data-mode="${m.id}" title="Naam wijzigen">✏️</button>
          ${activeModes.length > 1 ? `<button type="button" class="settings-mode-pill" data-action="archive" data-mode="${m.id}" title="Archiveren">📦</button>` : ''}
        </div>
      </div>
    `).join('');

    const archivedRows = archivedModes.length > 0 ? `
      <div class="settings-mode-mgmt-archived-header">Gearchiveerd</div>
      ${archivedModes.map((m) => `
        <div class="settings-mode-mgmt-row settings-mode-mgmt-row--archived" data-mgmt-mode="${m.id}">
          <span class="settings-mode-mgmt-name" style="opacity:0.5">${m.emoji} ${m.name}</span>
          <span class="settings-mode-mgmt-desc" style="opacity:0.5">${m.description}</span>
          <div class="settings-mode-mgmt-actions">
            <button type="button" class="settings-mode-pill" data-action="unarchive" data-mode="${m.id}" title="Herstellen">↩️</button>
          </div>
        </div>
      `).join('')}
    ` : '';

    return activeRows + archivedRows;
  }

  container.innerHTML = `
    <section class="settings-block card">
      <div class="settings-row">
        <div>
          <div class="settings-label">Modus</div>
          <div class="settings-desc">Wissel je huidige context</div>
        </div>
        <div class="settings-mode-group" data-setting="mode">
          ${renderModePills()}
        </div>
      </div>

      <div class="settings-row">
        <div>
          <div class="settings-label">Modes beheren</div>
          <div class="settings-desc">Naam wijzigen of archiveren</div>
        </div>
      </div>
      <div class="settings-mode-mgmt" data-setting="mode-mgmt">
        ${renderModeMgmtRows()}
      </div>

      <div class="settings-row">
        <div>
          <div class="settings-label">Thema</div>
          <div class="settings-desc">Licht / Donker / Auto</div>
        </div>
        <div class="radio-group" data-setting="theme">
          <label class="radio-option ${theme === 'light' ? 'selected' : ''}">
            <input type="radio" name="theme" value="light" ${theme === 'light' ? 'checked' : ''}>Licht
          </label>
          <label class="radio-option ${theme === 'dark' ? 'selected' : ''}">
            <input type="radio" name="theme" value="dark" ${theme === 'dark' ? 'checked' : ''}>Donker
          </label>
          <label class="radio-option ${theme === 'system' ? 'selected' : ''}">
            <input type="radio" name="theme" value="system" ${theme === 'system' ? 'checked' : ''}>Auto
          </label>
        </div>
      </div>

      <div class="settings-row">
        <div>
          <div class="settings-label">Accentkleur</div>
          <div class="settings-desc">Kleur voor knoppen en accenten</div>
        </div>
        <div class="accent-picker" data-setting="accent">
          ${accents.map((c) => `<button class="accent-dot ${c.id === accentId ? 'active' : ''}" data-color="${c.id}" data-hex="${c.hex}" style="background:${c.hex}" title="${c.label}" aria-label="${c.label}"></button>`).join('')}
        </div>
      </div>

      <div class="settings-row">
        <div>
          <div class="settings-label">Dichtheid</div>
          <div class="settings-desc">Ruim of compact</div>
        </div>
        <div class="radio-group" data-setting="density">
          <label class="radio-option ${!compact ? 'selected' : ''}">
            <input type="radio" name="density" value="relaxed" ${!compact ? 'checked' : ''}>Ruim
          </label>
          <label class="radio-option ${compact ? 'selected' : ''}">
            <input type="radio" name="density" value="compact" ${compact ? 'checked' : ''}>Compact
          </label>
        </div>
      </div>

      <div class="settings-row">
        <div>
          <div class="settings-label">Verminder animaties</div>
          <div class="settings-desc">Minder beweging in de interface</div>
        </div>
        <div style="display:flex;align-items:center;gap:var(--space-2)" data-setting="reduce-motion">
          <button type="button" class="settings-mode-pill ${reduceMotion ? 'settings-mode-pill--active' : ''}" data-reduce-motion="on">Aan</button>
          <button type="button" class="settings-mode-pill ${!reduceMotion ? 'settings-mode-pill--active' : ''}" data-reduce-motion="off">Uit</button>
        </div>
      </div>

      <div class="settings-row">
        <div>
          <div class="settings-label">Tutorial</div>
          <div class="settings-desc">Leer BORIS kennen met korte tips</div>
        </div>
        <div style="display:flex;align-items:center;gap:var(--space-2)">
          <button type="button" class="settings-mode-pill ${isTutorialEnabled() ? 'settings-mode-pill--active' : ''}" data-tutorial="on">Aan</button>
          <button type="button" class="settings-mode-pill ${!isTutorialEnabled() ? 'settings-mode-pill--active' : ''}" data-tutorial="off">Uit</button>
          <button type="button" class="settings-mode-pill" data-tutorial="restart" style="margin-left:var(--space-2);font-size:0.75rem">Opnieuw</button>
        </div>
      </div>
      <div class="tutorial-tips-list" id="tutorial-tips-list">
        ${getTipsList().map((t) => `
          <div class="tutorial-tip-item">
            <span class="tutorial-tip-item__title">${t.title}</span>
            <span class="tutorial-tip-item__text">— ${t.text}</span>
          </div>
        `).join('')}
      </div>

      <div class="settings-row">
        <div>
          <div class="settings-label">Vrijdag herinnering</div>
          <div class="settings-desc">Weekoverzicht banner op vrijdag</div>
        </div>
        <div style="display:flex;align-items:center;gap:var(--space-2)" data-setting="friday-banner">
          <button type="button" class="settings-mode-pill ${!fridayBannerDisabled ? 'settings-mode-pill--active' : ''}" data-friday-banner="on">Aan</button>
          <button type="button" class="settings-mode-pill ${fridayBannerDisabled ? 'settings-mode-pill--active' : ''}" data-friday-banner="off">Uit</button>
        </div>
      </div>

      <div class="settings-row">
        <div>
          <div class="settings-label">Ochtend routine</div>
          <div class="settings-desc">Hoe de dagchecklist verschijnt</div>
        </div>
        <div class="radio-group" data-setting="morning-flow">
          <label class="radio-option ${morningFlow === 'gentle' ? 'selected' : ''}">
            <input type="radio" name="morning-flow" value="gentle" ${morningFlow === 'gentle' ? 'checked' : ''}>Rustig
          </label>
          <label class="radio-option ${morningFlow === 'manual' ? 'selected' : ''}">
            <input type="radio" name="morning-flow" value="manual" ${morningFlow === 'manual' ? 'checked' : ''}>Handmatig
          </label>
        </div>
      </div>

      <div class="settings-row">
        <div class="settings-label">Versie</div>
        <div class="settings-desc">v${APP_VERSION}</div>
      </div>
    </section>
    <section class="settings-block card" style="margin-top:var(--space-5)">
      <div class="settings-row">
        <div>
          <div class="settings-label">Theme Studio</div>
          <div class="settings-desc">Pas kleuren, accenten en visuele stijl aan</div>
        </div>
      </div>
      <div data-theme-studio-mount></div>
    </section>
  `;

  // ── Mode switcher ──────────────────────────────────────────
  const modeGroup = container.querySelector('[data-setting="mode"]');

  function updateModePills(mode) {
    if (!modeGroup) return;
    modeGroup.querySelectorAll('.settings-mode-pill').forEach((p) => {
      p.classList.toggle('settings-mode-pill--active', p.dataset.mode === mode);
    });
  }

  // Direct click handler on each mode pill
  modeGroup?.querySelectorAll('.settings-mode-pill').forEach((pill) => {
    pill.addEventListener('click', () => {
      const mode = pill.dataset.mode;
      if (!mode) return;
      updateModePills(mode);
      modeManager.setMode(mode);
      onChange?.({ key: 'mode', value: mode });
    });
  });

  // Keep pills in sync when mode changes from elsewhere (e.g. header picker)
  eventBus?.on('mode:changed', ({ mode }) => {
    updateModePills(mode);
  });

  // ── Tutorial toggle ──────────────────────────────────────
  container.querySelectorAll('[data-tutorial]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const action = btn.dataset.tutorial;
      if (action === 'on') {
        setTutorialEnabled(true);
        container.querySelectorAll('[data-tutorial="on"]').forEach((b) => b.classList.add('settings-mode-pill--active'));
        container.querySelectorAll('[data-tutorial="off"]').forEach((b) => b.classList.remove('settings-mode-pill--active'));
      } else if (action === 'off') {
        setTutorialEnabled(false);
        container.querySelectorAll('[data-tutorial="off"]').forEach((b) => b.classList.add('settings-mode-pill--active'));
        container.querySelectorAll('[data-tutorial="on"]').forEach((b) => b.classList.remove('settings-mode-pill--active'));
      } else if (action === 'restart') {
        resetTutorial();
        setTutorialEnabled(true);
        container.querySelectorAll('[data-tutorial="on"]').forEach((b) => b.classList.add('settings-mode-pill--active'));
        container.querySelectorAll('[data-tutorial="off"]').forEach((b) => b.classList.remove('settings-mode-pill--active'));
        // Start tutorial immediately after restart
        import('../core/tutorial.js').then(({ startTutorial }) => startTutorial());
      }
    });
  });

  // ── Reduce motion ──────────────────────────────────────────
  container.querySelectorAll('[data-setting="reduce-motion"] .settings-mode-pill').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const on = btn.dataset.reduceMotion === 'on';
      await setSetting('reduceMotion', on);
      if (on) document.documentElement.setAttribute('data-reduce-motion', 'true');
      else document.documentElement.removeAttribute('data-reduce-motion');
      container.querySelectorAll('[data-setting="reduce-motion"] .settings-mode-pill').forEach((b) => {
        b.classList.toggle('settings-mode-pill--active', b.dataset.reduceMotion === (on ? 'on' : 'off'));
      });
    });
  });

  // ── Theme ──────────────────────────────────────────────────
  container.querySelectorAll('[data-setting="theme"] .radio-option').forEach((opt) => {
    opt.addEventListener('click', async () => {
      const value = opt.querySelector('input').value;
      await setSetting('theme', value);
      // Sync preferDark in theme engine so applyTheme stays consistent
      const preferDark = value === 'dark' ? true : value === 'light' ? false : null;
      await setTheme({ preferDark });
      // Update selected state visually
      container.querySelectorAll('[data-setting="theme"] .radio-option').forEach((o) => {
        o.classList.toggle('selected', o.querySelector('input').value === value);
      });
      onChange?.({ key: 'theme', value });
    });
  });

  // ── Accent color ───────────────────────────────────────────
  container.querySelector('[data-setting="accent"]')?.addEventListener('click', async (event) => {
    const dot = event.target.closest('.accent-dot');
    if (!dot) return;
    const colorId = dot.dataset.color;
    const hex = dot.dataset.hex;
    container.querySelectorAll('.accent-dot').forEach((node) => node.classList.remove('active'));
    dot.classList.add('active');
    await setSetting('accentColor', colorId);
    await setTheme({ accent: hex });
    onChange?.({ key: 'accentColor', value: colorId });
  });

  // ── Density ────────────────────────────────────────────────
  container.querySelectorAll('[data-setting="density"] .radio-option').forEach((opt) => {
    opt.addEventListener('click', async () => {
      const value = opt.querySelector('input').value;
      const compactMode = value === 'compact';
      await setSetting('compact', compactMode);
      if (compactMode) document.documentElement.setAttribute('data-compact', 'true');
      else document.documentElement.removeAttribute('data-compact');
      // Update selected state visually
      container.querySelectorAll('[data-setting="density"] .radio-option').forEach((o) => {
        o.classList.toggle('selected', o.querySelector('input').value === value);
      });
      onChange?.({ key: 'compact', value: compactMode });
    });
  });

  // ── Mode management (rename / archive / unarchive) ──────────
  container.querySelector('[data-setting="mode-mgmt"]')?.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const action = btn.dataset.action;
    const modeId = btn.dataset.mode;

    if (action === 'rename') {
      const current = allModes.find((m) => m.id === modeId);
      const newName = window.prompt(`Nieuwe naam voor ${current?.name || modeId}:`, current?.name || modeId);
      if (!newName || !newName.trim() || newName.trim() === current?.name) return;
      await renameMode(modeId, newName.trim());
      // Re-render settings to reflect change
      await renderSettingsBlock(container, { modeManager, eventBus, onChange });

    } else if (action === 'archive') {
      await archiveMode(modeId);
      // If we archived the current mode, switch to first remaining active
      if (modeManager.getMode() === modeId) {
        const remaining = activeModes.filter((m) => m.id !== modeId);
        if (remaining.length > 0) {
          modeManager.setMode(remaining[0].id);
          eventBus?.emit('mode:changed', { mode: remaining[0].id });
        }
      }
      await renderSettingsBlock(container, { modeManager, eventBus, onChange });

    } else if (action === 'unarchive') {
      await unarchiveMode(modeId);
      await renderSettingsBlock(container, { modeManager, eventBus, onChange });
    }
  });

  // ── Friday banner toggle ─────────────────────────────────────
  container.querySelectorAll('[data-friday-banner]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const disabled = btn.dataset.fridayBanner === 'off';
      await setSetting('friday_banner_disabled', disabled);
      container.querySelectorAll('[data-friday-banner]').forEach((b) => {
        b.classList.toggle('settings-mode-pill--active',
          disabled ? b.dataset.fridayBanner === 'off' : b.dataset.fridayBanner === 'on'
        );
      });
    });
  });

  // ── Morning flow ─────────────────────────────────────────────
  container.querySelectorAll('[data-setting="morning-flow"] .radio-option').forEach((opt) => {
    opt.addEventListener('click', async () => {
      const value = opt.querySelector('input').value;
      await setSetting('morning_flow', value);
      container.querySelectorAll('[data-setting="morning-flow"] .radio-option').forEach((o) => {
        o.classList.toggle('selected', o.querySelector('input').value === value);
      });
    });
  });

  // ── Theme Studio ────────────────────────────────────────────
  const themeStudioMount = container.querySelector('[data-theme-studio-mount]');
  if (themeStudioMount) {
    const studio = createThemeStudio();
    themeStudioMount.appendChild(studio.el);
  }
}
