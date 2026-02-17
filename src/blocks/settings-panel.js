import { APP_VERSION } from '../version.js';
import { ACCENT_COLORS, applyAccentColor } from '../constants.js';
import { getSetting, setSetting } from '../db.js';
import { getFeatureFlag, setFeatureFlag } from '../core/featureFlags.js';

const ACCENT_PRESETS = ['blue', 'indigo', 'teal', 'green', 'purple'];

function getPresets() {
  return ACCENT_COLORS.filter((c) => ACCENT_PRESETS.includes(c.id));
}

export async function renderSettingsBlock(container, { showExperimental = true, onChange } = {}) {
  const theme = (await getSetting('theme')) || 'system';
  const accentId = (await getSetting('accentColor')) || 'blue';
  const compact = (await getSetting('compact')) || false;
  const focusMode = (await getSetting('focusMode')) || false;
  const enableNewOS = getFeatureFlag('enableNewOS');
  const accents = getPresets();

  container.innerHTML = `
    <section class="settings-block card">
      <h3>Instellingen</h3>

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
          <div class="settings-desc">Rustige vooringestelde kleuren</div>
        </div>
        <div class="accent-picker" data-setting="accent">
          ${accents.map((c) => `<button class="accent-dot ${c.id === accentId ? 'active' : ''}" data-color="${c.id}" data-hex="${c.hex}" style="background:${c.hex}" title="${c.label}"></button>`).join('')}
        </div>
      </div>

      <div class="settings-row">
        <div>
          <div class="settings-label">Dichtheid</div>
          <div class="settings-desc">Ruim / Compact</div>
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

      ${showExperimental ? `
      <div class="settings-row">
        <div>
          <div class="settings-label">Nieuwe OS inschakelen <span class="settings-exp">experimenteel</span></div>
          <div class="settings-desc">Opt-in shell. Legacy blijft standaard tot je dit aanzet.</div>
        </div>
        <button class="toggle ${enableNewOS ? 'active' : ''}" type="button" data-setting="enable-new-os" aria-label="Schakel nieuwe OS in of uit"></button>
      </div>

      <div class="settings-row">
        <div>
          <div class="settings-label">Focusmodus (Nieuwe OS)</div>
          <div class="settings-desc">Verberg alles behalve het tabblad Vandaag in de Nieuwe OS.</div>
        </div>
        <button class="toggle ${focusMode ? 'active' : ''}" type="button" data-setting="focus-mode" aria-label="Schakel focusmodus in of uit"></button>
      </div>
      ` : ''}

      <div class="settings-row">
        <div class="settings-label">Versie</div>
        <div class="settings-desc">v${APP_VERSION}</div>
      </div>
    </section>
  `;

  container.querySelectorAll('[data-setting="theme"] .radio-option').forEach((opt) => {
    opt.addEventListener('click', async () => {
      const value = opt.querySelector('input').value;
      await setSetting('theme', value);
      if (value === 'system') document.documentElement.removeAttribute('data-theme');
      else document.documentElement.setAttribute('data-theme', value);
      onChange?.({ key: 'theme', value });
    });
  });

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

  container.querySelectorAll('[data-setting="density"] .radio-option').forEach((opt) => {
    opt.addEventListener('click', async () => {
      const value = opt.querySelector('input').value;
      const compactMode = value === 'compact';
      await setSetting('compact', compactMode);
      if (compactMode) document.documentElement.setAttribute('data-compact', 'true');
      else document.documentElement.removeAttribute('data-compact');
      onChange?.({ key: 'compact', value: compactMode });
    });
  });

  container.querySelector('[data-setting="enable-new-os"]')?.addEventListener('click', (event) => {
    const next = !event.currentTarget.classList.contains('active');
    event.currentTarget.classList.toggle('active', next);
    setFeatureFlag('enableNewOS', next);
    onChange?.({ key: 'enableNewOS', value: next });
  });

  container.querySelector('[data-setting="focus-mode"]')?.addEventListener('click', async (event) => {
    const next = !event.currentTarget.classList.contains('active');
    event.currentTarget.classList.toggle('active', next);
    await setSetting('focusMode', next);
    onChange?.({ key: 'focusMode', value: next });
  });
}
