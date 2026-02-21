# Theme Studio — Current State Audit

> Date: 2026-02-21
> Status: Phase 1 exploration (no code changes yet)

---

## Architecture Overview

The theme system is a zero-dependency vanilla JS implementation using native CSS custom properties as the single source of truth. No Tailwind, no PostCSS — browser-native `var()` cascading.

### Token Layers

```
variables.css          (base tokens: --color-*, --font-*, --space-*, --shadow-*)
    |
tokens.css             (semantic aliases: --ui-surface, --ui-text, --accent-soft, etc.)
    |
themeEngine.js         (runtime: computes derived tokens, applies to <html> style)
    |
block styles           (28+ CSS files consume tokens via var())
```

---

## Key Files

| File | Role |
|------|------|
| `src/styles/variables.css` | Base CSS custom properties (light + dark mode) |
| `src/ui/tokens.css` | Semantic UI-level aliases mapping to variables |
| `src/core/themeEngine.js` | Theme engine: presets, color math, persistence, WCAG checks |
| `src/ui/theme-studio.js` | Theme Studio UI component |
| `src/ui/theme-studio.css` | Theme Studio styling (406 lines) |
| `src/core/designSystem.js` | Minimal — typography tokens only |
| `src/blocks/settings-panel.js` | Settings page that hosts Theme Studio |
| `src/constants.js` | Legacy ACCENT_COLORS array |
| `src/db.js` | IndexedDB persistence (getSetting / setSetting) |
| `src/main.js` | Startup: loads theme via initTheme() |

---

## Token Definitions

### Base Tokens (`variables.css`)

**Light mode:**
- `--color-accent`: #4f6ef7
- `--color-bg`: #f6f7f8
- `--color-surface`: #ffffff
- `--color-text`: #1f1f1f
- `--color-text-secondary`: #6b6b6b
- `--color-text-tertiary`: #9b9b9b
- `--color-border`: #e5e7eb
- `--color-success`, `--color-error`, `--color-warning`

**Dark mode** (via `@media (prefers-color-scheme: dark)` and `[data-theme="dark"]`):
- Inverted values for all color tokens.

### Semantic Aliases (`tokens.css`)

- `--ui-surface`, `--ui-bg`, `--ui-border`, `--ui-text`, `--ui-text-muted`
- `--ui-accent` (inherits from `--mode-accent` or falls back to `--color-accent`)
- Dynamically derived by themeEngine: `--accent-soft`, `--accent-soft-2`, `--accent-border`, `--accent-shadow`, `--gradient-primary`

---

## Preset System

**5 presets** defined in `themeEngine.js` as `THEME_PRESETS`:

| Key | Label | Accent | Tint | Shadow |
|-----|-------|--------|------|--------|
| `default` | Standaard | #4f6ef7 | 50 | 50 |
| `calm` | Rustig | #6366f1 | 30 | 30 |
| `contrast` | Hoog Contrast | #2563eb | 70 | 70 |
| `midnight` | Middernacht | #8b5cf6 | 40 | 40 |
| `warm` | Warm | #f97316 | 45 | 45 |

Presets only set `accent`, `tintStrength`, and `shadowStrength`. All other fields (appBg, blockBg, blockFg, etc.) remain `null` — meaning CSS defaults are used.

---

## Theme Object Shape

```javascript
{
  accent: '#4f6ef7',     // Primary accent hex
  appBg: null,           // Override --color-bg (null = CSS default)
  blockBg: null,         // Override --color-surface
  blockFg: null,         // Override --color-text
  mutedFg: null,         // Override --color-text-secondary
  blockBorder: null,     // Override --color-border
  danger: null,          // Override --color-error
  success: null,         // Override --color-success
  tintStrength: 50,      // 0-100: accent tint opacity
  shadowStrength: 50,    // 0-100: shadow opacity
}
```

---

## Persistence

- **Primary:** IndexedDB `settings` store, key `boris_theme` (full theme object)
- **Legacy compat:** IndexedDB `settings` store, key `accentColor` (string ID like 'blue')
- **Migration:** `initTheme()` checks `boris_theme` first; if absent, reads legacy `accentColor` and converts

---

## Color Change Flow

```
User interaction (Theme Studio UI)
    |
    v
setTheme({ accent: '#xyz', ... })   — merges partial with current theme
    |
    v
applyTheme(currentTheme)            — computes derived tokens via HSL math
    |
    +--> document.documentElement.style.setProperty('--color-accent', ...)
    +--> document.documentElement.style.setProperty('--accent-soft', ...)
    +--> (... 10+ token properties set on <html>)
    |
    v
setSetting('boris_theme', theme)     — persists to IndexedDB
    |
    v
Browser repaints (all var() consumers update)
```

---

## Theme Studio UI Sections

1. **Presets** — 5 buttons, one per preset
2. **Quick Accent Colors** — 8 color dots (blue, purple, green, rose, orange, cyan, indigo, teal)
3. **Color Controls** — 2-column grid with `<input type="color">`:
   - accent, appBg, blockBg, blockFg, mutedFg, blockBorder, danger, success
4. **Advanced** (collapsible): tintStrength slider, shadowStrength slider
5. **Live Preview** — example card, button, badge, progress bar
6. **Contrast Warnings** — WCAG AA checks (text/bg, muted/bg)
7. **Actions** — Reset, Export JSON, Import JSON

---

## Color Utilities (themeEngine.js)

| Function | Purpose |
|----------|---------|
| `hexToHSL(hex)` | Hex to {h, s, l} |
| `hslToHex(h, s, l)` | HSL to hex |
| `relativeLuminance(hex)` | WCAG luminance (0-1) |
| `contrastRatio(hex1, hex2)` | WCAG contrast ratio |
| `isDark(hex)` | Luminance < 0.179 |
| `checkContrast(theme)` | Returns array of WCAG warnings |

---

## Dark Mode Handling

- Detection: `[data-theme="dark"]` attribute on `<html>`, fallback to `prefers-color-scheme`
- `applyTheme()` adjusts accent derivations for dark mode (different alpha ranges, lighter HSL values)
- Base dark tokens defined in both `variables.css` and `tokens.css`

---

## Backwards Compatibility

- Old system: single `accentColor` ID string
- New system: full `boris_theme` object
- `initTheme()` migrates old format on first load
- `setTheme()` syncs both `boris_theme` and `accentColor` for legacy code paths
