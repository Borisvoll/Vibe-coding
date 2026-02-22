# BORIS OS — CSS Style Audit

> Audited: 2026-02-21
> Scope: `src/styles/`, `src/blocks/`, `src/ui/`, `src/os/*.css`
> Tooling: `grep -rn` on all `.css` files

---

## Summary

| Category | Issues | Severity |
|----------|--------|----------|
| `!important` abuse | 3 actionable cases | Low–Medium |
| Undefined CSS tokens w/ wrong fallbacks | 1 token family | Low |
| Hard-coded px layout constants | 3 values | Low |
| Low-contrast literal hex text | 0 | — |
| Hard-coded px component sizing | several | Acceptable |
| Import order risk | 1 warning | Low |

Overall: **healthy**. The token system is well-structured, dark mode is solid, and literal hex values in text properties are absent. Issues are isolated and all have clear quick fixes.

---

## ISSUE 1 — Undefined `--color-danger` token (wrong fallback)

**Severity: Low — visual mismatch, no breakage**

**Files:** `src/blocks/lijsten-screen/styles.css` lines 254, 303, 363, 412

`--color-danger` is referenced 6+ times but is **not defined** in `variables.css` or `tokens.css`.
The fallback `#e53e3e` is used instead. However:

- The actual error color in `variables.css` is `--color-error: #f43f5e` (rose-500, not `#e53e3e` which is red-600).
- The fallback `#dd6b20` for `--color-warning` is close but not equal to `--color-warning: #f59e0b`.
- In **dark mode**, the variable resolves to nothing, so `#e53e3e` (a light-background red) is used on a dark surface — no guarantee of sufficient contrast.

**Quick fix:**

```css
/* Before */
border-left: 3px solid var(--color-danger, #e53e3e);

/* After — use the defined token; no fallback needed since it's always defined */
border-left: 3px solid var(--color-error);
```

Replace all 6 occurrences of `var(--color-danger, …)` with `var(--color-error)`.
Replace `var(--color-warning, #dd6b20)` with `var(--color-warning)`.
`--color-blue` IS defined so keep it; remove the incorrect fallback `#3182ce`.

---

## ISSUE 2 — `!important` specificity escape hatches

**Severity: Low (2 justified, 1 structural)**

### 2a. `.lijsten-screen__add-input` — 4× `!important` (lines 214–217)

```css
.lijsten-screen__add-input {
  border: none !important;
  background: none !important;
  box-shadow: none !important;
  padding: 0 !important;
}
```

**Cause:** This is a bare `<input>` inside a styled container that provides the visual border.
It needs to strip the `form-input` base class styles.

**Problem:** `!important` will fight anything that tries to add focus styles later.

**Quick fix:** Add a `.form-input--bare` modifier in `src/styles/components.css`:

```css
/* components.css — new modifier */
.form-input--bare {
  border: none;
  background: none;
  box-shadow: none;
  padding: 0;
}
```

Then in the JS template, apply `.form-input form-input--bare` to the input.
The modifier has higher specificity than the base class (same class count, but declared later).

---

### 2b. `.lijsten-screen__subtask-input` — 2× `!important` (lines 530–531)

```css
.lijsten-screen__subtask-input {
  padding: var(--space-2) var(--space-3) !important;
  border-radius: var(--radius-md) !important;
}
```

**Same root cause** as 2a: overriding `form-input` defaults. Same fix applies (`.form-input--sm` modifier or simply increase selector specificity: `.lijsten-screen .form-input` is sufficient).

---

### 2c. `.drag-handle:hover` — `opacity: 1 !important` (line 473)

```css
/* Conflict: */
.lijsten-screen__item:hover .lijsten-screen__drag-handle { opacity: 0.6; }
.lijsten-screen__drag-handle:hover { opacity: 1 !important; }
```

**Cause:** The parent-hover rule (`:hover .child`) has the same specificity as the child-hover rule (`.child:hover`), and the parent rule appears first — so without `!important`, the parent wins.

**Quick fix:** Use `:not(:hover)` to scope the dimmed state:

```css
/* Remove !important from drag-handle:hover, change parent rule to: */
.lijsten-screen__item:hover .lijsten-screen__drag-handle:not(:hover) {
  opacity: 0.6;
}
.lijsten-screen__drag-handle:hover {
  opacity: 1; /* no !important needed */
  color: var(--color-text-secondary);
}
```

---

