# Quality Pass — Checklist

> Findings from the codebase audit (2026-02-21). Each item is a concrete,
> actionable fix. Grouped by severity. Work through P1 before P2, P2 before P3.

---

## P1 — Accessibility (Fix Before Any Release)

These issues prevent keyboard users and screen reader users from using the app
correctly.

### P1-A: Missing `type="button"` on 28 buttons

Without `type="button"`, a `<button>` inside a `<form>` submits the form,
causing unintended navigation. Even outside forms it is ambiguous.

**Files to fix:**

| File | Approximate lines |
|------|-------------------|
| `src/blocks/bpv-today/view.js` | ~24–34 (4 buttons) |
| `src/blocks/personal-energy/view.js` | ~17 (1 button) |
| `src/blocks/personal-today/view.js` | ~25, 27, 33, 35, 39 (5 buttons) |
| `src/blocks/personal-week-planning/view.js` | ~19, 22 (2 buttons) |
| `src/blocks/personal-weekly-reflection/view.js` | ~18 (1 button) |
| `src/blocks/school-concept-vault/view.js` | ~27, 39 (2 buttons) |
| `src/blocks/school-current-project/view.js` | ~29 (1 button) |
| `src/blocks/school-dashboard/view.js` | ~62 (1 button) |
| `src/blocks/school-milestones/view.js` | ~21, 30 (2 buttons) |
| `src/blocks/school-skill-tracker/view.js` | ~22 (1 button) |
| `src/blocks/school-today/view.js` | ~24, 27, 33 (3 buttons) |
| `src/blocks/tasks/view.js` | ~80 (1 button) |

**Fix:** add `type="button"` to each. No logic change.

---

### P1-B: Missing focus indicators on 10 input elements

These inputs have `outline: none` with NO visible replacement. Keyboard users
cannot see where focus is.

| File | Selector | Line (approx) |
|------|----------|---------------|
| `src/ui/command-palette.css` | palette search input `:focus` | ~66 |
| `src/ui/theme-studio.css` | hex color input `:focus` | ~163, 197 |
| `src/blocks/personal-dashboard/styles.css` | `.personal-dash__textarea:focus` | ~80 |
| `src/blocks/conversation-debrief/styles.css` | `.conv-debrief__input:focus` | ~64 |
| `src/blocks/worry-dump/styles.css` | `.worry-dump__textarea:focus` | ~48 |
| `src/blocks/lijsten-screen/styles.css` | `.lijsten-screen__quick-add:focus` | ~220 |
| `src/blocks/project-hub/styles.css` | project title inputs `:focus` | ~1050, 1438 |
| `src/blocks/done-list/styles.css` | `.done-list__input:focus` | ~45 |
| `src/blocks/tasks/styles.css` | `.tasks-block__input:focus` | ~29 |

**Fix for each:** After `outline: none`, add:
```css
box-shadow: 0 0 0 3px var(--color-accent-light);
border-color: var(--color-accent);
```

---

### P1-C: 14+ inputs missing labels

Inputs without any label or `aria-label` are invisible to screen readers.

| File | Element | Issue |
|------|---------|-------|
| `src/blocks/conversation-debrief/view.js` | text input | No label |
| `src/blocks/daily-reflection/view.js` | textarea | No label (placeholder only) |
| `src/blocks/daily-todos/view.js` | add-task input | No label |
| `src/blocks/done-list/view.js` | input | No label |
| `src/blocks/inbox/view.js` | capture input | No label |
| `src/blocks/inbox-screen/view.js` | capture input | No label |
| `src/blocks/lijsten/view.js` | list name input, item input | No label (2) |
| `src/blocks/lijsten-screen/view.js` | quick-add, several item inputs | No label (4) |
| `src/blocks/personal-today/view.js` | 4 inputs | No label |
| `src/blocks/personal-week-planning/view.js` | input | No label |
| `src/blocks/projects/view.js` | project title, goal, next-action | No label (3) |
| `src/blocks/school-concept-vault/view.js` | 4 inputs | No label |
| `src/blocks/school-milestones/view.js` | 2 inputs | No label |
| `src/blocks/school-today/view.js` | input | No label |
| `src/blocks/tasks/view.js` | task input | No label |
| `src/blocks/worry-dump/view.js` | textarea | No label |

**Fix pattern** (prefer `aria-label` for inline add-inputs where a visible label
would clutter the UI):
```javascript
// Inline add-input — no visible label possible
`<input type="text" class="form-input" aria-label="Nieuwe taak toevoegen" placeholder="+ Voeg toe">`

// Form with space for a label
`<label class="form-label" for="goal-input">Doel</label>
 <input id="goal-input" type="text" class="form-input">`
```

---

### P1-D: Select and checkbox without labels

| File | Element | Line (approx) |
|------|---------|---------------|
| `src/blocks/personal-week-planning/view.js` | `<select class="form-select">` | ~17 |
| `src/blocks/context-checklist/view.js` | `<input type="checkbox">` | ~72 |

