# BORIS Design System

> **Goal:** A calm, consistent UI. Dieter Rams principle: "Less, but better."
> Every token here maps directly to an existing CSS custom property in
> `src/styles/variables.css`. Tailwind classes are aliases — the CSS vars
> remain the single source of truth.

---

## Architecture Decision: CSS Variables + Tailwind Config

### Why this approach

The app already has a mature token system in `variables.css`. Rewriting it
into Tailwind config values would be churn with no gain. Instead:

1. `tailwind.config.js` maps Tailwind utility names → `var(--existing-token)`
2. Existing CSS is untouched — old class names still work
3. New code can use Tailwind utilities
4. The theme engine (`themeEngine.js`) continues to set CSS vars at runtime
   — Tailwind utilities pick them up automatically

```
themeEngine.js → sets var(--color-accent) on :root
                       ↓
tailwind.config.js: accent: 'var(--color-accent)'
                       ↓
class="text-accent"  resolves at paint time
```

No double-source-of-truth. No value duplication.

---

## 1. Spacing Scale

### Tokens (`variables.css` → Tailwind)

| CSS var | px | Tailwind key | Use for |
|---------|-----|-------------|---------|
| `--space-0` | 2px | `spacing.px2` | Micro: icon gaps, divider offsets |
| `--space-1` | 4px | `spacing.1` | XS: badge padding, tight inline gaps |
| `--space-2` | 8px | `spacing.2` | SM: button padding-x, icon+label gap |
| `--space-3` | 12px | `spacing.3` | MD: list item vertical padding |
| `--space-4` | 16px | `spacing.4` | Base: card padding-y, section gaps |
| `--space-5` | 20px | `spacing.5` | Card padding (default) |
| `--space-6` | 24px | `spacing.6` | Block header padding |
| `--space-8` | 32px | `spacing.8` | Section vertical rhythm |
| `--space-10` | 40px | `spacing.10` | Page section gaps |
| `--space-12` | 48px | `spacing.12` | Large section breaks |
| `--space-16` | 64px | `spacing.16` | Page-level margins |

### Usage Rules

- **Max 2 spacing values per component** (one for padding, one for gap/margin)
- Card padding: always `p-5` (20px). Never vary per card.
- List item padding: `py-3 px-4`. Consistent throughout.
- Section gap (between blocks): `gap-4` or `space-y-4`.
- Do not mix `--space-*` CSS vars with Tailwind spacing in the same rule.

### Compact mode

In `[data-compact="true"]`, CSS vars automatically shrink. Tailwind classes
resolve to smaller values at paint time — no extra compact variants needed.

---

## 2. Typography Scale

### Tokens

| CSS var | px | Tailwind key | Use for |
|---------|-----|-------------|---------|
| `--font-xs` | 11px | `text-xs` | Captions, section labels, timestamps |
| `--font-sm` | 12px | `text-sm` | Meta, badges, secondary info |
| `--font-base` | 13px | `text-base` | Standard body, buttons, inputs |
| `--font-md` | 14px | `text-md` | Primary body copy, list items |
| `--font-lg` | 15px | `text-lg` | Block titles, card headings |
| `--font-xl` | 18px | `text-xl` | Section headings |
| `--font-2xl` | 22px | `text-2xl` | Large stats, featured numbers |
| `--font-3xl` | 28px | `text-3xl` | Page titles |
| `--font-stat` | 32px | `text-stat` | Mega metric display (cockpit) |

### Line-height (leading)

| Token | Value | Tailwind key | Use for |
|-------|-------|-------------|---------|
| tight | 1.2 | `leading-tight` | Headings, stats, single-line labels |
| snug | 1.4 | `leading-snug` | Card titles, nav items |
| normal | 1.5 | `leading-normal` | Body copy, list items |
| relaxed | 1.625 | `leading-relaxed` | Paragraph prose (reflection, debrief) |

### Usage Rules

- **Max 2 font sizes per block** — block title (`text-lg`) + content (`text-md`).
  Section-level labels use `text-xs`. Stats can use `text-2xl` or `text-stat`.
