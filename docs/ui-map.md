# UI Map — BORIS OS

> Each top-level route is documented with its active blocks, empty states, and
> primary user actions. All UI text is Dutch; English translations are in
> parentheses where helpful.

---

## Route: Dashboard (`#dashboard`)

### Layout

Full-page grid of synopsis cards. Non-collapsible. Rendered via `buildVandaagLayout` skip
— dashboard has its own template with a `[data-os-host="dashboard-cards"]` slot.

### Active Blocks (host: `dashboard-cards`)

| Block | Modes | What it shows |
|-------|-------|---------------|
| `dashboard` | all | 3 synopsis cards: task summary, inbox count, list count |
| `school-dashboard` | School | School-specific synopsis: current project, study goals, milestones |
| `personal-dashboard` | Personal | Personal synopsis: wellbeing check-in, habit streak, energy |
| `bpv-*` blocks | BPV | BPV quick stats via `vandaag-mode` slot on today tab (not dashboard) |

### Mode Hero Card

Rendered directly by `shell.js:updateModeHero()` — a decorative card showing:
- Mode emoji (📚 / 🌱 / 🏢)
- Mode label + description
- Current date

### Empty State

```
"Nog geen actieve blokken voor deze weergave."
```
Injected by `ensureHostEmptyStates()` (`shell.js:155`) when a `[data-os-host]` has no
mounted children. This is the literal string rendered in `<p class="os-host-empty">`.

### Key UI Actions

- Click mode badge → open mode picker overlay
- Click any synopsis card → navigates to relevant tab via `setActiveTab()`
- Sidebar nav items highlight the active tab

---

## Route: Vandaag / Today (`#today`)

### Layout

Notion-style page with 2 non-collapsible areas + 7 collapsible sections. Sections are
built by `buildVandaagLayout(mode)` which creates `CollapsibleSection` instances. Each
section wraps a `[data-os-host]` slot.

### Non-Collapsible Areas

| Area | Host slot | Blocks |
|------|-----------|--------|
| Header (`[data-vandaag-header]`) | — | Date, week number, mode badge (rendered by shell) |
| Cockpit | `vandaag-cockpit` | `daily-cockpit` |
| Hero | `vandaag-hero` | `daily-outcomes`, `morning-focus` |

### Collapsible Sections

| Section title | Zone key | Host slot | Default open (School / Personal / BPV) |
|---------------|----------|-----------|----------------------------------------|
| Taken (Tasks) | `tasks` | `vandaag-tasks` | ✅ / ✅ / ✅ |
| Projecten & Lijsten | `projects` | `vandaag-projects` | ✅ / ✅ / ✅ |
| Inbox | `capture` | `vandaag-capture` | ✅ / ✅ / ✅ |
| Reflectie | `reflection` | `vandaag-reflection` | ❌ / ✅ / ❌ |
| Context | `mode` | `vandaag-mode` | ❌ / ❌ / ✅ |
| Weekoverzicht | `weekly` | `vandaag-weekly` | ❌ / ❌ / ❌ |
| Geschiedenis | `history` | `vandaag-history` | ❌ / ❌ / ❌ |

Section collapse state persists per mode in localStorage (key: `section_{id}_{mode}`).

### Blocks by Section

**vandaag-tasks:**
- `daily-todos` — Today's tasks with mode-specific cap (3 for School/BPV, 5 for Personal). Add, complete, delete tasks.
- `done-list` — Completed tasks for today. Shown below active tasks.
- `two-min-launcher` — Quick 2-minute task list; fires `tasks:changed` on complete
- `brain-state` — Energy/mood indicator dot (not interactive in current build)
- `context-checklist` — Context-aware checklist items

**vandaag-projects:**
- `projects` — Active projects list. One-next-action constraint enforced. Click → `projects:open`
- `lijsten` — Persistent Todoist-style lists. Add/tick items inline.

**vandaag-capture:**
- `inbox` — Quick capture widget. Textarea + submit → `inbox:changed`
- `worry-dump` — 3-word worry/idea capture with "dump it" action

**vandaag-reflection:**
- `daily-reflection` — End-of-day reflection prompts (3 questions). Submit saves to `dailyPlans`.
- `conversation-debrief` — Lightweight notes about a conversation

**vandaag-mode (School):**
- `school-today` — School context: current lesson, homework, upcoming deadlines
- `school-current-project` — Highlighted active school project
- `school-concept-vault` — Study flashcard capture
- `school-milestones` — Learning milestone tracker (checkbox list)
- `school-skill-tracker` — 12 competencies rated 1–4

