import { describe, it, expect } from 'vitest';

/**
 * Deep links — pure logic tests.
 * Tests both old format (#tab=today&focus=tasks) and new clean format (#today?focus=tasks).
 */

const VALID_ROUTES = ['dashboard', 'today', 'inbox', 'lijsten', 'planning', 'projects', 'settings'];

// Mirror the parseHash logic from deepLinks.js for testability without DOM
function parseHashString(hash) {
  const clean = hash.replace(/^#/, '');
  if (!clean) return { tab: null, params: {}, focus: null, mode: null };

  // Backward compat: detect old format (has "tab=" prefix)
  if (clean.includes('tab=')) {
    const sp = new URLSearchParams(clean);
    const tab = sp.get('tab');
    return {
      tab: tab && VALID_ROUTES.includes(tab) ? tab : null,
      params: {},
      focus: sp.get('focus') || null,
      mode: sp.get('mode') || null,
    };
  }

  // New format: #route/param?focus=x&mode=y
  const [path, query] = clean.split('?');
  const qs = new URLSearchParams(query || '');
  const segments = path.split('/').filter(Boolean);
  const route = segments[0] || null;
  const params = {};

  if (route === 'projects' && segments[1]) {
    params.id = segments[1];
  }

  return {
    tab: route && VALID_ROUTES.includes(route) ? route : null,
    params,
    focus: qs.get('focus') || null,
    mode: qs.get('mode') || null,
  };
}

// Mirror the new buildHash format
function buildHashString(tab, focus, params = {}) {
  if (!tab || !VALID_ROUTES.includes(tab)) return null;

  let path = tab;
  if (params.id) path += `/${params.id}`;

  const qs = new URLSearchParams();
  if (focus) qs.set('focus', focus);

  const suffix = qs.toString();
  return suffix ? `#${path}?${suffix}` : `#${path}`;
}

describe('Deep links — parseHash (legacy format)', () => {
  it('returns nulls for empty hash', () => {
    const r = parseHashString('');
    expect(r.tab).toBeNull();
    expect(r.focus).toBeNull();
  });

  it('returns nulls for bare hash', () => {
    const r = parseHashString('#');
    expect(r.tab).toBeNull();
  });

  it('parses tab from legacy hash', () => {
    const result = parseHashString('#tab=inbox');
    expect(result.tab).toBe('inbox');
    expect(result.focus).toBeNull();
  });

  it('parses tab + focus (legacy)', () => {
    const result = parseHashString('#tab=today&focus=tasks');
    expect(result.tab).toBe('today');
    expect(result.focus).toBe('tasks');
  });

  it('parses tab + focus + mode (legacy)', () => {
    const result = parseHashString('#tab=dashboard&focus=cockpit&mode=School');
    expect(result.tab).toBe('dashboard');
    expect(result.focus).toBe('cockpit');
    expect(result.mode).toBe('School');
  });

  it('rejects invalid tabs (legacy)', () => {
    const result = parseHashString('#tab=invalid');
    expect(result.tab).toBeNull();
  });

  it('accepts all valid routes via legacy format', () => {
    for (const tab of VALID_ROUTES) {
      const result = parseHashString(`#tab=${tab}`);
      expect(result.tab).toBe(tab);
    }
  });

  it('preserves focus even without valid tab (legacy)', () => {
    const result = parseHashString('#tab=bad&focus=tasks');
    expect(result.tab).toBeNull();
    expect(result.focus).toBe('tasks');
  });

  it('handles URL-encoded values (legacy)', () => {
    const result = parseHashString('#tab=today&focus=weekly%20review');
    expect(result.focus).toBe('weekly review');
  });
});

describe('Deep links — parseHash (clean format)', () => {
  it('parses simple route', () => {
    const result = parseHashString('#today');
    expect(result.tab).toBe('today');
    expect(result.focus).toBeNull();
    expect(result.params).toEqual({});
  });

  it('parses route with focus', () => {
    const result = parseHashString('#today?focus=tasks');
    expect(result.tab).toBe('today');
    expect(result.focus).toBe('tasks');
  });

  it('parses parameterized route', () => {
    const result = parseHashString('#projects/abc123');
    expect(result.tab).toBe('projects');
    expect(result.params).toEqual({ id: 'abc123' });
  });

  it('parses parameterized route with focus', () => {
    const result = parseHashString('#projects/abc123?focus=tasks');
    expect(result.tab).toBe('projects');
    expect(result.params).toEqual({ id: 'abc123' });
    expect(result.focus).toBe('tasks');
  });

  it('parses route with mode', () => {
    const result = parseHashString('#dashboard?mode=School');
    expect(result.tab).toBe('dashboard');
    expect(result.mode).toBe('School');
  });

  it('rejects invalid routes', () => {
    const result = parseHashString('#nonexistent');
    expect(result.tab).toBeNull();
  });

  it('accepts all valid routes', () => {
    for (const route of VALID_ROUTES) {
      const result = parseHashString(`#${route}`);
      expect(result.tab).toBe(route);
    }
  });

  it('only parses params for projects route', () => {
    const result = parseHashString('#inbox/something');
    expect(result.tab).toBe('inbox');
    expect(result.params).toEqual({});
  });
});

describe('Deep links — buildHash (clean format)', () => {
  it('builds hash with route only', () => {
    expect(buildHashString('today')).toBe('#today');
  });

  it('builds hash with route + focus', () => {
    expect(buildHashString('today', 'tasks')).toBe('#today?focus=tasks');
  });

  it('builds hash with route + params', () => {
    expect(buildHashString('projects', null, { id: 'abc123' })).toBe('#projects/abc123');
  });

  it('builds hash with route + params + focus', () => {
    expect(buildHashString('projects', 'tasks', { id: 'abc123' })).toBe('#projects/abc123?focus=tasks');
  });

  it('returns null for invalid route', () => {
    expect(buildHashString('nonexistent')).toBeNull();
  });

  it('omits focus when null', () => {
    expect(buildHashString('dashboard', null)).toBe('#dashboard');
  });

  it('builds correct format for all valid routes', () => {
    for (const route of VALID_ROUTES) {
      expect(buildHashString(route)).toBe(`#${route}`);
    }
  });

  it('roundtrips: build then parse', () => {
    const hash = buildHashString('today', 'tasks');
    const parsed = parseHashString(hash);
    expect(parsed.tab).toBe('today');
    expect(parsed.focus).toBe('tasks');
  });

  it('roundtrips parameterized: build then parse', () => {
    const hash = buildHashString('projects', null, { id: 'abc123' });
    const parsed = parseHashString(hash);
    expect(parsed.tab).toBe('projects');
    expect(parsed.params).toEqual({ id: 'abc123' });
  });
});

describe('Deep links — type mapping', () => {
  const TYPE_NAV = {
    task:    { tab: 'today', focus: 'tasks' },
    inbox:   { tab: 'inbox', focus: null },
    project: { tab: 'projects', focus: null },
    hours:   { tab: 'today', focus: 'mode' },
    logbook: { tab: 'today', focus: 'mode' },
    daily:   { tab: 'today', focus: null },
    journal: { tab: 'today', focus: 'reflection' },
  };

  it('maps all search result types to valid routes', () => {
    for (const [type, nav] of Object.entries(TYPE_NAV)) {
      expect(VALID_ROUTES).toContain(nav.tab);
    }
  });

  it('task navigates to today with tasks focus', () => {
    expect(TYPE_NAV.task).toEqual({ tab: 'today', focus: 'tasks' });
  });

  it('inbox navigates to inbox tab', () => {
    expect(TYPE_NAV.inbox.tab).toBe('inbox');
  });

  it('project navigates to projects tab', () => {
    expect(TYPE_NAV.project).toEqual({ tab: 'projects', focus: null });
  });

  it('BPV entries navigate to mode context', () => {
    expect(TYPE_NAV.hours.focus).toBe('mode');
    expect(TYPE_NAV.logbook.focus).toBe('mode');
  });

  it('journal navigates to reflection', () => {
    expect(TYPE_NAV.journal.focus).toBe('reflection');
  });
});
