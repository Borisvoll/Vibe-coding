# Tailwind Guidelines

> Opinionated rules for using Tailwind in BORIS. The goal is calm consistency,
> not framework mastery. When in doubt: fewer classes, more meaning.

---

## Setup

```javascript
// tailwind.config.js  (to be created)
export default {
  content: ['./index.html', './src/**/*.js'],
  darkMode: ['selector', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        // Page structure
        base:          'var(--color-bg)',
        surface:       'var(--color-surface)',
        'surface-hover': 'var(--color-surface-hover)',
        // Text
        'text-base':   'var(--color-text)',
        muted:         'var(--color-text-secondary)',
        faint:         'var(--color-text-tertiary)',
        // Borders
        border:        'var(--color-border)',
        'border-light':'var(--color-border-light)',
        // Accent (dynamic — set by ThemeEngine at runtime)
        accent:        'var(--color-accent)',
        'accent-hover':'var(--color-accent-hover)',
        'accent-light':'var(--color-accent-light)',
        'accent-text': 'var(--color-accent-text)',
        // Status
        success:       'var(--color-success)',
        'success-light':'var(--color-success-light)',
        warning:       'var(--color-warning)',
        'warning-light':'var(--color-warning-light)',
        danger:        'var(--color-error)',
        'danger-light':'var(--color-error-light)',
        // Mode colors (for mode-specific UI only)
        purple:        'var(--color-purple)',
        'purple-light':'var(--color-purple-light)',
        emerald:       'var(--color-emerald)',
        'emerald-light':'var(--color-emerald-light)',
        blue:          'var(--color-blue)',
        'blue-light':  'var(--color-blue-light)',
      },
      fontSize: {
        xs:    ['var(--font-xs)',   { lineHeight: '1.4' }],
        sm:    ['var(--font-sm)',   { lineHeight: '1.4' }],
        base:  ['var(--font-base)', { lineHeight: '1.5' }],
        md:    ['var(--font-md)',   { lineHeight: '1.5' }],
        lg:    ['var(--font-lg)',   { lineHeight: '1.4' }],
        xl:    ['var(--font-xl)',   { lineHeight: '1.3' }],
        '2xl': ['var(--font-2xl)', { lineHeight: '1.2' }],
        '3xl': ['var(--font-3xl)', { lineHeight: '1.1' }],
        stat:  ['var(--font-stat)', { lineHeight: '1.0' }],
      },
      spacing: {
        0.5: 'var(--space-0)',
        1:   'var(--space-1)',
        2:   'var(--space-2)',
        3:   'var(--space-3)',
        4:   'var(--space-4)',
        5:   'var(--space-5)',
        6:   'var(--space-6)',
        8:   'var(--space-8)',
        10:  'var(--space-10)',
        12:  'var(--space-12)',
        16:  'var(--space-16)',
      },
      borderRadius: {
        sm:   'var(--radius-sm)',
        md:   'var(--radius-md)',
        lg:   'var(--radius-lg)',
        xl:   'var(--radius-xl)',
        full: 'var(--radius-full)',
      },
      boxShadow: {
        sm:    'var(--shadow-sm)',
        md:    'var(--shadow-md)',
        lg:    'var(--shadow-lg)',
        color: 'var(--shadow-color)',
      },
      transitionDuration: {
        fast:  'var(--duration-fast)',
        base:  'var(--duration)',
        slow:  'var(--duration-slow)',
        page:  'var(--duration-page)',
      },
    },
  },
};
```

**Dark mode note:** `darkMode: ['selector', '[data-theme="dark"]']` matches the
attribute set by `themeEngine.js`. For system preference, `variables.css` already
handles this via `@media (prefers-color-scheme: dark)`. Tailwind dark: utilities
only activate on manual `[data-theme="dark"]` — CSS vars handle the system fallback.
This means Tailwind `dark:` variants are only needed when overriding a value that
does NOT resolve through a CSS var.

---

## The Golden Rules

### 1. CSS vars first, Tailwind second

The design system lives in `variables.css`. Tailwind is a delivery mechanism,
not the source. If a token changes, update `variables.css` — Tailwind picks it up
automatically.

