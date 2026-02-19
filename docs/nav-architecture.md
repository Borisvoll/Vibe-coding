# Navigation Architecture — BORIS OS

## Principles

### 1. Stable Navigation
The sidebar (desktop) / tab bar (mobile) is **mode-independent**. Navigation items never change when the user switches between School, Personal, and BPV modes. Mode affects *content*, not *navigation structure*.

### 2. Dashboard as Home
The Dashboard is the central cockpit — the first item in the sidebar and always reachable. Non-dashboard tabs show a subtle "← Dashboard" breadcrumb link in the section title area.

### 3. Mode Affects Content, Not Navigation
When a user switches mode (e.g. School → Personal):
- Sidebar items remain identical
- Section titles update with mode badge ("Vandaag — Persoonlijk 🌱")
- Block content changes (mode-specific blocks mount/unmount)
- Accent colors shift (purple → emerald)
- The sidebar active indicator color changes to match the mode

### 4. BPV is a Mode, Not a Destination
BPV does not have its own sidebar navigation item. BPV content is accessible via:
- Dashboard widget deep links (when BPV data exists)
- BPV-only blocks that appear on Vandaag/Dashboard when mode=BPV
- Legacy pages via hash routes

## Sidebar Items

| # | Label | Tab ID | Icon | Badge | Notes |
|---|-------|--------|------|-------|-------|
| 1 | Dashboard | `dashboard` | Home | — | Always first, the "home cockpit" |
| 2 | Vandaag | `today` | Sun | — | Today's work: outcomes, todos, blocks |
| 3 | Inbox | `inbox` | Inbox | Unprocessed count | GTD capture + processing |
| 4 | Planning | `planning` | Calendar | — | Week/month planning (future) |
| — | *(divider)* | — | — | — | Separates primary from system |
| 5 | Instellingen | `settings` | Gear | — | Theme, mode, accent, density |
| 6 | Legacy | — | Arrows | — | Switch to legacy interface |

## Responsive Behavior

| Viewport | Navigation | Mode Picker |
|----------|-----------|-------------|
| < 768px (mobile) | Horizontal tab bar at top | Full-screen bottom sheet |
| ≥ 768px (tablet/desktop) | Fixed left sidebar (200px) | Centered modal |

On mobile, the sidebar is hidden and the horizontal tab bar serves the same purpose with the same tab IDs and `setActiveTab()` logic.

## Implementation

### HTML Structure
```
.os-shell
├── .os-sidebar (hidden on mobile)
│   ├── .os-sidebar__brand (BORIS + date)
│   ├── .os-sidebar__nav (primary items)
│   ├── .os-sidebar__divider
│   ├── .os-sidebar__system (settings, legacy)
│   └── .os-sidebar__mode (mode pill at bottom)
├── .os-shell__header--mobile (hidden on desktop)
├── .os-nav--mobile (hidden on desktop)
└── .os-shell__content (pushed right by 200px on desktop)
```

### CSS Key Classes
- `.os-sidebar__item` — Nav button with icon + label
- `.os-sidebar__item--active` — Mode-colored left accent bar (4px)
- `.os-sidebar__badge` — Inbox count badge (auto-updates)
- `.os-section__home-link` — "← Dashboard" breadcrumb (hidden on dashboard tab)

### Tab System
Both sidebar and mobile nav use the same `setActiveTab(tabId)` function. Clicking any nav item (sidebar or mobile tab) calls `setActiveTab()` which:
1. Shows/hides sections via `[data-os-section]` hidden attribute
2. Sets `aria-pressed` on all `[data-os-tab]` buttons
3. Toggles `.os-sidebar__item--active` class
4. Shows/hides "← Dashboard" breadcrumb links
