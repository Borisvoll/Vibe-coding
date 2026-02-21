# Top 10 Risks

> Current-state audit (2026-02-21). Ordered by likelihood × impact.
> Each risk includes root cause, observable symptoms, and a concrete mitigation path.

---

## 1. No Runtime Framework = Manual Re-render Debt (Tech Debt)

**Category:** Tech debt / architectural fragility

**Root cause:** Every block manages its own DOM mutation. There is no diffing, no
virtual DOM, no reactive primitives. When data changes, blocks either do a full
`innerHTML` replace or manually patch individual elements. The pattern is
inconsistent across 30 blocks.

**Observable symptoms:**
- `inbox-screen` and `daily-todos` re-render their entire list on every `inbox:changed`
  / `tasks:changed` event, discarding focus state and scroll position.
- Adding a single task item causes the full task list to regenerate.
- No shared abstraction for "render this list item" — each block duplicates its own
  list-rendering logic.

**Risk at scale:** As the block count grows, tracking which blocks subscribed to which
events and forgetting to `eventBus.off()` in `unmount()` will create memory leaks and
ghost event handlers across tab transitions.

**Mitigation:**
- Short-term: audit every block's `unmount()` to ensure `eventBus.off()` is called.
- Medium-term: extract a `renderList(container, items, renderItem)` utility that handles
  diffing via `data-id` attributes (no framework needed).
- Long-term: evaluate a lightweight reactive layer (Preact signals or a 2KB store-subscriber
  pattern) if block count exceeds 40.

---

## 2. Fragile State: Dual Persistence (IDB + localStorage Race)

**Category:** Fragile state / data integrity

**Root cause:** Mode is written to both IDB (`setSetting('boris_mode', ...)`) and
`localStorage`. On startup, `getSetting('boris_mode')` is awaited from IDB; if IDB is
slow or throws, the fallback is `localStorage`. If a user clears site data selectively
(localStorage only, or IDB only), the two stores diverge silently.

**Observable symptoms:**
- User switches mode, reloads → appears to revert to wrong mode.
- Private browsing: IDB may be unavailable; localStorage-only write succeeds but IDB
  read on next session fails silently with no fallback path shown.

**Mitigation:**
- On startup, compare IDB and localStorage values; if they diverge, prefer IDB and
  re-sync localStorage.
- Wrap `getSetting` calls in `src/main.js:141` with explicit fallback: if IDB throws,
  read `localStorage.getItem('boris_mode')` directly.
- Add a `diagnostics` panel item showing storage health.

---

## 3. Re-render Risk: EventBus Without Debounce / Batching

**Category:** Re-render risk / performance

**Root cause:** Multiple stores can emit their events synchronously in a loop. For
example, importing a backup calls `put(store, record)` for each record, and if any
subscriber listens to `tasks:changed`, it re-renders on every single write.

**Observable symptoms:**
- Importing 200 tasks triggers 200 `tasks:changed` events → 200 full list re-renders
  in rapid succession (blocked by write guard only during import, not after).
