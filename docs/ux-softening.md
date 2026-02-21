# UX Softening — From Walls to Guardrails

**Date:** 2026-02-21
**Milestone:** D (UX Softening + History)

---

## Problem

Several UI patterns in BORIS were psychologically oppressive for daily use:

1. **Task cap disables input** — hits the cap and you're locked out, no override
2. **Friday banner has no dismiss/snooze** — inescapable weekly nagging
3. **Cockpit always visible** — no way to simplify the morning routine
4. **Default preset is "alles"** — new users see every block, overwhelming
5. **Too many sections open** — Vandaag page feels dense on first visit
6. **No history browsing** — can't look back at past daily entries

## Changes

### D.1 — Task Cap: Warning Instead of Block

**Before:** `input.disabled = true` when active tasks >= cap
**After:** Input stays enabled. Gentle italic warning: "Je hebt al 3/3 taken — focus is kracht"

Files: `src/blocks/tasks/view.js`, `src/blocks/tasks/styles.css`, `src/blocks/school-today/view.js`, `src/blocks/school-today/store.js`

### D.2 — Friday Banner: Snooze & Disable

**Before:** Close button removes banner until next Friday
**After:** Two snooze options + settings disable:
- "Volgende week" — snooze 7 days (`friday_banner_snoozed_until`)
- "Volgende maand" — snooze 30 days
- Disable entirely via `friday_banner_disabled` IDB setting

Files: `src/os/shell.js`, `src/blocks/styles.css`

### D.3 — Morning Flow Configuration

**Setting:** `morning_flow` in IDB settings
- `null` / `'gentle'` (default): current behavior, cockpit visible
- `'manual'`: cockpit hidden behind "Toon dagchecklist" toggle button

Files: `src/blocks/daily-cockpit/view.js`, `src/blocks/daily-cockpit/styles.css`

### D.4 — Default Preset Per Mode

**Before:** New users get `'alles'` preset (every block enabled)
**After:** First-run preset matches initial mode:
- School → `'school'` preset
- BPV → `'bpv'` preset
- Personal → `'persoonlijk'` preset

Only applies if `boris_active_preset` is not yet set. Existing users unaffected.

Files: `src/core/modulePresets.js`, `src/main.js`

### D.5 — Progressive Disclosure Defaults

**Before:** `tasks`, `projects`, `capture` all default open
**After:** Only `tasks` and `capture` default open. Projects section starts collapsed.

User overrides persist per mode in localStorage and always take precedence.

Files: `src/os/shell.js`

### D.6 — History Browser

New collapsible "Geschiedenis" section at bottom of Vandaag page:
- Date filter buttons: 7 days / 30 days / Alles
- Paginated list via `getDailyEntriesPage()` from Milestone A
- Each entry shows: date, mode badge, Top 3 preview, todo count
- Click to expand: view-only outcomes, todos, notes
- "Laad meer" button for infinite scroll

Files: `src/blocks/history-browser/` (new), `index.html`, `src/os/shell.js`, `src/blocks/registerBlocks.js`

## Design Principles Applied

- **Agency over automation** — user can always override, nothing is locked
- **Ambient not aggressive** — warnings are italic and muted, not red alerts
- **Progressive disclosure** — show less by default, let user open more
- **Respect attention** — fewer sections competing for focus on first visit
- **No data loss** — history is view-only, original entries untouched