**vandaag-mode (Personal):**
- `personal-today` — Personal context: wellbeing prompt
- `personal-energy` — Energy level slider
- `personal-week-planning` — 5-day week planner for personal goals
- `personal-weekly-reflection` — Longer weekly reflection form

**vandaag-mode (BPV):**
- `bpv-today` — Clock-in status, today's work type (worked/sick/absent/holiday)
- `bpv-quick-log` — Log hours with start/end/break fields
- `bpv-log-summary` — Running weekly hours total vs 40h goal
- `bpv-weekly-overview` — Week-at-a-glance calendar grid
- `boundaries` — BPV work boundary reminder list

**vandaag-weekly:**
- `weekly-review` — Aggregated stats for the current week. Friday: send-by-email action.

**vandaag-history:**
- `history-browser` — Browse archived daily plan entries by date

### Search Bar

Rendered inline at top of Vandaag by `initSearchBar()`. Features:
- Debounced 300ms input → `globalSearch(query)` (lazy-loaded from `src/stores/search.js`)
- Dropdown with grouped results (escapeHTML applied)
- Click result → navigates to relevant tab/record
- Hides on blur, re-shows on focus if previous results exist

### Empty States

- Each collapsible section: `"Nog geen actieve blokken voor deze weergave."` if host has no blocks
- `daily-todos` empty: "Geen taken vandaag — geniet ervan!" (or similar block-specific copy)
- `inbox` empty: Shows capture placeholder text in the textarea

### Key UI Actions

| Action | Block | Effect |
|--------|-------|--------|
| Add task | `daily-todos` | `put('os_tasks', …)` → `tasks:changed` |
| Complete task | `daily-todos` | Updates `status: 'done'` → re-render |
| Capture inbox | `inbox` | `put('os_inbox', …)` → `inbox:changed` |
| Open morning flow | `morning-focus` | Shows `MorningFlow` overlay (outcomes + project check-in) |
| Toggle section | Any collapsible header | Persist to localStorage, animate height |
| Search | Search bar | Overlay dropdown with cross-store results |

---

## Route: Inbox (`#inbox`)

### Layout

Full-page inbox processing view. Single host slot: `inbox-screen`.

### Active Blocks

| Block | Host | Purpose |
|-------|------|---------|
| `inbox-screen` | `inbox-screen` | Full inbox: list all items, process (archive / convert to task / add to list / delete), filter by tag |

### Empty State

Block-internal: "Je inbox is leeg 🎉" (or equivalent) when `getAll('os_inbox')` returns [].

### Key UI Actions

| Action | Effect |
|--------|--------|
| Add new capture | `put('os_inbox', …)` → `inbox:changed` |
| Process item | Move to task / list / archive / delete |
| Filter by `#tag` | Filter inbox list by extracted hashtag |
| Undo delete | `undoDelete(id)` within toast timeout window |

---

## Route: Lijsten (`#lijsten`)

### Layout

Full-page list management. Single host slot: `lijsten-screen`.

### Active Blocks

| Block | Host | Purpose |
|-------|------|---------|
| `lijsten-screen` | `lijsten-screen` | Lists hub: all persistent lists, add/rename/delete lists, add/tick/reorder items |

### Empty State

Block-internal: "Nog geen lijsten. Maak je eerste lijst aan." when `getAll('os_lists')` returns [].

### Key UI Actions

| Action | Effect |
|--------|--------|
| Create list | `put('os_lists', …)` → `lists:changed` |
| Add item | `put('os_list_items', …)` → `lists:changed` |
| Check item | Toggle `done` flag → re-render |
| Delete list | `softDelete('os_lists', id)` with undo toast |

---

## Route: Planning (`#planning`)

### Layout

Project detail view. Shows a single project when navigated to via `#projects/{id}`. Otherwise shows a project overview. Host slot: `planning-detail`.

### Active Blocks

| Block | Host | Purpose |
|-------|------|---------|
| `project-detail` | `planning-detail` | Tabbed view: Agenda / Taken / Tijdlijn (Timeline) |

### Empty State

- No project selected: Placeholder card "Selecteer een project om te plannen"
- No tasks on project: "Geen taken voor dit project"
- No timeline events: Empty timeline with add prompt

### Key UI Actions

| Action | Effect |
|--------|--------|
| Add task to project | `put('os_tasks', …)` → `tasks:changed` |
| Set next action | Enforces one-next-action constraint |
| Add timeline event | Saves to project record |
| Navigate back | Breadcrumb → `setActiveTab('projects')` |

---

## Route: Projects (`#projects` / `#projects/{id}`)

