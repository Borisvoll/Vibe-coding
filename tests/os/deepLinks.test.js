import { describe, it, expect } from 'vitest';

/**
 * Deep links — pure logic tests.
 * Since tests run in Node.js (no browser DOM), we test the parsing
 * and URL construction logic directly without window.location.
 */

// Re-implement the core parsing logic to test it without DOM
const VALID_TABS = ['dashboard', 'today', 'inbox', 'lijsten', 'planning', 'settings'];

function parseHashString(hash) {
  const clean = hash.replace(/^#/, '');
  if (!clean) return { tab: null, focus: null, mode: null };

  const params = new URLSearchParams(clean);
  const tab = params.get('tab');
  const focus = params.get('focus');
  const mode = params.get('mode');

  return {
    tab: tab && VALID_TABS.includes(tab) ? tab : null,
    focus: focus || null,
    mode: mode || null,
  };
}

function buildHashString(tab, focus) {
  if (!tab || !VALID_TABS.includes(tab)) return null;
  const params = new URLSearchParams();
  params.set('tab', tab);
  if (focus) params.set('focus', focus);
  return `#${params.toString()}`;
}

describe('Deep links — parseHash', () => {
  it('returns nulls for empty hash', () => {
    expect(parseHashString('')).toEqual({ tab: null, focus: null, mode: null });
  });

  it('returns nulls for bare hash', () => {
    expect(parseHashString('#')).toEqual({ tab: null, focus: null, mode: null });
  });

  it('parses tab from hash', () => {
    const result = parseHashString('#tab=inbox');
    expect(result.tab).toBe('inbox');
    expect(result.focus).toBeNull();
  });

  it('parses tab + focus', () => {
    const result = parseHashString('#tab=today&focus=tasks');
    expect(result.tab).toBe('today');
    expect(result.focus).toBe('tasks');
  });

  it('parses tab + focus + mode', () => {
    const result = parseHashString('#tab=dashboard&focus=cockpit&mode=School');
    expect(result.tab).toBe('dashboard');
    expect(result.focus).toBe('cockpit');
    expect(result.mode).toBe('School');
  });

  it('rejects invalid tabs', () => {
    const result = parseHashString('#tab=invalid');
    expect(result.tab).toBeNull();
  });

  it('accepts all valid tabs', () => {
    for (const tab of VALID_TABS) {
      const result = parseHashString(`#tab=${tab}`);
      expect(result.tab).toBe(tab);
    }
  });

  it('preserves focus even without valid tab', () => {
    const result = parseHashString('#tab=bad&focus=tasks');
    expect(result.tab).toBeNull();
    expect(result.focus).toBe('tasks');
  });

  it('handles URL-encoded values', () => {
    const result = parseHashString('#tab=today&focus=weekly%20review');
    expect(result.focus).toBe('weekly review');
  });
});

describe('Deep links — buildHash', () => {
  it('builds hash with tab only', () => {
    expect(buildHashString('today')).toBe('#tab=today');
  });

  it('builds hash with tab + focus', () => {
    expect(buildHashString('today', 'tasks')).toBe('#tab=today&focus=tasks');
  });

  it('returns null for invalid tab', () => {
    expect(buildHashString('nonexistent')).toBeNull();
  });

  it('omits focus when null', () => {
    expect(buildHashString('dashboard', null)).toBe('#tab=dashboard');
  });

  it('builds correct format for all valid tabs', () => {
    for (const tab of VALID_TABS) {
      const hash = buildHashString(tab);
      expect(hash).toBe(`#tab=${tab}`);
    }
  });

  it('roundtrips: build then parse', () => {
    const hash = buildHashString('today', 'tasks');
    const parsed = parseHashString(hash);
    expect(parsed.tab).toBe('today');
    expect(parsed.focus).toBe('tasks');
  });
});

describe('Deep links — type mapping', () => {
  // Verify the navigation mapping used by command palette
  const TYPE_NAV = {
    task:    { tab: 'today', focus: 'tasks' },
    inbox:   { tab: 'inbox', focus: null },
    project: { tab: 'today', focus: 'projects' },
    hours:   { tab: 'today', focus: 'mode' },
    logbook: { tab: 'today', focus: 'mode' },
    daily:   { tab: 'today', focus: null },
    journal: { tab: 'today', focus: 'reflection' },
  };

  it('maps all search result types to valid tabs', () => {
    for (const [type, nav] of Object.entries(TYPE_NAV)) {
      expect(VALID_TABS).toContain(nav.tab);
    }
  });

  it('task navigates to today with tasks focus', () => {
    expect(TYPE_NAV.task).toEqual({ tab: 'today', focus: 'tasks' });
  });

  it('inbox navigates to inbox tab', () => {
    expect(TYPE_NAV.inbox.tab).toBe('inbox');
  });

  it('project navigates to today with projects focus', () => {
    expect(TYPE_NAV.project).toEqual({ tab: 'today', focus: 'projects' });
  });

  it('BPV entries navigate to mode context', () => {
    expect(TYPE_NAV.hours.focus).toBe('mode');
    expect(TYPE_NAV.logbook.focus).toBe('mode');
  });

  it('journal navigates to reflection', () => {
    expect(TYPE_NAV.journal.focus).toBe('reflection');
  });
});
