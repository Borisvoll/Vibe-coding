import { getAllLogbookSorted, getPhotosByLogbookId } from '../db.js';
import { icon } from '../icons.js';
import { navigate } from '../router.js';
import { on } from '../state.js';
import { formatDateShort, truncate } from '../utils.js';
import { TAGS } from '../constants.js';

export function createPage(container) {
  let unsub;
  let selectedTag = '';

  async function render() {
    let entries = await getAllLogbookSorted();

    if (selectedTag) {
      entries = entries.filter(e => e.tags && e.tags.includes(selectedTag));
    }

    container.innerHTML = `
      <div class="page-header">
        <h2>Daglogboek</h2>
        <p>${entries.length} entr${entries.length === 1 ? 'y' : 'ies'}</p>
      </div>

      <div class="logbook-filters">
        <span class="tag ${selectedTag === '' ? 'selected' : ''}" data-tag="">Alle</span>
        ${TAGS.map(t => `
          <span class="tag ${selectedTag === t ? 'selected' : ''}" data-tag="${t}">${t}</span>
        `).join('')}
      </div>

      <div class="logbook-list">
        ${entries.length === 0 ? `
          <div class="empty-state">
            <div class="empty-state-icon">${icon('book', 48)}</div>
            <h3>Nog geen logboek entries</h3>
            <p>Voeg je eerste daglogboek entry toe.</p>
            <button class="btn btn-primary" data-action="new">
              ${icon('plus', 16)} Nieuwe entry
            </button>
          </div>
        ` : entries.map(entry => `
          <div class="logbook-entry-card" data-id="${entry.id}">
            <div class="card card-clickable">
              <div class="logbook-card-header">
                <strong>${formatDateShort(entry.date)}</strong>
                <span class="logbook-card-date">${entry.date}</span>
              </div>
              <div class="logbook-card-desc">${truncate(entry.description, 150)}</div>
              <div class="logbook-card-footer">
                <div class="logbook-card-tags">
                  ${(entry.tags || []).map(t => `<span class="badge badge-default">${t}</span>`).join('')}
                </div>
                ${(entry.photos && entry.photos.length > 0)
                  ? `<span class="logbook-card-photos">${icon('image', 14)} ${entry.photos.length}</span>`
                  : ''
                }
              </div>
            </div>
          </div>
        `).join('')}
      </div>

      <button class="fab" data-action="new" title="Nieuwe entry">
        ${icon('plus')}
      </button>
    `;

    // Tag filter
    container.querySelectorAll('.tag').forEach(tag => {
      tag.addEventListener('click', () => {
        selectedTag = tag.dataset.tag || '';
        render();
      });
    });

    // Click entries
    container.querySelectorAll('.logbook-entry-card').forEach(card => {
      card.addEventListener('click', () => {
        navigate(`logbook/${card.dataset.id}`);
      });
    });

    // New entry buttons
    container.querySelectorAll('[data-action="new"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        navigate('logbook/new');
      });
    });
  }

  render();
  unsub = on('logbook:updated', render);

  return {
    destroy() {
      if (unsub) unsub();
    }
  };
}
