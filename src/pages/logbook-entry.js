import {
  getByKey, put, softDelete, undoDelete,
  getPhotosByLogbookId, put as putRecord, remove
} from '../db.js';
import { icon } from '../icons.js';
import { navigate } from '../router.js';
import { emit } from '../state.js';
import { showToast } from '../toast.js';
import {
  generateId, getISOWeek, getToday, isWithinBPV,
  formatDateLong, resizeImage, escapeHTML
} from '../utils.js';
import { TAGS } from '../constants.js';

export function createPage(container, params) {
  const isNew = !params.id || params.id === 'new';
  let entry = null;
  let photos = [];
  let selectedTags = new Set();

  async function load() {
    if (!isNew) {
      entry = await getByKey('logbook', params.id);
      if (entry) {
        selectedTags = new Set(entry.tags || []);
        const photoRecords = await getPhotosByLogbookId(entry.id);
        photos = photoRecords || [];
      }
    }
    render();
  }

  function render() {
    const date = entry?.date || getToday();
    const description = entry?.description || '';
    const withWhom = entry?.withWhom || '';
    const machines = entry?.machines || '';
    const problems = entry?.problems || '';
    const learnings = entry?.learnings || '';

    container.innerHTML = `
      <div class="hours-entry-header">
        <button class="btn btn-icon btn-ghost" data-action="back">
          ${icon('arrow-left')}
        </button>
        <div class="hours-entry-date">${isNew ? 'Nieuw logboek' : formatDateLong(date)}</div>
      </div>

      <form id="logbook-form">
        <div class="form-group">
          <label class="form-label" for="entry-date">Datum</label>
          <input type="date" id="entry-date" class="form-input" value="${date}">
        </div>

        <div class="form-group">
          <label class="form-label" for="description">Wat heb je gedaan? *</label>
          <textarea id="description" class="form-textarea" rows="4" placeholder="Beschrijf je werkzaamheden...">${escapeHTML(description)}</textarea>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label" for="with-whom">Met wie?</label>
            <input type="text" id="with-whom" class="form-input" value="${escapeHTML(withWhom)}" placeholder="Collega's, begeleider...">
          </div>
          <div class="form-group">
            <label class="form-label" for="machines">Machines / materialen</label>
            <input type="text" id="machines" class="form-input" value="${escapeHTML(machines)}" placeholder="CNC, draaibank, etc.">
          </div>
        </div>

        <div class="form-group">
          <label class="form-label" for="problems">Problemen / uitdagingen</label>
          <textarea id="problems" class="form-textarea" rows="2" placeholder="Wat ging er mis of was lastig?">${escapeHTML(problems)}</textarea>
        </div>

        <div class="form-group">
          <label class="form-label" for="learnings">Leerpunten</label>
          <textarea id="learnings" class="form-textarea" rows="2" placeholder="Wat heb je geleerd?">${escapeHTML(learnings)}</textarea>
        </div>

        <div class="form-group">
          <label class="form-label">Tags</label>
          <div class="logbook-filters" id="tag-selector">
            ${TAGS.map(t => `
              <span class="tag ${selectedTags.has(t) ? 'selected' : ''}" data-tag="${t}">${t}</span>
            `).join('')}
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Foto's</label>
          <div class="thumbnail-grid" id="photo-grid">
            ${photos.map(p => `
              <div class="thumbnail" data-photo-id="${p.id}">
                <img src="${URL.createObjectURL(p.thumbnail || p.blob)}" alt="Foto">
                <button class="thumbnail-delete" data-delete-photo="${p.id}" type="button">&times;</button>
              </div>
            `).join('')}
          </div>
          <div style="margin-top: var(--space-3)">
            <label class="btn btn-secondary btn-sm">
              ${icon('camera', 14)} Foto toevoegen
              <input type="file" accept="image/*" multiple id="photo-input" style="display:none">
            </label>
          </div>
        </div>

        <div class="hours-entry-actions">
          <button type="submit" class="btn btn-primary" data-action="save">
            ${icon('save', 16)} Opslaan
          </button>
          ${!isNew ? `
            <button type="button" class="btn btn-danger" data-action="delete">
              ${icon('trash', 16)} Verwijderen
            </button>
          ` : ''}
        </div>
      </form>
    `;

    // Back
    container.querySelector('[data-action="back"]').addEventListener('click', () => {
      navigate('logbook');
    });

    // Tag selection
    container.querySelectorAll('#tag-selector .tag').forEach(tag => {
      tag.addEventListener('click', () => {
        const t = tag.dataset.tag;
        if (selectedTags.has(t)) {
          selectedTags.delete(t);
          tag.classList.remove('selected');
        } else {
          selectedTags.add(t);
          tag.classList.add('selected');
        }
      });
    });

    // Photo input
    container.querySelector('#photo-input')?.addEventListener('change', async (e) => {
      const files = Array.from(e.target.files);
      for (const file of files) {
        if (photos.length >= 5) {
          showToast('Maximaal 5 foto\'s per entry', { type: 'warning' });
          break;
        }
        if (file.size > 5 * 1024 * 1024) {
          showToast('Foto te groot (max 5MB)', { type: 'error' });
          continue;
        }
        try {
          const thumbnail = await resizeImage(file, 200);
          const photo = {
            id: generateId(),
            logbookId: entry?.id || null, // will be set on save
            blob: file,
            thumbnail,
            filename: file.name,
            mimeType: file.type,
            size: file.size,
            createdAt: Date.now()
          };
          photos.push(photo);
        } catch (err) {
          showToast('Foto kon niet worden verwerkt', { type: 'error' });
        }
      }
      render(); // re-render to show new photos
    });

    // Delete photos
    container.querySelectorAll('[data-delete-photo]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const photoId = btn.dataset.deletePhoto;
        photos = photos.filter(p => p.id !== photoId);
        // Also remove from DB if it was saved
        remove('photos', photoId).catch(() => {});
        render();
      });
    });

    // Save
    container.querySelector('#logbook-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      await save();
    });

    // Delete
    container.querySelector('[data-action="delete"]')?.addEventListener('click', async () => {
      await deleteEntry();
    });
  }

  async function save() {
    const date = document.getElementById('entry-date').value;
    const description = document.getElementById('description').value.trim();

    if (!description || description.length < 5) {
      showToast('Beschrijving is verplicht (min. 5 tekens)', { type: 'error' });
      return;
    }

    if (!isWithinBPV(date)) {
      showToast('Datum valt buiten de BPV-periode', { type: 'error' });
      return;
    }

    const id = entry?.id || generateId();

    // Save photos
    const photoIds = [];
    for (const photo of photos) {
      photo.logbookId = id;
      await put('photos', photo);
      photoIds.push(photo.id);
    }

    const record = {
      id,
      date,
      week: getISOWeek(date),
      description,
      withWhom: document.getElementById('with-whom').value.trim(),
      machines: document.getElementById('machines').value.trim(),
      problems: document.getElementById('problems').value.trim(),
      learnings: document.getElementById('learnings').value.trim(),
      tags: Array.from(selectedTags),
      photos: photoIds,
      createdAt: entry?.createdAt || Date.now(),
      updatedAt: Date.now()
    };

    await put('logbook', record);
    emit('logbook:updated');
    showToast('Logboek opgeslagen', { type: 'success' });
    navigate('logbook');
  }

  async function deleteEntry() {
    if (!entry) return;
    const id = entry.id;
    // Delete associated photos
    for (const photoId of (entry.photos || [])) {
      await remove('photos', photoId).catch(() => {});
    }
    await softDelete('logbook', id);
    emit('logbook:updated');
    showToast('Entry verwijderd', {
      type: 'info',
      action: {
        label: 'Ongedaan maken',
        onClick: async () => {
          await undoDelete(id);
          emit('logbook:updated');
          showToast('Hersteld', { type: 'success' });
        }
      }
    });
    navigate('logbook');
  }

  load();
  return {};
}
