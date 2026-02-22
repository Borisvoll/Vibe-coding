/**
 * Mode-aware click sound engine using Web Audio API.
 *
 * School   → hard, precies, exact (square wave transient — mechanisch toetsenbord)
 * Personal → warm, luxueus, suite-achtig (gelaagd akkoord met zachte staart)
 * BPV      → clean, professioneel (neutrale sine click)
 *
 * Geluiden worden getriggerd op elk interactief element via een globale
 * pointerdown listener — zo voelt elke klik in de app anders per modus.
 */

let _ctx = null;
let _currentMode = 'School';

function getCtx() {
  if (!_ctx) {
    try {
      _ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch {
      return null;
    }
  }
  // Browser autoplay policy: resume na user gesture
  if (_ctx.state === 'suspended') {
    _ctx.resume().catch(() => {});
  }
  return _ctx;
}

/**
 * School — hard, precies, exact.
 * Square-wave transient met snelle frequentie-sweep: het gevoel van een
 * mechanische toetsenbordsschakelaar — geen twijfel, geen aarzeling.
 */
function playSchoolClick() {
  const ctx = getCtx();
  if (!ctx) return;
  const t = ctx.currentTime;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.type = 'square';
  // Harde tik: van hoog naar laag in 20ms — precies zoals een schakelaar
  osc.frequency.setValueAtTime(1200, t);
  osc.frequency.exponentialRampToValueAtTime(180, t + 0.02);

  gain.gain.setValueAtTime(0.20, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.022);

  osc.start(t);
  osc.stop(t + 0.025);
}

/**
 * Personal — overnagedacht, suite-achtig, een extra snoepje.
 * Gelaagd warm akkoord: grondtoon + kwint + octaaf + majeur-terts boven
 * het octaaf. Low-pass filter dempt scherpte. Zachte attack, lange staart.
 * Voelt als een pianotoets of een premium notificatietoon.
 */
function playPersonalClick() {
  const ctx = getCtx();
  if (!ctx) return;
  const t = ctx.currentTime;

  // Low-pass filter voor warmte (snijdt harde boventonen weg)
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 1100;
  filter.Q.value = 0.8;
  filter.connect(ctx.destination);

  // Mastervolume met zachte attack
  const master = ctx.createGain();
  master.connect(filter);
  master.gain.setValueAtTime(0, t);
  master.gain.linearRampToValueAtTime(1.0, t + 0.006);

  // Harmonische reeks: grondtoon (220 Hz = A3) + kwint + octaaf + terts
  const partials = [
    { freq: 220,  vol: 0.11, decay: 0.30 }, // grondtoon
    { freq: 330,  vol: 0.06, decay: 0.22 }, // kwint (A+kwint = E4)
    { freq: 440,  vol: 0.035, decay: 0.18 }, // octaaf
    { freq: 550,  vol: 0.018, decay: 0.14 }, // grote terts boven octaaf
  ];

  partials.forEach(({ freq, vol, decay }) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(master);

    osc.type = 'sine';
    osc.frequency.value = freq;

    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + decay);

    osc.start(t);
    osc.stop(t + decay + 0.01);
  });

  // Subtiele "shimmer": een licht detuned octaaf voor rijkdom
  const shimmer = ctx.createOscillator();
  const shimmerGain = ctx.createGain();
  shimmer.connect(shimmerGain);
  shimmerGain.connect(master);
  shimmer.type = 'sine';
  shimmer.frequency.value = 441.5; // licht versteld octaaf = zachte beating
  shimmerGain.gain.setValueAtTime(0.012, t);
  shimmerGain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
  shimmer.start(t);
  shimmer.stop(t + 0.26);
}

/**
 * BPV — clean, professioneel, neutraal.
 * Enkele sine-toon, medium frequentie, korte decay. Functioneel.
 */
function playBPVClick() {
  const ctx = getCtx();
  if (!ctx) return;
  const t = ctx.currentTime;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.type = 'sine';
  osc.frequency.value = 560;

  gain.gain.setValueAtTime(0.10, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.07);

  osc.start(t);
  osc.stop(t + 0.08);
}

function playClick() {
  try {
    switch (_currentMode) {
      case 'School':   playSchoolClick();   break;
      case 'Personal': playPersonalClick(); break;
      case 'BPV':      playBPVClick();      break;
      default:         playSchoolClick();
    }
  } catch {
    // AudioContext niet beschikbaar (tests, SSR) — stil negeren
  }
}

// Selector voor alle interactieve elementen waarop een klik-geluid past
const INTERACTIVE_SELECTOR = [
  'button',
  '[role="button"]',
  'a[href]',
  'input[type="checkbox"]',
  'input[type="radio"]',
  'select',
  '.tab-btn',
  '.mode-btn',
  '.cmd-item',
  '[data-clicksound]',
].join(', ');

function onPointerDown(e) {
  if (e.pointerType === 'touch') return; // geen geluid op touch (klinkt vreemd)
  if (e.target.closest(INTERACTIVE_SELECTOR)) {
    playClick();
  }
}

/**
 * Initialiseer het click-sound systeem.
 * Koppelt aan de eventBus voor mode-updates en luistert globaal naar clicks.
 *
 * @param {object} eventBus
 * @param {object} modeManager
 */
export function initClickSound(eventBus, modeManager) {
  _currentMode = modeManager.getMode();

  eventBus.on('mode:changed', ({ mode }) => {
    _currentMode = mode;
  });

  document.addEventListener('pointerdown', onPointerDown, { passive: true });
}

export function destroyClickSound() {
  document.removeEventListener('pointerdown', onPointerDown);
  if (_ctx) {
    _ctx.close().catch(() => {});
    _ctx = null;
  }
}
