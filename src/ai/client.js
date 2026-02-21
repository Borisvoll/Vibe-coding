/**
 * Claude AI client for BORIS.
 *
 * Stores the Anthropic API key in IndexedDB settings.
 * All calls go directly to the Anthropic Messages API from the browser.
 */

import { getSetting, setSetting } from '../db.js';

const API_KEY_SETTING = 'anthropic_api_key';

export async function getApiKey() {
  return getSetting(API_KEY_SETTING);
}

export async function setApiKey(key) {
  await setSetting(API_KEY_SETTING, key.trim());
}

/**
 * Call claude-haiku with a user prompt and optional system prompt.
 * Throws with err.code === 'NO_KEY' when no key is configured.
 */
export async function callClaude(userPrompt, { system = '', maxTokens = 300 } = {}) {
  const apiKey = await getApiKey();
  if (!apiKey) {
    const err = new Error(
      'Geen API-sleutel. Voeg je Anthropic-sleutel toe bij Instellingen → AI-assistent.',
    );
    err.code = 'NO_KEY';
    throw err;
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
      'anthropic-dangerous-allow-browser': 'true',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error?.message || `API fout ${response.status}`);
  }

  const data = await response.json();
  return data.content[0].text;
}

/**
 * Triage an inbox item: returns { action, mode, text } suggestion.
 * action: "task" | "reference" | "archive"
 * mode:   "School" | "BPV" | "Personal"
 * text:   cleaned/refined action text
 */
export async function triageInboxItem(itemText) {
  const raw = await callClaude(itemText, {
    system:
      'Je bent een GTD inbox-assistent voor een Nederlandse student (BPV-stage, school, persoonlijk). ' +
      'Analyseer het inbox-item en geef ALLEEN een JSON-object terug (geen uitleg, geen markdown): ' +
      '{"action":"task"|"reference"|"archive","mode":"School"|"BPV"|"Personal","text":"schone actietekst"}. ' +
      'action=task als er iets gedaan moet worden, reference als het naslagmateriaal is, archive als het irrelevant is.',
    maxTokens: 150,
  });

  // Extract JSON even if Claude wraps it in a code block
  const match = raw.match(/\{[\s\S]*?\}/);
  if (!match) throw new Error('Onverwacht antwoord van AI');
  return JSON.parse(match[0]);
}

/**
 * Expand a brief BPV note into a professional Dutch logbook entry (≤200 chars).
 */
export async function expandBPVNote(shortNote) {
  return callClaude(`Korte notitie: ${shortNote}`, {
    system:
      'Jij schrijft professionele BPV-logboeknotities voor een Nederlandse student. ' +
      'Schrijf op basis van de korte notitie een formele, informatieve logboeknotitie in het Nederlands ' +
      '(maximaal 190 tekens, 1-2 zinnen). Focus op uitgevoerde activiteiten en leerpunten. ' +
      'Geef ALLEEN de notitietekst terug, geen aanhalingstekens.',
    maxTokens: 100,
  });
}
