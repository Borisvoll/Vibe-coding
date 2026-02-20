/**
 * Theme Studio — Settings section UI for full color customization.
 * Renders into a container, returns { el, destroy }.
 */

import { escapeHTML } from '../utils.js';
import {
  getTheme, setTheme, resetTheme,
  exportThemeJson, importThemeJson,
  checkContrast, THEME_PRESETS, isDark,
} from '../core/themeEngine.js';
import { ACCENT_COLORS } from '../constants.js';
import { setSetting } from '../db.js';

const COLOR_CONTROLS = [
  { key: 'accent',      label: 'Accentkleur',      desc: 'Knoppen, badges, indicatoren' },
  { key: 'appBg',       label: 'Achtergrond',       desc: 'App-achtergrond' },
  { key: 'blockBg',     label: 'Blok-achtergrond',  desc: 'Kaarten & blokken' },
  { key: 'blockFg',     label: 'Tekstkleur',        desc: 'Primaire tekst' },
  { key: 'mutedFg',     label: 'Gedempte tekst',    desc: 'Secundaire tekst' },
  { key: 'blockBorder', label: 'Randkleur',         desc: 'Kaart-randen' },
  { key: 'danger',      label: 'Foutkleur',         desc: 'Fouten & verwijderen' },
  { key: 'success',     label: 'Succeskleur',       desc: 'Gereed & bevestigd' },
];

const DEFAULTS = {
  accent: '#4f6ef7',
  appBg: '#f6f7f8',
  blockBg: '#ffffff',
  blockFg: '#1f1f1f',
  mutedFg: '#6b6b6b',
  blockBorder: '#e5e7eb',
  danger: '#f43f5e',
  success: '#10b981',
};

