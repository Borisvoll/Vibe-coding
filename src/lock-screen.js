// Lock screen — blocks the app until the correct password is entered.
// Password hash is stored in localStorage; session unlock in sessionStorage.

const HASH_KEY = 'bpv_pw_hash';
const SALT_KEY = 'bpv_pw_salt';
const UNLOCK_KEY = 'bpv_unlocked';

async function deriveHash(password, salt) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: 100_000, hash: 'SHA-256' },
    keyMaterial, 256
  );
  return Array.from(new Uint8Array(bits)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function isUnlocked() {
  return sessionStorage.getItem(UNLOCK_KEY) === '1';
}

function hasPassword() {
  return !!localStorage.getItem(HASH_KEY);
}

function createLockScreen(onUnlock) {
  const isSetup = !hasPassword();

  const overlay = document.createElement('div');
  overlay.className = 'lock-overlay';
  overlay.innerHTML = `
    <div class="lock-card">
      <div class="lock-icon-wrap">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="48" height="48">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
        </svg>
      </div>
      <h2>${isSetup ? 'Wachtwoord instellen' : 'BPV Tracker'}</h2>
      <p class="lock-sub">${isSetup
        ? 'Stel een wachtwoord in om je gegevens te beschermen.'
        : 'Voer je wachtwoord in om verder te gaan.'}</p>
      <form class="lock-form" autocomplete="off">
        <div class="lock-input-wrap">
          <input type="password" id="lock-pw" placeholder="Wachtwoord" autocomplete="current-password" required />
          <button type="button" class="lock-toggle-vis" tabindex="-1" aria-label="Toon wachtwoord">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
          </button>
        </div>
        ${isSetup ? `
        <div class="lock-input-wrap">
          <input type="password" id="lock-pw2" placeholder="Bevestig wachtwoord" autocomplete="new-password" required />
        </div>` : ''}
        <button type="submit" class="lock-btn">${isSetup ? 'Wachtwoord instellen' : 'Ontgrendelen'}</button>
        <p class="lock-error" id="lock-error"></p>
      </form>
    </div>
  `;

  document.body.appendChild(overlay);

  // Focus input
  const pwInput = overlay.querySelector('#lock-pw');
  setTimeout(() => pwInput.focus(), 100);

  // Toggle visibility
  const toggleBtn = overlay.querySelector('.lock-toggle-vis');
  toggleBtn.addEventListener('click', () => {
    const isHidden = pwInput.type === 'password';
    pwInput.type = isHidden ? 'text' : 'password';
    const pw2 = overlay.querySelector('#lock-pw2');
    if (pw2) pw2.type = isHidden ? 'text' : 'password';
  });

  const errorEl = overlay.querySelector('#lock-error');
  const form = overlay.querySelector('.lock-form');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const pw = pwInput.value;
    if (!pw) return;

    if (isSetup) {
      const pw2 = overlay.querySelector('#lock-pw2').value;
      if (pw !== pw2) {
        errorEl.textContent = 'Wachtwoorden komen niet overeen.';
        return;
      }
      if (pw.length < 4) {
        errorEl.textContent = 'Wachtwoord moet minimaal 4 tekens zijn.';
        return;
      }
      // Save new password
      const salt = crypto.getRandomValues(new Uint8Array(16));
      const hash = await deriveHash(pw, salt);
      localStorage.setItem(SALT_KEY, Array.from(salt).join(','));
      localStorage.setItem(HASH_KEY, hash);
      sessionStorage.setItem(UNLOCK_KEY, '1');
      overlay.remove();
      onUnlock();
    } else {
      // Verify
      const saltStr = localStorage.getItem(SALT_KEY);
      const storedHash = localStorage.getItem(HASH_KEY);
      const salt = new Uint8Array(saltStr.split(',').map(Number));
      const hash = await deriveHash(pw, salt);

      if (hash === storedHash) {
        sessionStorage.setItem(UNLOCK_KEY, '1');
        overlay.remove();
        onUnlock();
      } else {
        errorEl.textContent = 'Onjuist wachtwoord.';
        pwInput.value = '';
        pwInput.focus();
      }
    }
  });
}

/**
 * Check if the app should be locked. Returns a Promise that resolves when unlocked.
 */
export function checkLock() {
  if (!hasPassword() || isUnlocked()) {
    if (!hasPassword()) {
      // First time — show setup
      return new Promise(resolve => createLockScreen(resolve));
    }
    return Promise.resolve();
  }
  return new Promise(resolve => createLockScreen(resolve));
}

/**
 * Change password — called from settings page
 */
export async function changePassword(currentPw, newPw) {
  const saltStr = localStorage.getItem(SALT_KEY);
  const storedHash = localStorage.getItem(HASH_KEY);

  if (storedHash && saltStr) {
    const salt = new Uint8Array(saltStr.split(',').map(Number));
    const hash = await deriveHash(currentPw, salt);
    if (hash !== storedHash) {
      throw new Error('Huidig wachtwoord is onjuist.');
    }
  }

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await deriveHash(newPw, salt);
  localStorage.setItem(SALT_KEY, Array.from(salt).join(','));
  localStorage.setItem(HASH_KEY, hash);
}

/**
 * Remove password protection entirely
 */
export async function removePassword(currentPw) {
  const saltStr = localStorage.getItem(SALT_KEY);
  const storedHash = localStorage.getItem(HASH_KEY);

  if (storedHash && saltStr) {
    const salt = new Uint8Array(saltStr.split(',').map(Number));
    const hash = await deriveHash(currentPw, salt);
    if (hash !== storedHash) {
      throw new Error('Wachtwoord is onjuist.');
    }
  }

  localStorage.removeItem(HASH_KEY);
  localStorage.removeItem(SALT_KEY);
  sessionStorage.removeItem(UNLOCK_KEY);
}