```javascript
// GOOD — resolves to CSS var, inherits dark mode automatically
`text-muted`

// BAD — hardcoded, breaks dark mode
`text-[#6b6b6b]`
```

### 2. Never use arbitrary values for design tokens

```javascript
// GOOD
`p-5 rounded-lg shadow-sm`

// BAD — bypasses the token system
`p-[20px] rounded-[12px] shadow-[0_1px_2px_rgba(0,0,0,.04)]`
```

Arbitrary values are acceptable for one-off layout measurements (e.g.
`w-[240px]` for a fixed sidebar) but never for typography, color, spacing,
or shadow.

### 3. Max 2 font sizes per block

```javascript
// GOOD — title + body, that's it
`<h3 class="text-lg font-medium text-text-base">Taken</h3>`
`<p  class="text-md text-muted">...</p>`

// BAD — three sizes in one block
`text-xl`, `text-lg`, `text-sm` all in the same block component
```

### 4. Semantic color names only

```javascript
// GOOD
`bg-surface text-text-base border border-base`

// BAD — not theme-aware
`bg-white text-gray-900 border-gray-200`
```

### 5. Dark mode via CSS vars, not `dark:` variants

Because colors resolve through CSS vars that already switch in dark mode,
you should NOT need `dark:` variants for color:

```javascript
// GOOD — CSS var handles dark automatically
`bg-surface text-text-base`

// UNNECESSARY — the CSS var already does this
`bg-surface dark:bg-[#202020] text-text-base dark:text-[#e8e8e8]`
```

The only legitimate use for `dark:` variants is when setting a Tailwind
property that does NOT reference a CSS var (e.g. `dark:opacity-90`).

### 6. Focus rings are mandatory

```javascript
// GOOD — accessible focus ring
`focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2`

// BAD — removes focus indicator with no replacement
`focus:outline-none`
```

### 7. Use `cn()` for conditional classes

```javascript
import { cn } from '../utils/cn.js';

// GOOD
const cls = cn(
  'px-4 py-2 rounded-md text-base font-medium transition-colors',
  isActive ? 'bg-accent text-accent-text' : 'bg-surface text-muted hover:bg-surface-hover',
  isDisabled && 'opacity-50 pointer-events-none'
);

// BAD — fragile string concatenation
const cls = `px-4 py-2 ${isActive ? 'bg-accent' : 'bg-surface'} ${isDisabled ? 'opacity-50' : ''}`;
```

### 8. No inline styles for design tokens

```javascript
// GOOD
`<div class="p-5 rounded-lg shadow-sm">`

// BAD — sidesteps the token system, breaks compact mode
`<div style="padding: 20px; border-radius: 12px;">`
```

Exception: CSS custom properties set dynamically by the JS theme engine
(`style.setProperty('--mode-color', ...)`) are intentional and should
remain as inline styles.

---

## Do / Don't Quick Reference

| | Do | Don't |
|---|---|---|
| **Colors** | `text-muted`, `bg-surface`, `border-base` | `text-gray-500`, `bg-white`, `text-[#6b6b6b]` |
| **Spacing** | `p-5`, `gap-4`, `py-3 px-4` | `p-[20px]`, `gap-[16px]` |
| **Font size** | `text-md`, `text-lg` | `text-[14px]`, `text-[15px]` |
| **Radius** | `rounded-lg`, `rounded-md` | `rounded-[12px]` |
| **Shadow** | `shadow-sm`, `shadow-md` | `shadow-[0_1px_2px_rgba(0,0,0,.04)]` |
| **Dark mode** | CSS vars (automatic) | `dark:bg-[#202020]` |
| **Focus** | `focus-visible:ring-2 focus-visible:ring-accent` | `focus:outline-none` |
| **Conditions** | `cn('base', isActive && 'active-class')` | Template literal concat |
| **Tokens** | Update `variables.css` | Add new values in `tailwind.config.js` |
| **Font weight** | `font-normal`, `font-medium`, `font-semibold` | `font-bold`, `font-black` |

---

## What Tailwind Should NOT Be Used For

1. **App shell layout** — the shell (`base.css`) uses complex sticky/fixed
   positioning that is already stable. Do not replace with Tailwind.

2. **Collapsible section animations** — handled by `collapsible-section.css`
   with CSS `grid-template-rows` animation. Tailwind has no equivalent.

3. **ThemeEngine-derived tokens** — `--accent-soft`, `--accent-shadow`,
   `--gradient-primary` are computed at runtime by JS. Leave them as CSS vars.

4. **Mode wash animation** — the ambient transition on mode switch uses a
   custom CSS keyframe. Do not attempt to replace with Tailwind.

---

## Migration Strategy

**Phase 0 (now):** Install Tailwind, configure `tailwind.config.js`, no
changes to existing CSS. Only new code uses Tailwind utilities.

**Phase 1 (optional):** Migrate new block markup to Tailwind utilities as
blocks are touched for other reasons. Never refactor a block just to migrate.

**Phase 2 (optional, future):** If React is introduced, shared component
primitives (Button, Card, Input) use Tailwind exclusively via CVA.

**Never:** Do a big-bang migration pass. Change only what you're already touching.
