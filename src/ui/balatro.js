/**
 * Balatro Easter Egg — typing "balatro" anywhere triggers it.
 *
 * Full-page overlay with CRT swirl background and animated playing cards.
 * Click anywhere or press Escape to dismiss.
 */

const TRIGGER = 'balatro';
const SUITS = ['♠', '♥', '♦', '♣'];
const RANKS = ['A', 'K', 'Q', 'J', '10'];

let buffer = '';
let overlay = null;

/**
 * Generate a random "hand" of 5 cards.
 * @returns {Array<{suit: string, rank: string, red: boolean}>}
 */
function dealHand() {
  const hand = [];
  const used = new Set();
  while (hand.length < 5) {
    const si = Math.floor(Math.random() * SUITS.length);
    const ri = Math.floor(Math.random() * RANKS.length);
    const key = `${si}-${ri}`;
    if (used.has(key)) continue;
    used.add(key);
    hand.push({
      suit: SUITS[si],
      rank: RANKS[ri],
      red: si === 1 || si === 2, // hearts, diamonds
    });
  }
  return hand;
}

/**
 * Create floating particle elements.
 * @param {number} count
 * @returns {string}
 */
function particles(count) {
  let html = '';
  for (let i = 0; i < count; i++) {
    const left = Math.random() * 100;
    const top = Math.random() * 100;
    const delay = Math.random() * 6;
    const size = 2 + Math.random() * 4;
    html += `<span class="balatro-particle" style="left:${left}%;top:${top}%;animation-delay:${delay.toFixed(1)}s;width:${size}px;height:${size}px;"></span>`;
  }
  return html;
}

/** Show the Balatro overlay. */
function show() {
  if (overlay) return;

  const hand = dealHand();
  const el = document.createElement('div');
  el.className = 'balatro-overlay';
  el.innerHTML = `
    <div class="balatro-bg"></div>
    <div class="balatro-scanlines"></div>
    <div class="balatro-vignette"></div>
    ${particles(20)}
    <div class="balatro-cards">
      ${hand.map(c => `
        <div class="balatro-card balatro-card--${c.red ? 'red' : 'black'}">
          <span class="balatro-card__rank">${c.rank}</span>
          <span class="balatro-card__suit">${c.suit}</span>
          <span class="balatro-card__rank-bottom">${c.rank}</span>
        </div>
      `).join('')}
    </div>
    <div class="balatro-title">Balatro</div>
    <div class="balatro-hint">click or esc to close</div>
  `;

  el.addEventListener('click', dismiss);
  document.body.appendChild(el);
  overlay = el;
}

/** Dismiss with exit animation. */
function dismiss() {
  if (!overlay) return;
  const el = overlay;
  overlay = null;
  el.classList.add('balatro-overlay--exit');
  el.addEventListener('animationend', () => el.remove(), { once: true });
}

/** Keydown handler — builds buffer + detects trigger. */
function onKeyDown(e) {
  // Escape closes overlay
  if (e.key === 'Escape' && overlay) {
    dismiss();
    return;
  }

  // Don't track modifier combos
  if (e.ctrlKey || e.metaKey || e.altKey) return;

  // Only track single printable chars
  if (e.key.length !== 1) return;

  buffer += e.key.toLowerCase();

  // Keep only the last N characters (length of trigger)
  if (buffer.length > TRIGGER.length) {
    buffer = buffer.slice(-TRIGGER.length);
  }

  if (buffer === TRIGGER) {
    buffer = '';
    show();
  }
}

/** Initialize the easter egg listener. Call once on app boot. */
export function initBalatro() {
  document.addEventListener('keydown', onKeyDown);
}
