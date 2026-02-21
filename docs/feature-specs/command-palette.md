# Command Palette

## Overview

The command palette (Ctrl+K / Cmd+K) is the keyboard-first hub for navigating and acting within BORIS. It combines a command launcher with full-text search across all stores.

## Opening

- **Keyboard**: `Ctrl+K` or `Cmd+K` (toggles open/close)
- **Anywhere**: Works from any tab, any mode

## Behavior

### Empty state (no query)
Shows all registered commands grouped by type:
- **Navigatie** — Jump to any tab (Dashboard, Vandaag, Inbox, etc.)
- **Aanmaken** — Create new items (task, project)

### Typing
- Filters commands by label and keywords (fuzzy match)
- Below commands: searches IndexedDB data (projects, tasks, inbox, etc.)
- Results appear after 2+ characters

### Keyboard navigation
| Key | Action |
|-----|--------|
| `↑` / `↓` | Move selection |
| `Enter` | Execute selected command or navigate to result |
| `Escape` | Close palette |

### Mouse
- Click any item to execute/navigate
- Click backdrop to close

## Commands v1

| Command | Group | Shortcut | Action |
|---------|-------|----------|--------|
| Ga naar Dashboard | Navigatie | — | Switch to Dashboard tab |
| Ga naar Vandaag | Navigatie | — | Switch to Vandaag tab |
| Ga naar Inbox | Navigatie | Ctrl+I | Switch to Inbox tab |
| Ga naar Projecten | Navigatie | Alt+G | Switch to Projects tab |
| Ga naar Planning | Navigatie | — | Switch to Planning tab |
| Ga naar Instellingen | Navigatie | — | Switch to Settings tab |
| Nieuwe taak | Aanmaken | — | Prompt for text, create task in current mode |
| Nieuw project | Aanmaken | — | Prompt for title, create project in current mode |

## Architecture

### Command Registry (`src/core/commands.js`)
Kernel module that stores and filters commands. API:
- `register(id, { label, icon, group, keywords, shortcut, handler })`
- `getAll()` — all commands
- `filter(query)` — fuzzy-filtered commands
- `execute(id)` — run a command handler

### Command Palette (`src/ui/command-palette.js`)
UI overlay that combines commands + search results. Accepts `{ onNavigate, eventBus, commands }`.

### Shell integration (`src/os/shell.js`)
Creates the command registry, registers all commands, and passes it to the palette.

## Design

- Uses CSS custom properties exclusively (no hardcoded colors)
- Command items: icon box + label + optional shortcut hint
- Calm, minimal styling consistent with BORIS design language
- Smooth open/close transitions (respects `prefers-reduced-motion`)
