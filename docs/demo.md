# Inbox Processing — Demo Script

Manual walkthrough to verify the Inbox screen and processing flow.

---

## Prerequisites

1. `npm run dev` is running
2. Open the app in browser
3. BORIS OS is active (feature flag `enableNewOS` = true, which is the default)

---

## 1. Quick Capture from Today Page

1. Go to the **Vandaag** tab (should be active by default)
2. Find the **Inbox** card
3. Type `Test gedachte` in the capture field and press Enter
4. Type `https://example.com` and press Enter
5. Click the count badge to expand — you should see both items
6. Verify the link item shows type `Link` and the thought shows `Gedachte`

**Expected:** Count badge shows `2`, items are listed newest-first.

---

## 2. Open Inbox via Quick Action

1. On the **Vandaag** tab, find the **Inbox** card
2. Click the **Verwerk** button in the card header
3. The app should switch to the **Inbox** tab

**Expected:** Inbox tab is now active, showing the full inbox screen with your 2 items.

---

## 3. Open Inbox via Ctrl+I

1. Press `Ctrl+I` from any tab
2. The Inbox tab should activate and the capture input should be focused

**Expected:** Capture input has focus, ready for typing.

---

## 4. Keyboard Navigation

1. Press `J` to move selection down (to the second item)
2. Press `K` to move selection back up (to the first item)
3. The selected item should have a highlighted border (accent color)

**Expected:** Blue/accent border moves between items. Arrow keys also work.

---

## 5. Process Item as Task (T)

1. Select an item with J/K
2. Press `T` — the item should be instantly promoted to a task
3. Check the **Vandaag** tab — the new task should appear in the Tasks block

**Alternative:** Press `Enter` to open the processing panel, select a mode (BPV/School/Persoonlijk), then click "Taak aanmaken".

**Expected:** Item disappears from inbox, count decreases, task appears in Tasks block.

---

## 6. Process Item as Reference (R)

1. Add a new item: `https://docs.example.com/reference`
2. Select it and press `R`
3. The item should be archived and saved to the reference store

**Expected:** Item disappears from inbox, reference entry created (verify in DevTools > Application > IndexedDB > `reference` store).

---

## 7. Archive Item (A)

1. Add a new item: `Niet meer nodig`
2. Select it and press `A`
3. The item should be archived (still in DB but with status `archived`)

**Expected:** Item disappears from inbox list. In IndexedDB, `os_inbox` shows the item with `status: "archived"`.

---

## 8. Delete Item (D)

1. Add a new item: `Verwijder dit`
2. Select it and press `D`
3. The item should be permanently removed

**Expected:** Item gone from inbox list AND from IndexedDB entirely.

---

## 9. Processing Panel (Enter)

1. Add a new item: `Panel test`
2. Select it and press `Enter`
3. A processing panel appears below the list showing:
   - Item text
   - Mode selector tags (BPV / School / Persoonlijk)
   - "Taak aanmaken" button
   - "Naar naslagwerk" button
   - "Archiveer" and "Verwijder" buttons
   - "Annuleer (Esc)" button
4. Click a different mode tag, then click "Taak aanmaken"
5. Verify the task was created with the selected mode

**Expected:** Panel opens/closes cleanly, actions work correctly.

---

## 10. Empty State

1. Process all remaining items (use T/A/D)
2. When inbox is empty, you should see: "Inbox is leeg — goed bezig!"
3. The hint text shows the Ctrl+I shortcut

**Expected:** Clean empty state with encouraging message.

---

## 11. Nav Badge

1. Check the **Inbox** button in the top navigation
2. When items exist, a small accent-colored badge shows the count
3. When inbox is empty, the badge is hidden

**Expected:** Badge updates in real-time as items are added/processed.

---

## 12. Dark Mode

1. Go to Settings, switch theme to Dark
2. Navigate to the Inbox tab
3. All elements should use dark theme colors (no white flashes, no hardcoded hex)

**Expected:** Full dark mode support, processing panel included.

---

## Verification Checklist

- [ ] Capture from Today page works
- [ ] Capture from Inbox screen works
- [ ] Ctrl+I opens inbox and focuses input
- [ ] "Verwerk" button on Today page opens inbox
- [ ] J/K navigation works
- [ ] T = instant promote to task
- [ ] R = save to reference
- [ ] A = archive
- [ ] D = delete
- [ ] Enter = open processing panel
- [ ] Esc = close processing panel
- [ ] Mode selection in processing panel works
- [ ] Nav badge updates correctly
- [ ] Empty state displays correctly
- [ ] Dark mode looks correct
- [ ] All 234 tests pass (`npm test`)

