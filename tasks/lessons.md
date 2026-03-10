# BORIS OS — Lessons Learned

Rules added after corrections to prevent recurring mistakes.

---

## Rule 1: Commit and push before stopping
Always commit and push untracked files before ending a session. The stop hook enforces this.

## Rule 2: Plan before code
For non-trivial tasks (3+ steps), write the plan in `tasks/todo.md` first. Do not touch code until the plan is internally consistent.

## Rule 3: Verify before marking complete
Never mark a task complete without proving it works. Run the app, check for errors, validate behavior.

## Rule 4: Keep blocks self-contained
A block must never import another block's internals. All communication goes through `eventBus.js`. If you need to share data, use `exportForReport()` or similar public interface.

## Rule 5: Preserve existing data
Any IndexedDB schema change must include a migration path. Existing BPV data must remain accessible. Use `onupgradeneeded` versioning.
