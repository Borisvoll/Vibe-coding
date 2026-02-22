# UI Primitives

> This is the canonical reference for every shared UI primitive in BORIS.
> When writing new block markup or editing existing blocks, use these classes
> and patterns. Do NOT invent block-specific variants of anything defined here.

---

## Source Files

| File | Contains |
|------|----------|
| `src/styles/variables.css` | All design tokens (color, spacing, radius, shadow, font) |
| `src/styles/base.css` | Resets, global `:focus-visible`, typography base |
| `src/styles/components.css` | Buttons, cards, form elements, badges, tags, progress |
| `src/styles/pages.css` | Shell layout, tab/sidebar chrome (do not use in blocks) |

Blocks import their own `styles.css` for block-specific layout only. They must
not redeclare any primitive listed here.

---

## 1. Buttons

### Global classes (from `src/styles/components.css`)

```css
.btn                   /* Base: flex, gap, padding, radius, transition */
.btn-primary           /* Accent bg + white text — primary CTA */
.btn-secondary         /* Bordered, surface bg — secondary action */
.btn-ghost             /* No bg/border, accent text — tertiary / link-like */
.btn-danger            /* Error color — destructive action */
.btn-sm                /* Smaller padding + font — use in dense contexts */
.btn-icon              /* Square 36 × 36 px — icon-only buttons */
```

### Rules

1. **Every `<button>` must have `type="button"`** unless it is the submit trigger
   inside a `<form>` (then `type="submit"`). No exceptions.
   ```html
   <!-- correct -->
   <button type="button" class="btn btn-ghost">Annuleer</button>
   <button type="submit" class="btn btn-primary">Opslaan</button>

   <!-- wrong — missing type -->
   <button class="btn btn-primary">Opslaan</button>
   ```

2. **Use global `.btn` classes, not block-specific button classes.**
   ```html
   <!-- correct -->
   <button type="button" class="btn btn-secondary btn-sm">Bewerken</button>

   <!-- wrong — ad-hoc block class -->
   <button type="button" class="school-dash__done-btn">Klaar</button>
   ```

3. **Icon-only buttons must have `aria-label`.**
   ```html
   <button type="button" class="btn btn-icon" aria-label="Verwijder taak">
     <!-- SVG icon -->
   </button>
   ```

4. **Button groups** (mode selector, day type picker) use a `<div role="group" aria-label="...">` wrapper:
   ```html
   <div role="group" aria-label="Dagtype">
     <button type="button" class="btn btn-secondary" aria-pressed="true">Gewerkt</button>
     <button type="button" class="btn btn-secondary" aria-pressed="false">Ziek</button>
   </div>
   ```

5. **Disabled state:** Use `disabled` attribute + `aria-disabled="true"`. Do not
   use CSS-only disabled simulation.

### When to use which variant

| Situation | Variant |
|-----------|---------|
| Primary save / confirm | `btn-primary` |
| Cancel / secondary navigation | `btn-secondary` |
| Inline action (within a list, card header) | `btn-ghost btn-sm` |
| Destructive (delete, remove) | `btn-danger btn-sm` |
| Icon-only toolbar action | `btn-icon` |

---

## 2. Cards

### Canonical card class: `.card`

```css
/* from src/styles/components.css */
.card                  /* Surface bg, border, radius-lg, padding-5 */
.card-hover            /* Adds shadow on hover */
.card-clickable        /* cursor: pointer + hover accent border */
.card-color-top        /* 3px accent top border (uses --card-color var) */
.card-color-left       /* 3px accent left border (uses --card-color var) */
```

### Legacy alias: `.os-mini-card`

`.os-mini-card` (in `src/blocks/styles.css`) is an older alias that differs
slightly from `.card`:
- Horizontal padding is `--space-6` (vs `--space-5` for `.card`)
- Uses `--ui-card-radius` token (same as `--radius-lg` in practice)
- Has a built-in `block-enter` animation

**New code must use `.card`.** Existing blocks using `.os-mini-card` are fine
until they are touched for another reason — do not mass-migrate.

### Usage

```html
<!-- Default block card -->
<div class="card">...</div>

<!-- Interactive card (navigates somewhere on click) -->
<div class="card card-clickable" role="button" tabindex="0" aria-label="Open project">...</div>

<!-- Card with mode accent stripe (set --card-color via inline style or CSS) -->
<div class="card card-color-left" style="--card-color: var(--color-purple)">...</div>
```

### Rules

