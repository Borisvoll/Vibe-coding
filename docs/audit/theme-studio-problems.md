# Theme Studio — Problems Audit

## Issue 1: "??" in Header Date (top-left under BORIS)

**Location:** `src/utils.js:65` → `formatDateShort()`
**Root cause:** Incomplete `WEEKDAYS` array in `src/constants.js:93`

```javascript
// Only 5 entries — missing Saturday and Sunday
export const WEEKDAYS = ['ma', 'di', 'wo', 'do', 'vr'];
```

The `formatDateShort()` function maps `date.getDay()` to a 0-based Monday index:
```javascript
const dayIdx = (d.getDay() + 6) % 7; // 0=Mon, 1=Tue, ..., 5=Sat, 6=Sun
const dayName = WEEKDAYS[dayIdx] || '??';
```

`WEEKDAYS` has indices 0-4 only. On **Saturday** (`dayIdx=5`) and **Sunday** (`dayIdx=6`), the lookup returns `undefined`, triggering the `'??'` fallback.

**Note:** `WEEKDAY_FULL` on line 94 already has all 7 days.

**Rendering chain:**
1. `src/os/shell.js:46` — `formatDateShort(getToday())` called on init
2. Sets `.os-sidebar__date` (desktop) and `.os-shell__date` (mobile) textContent
3. HTML slots in `index.html` lines 59 and 186

**Fix:** Add `'za'` and `'zo'` to `WEEKDAYS` array.

---

## Issue 2: "Hoe voelt je hoofd" Readability (Personal mode)

**Location:** `src/blocks/brain-state/view.js` + `src/blocks/brain-state/styles.css`
**Block ID:** `brain-state`, mounted to `vandaag-hero` in Personal mode only.

### Root causes (multiple compounding issues):

**A. Hardcoded light pastel backgrounds that don't adapt to dark mode**

In `view.js` lines 4-26, the `STATES` object has hardcoded colors:
```javascript
green:  { colorLight: '#d1fae5' }  // light mint
orange: { colorLight: '#fef3c7' }  // light yellow
red:    { colorLight: '#fee2e2' }  // light pink
```

These are applied as inline styles: `style="--action-light:${s.colorLight}"`

- In dark mode, `--color-text` becomes `#e8e8e8` (light)
- Action text uses `color: var(--color-text, #1f2937)` (inherits light color)
- Light text on light pastel background = **unreadable** (~1.2:1 contrast)

**B. Very small font sizes**

- Button labels (Groen/Oranje/Rood): `font-size: var(--font-xs, 0.6875rem)` = **11px**
- Action advice text: `font-size: var(--font-sm, 0.8125rem)` = **13px**
- Both are below comfortable reading size for important content

**C. No theme token integration**

The STATES colors bypass the token system entirely:
- `color: '#10b981'` instead of `var(--color-emerald)`
- `colorLight: '#d1fae5'` instead of `var(--color-emerald-light)`

This means theme changes, presets, and dark mode have no effect on these state colors.

### Contrast analysis (dark mode, green state active):

| Text | Background | Ratio | WCAG AA |
|------|-----------|-------|---------|
| #e8e8e8 (light gray text) | #d1fae5 (mint bg) | ~1.2:1 | FAIL |
| #1f2937 (dark text) | #d1fae5 (mint bg) | ~11:1 | PASS |

The issue manifests whenever the system or user is in dark mode.

---

## Issue 3: Theme Studio Color Clashes

### Problem: Changing one color can make other colors unreadable

**A. No accent-vs-background validation**

`checkContrast()` only validates `blockBg` vs `blockFg`/`mutedFg`. It does NOT check:
- Accent color vs app background
- Accent color vs surface/card background
- Accent text color readability on accent buttons
- Danger/success color visibility
- Mode colors vs custom backgrounds

**B. Derived tokens can become invisible**

- `tintStrength: 0` → all `--accent-soft` tokens become ~0% opacity (invisible)
- Light accent on dark background → subtle derived tokens vanish
- No minimum opacity enforcement

**C. No color harmony system**

- User can pick any combination of 8 independent colors
- No relationship enforcement between colors
- No suggestion of complementary/analogous colors
- Result: jarring, clashing palettes

**D. Preset limitations**

Presets only override `accent`, `tintStrength`, `shadowStrength`:
- Other 5 color values stay at `null` (CSS default)
- No preset has custom background/text colors
- Switching presets doesn't fix user-broken background/text combos

**E. Dark mode detection edge cases**

- `applyTheme()` checks `data-theme` and `prefers-color-scheme`
- If user's system toggles mid-session, derived token calculations may be stale
- No listener for `prefers-color-scheme` changes to re-apply theme

**F. Warning UX is passive**

- Warnings show ratio text but offer no "Fix automatically" action
- No visual indicator on the offending color picker
- Easy to ignore or miss
