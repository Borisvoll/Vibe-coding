/**
 * Tutorial system — guided onboarding for BORIS OS.
 *
 * Shows contextual tooltips one at a time. Tracks which tips
 * have been seen via localStorage so users only see each tip once.
 * New features get a `version` bump — only new tips are shown to
 * returning users.
 */

const ENABLED_KEY = 'boris_tutorial';
const SEEN_KEY = 'boris_tutorial_seen';

export const TIPS = [
  {
    id: 'welcome',
    title: 'Welkom bij BORIS',
    text: 'Je persoonlijke OS om school, stage en leven te organiseren. Even een korte rondleiding!',
    target: '.os-shell__title',
    version: 1,
  },
  {
    id: 'mode-btn',
    title: 'Modus wisselen',
    text: 'Wissel tussen School, Persoonlijk en BPV. Elke modus toont alleen relevante taken en projecten.',
    target: '#mode-btn',
    version: 1,
  },
  {
    id: 'nav-dashboard',
    title: 'Dashboard',
    text: 'Je startpagina met een overzicht van taken, projecten en statistieken.',
    target: '[data-os-tab="dashboard"]',
    version: 1,
  },
  {
    id: 'nav-today',
    title: 'Vandaag',
    text: 'Je dagplan — taken voor vandaag, quick-actions en je weekoverzicht.',
    target: '[data-os-tab="today"]',
    version: 1,
  },
  {
    id: 'nav-inbox',
    title: 'Inbox',
    text: 'Vang snel ideeën en taken op. Typ iets en druk Enter — verwerk het later.',
    target: '[data-os-tab="inbox"]',
    version: 1,
  },
  {
    id: 'nav-planning',
    title: 'Planning',
    text: 'Plan je taken en projecten vooruit. Verdeel je werk over de week.',
    target: '[data-os-tab="planning"]',
    version: 1,
  },
  {
    id: 'nav-reflectie',
    title: 'Reflectie',
    text: 'Kijk terug op je week. Wat ging goed? Wat kan beter?',
    target: '[data-os-tab="reflectie"]',
    version: 1,
  },
  {
    id: 'settings-hint',
    title: 'Instellingen',
    text: 'Pas thema, kleur en dichtheid aan. Hier kun je ook deze tutorial aan of uit zetten.',
    target: null,
    version: 1,
  },
];

// ── State helpers ───────────────────────────────────────────

function getSeenTips() {
  try {
    const raw = localStorage.getItem(SEEN_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function markTipSeen(tipId) {
  const seen = getSeenTips();
  if (!seen.includes(tipId)) {
    seen.push(tipId);
    try { localStorage.setItem(SEEN_KEY, JSON.stringify(seen)); } catch {}
  }
}

function markAllSeen() {
  try {
    localStorage.setItem(SEEN_KEY, JSON.stringify(TIPS.map(t => t.id)));
  } catch {}
}

export function isTutorialEnabled() {
  try {
    const val = localStorage.getItem(ENABLED_KEY);
    // Default: enabled for new users (null = never set)
    if (val === null) return true;
    return val === 'true';
  } catch { return false; }
}

export function setTutorialEnabled(enabled) {
  try { localStorage.setItem(ENABLED_KEY, String(Boolean(enabled))); } catch {}
}

export function resetTutorial() {
  try { localStorage.removeItem(SEEN_KEY); } catch {}
}

export function getUnseenTips() {
  const seen = getSeenTips();
  return TIPS.filter(t => !seen.includes(t.id));
}

// ── Tooltip UI ──────────────────────────────────────────────

let overlayEl = null;
let activeTips = [];
let activeIndex = 0;
let highlightedEl = null;

function clearHighlight() {
  if (highlightedEl) {
    highlightedEl.classList.remove('tutorial-highlight');
    highlightedEl = null;
  }
}

function highlightTarget(targetSelector) {
  clearHighlight();
  if (!targetSelector) return;
  const el = document.querySelector(targetSelector);
  if (!el) return;
  el.classList.add('tutorial-highlight');
  highlightedEl = el;
  // Scroll into view if needed
  el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function renderTooltip() {
  if (activeIndex >= activeTips.length) {
    closeTutorial();
    return;
  }

  const tip = activeTips[activeIndex];
  const total = activeTips.length;
  const isLast = activeIndex === total - 1;

  highlightTarget(tip.target);

  if (!overlayEl) {
    overlayEl = document.createElement('div');
    overlayEl.className = 'tutorial-overlay';
    document.body.appendChild(overlayEl);
  }

  overlayEl.innerHTML = `
    <div class="tutorial-backdrop"></div>
    <div class="tutorial-card" role="dialog" aria-label="${tip.title}">
      <div class="tutorial-card__header">
        <span class="tutorial-card__step">${activeIndex + 1} / ${total}</span>
        <button type="button" class="tutorial-card__close" aria-label="Sluiten">&times;</button>
      </div>
      <h4 class="tutorial-card__title">${tip.title}</h4>
      <p class="tutorial-card__text">${tip.text}</p>
      <div class="tutorial-card__actions">
        <button type="button" class="tutorial-card__skip">Overslaan</button>
        <button type="button" class="tutorial-card__next">${isLast ? 'Klaar!' : 'Volgende'}</button>
      </div>
    </div>
  `;

  // Force reflow then show
  requestAnimationFrame(() => overlayEl.classList.add('tutorial-overlay--visible'));

  // Event listeners
  overlayEl.querySelector('.tutorial-card__close').addEventListener('click', () => {
    markAllSeen();
    closeTutorial();
  });

  overlayEl.querySelector('.tutorial-card__skip').addEventListener('click', () => {
    markAllSeen();
    closeTutorial();
  });

  overlayEl.querySelector('.tutorial-card__next').addEventListener('click', () => {
    markTipSeen(tip.id);
    activeIndex++;
    if (activeIndex >= activeTips.length) {
      closeTutorial();
    } else {
      overlayEl.classList.remove('tutorial-overlay--visible');
      setTimeout(() => renderTooltip(), 150);
    }
  });

  overlayEl.querySelector('.tutorial-backdrop').addEventListener('click', () => {
    markAllSeen();
    closeTutorial();
  });
}

function closeTutorial() {
  clearHighlight();
  if (overlayEl) {
    overlayEl.classList.remove('tutorial-overlay--visible');
    setTimeout(() => {
      overlayEl?.remove();
      overlayEl = null;
    }, 300);
  }
  activeTips = [];
  activeIndex = 0;
}

/**
 * Start the tutorial — shows unseen tips one at a time.
 * Call after the OS shell has rendered.
 */
export function startTutorial() {
  if (!isTutorialEnabled()) return;

  const unseen = getUnseenTips();
  if (unseen.length === 0) return;

  activeTips = unseen;
  activeIndex = 0;

  // Small delay so the shell has time to fully render
  setTimeout(() => renderTooltip(), 600);
}

/**
 * Get a formatted list of all tips for the settings overview.
 */
export function getTipsList() {
  return TIPS.map(t => ({ id: t.id, title: t.title, text: t.text }));
}
