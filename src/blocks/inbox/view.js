import { getInboxItems, addInboxItem, promoteToTask, archiveItem } from './store.js';
import { escapeHTML } from '../../utils.js';

export function renderInbox(container, context) {
  const mountId = crypto.randomUUID();
  const { mode, eventBus } = context;

  container.insertAdjacentHTML('beforeend', `
    <article class="inbox-block os-mini-card" data-mount-id="${mountId}">
      <div class="inbox-block__header">
        <h3 class="inbox-block__title">Inbox</h3>
        <button type="button" class="inbox-block__open btn btn-ghost btn-sm" title="Open inbox (Ctrl+I)">Verwerk</button>
        <button type="button" class="inbox-block__toggle btn btn-ghost btn-sm" aria-expanded="false" aria-label="Toon inbox items">
          <span class="inbox-block__count">0</span>
        </button>
      </div>
      <form class="inbox-block__form">
        <input type="text" class="form-input inbox-block__input" placeholder="Gedachte, idee, link..." autocomplete="off" />
        <div class="inbox-block__mode-tags">
          <button type="button" class="tag inbox-block__mode-tag" data-tag-mode="">Alles</button>
          <button type="button" class="tag inbox-block__mode-tag" data-tag-mode="BPV">BPV</button>
          <button type="button" class="tag inbox-block__mode-tag" data-tag-mode="School">School</button>
          <button type="button" class="tag inbox-block__mode-tag" data-tag-mode="Personal">Persoonlijk</button>
        </div>
      </form>
      <div class="inbox-block__list" hidden></div>
    </article>
  `);

  const el = container.querySelector(`[data-mount-id="${mountId}"]`);
  const input = el.querySelector('.inbox-block__input');
  const form = el.querySelector('.inbox-block__form');
  const listEl = el.querySelector('.inbox-block__list');
  const toggleBtn = el.querySelector('.inbox-block__toggle');
  const countEl = el.querySelector('.inbox-block__count');
  const modeTags = el.querySelectorAll('.inbox-block__mode-tag');

  let selectedMode = null;
  let expanded = false;

  function setSelectedMode(m) {
    selectedMode = m || null;
    modeTags.forEach((tag) => {
      tag.classList.toggle('selected', tag.getAttribute('data-tag-mode') === (m || ''));
    });
  }

  modeTags.forEach((tag) => {
    tag.addEventListener('click', () => {
      setSelectedMode(tag.getAttribute('data-tag-mode'));
    });
  });

  const openBtn = el.querySelector('.inbox-block__open');
  openBtn.addEventListener('click', () => {
    eventBus.emit('inbox:open');
  });

  toggleBtn.addEventListener('click', () => {
    expanded = !expanded;
    toggleBtn.setAttribute('aria-expanded', String(expanded));
    listEl.hidden = !expanded;
    if (expanded) renderList();
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    await addInboxItem(text, selectedMode);
    input.value = '';
    await refresh();
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      form.dispatchEvent(new Event('submit'));
    }
  });

  async function renderList() {
    const items = await getInboxItems();
    const recent = items.slice(0, 5);

    if (recent.length === 0) {
      listEl.innerHTML = '<p class="inbox-block__empty">Inbox is leeg</p>';
      return;
    }

    listEl.innerHTML = recent.map((item) => `
      <div class="inbox-block__item" data-item-id="${item.id}">
        <div class="inbox-block__item-content">
          <span class="inbox-block__item-text">${escapeHTML(item.text)}</span>
          ${item.mode ? `<span class="badge badge-default">${escapeHTML(item.mode)}</span>` : ''}
        </div>
        <div class="inbox-block__item-actions">
          <button type="button" class="btn btn-ghost btn-sm btn-icon" data-action="promote" title="Promoveer naar taak" aria-label="Promoveer naar taak">&#x2191;</button>
          <button type="button" class="btn btn-ghost btn-sm btn-icon" data-action="archive" title="Archiveer" aria-label="Archiveer">&#x2713;</button>
        </div>
      </div>
    `).join('');

    listEl.querySelectorAll('[data-action]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const itemId = btn.closest('[data-item-id]').getAttribute('data-item-id');
        if (btn.getAttribute('data-action') === 'promote') {
          await promoteToTask(itemId);
          eventBus.emit('tasks:changed');
        } else {
          await archiveItem(itemId);
        }
        await refresh();
      });
    });
  }

  async function refresh() {
    const items = await getInboxItems();
    const count = items.length;
    countEl.textContent = count;
    if (expanded) await renderList();
  }

  setSelectedMode('');
  refresh();

  return {
    unmount() {
      el?.remove();
    },
  };
}
