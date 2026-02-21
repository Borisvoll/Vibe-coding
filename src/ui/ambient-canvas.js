/**
 * Ambient Canvas — Brian Eno-inspired generative audio/visual empty state
 *
 * When a space is empty, instead of a blank void, BORIS renders a living canvas:
 * - Slowly drifting particles on a dark canvas
 * - Touch/click generates pentatonic ambient tones (like Bloom)
 * - Each interaction spawns a ripple and a tone that fades over 4–8 seconds
 * - Silent by default; first interaction activates audio (browser policy)
 *
 * Usage:
 *   const ambient = createAmbientCanvas({ label: 'Geen taken voor nu' });
 *   container.appendChild(ambient.el);
 *   // ambient.destroy() to clean up
 */

// Pentatonic scale in Hz — harmonious regardless of combination order
const PENTATONIC = [
  261.63, // C4
  293.66, // D4
  329.63, // E4
  392.00, // G4
  440.00, // A4
  523.25, // C5
  587.33, // D5
  659.25, // E5
  783.99, // G5
  880.00, // A5
];

let sharedAudioCtx = null;

function getAudioContext() {
  if (!sharedAudioCtx || sharedAudioCtx.state === 'closed') {
    try {
      sharedAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
    } catch {
      return null;
    }
  }
  if (sharedAudioCtx.state === 'suspended') {
    sharedAudioCtx.resume().catch(() => {});
  }
  return sharedAudioCtx;
}

function playTone(freq, ctx) {
  if (!ctx) return;
  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const reverb = ctx.createConvolver();

    // Soft sine wave — Eno uses pure tones
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);
    // Slight pitch drift for organic feel
    osc.frequency.linearRampToValueAtTime(freq * 1.002, now + 6);

    // Envelope: quick attack, long fade
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.18, now + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 7);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 7.5);
  } catch { /* audio not available */ }
}