### 2d. Focus ring + z-index `!important` (styles.css lines 1437–1438)

```css
/* Tour/focus highlight — intentional */
z-index: 2001 !important;
box-shadow: 0 0 0 3px var(--color-accent), … !important;
```

**Assessment: justified.** Accessibility focus overlays and tutorial tour highlights must override any component z-index. No change needed; add a comment if not already present.

---

## ISSUE 3 — Hard-coded px layout constants in `curiosity.css`

**Severity: Low — maintenance friction only**

Three magic numbers in `src/os/curiosity.css` are not tokenized:

| Line | Value | Meaning | Fix |
|------|-------|---------|-----|
| 8 | `max-width: 780px` | Content column width | Add `--curiosity-max-width: 780px` to `:root` block in `curiosity.css`, or use `var(--max-content-width)` if 900px is acceptable |
| 52 | `@media (max-width: 680px)` | Mobile breakpoint | Acceptable as media query literal (CSS has no variable support in `@media`) |
| 78 | `min-height: 156px` | Primary widget floor | Add `--curiosity-widget-primary-h: 156px` |
| 83 | `min-height: 128px` | Hint widget floor | Add `--curiosity-widget-hint-h: 128px` |

**Quick fix** — add to top of `curiosity.css`:

```css
/* Curiosity-local layout tokens */
:root {
  --curiosity-max-width:       780px;
  --curiosity-widget-primary-h: 156px;
  --curiosity-widget-hint-h:    128px;
}

.curiosity-page         { max-width: var(--curiosity-max-width); … }
.curiosity-widget--primary { min-height: var(--curiosity-widget-primary-h); }
.curiosity-widget--hint    { min-height: var(--curiosity-widget-hint-h); }
```

This makes it easy to adjust widget heights for the Narrative Field addition without hunting the file.

---

## ISSUE 4 — Mixed px/variable calc in subtask indent (minor)

**Severity: Low — no visual impact**

`src/blocks/lijsten-screen/styles.css` line 524:

```css
padding-left: calc(16px + var(--space-3) + 20px + var(--space-3));
```

The `16px` and `20px` literals represent a checkbox size and an icon size respectively.
`--ui-icon-sm` is already defined as `20px` in `tokens.css`. The `16px` could map to
`--radius-xl` (also 16px) but they're semantically unrelated — better to extract it:

```css
/* tokens.css */
--ui-checkbox-size: 16px;

/* lijsten-screen */
padding-left: calc(var(--ui-checkbox-size) + var(--space-3) + var(--ui-icon-sm) + var(--space-3));
```

Low priority — only relevant if checkbox sizes change.

---

## Non-Issues (Confirmed Clean)

### Literal hex text colors: None

No literal hex values are used as `color:` on text outside of:
- `src/styles/print.css` — print context, irrelevant to screen contrast
- `src/ui/balatro.css` — standalone game UI with its own palette
- `#fff` fallbacks in a few places (always paired with a CSS variable primary)

### Dark mode coverage: Complete

`variables.css` provides full dark mode overrides for all 30 color tokens via both
`@media (prefers-color-scheme: dark)` and `[data-theme="dark"]`.
`tokens.css` aliases resolve correctly in both modes since they reference `--color-*` vars.

### `--ui-*` token availability: Confirmed

`src/ui/tokens.css` is imported at the top of `src/main.js` (line 3), before any block or
page CSS is loaded. All `--ui-*` references in `curiosity.css`, `card.css`, `typography.css`,
and `blocks/styles.css` resolve correctly.

### `!important` in print + reduced-motion: Justified

`src/styles/print.css` — print layout resets require `!important` to override screen layout.
`src/styles/base.css:424-426` and `blocks/styles.css:1713-1725` — `animation-duration` and
`transition-duration` overrides for `prefers-reduced-motion` are the standard pattern.

---

## Quick Fix Priority Order

| Priority | Issue | File | Effort |
|----------|-------|------|--------|
| 1 | Replace `--color-danger` with `--color-error` | `lijsten-screen/styles.css` | 5 min |
| 2 | Add `.form-input--bare` modifier | `components.css` + `lijsten-screen` JS | 10 min |
| 3 | Fix drag-handle specificity | `lijsten-screen/styles.css:473` | 3 min |
| 4 | Tokenize curiosity layout constants | `curiosity.css` | 5 min |
| 5 | Clean up subtask calc | `lijsten-screen/styles.css:524` | 5 min |
