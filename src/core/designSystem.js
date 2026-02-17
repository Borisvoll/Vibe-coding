export const designTokens = {
  typography: {
    fontSans: 'system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  },
  color: {
    background: '#f6f7f8',
    surface: '#ffffff',
    text: '#111827',
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
    sm: '6px',
    md: '10px',
    lg: '14px',
  },
  motion: {
    calm: '180ms ease',
  },
};

export function applyDesignTokens(root = document.documentElement) {
  if (!root || !root.style) return;

  root.style.setProperty('--font-sans', designTokens.typography.fontSans);
  root.style.setProperty('--color-bg', designTokens.color.background);
  root.style.setProperty('--color-surface', designTokens.color.surface);
  root.style.setProperty('--color-text', designTokens.color.text);
  root.style.setProperty('--color-border', designTokens.color.border);
  root.style.setProperty('--color-border-light', designTokens.color.divider);

  root.style.setProperty('--space-1', designTokens.spacing.xs);
  root.style.setProperty('--space-2', designTokens.spacing.sm);
  root.style.setProperty('--space-3', designTokens.spacing.md);
  root.style.setProperty('--space-4', designTokens.spacing.lg);
  root.style.setProperty('--space-6', designTokens.spacing.xl);

  root.style.setProperty('--radius-sm', designTokens.radius.sm);
  root.style.setProperty('--radius-md', designTokens.radius.md);
  root.style.setProperty('--radius-lg', designTokens.radius.lg);

  root.style.setProperty('--duration-fast', designTokens.motion.calm.split(' ')[0]);
  root.style.setProperty('--duration', designTokens.motion.calm.split(' ')[0]);
}
