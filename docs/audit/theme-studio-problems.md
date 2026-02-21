# Theme Studio — Problems Audit

> Date: 2026-02-21
> Status: Phase 1 exploration (no code changes yet)

---

## Problem 1: "??" in Top-Left Date Header

### Symptom
The top-left of the OS shell shows "BORIS" with "??" underneath instead of a date.

### Root Cause
**Array index out-of-bounds on weekends.**

- `src/constants.js:93` — `WEEKDAYS` has only 5 entries: `['ma', 'di', 'wo', 'do', 'vr']` (Mon-Fri)
- `src/utils.js:65` — `formatDateShort()` computes `dayIdx = (d.getDay() + 6) % 7` which produces 0-6 for all 7 days
- On Saturday (idx=5) and Sunday (idx=6), `WEEKDAYS[dayIdx]` is `undefined`
- Fallback: `WEEKDAYS[dayIdx] || '??'` renders literal "??"
- `src/os/shell.js:46-50` — sets header text to `formatDateShort(getToday())`

### When It Happens
Every Saturday and Sunday.

### Files
- `src/constants.js` — WEEKDAYS definition (5 days only)
- `src/utils.js:65` — formatDateShort (fallback to "??")
- `src/os/shell.js:46-50` — header date rendering

### Fix Direction
Expand WEEKDAYS to all 7 days: `['ma', 'di', 'wo', 'do', 'vr', 'za', 'zo']`.

---

## Problem 2: "Hoe voelt je hoofd" Unreadable on Personal Page

### Symptom
The brain-state block's action text ("Hoe voelt je hoofd") has poor contrast/readability.

### Root Cause
**Hardcoded light background colors with theme-dependent text color.**

The block (`src/blocks/brain-state/view.js`) defines hardcoded hex colors per state:

| State | Background (inline) | Text color (token) |
|-------|---------------------|-------------------|
| Green | `#d1fae5` (90% L) | `--color-text` (#1f1f1f light / #e8e8e8 dark) |
| Orange | `#fef3c7` (97% L) | `--color-text` (#1f1f1f light / #e8e8e8 dark) |
| Red | `#fee2e2` (94% L) | `--color-text` (#1f1f1f light / #e8e8e8 dark) |

**Contrast ratios (light mode):**
- Green: ~4.5:1 (borderline AA)
- Orange: ~3.8:1 (fails AA for normal text)
- Red: ~4.2:1 (marginal)

**Dark mode is worse:** Light text (#e8e8e8) on light backgrounds (#d1fae5, #fef3c7, #fee2e2) = completely unreadable. No dark-mode adaptation exists.

### Additional Issues
- Colors are hardcoded in JS, not using theme tokens
- No mode-specific theming applied
- The inline `style="--state-color:..."` pattern bypasses the token system

### Files
- `src/blocks/brain-state/view.js` — hardcoded colors per state
- `src/blocks/brain-state/styles.css` — `.brain-state__action` uses `var(--action-light)` background
- `src/styles/variables.css` — `--color-text` definition (light/dark)

### Fix Direction
- Use darker text color explicitly for the action area (e.g., a dark color that works on all three light backgrounds)
- Or: darken the background colors and use theme-aware token mappings
- Add dark-mode overrides for these background colors

---

## Problem 3: Theme Studio Color Collisions

### Symptom
When a user changes one color in Theme Studio, other colors can clash — creating unreadable combinations. No guardrails prevent this.

### Root Cause
**Full manual control with no harmony or derivation logic.**

Current behavior:
1. User can independently set 8 color values (accent, appBg, blockBg, blockFg, mutedFg, blockBorder, danger, success)
2. Each is applied directly — no relationship between them
3. Only partial WCAG check exists: `checkContrast()` validates blockBg/blockFg and blockBg/mutedFg, but:
   - Does NOT check accent text on accent background
   - Does NOT check text on appBg
   - Does NOT check danger/success against their backgrounds
   - Warnings are displayed but do not prevent saving
4. No harmony rules — user can pick clashing hues freely
5. Presets only set accent + tint/shadow strength; rest uses CSS defaults
   - But if user had previously set blockBg manually, switching presets may not reset it

### Specific Collision Scenarios

| Scenario | What Breaks |
|----------|-------------|
| User sets light accent + light background | Accent buttons invisible |
| User sets dark blockBg + dark blockFg | Text unreadable on surface |
| User picks warm accent + cool success color | Visual discord |
| User changes appBg but not blockBg | Cards blend into background |
| Preset switch doesn't clear manual overrides | Preset polluted by old custom values |

### Missing Capabilities
- No color-wheel harmony (analogous, complementary, triadic)
- No auto-derivation (accent -> button text, border, muted tones)
- No "fix automatically" action when contrast fails
- No per-token validation beyond text/bg pair
- Contrast warnings are passive, not enforced

### Files
- `src/core/themeEngine.js` — `applyTheme()`, `checkContrast()`
- `src/ui/theme-studio.js` — UI controls, warning display
- `src/ui/tokens.css` — semantic aliases (partially derived)

### Fix Direction (Milestone 2)
- Introduce a Theme Model: user edits accent hue + contrast preference; system derives full palette
- Color-wheel harmony rules for suggested palettes
- Active contrast guardrails (auto-fix or block)
- Progressive disclosure: simple defaults, advanced manual with warnings
