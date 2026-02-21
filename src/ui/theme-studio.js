/**
 * Theme Studio — Simplified preset-based theming UI.
 * Renders into a container, returns { el, destroy }.
 */

import { escapeHTML } from '../utils.js';
import {
  getTheme, setTheme, resetTheme,
  exportThemeJson, importThemeJson,
  THEME_PRESETS,
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

export function createThemeStudio() {
  const el = document.createElement('div');
  el.className = 'theme-studio';

  function render() {
    const theme = getTheme();
    const activePresetId = getActivePresetId(theme);

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
        <input type="file" accept=".json" class="theme-studio__import-input" data-import-input />
      </div>
    `;

    bindEvents();
  }

  function bindEvents() {
    // Preset buttons
    el.querySelectorAll('.theme-studio__preset').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.preset;
        const preset = THEME_PRESETS[id];
        if (!preset) return;
        await setTheme({ ...preset.theme });
        // Sync old accentColor setting for backwards compatibility
        const match = ACCENT_COLORS.find(c => c.hex === preset.theme.accent);
        if (match) await setSetting('accentColor', match.id);
        // Sync the settings panel's theme toggle if preferDark changed
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

  render();

  return {
    el,
    destroy() {
      el.innerHTML = '';
    },
  };
}
