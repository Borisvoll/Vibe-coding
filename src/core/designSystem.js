export const designTokens = {
  typography: {
    fontSans: 'system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    fontSizeBase: '16px',
  },
};

/**
 * Apply only font tokens that have no CSS-attribute-selector overrides.
 *
 * ALL other tokens (colors, spacing, radius, motion) live exclusively in
 * variables.css.  Setting them as inline styles here would override
 * [data-theme="dark"] and [data-compact="true"] selectors, permanently
 * breaking dark mode and compact mode.  Do NOT add them back.
 */
export function applyDesignTokens(root = document.documentElement) {
  if (!root || !root.style) return;
  root.style.setProperty('--font-sans', designTokens.typography.fontSans);
  root.style.setProperty('--font-size-base', designTokens.typography.fontSizeBase);
}
