import { describe, it, expect, beforeEach } from 'vitest';
import { initDB, getSetting, setSetting } from '../../src/db.js';

beforeEach(async () => {
  await initDB();
});

describe('Friday banner — snooze/disable settings', () => {
  it('friday_banner_disabled defaults to falsy', async () => {
    const val = await getSetting('friday_banner_disabled');
    expect(!val).toBe(true);
  });

  it('can disable friday banner via setting', async () => {
    await setSetting('friday_banner_disabled', true);
    const val = await getSetting('friday_banner_disabled');
    expect(val).toBe(true);
  });

  it('snooze stores a future date', async () => {
    const futureDate = '2026-03-01';
    await setSetting('friday_banner_snoozed_until', futureDate);
    const val = await getSetting('friday_banner_snoozed_until');
    expect(val).toBe(futureDate);
  });

  it('snooze date comparison works for suppression', async () => {
    const today = '2026-02-21';
    const snoozedUntil = '2026-02-28'; // snoozed until next week
    expect(today < snoozedUntil).toBe(true);

    const expired = '2026-02-20'; // snoozed until yesterday
    expect(today < expired).toBe(false);
  });
});
