# UI Guidelines — BORIS OS Design Token System

## Overview

The `src/ui/` layer provides a semantic CSS token system that sits between raw `variables.css` values and block-level styles. It establishes a unified card language, typographic hierarchy, and layout primitives that all blocks should use.

## Token Layer (`src/ui/tokens.css`)

Semantic aliases that resolve to `variables.css` values. Always use `--ui-*` tokens in block CSS instead of raw `--color-*` or `--space-*` for these categories:

| Token | Maps to | Usage |
|-------|---------|-------|
| `--ui-surface` | `--color-surface` | Card/block backgrounds |
| `--ui-surface-hover` | `--color-surface-hover` | Hover states |
| `--ui-bg` | `--color-bg` | Page background |
| `--ui-border` | `--color-border` | Card borders |
| `--ui-border-light` | `--color-border-light` | Subtle dividers |
| `--ui-text` | `--color-text` | Primary text |
| `--ui-text-muted` | `--color-text-secondary` | Secondary text |
| `--ui-text-faint` | `--color-text-tertiary` | Tertiary/hint text |
| `--ui-card-padding` | `--space-5` (20px) | Standard card padding |
| `--ui-card-radius` | `--radius-lg` (12px) | Card border radius |
| `--ui-card-shadow` | `--shadow-sm` | Card hover shadow |
| `--ui-accent` | `--mode-accent` / `--color-accent` | Current mode accent |
| `--ui-danger` | `--color-error` | Destructive actions |
| `--ui-warning` | `--color-warning` | Warning states |
| `--ui-success` | `--color-success` | Success states |

## Card System (`src/ui/card.css`)

Unified card language matching the legacy BPV dashboard feel.

### Base Card
```html
<div class="ui-card">
  <h3 class="ui-card__title">Card Title</h3>
  <div class="ui-card__body">Content</div>
  <span class="ui-card__meta">Metadata</span>
</div>
```

### Modifiers

| Class | Effect |
|-------|--------|
| `.ui-card--accent` | 3px mode-colored top border |
| `.ui-card--clickable` | Pointer cursor + stronger hover shadow |
| `.ui-card--flush` | No padding (block manages its own) |

### Progress Bar
```html
<div class="ui-progress">
  <div class="ui-progress__fill" style="width: 65%; background: var(--color-emerald);"></div>
</div>
```

## Typography (`src/ui/typography.css`)

| Class | Size | Weight | Use case |
|-------|------|--------|----------|
| `.ui-stat` | 2rem | 800 | Large stat numbers ("40u", "87%") |
| `.ui-stat--sm` | 1.25rem | 700 | Inline counters |
| `.ui-label` | 0.8125rem | 600 | Uppercase section labels |
| `.ui-meta` | 0.75rem | — | Dates, counts |
| `.ui-caption` | 0.6875rem | — | Hints, character counters |

## Layout (`src/ui/layout.css`)

| Class | Purpose |
|-------|---------|
| `.ui-section` | Vertical group of cards, `gap: var(--space-4)` |
| `.ui-section__header` | Flex row for section title + action |
| `.ui-hero-row` | 2-column stat grid (1-col on mobile) |
| `.ui-stack` | Vertical flex container |
| `.ui-stack--xs/sm/md/lg` | Gap variants |
| `.ui-row` | Horizontal flex, centered |
| `.ui-row--between` | Space-between variant |
| `.ui-widget-grid` | 2-col responsive dashboard grid |

## OS Mini Card (`.os-mini-card`)

The standard block card used by all OS blocks. Updated to use UI tokens:

- **Padding**: `var(--ui-card-padding)` (20px, matches legacy BPV)
- **Radius**: `var(--ui-card-radius)` (12px)
- **Background**: `var(--ui-surface)`
- **Hover**: Adds `var(--ui-card-shadow)` on hover
- **Mode border**: 3px top border via `--mode-card-border`

## No-Fragmentation Rule

**Never introduce hardcoded values in block CSS.** All blocks must use:

- `var(--radius-full)` instead of `999px`
- `var(--color-accent-text)` instead of `#fff` on colored backgrounds
- `var(--color-error)` instead of `#ef4444`
- `var(--color-warning)` instead of `#f59e0b`
- `var(--ui-border)` instead of `#d1d5db` / `#e5e7eb`
- `var(--ui-text-muted)` instead of `#4b5563` / `#6b6b6b`

This ensures dark mode, compact mode, and future themes all work automatically.

## Easter Egg: Balatro

Type `balatro` anywhere in the app to trigger a full-page overlay with:
- CRT swirl background (rotating conic gradient)
- Scanline overlay
- 5 animated playing cards with spring entrance
- Floating particles
- Click or Escape to dismiss

Files: `src/ui/balatro.css` + `src/ui/balatro.js`. Initialized in `main.js` via `initBalatro()`.
