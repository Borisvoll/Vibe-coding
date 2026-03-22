# Command Palette — Feature Spec

## Overview

The command palette (Ctrl+K / Cmd+K) provides keyboard-first access to navigation and actions from anywhere in the app. It combines two capabilities:

1. **Quick commands** — Navigate to tabs and create items without leaving the keyboard
2. **Global search** — Fuzzy search across tasks, projects, inbox, and other stores

## Activation

- **Shortcut:** Ctrl+K (Windows/Linux) or Cmd+K (Mac)
- **Toggle:** Pressing the shortcut again closes the palette
- **Close:** Escape key or clicking the backdrop

## Default Commands (v1)

| Command | Type | Action |
|---------|------|--------|
| Dashboard | navigate | Switch to Dashboard tab |
| Vandaag | navigate | Switch to Vandaag (Today) tab |
| Projecten | navigate | Switch to Projects tab |
| Instellingen | navigate | Switch to Settings tab |
| Nieuwe taak | create | Prompt for task text, create in current mode |
| Nieuw project | create | Prompt for project title, create in current mode |

## Behavior

### Empty state (no input)
All 6 commands are shown under a "Commando's" group header. First command is pre-selected.

### Typing a query
1. Commands are filtered by label and keywords (case-insensitive substring match)
2. If query is 2+ characters, a fuzzy search runs across all data stores
3. Matching commands appear above search results, visually separated
4. Commands and search results share a single flat list for keyboard navigation

### Keyboard navigation
- **Arrow Down/Up** — Move selection through the combined list (wraps around)
- **Enter** — Activate selected item (navigate or create)
- **Alt+Enter** — On project search results, opens project detail view
- **Escape** — Close palette

### Create actions
- Palette closes, then a `showPrompt()` dialog appears
- User enters text and presses Enter (or cancels with Esc)
- On confirm: item created in the current mode, eventBus emits changed event
- On cancel: nothing happens

## Architecture

```
src/ui/command-palette.js  — Core module (exported: createCommandPalette, getFilteredCommands)
src/ui/command-palette.css — Styling (CSS tokens only, no hardcoded colors)
src/os/shell.js            — Mounts palette, passes onNavigate + eventBus + modeManager
```

### Dependencies
- `src/utils.js` — escapeHTML, debounce
- `src/ui/modal.js` — showPrompt (lazy-imported for create actions)
- `src/stores/tasks.js` — addTask (lazy-imported)
- `src/stores/projects.js` — addProject (lazy-imported)
- `src/stores/search.js` — globalSearchGrouped (lazy-imported)

All store imports are dynamic (`await import(...)`) to avoid circular dependencies and keep the palette lightweight on initial load.

## Design Principles

- **Keyboard-first:** Every action reachable without touching the mouse
- **Calm UI:** Minimal styling, token-based colors, reduced-motion support
- **Progressive disclosure:** Empty state shows commands; typing reveals search results
- **Fast:** Web Worker for search indexing, debounced input, lazy imports

## Tests

38 tests in `tests/ui/command-palette.test.js` covering:
- Search integration (result shape, scoring, grouping)
- Fuzzy scoring algorithm
- Command filtering (empty, partial, keyword, non-matching)
- Command shape validation
- Navigation tab mapping
- Create action integration (task + project)
