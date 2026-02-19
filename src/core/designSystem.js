export const designTokens = {
  typography: {
    fontSans: 'system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    fontSizeBase: '16px',
  },
  color: {
    background: '#f6f7f8',
    surface: '#ffffff',
    text: '#1f1f1f',
    border: '#e5e7eb',
    divider: '#eceff3',
  },
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '24px',
  },
  radius: {
    sm: '4px',
    md: '8px',
    lg: '12px',
  },
  motion: {
    fast: '180ms',
    calm: '300ms',
  },
};

export function applyDesignTokens(root = document.documentElement) {
  if (!root || !root.style) return;

  root.style.setProperty('--font-sans', designTokens.typography.fontSans);
  root.style.setProperty('--font-size-base', designTokens.typography.fontSizeBase);

  // NOTE: Color variables are intentionally NOT set here as inline styles.
  // Inline styles override CSS attribute selectors like [data-theme="dark"],
  // which would permanently break theme switching. Colors live in variables.css.

  root.style.setProperty('--space-1', designTokens.spacing.xs);
  root.style.setProperty('--space-2', designTokens.spacing.sm);
  root.style.setProperty('--space-3', designTokens.spacing.md);
  root.style.setProperty('--space-4', designTokens.spacing.lg);
  root.style.setProperty('--space-6', designTokens.spacing.xl);

  root.style.setProperty('--radius-sm', designTokens.radius.sm);
  root.style.setProperty('--radius-md', designTokens.radius.md);
  root.style.setProperty('--radius-lg', designTokens.radius.lg);

  root.style.setProperty('--duration-fast', designTokens.motion.fast);
  root.style.setProperty('--duration', designTokens.motion.fast);
  root.style.setProperty('--duration-slow', designTokens.motion.calm);
}