**Fix:** Add `aria-label="..."` to both.

---

### P1-E: z-index collision — Modal and Toast both at 9999

`src/styles/base.css` (toast) and `src/ui/modal.css` (modal overlay) both use
`z-index: 9999`. If a toast fires while a modal is open, stacking order is
unpredictable.

**Fix:** Align to the approved scale (see `docs/components.md §5`):
- Modal overlay: change to `z-index: 1000`
- Toast backdrop: change to `z-index: 1099`
- Toast container: change to `z-index: 1100`
- Morning flow overlay (`src/ui/morning-flow.css`): already at `z-index: 2000` — keep
- Mode wash decoration (`src/blocks/styles.css`): at `z-index: 999` → `z-index: 10`
- Tooltip (`src/styles/components.css`): at `z-index: 999` → `z-index: 200`

---

## P2 — Consistency (Fix Before Shipping New Blocks)

These issues don't break accessibility but cause visual inconsistency and make
future maintenance harder.

### P2-A: 9 hardcoded colors in block CSS

| File | Line (approx) | Color | Replace with |
|------|---------------|-------|-------------|
| `src/blocks/conversation-debrief/styles.css` | ~76 | `color: #fff` | `var(--color-accent-text)` |
| `src/blocks/done-list/styles.css` | ~75 | `color: #fff` | `var(--color-accent-text)` |
| `src/blocks/daily-cockpit/styles.css` | ~86 | `color: white` | `var(--color-accent-text)` |
| `src/blocks/lijsten/styles.css` | ~154 | `color: white` | `var(--color-accent-text)` |
| `src/blocks/worry-dump/styles.css` | ~63 | `color: #fff` | `var(--color-accent-text)` |
| `src/blocks/project-detail/styles.css` | ~45, 363, 609 | `color: white` (3×) | `var(--color-accent-text)` |
| `src/blocks/boundaries/styles.css` | ~50 | `color: #fff` | `var(--color-accent-text)` |

**Fix:** Text-search `color: #fff`, `color: white`, `color: #ffffff` across
`src/blocks/*/styles.css` and replace with the token.

---

### P2-B: 20+ block-specific button class names

Blocks define one-off button classes that duplicate `.btn` styles:
`daily-todos__add-btn`, `school-dash__done-btn`, `bpv-ql__save`, `worry-dump__submit`,
`conv-debrief__save`, etc.

**Policy:** When a block is touched for another reason, replace block-specific
button classes with `btn btn-{variant}`. Do not do a mass migration pass — only
update blocks as they are edited.

**Tracking:** Check the block off the list below when its buttons are migrated.

| Block | Status |
|-------|--------|
| `conversation-debrief` | [ ] |
| `daily-todos` | [ ] |
| `done-list` | [ ] |
| `lijsten` | [ ] |
| `lijsten-screen` | [ ] |
| `projects` | [ ] |
| `school-dashboard` | [ ] |
| `school-today` | [ ] |
| `worry-dump` | [ ] |
| `bpv-quick-log` | [ ] |
| `bpv-weekly-overview` | [ ] |
| `inbox` | [ ] |

---

### P2-C: Two card systems with different padding

`.card` (`src/styles/components.css`) uses `padding: var(--space-5)` (20px all sides).
`.os-mini-card` (`src/blocks/styles.css`) uses `padding: var(--space-5) var(--space-6)`
(20px top/bottom, 24px left/right).

This causes cards to visually misalign when both appear on the same page.

**Fix:**
1. Standardise `.card` to also use `var(--space-5) var(--space-6)` — OR —
2. Standardise `.os-mini-card` to `var(--space-5)` (all sides)

Recommendation: option 2 (uniform padding). Blocks using `.os-mini-card` that
depend on the wider horizontal padding will need a check, but the visual
difference is small and makes cards more predictable.

**Do after P1 is complete.**

---

### P2-D: Border-radius token inconsistency

`.card` uses `var(--radius-lg)` and `.os-mini-card` uses `var(--ui-card-radius)`.
In practice these resolve to the same value (12px), but using two different
tokens for the same thing is confusing.

**Fix:** In `src/styles/variables.css`, confirm `--ui-card-radius` is aliased
to `--radius-lg`. If not, make it an alias:
```css
--ui-card-radius: var(--radius-lg);
```

---

### P2-E: No global `:focus-visible` for block buttons

Some blocks suppress the global outline and don't use `:focus-visible`. The
pattern `button:focus { outline: none }` is found in 3 block CSS files that
weren't flagged in P1-B because they're buttons (not inputs).

**Fix:** Remove any `button:focus { outline: none }` that has no visible
replacement. Let the global `:focus-visible` rule in `base.css` handle it.

---

## P3 — Polish (Nice-to-Have, No Rush)

### P3-A: Missing `aria-live` on dynamic count labels

Status counts that update reactively (task counter "2/5", inbox count badge)
should announce changes to screen readers.