- Never use `text-3xl` inside a block — only page-level headings.
- Font weight: `font-medium` (500) for labels and titles. `font-normal` (400)
  for body. `font-semibold` (600) only for stat numbers.
- Do not use `font-bold` (700) anywhere in blocks — too heavy for the calm aesthetic.

---

## 3. Radii and Shadows

### Border Radius

| CSS var | Value | Tailwind key | Use for |
|---------|-------|-------------|---------|
| `--radius-sm` | 4px | `rounded-sm` | Badges, tags, small chips |
| `--radius-md` | 8px | `rounded-md` | Buttons, inputs, small cards |
| `--radius-lg` | 12px | `rounded-lg` | Cards, modals, collapsible sections |
| `--radius-xl` | 16px | `rounded-xl` | Hero cards, feature panels |
| `--radius-full` | 9999px | `rounded-full` | Avatars, pills, dots |

**Rule:** Cards are always `rounded-lg`. Buttons are `rounded-md`. Tags are
`rounded-sm`. Never mix radii within a single component.

### Shadows

| CSS var | Value | Tailwind key | Use for |
|---------|-------|-------------|---------|
| `--shadow-sm` | `0 1px 2px rgba(0,0,0,.04)` | `shadow-sm` | Default card elevation |
| `--shadow-md` | `0 2px 8px rgba(0,0,0,.06)` | `shadow-md` | Hover state, modals |
| `--shadow-lg` | `0 4px 16px rgba(0,0,0,.08)` | `shadow-lg` | Floating panels, dropdowns |

**Rules:**
- Default state: `shadow-sm` on cards. No shadow on list items.
- Hover: elevate one step (`shadow-sm` → `shadow-md`). Never skip steps.
- Dark mode: shadows use higher opacity (handled in `variables.css` dark vars;
  Tailwind shadow classes resolve the updated CSS var automatically).
- Do not use `shadow-xl` or larger — too heavy for the calm aesthetic.

---

## 4. Semantic Color Tokens

### Core Palette (maps to `--ui-*` tokens in `tokens.css`)

| Tailwind key | CSS var | Light | Dark | Use for |
|-------------|---------|-------|------|---------|
| `bg-base` | `--color-bg` | `#f6f7f8` | `#191919` | Page background |
| `bg-surface` | `--color-surface` | `#ffffff` | `#202020` | Card/block background |
| `bg-surface-hover` | `--color-surface-hover` | `#f7f7f5` | `#2a2a2a` | Hover state on surface |
| `text-base` | `--color-text` | `#1f1f1f` | `#e8e8e8` | Primary text |
| `text-muted` | `--color-text-secondary` | `#6b6b6b` | `#9b9b9b` | Secondary text |
| `text-faint` | `--color-text-tertiary` | `#9b9b9b` | `#6b6b6b` | Placeholder, disabled |
| `border-base` | `--color-border` | `#e5e7eb` | `#333333` | Default borders |
| `border-light` | `--color-border-light` | `#eceff3` | `#2a2a2a` | Subtle dividers |
| `accent` | `--color-accent` | `#4f6ef7` | `#6d8afb` | Primary CTA, active state |
| `accent-hover` | `--color-accent-hover` | `#3d5ce5` | `#5a77f0` | Accent hover |
| `accent-light` | `--color-accent-light` | `#eef1fe` | `#1c2350` | Accent background tint |
| `accent-text` | `--color-accent-text` | `#ffffff` | `#ffffff` | Text on accent bg |

### Semantic Status Colors

| Tailwind key | CSS var | Use for |
|-------------|---------|---------|
| `text-success` | `--color-success` | Completion, positive metrics |
| `bg-success-light` | `--color-success-light` | Success background tint |
| `text-warning` | `--color-warning` | Caution states, overdue |
| `bg-warning-light` | `--color-warning-light` | Warning background tint |
| `text-danger` | `--color-error` | Destructive actions, errors |
| `bg-danger-light` | `--color-error-light` | Error background tint |

### Mode Colors

These are applied via the mode system, not directly by blocks:

| Mode | Color var | Light variant |
|------|-----------|--------------|
| School | `--color-purple` | `--color-purple-light` |
| Personal | `--color-emerald` | `--color-emerald-light` |
| BPV | `--color-blue` | `--color-blue-light` |

