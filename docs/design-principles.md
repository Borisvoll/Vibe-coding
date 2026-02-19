# Design Principles

## Philosophy

**Dieter Rams:** Less, but better. As little design as possible.

**Steve Jobs:** Focus and simplicity. Say no to scope creep. Ship the essential first.

**Jony Ive:** Craftsmanship and coherence, even in parts users rarely notice. Calm, timeless, minimal, human-first.

**Brian Eno:** Ambient presence. Systems that work quietly in the background. Generative structure over rigid control. Mode transitions should feel like changing light, not clicking switches.

## UI Rules

1. **Content first** — UI defers to content. No decorative elements that don't serve function.
2. **Clarity over cleverness** — Every element should be immediately understandable.
3. **Meaningful hierarchy** — Use typography weight, size, and color to establish importance.
4. **Progressive disclosure** — Show essentials first. Advanced options appear on interaction.
5. **Consistent spacing** — Use the 4px base scale (`--space-1` through `--space-16`).
6. **One action per card** — Each block/card has a clear primary action.
7. **Ambient transitions** — Mode changes use subtle color washes (600ms, 8% opacity). No jarring page reloads.
8. **Trust through correctness** — Data operations (export, import, delete) must be safe and reversible.

## Component Constraints

| Component | Rule |
|-----------|------|
| Buttons | Max 2 per row. Primary + ghost/secondary only. |
| Cards | Border, not shadow, for containment. Shadow only on hover. |
| Forms | Single column. Labels above inputs. |
| Text | Max 2 font sizes per block. Body (0.875rem) + heading (0.9375rem). |
| Colors | Use semantic tokens, never raw hex in components. |
| Icons | 16-20px. Functional only, not decorative. |
| Textareas | Auto-save with 600ms debounce. No explicit save buttons for journals. |
| Progress bars | Color-coded (green ≥80%, amber ≥50%, red <50%) + always include text percentage. |

## Dashboard Widget Rules

The Main Dashboard is a cross-mode synopsis — colorful but clean, following Rams ("less but better") with strategic use of color.

1. **One accent per widget** — Each widget has a single `--widget-accent` color set via inline style. The accent colors icon circles, hover borders, and shadow tints.
2. **Skeleton → Fill pattern** — Render widget skeletons (with "Laden..." placeholder) immediately. Fill with async data. Never show a blank dashboard.
3. **Cross-mode by default** — Dashboard widgets show data from ALL modes (e.g. Projects shows all active projects with mode chips). Mode-specific filtering only where it adds clarity (e.g. task counts).
4. **Deep link every widget** — Every widget click navigates to the relevant detailed view (tab switch, scroll-to-block, or hash route).
5. **Capture widget is special** — The "Snel vastleggen" widget has `cursor: default` and no hover/active states. Its form is initialized once (not inside `loadData`) to preserve user input during event-driven refreshes.
6. **Color accents from variables.css only** — Use existing `--color-amber`, `--color-purple`, `--color-cyan`, `--color-blue`, `--color-rose`, `--color-emerald` (each with `-light` variant). Never introduce new colors.
7. **Responsive grid** — 1 column on mobile, 2 columns at `min-width: 600px`. Use `gap: var(--space-3)`.
8. **Event-driven refresh** — Widgets refresh on `mode:changed`, `tasks:changed`, `inbox:changed`, `projects:changed`, `bpv:changed`. All subscriptions cleaned up on `unmount()`.

## Unified Card Language

All OS blocks share a common visual language through the `src/ui/` token layer:

1. **Token indirection** — Block CSS uses `--ui-*` semantic tokens (from `tokens.css`), never raw `--color-*` values for surfaces, borders, and text. This allows future theme changes in one place.
2. **Card consistency** — The `.os-mini-card` and `.ui-card` classes share the same padding (`--ui-card-padding` = 20px), radius (`--ui-card-radius` = 12px), and hover shadow (`--ui-card-shadow`). This matches the legacy BPV dashboard feel.
3. **No hardcoded values** — Never use `999px`, `#fff`, `#ef4444`, or any raw hex in block CSS. Use `var(--radius-full)`, `var(--color-accent-text)`, `var(--color-error)` etc. See `docs/ui-guidelines.md` for the full mapping.
4. **Mode-aware accents** — `--ui-accent` inherits from `--mode-accent` (set by `data-mode` on the shell root). Blocks get the correct mode color automatically.
5. **Typography hierarchy** — Use `.ui-stat` (2rem/800) for headline numbers, `.ui-label` (0.8125rem/600/uppercase) for section headers, `.ui-meta` (0.75rem) for secondary info, `.ui-caption` (0.6875rem) for hints.

## Stable Navigation

1. **Mode-independent sidebar** — Navigation items (Dashboard, Vandaag, Inbox, Planning, Instellingen) are fixed. They never appear/disappear based on mode. Mode changes *content*, not *structure* (Rams: stable patterns, no noise).
2. **Dashboard as Home** — Dashboard is always the first sidebar item and reachable from every tab via a subtle "← Dashboard" breadcrumb (Jobs: obvious home path).
3. **Active indicator follows mode** — The 4px left accent bar on the active sidebar item uses `--mode-accent`, so it changes color with mode but not position (Ive: calm, premium).
4. **BPV is a mode, not a destination** — BPV has no sidebar item. BPV content appears via mode-filtered blocks and dashboard deep links.

See `docs/nav-architecture.md` for full implementation details.

## Block Design Rules

1. Each block is self-contained (own index.js, view.js, store.js, styles.css).
2. Blocks must implement `mount()` returning `{ unmount() }`.
3. Blocks use `escapeHTML()` from `src/utils.js` for all user-generated content — never define local copies.
4. Blocks read data through their own store module, never import `db.js` directly.
5. Cross-block communication uses `eventBus`, never direct references.
6. Blocks declare `order` for deterministic rendering on hosts.
7. Error handling: wrap async data operations in try-catch, fail silently for non-critical reads, show user message for writes.

## Store Design Rules

1. All stores import from `src/db.js` (never open IndexedDB directly).
2. Stores are pure data logic — no DOM manipulation, no `document.createElement`.
3. Use `ValidationError` from `src/stores/validate.js` for input validation.
4. Return `null` for "not found" reads. Throw for invalid writes.
5. Multi-step writes should create safety backups when data loss is possible.
6. Search operations use `safeGetAll()` pattern to gracefully handle missing stores.

## Accessibility

- All interactive elements have visible focus styles (`:focus-visible`).
- Icon-only buttons must have both `title` and `aria-label` attributes.
- Mode switcher uses `aria-pressed` state.
- Tab navigation uses `aria-pressed` for active state.
- All buttons have `type="button"` unless inside a form.
- Color is never the only indicator — use text labels alongside badges.
- Respect `prefers-reduced-motion` — animations disabled.
- Touch targets minimum 44x44px on mobile.
- Modal dialogs must implement focus trap (Tab cycles within modal).
- Modal close must return focus to the trigger element.

## Theming

- Light/Dark/System via `data-theme` attribute.
- Accent color customizable via `--color-accent`.
- All colors through CSS custom properties in `variables.css`.
- No hardcoded colors in block styles.
- Never set spacing/radius/motion tokens as inline styles — they must come from CSS so `[data-compact="true"]` can override them.

## Data Safety

- Export bundles include `_meta` with app name, version, timestamp, and record counts.
- Import always validates bundle structure before writing.
- Import creates a localStorage safety backup before clearing existing data.
- Tags are normalized: lowercase, trimmed, spaces→hyphens, max 50 characters.
- Search is resilient: individual store failures don't crash the entire search.
