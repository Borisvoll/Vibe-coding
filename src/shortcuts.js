import { navigate } from './router.js';

const shortcuts = {
  '1': '',             // Dashboard
  '2': 'hours',       // Uren
  '3': 'logbook',     // Logboek
  '4': 'competencies', // Leermeter
  '5': 'assignments',  // Opdrachten
  '6': 'report',       // Verslag
};

export function initShortcuts() {
  document.addEventListener('keydown', (e) => {
    // Don't capture when typing in input/textarea
    const tag = e.target.tagName.toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select' || e.target.isContentEditable) {
      // Only handle Escape in form fields
      if (e.key === 'Escape') {
        e.target.blur();
      }
      // Ctrl+S to save
      if (e.key === 's' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        const saveBtn = document.querySelector('[data-action="save"]');
        if (saveBtn) saveBtn.click();
      }
      return;
    }

    // Ctrl/Cmd + number shortcuts for navigation
    if ((e.ctrlKey || e.metaKey) && shortcuts[e.key]) {
      e.preventDefault();
      navigate(shortcuts[e.key]);
      return;
    }

    // Non-modifier shortcuts
    switch (e.key) {
      case 'Escape': {
        // Close modal or go back
        const modal = document.querySelector('.modal-overlay');
        if (modal) {
          modal.remove();
        } else {
          window.history.back();
        }
        break;
      }
      case 'n': {
        // New entry (context-dependent)
        const hash = window.location.hash.slice(1);
        if (hash.startsWith('logbook') || hash === '') {
          navigate('logbook/new');
        } else if (hash.startsWith('hours')) {
          // Navigate to today's hours
          const today = new Date().toISOString().split('T')[0];
          navigate(`hours/${today}`);
        }
        break;
      }
      case '?': {
        // Show shortcuts help
        showShortcutsHelp();
        break;
      }
    }
  });
}

function showShortcutsHelp() {
  // Remove existing
  document.querySelector('.shortcuts-modal')?.remove();

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay shortcuts-modal';
  overlay.innerHTML = `
    <div class="modal">
      <h3>Sneltoetsen</h3>
      <table class="data-table" style="margin-top:1rem">
        <tbody>
          <tr><td><kbd>Ctrl+1</kbd></td><td>Dashboard</td></tr>
          <tr><td><kbd>Ctrl+2</kbd></td><td>Uren</td></tr>
          <tr><td><kbd>Ctrl+3</kbd></td><td>Logboek</td></tr>
          <tr><td><kbd>Ctrl+4</kbd></td><td>Leermeter</td></tr>
          <tr><td><kbd>Ctrl+5</kbd></td><td>Opdrachten</td></tr>
          <tr><td><kbd>Ctrl+6</kbd></td><td>Verslag</td></tr>
          <tr><td><kbd>n</kbd></td><td>Nieuw item</td></tr>
          <tr><td><kbd>Ctrl+S</kbd></td><td>Opslaan</td></tr>
          <tr><td><kbd>Esc</kbd></td><td>Terug / Sluiten</td></tr>
          <tr><td><kbd>?</kbd></td><td>Deze hulp</td></tr>
        </tbody>
      </table>
      <div class="modal-actions">
        <button class="btn btn-secondary close-modal">Sluiten</button>
      </div>
    </div>
  `;

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay || e.target.classList.contains('close-modal')) {
      overlay.remove();
    }
  });

  document.body.appendChild(overlay);
}
