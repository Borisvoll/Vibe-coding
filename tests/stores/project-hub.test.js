/**
 * Project Hub 2.0 — Store tests
 * Tests for cover, accent color, mindmap, and file attachment store methods.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { initDB } from '../../src/db.js';
import {
  addProject, getProjectById,
  setCover, setAccentColor,
  updateMindmap,
  addFile, removeFile,
  setPinned, unpinProject, getPinnedProject,
} from '../../src/stores/projects.js';

beforeEach(async () => {
  await initDB();
});

describe('Project Hub 2.0 — cover & accent color', () => {
  it('setCover stores a dataUrl on the project', async () => {
    const p = await addProject('Cover project', '', 'School');
    const updated = await setCover(p.id, 'data:image/jpeg;base64,abc123');
    expect(updated.cover).toBe('data:image/jpeg;base64,abc123');
  });

  it('setCover with null removes the cover', async () => {
    const p = await addProject('Cover remove', '', 'School');
    await setCover(p.id, 'data:image/jpeg;base64,abc');
    const updated = await setCover(p.id, null);
    expect(updated.cover).toBeNull();
  });

  it('setCover returns null for non-existent project', async () => {
    const result = await setCover('non-existent', 'data:image/jpeg;base64,abc');
    expect(result).toBeNull();
  });

  it('setAccentColor stores a CSS color string', async () => {
    const p = await addProject('Accent project', '', 'School');
    const updated = await setAccentColor(p.id, 'rgb(120, 80, 200)');
    expect(updated.accentColor).toBe('rgb(120, 80, 200)');
  });

  it('setAccentColor can be cleared with null', async () => {
    const p = await addProject('Accent clear', '', 'School');
    await setAccentColor(p.id, '#ff0000');
    const updated = await setAccentColor(p.id, null);
    expect(updated.accentColor).toBeNull();
  });

  it('cover and accentColor are independent fields', async () => {
    const p = await addProject('Both', '', 'School');
    await setCover(p.id, 'data:image/png;base64,xyz');
    await setAccentColor(p.id, '#abcdef');
    const loaded = await getProjectById(p.id);
    expect(loaded.cover).toBe('data:image/png;base64,xyz');
    expect(loaded.accentColor).toBe('#abcdef');
  });
});

describe('Project Hub 2.0 — mindmap', () => {
  it('updateMindmap stores node array on project', async () => {
    const p = await addProject('Mindmap project', '', 'School');
    const nodes = [
      { id: 'root', parentId: null, label: 'Mindmap project' },
      { id: 'child1', parentId: 'root', label: 'Idee 1' },
    ];
    const updated = await updateMindmap(p.id, nodes);
    expect(updated.mindmap).toHaveLength(2);
    expect(updated.mindmap[0].id).toBe('root');
    expect(updated.mindmap[1].label).toBe('Idee 1');
  });

  it('updateMindmap with empty array clears nodes', async () => {
    const p = await addProject('Clear mindmap', '', 'School');
    await updateMindmap(p.id, [{ id: 'root', parentId: null, label: 'Root' }]);
    const updated = await updateMindmap(p.id, []);
    expect(updated.mindmap).toHaveLength(0);
  });

  it('updateMindmap returns null for non-existent project', async () => {
    const result = await updateMindmap('non-existent', []);
    expect(result).toBeNull();
  });

  it('project without mindmap has no mindmap field initially', async () => {
    const p = await addProject('No mindmap', '', 'School');
    const loaded = await getProjectById(p.id);
    expect(loaded.mindmap).toBeUndefined();
  });
});

describe('Project Hub 2.0 — file attachments', () => {
  it('addFile appends a file entry to project.files', async () => {
    const p = await addProject('Files project', '', 'School');
    const entry = { id: 'f1', name: 'doc.pdf', size: 1024, type: 'application/pdf', dataUrl: 'data:application/pdf;base64,abc' };
    const updated = await addFile(p.id, entry);
    expect(updated.files).toHaveLength(1);
    expect(updated.files[0].name).toBe('doc.pdf');
    expect(updated.files[0].id).toBe('f1');
  });

  it('addFile appends to existing files', async () => {
    const p = await addProject('Multi files', '', 'School');
    await addFile(p.id, { id: 'f1', name: 'a.pdf', size: 100, type: 'application/pdf', dataUrl: 'data:a' });
    const updated = await addFile(p.id, { id: 'f2', name: 'b.png', size: 200, type: 'image/png', dataUrl: 'data:b' });
    expect(updated.files).toHaveLength(2);
  });

  it('addFile returns null for non-existent project', async () => {
    const result = await addFile('non-existent', { id: 'f1', name: 'x', size: 0, type: '', dataUrl: '' });
    expect(result).toBeNull();
  });

  it('removeFile deletes a file by id', async () => {
    const p = await addProject('Remove file', '', 'School');
    await addFile(p.id, { id: 'f1', name: 'keep.pdf', size: 100, type: 'application/pdf', dataUrl: 'data:a' });
    await addFile(p.id, { id: 'f2', name: 'remove.pdf', size: 200, type: 'application/pdf', dataUrl: 'data:b' });
    const updated = await removeFile(p.id, 'f2');
    expect(updated.files).toHaveLength(1);
    expect(updated.files[0].id).toBe('f1');
  });

  it('removeFile on non-existent file id changes nothing', async () => {
    const p = await addProject('File noop', '', 'School');
    await addFile(p.id, { id: 'f1', name: 'keep.pdf', size: 100, type: 'application/pdf', dataUrl: 'data:a' });
    const updated = await removeFile(p.id, 'does-not-exist');
    expect(updated.files).toHaveLength(1);
  });

  it('removeFile returns null for non-existent project', async () => {
    const result = await removeFile('non-existent', 'f1');
    expect(result).toBeNull();
  });
});

describe('Project Hub 2.0 — pin to today', () => {
  it('setPinned sets pinnedForMode on the project', async () => {
    const p = await addProject('Pin project', '', 'School');
    const updated = await setPinned(p.id, 'School');
    expect(updated.pinnedForMode).toBe('School');
  });

  it('getPinnedProject returns the pinned project for a mode', async () => {
    const p = await addProject('Pinned', '', 'School');
    await setPinned(p.id, 'School');
    const pinned = await getPinnedProject('School');
    expect(pinned).not.toBeNull();
    expect(pinned.id).toBe(p.id);
  });

  it('getPinnedProject returns null when nothing pinned', async () => {
    await addProject('Unpinned', '', 'School');
    const pinned = await getPinnedProject('School');
    expect(pinned).toBeNull();
  });

  it('setPinned clears previous pin in same mode (one per mode)', async () => {
    const p1 = await addProject('First', '', 'School');
    const p2 = await addProject('Second', '', 'School');
    await setPinned(p1.id, 'School');
    await setPinned(p2.id, 'School');
    const pinned = await getPinnedProject('School');
    expect(pinned.id).toBe(p2.id);
    // Verify p1 is no longer pinned
    const p1Loaded = await getProjectById(p1.id);
    expect(p1Loaded.pinnedForMode).toBeNull();
  });

  it('pin is per-mode (BPV pin does not affect School)', async () => {
    const school = await addProject('School proj', '', 'School');
    const bpv = await addProject('BPV proj', '', 'BPV');
    await setPinned(school.id, 'School');
    await setPinned(bpv.id, 'BPV');
    const schoolPin = await getPinnedProject('School');
    const bpvPin = await getPinnedProject('BPV');
    expect(schoolPin.id).toBe(school.id);
    expect(bpvPin.id).toBe(bpv.id);
  });

  it('unpinProject clears pinnedForMode', async () => {
    const p = await addProject('Unpin me', '', 'School');
    await setPinned(p.id, 'School');
    await unpinProject(p.id);
    const pinned = await getPinnedProject('School');
    expect(pinned).toBeNull();
    const loaded = await getProjectById(p.id);
    expect(loaded.pinnedForMode).toBeNull();
  });
});
