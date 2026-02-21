/**
 * Theme Studio — Preset-based theming UI with advanced knobs,
 * harmony suggestions, and progressive disclosure.
 * Renders into a container, returns { el, destroy }.
 */

import { escapeHTML } from '../utils.js';
import {
  getTheme, setTheme, resetTheme,
  exportThemeJson, importThemeJson,
  THEME_PRESETS,
  generateHarmonySuggestions,
} from '../core/themeEngine.js';
import { ACCENT_COLORS } from '../constants.js';
import { setSetting } from '../db.js';

/** Find the active preset ID by matching accent color */
function getActivePresetId(theme) {
  for (const [id, preset] of Object.entries(THEME_PRESETS)) {
    if (preset.theme.accent === theme.accent) return id;
  }
  return null;
}

/** Color knob definitions for advanced mode */
const COLOR_KNOBS = [
  { key: 'accent',      label: 'Accentkleur',      placeholder: '#4f6ef7' },
  { key: 'appBg',       label: 'Achtergrondkleur',  placeholder: '#f6f7f8' },
  { key: 'blockBg',     label: 'Blok achtergrond',   placeholder: '#ffffff' },
  { key: 'blockFg',     label: 'Tekstkleur',         placeholder: '#1f1f1f' },
  { key: 'mutedFg',     label: 'Gedempte tekst',     placeholder: '#6b6b6b' },
];

const SLIDER_KNOBS = [
  { key: 'tintStrength',   label: 'Tint sterkte',    min: 0, max: 100 },
  { key: 'shadowStrength', label: 'Schaduw sterkte',  min: 0, max: 100 },
];

