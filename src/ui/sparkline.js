/**
 * Tiny 4-week sparkline — pure inline SVG, no dependencies.
 *
 * @param {number[]} weeklyActivity — 4 numbers [w-3, w-2, w-1, w0]
 * @param {{ isStalled?: boolean }} [opts]
 * @returns {string} SVG markup string
 */
export function renderSparkline(weeklyActivity = [0, 0, 0, 0], { isStalled = false } = {}) {
  const W = 48;
  const H = 20;
  const BAR_W = 10;
  const GAP = 2;
  const MAX_BAR_H = 18;
  const MIN_BAR_H = 1;

  const max = Math.max(...weeklyActivity, 1); // avoid division by zero
  const barColor = isStalled ? 'var(--color-warning)' : 'var(--color-accent)';
  const emptyColor = 'var(--color-border)';

  const bars = weeklyActivity.map((val, i) => {
    const h = val > 0 ? Math.max(MIN_BAR_H, Math.round((val / max) * MAX_BAR_H)) : MIN_BAR_H;
    const x = i * (BAR_W + GAP);
    const y = H - h;
    const color = val > 0 ? barColor : emptyColor;
    return `<rect x="${x}" y="${y}" width="${BAR_W}" height="${h}" rx="1.5" fill="${color}"/>`;
  }).join('');

  return `<svg class="momentum-spark" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" aria-hidden="true">${bars}</svg>`;
}
