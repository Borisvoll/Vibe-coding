import { describe, it, expect, beforeEach } from 'vitest';
import { initDB } from '../../src/db.js';
import { addInboxItem, getInboxItems, archiveItem, promoteToTask } from '../../src/stores/inbox.js';

beforeEach(async () => {
  // Each test gets a fresh DB (fake-indexeddb resets between files by default,
  // but we re-init to ensure stores exist)
  await initDB();
});

describe('Inbox store', () => {
  it('addInboxItem creates a thought item', async () => {
    const item = await addInboxItem('Test thought', 'BPV');
    expect(item.id).toBeDefined();
    expect(item.text).toBe('Test thought');
    expect(item.type).toBe('thought');
    expect(item.mode).toBe('BPV');
    expect(item.status).toBe('inbox');
    expect(item.url).toBeNull();
    expect(item.createdAt).toBeDefined();
  });

  it('addInboxItem detects links', async () => {
    const item = await addInboxItem('https://example.com', 'School');
    expect(item.type).toBe('link');
    expect(item.url).toBe('https://example.com');
  });

  it('addInboxItem trims text', async () => {
    const item = await addInboxItem('  spaced  ', null);
    expect(item.text).toBe('spaced');
  });

  it('addInboxItem rejects empty text', async () => {
    await expect(addInboxItem('', 'BPV')).rejects.toThrow('text');
  });

  it('addInboxItem rejects invalid mode', async () => {
    await expect(addInboxItem('ok', 'InvalidMode')).rejects.toThrow('mode');
  });

  it('getInboxItems returns only inbox status, sorted by createdAt desc', async () => {
    await addInboxItem('First', null);
    // Ensure distinct timestamps
    await new Promise((r) => setTimeout(r, 5));
    await addInboxItem('Second', null);
    const items = await getInboxItems();
    expect(items).toHaveLength(2);
    expect(items[0].text).toBe('Second');
    expect(items[1].text).toBe('First');
  });

  it('archiveItem changes status to archived', async () => {
    const item = await addInboxItem('To archive', null);
    const result = await archiveItem(item.id);
    expect(result.status).toBe('archived');

    const remaining = await getInboxItems();
    expect(remaining).toHaveLength(0);
  });

  it('archiveItem returns null for non-existent id', async () => {
    const result = await archiveItem('non-existent');
    expect(result).toBeNull();
  });

  it('promoteToTask creates a task and marks item promoted', async () => {
    const item = await addInboxItem('Promote me', 'BPV');
    const task = await promoteToTask(item.id);
    expect(task).toBeDefined();
    expect(task.text).toBe('Promote me');
    expect(task.mode).toBe('BPV');

    const remaining = await getInboxItems();
    expect(remaining).toHaveLength(0);
  });
});