---

---

# BPV Tracker — Demo Script

Manual walkthrough for the BPV quick-log and weekly overview blocks.

## Prerequisites

1. `npm run dev` is running
2. Open the app in browser
3. Switch to **BPV** mode (click the mode pill → choose BPV 🏢)

---

## 13. Quick Log — Log Today's Hours

1. On the **Vandaag** tab, find the **Snel loggen** card (appears before the weekly overview)
2. Verify the date shown is today
3. The day-type buttons show: Gewerkt · Ziek · Afwezig · Vrij/Feestdag
4. "Gewerkt" should be active by default (blue ring)
5. Enter: **Start** = `08:00`, **Einde** = `16:45`, **Pauze** = `45`
6. The "Netto:" display should update to **8u** (525 min − 45 min = 480 min)
7. Enter a note: `CNC draaiwerk, krukas gefreesd`
8. Click **Opslaan**

**Expected:** Status shows "Opgeslagen ✓". The weekly overview progress bar updates.

---

## 14. Quick Log — Non-work Day

1. In the **Snel loggen** card, click **Ziek**
2. The time fields should hide (not relevant for sick days)
3. Click **Opslaan**

**Expected:** Entry saved without time data; net hours = 0u.

---

## 15. Quick Log — Upsert (Edit Same Day)

1. Click **Gewerkt** again and change End to `17:30`, Break to `30`
2. Netto should update to **9u** (570 − 30 = 540 min)
3. Click **Opslaan**

**Expected:** The existing entry for today is updated (same ID). No duplicate created.

---

## 16. Weekly Overview — Progress Bar

1. Find the **Weekoverzicht BPV** card just below the quick-log
2. The week label shows the current ISO week (e.g. `2026-W08`)
3. The progress bar fills proportionally to logged hours (≥80% = green, 50–79% = amber, <50% = red)
4. The label shows e.g. `8u / 40u (20%)`

**Expected:** Bar updates immediately after saving in the quick-log card.

---

## 17. Weekly Overview — Day Grid

1. Look at the 5-day grid (ma di wo do vr)
2. Days with hours logged show the day type icon (✓ for work, 🤒 for sick)
3. Days with logbook entries show 📝 indicator
4. Empty days are faded

**Expected:** Today's entry is reflected in the correct day column.

---

## 18. Weekly Overview — Week Navigation

1. Click **‹** (previous week) — the label changes to the prior week
2. Click **›** twice to go to next week — should show an empty week (all 5 days faded)
3. Navigate back to current week

**Expected:** Navigation works in both directions without errors.

---

## 19. Export — CSV

1. Click the **CSV** button in the weekly overview card header
2. Your browser downloads `bpv-uren.csv`
3. Open the file — it should contain:
   - Header row: `datum,week,type,start,einde,pauze_min,netto_min,netto_uren,notitie,omschrijving,tags`
   - One row per logged day, sorted by date

**Expected:** Valid CSV, opens correctly in Excel/Numbers/LibreOffice.

---

## 20. Export — JSON

1. Click the **JSON** button
2. Browser downloads `bpv-uren.json`
3. Open the file — it should be a valid JSON array with objects containing `date`, `type`, `netHours`, `tags`, etc.

**Expected:** `JSON.parse(fileContents)` succeeds; array is sorted by `date`.

---

## BPV Verification Checklist

- [ ] Mode pill shows BPV mode is active (blue dot)
- [ ] Snel loggen card appears on Vandaag tab in BPV mode
- [ ] Time fields hide when switching to Ziek/Afwezig/Vrij
- [ ] Net hours calculate correctly (end − start − break)
- [ ] Upsert: saving twice for the same date keeps one record
- [ ] Weekoverzicht card appears below quick-log
- [ ] Progress bar reflects saved hours
- [ ] Day grid shows correct icons per day
- [ ] Week navigation works (‹ ›)
- [ ] CSV export downloads and is valid
- [ ] JSON export downloads and parses without errors
- [ ] Dark mode looks correct in both new blocks
- [ ] All 234 tests pass (`npm test`)

---

---

# Mode Switching — Demo Script

Manual walkthrough to verify mode switching works visibly in BORIS OS.

## Prerequisites