1. Card padding is always `var(--space-5)` (20px). Do not override per-block.
2. Border-radius is always `var(--radius-lg)` (12px). Do not override per-block.
3. Card background is always `var(--color-surface)`. Never hardcode `#fff` or `white`.
4. Hover shadow: use `.card-hover` class, not a hand-rolled `:hover` shadow.
5. Block-specific `padding` overrides on cards are forbidden. If a card needs
   different internal layout, use a child element.

---

## 3. Form Inputs

### Global classes (from `src/styles/components.css`)

```css
.form-group            /* Vertical stack: label + input + optional hint */
.form-label            /* Label text styling */
.form-input            /* Single-line text input */
.form-textarea         /* Multi-line textarea */
.form-select           /* <select> dropdown */
.form-hint             /* Helper text below input */
```

### Rules

1. **Every input must have a visible `<label>` or, if that is impossible
   (inline add-input with no space for a label), an `aria-label` attribute.**

   ```html
   <!-- correct: visible label -->
   <div class="form-group">
     <label class="form-label" for="outcome-1">Doel 1</label>
     <input id="outcome-1" type="text" class="form-input" placeholder="Wat wil je bereiken?">
   </div>

   <!-- correct: aria-label when no visible label is possible -->
   <input type="text" class="form-input" aria-label="Nieuwe taak toevoegen" placeholder="+ Taak">

   <!-- wrong: no label, no aria-label -->
   <input type="text" class="form-input" placeholder="Nieuwe taak">
   ```

2. **`<select>` elements always have a `<label>` or `aria-label`.**

3. **`<textarea>` elements always have a `<label>` or `aria-label`.**

4. **Focus state must be visible.** The global `.form-input:focus` already adds
   a `box-shadow` ring. Do NOT add `outline: none` to an input focus rule
   without replacing it with an equivalent visible indicator.

   ```css
   /* wrong — removes focus with no replacement */
   .my-block__input:focus { outline: none; }

   /* correct — replacement focus ring */
   .my-block__input:focus { outline: none; box-shadow: 0 0 0 3px var(--color-accent-light); }

   /* best — let global .form-input handle it, add no focus rule at all */
   ```

5. **Use `.form-input` on all text inputs.** Do not create block-specific input
   classes that redeclare border, radius, padding, and background.

   ```html
   <!-- correct -->
   <input type="text" class="form-input" ...>

   <!-- wrong — block-specific class reimplements the same styles -->
   <input type="text" class="daily-todos__input" ...>
   ```

   Block-specific class names are allowed as *additions* (for width, margin,
   etc.) but must not duplicate the base input styles.

### Checkbox & radio

```html
<!-- checkbox with accessible label -->
<label class="form-check">
  <input type="checkbox" class="form-check__input" aria-label="Markeer als klaar">
  <span class="form-check__label">Klaar</span>
</label>
```

Never use a bare `<input type="checkbox">` without an associated label.

---

## 4. Focus Rings

### Global default

`src/styles/base.css` defines a global `:focus-visible` rule:
```css
:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}
```

This fires for keyboard navigation and is suppressed for mouse clicks by the
browser natively. Do not override it to `outline: none` without a replacement.

### When the global rule isn't enough

Certain elements have custom focus states that must match (e.g. inputs use a
`box-shadow` ring instead of `outline`):

```css
/* Inputs: ring via box-shadow so it respects border-radius */
.form-input:focus-visible,
.form-textarea:focus-visible,
.form-select:focus-visible {
  outline: none; /* reset default outline */
  box-shadow: 0 0 0 3px var(--color-accent-light);
  border-color: var(--color-accent);
}
```

### Buttons in modals / overlays

Buttons inside modals already get the global `:focus-visible` outline. Do not
suppress it. The modal's `border-radius` on buttons clips the outline correctly.

### Prohibited

```css
/* ALL of these are prohibited unless accompanied by a visible replacement */
:focus { outline: none; }
:focus { outline: 0; }
.my-thing:focus { outline: none; }
```

---

## 5. z-index Scale

To prevent stacking collisions, use only these values:

| Layer | z-index | Elements |
|-------|---------|---------|
| Card hover / dropdown | `10` | Hover-elevated cards, mini dropdowns |
| Sticky header | `100` | Nav bar, tab bar |
| Tooltip | `200` | `.tooltip` |
| Overlay panels | `500` | Slide-in panels, collapsible large menus |
| Modals | `1000` | `.modal-overlay`, morning flow |
| Toast notifications | `1100` | `.toast-container` |
| Critical system overlays | `2000` | Focus overlay, Balatro easter egg |