**Candidate elements:**
- Daily cockpit stats (task counts, outcomes count)
- Inbox badge count in nav
- DailyTodos counter ("3/3 taken" cap label)
- BPVQuickLog netto label

**Fix:** Add `aria-live="polite"` to the wrapping `<span>` of each count.

---

### P3-B: 8 `<form>` elements without accessible names

Forms that wrap a capture input or add-item input have no `aria-label` or
`<fieldset>/<legend>`. Screen readers announce them as anonymous forms.

**Fix:** Either:
- Add `aria-label` to the `<form>` element, or
- Replace `<form>` with a `<div>` if the form semantics add no value
  (purely visual, submit handled by `keydown:Enter` listener)

---

### P3-C: Collapsible sections missing `aria-controls`

`src/ui/collapsible-section.js` sets `aria-expanded` on the header button,
but does not set `aria-controls` pointing to the content element's `id`.

**Fix:**
```javascript
// in createCollapsibleSection():
headerBtn.setAttribute('aria-controls', contentEl.id);
// set contentEl.id = `section-content-${id}` on creation
```

---

### P3-D: Morning flow overlay focus trap

`src/ui/morning-flow.js` is a full-screen overlay but does not trap focus
inside it. Tab can escape to the background page.

**Fix:** On open, find all focusable elements inside the overlay and intercept
Tab/Shift+Tab to cycle within them. Restore focus to the trigger element on close.

---

### P3-E: Command palette missing `role="combobox"` pattern

`src/ui/command-palette.js` renders a search input + results list. The correct
ARIA pattern for this is `role="combobox"` on the input with `aria-expanded`,
`aria-activedescendant`, and `role="listbox"` on the results container.

Current state: result items have `data-idx` but no `role="option"` or `id`
attributes for `aria-activedescendant`.

**Fix (partial, not full rewrite):**
```html
<input role="combobox" aria-expanded="true" aria-autocomplete="list"
       aria-controls="cmd-results" aria-activedescendant="cmd-item-2">
<ul id="cmd-results" role="listbox">
  <li id="cmd-item-0" role="option" aria-selected="false">...</li>
  <li id="cmd-item-2" role="option" aria-selected="true">...</li>
</ul>
```

---

## Testing Guidance

### How to verify P1-A (missing type attributes)

```bash
# Find buttons without type attribute in view files
grep -rn '<button' src/blocks/ | grep -v 'type='
```

### How to verify P1-B (missing focus indicators)

```bash
# Find outline: none in block CSS
grep -rn 'outline: none\|outline: 0' src/blocks/*/styles.css src/ui/*.css
```

### How to verify P2-A (hardcoded colors)

```bash
# Find raw color values in block CSS
grep -rn 'color: #fff\|color: white\|color: #ffffff\|color: #000\|color: black' src/blocks/*/styles.css
```

### Manual keyboard test (covers P1-A, P1-B, P1-C)

1. Open the app, go to Vandaag tab
2. Press Tab repeatedly — every interactive element must get a visible focus ring
3. Press Enter/Space on each focused element — it must activate correctly
4. Tab through a form (outcomes, BPV log) — every input must be reachable
5. Open a modal (morning flow, project detail) — Tab must not escape the modal
6. Open command palette (Ctrl+K) — search input must have visible focus; results
   must be keyboard-navigable with arrow keys; Enter must execute

### Contrast check

Use browser DevTools → Accessibility → Color contrast or the axe browser
extension. All text must meet WCAG AA:
- Normal text: 4.5:1 ratio
- Large text / bold: 3:1 ratio
- Focus rings: 3:1 against adjacent colors

Known risk: muted text (`--color-text-secondary`) on `--color-surface` in dark
mode. Verify this passes.

---

## Summary Table

| ID | Issue | Files affected | Severity | Effort |
|----|-------|---------------|----------|--------|
| P1-A | Missing `type="button"` | 12 files, 28 buttons | Critical | Low |
| P1-B | Missing focus indicators | 9 CSS files | Critical | Low |
| P1-C | Inputs without labels | 16 files, 14+ inputs | Critical | Low–Med |
| P1-D | Select + checkbox no label | 2 files | Critical | Trivial |
| P1-E | z-index collision modal/toast | 3 files | High | Low |
| P2-A | Hardcoded colors (#fff/white) | 8 CSS files | Medium | Low |
| P2-B | Block-specific button classes | 12 blocks | Medium | Med (incremental) |
| P2-C | Card padding inconsistency | 2 CSS files | Medium | Low |
| P2-D | Border-radius token alias | 1 CSS file | Low | Trivial |
| P2-E | Button outline suppression | 3 CSS files | Medium | Low |
| P3-A | Missing `aria-live` on counts | 4 components | Low | Low |
| P3-B | Forms without accessible names | 8 JS files | Low | Low |
| P3-C | Collapsible missing `aria-controls` | 1 JS file | Low | Low |
| P3-D | Morning flow no focus trap | 1 JS file | Medium | Med |
| P3-E | Command palette ARIA pattern | 1 JS + 1 CSS | Low | Med |
