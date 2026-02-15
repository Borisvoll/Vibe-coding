import { getSetting, setSetting, clearAllData } from '../db.js';
import { icon } from '../icons.js';
import { emit } from '../state.js';
import { showToast } from '../toast.js';
import { ACCENT_COLORS, applyAccentColor } from '../constants.js';
import { APP_VERSION } from '../main.js';

export function createPage(container) {

  async function render() {
    const theme = await getSetting('theme') || 'system';
    const accentId = await getSetting('accentColor') || 'blue';
    const compact = await getSetting('compact') || false;
    const deviceId = await getSetting('device_id') || '-';

    // SW status
    let swStatus = 'Niet beschikbaar';
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration().catch(() => null);
      if (reg) {
        swStatus = reg.active ? 'Actief' : reg.installing ? 'Installeren...' : 'Wachtend';
      } else {
        swStatus = 'Niet geregistreerd';
      }
    }

    container.innerHTML = `
      <div class="page-header">
        <h2>Instellingen</h2>
      </div>

      <div class="settings-section card">
        <h3>Weergave</h3>
        <div class="settings-row">
          <div>
            <div class="settings-label">Thema</div>
            <div class="settings-desc">Kies licht, donker of systeemvoorkeur</div>
          </div>
          <div class="radio-group">
            <label class="radio-option ${theme === 'system' ? 'selected' : ''}">
              <input type="radio" name="theme" value="system" ${theme === 'system' ? 'checked' : ''}>
              Systeem
            </label>
            <label class="radio-option ${theme === 'light' ? 'selected' : ''}">
              <input type="radio" name="theme" value="light" ${theme === 'light' ? 'checked' : ''}>
              Licht
            </label>
            <label class="radio-option ${theme === 'dark' ? 'selected' : ''}">
              <input type="radio" name="theme" value="dark" ${theme === 'dark' ? 'checked' : ''}>
              Donker
            </label>
          </div>
        </div>
        <div class="settings-row">
          <div>
            <div class="settings-label">Accentkleur</div>
            <div class="settings-desc">Kies een kleur voor knoppen en accenten</div>
          </div>
          <div class="accent-picker" id="settings-accent-picker">
            ${ACCENT_COLORS.map(c => `
              <button class="accent-dot ${c.id === accentId ? 'active' : ''}" data-color="${c.id}" data-hex="${c.hex}" style="background:${c.hex}" title="${c.label}"></button>
            `).join('')}
          </div>
        </div>
        <div class="settings-row">
          <div>
            <div class="settings-label">Compact modus</div>
            <div class="settings-desc">Minder witruimte, dichtere layout</div>
          </div>
          <div class="toggle ${compact ? 'active' : ''}" id="compact-toggle"></div>
        </div>
      </div>

      <div class="settings-section card">
        <h3>Data</h3>
        <div class="settings-row">
          <div>
            <div class="settings-label">Voorbeelddata laden</div>
            <div class="settings-desc">Laad voorbeeld-uren en logboek entries</div>
          </div>
          <button class="btn btn-secondary btn-sm" data-action="seed">Laden</button>
        </div>
        <div class="settings-row">
          <div>
            <div class="settings-label">Alle data wissen</div>
            <div class="settings-desc">Verwijdert alle uren, logboek, competenties en opdrachten</div>
          </div>
          <button class="btn btn-danger btn-sm" data-action="clear">Wissen</button>
        </div>
      </div>

      <div class="settings-section card">
        <h3>Diagnostiek</h3>
        <div class="settings-row">
          <div>
            <div class="settings-label">App versie</div>
            <div class="settings-desc">${APP_VERSION}</div>
          </div>
        </div>
        <div class="settings-row">
          <div>
            <div class="settings-label">Device ID</div>
            <div class="settings-desc" style="font-family: monospace; font-size: 0.75rem;">${deviceId}</div>
          </div>
        </div>
        <div class="settings-row">
          <div>
            <div class="settings-label">Service Worker</div>
            <div class="settings-desc">${swStatus}</div>
          </div>
          <button class="btn btn-secondary btn-sm" data-action="reset-sw">Reset cache & SW</button>
        </div>
        <div class="settings-row">
          <div>
            <div class="settings-label">Sneltoetsen</div>
            <div class="settings-desc">Druk op ? om alle sneltoetsen te zien</div>
          </div>
        </div>
      </div>

      <div class="settings-section card">
        <h3>Over</h3>
        <div class="settings-row">
          <div>
            <div class="settings-label">BPV Voortgang Tracker v${APP_VERSION}</div>
            <div class="settings-desc">Privacy-first. Alle data lokaal opgeslagen. Geen servers, geen tracking.</div>
          </div>
        </div>
      </div>
    `;

    // Theme radio
    container.querySelectorAll('.radio-option').forEach(opt => {
      opt.addEventListener('click', async () => {
        container.querySelectorAll('.radio-option').forEach(o => o.classList.remove('selected'));
        opt.classList.add('selected');
        opt.querySelector('input').checked = true;
        const val = opt.querySelector('input').value;
        await setSetting('theme', val);
        if (val === 'system') {
          document.documentElement.removeAttribute('data-theme');
        } else {
          document.documentElement.setAttribute('data-theme', val);
        }
      });
    });

    // Accent color picker
    container.querySelector('#settings-accent-picker').addEventListener('click', async (e) => {
      const dot = e.target.closest('.accent-dot');
      if (!dot) return;
      const colorId = dot.dataset.color;
      const hex = dot.dataset.hex;
      container.querySelectorAll('.accent-dot').forEach(d => d.classList.remove('active'));
      dot.classList.add('active');
      await setSetting('accentColor', colorId);
      applyAccentColor(hex);
      // Also update shell accent picker
      document.querySelectorAll('.hamburger-menu .accent-dot').forEach(d => {
        d.classList.toggle('active', d.dataset.color === colorId);
      });
    });

    // Compact toggle
    container.querySelector('#compact-toggle').addEventListener('click', async function() {
      this.classList.toggle('active');
      const isCompact = this.classList.contains('active');
      await setSetting('compact', isCompact);
      if (isCompact) {
        document.documentElement.setAttribute('data-compact', 'true');
      } else {
        document.documentElement.removeAttribute('data-compact');
      }
    });

    // Seed data
    container.querySelector('[data-action="seed"]')?.addEventListener('click', async () => {
      try {
        const { loadSeedData } = await import('../seed.js');
        await loadSeedData();
        emit('hours:updated');
        emit('logbook:updated');
        emit('competencies:updated');
        emit('assignments:updated');
        showToast('Voorbeelddata geladen', { type: 'success' });
      } catch (err) {
        showToast('Fout bij laden: ' + err.message, { type: 'error' });
      }
    });

    // Clear data
    container.querySelector('[data-action="clear"]')?.addEventListener('click', async () => {
      if (!confirm('Weet je zeker dat je ALLE data wilt wissen? Dit kan niet ongedaan worden gemaakt.')) return;
      await clearAllData();
      emit('hours:updated');
      emit('logbook:updated');
      emit('competencies:updated');
      emit('assignments:updated');
      showToast('Alle data gewist', { type: 'info' });
    });

    // Reset SW & cache
    container.querySelector('[data-action="reset-sw"]')?.addEventListener('click', async () => {
      if (!confirm('Cache en Service Worker resetten? De pagina wordt herladen.')) return;
      try {
        if ('serviceWorker' in navigator) {
          const registrations = await navigator.serviceWorker.getRegistrations();
          for (const reg of registrations) {
            await reg.unregister();
          }
        }
        const keys = await caches.keys();
        for (const key of keys) {
          await caches.delete(key);
        }
        showToast('Cache en SW gereset. Herladen...', { type: 'info' });
        setTimeout(() => window.location.reload(), 1000);
      } catch (err) {
        showToast('Fout: ' + err.message, { type: 'error' });
      }
    });
  }

  render();
  return {};
}
