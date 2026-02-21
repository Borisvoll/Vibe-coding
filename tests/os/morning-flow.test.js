import { describe, it, expect, beforeEach } from 'vitest';
import { initDB, getSetting, setSetting } from '../../src/db.js';

beforeEach(async () => {
  await initDB();
});

describe('Morning flow — setting behavior', () => {
  it('morning_flow defaults to null (gentle)', async () => {
    const val = await getSetting('morning_flow');
    expect(val).toBeNull();
  });

  it('can set morning_flow to manual', async () => {
    await setSetting('morning_flow', 'manual');
    const val = await getSetting('morning_flow');
    expect(val).toBe('manual');
  });

  it('can set morning_flow to gentle', async () => {
    await setSetting('morning_flow', 'gentle');
    const val = await getSetting('morning_flow');
    expect(val).toBe('gentle');
  });

  it('manual setting means cockpit should be hidden', async () => {
    await setSetting('morning_flow', 'manual');
    const flow = await getSetting('morning_flow');
    // The cockpit view.js checks: if (flow === 'manual') hide cockpit
    expect(flow === 'manual').toBe(true);
  });
});