export function createThemeStudio() {
  const el = document.createElement('div');
  el.className = 'theme-studio';

  function render() {
    const theme = getTheme();

    el.innerHTML = `
      <div class="theme-studio__section">
        <h4 class="theme-studio__section-title">Presets</h4>
        <div class="theme-studio__presets">
          ${Object.entries(THEME_PRESETS).map(([id, preset]) => `
            <button type="button" class="theme-studio__preset" data-preset="${escapeHTML(id)}">
              <span class="theme-studio__preset-dot" style="background:${escapeHTML(preset.theme.accent || DEFAULTS.accent)}"></span>
              ${escapeHTML(preset.label)}
            </button>
          `).join('')}
        </div>
      </div>

      <div class="theme-studio__section">
        <h4 class="theme-studio__section-title">Snelle accentkleuren</h4>
        <div class="accent-picker" data-ts-accent>
          ${ACCENT_COLORS.map(c => `
            <button class="accent-dot ${theme.accent === c.hex ? 'active' : ''}"
              data-hex="${c.hex}" data-color="${c.id}"
              style="background:${c.hex}" title="${escapeHTML(c.label)}"
              aria-label="${escapeHTML(c.label)}"></button>
          `).join('')}
        </div>
      </div>

      <div class="theme-studio__section">
        <h4 class="theme-studio__section-title">Kleuren</h4>
        <div class="theme-studio__controls">
          ${COLOR_CONTROLS.map(ctrl => {
            const value = theme[ctrl.key] || DEFAULTS[ctrl.key];
            const isDefault = !theme[ctrl.key] || theme[ctrl.key] === DEFAULTS[ctrl.key];
            return `
              <div class="theme-studio__control" data-control="${ctrl.key}">
                <input type="color" class="theme-studio__color-input"
                  value="${escapeHTML(value)}" data-key="${ctrl.key}" />
                <div class="theme-studio__control-info">
                  <span class="theme-studio__control-label">${escapeHTML(ctrl.label)}</span>
                  <span class="theme-studio__control-value">${escapeHTML(value)}</span>
                </div>
                <button type="button" class="theme-studio__control-reset"
                  data-reset="${ctrl.key}" title="Herstel standaard"
                  ${isDefault && ctrl.key !== 'accent' ? 'style="display:none"' : ''}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
                </button>
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <div class="theme-studio__section">
        <button type="button" class="theme-studio__advanced-toggle" aria-expanded="false" data-toggle-advanced>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 2l4 4-4 4"/></svg>
          Geavanceerd
        </button>
        <div class="theme-studio__advanced-body" data-advanced-body>
          <div class="theme-studio__slider-row">
            <span class="theme-studio__slider-label">Tint-sterkte</span>
            <input type="range" class="theme-studio__slider" min="0" max="100"
              value="${theme.tintStrength ?? 50}" data-slider="tintStrength" />
            <span class="theme-studio__slider-value" data-slider-val="tintStrength">${theme.tintStrength ?? 50}</span>
          </div>
          <div class="theme-studio__slider-row">
            <span class="theme-studio__slider-label">Schaduw-sterkte</span>
            <input type="range" class="theme-studio__slider" min="0" max="100"
              value="${theme.shadowStrength ?? 50}" data-slider="shadowStrength" />
            <span class="theme-studio__slider-value" data-slider-val="shadowStrength">${theme.shadowStrength ?? 50}</span>
          </div>
        </div>
      </div>

      <div class="theme-studio__section">
        <h4 class="theme-studio__section-title">Voorbeeld</h4>
        <div class="theme-studio__preview">
          <div class="theme-studio__preview-card">
            <p class="theme-studio__preview-card-title">Voorbeeldblok</p>
            <p class="theme-studio__preview-card-text">Dit is hoe je blokken eruit zien met de huidige instellingen.</p>
          </div>
          <div class="theme-studio__preview-row">
            <span class="theme-studio__preview-btn">Knop</span>
            <span class="theme-studio__preview-badge">Badge</span>
            <div class="theme-studio__preview-progress">
              <div class="theme-studio__preview-progress-fill"></div>
            </div>
            <span class="theme-studio__preview-success">Gereed</span>
            <span class="theme-studio__preview-danger">Fout</span>
          </div>
        </div>
      </div>

      <div class="theme-studio__warnings" data-warnings></div>

      <div class="theme-studio__section">
        <div class="theme-studio__actions">
          <button type="button" class="theme-studio__action-btn theme-studio__action-btn--danger" data-action="reset">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
            Herstel standaard
          </button>
          <button type="button" class="theme-studio__action-btn" data-action="export">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Exporteer thema
          </button>
          <button type="button" class="theme-studio__action-btn" data-action="import">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            Importeer thema
          </button>
        </div>
        <input type="file" accept=".json" class="theme-studio__import-input" data-import-input />
      </div>
    `;

    bindEvents();
    updateWarnings();
  }

  function bindEvents() {
    // Preset buttons
    el.querySelectorAll('.theme-studio__preset').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.preset;
        const preset = THEME_PRESETS[id];
        if (!preset) return;
        await setTheme({ ...getDefaults(), ...preset.theme });
        // Sync old accentColor setting for backwards compatibility
        const match = ACCENT_COLORS.find(c => c.hex === preset.theme.accent);
        if (match) await setSetting('accentColor', match.id);
        render();
      });
    });

    // Quick accent dots
    el.querySelectorAll('[data-ts-accent] .accent-dot').forEach(dot => {
      dot.addEventListener('click', async () => {
        await setTheme({ accent: dot.dataset.hex });
        await setSetting('accentColor', dot.dataset.color);
        render();
      });
    });

    // Color picker inputs
    el.querySelectorAll('.theme-studio__color-input').forEach(input => {
      input.addEventListener('input', (e) => {
        // Live preview during drag
        const key = input.dataset.key;
        const controlEl = input.closest('.theme-studio__control');
        const valEl = controlEl?.querySelector('.theme-studio__control-value');
        if (valEl) valEl.textContent = e.target.value;
      });

      input.addEventListener('change', async (e) => {
        const key = input.dataset.key;
        await setTheme({ [key]: e.target.value });
        // Sync accentColor for backwards compat
        if (key === 'accent') {
          const match = ACCENT_COLORS.find(c => c.hex === e.target.value);
          if (match) await setSetting('accentColor', match.id);
        }
        updateWarnings();
        // Update accent dot active state
        el.querySelectorAll('[data-ts-accent] .accent-dot').forEach(d => {
          d.classList.toggle('active', d.dataset.hex === getTheme().accent);
        });
      });
    });

    // Reset individual control
    el.querySelectorAll('.theme-studio__control-reset').forEach(btn => {
      btn.addEventListener('click', async () => {
        const key = btn.dataset.reset;
        if (key === 'accent') {
          await setTheme({ accent: DEFAULTS.accent });
          await setSetting('accentColor', 'blue');
        } else {
          await setTheme({ [key]: null });
        }
        render();
      });
    });

    // Advanced toggle
    const advToggle = el.querySelector('[data-toggle-advanced]');
    const advBody = el.querySelector('[data-advanced-body]');
    advToggle?.addEventListener('click', () => {
      const open = advToggle.getAttribute('aria-expanded') === 'true';
      advToggle.setAttribute('aria-expanded', String(!open));
      advBody?.classList.toggle('theme-studio__advanced-body--open', !open);
    });

    // Sliders
    el.querySelectorAll('.theme-studio__slider').forEach(slider => {
      slider.addEventListener('input', () => {
        const key = slider.dataset.slider;
        const valEl = el.querySelector(`[data-slider-val="${key}"]`);
        if (valEl) valEl.textContent = slider.value;
      });
      slider.addEventListener('change', async () => {
        const key = slider.dataset.slider;
        await setTheme({ [key]: parseInt(slider.value, 10) });
      });
    });

    // Actions
    el.querySelector('[data-action="reset"]')?.addEventListener('click', async () => {
      await resetTheme();
      render();
    });

    el.querySelector('[data-action="export"]')?.addEventListener('click', () => {
      const json = exportThemeJson();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'boris-theme.json';
      a.click();
      URL.revokeObjectURL(url);
    });

    el.querySelector('[data-action="import"]')?.addEventListener('click', () => {
      el.querySelector('[data-import-input]')?.click();
    });

    el.querySelector('[data-import-input]')?.addEventListener('change', async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const ok = await importThemeJson(text);
        if (ok) render();
      } catch { /* ignore */ }
      e.target.value = '';
    });
  }

  function updateWarnings() {
    const warningsEl = el.querySelector('[data-warnings]');
    if (!warningsEl) return;
    const warnings = checkContrast(getTheme());
    if (warnings.length === 0) {
      warningsEl.innerHTML = '';
      return;
    }
    warningsEl.innerHTML = warnings.map(w => `
      <div class="theme-studio__warning">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        ${escapeHTML(w.message)} (ratio: ${escapeHTML(w.ratio)})
      </div>
    `).join('');
  }

  function getDefaults() {
    const d = {};
    for (const ctrl of COLOR_CONTROLS) {
      if (ctrl.key === 'accent') continue;
      d[ctrl.key] = null;
    }
    d.tintStrength = 50;
    d.shadowStrength = 50;
    return d;
  }

  render();

  return {
    el,
    destroy() {
      el.innerHTML = '';
    },
  };
}