**Never use `z-index: 9999` or `z-index: 9998`.** Existing instances in `base.css`
and `modal.css` are technical debt and must be migrated to the scale above.

---

## 6. Color Tokens — Forbidden Patterns

Never write these in block CSS files:

```css
/* forbidden — use var(--color-accent-text) instead */
color: #fff;
color: white;
color: #ffffff;

/* forbidden — use var(--color-text) instead */
color: #000;
color: black;

/* forbidden — use var(--color-bg) or var(--color-surface) */
background: white;
background: #fff;
background-color: #ffffff;
```

The only file allowed to define raw hex values is `src/styles/variables.css`.

---

## 7. Layout Utilities

No framework grid — keep layout minimal and explicit. Within a block or
component, use these patterns:

```html
<!-- vertical stack with gap -->
<div style="display:flex; flex-direction:column; gap:var(--space-3)">

<!-- horizontal row, wrapping -->
<div style="display:flex; flex-wrap:wrap; gap:var(--space-2)">

<!-- 2-column grid (equal width) -->
<div style="display:grid; grid-template-columns:1fr 1fr; gap:var(--space-3)">
```

Resist extracting these into utility classes unless the same layout is needed
in 5+ places. The current codebase does not have `.flex-col` utilities and
that is intentional — explicit layout is easier to read than stacked utilities.

---

## 8. Mode/Theme Controls — Single Location

### Mode switcher
The canonical mode switcher UI lives in **one place**: the OS shell header
(`.os-mode-btn` in `src/blocks/styles.css`). The settings panel has a secondary
reference (display/info only). Do not add a third mode switcher anywhere.

When a block needs to *read* the current mode, use `context.modeManager.getMode()`.
When a block needs to *react to* mode changes, subscribe to `mode:changed` on
`context.eventBus`.

### Theme toggle
The canonical theme toggle lives in **one place**: `src/ui/theme-studio.js`
(accessible from Settings → Uiterlijk). The settings panel may show a simple
light/dark/system radio group that calls `themeEngine.setTheme()`. No other
component should add a theme toggle.

---

## 9. Skeleton / Loading State

All async blocks show a skeleton during the initial data fetch. Use the shared
`.skeleton` class from `src/styles/components.css`:

```html
<!-- single line skeleton -->
<div class="skeleton" style="height:1em; width:60%; border-radius:var(--radius-sm)"></div>

<!-- block of skeletons -->
<div style="display:flex; flex-direction:column; gap:var(--space-2)">
  <div class="skeleton" style="height:1em; width:80%"></div>
  <div class="skeleton" style="height:1em; width:60%"></div>
  <div class="skeleton" style="height:2.5em; width:40%; border-radius:var(--radius-md)"></div>
</div>
```

The `.skeleton` class handles the shimmer animation. No block should define its
own shimmer keyframe.

---

## 10. Badges and Tags

```css
/* from src/styles/components.css */
.badge               /* Neutral small pill */
.badge-blue          /* Blue accent — BPV mode indicator */
.badge-purple        /* Purple — School mode indicator */
.badge-emerald       /* Green — Personal mode indicator */
.badge-amber         /* Warning / overdue */
.badge-red           /* Error / danger */
.badge-green         /* Success / complete */

.tag                 /* Larger pill, default surface bg */
.tag.selected        /* Active state — accent bg + text */
```

```html
<span class="badge badge-purple">School</span>
<span class="tag selected">Prioriteit</span>
```

---

## Checklist — Before Submitting Any Block Change

- [ ] All `<button>` elements have `type="button"` (or `type="submit"` inside a form)
- [ ] All icon-only buttons have `aria-label`
- [ ] All inputs have a `<label>` or `aria-label`
- [ ] All `<select>` and `<textarea>` elements have a `<label>` or `aria-label`
- [ ] No `outline: none` on `:focus` without a visible replacement
- [ ] No hardcoded hex colors (`#fff`, `white`, `#000`, `black`)
- [ ] No block-specific card chrome (background, radius, padding, shadow)
- [ ] No block-specific input chrome (border, radius, padding, background)
- [ ] No z-index values outside the approved scale (10 / 100 / 200 / 500 / 1000 / 1100 / 2000)
- [ ] User content rendered via `escapeHTML()` — never raw in `.innerHTML`