export function createThemeStudio() {
  const el = document.createElement('div');
  el.className = 'theme-studio';
  let advancedOpen = false;
  let feedbackMsg = null;
  let feedbackTimeout = null;

  function showFeedback(msg, isError) {
    feedbackMsg = { text: msg, isError };
    renderFeedback();
    clearTimeout(feedbackTimeout);
    feedbackTimeout = setTimeout(() => {
      feedbackMsg = null;
      renderFeedback();
    }, 3000);
  }

  function renderFeedback() {
    const fbEl = el.querySelector('[data-feedback]');
    if (!fbEl) return;
    if (feedbackMsg) {
      fbEl.textContent = feedbackMsg.text;
      fbEl.className = `theme-studio__feedback ${feedbackMsg.isError ? 'theme-studio__feedback--error' : 'theme-studio__feedback--success'}`;
      fbEl.style.display = '';
    } else {
      fbEl.style.display = 'none';
      fbEl.textContent = '';
    }
  }

  function render() {
    const theme = getTheme();
    const activePresetId = getActivePresetId(theme);
    const harmony = generateHarmonySuggestions(theme.accent);

    el.innerHTML = `
      <div class="theme-studio__section">
        <h4 class="theme-studio__section-title">Presets</h4>
        <div class="theme-studio__presets">
          ${Object.entries(THEME_PRESETS).map(([id, preset]) => `
            <button type="button" class="theme-studio__preset${activePresetId === id ? ' theme-studio__preset--active' : ''}" data-preset="${escapeHTML(id)}">
              <span class="theme-studio__preset-dot" style="background:${escapeHTML(preset.theme.accent)}"></span>
              ${escapeHTML(preset.label)}
            </button>
          `).join('')}
        </div>
      </div>

      <div class="theme-studio__section">
        <button type="button" class="theme-studio__advanced-toggle" data-toggle-advanced>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="theme-studio__chevron ${advancedOpen ? 'theme-studio__chevron--open' : ''}"><polyline points="6 9 12 15 18 9"/></svg>
          Geavanceerd
        </button>
        ${advancedOpen ? renderAdvanced(theme, harmony) : ''}
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
        <div data-feedback style="display:none"></div>
        <input type="file" accept=".json" class="theme-studio__import-input" data-import-input />
      </div>
    `;

    bindEvents();
    renderFeedback();
  }

  function renderAdvanced(theme, harmony) {
    return `
      <div class="theme-studio__knobs">
        ${COLOR_KNOBS.map(knob => {
          const val = theme[knob.key] || '';
          return `
            <div class="theme-studio__knob">
              <label class="theme-studio__knob-label">${escapeHTML(knob.label)}</label>
              <div class="theme-studio__color-input">
                <input type="color" value="${escapeHTML(val || knob.placeholder)}" data-knob-color="${escapeHTML(knob.key)}" class="theme-studio__color-picker" />
                <input type="text" value="${escapeHTML(val)}" placeholder="${escapeHTML(knob.placeholder)}" data-knob-text="${escapeHTML(knob.key)}" class="theme-studio__hex-input" maxlength="7" spellcheck="false" />
                ${knob.key !== 'accent' && val ? `<button type="button" class="theme-studio__knob-clear" data-knob-clear="${escapeHTML(knob.key)}" title="Herstel standaard">&times;</button>` : ''}
              </div>
            </div>
          `;
        }).join('')}

        ${SLIDER_KNOBS.map(knob => `
          <div class="theme-studio__knob">
            <label class="theme-studio__knob-label">${escapeHTML(knob.label)} <span class="theme-studio__knob-value" data-slider-value="${escapeHTML(knob.key)}">${theme[knob.key] ?? 50}</span></label>
            <input type="range" min="${knob.min}" max="${knob.max}" value="${theme[knob.key] ?? 50}" data-knob-range="${escapeHTML(knob.key)}" class="theme-studio__range" />
          </div>
        `).join('')}
      </div>

      <div class="theme-studio__section" style="margin-top:var(--space-3)">
        <h4 class="theme-studio__section-title">Harmonie suggesties</h4>
        <div class="theme-studio__harmony">
          <div class="theme-studio__harmony-group">
            <span class="theme-studio__harmony-label">Analoog</span>
            <div class="theme-studio__harmony-dots">
              ${harmony.analogous.map(hex => `
                <button type="button" class="theme-studio__harmony-dot" data-harmony-hex="${escapeHTML(hex)}" style="background:${escapeHTML(hex)}" title="${escapeHTML(hex)}"></button>
              `).join('')}
            </div>
          </div>
          <div class="theme-studio__harmony-group">
            <span class="theme-studio__harmony-label">Split-comp.</span>
            <div class="theme-studio__harmony-dots">
              ${harmony.splitComplementary.map(hex => `
                <button type="button" class="theme-studio__harmony-dot" data-harmony-hex="${escapeHTML(hex)}" style="background:${escapeHTML(hex)}" title="${escapeHTML(hex)}"></button>
              `).join('')}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function bindEvents() {
    // Preset buttons
    el.querySelectorAll('.theme-studio__preset').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.preset;
        const preset = THEME_PRESETS[id];
        if (!preset) return;
        await setTheme({ ...preset.theme });
        const match = ACCENT_COLORS.find(c => c.hex === preset.theme.accent);
        if (match) await setSetting('accentColor', match.id);
        if (preset.theme.preferDark === true) {
          await setSetting('theme', 'dark');
        } else if (preset.theme.preferDark === false) {
          await setSetting('theme', 'light');
        } else {
          await setSetting('theme', 'system');
        }
        render();
      });
    });

    // Advanced toggle
    el.querySelector('[data-toggle-advanced]')?.addEventListener('click', () => {
      advancedOpen = !advancedOpen;
      render();
    });

    // Color knobs — color picker
    el.querySelectorAll('[data-knob-color]').forEach(input => {
      input.addEventListener('input', async () => {
        const key = input.dataset.knobColor;
        const hex = input.value;
        await setTheme({ [key]: hex });
        // Sync text input
        const textInput = el.querySelector(`[data-knob-text="${key}"]`);
        if (textInput) textInput.value = hex;
        // Sync accent-color setting for backwards compat
        if (key === 'accent') {
          const match = ACCENT_COLORS.find(c => c.hex === hex);
          if (match) await setSetting('accentColor', match.id);
          // Re-render harmony suggestions
          render();
        }
      });
    });

    // Color knobs — hex text input
    el.querySelectorAll('[data-knob-text]').forEach(input => {
      input.addEventListener('change', async () => {
        const key = input.dataset.knobText;
        let hex = input.value.trim();
        if (!hex) {
          // Clear to default
          await setTheme({ [key]: null });
          render();
          return;
        }
        if (!hex.startsWith('#')) hex = '#' + hex;
        if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return;
        await setTheme({ [key]: hex });
        // Sync color picker
        const colorInput = el.querySelector(`[data-knob-color="${key}"]`);
        if (colorInput) colorInput.value = hex;
        if (key === 'accent') {
          const match = ACCENT_COLORS.find(c => c.hex === hex);
          if (match) await setSetting('accentColor', match.id);
          render();
        }
      });
    });

    // Color knob clear buttons
    el.querySelectorAll('[data-knob-clear]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const key = btn.dataset.knobClear;
        await setTheme({ [key]: null });
        render();
      });
    });

    // Slider knobs
    el.querySelectorAll('[data-knob-range]').forEach(input => {
      input.addEventListener('input', async () => {
        const key = input.dataset.knobRange;
        const val = parseInt(input.value, 10);
        // Update display value
        const valEl = el.querySelector(`[data-slider-value="${key}"]`);
        if (valEl) valEl.textContent = val;
        await setTheme({ [key]: val });
      });
    });

    // Harmony suggestions
    el.querySelectorAll('[data-harmony-hex]').forEach(dot => {
      dot.addEventListener('click', async () => {
        const hex = dot.dataset.harmonyHex;
        await setTheme({ accent: hex });
        const match = ACCENT_COLORS.find(c => c.hex === hex);
        if (match) await setSetting('accentColor', match.id);
        render();
      });
    });

    // Actions
    el.querySelector('[data-action="reset"]')?.addEventListener('click', async () => {
      await resetTheme();
      await setSetting('theme', 'system');
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
      showFeedback('Thema geëxporteerd', false);
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
        if (ok) {
          showFeedback('Thema geïmporteerd', false);
          render();
        } else {
          showFeedback('Ongeldig themabestand', true);
        }
      } catch {
        showFeedback('Fout bij importeren', true);
      }
      e.target.value = '';
    });
  }

  render();

  return {
    el,
    destroy() {
      clearTimeout(feedbackTimeout);
      el.innerHTML = '';
    },
  };
}
