/**
 * BORIS OS — Design System
 * Central design token provider.
 * Blocks consume tokens — they must NOT define arbitrary design values.
 *
 * Inspired by: Apple (clarity), Dieter Rams (less but better), Brian Eno (ambient calm).
 */

export const SPACING = {
  xs: 'var(--space-1)',    // 0.25rem
  sm: 'var(--space-2)',    // 0.5rem
  md: 'var(--space-4)',    // 1rem
  lg: 'var(--space-6)',    // 1.5rem
  xl: 'var(--space-8)',    // 2rem
  xxl: 'var(--space-12)',  // 3rem
};

export const TYPOGRAPHY = {
  h1: { size: '1.75rem', weight: '700', lineHeight: '1.2' },
  h2: { size: '1.375rem', weight: '600', lineHeight: '1.3' },
  h3: { size: '1.125rem', weight: '600', lineHeight: '1.4' },
  body: { size: '0.9375rem', weight: '400', lineHeight: '1.6' },
  small: { size: '0.8125rem', weight: '400', lineHeight: '1.5' },
  caption: { size: '0.75rem', weight: '400', lineHeight: '1.4' },
  mono: { size: '0.8125rem', weight: '400', lineHeight: '1.5', family: 'var(--font-mono)' },
};

export const COLORS = {
  text: 'var(--color-text)',
  textSecondary: 'var(--color-text-secondary)',
  textTertiary: 'var(--color-text-tertiary)',
  bg: 'var(--color-bg)',
  surface: 'var(--color-surface)',
  surfaceHover: 'var(--color-surface-hover)',
  border: 'var(--color-border)',
  borderLight: 'var(--color-border-light)',
  accent: 'var(--color-accent)',
  accentLight: 'var(--color-accent-light)',
  success: 'var(--color-success)',
  warning: 'var(--color-warning)',
  error: 'var(--color-error)',
};

export const MODE_COLORS = {
  bpv: { accent: 'var(--color-blue)', bg: 'var(--color-blue-light)' },
  school: { accent: 'var(--color-purple)', bg: 'var(--color-purple-light)' },
  personal: { accent: 'var(--color-teal)', bg: 'var(--color-teal-light)' },
};

// Helper to create a card HTML string with consistent styling
export function card(content, { clickable = false, color = '', className = '' } = {}) {
  const classes = ['card', className, clickable ? 'card-clickable' : '', color ? 'card-color-left' : ''].filter(Boolean).join(' ');
  const style = color ? `--card-color: ${color}` : '';
  return `<div class="${classes}" ${style ? `style="${style}"` : ''}>${content}</div>`;
}

// Helper to create a stat card
export function statCard(value, label, { color = 'var(--color-accent)', hint = '', bar = null } = {}) {
  return `
    <div class="card stat-card" style="--stat-color: ${color}">
      <div class="stat-value" style="color: ${color}">${value}</div>
      <div class="stat-label">${label}</div>
      ${bar !== null ? `
        <div class="progress-bar" style="margin-top: var(--space-3)">
          <div class="progress-bar-fill" style="width: ${Math.min(100, bar)}%; background: ${color}"></div>
        </div>
      ` : ''}
      ${hint ? `<div class="form-hint" style="margin-top: var(--space-1)">${hint}</div>` : ''}
    </div>
  `;
}

// Helper to create a section with header
export function section(title, content, { icon = '', badge = '', badgeClass = '' } = {}) {
  return `
    <div class="hub-section">
      <div class="hub-section-header">
        <h3>${icon}${title}</h3>
        ${badge ? `<span class="hub-section-badge ${badgeClass}">${badge}</span>` : ''}
      </div>
      ${content}
    </div>
  `;
}

// Empty state helper
export function emptyState(title, description, { icon: iconHtml = '', action = '' } = {}) {
  return `
    <div class="empty-state">
      ${iconHtml ? `<div class="empty-state-icon">${iconHtml}</div>` : ''}
      <h3>${title}</h3>
      <p>${description}</p>
      ${action}
    </div>
  `;
}