1. `npm run dev` is running
2. Open the app in browser
3. BORIS OS is active (default)

---

## M1. Mode Picker Opens

1. Click the **mode pill** in the header (shows current mode name + colored dot)
2. A modal picker appears with three mode cards: **School**, **Persoonlijk**, **BPV**
3. The currently active mode has a colored checkmark

**Expected:** Modal opens with spring animation (slides up on mobile, centered on desktop). Backdrop blurs.

---

## M2. Switch to School Mode

1. Click **School** 📚 in the mode picker
2. Observe:
   - Mode pill updates to "School" with purple dot
   - Purple ambient wash pulses across the screen (600ms, subtle 8% opacity)
   - Today blocks re-render with staggered entrance animation
   - **School Dashboard** card appears (Volgende actie + deadlines)
   - **School Today** block appears
   - BPV-only blocks (Snel loggen, Weekoverzicht) disappear

**Expected:** Clear visible change — school-specific blocks animate in, BPV blocks gone.

---

## M3. Switch to Personal Mode

1. Click the mode pill again → click **Persoonlijk** 🌱
2. Observe:
   - Mode pill updates to "Persoonlijk" with emerald dot
   - Emerald wash pulses
   - **Personal Dashboard** card appears (wellbeing + habits)
   - **Personal Today** block appears
   - School-specific blocks disappear

**Expected:** Content area clearly changes. Blocks have entrance animation.

---

## M4. Switch to BPV Mode

1. Click mode pill → click **BPV** 🏢
2. Observe:
   - Mode pill updates to "BPV" with blue dot
   - Blue wash pulses
   - **Snel loggen** and **Weekoverzicht** cards appear
   - Personal/School blocks disappear

**Expected:** BPV-specific blocks visible, others gone.

---

## M5. New User Default

1. Clear localStorage (`localStorage.clear()` in DevTools console)
2. Refresh the page
3. The mode picker should auto-open after 400ms
4. Default mode is **School** (not BPV)

**Expected:** School mode is active by default. Mode picker shows School first in the list.

---

## Mode Switching Verification Checklist

- [ ] Mode pill label + dot update on switch
- [ ] Ambient wash animation plays on each switch
- [ ] School blocks appear only in School mode
- [ ] Personal blocks appear only in Personal mode
- [ ] BPV blocks appear only in BPV mode
- [ ] Shared blocks (tasks, inbox, projects) appear in all modes
- [ ] Block entrance animation visible (staggered fade-in)
- [ ] Default mode is School for new users
- [ ] Persisted mode survives page reload
- [ ] All 234 tests pass (`npm test`)

---

---

# School Dashboard — Demo Script

Manual walkthrough for the School mode dashboard block.

## Prerequisites

1. `npm run dev` is running
2. Switch to **School** mode (click the mode pill → choose School 📚)

---

## 21. School Dashboard — First Look

1. Go to the **Vandaag** tab
2. The first card should be **School Dashboard** (order 6, appears at the top)
3. You should see four sections:
   - **Volgende actie** — your next School task
   - **Aankomende deadlines** — upcoming milestones/tasks within 14 days
   - **BPV week** — compact progress bar showing hours logged this BPV week
   - **Schoolprojecten** — active projects tagged School

**Expected:** All four sections visible (or "geen" empty states when no data).

---

## 22. School Dashboard — Add a Next Action

1. Find the **Taken** block on the Vandaag tab
2. Add a task: `H3 samenvatting schrijven`
3. The **School Dashboard** card at the top should now show it under **Volgende actie**

**Expected:** Task shows with an empty circle button on the left.

---

## 23. School Dashboard — Mark Action Done

1. Click the circle button next to the next action
2. The task is marked done and disappears from the dashboard
3. If you had a second task, it becomes the new next action

**Expected:** One-click done; dashboard refreshes immediately.

---

## 24. School Dashboard — Upcoming Deadlines

1. Add a milestone in the **Mijlpalen** block with a dueDate 3 days from now
2. The deadline should appear in **Aankomende deadlines**
3. The urgency badge shows amber (3–7 days) or red (0–2 days)

**Expected:** Sorted by date; items beyond 14 days excluded; max 5 shown.

---

## 25. School Dashboard — BPV Week Bar

1. Look at the **BPV week** row (visible in School mode)
2. If you logged BPV hours via the BPV quick-log, the bar fills proportionally
3. The label shows e.g. `8u / 40u`

