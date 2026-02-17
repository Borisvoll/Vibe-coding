import { getSetting, setSetting, clearAllData } from '../db.js';
import { icon } from '../icons.js';
import { emit, on } from '../state.js';
import { showToast } from '../toast.js';
import { ACCENT_COLORS, applyAccentColor } from '../constants.js';
import { APP_VERSION } from '../main.js';
import { restartAutoSync, stopAutoSync, syncNow, testSync } from '../auto-sync.js';
import { changePassword, removePassword } from '../lock-screen.js';

export function createPage(container) {

  async function render() {
    const theme = await getSetting('theme') || 'system';
    const accentId = await getSetting('accentColor') || 'blue';
    const compact = await getSetting('compact') || false;
    const deviceId = await getSetting('device_id') || '-';
    const userName = await getSetting('user_name') || '';
    const companyName = await getSetting('company_name') || '';
    const hasLockPassword = !!localStorage.getItem('bpv_pw_hash');

    // Auto-sync settings
    const autoSyncEnabled = await getSetting('autosync_enabled') || false;
    const autoSyncApiKey = await getSetting('autosync_apikey') || '';
    const autoSyncBinId = await getSetting('autosync_binid') || '';
    const autoSyncPassword = await getSetting('autosync_password') || '';
    const autoSyncLastRaw = await getSetting('autosync_last');
    const autoSyncLast = autoSyncLastRaw
      ? new Date(autoSyncLastRaw).toLocaleString('nl-NL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
      : 'Nog niet gesynchroniseerd';

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
        <h3>Profiel</h3>
        <div class="settings-row">
          <div style="width:100%">
            <div class="settings-label">Naam</div>
            <div class="settings-desc" style="margin-bottom:var(--space-2)">Wordt getoond op het dashboard</div>
            <input type="text" class="form-input" id="settings-username" value="${userName}" placeholder="Je naam">
          </div>
        </div>
        <div class="settings-row">
          <div style="width:100%">
            <div class="settings-label">Stagebedrijf</div>
            <div class="settings-desc" style="margin-bottom:var(--space-2)">Wordt getoond op het dashboard en in het verslag</div>
            <input type="text" class="form-input" id="settings-company" value="${companyName}" placeholder="Bedrijfsnaam">
          </div>
        </div>
        <div class="settings-row">
          <div></div>
          <button class="btn btn-secondary btn-sm" data-action="save-profile">Opslaan</button>
        </div>
      </div>

      <div class="settings-section card">
        <h3>Beveiliging</h3>
        <div class="settings-row">
          <div>
            <div class="settings-label">Wachtwoordbeveiliging</div>
            <div class="settings-desc">${hasLockPassword ? 'Je app is beveiligd met een wachtwoord' : 'Niet ingesteld'}</div>
          </div>
          <span class="badge ${hasLockPassword ? 'badge-success' : 'badge-warning'}">${hasLockPassword ? 'Actief' : 'Uit'}</span>
        </div>
        ${hasLockPassword ? `
        <div class="settings-row">
          <div style="width:100%">
            <div class="settings-label">Wachtwoord wijzigen</div>
            <div style="display:flex;flex-direction:column;gap:var(--space-2);margin-top:var(--space-2)">
              <input type="password" class="form-input" id="pw-current" placeholder="Huidig wachtwoord">
              <input type="password" class="form-input" id="pw-new" placeholder="Nieuw wachtwoord">
              <input type="password" class="form-input" id="pw-confirm" placeholder="Bevestig nieuw wachtwoord">
            </div>
          </div>
        </div>
        <div class="settings-row">
          <div></div>
          <div style="display:flex;gap:var(--space-2)">
            <button class="btn btn-secondary btn-sm" data-action="change-pw">Wijzigen</button>
            <button class="btn btn-danger btn-sm" data-action="remove-pw">Verwijderen</button>
          </div>
        </div>
        ` : `
        <div class="settings-row">
          <div style="width:100%">
            <div class="settings-label">Wachtwoord instellen</div>
            <div style="display:flex;flex-direction:column;gap:var(--space-2);margin-top:var(--space-2)">
              <input type="password" class="form-input" id="pw-new" placeholder="Nieuw wachtwoord">
              <input type="password" class="form-input" id="pw-confirm" placeholder="Bevestig wachtwoord">
            </div>
          </div>
        </div>
        <div class="settings-row">
          <div></div>
          <button class="btn btn-primary btn-sm" data-action="set-pw">Instellen</button>
        </div>
        `}
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
        <h3>Sync tussen apparaten</h3>
        <div class="settings-desc" style="margin-bottom:var(--space-3)">
          Synchroniseer je data automatisch tussen telefoon en laptop.
          Gebruik dezelfde API key en hetzelfde wachtwoord op beide apparaten.
        </div>
        <div class="settings-row">
          <div>
            <div class="settings-label">Synchronisatie aan</div>
            <div class="settings-desc">Via jsonbin.io (gratis)</div>
          </div>
          <div class="toggle ${autoSyncEnabled ? 'active' : ''}" id="autosync-toggle"></div>
        </div>
        <div id="autosync-config" style="${autoSyncEnabled ? '' : 'display:none'}">
          <div class="settings-row">
            <div style="width:100%">
              <div class="settings-label">jsonbin.io API Key</div>
              <div class="settings-desc" style="margin-bottom:var(--space-2)">Maak gratis aan op <a href="https://jsonbin.io" target="_blank" rel="noopener">jsonbin.io</a> → API Keys. Gebruik dezelfde key op beide apparaten.</div>
              <input type="password" class="form-input" id="autosync-apikey" value="${autoSyncApiKey}" placeholder="$2a$10$...">
            </div>
          </div>
          <div class="settings-row">
            <div style="width:100%">
              <div class="settings-label">Sync wachtwoord</div>
              <div class="settings-desc" style="margin-bottom:var(--space-2)">Versleutelt je data (AES-256). Gebruik hetzelfde wachtwoord op beide apparaten.</div>
              <input type="password" class="form-input" id="autosync-password" value="${autoSyncPassword}" placeholder="Sterk wachtwoord">
            </div>
          </div>
          <div class="settings-row">
            <div>
              <div class="settings-label">Status</div>
              <div class="settings-desc" id="autosync-last-label">${autoSyncLast}</div>
              ${autoSyncBinId ? `<div class="settings-desc" style="font-family:var(--font-mono);font-size:0.6875rem;margin-top:var(--space-1);opacity:0.6">Bin: ${autoSyncBinId}</div>` : ''}
            </div>
            <div style="display:flex;gap:var(--space-2)">
              <button class="btn btn-secondary btn-sm" data-action="save-autosync">Opslaan</button>
              <button class="btn btn-primary btn-sm" data-action="sync-now">Sync nu</button>
            </div>
          </div>
          <div class="settings-row">
            <div style="width:100%">
              <button class="btn btn-secondary btn-sm" data-action="test-sync" style="margin-bottom:var(--space-2)">Test verbinding</button>
              <pre id="sync-diagnostic" style="font-size:0.75rem;font-family:var(--font-mono);color:var(--color-text-secondary);white-space:pre-wrap;display:none;background:var(--color-surface-raised);padding:var(--space-3);border-radius:var(--radius-md)"></pre>
            </div>
          </div>
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

    // Save profile
    container.querySelector('[data-action="save-profile"]')?.addEventListener('click', async () => {
      const name = container.querySelector('#settings-username')?.value.trim();
      const company = container.querySelector('#settings-company')?.value.trim();
      await setSetting('user_name', name);
      await setSetting('company_name', company);
      showToast('Profiel opgeslagen', { type: 'success' });
    });

    // Change password
    container.querySelector('[data-action="change-pw"]')?.addEventListener('click', async () => {
      const cur = container.querySelector('#pw-current')?.value;
      const newPw = container.querySelector('#pw-new')?.value;
      const conf = container.querySelector('#pw-confirm')?.value;
      if (!cur || !newPw || !conf) {
        showToast('Vul alle velden in', { type: 'warning' });
        return;
      }
      if (newPw !== conf) {
        showToast('Nieuwe wachtwoorden komen niet overeen', { type: 'warning' });
        return;
      }
      if (newPw.length < 4) {
        showToast('Wachtwoord moet minimaal 4 tekens zijn', { type: 'warning' });
        return;
      }
      try {
        await changePassword(cur, newPw);
        showToast('Wachtwoord gewijzigd', { type: 'success' });
        render();
      } catch (err) {
        showToast(err.message, { type: 'error' });
      }
    });

    // Set password (when none exists)
    container.querySelector('[data-action="set-pw"]')?.addEventListener('click', async () => {
      const newPw = container.querySelector('#pw-new')?.value;
      const conf = container.querySelector('#pw-confirm')?.value;
      if (!newPw || !conf) {
        showToast('Vul beide velden in', { type: 'warning' });
        return;
      }
      if (newPw !== conf) {
        showToast('Wachtwoorden komen niet overeen', { type: 'warning' });
        return;
      }
      if (newPw.length < 4) {
        showToast('Wachtwoord moet minimaal 4 tekens zijn', { type: 'warning' });
        return;
      }
      try {
        await changePassword('', newPw);
        showToast('Wachtwoord ingesteld', { type: 'success' });
        render();
      } catch (err) {
        showToast(err.message, { type: 'error' });
      }
    });

    // Remove password
    container.querySelector('[data-action="remove-pw"]')?.addEventListener('click', async () => {
      const cur = container.querySelector('#pw-current')?.value;
      if (!cur) {
        showToast('Voer je huidige wachtwoord in', { type: 'warning' });
        return;
      }
      if (!confirm('Weet je zeker dat je de wachtwoordbeveiliging wilt uitschakelen?')) return;
      try {
        await removePassword(cur);
        showToast('Wachtwoordbeveiliging verwijderd', { type: 'info' });
        render();
      } catch (err) {
        showToast(err.message, { type: 'error' });
      }
    });

    // Auto-sync toggle
    container.querySelector('#autosync-toggle')?.addEventListener('click', async function() {
      this.classList.toggle('active');
      const enabled = this.classList.contains('active');
      await setSetting('autosync_enabled', enabled);
      const configEl = container.querySelector('#autosync-config');
      if (configEl) configEl.style.display = enabled ? '' : 'none';
      if (!enabled) stopAutoSync();
    });

    // Save auto-sync config
    container.querySelector('[data-action="save-autosync"]')?.addEventListener('click', async () => {
      const apiKey = container.querySelector('#autosync-apikey')?.value.trim();
      const password = container.querySelector('#autosync-password')?.value;

      if (!apiKey || !password) {
        showToast('Vul API key en wachtwoord in', { type: 'warning' });
        return;
      }
      if (password.length < 4) {
        showToast('Wachtwoord moet minimaal 4 tekens zijn', { type: 'warning' });
        return;
      }

      await setSetting('autosync_apikey', apiKey);
      await setSetting('autosync_password', password);
      await setSetting('autosync_enabled', true);

      try {
        await restartAutoSync();
        showToast('Sync instellingen opgeslagen', { type: 'success' });
      } catch (err) {
        showToast('Sync fout: ' + err.message, { type: 'error' });
      }
    });

    // Sync now button
    container.querySelector('[data-action="sync-now"]')?.addEventListener('click', async () => {
      const apiKey = container.querySelector('#autosync-apikey')?.value.trim();
      const password = container.querySelector('#autosync-password')?.value;
      if (!apiKey || !password) {
        showToast('Sla eerst de instellingen op', { type: 'warning' });
        return;
      }

      // Save settings first (in case user changed them)
      await setSetting('autosync_apikey', apiKey);
      await setSetting('autosync_password', password);
      await setSetting('autosync_enabled', true);

      const btn = container.querySelector('[data-action="sync-now"]');
      const label = container.querySelector('#autosync-last-label');
      const diag = container.querySelector('#sync-diagnostic');
      try {
        btn.disabled = true;
        btn.textContent = 'Bezig...';
        if (label) label.textContent = 'Synchroniseren...';
        if (diag) { diag.style.display = 'block'; diag.textContent = 'Sync bezig...\n'; }

        const result = await syncNow();
        const lastSync = await getSetting('autosync_last');
        if (label && lastSync) {
          label.textContent = new Date(lastSync).toLocaleString('nl-NL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
        }

        // Show detailed result
        const details = [];
        if (result?.binFound) details.push('Bestaande sync gevonden en verbonden');
        if (result?.binCreated) details.push('Nieuwe sync aangemaakt');
        if (result?.pulled > 0) details.push(`${result.pulled} records gedownload`);
        if (result?.pulled === 0 && !result?.binCreated && !result?.binFound) details.push('Alles is up-to-date');
        if (result?.pushed) details.push('Lokale data gepusht');
        const msg = details.length > 0 ? details.join(', ') : 'Sync voltooid';
        showToast(msg, { type: 'success', duration: 5000 });
        if (diag) diag.textContent = 'Sync resultaat:\n' + details.join('\n');

        // Re-render to update bin ID display
        render();
      } catch (err) {
        showToast('Sync fout: ' + err.message, { type: 'error', duration: 5000 });
        if (label) label.textContent = 'Fout: ' + err.message;
        if (diag) { diag.style.display = 'block'; diag.textContent = 'Sync fout: ' + err.message; }
      } finally {
        btn.disabled = false;
        btn.textContent = 'Sync nu';
      }
    });

    // Test sync connection
    container.querySelector('[data-action="test-sync"]')?.addEventListener('click', async () => {
      const btn = container.querySelector('[data-action="test-sync"]');
      const diag = container.querySelector('#sync-diagnostic');
      btn.disabled = true;
      btn.textContent = 'Testen...';
      diag.style.display = 'block';
      diag.textContent = 'Verbinding testen...\n';
      try {
        const result = await testSync();
        diag.textContent = result.steps.map((s, i) => `${i + 1}. ${s}`).join('\n');
        diag.textContent += '\n\n' + (result.ok ? 'Resultaat: OK' : 'Resultaat: FOUT — controleer bovenstaande stappen');
      } catch (err) {
        diag.textContent = 'Test mislukt: ' + err.message;
      } finally {
        btn.disabled = false;
        btn.textContent = 'Test verbinding';
      }
    });

    // Listen for sync status updates
    on('autosync:status', ({ state, lastSync, message }) => {
      const label = container.querySelector('#autosync-last-label');
      if (!label) return;
      if (state === 'uploading') label.textContent = 'Uploaden...';
      else if (state === 'downloading') label.textContent = 'Downloaden...';
      else if (state === 'searching') label.textContent = 'Bestaande sync zoeken...';
      else if (state === 'error') label.textContent = 'Fout: ' + (message || 'onbekend');
      else if (lastSync) {
        label.textContent = new Date(lastSync).toLocaleString('nl-NL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
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
  return {
    destroy() {
      // offStatus cleanup handled by page re-render
    }
  };
}
