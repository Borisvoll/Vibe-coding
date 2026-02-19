# QA Checklist — BORIS OS

## 1) Visual Checks
- [ ] Typography, spacing and card styles consistent across all blocks
- [ ] Buttons and inputs use shared component classes (`.btn`, `.form-input`, etc.)
- [ ] No one-off styles or jarring animations
- [ ] Dark mode: all cards, text, and borders remain readable
- [ ] Compact mode: spacing reduces correctly, no overlaps
- [ ] Accent color: all interactive elements reflect chosen accent
- [ ] Mode wash animation plays on mode switch (subtle, 600ms)

## 2) Interaction Checks
- [ ] Mode switch (BPV / School / Personal) feels instant, no double renders
- [ ] Tab switch (Dashboard/Vandaag/Inbox/Planning/Reflectie/Archief) — no layout jumps
- [ ] Empty states show friendly message, not blank page
- [ ] Ctrl+I opens inbox tab and focuses capture input
- [ ] Escape closes mode picker modal

## 3) Mode Isolation
- [ ] BPV shows only BPV-relevant blocks
- [ ] School shows only School-relevant blocks
- [ ] Personal shows only Personal-relevant blocks
- [ ] Blocks unmount cleanly on mode switch (no duplicate listeners)
- [ ] Mode picker dialog traps focus (Tab cycles within modal)
- [ ] Mode picker returns focus to trigger button on close

## 4) Today Page — Per Mode
- [ ] **BPV**: Quick log, weekly overview, tasks, inbox, projects, weekly review
- [ ] **School**: School dashboard (next action, deadlines, BPV bar, projects), tasks, inbox, projects
- [ ] **Personal**: Personal dashboard (gratitude, reflection, journal, habits, sparks), tasks, inbox
- [ ] Data isolation: School/Personal never show BPV-only records

## 5) Data Operations
- [ ] Export creates valid JSON bundle with `_meta` (app, version, exportedAt, recordCounts)
- [ ] Import validates bundle before writing (rejects invalid/wrong app name)
- [ ] Import creates safety backup in localStorage before clearing data
- [ ] Import roundtrip: export → import → data matches (tasks, inbox, projects, BPV, personal)
- [ ] Search returns results from all stores (tasks, inbox, projects, hours, logbook, dailyPlans, wellbeing)
- [ ] Search handles missing/empty stores gracefully
- [ ] Tags normalize correctly (lowercase, trim, spaces→hyphens, max 50 chars)

## 6) Accessibility
- [ ] All icon-only buttons have `aria-label` and `title`
- [ ] All interactive elements show visible focus ring (`:focus-visible`)
- [ ] Radio groups have proper `<label>` elements
- [ ] Accent color dots have `aria-label` attributes
- [ ] Progress bars include text percentage, not just color
- [ ] Touch targets ≥44x44px on mobile

## 7) Weekly Review Email
- [ ] Aggregation includes: completed tasks, BPV hours, gratitude, reflections, journal, habits, projects
- [ ] "Verstuur" button sends POST to serverless function
- [ ] Sent badge shows after successful send
- [ ] Friday prompt appears if not yet sent this week
- [ ] Email contains no hardcoded personal info (all from env vars)

## 8) Persistence
- [ ] Gratitude/reflection/journal auto-save (600ms debounce) without explicit button
- [ ] Habit toggles persist immediately
- [ ] Theme, accent color, compact mode survive page refresh
- [ ] BPV quick log upserts by date (no duplicate entries)

## 9) Build & Tests
- [ ] `npm run build` passes without errors
- [ ] `npx vitest run` — all tests pass
- [ ] No console errors in browser dev tools during normal usage

## 10) Service Worker
- [ ] New version triggers "Nieuwe versie beschikbaar" banner
- [ ] Click "Ververs" activates skipWaiting + reloads app
- [ ] Diagnostics shows correct version + SW status