**Expected:** Live BPV progress visible from School mode — no mode switch needed.

---

## 26. School Dashboard — School Projects

1. In the **Projects** block, add a project: `Eindopdracht netwerken` with mode School
2. The project should appear as a purple chip in the School Dashboard

**Expected:** Active School projects appear as compact purple chips.

---

## School Dashboard Verification Checklist

- [ ] School Dashboard appears at top of Vandaag in School mode
- [ ] Does NOT appear in BPV or Personal mode
- [ ] "Volgende actie" shows first non-done School task by date
- [ ] Marking done removes it and promotes next task
- [ ] Empty state shows "Geen openstaande acties" when all done
- [ ] Future-dated tasks (within 14 days) appear in deadlines
- [ ] Deadlines beyond 14 days excluded
- [ ] Urgency badge: red 0–2 days, amber 3–7, grey 8+
- [ ] Max 5 deadlines shown
- [ ] BPV week progress bar shows correct percentage
- [ ] School projects appear as purple chips
- [ ] All 244 tests pass (`npm test`)

---

---

# Main Dashboard — Demo Script

Manual walkthrough for the cross-mode Dashboard tab with 6 colorful widgets.

## Prerequisites

1. `npm run dev` is running
2. Open the app in browser
3. BORIS OS is active (default)

---

## D1. Dashboard Tab — First Look

1. Click the **Dashboard** tab in the navigation
2. You should see a 2-column grid (desktop) or 1-column (mobile) with 6 widget cards:
   - **Vandaag** (amber) — today snapshot
   - **Deze week** (purple) — week focus
   - **Projecten** (cyan) — projects pulse
   - **BPV** (blue) — hours progress
   - **Verken** (rose) — curiosity prompt
   - **Snel vastleggen** (emerald) — quick capture

**Expected:** All 6 widgets visible with colored icon circles and loading states that fill with data.

---

## D2. Vandaag Widget — Today Snapshot

1. Look at the **Vandaag** widget (top-left)
2. It shows: first outcome text (or "Nog geen outcomes"), task count (e.g. "2/5 taken"), inbox count
3. Click the widget → navigates to the **Vandaag** tab

**Expected:** Task count reflects mode-filtered tasks. Inbox count is global.

---

## D3. Deze Week Widget — Week Focus

1. Look at the **Deze week** widget (top-right)
2. It shows: completed task count, habits completion (e.g. "2/3 gewoontes"), reflection days
3. Click the widget → navigates to the Vandaag tab and scrolls to weekly review

**Expected:** Data matches the Weekly Review block content.

---

## D4. Projecten Widget — Projects Pulse

1. Look at the **Projecten** widget
2. It shows: active project count, at-risk count (projects without next action), up to 3 project names with mode chips
3. Click → navigates to Vandaag tab and scrolls to projects block

**Expected:** Projects from ALL modes shown (cross-mode synopsis). At-risk projects marked with red "!" badge.

---

## D5. BPV Widget — Hours Progress

1. Look at the **BPV** widget
2. It shows: formatted hours (e.g. "8u / 40u"), percentage, color-coded progress bar
3. Progress bar: green ≥80%, amber ≥50%, red <50%
4. Last logbook date shown (or "Nog geen logboek deze week")
5. Click → navigates to legacy BPV pages (`#hours`)

**Expected:** Hours reflect the current week's BPV data regardless of active mode.

---

## D6. Verken Widget — Curiosity Prompt

1. Look at the **Verken** widget (rose accent)
2. It shows a rotating curiosity prompt in italic (e.g. "Bekijk 1 ding dat je deze week leerde")
3. Click → navigates to the relevant section (inbox, planning, reflectie, or today depending on prompt)

**Expected:** Different prompt each time the dashboard loads.

---

## D7. Snel Vastleggen Widget — Quick Capture

1. Look at the **Snel vastleggen** widget (emerald accent)
2. Type `Dashboard test item` in the input and press Enter (or click +)
3. A "Vastgelegd!" confirmation appears briefly
4. Switch to the **Inbox** tab — the new item should be there

**Expected:** Item captured with current mode tag. Input clears after submit. Confirmation fades after 1.5s.

---

## D8. Mode Switch — Dashboard Updates

1. On the Dashboard tab, note the widget values
2. Switch mode (e.g. School → BPV) via the mode pill
3. The section title updates: "Dashboard — BPV 🏢"
4. The **Vandaag** widget refreshes with BPV-filtered task counts
5. All widgets briefly show updated data

