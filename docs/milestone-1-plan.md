# Milestone 1: Vandaag MVP + Capture + Persistence

> Plan for code-level implementation steps.
> Scope: make the **Vandaag (Today) tab** fully reliable for daily use —
> solid task capture, inbox capture, and data persistence — without adding
> new features.

---

## Goal

A user should be able to open BORIS, add tasks, capture inbox items, and
return the next day to find everything exactly as they left it. No data
loss, no blank sections, no ghost event handlers.

---

## What is already working (do not break)

- IndexedDB schema v8 with all 31 stores
- `tasks:changed` / `inbox:changed` event flow
- Mode switching (School / Personal / BPV) and task caps
- Collapsible sections with localStorage persistence
- Service worker + PWA offline cache
- 658 passing tests

---

## Milestone 1 Steps

### Step 1 — Audit & fix eventBus leaks in all Today-tab blocks

**Files:**
- `src/blocks/daily-todos/index.js`
- `src/blocks/inbox/index.js`
- `src/blocks/projects/index.js`
- `src/blocks/lijsten/index.js`
- `src/blocks/daily-reflection/index.js`
- `src/blocks/morning-focus/index.js`
- `src/blocks/done-list/index.js`
- `src/blocks/weekly-review/index.js`

**What to do:**
For each block, verify `unmount()` calls `eventBus.off()` for every
subscription made in `mount()`. Pattern to enforce:
```javascript
const handler = () => render();
eventBus.on('tasks:changed', handler);
return {
  unmount() {
    eventBus.off('tasks:changed', handler);
  }
};
```

**Acceptance:** Tab-switching 10× in DevTools Memory timeline shows
no growth in event listener count.

---

### Step 2 — Add block error boundary rendering

**Files:**
- `src/os/shell.js` (lines ~181–200, `renderHosts()` catch block)

**What to do:**
Replace silent `console.error` with visible error card in the host slot:
```javascript
catch (err) {
  console.error(`Block "${block.id}" failed to mount:`, err);
  const errEl = document.createElement('p');
  errEl.className = 'os-host-error';
  errEl.textContent = `Blok kon niet laden (${block.id})`;
  hostEl.appendChild(errEl);
}
```

Add `.os-host-error` CSS rule to `src/styles/components.css` (amber/warning colour,
distinct from the `os-host-empty` placeholder).

**Acceptance:** Manually throw in `daily-todos/index.js` mount() → see error card
in the Taken section instead of empty placeholder.

---

### Step 3 — Fix IDB / localStorage mode sync on startup

**Files:**
- `src/main.js` (lines ~136–144, `initNewOSShell()`)

**What to do:**
After `getSetting('boris_mode')` resolves, compare against `localStorage.getItem('boris_mode')`.
If they differ, treat IDB as authoritative and re-sync localStorage:
```javascript
const idbMode = await getSetting('boris_mode').catch(() => null);
const lsMode = localStorage.getItem('boris_mode');
const savedMode = idbMode || lsMode || 'School';
if (idbMode && idbMode !== lsMode) {
  localStorage.setItem('boris_mode', idbMode);
}
```

**Acceptance:** Set `boris_mode` in IDB to `Personal` and `boris_mode` in localStorage
to `School`. Reload → app starts in Personal mode.

---

### Step 4 — Add `daily-todos` persistence smoke test

**Files:**
- `tests/blocks/daily-todos.test.js` *(new file)*

**What to do:**
Create a mount/unmount smoke test using `fake-indexeddb`:
```javascript
import { describe, it, expect, beforeEach } from 'vitest';
import { initDB } from '../../src/db.js';
import { createEventBus } from '../../src/core/eventBus.js';
import { createBlockRegistry } from '../../src/core/blockRegistry.js';
import { registerDailyTodosBlock } from '../../src/blocks/daily-todos/index.js';

describe('daily-todos block', () => {
  it('mounts without throwing', async () => {
    await initDB();
    const registry = createBlockRegistry();
    registerDailyTodosBlock(registry);
    const block = registry.getEnabled().find(b => b.id === 'daily-todos');
    const container = document.createElement('div');
    const eventBus = createEventBus();
    const instance = block.mount(container, { mode: 'School', eventBus });
    expect(container.innerHTML).not.toBe('');
    instance?.unmount();
  });

  it('renders added task after tasks:changed', async () => {
    // put a task, emit tasks:changed, assert it appears in container
  });
});
```

