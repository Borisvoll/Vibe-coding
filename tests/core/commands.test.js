import { describe, it, expect, vi } from 'vitest';
import { createCommandRegistry } from '../../src/core/commands.js';

describe('Command Registry', () => {
  it('register + getAll returns all commands', () => {
    const reg = createCommandRegistry();
    reg.register('nav:home', { label: 'Home', icon: '◫', group: 'navigate', handler: () => {} });
    reg.register('nav:inbox', { label: 'Inbox', icon: '📥', group: 'navigate', handler: () => {} });

    const all = reg.getAll();
    expect(all).toHaveLength(2);
    expect(all[0].id).toBe('nav:home');
    expect(all[1].id).toBe('nav:inbox');
  });

  it('register ignores commands without required fields', () => {
    const reg = createCommandRegistry();
    reg.register('', { label: 'X', handler: () => {} });
    reg.register('a', { label: '', handler: () => {} });
    reg.register('b', { label: 'Y' });
    expect(reg.getAll()).toHaveLength(0);
  });

  it('register stores all fields correctly', () => {
    const reg = createCommandRegistry();
    const handler = vi.fn();
    reg.register('test:cmd', {
      label: 'Test',
      icon: '⚙',
      group: 'navigate',
      keywords: ['zoek', 'find'],
      shortcut: 'Ctrl+T',
      handler,
    });

    const cmd = reg.getAll()[0];
    expect(cmd.id).toBe('test:cmd');
    expect(cmd.label).toBe('Test');
    expect(cmd.icon).toBe('⚙');
    expect(cmd.group).toBe('navigate');
    expect(cmd.keywords).toEqual(['zoek', 'find']);
    expect(cmd.shortcut).toBe('Ctrl+T');
  });

  it('filter returns all commands for empty query', () => {
    const reg = createCommandRegistry();
    reg.register('a', { label: 'Alpha', icon: '', group: 'g', handler: () => {} });
    reg.register('b', { label: 'Beta', icon: '', group: 'g', handler: () => {} });

    expect(reg.filter('')).toHaveLength(2);
    expect(reg.filter(null)).toHaveLength(2);
  });

  it('filter matches on label', () => {
    const reg = createCommandRegistry();
    reg.register('nav:dash', { label: 'Ga naar Dashboard', icon: '', group: 'navigate', handler: () => {} });
    reg.register('nav:inbox', { label: 'Ga naar Inbox', icon: '', group: 'navigate', handler: () => {} });

    const results = reg.filter('dashboard');
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('nav:dash');
  });

  it('filter matches on keywords', () => {
    const reg = createCommandRegistry();
    reg.register('nav:settings', {
      label: 'Instellingen',
      icon: '',
      group: 'navigate',
      keywords: ['settings', 'configuratie'],
      handler: () => {},
    });

    const results = reg.filter('config');
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('nav:settings');
  });

  it('filter returns results sorted by score descending', () => {
    const reg = createCommandRegistry();
    reg.register('a', { label: 'Project hub', icon: '', group: 'g', handler: () => {} });
    reg.register('b', { label: 'Nieuw project aanmaken', icon: '', group: 'g', handler: () => {} });

    const results = reg.filter('project');
    expect(results).toHaveLength(2);
    // Exact substring at start should score higher
    expect(results[0].id).toBe('a');
  });

  it('filter excludes non-matching commands', () => {
    const reg = createCommandRegistry();
    reg.register('a', { label: 'Dashboard', icon: '', group: 'g', handler: () => {} });
    reg.register('b', { label: 'Inbox', icon: '', group: 'g', handler: () => {} });

    const results = reg.filter('xyz123');
    expect(results).toHaveLength(0);
  });

  it('execute calls the correct handler', async () => {
    const reg = createCommandRegistry();
    const handler = vi.fn(() => 'result');
    reg.register('test', { label: 'Test', icon: '', group: 'g', handler });

    const result = await reg.execute('test');
    expect(handler).toHaveBeenCalledOnce();
    expect(result).toBe('result');
  });

  it('execute returns undefined for unknown command', async () => {
    const reg = createCommandRegistry();
    const result = await reg.execute('nonexistent');
    expect(result).toBeUndefined();
  });

  it('execute handles async handlers', async () => {
    const reg = createCommandRegistry();
    reg.register('async', {
      label: 'Async',
      icon: '',
      group: 'g',
      handler: async () => {
        return 'async-result';
      },
    });

    const result = await reg.execute('async');
    expect(result).toBe('async-result');
  });

  it('overwriting a command replaces it', () => {
    const reg = createCommandRegistry();
    reg.register('cmd', { label: 'V1', icon: '', group: 'g', handler: () => {} });
    reg.register('cmd', { label: 'V2', icon: '', group: 'g', handler: () => {} });

    const all = reg.getAll();
    expect(all).toHaveLength(1);
    expect(all[0].label).toBe('V2');
  });
});