### Layout

Two-mode route:
- **`#projects`** → Project hub 2.0 (cards view). Host slot: `projects-hub`.
- **`#projects/{id}`** → Project detail (re-uses `planning-detail` template).

### Active Blocks

| Block | Host | Purpose |
|-------|------|---------|
| `project-hub` | `projects-hub` | 5 tabs: Kaarten / Bestanden / Mindmap / Taken / Tijdlijn |

### Empty State

`project-hub` empty: "Nog geen projecten. Maak je eerste project aan." with create CTA.

### Key UI Actions

| Action | Effect |
|--------|--------|
| Create project | Modal → `put('os_projects', …)` → `projects:changed` |
| Open project | `setActiveTab('projects', { params: { id } })` → deep link `#projects/{id}` |
| Archive project | `softDelete('os_projects', id)` |
| Switch hub tab | Show/hide Kaarten/Bestanden/Mindmap/Taken/Tijdlijn panels |

---

## Route: Curiosity (`#curiosity`)

### Layout

Full-page curiosity studio. Rendered directly by `mountCuriosityPage()` — not a block, not a host slot. Self-contained DOM build.

### What It Shows

- **Word clouds** from historical inbox captures
- **Resurface** — random past capture shown as "memory"
- **Bigrams** — common 2-word phrases extracted from inbox text
- **Patterns** — capture frequency by day-of-week and hour
- Stop words (Dutch + English) filtered out of word frequency

### Empty State

- "Nog niet genoeg data" placeholder when inbox history has fewer than N entries (threshold in `curiosity-data.js`)

### Key UI Actions

| Action | Effect |
|--------|--------|
| Click word in cloud | Filter inbox to that word (planned) |
| Resurface "save" | Convert resurfaced item to task or inbox re-entry |

---

## Route: Instellingen / Settings (`#settings`)

### Layout

Settings panel rendered directly by `renderSettingsBlock()`. Not a registered block — called as direct function in `mountRoute('settings')`.

### Sections

| Section | Controls |
|---------|---------|
| **Thema (Theme)** | Accent color picker (8 options), dark/light/system toggle, 5 preset cards |
| **Weergave (Display)** | Compact mode toggle, reduce motion toggle |
| **Modi (Modes)** | Rename mode display names, archive/unarchive modes, task cap display |
| **Blokken (Blocks)** | Module preset selection (minimaal / school / bpv / compleet) |
| **Exporteren** | Export all data as JSON (downloads file, updates `last_export_date`) |
| **Importeren** | Import JSON bundle (uses write guard, shows conflict summary) |
| **Data wissen** | Danger zone: clear all data with confirmation |
| **Over** | App version, device ID |

### Empty States

No meaningful empty states — settings are always present.

### Key UI Actions

| Action | Effect |
|--------|--------|
| Pick accent color | `setTheme({ accent: hex })` → `applyTheme()` → CSS custom properties update |
| Toggle dark mode | `setTheme({ preferDark: true/false/null })` → `data-theme` attribute |
| Apply preset | `setTheme(PRESETS[id])` |
| Export | `exportAllData()` → JSON download |
| Import | `acquireWriteGuard()` → `importAll(data)` → `releaseWriteGuard()` |
| Clear data | `clearAllData()` → page reload |

---

## Cross-Route Components

### Mode Picker Overlay

Triggered by `#mode-btn` (sidebar) or `#mobile-mode-btn` (mobile nav). Renders a card for each active mode with emoji + label + description. Tab-focus-trapped while open. Closes on Escape or backdrop click.

### Command Palette (Ctrl+K)

`src/ui/command-palette.js`. Fuzzy search over:
- Registered commands (navigation, create actions)
- IndexedDB data (projects, tasks, inbox items)

Off-thread search indexing via web worker (`src/workers/`).

### Morning Flow

`src/ui/morning-flow.js`. Auto-opens when `shouldAutoOpen()` returns true (weekday before noon, not yet completed today). Guided modal: set Top 3 outcomes → project check-in. Emits `morning:completed`.

### Focus Overlay

`src/ui/focus-overlay.js`. Full-screen overlay for deep work focus mode. Launched from command palette or keyboard shortcut.

### Toast Notifications

`src/toast.js`. Fixed bottom-center. Types: `info`, `success`, `error`. Auto-dismiss after duration. Undo action optional (used after soft-delete).

### Update Banner

Injected by `showUpdateBanner()` in `src/main.js` when service worker detects a waiting update. `<aside class="update-banner">` at bottom of `<body>`. "Ververs" button sends `SKIP_WAITING` to SW.
