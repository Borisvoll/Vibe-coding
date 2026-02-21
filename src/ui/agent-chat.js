/**
 * Agent Chat — floating chat panel for BORIS OS
 *
 * Usage:
 *   const chat = createAgentChat({ modeManager, eventBus });
 *   document.body.appendChild(chat.fab);
 *   document.body.appendChild(chat.panel);
 *   // Open programmatically:
 *   chat.open();
 *   // Clean up:
 *   chat.destroy();
 */
import { escapeHTML } from '../utils.js';
import { getApiKey, saveApiKey, removeApiKey, sendMessage } from '../agent/agent.js';

// ── SVG icons (inline, zero deps) ────────────────────────────────────────────

const ICON_AGENT = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <circle cx="12" cy="12" r="3"/>
  <path d="M12 2v3M12 19v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M2 12h3M19 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12"/>
</svg>`;

const ICON_CLOSE = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
</svg>`;

const ICON_SEND = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
  <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
</svg>`;

// ── Factory ───────────────────────────────────────────────────────────────────

export function createAgentChat({ modeManager, eventBus }) {
  // State
  let isOpen = false;
  let isLoading = false;
  /** @type {Array<{role:string, content:string|Array}>} */
  let conversationHistory = [];
  let hasKey = false;

  // ── DOM: floating action button ─────────────────────────────────────────────
  const fab = document.createElement('button');
  fab.className = 'agent-fab';
  fab.setAttribute('aria-label', 'Open AI-assistent (Ctrl+A)');
  fab.setAttribute('title', 'AI-assistent (Ctrl+A)');
  fab.innerHTML = `${ICON_AGENT}<span class="agent-fab__badge"></span>`;

  // ── DOM: chat panel ─────────────────────────────────────────────────────────
  const panel = document.createElement('div');
  panel.className = 'agent-panel';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-label', 'AI-assistent');
  panel.hidden = false; // kept in DOM, hidden via CSS

  panel.innerHTML = `
    <div class="agent-panel__header">
      <span class="agent-panel__header-icon">${ICON_AGENT}</span>
      <span class="agent-panel__title">BORIS Agent</span>
      <button class="agent-panel__close" aria-label="Sluiten">${ICON_CLOSE}</button>
    </div>

    <div class="agent-panel__body">
      <!-- Filled dynamically: setup screen OR messages -->
    </div>

    <div class="agent-panel__footer">
      <button class="agent-panel__reset-key" type="button">API-sleutel wijzigen</button>
    </div>
  `;

  const bodyEl = panel.querySelector('.agent-panel__body');
  const resetKeyBtn = panel.querySelector('.agent-panel__reset-key');

  // ── Render helpers ───────────────────────────────────────────────────────────

  function renderSetup(errorMsg = '') {
    bodyEl.innerHTML = `
      <div class="agent-setup">
        <div class="agent-setup__icon">🔑</div>
        <p class="agent-setup__title">API-sleutel instellen</p>
        <p class="agent-setup__desc">
          Voer je Anthropic API-sleutel in. Deze wordt lokaal opgeslagen in BORIS en nooit gedeeld.
        </p>
        <input
          class="agent-setup__input"
          type="password"
          placeholder="sk-ant-..."
          autocomplete="off"
          spellcheck="false"
        />
        ${errorMsg ? `<p class="agent-setup__error">${escapeHTML(errorMsg)}</p>` : ''}
        <button class="agent-setup__btn" type="button">Opslaan &amp; starten</button>
        <p class="agent-setup__desc" style="font-size:11px">
          Sleutel aanmaken via <a href="https://console.anthropic.com/account/keys" target="_blank" rel="noopener" style="color:var(--ui-accent)">console.anthropic.com</a>
        </p>
      </div>
    `;

    const input = bodyEl.querySelector('.agent-setup__input');
    const btn = bodyEl.querySelector('.agent-setup__btn');

    async function handleSave() {
      const val = input.value.trim();
      if (!val) return;
      await saveApiKey(val);
      hasKey = true;
      renderChat();
    }

    btn.addEventListener('click', handleSave);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleSave();
    });

    input.focus();
  }

  function renderChat() {
    bodyEl.innerHTML = `
      <div class="agent-panel__messages" aria-live="polite" aria-label="Gesprek"></div>
      <div class="agent-panel__input-area">
        <textarea
          class="agent-panel__input"
          placeholder="Stel een vraag of geef een opdracht…"
          rows="1"
          aria-label="Bericht"
        ></textarea>
        <button class="agent-panel__send" aria-label="Versturen" disabled>${ICON_SEND}</button>
      </div>
    `;

    const messagesEl = bodyEl.querySelector('.agent-panel__messages');
    const inputEl = bodyEl.querySelector('.agent-panel__input');
    const sendBtn = bodyEl.querySelector('.agent-panel__send');

    // Re-render persisted conversation
    conversationHistory.forEach((msg) => {
      if (msg.role === 'user') appendUserBubble(messagesEl, extractText(msg.content));
      if (msg.role === 'assistant') appendAssistantBubble(messagesEl, extractText(msg.content));
    });
    scrollToBottom(messagesEl);

    // Auto-resize textarea
    inputEl.addEventListener('input', () => {
      sendBtn.disabled = inputEl.value.trim() === '' || isLoading;
      inputEl.style.height = 'auto';
      inputEl.style.height = Math.min(inputEl.scrollHeight, 120) + 'px';
    });

    inputEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (!sendBtn.disabled) handleSend();
      }
    });

    sendBtn.addEventListener('click', handleSend);

    async function handleSend() {
      const text = inputEl.value.trim();
      if (!text || isLoading) return;

      inputEl.value = '';
      inputEl.style.height = 'auto';
      sendBtn.disabled = true;
      isLoading = true;

      // Show user message
      appendUserBubble(messagesEl, text);
      conversationHistory.push({ role: 'user', content: text });

      // Show typing indicator
      const typingEl = appendTyping(messagesEl);
      scrollToBottom(messagesEl);

      // Update FAB badge
      fab.classList.add('agent-fab--active');

      try {
        const mode = modeManager.getMode();
        const result = await sendMessage(
          conversationHistory,
          mode,
          eventBus,
          (toolName) => {
            // Show tool activity in UI
            updateToolActivity(typingEl, toolName);
          }
        );

        conversationHistory = result.messages;

        typingEl.remove();
        appendAssistantBubble(messagesEl, result.text);
      } catch (err) {
        typingEl.remove();

        if (err.message === 'NO_KEY' || err.message === 'INVALID_KEY') {
          hasKey = false;
          const errMsg =
            err.message === 'INVALID_KEY' ? 'Ongeldige API-sleutel. Probeer opnieuw.' : '';
          await removeApiKey();
          renderSetup(errMsg);
          return;
        }

        appendAssistantBubble(
          messagesEl,
          `⚠️ Fout: ${escapeHTML(err.message)}`,
          true
        );
      } finally {
        isLoading = false;
        sendBtn.disabled = inputEl.value.trim() === '';
        scrollToBottom(messagesEl);
      }
    }

    // Focus input when chat opens
    setTimeout(() => inputEl.focus(), 50);
  }

  // ── Bubble helpers ──────────────────────────────────────────────────────────

  function appendUserBubble(container, text) {
    const el = document.createElement('div');
    el.className = 'agent-msg agent-msg--user';
    el.innerHTML = `<div class="agent-msg__bubble">${escapeHTML(text)}</div>`;
    container.appendChild(el);
  }

  function appendAssistantBubble(container, text, isError = false) {
    const el = document.createElement('div');
    el.className = 'agent-msg agent-msg--assistant';
    const style = isError ? ' style="color:var(--ui-danger)"' : '';
    // Render simple markdown: **bold** and newlines
    const html = renderMarkdown(text);
    el.innerHTML = `<div class="agent-msg__bubble"${style}>${html}</div>`;
    container.appendChild(el);
  }

  function appendTyping(container) {
    const el = document.createElement('div');
    el.className = 'agent-typing';
    el.innerHTML = `
      <span class="agent-typing__dot"></span>
      <span class="agent-typing__dot"></span>
      <span class="agent-typing__dot"></span>
    `;
    container.appendChild(el);
    return el;
  }

  function updateToolActivity(typingEl, toolName) {
    const TOOL_LABELS = {
      get_tasks: 'taken ophalen…',
      create_task: 'taak aanmaken…',
      complete_task: 'taak afronden…',
      get_projects: 'projecten ophalen…',
      get_daily_plan: 'dagplan ophalen…',
      set_daily_outcomes: 'doelen instellen…',
      add_daily_todo: 'todo toevoegen…',
      get_inbox: 'inbox ophalen…',
    };
    typingEl.setAttribute('title', TOOL_LABELS[toolName] || toolName);
  }

  function scrollToBottom(el) {
    requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
    });
  }

  /** Extract plain text from content (string or content array) */
  function extractText(content) {
    if (typeof content === 'string') return content;
    if (Array.isArray(content)) {
      return content
        .filter((b) => b.type === 'text')
        .map((b) => b.text)
        .join('');
    }
    return '';
  }

  /** Very minimal markdown: **bold**, *italic*, newlines → <br> */
  function renderMarkdown(text) {
    return escapeHTML(text)
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br>');
  }

  // ── Open / close ────────────────────────────────────────────────────────────

  async function open() {
    if (isOpen) return;
    isOpen = true;

    hasKey = !!(await getApiKey());

    panel.classList.add('agent-panel--open');
    resetKeyBtn.style.display = hasKey ? '' : 'none';

    if (!hasKey) {
      renderSetup();
    } else if (!bodyEl.querySelector('.agent-panel__messages')) {
      // First open with key — render chat
      renderChat();
    }
  }

  function close() {
    if (!isOpen) return;
    isOpen = false;
    panel.classList.remove('agent-panel--open');
  }

  function toggle() {
    isOpen ? close() : open();
  }

  // ── Event listeners ─────────────────────────────────────────────────────────

  fab.addEventListener('click', toggle);
  panel.querySelector('.agent-panel__close').addEventListener('click', close);

  resetKeyBtn.addEventListener('click', async () => {
    await removeApiKey();
    hasKey = false;
    bodyEl.innerHTML = ''; // clear chat
    conversationHistory = [];
    renderSetup();
    resetKeyBtn.style.display = 'none';
  });

  // Close on Escape
  function onKeydown(e) {
    if (e.key === 'Escape' && isOpen) close();
  }
  document.addEventListener('keydown', onKeydown);

  // ── Public API ──────────────────────────────────────────────────────────────

  return {
    fab,
    panel,
    open,
    close,
    toggle,
    get isOpen() {
      return isOpen;
    },
    destroy() {
      document.removeEventListener('keydown', onKeydown);
      fab.remove();
      panel.remove();
    },
  };
}