export function createAmbientCanvas({ label = 'Leeg', sublabel = 'Raak aan voor geluid' } = {}) {
  // ── DOM structure ──────────────────────────────────────────
  const el = document.createElement('div');
  el.className = 'ambient-empty';
  el.setAttribute('role', 'img');
  el.setAttribute('aria-label', `${label} — generatieve omgevingssimulatie`);

  const canvas = document.createElement('canvas');
  canvas.className = 'ambient-empty__canvas';

  const labelEl = document.createElement('div');
  labelEl.className = 'ambient-empty__label';
  labelEl.innerHTML = `
    <span class="ambient-empty__title">${label}</span>
    <span class="ambient-empty__hint">${sublabel}</span>
  `;

  el.appendChild(canvas);
  el.appendChild(labelEl);

  // ── Canvas renderer ────────────────────────────────────────
  let animFrame = null;
  let particles = [];
  let ripples = [];
  let audioEnabled = false;

  const PARTICLE_COUNT = 40;

  function createParticle(w, h) {
    return {
      x: Math.random() * w,
      y: Math.random() * h,
      r: Math.random() * 2 + 0.5,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      opacity: Math.random() * 0.4 + 0.1,
      hue: Math.random() * 60 + 200, // blue-purple range
    };
  }

  function createRipple(x, y) {
    return { x, y, r: 0, maxR: 80 + Math.random() * 60, opacity: 0.6, speed: 1.5 };
  }

  function resize() {
    const dpr = window.devicePixelRatio || 1;
    const rect = el.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';
    const ctx2d = canvas.getContext('2d');
    ctx2d.scale(dpr, dpr);

    // Repopulate particles on resize
    particles = Array.from({ length: PARTICLE_COUNT }, () =>
      createParticle(rect.width, rect.height)
    );
  }

  function draw() {
    const ctx2d = canvas.getContext('2d');
    if (!ctx2d) return;

    const w = el.getBoundingClientRect().width;
    const h = el.getBoundingClientRect().height;
    if (w === 0 || h === 0) { animFrame = requestAnimationFrame(draw); return; }

    // Dark ambient background
    const isDark = document.documentElement.dataset.theme === 'dark' ||
      (!document.documentElement.dataset.theme &&
       window.matchMedia('(prefers-color-scheme: dark)').matches);

    ctx2d.fillStyle = isDark ? 'rgba(25, 25, 30, 0.15)' : 'rgba(246, 247, 248, 0.15)';
    ctx2d.fillRect(0, 0, w, h);

    // Draw ripples
    ripples = ripples.filter(rip => rip.opacity > 0.01);
    ripples.forEach(rip => {
      rip.r += rip.speed;
      rip.opacity *= 0.975;
      rip.speed *= 0.99;

      ctx2d.beginPath();
      ctx2d.arc(rip.x, rip.y, rip.r, 0, Math.PI * 2);
      ctx2d.strokeStyle = isDark
        ? `hsla(220, 60%, 70%, ${rip.opacity})`
        : `hsla(220, 60%, 50%, ${rip.opacity})`;
      ctx2d.lineWidth = 1;
      ctx2d.stroke();
    });

    // Draw and update particles
    particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;

      // Wrap around edges
      if (p.x < 0) p.x = w;
      if (p.x > w) p.x = 0;
      if (p.y < 0) p.y = h;
      if (p.y > h) p.y = 0;

      // Gentle opacity pulse
      p.opacity += (Math.random() - 0.5) * 0.01;
      p.opacity = Math.max(0.05, Math.min(0.5, p.opacity));

      ctx2d.beginPath();
      ctx2d.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx2d.fillStyle = isDark
        ? `hsla(${p.hue}, 50%, 70%, ${p.opacity})`
        : `hsla(${p.hue}, 50%, 40%, ${p.opacity})`;
      ctx2d.fill();
    });

    animFrame = requestAnimationFrame(draw);
  }

  // ── Interaction handler ────────────────────────────────────
  function onInteract(e) {
    const rect = el.getBoundingClientRect();
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;

    // Ripple at touch point
    ripples.push(createRipple(x, y));

    // Also spawn a smaller second ripple slightly delayed
    setTimeout(() => {
      if (ripples.length < 20) ripples.push(createRipple(x + 5, y + 5));
    }, 120);

    // Audio
    if (!audioEnabled) {
      audioEnabled = true;
      const hint = el.querySelector('.ambient-empty__hint');
      if (hint) {
        hint.textContent = 'Blijf raken voor meer tonen';
        setTimeout(() => { if (hint) hint.style.opacity = '0'; }, 3000);
      }
    }

    const ctx = getAudioContext();
    const freq = PENTATONIC[Math.floor(Math.random() * PENTATONIC.length)];
    playTone(freq, ctx);

    // Sometimes play a harmony a fifth above
    if (Math.random() > 0.6) {
      setTimeout(() => {
        const ctx2 = getAudioContext();
        playTone(freq * 1.5, ctx2);
      }, 300 + Math.random() * 400);
    }
  }

  // ── Lifecycle ──────────────────────────────────────────────
  function start() {
    resize();
    draw();
    el.addEventListener('click', onInteract);
    el.addEventListener('touchstart', onInteract, { passive: true });
  }

  const resizeObserver = new ResizeObserver(() => {
    resize();
  });

  // Start when added to DOM
  const mutationObs = new MutationObserver(() => {
    if (el.isConnected) {
      mutationObs.disconnect();
      resizeObserver.observe(el);
      start();
    }
  });
  mutationObs.observe(document.body, { childList: true, subtree: true });

  return {
    el,
    destroy() {
      if (animFrame) cancelAnimationFrame(animFrame);
      resizeObserver.disconnect();
      mutationObs.disconnect();
      el.removeEventListener('click', onInteract);
      el.removeEventListener('touchstart', onInteract);
      el.remove();
    },
  };
}

/**
 * Replace empty host placeholder text with the ambient canvas.
 * Call after renderHosts() to enhance all empty slots.
 */
export function enhanceEmptyHosts(container) {
  const destroyed = [];
  container.querySelectorAll('.os-host-empty').forEach(placeholder => {
    const host = placeholder.parentElement;
    if (!host) return;
    placeholder.remove();
    const ambient = createAmbientCanvas({ label: 'Niets hier', sublabel: 'Tik voor omgevingsgeluid' });
    host.appendChild(ambient.el);
    destroyed.push(ambient);
  });
  return () => destroyed.forEach(a => a.destroy());
}
