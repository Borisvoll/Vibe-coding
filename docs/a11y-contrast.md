# Accessibility — Contrast Guidelines

> Updated: 2026-02-21

---

## Target

**WCAG AA (4.5:1)** for normal text, **3:1** for large text (18px+ or 14px bold).

---

## Changes Made

### Brain-State Block (`src/blocks/brain-state/`)

**Problem:** The "Hoe voelt je hoofd" action text used `var(--color-text)` on hardcoded pastel backgrounds. In light mode, orange state contrast was ~3.8:1 (below AA). In dark mode, light text on light backgrounds was unreadable.

**Fix:**

1. Added dedicated `actionText` color per state — dark, high-contrast values guaranteed to pass 4.5:1 on their respective light backgrounds:

   | State | Background | Action Text | Contrast Ratio |
   |-------|-----------|-------------|----------------|
   | Green | `#d1fae5` | `#065f46` | ~7.2:1 |
   | Orange | `#fef3c7` | `#78350f` | ~7.8:1 |
   | Red | `#fee2e2` | `#991b1b` | ~6.5:1 |

2. Added dark-mode overrides with inverted backgrounds (`colorLightDark`) and borders (`colorDark`):

   | State | Dark BG | Dark Border | Text |
   |-------|---------|-------------|------|
   | Green | `#0d3026` | `#064e3b` | `--color-text` (light) |
   | Orange | `#3b2308` | `#92400e` | `--color-text` (light) |
   | Red | `#3b1010` | `#991b1b` | `--color-text` (light) |

3. Dark mode handled via both `[data-theme="dark"]` selector and `@media (prefers-color-scheme: dark)` with `:not([data-theme="light"])` guard.

**Files changed:**
- `src/blocks/brain-state/view.js` — added `actionText`, `colorDark`, `colorLightDark` per state
- `src/blocks/brain-state/styles.css` — use `--action-text` for text color, added dark-mode rules

---

## Principles

1. **Token-first:** Prefer theme tokens (`--color-text`, `--color-surface`) over hardcoded hex. When a component needs colors outside the token system (like state-specific pastels), use inline CSS custom properties and validate contrast.

2. **Dark-mode parity:** Every light-mode color combination must have a dark-mode equivalent. Never leave light backgrounds unhandled in dark mode.

3. **Minimum 4.5:1:** All text/background pairs must meet WCAG AA. Use darker tones of the same hue family for text on pastel backgrounds (e.g., emerald-900 on emerald-100).

4. **Validate on change:** When modifying any color token or component color, check contrast against its background. The Theme Studio's `checkContrast()` function provides WCAG ratio calculations.
