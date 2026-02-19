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
- [ ] All 101 tests pass (`npm test`)
