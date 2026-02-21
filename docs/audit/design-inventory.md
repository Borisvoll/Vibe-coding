# BORIS OS — Design Inventory

**Audit date:** 2026-02-21

---

## 1. Color System

### Token Architecture

| Layer | File | Purpose |
|-------|------|---------|
| Raw tokens | `src/styles/variables.css` | 30+ color definitions, light + dark |
| Semantic aliases | `src/ui/tokens.css` | `--ui-surface`, `--ui-text`, `--ui-card-*` |
| Tailwind bridge | `src/react/tailwind.css` | Maps CSS vars → Tailwind @theme |

### Mode Colors

| Mode | Primary | Light | Emoji | Usage |
|------|---------|-------|-------|-------|
| School | `--color-purple` (#8b5cf6) | `--color-purple-light` | 📚 | Nav, badges, mode wash |
| Personal | `--color-emerald` (#10b981) | `--color-emerald-light` | 🌱 | Nav, badges, mode wash |
| BPV | `--color-blue` (#4f6ef7) | `--color-blue-light` | 🏢 | Nav, badges, mode wash |

### Accent Palette (8 colors in topbar picker)

blue (#4f6ef7), purple (#8b5cf6), green (#10b981), rose (#f43f5e), orange (#f97316), cyan (#06b6d4), indigo (#6366f1), teal (#14b8a6)

### Dark Mode

Full dark mode support via `@media (prefers-color-scheme: dark)` + manual `[data-theme="dark"]` toggle. All tokens reassigned in both paths. Background: #191919, Surface: #202020.

---

## 2. Typography System

### Font Stack

- Sans: `system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`
- Mono: `"SF Mono", SFMono-Regular, Consolas, "Liberation Mono", Menlo, monospace`

### Size Scale (9 steps)

| Token | Size | Role |
|-------|------|------|
| `--font-xs` | 11px | Captions, section labels |
| `--font-sm` | 12px | Meta, badges, secondary |
| `--font-base` | 13px | Standard body, buttons |
| `--font-md` | 14px | Primary body, list items |
| `--font-lg` | 15px | Block titles, cards |
| `--font-xl` | 18px | Section headings |
| `--font-2xl` | 22px | Large stats |
| `--font-3xl` | 28px | Page titles |
| `--font-stat` | 32px | Mega metric numbers |

### Consistency Issue

React Dashboard.jsx uses Tailwind's native `text-2xl` (24px) and `text-sm` (14px) which don't map to the custom font scale. The `tailwind.css` @theme maps `--font-size-2xl: var(--font-2xl)` (22px), but Tailwind's default `text-2xl` is 24px. Whether the custom or default wins depends on cascade specificity.

---

## 3. Spacing System

### Scale (11 steps, 4px base)

| Token | Value | Tailwind mapped |
|-------|-------|-----------------|
| `--space-0` | 0.125rem (2px) | `spacing-0` |
| `--space-1` | 0.25rem (4px) | `spacing-1` |
| `--space-2` | 0.5rem (8px) | `spacing-2` |
| `--space-3` | 0.75rem (12px) | `spacing-3` |
| `--space-4` | 1rem (16px) | `spacing-4` |
| `--space-5` | 1.25rem (20px) | `spacing-5` |
| `--space-6` | 1.5rem (24px) | `spacing-6` |
| `--space-8` | 2rem (32px) | `spacing-8` |
| `--space-10` | 2.5rem (40px) | `spacing-10` |
| `--space-12` | 3rem (48px) | `spacing-12` |
| `--space-16` | 4rem (64px) | `spacing-16` |

### Compact Mode

`[data-compact="true"]` reduces spacing by ~25% across all tokens.

---

## 4. Component Patterns

### Card Pattern (vanilla)

```css
/* src/ui/card.css */
.os-mini-card {
  background: var(--ui-surface);
  border: 1px solid var(--ui-card-border);
  border-radius: var(--ui-card-radius);
  padding: var(--ui-card-padding);
  box-shadow: var(--ui-card-shadow);
}
```

### Card Pattern (React Dashboard)

```jsx
<div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
```

**Same visual output, different authoring.** Both reference the same CSS custom properties.

### Button Pattern

Defined in `src/styles/components.css`:
- `.btn` — base button
- `.btn-primary` — accent color fill
- `.btn-secondary` — ghost/outline
- `.btn-sm` — small variant
- `.btn-icon` — icon-only
- `.btn-ghost` — no background

### Mode Badge Pattern

Repeated in shell.js, Dashboard.jsx, and multiple blocks:
```html
<span class="os-section__mode-badge"
  style="--badge-color:{color};--badge-color-light:{colorLight}">
  {emoji} {label}
</span>
```

React version in Dashboard.jsx:
```jsx
<span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium"
  style={{ background: meta.colorLight, color: meta.color }}>
  {meta.emoji} {meta.label}
</span>
```

---

## 5. Layout Patterns

### Shell Layout (React)

- Desktop: Sidebar (240px) + Content area
- Mobile: Full-width content + bottom mobile nav
- Topbar: Hamburger toggle + settings gear
- Mode picker: Full-screen dialog overlay

### Vandaag Layout (vanilla, dormant)

3-tier vertical layout with collapsible sections:
1. **Focus tier:** Hero (outcomes) + Cockpit (stats) + Tasks
2. **Projects tier:** Projects + Capture (Inbox)
3. **Review tier:** Reflection + Context + Weekly

### Dashboard Layout (React, active)

Single column with sections:
1. Mode hero (h2 + badge)
2. Stats grid (1-4 cols responsive)
3. Week focus card
4. Active projects list

---

## 6. Animation & Motion

| Element | Technique | Token |
|---------|-----------|-------|
| Mode wash | CSS animation, color overlay | `--ease`, custom keyframes |
| Card hover | box-shadow transition | `--duration-fast` (180ms) |
| Collapsible sections | max-height transition | `--duration-slow` (300ms) |
| Focus overlay | Opacity fade | `--duration-page` (350ms) |
| Mode picker | Scale + opacity | `--ease-spring` |

### Reduce Motion

`[data-reduce-motion="true"]` disables transitions. Set via user preference in Settings.

---

## 7. Icon System

All icons are inline SVG (Feather Icons style). No icon font or sprite sheet. Consistent `width="18" height="18"` for sidebar, `width="20" height="20"` for topbar.

---

## 8. Consistency Assessment

| Pattern | Vanilla | React | Consistent? |
|---------|---------|-------|-------------|
| Card styling | `.os-mini-card` (BEM) | Tailwind utilities | Visually yes, authoring no |
| Color references | `var(--color-*)` | `var(--color-*)` or `[var(--color-*)]` | Yes |
| Font sizes | `var(--font-*)` | Tailwind's native `text-2xl` | **NO** |
| Spacing | `var(--space-*)` | Tailwind's `p-6`, `gap-4` | Partially |
| Border radius | `var(--radius-*)` | `rounded-xl` | Partially |
| Mode badge | `.os-section__mode-badge` | Inline Tailwind | **NO** (duplicate pattern) |
| Buttons | `.btn`, `.btn-primary` | (not yet used in React) | N/A |
