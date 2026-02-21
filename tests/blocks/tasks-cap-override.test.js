import { describe, it, expect, beforeEach } from 'vitest';
import { initDB, put } from '../../src/db.js';
import { getTasksForToday, addTask } from '../../src/blocks/tasks/store.js';
import { getTaskCap } from '../../src/core/modeCaps.js';
import { getToday } from '../../src/utils.js';

beforeEach(async () => {
  await initDB();
});

describe('Task cap — override behavior', () => {
  it('addTask succeeds even when at cap', async () => {
    const mode = 'School';
    const today = getToday();
    const cap = getTaskCap(mode);

    // Fill to cap
    for (let i = 0; i < cap; i++) {
      await addTask(`Task ${i + 1}`, mode);
    }

    let tasks = await getTasksForToday(mode);
    const active = tasks.filter((t) => t.status !== 'done');
    expect(active.length).toBe(cap);

    // Should still be able to add (soft cap, not hard block)
    await addTask('Override task', mode);
    tasks = await getTasksForToday(mode);
    const activeAfter = tasks.filter((t) => t.status !== 'done');
    expect(activeAfter.length).toBe(cap + 1);
    expect(activeAfter.some((t) => t.text === 'Override task')).toBe(true);
  });

  it('getTaskCap returns expected defaults', () => {
    expect(getTaskCap('School')).toBe(3);
    expect(getTaskCap('BPV')).toBe(3);
    expect(getTaskCap('Personal')).toBe(5);
    expect(getTaskCap('Unknown')).toBe(5);
  });
});
