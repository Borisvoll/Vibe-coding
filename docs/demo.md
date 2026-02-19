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
- [ ] All 152 tests pass (`npm test`)

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
- [ ] All 152 tests pass (`npm test`)

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
- [ ] All 152 tests pass (`npm test`)