**Expected:** Section title badge changes color + label. Widget data refreshes reactively.

---

## D9. Responsive Layout

1. On desktop (≥600px): widgets display in a 2-column grid
2. Resize browser to mobile width (<600px): widgets stack in 1 column
3. All widgets remain readable and touch-friendly

**Expected:** Clean responsive transition, no overflow or clipping.

---

## D10. Dark Mode

1. Go to Settings → switch theme to Dark
2. Navigate to the Dashboard tab
3. All widgets use dark theme colors (surface, border, text)
4. Icon circles adapt. Progress bar colors work in dark.

**Expected:** Full dark mode support. No white flashes or hardcoded colors.

---

## Dashboard Verification Checklist

- [ ] Dashboard tab shows 6 widgets in responsive grid
- [ ] Vandaag widget: shows outcomes, task count, inbox count
- [ ] Deze week widget: shows completed tasks, habits, reflection days
- [ ] Projecten widget: shows cross-mode projects with mode chips
- [ ] BPV widget: shows hours progress bar with correct color coding
- [ ] Verken widget: shows rotating curiosity prompt
- [ ] Snel vastleggen: captures to inbox with mode tag
- [ ] Capture input NOT recreated on event refresh (type → switch mode → text preserved)
- [ ] Widget click deep-links work (today, projects, BPV, etc.)
- [ ] Mode switch updates section title badge + refreshes widget data
- [ ] Responsive: 2-col desktop, 1-col mobile
- [ ] Dark mode fully supported
- [ ] All 244 tests pass (`npm test`)

---

## Daily Page — Mode-Aware Verification

### Daily Todos — Mode Isolation

1. Switch to **School** mode (mode picker in header)
2. Go to **Vandaag** tab
3. Find the **Taken 📚** card
4. Add a todo: type `Wiskunde opgave 3` and press Enter
5. Verify it appears in the list with an unchecked circle (purple accent)
6. Check the box — verify item shows strikethrough and counter updates (e.g. `1/1`)

**Expected:** Todo saved, done state persists on page reload.

---

### Daily Todos — Mode Isolation Check

1. Still on **Vandaag** tab with School todo visible
2. Switch to **Persoonlijk** mode
3. **Expected:** Taken card is now empty (Personal has its own todo list)
4. Add a todo: `Sporten`
5. Switch back to **School** mode
6. **Expected:** `Wiskunde opgave 3` is back — School list was preserved

---

### Top 3 Outcomes — Mode-Aware

1. In **School** mode, find the **Top 3 vandaag 📚** card
2. Type `Wiskunde hfst 4 afronden` in slot 1 — tab or click away (auto-saves)
3. Switch to **Persoonlijk** mode
4. **Expected:** Slot 1 is empty (Personal has its own outcomes)
5. Type `30 min mediteren` in slot 1 for Personal
6. Switch back to School — `Wiskunde hfst 4 afronden` is still there

---

### Notes — Mode-Aware

1. In **School** mode, find the **Notitie** card
2. Type a short note — auto-saves after 500ms
3. Verify character counter shows e.g. `24/500`
4. Switch to **Persoonlijk** — note field is empty (separate per mode)
5. At 425+ characters: counter turns amber (approaching limit)

---

### Acceptance Checklist

- [ ] School todos are invisible in Personal mode and vice versa
- [ ] BPV todos are invisible in School/Personal
- [ ] Outcomes persist per mode+date independently
- [ ] Notes auto-save (no save button needed)
- [ ] Notes capped at 500 characters (counter shows, textarea enforces)
- [ ] Todo check/uncheck works, counter updates
- [ ] Delete button appears on hover, removes todo
- [ ] All 274 tests pass (`npm test`)

---

---

# Visual System & Easter Egg — Demo Script

## Prerequisites

1. `npm run dev` is running
2. Open the app in browser
3. BORIS OS is active (default)

---

## V1. Card Hover Shadow

1. Go to the **Vandaag** tab
2. Hover over any block card (outcomes, todos, notes)
3. A subtle shadow should appear on hover

**Expected:** Cards have smooth shadow transition on hover. No shadow at rest.

---

## V2. No Hardcoded Colors in Dark Mode

1. Go to Settings → switch theme to Dark
2. Navigate through all tabs
3. Check: no white text on white backgrounds, no `#fff` flashes
4. All pill badges, check circles, and delete buttons use proper dark mode colors

