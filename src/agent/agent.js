/**
 * Agent API — BORIS OS
 * Handles communication with the Anthropic API.
 * The API key is stored in IndexedDB settings (never hardcoded).
 */
import { getSetting, setSetting } from '../db.js';
import { TOOL_DEFINITIONS, executeTool } from './tools.js';

const API_KEY_SETTING = 'agent_api_key';
const API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-opus-4-6';
const MAX_TOKENS = 4096;
const ANTHROPIC_VERSION = '2023-06-01';

function buildSystemPrompt(mode) {
  const today = new Date().toLocaleDateString('nl-NL', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return `Je bent een slimme persoonlijke assistent ingebouwd in BORIS, een lokaal persoonlijk OS voor studenten.

Je helpt de gebruiker met:
- Taken aanmaken, bekijken en afronden
- Dagelijkse planning: Top 3 doelen instellen, todos toevoegen
- Projecten bekijken en bespreken
- Studie-hulp: concepten uitleggen, samenvatten, oefenvragen geven
- Inbox-items bespreken

Gebruik de beschikbare gereedschappen om gegevens op te halen of aan te passen wanneer dat nuttig is.
Spreek altijd in het Nederlands. Wees beknopt en praktisch — max 3 zinnen tenzij meer nodig is.
Sluit geen acties af met aankondigingen zoals "Ik ga nu...". Doe het gewoon en rapporteer het resultaat.

Huidige modus: ${mode}
Vandaag: ${today}`;
}

// ── API key management ────────────────────────────────────────────────────────

export async function getApiKey() {
  return getSetting(API_KEY_SETTING);
}

export async function saveApiKey(key) {
  await setSetting(API_KEY_SETTING, key.trim());
}

export async function removeApiKey() {
  await setSetting(API_KEY_SETTING, null);
}

// ── Message sending ───────────────────────────────────────────────────────────

/**
 * Send a message to the agent and handle the tool-use loop.
 *
 * @param {Array}  messages  Full conversation history
 * @param {string} mode      Current BORIS mode (School, Personal, BPV)
 * @param {object} eventBus  BORIS event bus for broadcasting changes
 * @param {function} onToolCall  Optional callback called when a tool is invoked
 * @returns {{ text: string, messages: Array }} Updated history + final text
 */
export async function sendMessage(messages, mode, eventBus, onToolCall) {
  const apiKey = await getApiKey();
  if (!apiKey) throw new Error('NO_KEY');

  const system = buildSystemPrompt(mode);
  let currentMessages = [...messages];

  while (true) {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': ANTHROPIC_VERSION,
        // Required header for direct browser access
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        thinking: { type: 'adaptive' },
        system,
        tools: TOOL_DEFINITIONS,
        messages: currentMessages,
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      const msg = err.error?.message || `API-fout ${response.status}`;

      if (response.status === 401) throw new Error('INVALID_KEY');
      throw new Error(msg);
    }

    const data = await response.json();

    // Append assistant turn (must include tool_use blocks if present)
    currentMessages = [...currentMessages, { role: 'assistant', content: data.content }];

    // No more tool calls — we're done
    if (data.stop_reason !== 'tool_use') {
      const textBlock = data.content.find((b) => b.type === 'text');
      return { text: textBlock?.text || '', messages: currentMessages };
    }

    // Execute all requested tools in parallel
    const toolUseBlocks = data.content.filter((b) => b.type === 'tool_use');
    const toolResults = await Promise.all(
      toolUseBlocks.map(async (block) => {
        onToolCall?.(block.name);
        const content = await executeTool(block.name, block.input, eventBus);
        return { type: 'tool_result', tool_use_id: block.id, content };
      })
    );

    currentMessages = [...currentMessages, { role: 'user', content: toolResults }];
    // Loop: send results back to model
  }
}
