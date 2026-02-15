function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function playBootSound() {
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return;

  const ctx = new AudioCtx();

  try {
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }

    const now = ctx.currentTime;
    const duration = 1.7;

    const master = ctx.createGain();
    master.gain.setValueAtTime(0.0001, now);
    master.gain.exponentialRampToValueAtTime(0.06, now + 0.35);
    master.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    master.connect(ctx.destination);

    const pad = [196.0, 246.94, 293.66];
    pad.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      osc.type = i === 1 ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(freq, now);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1200 - i * 180, now);
      filter.Q.setValueAtTime(0.5, now);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.025, now + 0.45 + i * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(master);

      osc.start(now + i * 0.03);
      osc.stop(now + duration + 0.05);
    });

    const shimmer = ctx.createOscillator();
    const shimmerGain = ctx.createGain();
    shimmer.type = 'sine';
    shimmer.frequency.setValueAtTime(880, now + 0.25);
    shimmer.frequency.exponentialRampToValueAtTime(660, now + duration);
    shimmerGain.gain.setValueAtTime(0.0001, now);
    shimmerGain.gain.exponentialRampToValueAtTime(0.012, now + 0.5);
    shimmerGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    shimmer.connect(shimmerGain);
    shimmerGain.connect(master);
    shimmer.start(now + 0.2);
    shimmer.stop(now + duration + 0.05);

    await wait((duration + 0.1) * 1000);
  } finally {
    await ctx.close().catch(() => {});
  }
}

export async function runBootSequence() {
  const overlay = document.createElement('div');
  overlay.className = 'boot-overlay';
  overlay.innerHTML = `
    <div class="boot-logo-wrap" aria-hidden="true">
      <svg class="boot-logo" viewBox="0 0 180 180" role="img" aria-label="Stage logo">
        <g class="boot-nut" transform="translate(90 90)">
          <polygon points="0,-62 53,-31 53,31 0,62 -53,31 -53,-31" />
          <circle cx="0" cy="0" r="30" />
        </g>
        <g class="boot-bolt" transform="translate(90 90)">
          <rect x="-9" y="-70" width="18" height="140" rx="7" />
          <rect x="-18" y="-86" width="36" height="24" rx="8" />
        </g>
      </svg>
      <div class="boot-wordmark">STAGE</div>
    </div>
  `;

  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('boot-overlay--visible'));

  try {
    await playBootSound();
  } catch {
    // Audio may be blocked by autoplay policy; animation still runs.
  }

  await wait(1450);
  overlay.classList.add('boot-overlay--exit');
  await wait(420);
  overlay.remove();
}
