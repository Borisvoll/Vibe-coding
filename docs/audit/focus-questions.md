# BORIS OS — Decisive Questions

**Purpose:** Force tradeoffs and commitments before building the roadmap.

---

## Daily Habit & Core Identity

**Q1. What is the ONE daily habit this app must support?**
Options:
- A) Morning planning: set today's top 3 tasks + intention
- B) Quick capture: dump thoughts into inbox, process later
- C) End-of-day reflection: what happened, gratitude, journal
- D) Something else?

**Q2. If BORIS could only have 3 screens, which 3?**
Think hard — every screen you add steals attention from the others.
Current candidates: Dashboard, Today, Inbox, Lijsten, Planning, Projects, Settings.

**Q3. Do you actually use the 3-mode system (School/BPV/Personal) daily, or is it aspirational?**
If you mostly use one mode, the mode system adds complexity for minimal value. If you actively switch, it's the app's soul. Be honest.

---

## UI Architecture Commitment

**Q4. React-first or VanillaBridge-first?**
Two paths to restore the broken 7 routes:
- A) **VanillaBridge path** (fast): Wire existing 31 vanilla blocks into React route pages via VanillaBridge. App works in days. Blocks stay as-is. React only owns shell + routing.
- B) **React-first path** (slow, clean): Rewrite each page as native React components with Tailwind. App works in weeks. Clean codebase. Vanilla blocks eventually deleted.
- C) **Hybrid**: VanillaBridge for Today/Inbox/Projects now; rewrite Dashboard-style pages in React over time.
Which commitment are you making?

**Q5. Is the current Dashboard.jsx (React + Tailwind) the quality bar for all future pages?**
It's well-structured but uses verbose `text-[var(--color-text)]` instead of mapped tokens. Should I refactor it as the template, or is it good enough?

---

## Feature Scope (Say No)

**Q6. Which of these blocks should be REMOVED (hidden permanently)?**
Rate each: Keep / Hide / Delete
- conversation-debrief (meeting notes)
- worry-dump (anxiety journal)
- brain-state (energy/mood tracker)
- boundaries (BPV limits tracker)
- two-min-launcher (GTD 2-minute rule)
- context-checklist (daily context questions)
- done-list (completed tasks archive)
- bpv-log-summary (BPV log overview)
- schedule-placeholder (empty placeholder)

**Q7. Which features are tempting but must be "no" for the next 3 months?**
Candidates from the codebase:
- Mindmap per project (`src/blocks/project-hub/tabs/mindmap.js`)
- File attachments per project (`src/blocks/project-hub/tabs/files.js`)
- Timeline/Gantt view (`src/blocks/project-hub/tabs/timeline.js`)
- School milestones (`src/blocks/school-milestones/`)
- Skill tracker (`src/blocks/school-skill-tracker/`)
- Week planning (`src/blocks/personal-week-planning/`)
- Theme studio / advanced theming

---

## Data & Reliability

**Q8. What data must NEVER be lost?**
Rate each: Critical / Important / Nice-to-have
- Tasks (current + completed)
- Projects (title, goal, milestones)
- Daily reflections/gratitude/journal
- BPV hours log
- Inbox items
- Settings/preferences
- Weekly review history

**Q9. What backup/export must exist before you'd use this daily?**
- A) Manual JSON export (already exists in Settings)
- B) Automatic periodic backup to localStorage/file
- C) Cloud sync (which service?)
- D) Current manual export is sufficient

---

## Definition of Done

**Q10. What is your "definition of done" for v0.1 — the version you'd actually open every morning?**
Be specific. Example: "I open it, see my 3 tasks for today, check them off, and close it."

**Q11. Are you building this for yourself only, or do other students need to use it too?**
This changes every decision: onboarding, documentation, error handling, deployment.

---

## Design Direction

**Q12. Should BORIS feel more like Notion (dense, powerful, configurable) or Apple Notes (minimal, one-purpose, zero config)?**
The current codebase leans Notion. Your design philosophy leans Apple. These are in tension.

**Q13. The sidebar currently has 7 items. How many should it have?**
Each item is a promise of value. Empty routes are broken promises.
- A) 3 items: Today, Inbox, Settings
- B) 4 items: Today, Inbox, Projects, Settings
- C) 5 items: Today, Inbox, Projects, Planning, Settings
- D) Keep all 7

---

## Migration & Process

**Q14. Are you willing to delete the 31 vanilla blocks after wiring VanillaBridge, or do you want to preserve them as the "real" UI long-term?**
This determines whether React is a shell or the future.

**Q15. Would you accept a 2-week feature freeze (no new features) to clean up dead code, wire VanillaBridge, and get all routes working?**
The codebase needs this. But it means no visible new features for 2 weeks.