**Rule:** Blocks should not hardcode mode colors. Use `var(--mode-color)` which
is set on `#new-os-shell` by the shell based on active mode.

### Usage Rules

- Always use semantic names (`text-base`, `bg-surface`) — never hardcode hex.
- Accent color is dynamic (set by ThemeEngine from user preference). Never
  assume it's blue.
- Text on `bg-surface` = `text-base`. Text on `bg-base` (page bg) = `text-muted`.
- Interactive elements: default `border-base`, hover `border-accent`.

---

## 5. Focus Rings

### Token

```css
/* src/styles/base.css already defines: */
:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}
```

### Tailwind Config

```javascript
// tailwind.config.js
ring: {
  DEFAULT: '2px',
  accent: 'var(--color-accent)',
},
ringOffset: {
  DEFAULT: '2px',
}
```

### Usage Rules

- All interactive elements must have a focus-visible ring.
- Use `focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2`.
- Never use `outline-none` or `focus:outline-none` without a replacement focus indicator.
- The ring color is `--color-accent` — it adapts to the user's theme choice automatically.
- Modals and dialogs: first focusable element inside should receive focus on open.

### Example

```html
<!-- Button with correct focus ring -->
<button class="px-4 py-2 rounded-md bg-accent text-accent-text
               focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2">
  Opslaan
</button>
```

---

## 6. The `cn()` Utility

### What it is

`cn()` = `clsx` (conditional classes) + `tailwind-merge` (deduplication).

```javascript
// src/utils/cn.js
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
```

### Why we need it

In vanilla JS template literals, conditional class building is verbose and
error-prone without a helper:

```javascript
// Without cn() — fragile, produces double spaces
const cls = `btn ${isActive ? 'btn--active' : ''} ${isDisabled ? 'opacity-50' : ''}`;

// With cn() — clean, deduplicates Tailwind conflicts
const cls = cn('px-4 py-2 rounded-md', isActive && 'bg-accent', isDisabled && 'opacity-50 cursor-not-allowed');
```

`tailwind-merge` also resolves conflicts:
```javascript
cn('px-4', 'px-2') // → 'px-2'  (last wins, no duplicate)
```

### CVA (class-variance-authority)

Skip for now. CVA is most useful when defining component variants in a
React-style pattern (Button: size=sm|md|lg, variant=primary|ghost).
In vanilla JS, a simple object map achieves the same with less overhead:

```javascript
// Prefer this in vanilla JS
const BUTTON_SIZES = { sm: 'px-3 py-1.5 text-sm', md: 'px-4 py-2 text-base' };
const cls = cn('rounded-md font-medium', BUTTON_SIZES[size]);
```

---

## 7. Component Token Cheat Sheet

### Card

```
bg-surface rounded-lg shadow-sm border border-base p-5
```

### Card (hover/interactive)

```
bg-surface rounded-lg shadow-sm border border-base p-5
hover:shadow-md hover:bg-surface-hover transition-shadow
```

### Button (primary)

```
px-4 py-2 rounded-md bg-accent text-accent-text text-base font-medium
hover:bg-accent-hover
focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2
transition-colors
```

### Button (ghost)

```
px-4 py-2 rounded-md text-muted text-base font-medium
hover:bg-surface-hover hover:text-base
focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2
transition-colors
```

### Input

```
w-full px-3 py-2 rounded-md bg-surface border border-base text-base text-base
placeholder:text-faint
focus:border-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent
transition-colors
```

### Tag / Badge

```
inline-flex items-center px-2 py-0.5 rounded-sm text-xs font-medium
bg-accent-light text-accent
```

### Section heading (within a block)

```
text-xs font-medium text-muted uppercase tracking-wide
```

---

## 8. Animation / Transition Rules

- All interactive state changes: `transition-colors duration-[180ms]` (matches `--duration-fast`)
- Shadow elevation changes: `transition-shadow duration-[180ms]`
- Layout shifts / open-close: handled by existing CSS animations in `base.css`
- Respect `[data-reduce-motion="true"]`: wrap non-essential transitions in
  `motion-safe:transition-*`
