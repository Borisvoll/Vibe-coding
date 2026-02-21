import { describe, it, expect, beforeEach, vi } from 'vitest';
import { initDB } from '../../src/db.js';
import { getFlowState, shouldAutoOpen } from '../../src/ui/morning-flow.js';
import { saveOutcomes, getDailyEntry } from '../../src/stores/daily.js';
import { addProject, getActiveProjects, getPinnedProject } from '../../src/stores/projects.js';
import { getToday } from '../../src/utils.js';

beforeEach(async () => {
  await initDB();
});

describe('Morning flow — localStorage persistence', () => {
  it('getFlowState returns null when no state exists', () => {
    const state = getFlowState('2026-02-21', 'School');
    expect(state).toBeNull();
  });

  it('getFlowState reads saved state from localStorage', () => {
    const today = getToday();
    localStorage.setItem(`boris_morning_${today}_School`, JSON.stringify({
      step: 2,
      completed: false,
      dismissed: false,
    }));
    const state = getFlowState(today, 'School');
    expect(state).toEqual({ step: 2, completed: false, dismissed: false });
  });

  it('getFlowState returns null for corrupted data', () => {
    localStorage.setItem('boris_morning_2026-02-21_School', '{bad json');
    expect(getFlowState('2026-02-21', 'School')).toBeNull();
  });

  it('state is mode-specific', () => {
    const today = getToday();
    localStorage.setItem(`boris_morning_${today}_School`, JSON.stringify({ step: 1, completed: false }));
    localStorage.setItem(`boris_morning_${today}_Personal`, JSON.stringify({ step: 3, completed: true }));

    expect(getFlowState(today, 'School').step).toBe(1);
    expect(getFlowState(today, 'Personal').completed).toBe(true);
  });
});

describe('Morning flow — shouldAutoOpen', () => {
  it('returns true when outcomes are empty and no state saved', async () => {
    const mm = { getMode: () => 'School' };
    const result = await shouldAutoOpen(mm);
    expect(result).toBe(true);
  });

  it('returns false when outcomes are filled', async () => {
    const today = getToday();
    await saveOutcomes('School', today, ['Doel 1', 'Doel 2', 'Doel 3']);
    const mm = { getMode: () => 'School' };
    const result = await shouldAutoOpen(mm);
    expect(result).toBe(false);
  });

  it('returns false when flow is completed', async () => {
    const today = getToday();
    localStorage.setItem(`boris_morning_${today}_School`, JSON.stringify({
      step: 3,
      completed: true,
    }));
    const mm = { getMode: () => 'School' };
    const result = await shouldAutoOpen(mm);
    expect(result).toBe(false);
  });

  it('returns false when flow is dismissed', async () => {
    const today = getToday();
    localStorage.setItem(`boris_morning_${today}_School`, JSON.stringify({
      step: 0,
      dismissed: true,
    }));
    const mm = { getMode: () => 'School' };
    const result = await shouldAutoOpen(mm);
    expect(result).toBe(false);
  });

  it('returns true for different mode with empty outcomes', async () => {
    const today = getToday();
    // Fill School outcomes but not Personal
    await saveOutcomes('School', today, ['Doel 1', 'Doel 2', 'Doel 3']);
    const mm = { getMode: () => 'Personal' };
    const result = await shouldAutoOpen(mm);
    expect(result).toBe(true);
  });
});

describe('Morning flow — data integration', () => {
  it('outcomes are saved via saveOutcomes and retrievable', async () => {
    const today = getToday();
    await saveOutcomes('School', today, ['Studeren', 'Sporten', 'Lezen']);
    const entry = await getDailyEntry('School', today);
    expect(entry.outcomes).toEqual(['Studeren', 'Sporten', 'Lezen']);
  });

  it('projects are available for focus selection', async () => {
    await addProject('Wiskunde project', 'Doelen halen', 'School');
    await addProject('Engels project', 'Essay schrijven', 'School');
    const projects = await getActiveProjects('School');
    expect(projects.length).toBeGreaterThanOrEqual(2);
  });

  it('pinned project persists after flow', async () => {
    const { setPinned } = await import('../../src/stores/projects.js');
    const project = await addProject('Focus project', '', 'School');
    await setPinned(project.id, 'School');
    const pinned = await getPinnedProject('School');
    expect(pinned).not.toBeNull();
    expect(pinned.id).toBe(project.id);
  });

  it('flow state is date-scoped (different days are independent)', () => {
    localStorage.setItem('boris_morning_2026-02-20_School', JSON.stringify({ step: 3, completed: true }));
    localStorage.setItem('boris_morning_2026-02-21_School', JSON.stringify({ step: 1, completed: false }));

    expect(getFlowState('2026-02-20', 'School').completed).toBe(true);
    expect(getFlowState('2026-02-21', 'School').completed).toBe(false);
  });
});