**Acceptance:** `npm test` passes with new test file included.

---

### Step 5 — Add `inbox` block persistence smoke test

**Files:**
- `tests/blocks/inbox.test.js` *(new file)*

**What to do:**
Same pattern as Step 4 for the `inbox` block:
- Mount → assert capture textarea present
- `put('os_inbox', item)` → emit `inbox:changed` → assert item renders

**Acceptance:** `npm test` passes.

---

### Step 6 — Stabilise Vandaag collapsible section state

**Files:**
- `src/ui/collapsible-section.js`
- `src/os/shell.js` (lines ~256–287, `buildVandaagLayout`)

**What to do:**
- Verify `CollapsibleSection.setMode(mode, defaultOpen)` correctly reads
  existing localStorage value before applying the default.
- Add a guard: if `section.el` is already in DOM (e.g. double-mount on
  rapid tab switch), skip re-creation.
- Ensure `vandaagSections` object is fully cleared in `unmountRoute('today')`
  before rebuilding.

**Acceptance:** Switch mode 5× rapidly → sections always show correct
open/closed state for each mode, no duplicate section elements in DOM.

---

### Step 7 — Fix accessibility: focus management on tab switch

**Files:**
- `src/os/shell.js` (`mountRoute()` function, after `renderHosts()` call)

**What to do:**
After mounting a route, move focus to the route's first heading:
```javascript
// End of mountRoute(), after renderHosts()
const firstHeading = routeContainer.querySelector('h1, h2, [data-focus-first]');
if (firstHeading) {
  firstHeading.setAttribute('tabindex', '-1');
  firstHeading.focus({ preventScroll: true });
}
```

Add `aria-live="polite"` region to `index.html` shell:
```html
<div id="route-announcer" aria-live="polite" aria-atomic="true"
     class="sr-only"></div>
```

In `setActiveTab()`, after updating nav buttons:
```javascript
const announcer = document.getElementById('route-announcer');
if (announcer) announcer.textContent = `Navigated to ${activeTab}`;
```

**Acceptance:** Keyboard-only navigation: Tab → sidebar nav → Enter on "Vandaag"
→ focus lands on Vandaag page heading.

---

### Step 8 — EventBus micro-batching for high-frequency events

**Files:**
- `src/core/eventBus.js`

**What to do:**
Add optional batching: if the same event key is emitted more than once within
a single microtask, coalesce into one:
```javascript
const pendingEmits = new Set();

function emit(event, payload) {
  if (pendingEmits.has(event)) return;
  pendingEmits.add(event);
  queueMicrotask(() => {
    pendingEmits.delete(event);
    listeners[event]?.forEach(fn => fn(payload));
  });
}
```

**Note:** Only apply batching to change-notification events (`tasks:changed`,
`inbox:changed`, `lists:changed`). Do NOT batch `mode:changed` — it must be
synchronous for the wash animation timing.

**Acceptance:** Importing 50 tasks via backup triggers exactly 1 `tasks:changed`
emission (verify with a spy in the test).

---

### Step 9 — Run full test suite and fix any regressions

**Files:**
- All modified files from Steps 1–8

**What to do:**
```bash
npm test
```
All 658 existing tests must still pass, plus the new tests from Steps 4 and 5.
Fix any failures before the milestone is considered done.

---

## Definition of Done

- [ ] All 658 + new tests pass (`npm test`)
- [ ] Zero eventBus listener growth on 10× tab switches (DevTools Memory)
- [ ] Block mount errors show amber error card (not silent blank)
- [ ] Mode survives IDB/localStorage divergence
- [ ] Keyboard focus lands on route heading after tab switch
- [ ] `tasks:changed` fires once per bulk operation (not N times)
- [ ] Collapsible sections are stable across rapid mode switches

## Out of Scope for M1

- New blocks or features
- Sync / backend
- Lazy block loading (Risk #9)
- History stack / pushState (Risk #8)
- Full block smoke test suite for all 30 blocks (Step 4–5 cover 2; remainder is M2)