- Mode switch calls `setActiveTab` which unmounts + remounts all blocks. If a block's
  `mount()` immediately emits a `daily:changed` event (e.g. creating today's plan),
  the cycle can trigger cascade re-mounts.

**Mitigation:**
- Add event batching to `eventBus.emit()`: if the same event is emitted more than once
  in a single microtask queue, coalesce into one emission (debounce with
  `queueMicrotask`).
- In bulk operations (import, migration), suppress events and emit a single batch-done
  event at the end.

---

## 4. Styling Inconsistency: 30 Blocks × No Shared Component Primitives

**Category:** Styling inconsistencies / maintainability

**Root cause:** Each block has its own `.css` file. There are no shared primitive
components (no `<Button>`, `<Card>`, `<Input>` equivalents). Classes like `.btn`,
`.card`, `.tag` are defined in `components.css` but usage patterns differ block to block.

**Observable symptoms:**
- Button padding and border-radius vary between blocks (e.g. `bpv-quick-log` buttons
  vs `projects` block action buttons).
- Spacing between list items is hardcoded differently in `daily-todos`, `lijsten-screen`,
  and `inbox-screen`.
- Dark mode: some blocks set inline `color:` or `background:` styles that override
  `[data-theme="dark"]` CSS variable cascade, causing light-colored elements in dark mode.

**Mitigation:**
- Document a component class catalogue in `docs/ui-guidelines.md` (already partially
  exists) and audit all 30 blocks against it.
- Add a visual regression snapshot test (e.g. Playwright screenshot diff) for dark mode
  of key blocks.
- Enforce `escapeHTML` + no inline color styles as part of a block review checklist.

---

## 5. Accessibility Gaps: Focus Management on Route Transitions

**Category:** Accessibility

**Root cause:** `setActiveTab()` clears the DOM (`routeContainer.innerHTML = ''`) and
remounts content. Browser focus is lost on every tab switch. No focus is programmatically
set to the new route's heading or first interactive element.

**Observable symptoms:**
- Keyboard-only user clicks a tab nav item → focus stays on the nav button (or falls to
  `<body>` if the button is removed from DOM during remount).
- Screen reader announces nothing after tab switch — no ARIA live region announces the
  new route.
- The mode picker has a tab-focus trap (good), but the picker's initial focus target
  is not set to the first mode card on open.

**Mitigation:**
- After `mountRoute()` completes, call `routeContainer.querySelector('h1, [autofocus], [data-focus-first]')?.focus()`.
- Add `aria-live="polite"` region that announces the new tab name on switch.
- Audit the mode picker's `showModePicker()` to `focus()` the first `.mode-card` on open.

---

## 6. IndexedDB Schema: No Downgrade Path / No Integrity Checks

**Category:** Tech debt / data integrity

**Root cause:** `MigrationManager` is append-only (correct), but there is no integrity
check on startup. If a migration partially completes (e.g. power loss mid-upgrade), the
IDB version number increments but store contents may be corrupt. There is no schema
validation on read.

**Observable symptoms:**
- A user with a partially-migrated DB (v7 → v8 incomplete) will see the OS shell fail
  silently at `initDB()` — the error is caught by `init()` but no user-facing error is
  shown.
- Records written by an old version (missing required fields like `updated_at`) are read
  without validation and may cause block `mount()` to throw.

**Mitigation:**
- Add a `verifySchema()` check in `initDB()` that confirms all 31 expected stores exist.
  If not, surface a recovery UI instead of a blank screen.
- Add field-level defaults in store adapters (`tasks.js`, `inbox.js`) so records with
  missing fields are normalised on read rather than throwing.
- Write a migration rollback test (already flagged in old `risks.md`).

---

## 7. No Error Boundary Equivalent: One Block Crash = Silent Blank Slot

**Category:** Fragile state / reliability

**Root cause:** `renderHosts()` wraps each block's `mount()` in a `try/catch` that logs
to `console.error` but renders nothing in the host slot. The host remains empty, and
`ensureHostEmptyStates()` then shows "Nog geen actieve blokken" — indistinguishable from
an intentionally empty host.

**Observable symptoms:**
- `school-concept-vault` throws a DB query error → the entire `vandaag-mode` section
  shows "Nog geen actieve blokken voor deze weergave" with no indication of failure.
- Developer must open DevTools to discover the crash.

**Mitigation:**
- In the `catch` block of `renderHosts()`, render a distinct error card in the host slot:
  `<p class="os-host-error">⚠️ Blok kon niet laden (${block.id})</p>`.
- Emit an `app:error` event so a global error counter can be shown in settings/diagnostics.

---

## 8. Deep Links: Route State Not Reflected in History Stack

**Category:** Tech debt / UX

**Root cause:** `updateHash()` uses `history.replaceState` exclusively — never
`pushState`. Every tab switch overwrites the same history entry. The browser back button
never navigates within the app; it always exits to the previous site.

**Observable symptoms:**
- User opens project detail (`#projects/abc123`) then clicks back → leaves the app
  entirely instead of returning to `#projects`.
- Sharing a link to `#projects/abc123` works (deep link parsing is correct), but the
  back button UX is broken after clicking through multiple tabs.

**Mitigation:**
- Switch from `replaceState` to `pushState` for intentional user navigations
  (tab clicks, card opens).
- Keep `replaceState` for programmatic redirects (mode switches, morning flow open).
- Add `hashchange` listener to support browser back/forward.

---

## 9. Block Count Scalability: BlockRegistry Has No Lazy Loading

**Category:** Tech debt / performance

**Root cause:** `registerDefaultBlocks()` eagerly imports all 30+ block modules + their
CSS at startup. Every block's CSS is injected into `<head>` even if the user never
visits the tab that block lives on. Vite bundles everything into a single JS chunk.

**Observable symptoms:**
- Initial JS bundle includes School, Personal, and BPV block code even though only one
  mode is active at any time.
- Adding a new block increases startup parse time regardless of the active mode.
- No code-splitting is configured in `vite.config.js`.

**Mitigation:**
- Split `registerBlocks.js` into per-mode lazy imports using dynamic `import()`:
  `const { registerSchoolBlocks } = await import('./school/registerSchoolBlocks.js')`.
- Add Vite manual chunks in `vite.config.js` for `blocks-school`, `blocks-personal`,
  `blocks-bpv`.
- Defer block registration until the relevant mode is first activated.

---

## 10. No Automated UI / Integration Tests for Blocks

**Category:** Tech debt / test coverage

**Root cause:** The 658 existing tests cover store adapters, core utilities, and data
aggregation thoroughly. But no test verifies that any block's `mount()` function
renders correctly, responds to events, or cleans up properly. The block contract (mount,
unmount, escapeHTML usage) is enforced only by code review.

**Observable symptoms:**
- Renaming a store field breaks a block silently — no test catches it.
- A block that forgets `escapeHTML()` on user content is not caught until a manual
  XSS test.
- `unmount()` not calling `eventBus.off()` is invisible until a memory leak manifests
  after many tab switches.

**Mitigation:**
- Add a block mount smoke-test harness using `fake-indexeddb` + a minimal DOM fixture:
  ```javascript
  // tests/blocks/smoke.test.js
  it('daily-todos mounts and unmounts without throwing', async () => {
    const container = document.createElement('div');
    const ctx = makeFakeContext();
    const { unmount } = registerDailyTodosBlock(registry);
    const instance = block.mount(container, ctx);
    expect(container.innerHTML).not.toBe('');
    instance.unmount();
    expect(leakDetector.activeListeners).toBe(0);
  });
  ```
- Add an `escapeHTML` lint rule or a test that parses block `mount()` source for raw
  template literal interpolation of user fields.
- Target: at least a mount/unmount smoke test for each of the 30 blocks (30 tests).

---

## Risk Matrix Summary

| # | Risk | Likelihood | Impact | Priority |
|---|------|-----------|--------|---------|
| 1 | Manual re-render debt | High | High | **Critical** |
| 2 | Dual persistence race | Medium | High | **High** |
| 3 | EventBus without batching | Medium | Medium | **High** |
| 4 | Styling inconsistency | High | Medium | **High** |
| 5 | Accessibility: focus loss on route switch | High | Medium | **High** |
| 6 | IDB schema no integrity checks | Low | High | **Medium** |
| 7 | No error boundary | Medium | Medium | **Medium** |
| 8 | Back button broken (replaceState) | High | Low | **Medium** |
| 9 | No lazy loading for blocks | Medium | Low | **Medium** |
| 10 | No block integration tests | High | Medium | **Medium** |
