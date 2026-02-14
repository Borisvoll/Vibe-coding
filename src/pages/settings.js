import { getSetting, setSetting, clearAllData } from '../db.js';
import { icon } from '../icons.js';
import { emit } from '../state.js';
import { showToast } from '../toast.js';

export function createPage(container) {

  async function render() {
    const theme = await getSetting('theme') || 'system';

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
        <h3>Over</h3>
        <div class="settings-row">
          <div>
            <div class="settings-label">BPV Voortgang Tracker v1.0</div>
            <div class="settings-desc">Privacy-first. Alle data lokaal opgeslagen. Geen servers, geen tracking.</div>
          </div>
        </div>
        <div class="settings-row">
          <div>
            <div class="settings-label">Sneltoetsen</div>
            <div class="settings-desc">Druk op ? om alle sneltoetsen te zien</div>
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
  }

  render();
  return {};
}