**Expected:** Full dark mode support everywhere. Colored elements use CSS variables.

---

## V3. Pill Badges Use var(--radius-full)

1. Look at mode pills, urgency badges, habit chips, sent badges
2. All should have consistent fully-rounded corners
3. No visual differences between different pill types

**Expected:** Consistent pill radius across all components.

---

## V4. Balatro Easter Egg

1. From any page, type `balatro` on your keyboard (no input field focused needed)
2. A full-page overlay appears with:
   - Dark purple/blue swirl background (rotating)
   - Faint CRT scanlines
   - 5 playing cards with spring animation entrance
   - Floating purple particles
   - "BALATRO" title pulsing at the bottom
3. Hover over cards — they lift and tilt
4. Click anywhere or press **Escape** to dismiss
5. Overlay fades out smoothly

**Expected:** Smooth entrance, interactive cards, clean dismiss.

---

## Visual System Verification Checklist

- [ ] `.os-mini-card` padding matches legacy BPV (20px)
- [ ] Cards have hover shadow effect
- [ ] No `999px` values in any block CSS (all use `var(--radius-full)`)
- [ ] No hardcoded `#fff` in block CSS
- [ ] No hardcoded `#ef4444` or `#f59e0b` in block CSS
- [ ] Dark mode renders correctly across all blocks
- [ ] Balatro easter egg triggers on typing "balatro"
- [ ] Balatro dismisses on click or Escape
- [ ] All tests pass (`npm test`)

---

---

# Stable OS Sidebar — Demo Script

## Prerequisites

1. `npm run dev` is running
2. Open the app in browser at desktop width (≥768px)
3. BORIS OS is active (default)

---

## S1. Sidebar Visibility

1. Open the app at ≥768px width
2. A **vertical sidebar** should appear on the left (200px wide)
3. Items: Dashboard (home icon), Vandaag (sun), Inbox (inbox), Planning (calendar), divider, Instellingen (gear), Legacy

**Expected:** Sidebar is visible with all 6 items + divider. Mobile header/tabs are hidden.

---

## S2. Sidebar Navigation

1. Click each sidebar item in sequence: Dashboard → Vandaag → Inbox → Planning → Instellingen
2. The active item gets a **4px mode-colored left accent bar**
3. The content area switches to match

**Expected:** Same behavior as old tab navigation. Active item is highlighted with mode color.

---

## S3. Mode Switch Does NOT Change Sidebar

1. Open the mode picker (click mode pill at bottom of sidebar)
2. Switch from School → Personal → BPV
3. Observe the sidebar

**Expected:** Sidebar items remain identical. Only the accent color changes. No items appear or disappear.

---

## S4. Dashboard Breadcrumb

1. Click Vandaag in the sidebar
2. A subtle "← Dashboard" link appears above the section title
3. Click it

**Expected:** Returns to Dashboard tab. The link is hidden on the Dashboard tab itself.

---

## S5. Mobile Fallback

1. Resize the browser to <768px (mobile width)
2. The sidebar disappears
3. A horizontal tab bar appears at the top

**Expected:** Full mobile navigation works. Same tabs, same mode pill in the header.

---

## S6. Inbox Badge on Sidebar

1. Add items to inbox
2. Check the sidebar Inbox item

**Expected:** Badge count appears next to "Inbox" in the sidebar (and in mobile nav).

---

## S7. Settings Width

1. Click Instellingen in the sidebar
2. The settings content should be centered with max-width 640px

**Expected:** Settings rows are not stretched to full width on wide screens. Mode pills show their own mode color when active (purple for School, emerald for Personal, blue for BPV).

---

## Sidebar Verification Checklist

- [ ] Desktop: sidebar visible with 6 items (Dashboard, Vandaag, Inbox, Planning, divider, Instellingen)
- [ ] Mobile (<768px): horizontal tabs, no sidebar
- [ ] Sidebar items are STABLE — mode switch does NOT change them
- [ ] Active item has 4px mode-colored left accent bar
- [ ] "← Dashboard" breadcrumb on non-dashboard tabs
- [ ] Inbox badge updates in sidebar
- [ ] Settings page centered (max-width 640px)
- [ ] Settings mode pills use their own mode color
- [ ] Card top border is 4px (prominent accent)
- [ ] Mode hero banner has 4px left border
- [ ] All tests pass (`npm test`)

---

