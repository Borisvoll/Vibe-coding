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

/**
 * Build the Joker card HTML — pixel-art jester rendered in pure CSS.
 * @returns {string}
 */
function jokerCard() {
  // 13×15 pixel grid for the jester sprite
  // 0 = transparent, 1 = hat yellow, 2 = hat red, 3 = skin, 4 = body purple,
  // 5 = bells gold, 6 = eyes, 7 = smile red, 8 = collar white
  const grid = [
    [0,0,5,0,1,1,1,1,1,0,5,0,0],
    [0,0,2,0,1,1,1,1,1,0,2,0,0],
    [0,0,2,1,1,2,1,2,1,1,2,0,0],
    [0,0,0,2,1,1,1,1,1,2,0,0,0],
    [0,0,0,0,3,3,3,3,3,0,0,0,0],
    [0,0,0,3,3,6,3,6,3,3,0,0,0],
    [0,0,0,3,3,3,3,3,3,3,0,0,0],
    [0,0,0,3,3,7,7,7,3,3,0,0,0],
    [0,0,0,0,3,3,3,3,3,0,0,0,0],
    [0,0,8,8,0,8,8,8,0,8,8,0,0],
    [0,0,0,4,4,4,4,4,4,4,0,0,0],
    [0,0,0,4,4,4,4,4,4,4,0,0,0],
    [0,0,0,4,4,4,4,4,4,4,0,0,0],
    [0,0,0,0,4,4,0,4,4,0,0,0,0],
    [0,0,0,0,4,4,0,4,4,0,0,0,0],
  ];
  const colors = {
    1: '#ffd700', 2: '#e63946', 3: '#f4c890', 4: '#7b2d8b',
    5: '#ffd700', 6: '#1a1a2e', 7: '#e63946', 8: '#e8e4d8',
  };
  const pixels = grid.flatMap((row, y) =>
    row.map((v, x) => v ? `<i class="jp" style="--jx:${x};--jy:${y};background:${colors[v]}"></i>` : '')
  ).join('');

  return `
    <div class="balatro-card balatro-card--joker">
      <div class="balatro-joker__pixels">${pixels}</div>
      <span class="balatro-joker__label">JOKER</span>
    </div>
  `;
}

/** Show the Balatro overlay. */
function show() {
  if (overlay) return;

  const hand = dealHand();
  // Insert Joker in the center (position 2)
  const left = hand.slice(0, 2);
  const right = hand.slice(2);
  const el = document.createElement('div');
  el.className = 'balatro-overlay';
  el.innerHTML = `
    <div class="balatro-bg"></div>
    <div class="balatro-scanlines"></div>
    <div class="balatro-vignette"></div>
    ${particles(20)}
    <div class="balatro-cards">
      ${left.map(c => `
        <div class="balatro-card balatro-card--${c.red ? 'red' : 'black'}">
          <span class="balatro-card__rank">${c.rank}</span>
          <span class="balatro-card__suit">${c.suit}</span>
          <span class="balatro-card__rank-bottom">${c.rank}</span>
        </div>
      `).join('')}
      ${jokerCard()}
      ${right.map(c => `
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
