# Design Principles

## Philosophy

**Dieter Rams:** Less, but better. As little design as possible.

**Steve Jobs:** Focus and simplicity. Say no to scope creep. Ship the essential first.

**Jony Ive:** Craftsmanship and coherence, even in parts users rarely notice. Calm, timeless, minimal, human-first.

## UI Rules

1. **Content first** — UI defers to content. No decorative elements that don't serve function.
2. **Clarity over cleverness** — Every element should be immediately understandable.
3. **Meaningful hierarchy** — Use typography weight, size, and color to establish importance.
4. **Progressive disclosure** — Show essentials first. Advanced options appear on interaction.
5. **Consistent spacing** — Use the 4px base scale (`--space-1` through `--space-16`).
6. **One action per card** — Each block/card has a clear primary action.

## Component Constraints

| Component | Rule |
|-----------|------|
| Buttons | Max 2 per row. Primary + ghost/secondary only. |
| Cards | Border, not shadow, for containment. Shadow only on hover. |
| Forms | Single column. Labels above inputs. |
| Text | Max 2 font sizes per block. Body (0.875rem) + heading (0.9375rem). |
| Colors | Use semantic tokens, never raw hex in components. |
| Icons | 16-20px. Functional only, not decorative. |

## Block Design Rules

1. Each block is self-contained (own index.js, view.js, store.js, styles.css).
2. Blocks must implement `mount()` returning `{ unmount() }`.
3. Blocks use `escapeHTML()` for all user-generated content.
4. Blocks read data through their own store module, never import `db.js` directly.
5. Cross-block communication uses `eventBus`, never direct references.
6. Blocks declare `order` for deterministic rendering on hosts.

## Accessibility Basics

- All interactive elements have visible focus styles (`:focus-visible`).
- Mode switcher uses `aria-pressed` state.
- Tab navigation uses `aria-pressed` for active state.
- All buttons have `type="button"` unless inside a form.
- Color is never the only indicator — use text labels alongside badges.
- Respect `prefers-reduced-motion` — animations disabled.
- Touch targets minimum 44x44px on mobile.

## Theming

- Light/Dark/System via `data-theme` attribute.
- Accent color customizable via `--color-accent`.
- All colors through CSS custom properties in `variables.css`.
- No hardcoded colors in block styles.
