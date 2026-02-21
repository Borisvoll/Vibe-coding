/**
 * Agent tools — BORIS OS
 * Defines the tools the AI agent can use to interact with the OS.
 */
import { getTasksByMode, addTask, toggleTask } from '../stores/tasks.js';
import { getActiveProjects } from '../stores/projects.js';
import { getDailyEntry, addTodo, saveOutcomes } from '../stores/daily.js';
import { getAll } from '../db.js';

// ── Tool schemas (for Anthropic API) ──────────────────────────────────────────

export const TOOL_DEFINITIONS = [
  {
    name: 'get_tasks',
    description:
      'Haal de taken op voor de huidige modus. Gebruik dit om te zien welke taken er zijn voordat je nieuwe aanmaakt.',
    input_schema: {
      type: 'object',
      properties: {
        mode: {
          type: 'string',
          description: 'De modus: BPV, School of Personal',
        },
      },
      required: ['mode'],
    },
  },
  {
    name: 'create_task',
    description: 'Maak een nieuwe taak aan in de opgegeven modus.',
    input_schema: {
      type: 'object',
      properties: {
        text: { type: 'string', description: 'De tekst van de taak' },
        mode: { type: 'string', description: 'De modus: BPV, School of Personal' },
      },
      required: ['text', 'mode'],
    },
  },
  {
    name: 'complete_task',
    description: 'Markeer een taak als gedaan of herstel hem naar "te doen".',
    input_schema: {
      type: 'object',
      properties: {
        task_id: { type: 'string', description: 'Het ID van de taak' },
      },
      required: ['task_id'],
    },
  },
  {
    name: 'get_projects',
    description: 'Haal de actieve projecten op voor een modus.',
    input_schema: {
      type: 'object',
      properties: {
        mode: { type: 'string', description: 'De modus: BPV, School of Personal' },
      },
      required: ['mode'],
    },
  },
  {
    name: 'get_daily_plan',
    description: "Haal het dagplan op met de Top 3 doelen en todos van vandaag.",
    input_schema: {
      type: 'object',
      properties: {
        mode: { type: 'string', description: 'De modus' },
        date: {
          type: 'string',
          description: 'Datum in YYYY-MM-DD formaat (standaard: vandaag)',
        },
      },
      required: ['mode'],
    },
  },
  {
    name: 'set_daily_outcomes',
    description: 'Stel de Top 3 doelen in voor het dagplan van vandaag (precies 3 strings).',
    input_schema: {
      type: 'object',
      properties: {
        mode: { type: 'string', description: 'De modus' },
        outcomes: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array van precies 3 doelen',
        },
      },
      required: ['mode', 'outcomes'],
    },
  },
  {
    name: 'add_daily_todo',
    description: "Voeg een todo toe aan het dagplan van vandaag.",
    input_schema: {
      type: 'object',
      properties: {
        mode: { type: 'string', description: 'De modus' },
        text: { type: 'string', description: 'De todo tekst' },
      },
      required: ['mode', 'text'],
    },
  },
  {
    name: 'get_inbox',
    description: 'Haal de eerste onverwerkte inbox-items op.',
    input_schema: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          description: 'Maximaal aantal items (standaard: 10)',
        },
      },
      required: [],
    },
  },
];

// ── Tool executor ─────────────────────────────────────────────────────────────

export async function executeTool(name, input, eventBus) {
  const today = new Date().toISOString().slice(0, 10);

  try {
    switch (name) {
      case 'get_tasks': {
        const tasks = await getTasksByMode(input.mode);
        const active = tasks.filter((t) => t.status !== 'done');
        const done = tasks.filter((t) => t.status === 'done');
        return JSON.stringify({
          active: active.map((t) => ({ id: t.id, text: t.text, priority: t.priority })),
          done_count: done.length,
          total: tasks.length,
        });
      }

      case 'create_task': {
        const task = await addTask(input.text, input.mode);
        eventBus?.emit('tasks:changed', { mode: input.mode });
        return JSON.stringify({ success: true, id: task.id, text: task.text });
      }

      case 'complete_task': {
        const updated = await toggleTask(input.task_id);
        eventBus?.emit('tasks:changed', { mode: updated.mode });
        return JSON.stringify({ success: true, new_status: updated.status });
      }

      case 'get_projects': {
        const projects = await getActiveProjects(input.mode);
        return JSON.stringify(
          projects.map((p) => ({
            id: p.id,
            title: p.title,
            goal: p.goal,
            status: p.status,
          }))
        );
      }

      case 'get_daily_plan': {
        const date = input.date || today;
        const entry = await getDailyEntry(input.mode, date);
        return JSON.stringify({
          date,
          outcomes: entry?.outcomes || ['', '', ''],
          todos: (entry?.todos || []).map((t) => ({
            id: t.id,
            text: t.text,
            done: t.done,
          })),
          notes: entry?.notes || '',
        });
      }

      case 'set_daily_outcomes': {
        const outcomes = (input.outcomes || []).slice(0, 3);
        while (outcomes.length < 3) outcomes.push('');
        await saveOutcomes(input.mode, today, outcomes);
        eventBus?.emit('daily:changed', { mode: input.mode, date: today });
        return JSON.stringify({ success: true, outcomes });
      }

      case 'add_daily_todo': {
        await addTodo(input.mode, today, input.text);
        eventBus?.emit('daily:changed', { mode: input.mode, date: today });
        return JSON.stringify({ success: true });
      }

      case 'get_inbox': {
        const limit = input.limit || 10;
        const all = await getAll('os_inbox');
        const unprocessed = all
          .filter((i) => !i.processed && !i.deleted)
          .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
          .slice(0, limit);
        return JSON.stringify(
          unprocessed.map((i) => ({ id: i.id, text: i.text, createdAt: i.createdAt }))
        );
      }

      default:
        return JSON.stringify({ error: `Onbekend gereedschap: ${name}` });
    }
  } catch (err) {
    return JSON.stringify({ error: err.message || String(err) });
  }
}
