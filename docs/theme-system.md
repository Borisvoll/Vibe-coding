# Theme System — Implementation Plan

> Goal: one source of truth for `"light" | "dark" | "system"`, reliable
> Tailwind dark mode, no duplicated toggle state.

---

## Current State (Problems)

| Problem | Location |
|---------|---------|
| `preferDark` stored as `null / true / false` not as a human-readable string | `src/core/themeEngine.js` |
| Dark mode applied via both `@media` query AND `[data-theme]` attribute — two separate code paths that can diverge | `variables.css` + `themeEngine.js` |
| No `darkMode` config in Tailwind — `dark:` utilities would not activate | (Tailwind not yet configured) |
| If `preferDark: null` (system), the `[data-theme]` attribute is NOT set, but Tailwind `darkMode: ['selector', ...]` requires the attribute to be present | `themeEngine.js:applyTheme()` |
| Settings panel has one theme toggle; future blocks/panels might add secondary controls with no sync guarantee | `src/blocks/settings-panel.js` |

---

## Target Architecture

```
User preference
  "light" | "dark" | "system"
       ↓
  stored in IDB (boris_theme.preferDark → string)
       ↓
  ThemeEngine.applyTheme()
    if "system": read matchMedia → resolve to "light" or "dark"
    set data-theme="light" or data-theme="dark" on <html>
    ALWAYS set the attribute (never remove it)
       ↓
  CSS vars cascade via [data-theme="dark"] / [data-theme="light"]
  Tailwind dark: utilities activate via selector [data-theme="dark"]
       ↓
  OS change event (matchMedia): re-run applyTheme() when in "system" mode
```

**Key principle:** `data-theme` is always set to either `"light"` or `"dark"`.
Never absent. The `@media prefers-color-scheme` block in `variables.css` becomes
a fallback for pre-JS load only — the JS always wins once it runs.

---

## File-Level Changes

### 1. `src/core/themeEngine.js`

**Change: internal `preferDark` representation**

```
Before: preferDark: null | true | false
After:  preferDark: 'system' | 'light' | 'dark'
```

Migration in `initTheme()`: read old value, convert:
```javascript
// Migration shim (one-time, in initTheme):
if (stored.preferDark === null)  stored.preferDark = 'system';
if (stored.preferDark === true)  stored.preferDark = 'dark';
if (stored.preferDark === false) stored.preferDark = 'light';
```

**Change: `applyTheme()` — always set `data-theme`**

```javascript
function applyTheme() {
  const { preferDark } = currentTheme;
  let resolvedDark;

  if (preferDark === 'dark') {
    resolvedDark = true;
  } else if (preferDark === 'light') {
    resolvedDark = false;
  } else {
    // 'system'
    resolvedDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  // ALWAYS set — never absent. Tailwind needs the attribute present.
  document.documentElement.setAttribute('data-theme', resolvedDark ? 'dark' : 'light');

  // ... rest of token application
}
```

**Change: `matchMedia` listener — only re-applies in system mode**

```javascript
systemDarkQuery.addEventListener('change', () => {
  if (currentTheme.preferDark === 'system') {
    applyTheme();
  }
});
```

**Change: export a `getPreference()` helper**

```javascript
export function getThemePreference() {
  return currentTheme.preferDark; // 'light' | 'dark' | 'system'
}
```

All UI toggles read from `getThemePreference()` so they stay in sync with
the stored value without querying IDB.

---

### 2. `src/styles/variables.css`

**Change: remove `@media` dark block, keep only `[data-theme="dark"]`**

The `@media (prefers-color-scheme: dark)` block and the `[data-theme="dark"]`
block are currently duplicated (identical). Once JS always sets `data-theme`,
the media query block is redundant.

Keep only:
```css
/* Pre-JS load flash prevention — JS overrides this on DOMContentLoaded */
@media (prefers-color-scheme: dark) {
  :root { color-scheme: dark; }
}

/* Actual dark tokens — set by ThemeEngine */
[data-theme="dark"] { ... }
[data-theme="light"] { ... }  /* explicit light tokens — prevents flash */
```

The `[data-theme="light"]` block is new — it sets light values explicitly so
there is no unspecified state. This prevents FOUC if JS is slow.

---

### 3. `tailwind.config.js` (new file)

```javascript
export default {
  content: ['./index.html', './src/**/*.js'],
  darkMode: ['selector', '[data-theme="dark"]'],
  theme: { extend: { /* see tailwind-guidelines.md */ } },
};
```

This is the only change needed for Tailwind `dark:` utilities to work.
Because JS always sets `data-theme` to `"light"` or `"dark"`, Tailwind
will always have a reliable selector to target.

---

### 4. `src/blocks/settings-panel.js`

**Change: read preference from `getThemePreference()`, not from IDB**

```javascript
import { getTheme, setTheme, getThemePreference } from '../core/themeEngine.js';

// On render:
const pref = getThemePreference(); // 'light' | 'dark' | 'system'
// Highlight the matching button in the toggle group
```

**Change: toggle group UI → 3 options, not 2**

Replace the current boolean toggle with a 3-state button group:
```
[ System ]  [ Light ]  [ Dark ]
```

On click: `setTheme({ preferDark: 'light' })` etc.

---

### 5. No other files need changes

- `src/main.js`: no change — `initTheme()` is still called the same way
- All blocks: no change — they use CSS vars which switch automatically
- `src/ui/theme-studio.js`: update to use 3-state toggle same as settings panel

---

## Single Source of Truth Guarantee

```
IDB boris_theme.preferDark  ← the stored value ("light" | "dark" | "system")
         ↓
currentTheme in memory      ← in-memory cache (only in themeEngine.js)
         ↓
getThemePreference()         ← read-only accessor for UI components
setTheme({ preferDark })     ← the only write path
```

No component writes to IDB directly. No component reads from IDB directly.
All reads go through `getThemePreference()`. All writes go through `setTheme()`.

---

## Dark Mode Testing Checklist

After implementation, verify on each route:

| Route | Test |
|-------|------|
| Dashboard | Cards, mode hero, sidebar background |
| Vandaag | Collapsible sections, task list, search bar dropdown |
| Inbox | List items, tag pills, action buttons |
| Lijsten | List rows, checkboxes, add-item input |
| Planning | Project detail tabs, timeline, breadcrumb |
| Projects | Hub cards, tab bar |
| Instellingen | Theme toggle (should show current state), accent picker |
| Curiosity | Word cloud, resurface card |
| Command palette | Overlay, result items, keyboard highlight |
| Morning flow | Modal backdrop, outcome inputs |
| Toast notifications | All three types (info/success/error) |

---

## FOUC Prevention

Insert this inline script in `<head>` of `index.html` (before any CSS loads):

```html
<script>
  // Prevent flash of wrong theme before JS fully loads
  (function() {
    try {
      const theme = JSON.parse(localStorage.getItem('boris_theme_cache') || '{}');
      const pref = theme.preferDark || 'system';
      const dark = pref === 'dark' || (pref === 'system' &&
        window.matchMedia('(prefers-color-scheme: dark)').matches);
      document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    } catch(e) {}
  })();
</script>
```

`themeEngine.js` will also write to `localStorage.setItem('boris_theme_cache', ...)`
alongside the IDB write, so this script has fast synchronous access.
