# Theme Studio — Current State Audit

## Architecture Overview

The theming system spans 4 layers: CSS base tokens, semantic aliases, a JS theme engine, and a UI studio.

```
User interaction (Theme Studio UI)
        │
        ▼
  themeEngine.js  ─── setTheme(partial) ── persists to IndexedDB
        │
        ▼
  CSS custom properties on :root  ← inline style overrides
        │
        ▼
  tokens.css (semantic aliases)  ← resolved at paint time
        │
        ▼
  variables.css (base palette)   ← light/dark defaults
```

---

## File Inventory

| File | Purpose | Lines |
|------|---------|-------|
| `src/styles/variables.css` | Base CSS tokens (light + dark mode) | 214 |
| `src/ui/tokens.css` | Semantic aliases (`--ui-*` → `--color-*`) | 80 |
| `src/core/themeEngine.js` | Theme logic, presets, color math, persistence | 272 |
| `src/ui/theme-studio.js` | Theme Studio UI component | 314 |
| `src/ui/theme-studio.css` | Theme Studio styles | 406 |
| `src/core/designSystem.js` | Minimal: font tokens only | ~20 |
| `src/constants.js` | `ACCENT_COLORS` list (8 quick-pick colors) | exports |
| `src/os/shell.js` | `MODE_META` — hardcoded mode colors | lines 15-37 |

---

## Token Flow

### Base Tokens (`variables.css :root`)

Light mode defaults, overridden in `@media (prefers-color-scheme: dark)` and `[data-theme="dark"]`.

Key tokens:
- `--color-bg`, `--color-surface`, `--color-text`, `--color-text-secondary`, `--color-text-tertiary`
- `--color-border`, `--color-accent`, `--color-accent-hover`, `--color-accent-light`, `--color-accent-text`
- Module colors: `--color-blue`, `--color-purple`, `--color-emerald` (+ `-light` variants)
- Semantic: `--color-success`, `--color-warning`, `--color-error`

### Semantic Aliases (`tokens.css`)

Maps raw tokens to UI-meaningful names:
- `--ui-surface` → `var(--color-surface)`
- `--ui-text` → `var(--color-text)`
- `--ui-accent` → `var(--mode-accent, var(--color-accent))`
- `--accent-soft`, `--accent-soft-2`, `--accent-border`, `--accent-shadow` (CSS fallbacks, overridden by themeEngine.js)

### Theme Engine (`themeEngine.js`)

**DEFAULT_THEME object:**
```javascript
{
  accent: '#4f6ef7',
  appBg: null,        // null = use CSS default
  blockBg: null,
  blockFg: null,
  mutedFg: null,
  blockBorder: null,
  danger: null,
  success: null,
  tintStrength: 50,   // 0-100
  shadowStrength: 50,  // 0-100
}
```

**Color helpers (zero-dep):**
- `hexToHSL(hex)`, `hslToHex(h, s, l)` — conversion
- `relativeLuminance(hex)` — WCAG luminance
- `contrastRatio(hex1, hex2)` — WCAG ratio
- `isDark(hex)` — luminance < 0.179

**Derived tokens computed in `applyTheme()`:**
- `--color-accent-hover` — 8% darker
- `--color-accent-text` — white or dark based on luminance
- `--accent-soft` — 8-20% opacity (controlled by tintStrength)
- `--accent-soft-2` — 4-12% opacity
- `--accent-border` — 15-40% opacity
- `--accent-shadow` — 5-20% opacity shadow
- `--gradient-primary` — 135deg gradient
- `--color-accent-light` — computed differently for light/dark mode

**Optional overrides (null = keep CSS default):**
- `--color-bg` ← `appBg`
- `--color-surface` ← `blockBg`
- `--color-text` ← `blockFg`
- `--color-text-secondary` ← `mutedFg`
- `--color-border` ← `blockBorder`
- `--color-error` ← `danger`
- `--color-success` ← `success`

---

## Theme Presets

5 built-in presets (partial merges over DEFAULT_THEME):

| ID | Label | Accent | Tint | Shadow |
|----|-------|--------|------|--------|
| `default` | Standaard | #4f6ef7 (blue) | 50 | 50 |
| `calm` | Rustig | #6366f1 (indigo) | 30 | 30 |
| `contrast` | Hoog Contrast | #2563eb (dark blue) | 70 | 70 |
| `midnight` | Middernacht | #8b5cf6 (purple) | 40 | 40 |
| `warm` | Warm | #f97316 (orange) | 45 | 45 |

Presets only set `accent`, `tintStrength`, and `shadowStrength`. All other values remain `null` (CSS defaults).

---

## Theme Studio UI (`theme-studio.js`)

Layout:
1. **Presets** — 5 buttons
2. **Quick accent colors** — 8 dot buttons from `ACCENT_COLORS`
3. **Color controls** — 8 color pickers in grid (accent, appBg, blockBg, blockFg, mutedFg, blockBorder, danger, success)
4. **Advanced toggle** — tintStrength + shadowStrength sliders
5. **Live preview** — example card, button, badge, progress, success/error labels
6. **Warnings** — contrast ratio warnings
7. **Actions** — reset, export JSON, import JSON

---

## Persistence

- **Primary:** IndexedDB key `boris_theme` (full theme object)
- **Legacy compat:** `accentColor` setting (string like `'blue'`)
- **Migration:** `initTheme()` reads old `accentColor`, creates full theme if needed
- **Startup flow:** `main.js` → `applyUserSettings()` → `initTheme()` → `applyTheme()`

---

## Mode Color System (separate from Theme Studio)

Mode colors are hardcoded in `src/os/shell.js`:
```
School:   --color-purple  / --color-purple-light
Personal: --color-emerald / --color-emerald-light
BPV:      --color-blue    / --color-blue-light
```

Applied as `--mode-color` and `--mode-color-light` on mode button. Also used as `--mode-card-border` for card accents. Mode colors are NOT customizable via Theme Studio.

---

## Contrast Checking

`checkContrast(theme)` in themeEngine.js:
- Only validates `blockBg` vs `blockFg` (ratio < 4.5) and `blockBg` vs `mutedFg` (ratio < 3)
- Only triggers when BOTH custom values are set (null values skip checks)
- Returns warning objects with field, ratio, message
- Displayed in Theme Studio warnings section
