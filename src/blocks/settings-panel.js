import { APP_VERSION } from '../version.js';
import { ACCENT_COLORS, applyAccentColor } from '../constants.js';
import { getSetting, setSetting } from '../db.js';

const ACCENT_PRESETS = ['blue', 'indigo', 'teal', 'green', 'purple'];

const MODE_OPTIONS = [
  { key: 'BPV',      label: 'BPV',         emoji: '🏢', color: 'var(--color-blue)' },
  { key: 'School',   label: 'School',      emoji: '📚', color: 'var(--color-purple)' },
  { key: 'Personal', label: 'Persoonlijk', emoji: '🌱', color: 'var(--color-emerald)' },
];

function getPresets() {
  return ACCENT_COLORS.filter((c) => ACCENT_PRESETS.includes(c.id));
}

export async function renderSettingsBlock(container, { modeManager, eventBus, onChange } = {}) {
  const theme = (await getSetting('theme')) || 'system';
  const accentId = (await getSetting('accentColor')) || 'blue';
  const compact = (await getSetting('compact')) || false;
  const accents = getPresets();
  const currentMode = modeManager?.getMode?.() || 'BPV';

  container.innerHTML = `
    <section class="settings-block card">
      <h3>Instellingen</h3>

      <div class="settings-row">
        <div>
          <div class="settings-label">Modus</div>
          <div class="settings-desc">Wissel je huidige context</div>
        </div>
        <div class="settings-mode-group" data-setting="mode">
          ${MODE_OPTIONS.map((m) => `
            <button type="button" class="settings-mode-pill ${m.key === currentMode ? 'settings-mode-pill--active' : ''}" data-mode="${m.key}">
              <span class="settings-mode-pill__dot" style="background:${m.color}"></span>
              ${m.emoji} ${m.label}
            </button>
          `).join('')}
        </div>
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
        <div class="settings-label">Versie</div>
        <div class="settings-desc">v${APP_VERSION}</div>
      </div>
    </section>
  `;

  // ── Mode switcher ──────────────────────────────────────────
  function updateModePills(mode) {
    container.querySelectorAll('.settings-mode-pill').forEach((p) => {
      p.classList.toggle('settings-mode-pill--active', p.dataset.mode === mode);
    });
  }

  // Direct click handler on each pill for maximum reliability
  container.querySelectorAll('.settings-mode-pill').forEach((pill) => {
    pill.addEventListener('click', () => {
      const mode = pill.dataset.mode;
      if (!mode || !modeManager) return;
      updateModePills(mode);
      modeManager.setMode(mode);
      onChange?.({ key: 'mode', value: mode });
    });
  });

  // Keep pills in sync when mode changes from elsewhere (e.g. header picker)
  eventBus?.on('mode:changed', ({ mode }) => {
    updateModePills(mode);
  });

  // ── Theme ──────────────────────────────────────────────────
  container.querySelectorAll('[data-setting="theme"] .radio-option').forEach((opt) => {
    opt.addEventListener('click', async () => {
      const value = opt.querySelector('input').value;
      await setSetting('theme', value);
      if (value === 'system') document.documentElement.removeAttribute('data-theme');
      else document.documentElement.setAttribute('data-theme', value);
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
    applyAccentColor(hex);
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
}