---

# Command Palette — Demo Script

Manual walkthrough to verify the enhanced command palette with navigation commands and create actions.

## Prerequisites

1. `npm run dev` is running
2. Open the app in browser
3. BORIS OS is active (default)

---

## CP1. Open Palette with Ctrl+K

1. From any tab, press **Ctrl+K** (or **Cmd+K** on Mac)
2. A search overlay appears centered near the top of the screen
3. The input field is focused and ready for typing
4. **6 default commands** are visible immediately:
   - Dashboard, Vandaag, Projecten, Instellingen (navigate)
   - Nieuwe taak, Nieuw project (create)

**Expected:** Palette opens with smooth animation. Commands listed under "Commando's" group header. First command is highlighted.

---

## CP2. Close Palette

1. Press **Esc** — palette closes
2. Open again with Ctrl+K, click the dark backdrop — palette closes
3. Open again, press Ctrl+K again — palette closes (toggle)

**Expected:** Clean close animation each time. No orphaned overlays.

---

## CP3. Navigate via Command

1. Open palette (Ctrl+K)
2. Press **Enter** with "Dashboard" highlighted → navigates to Dashboard tab
3. Open palette again, press **Arrow Down** twice to highlight "Projecten"
4. Press **Enter** → navigates to Projects tab

**Expected:** Tab switches immediately. Palette closes on selection.

---

## CP4. Filter Commands by Typing

1. Open palette, type `dash`
2. Only "Dashboard" command should remain visible
3. Clear and type `instel`
4. Only "Instellingen" command should remain
5. Type `maak`
6. Both "Nieuwe taak" and "Nieuw project" should appear

**Expected:** Commands filter in real-time as you type. Non-matching commands disappear.

---

## CP5. Search + Commands Together

1. Open palette, type `project`
2. You should see:
   - **Commando's** section with "Projecten" and "Nieuw project" commands
   - **Projecten** search results section (if any projects exist)
3. Arrow keys navigate across both sections seamlessly

**Expected:** Commands appear above search results. Single unified keyboard navigation.

---

## CP6. Create Task via Palette

1. Open palette, type `taak` or arrow to "Nieuwe taak"
2. Press **Enter**
3. A prompt dialog appears asking "Nieuwe taak:"
4. Type `Test taak vanuit palette` and press Enter
5. Navigate to the **Vandaag** tab
6. Verify the new task appears in the Taken block

**Expected:** Task created in current mode. Palette closes before prompt opens.

---

## CP7. Create Project via Palette

1. Open palette, select "Nieuw project"
2. Press **Enter**
3. A prompt dialog appears asking "Nieuw project:"
4. Type `Palette project` and press Enter
5. Navigate to the **Projecten** tab
6. Verify the new project appears

**Expected:** Project created in current mode with "active" status.

---

## CP8. Cancel Create

1. Open palette, select "Nieuwe taak", press Enter
2. In the prompt dialog, press **Esc** (or click cancel)
3. No task should be created

**Expected:** Prompt dismissed cleanly. No data written.

---

## CP9. Keyboard Navigation

1. Open palette (shows 6 commands)
2. Press **Arrow Down** 6 times → selection wraps to first item
3. Press **Arrow Up** → selection wraps to last item
4. Hover mouse over a different command → selection follows mouse
5. Click a command → it activates

**Expected:** Smooth keyboard and mouse navigation. Visual highlight follows selection.

---

## CP10. Dark Mode

1. Go to Settings, switch theme to Dark
2. Open palette with Ctrl+K
3. Verify: dark surface, correct text colors, no white flashes
4. Commands and search results both render correctly

**Expected:** Full dark mode support using CSS tokens.

---

## Command Palette Verification Checklist

- [ ] Ctrl+K / Cmd+K opens palette
- [ ] Esc, backdrop click, and Ctrl+K toggle all close palette
- [ ] 6 default commands shown on empty state
- [ ] Commands filter by label and keywords
- [ ] Search results appear alongside matching commands
- [ ] Arrow keys navigate across commands + results
- [ ] Enter activates selected command
- [ ] Navigate commands switch to correct tab
- [ ] "Nieuwe taak" creates task in current mode via prompt
- [ ] "Nieuw project" creates project in current mode via prompt
- [ ] Cancel on prompt creates nothing
- [ ] Dark mode fully supported
- [ ] No hardcoded colors in CSS
- [ ] All 38 command palette tests pass
