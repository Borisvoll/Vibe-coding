#!/usr/bin/env node
/**
 * BORIS Agent Team — Parallel Workflow Orchestrator
 *
 * Runs 4 specialized agents concurrently against the BORIS codebase:
 *   1. code-analyst   — code quality, security, architecture review
 *   2. data-inspector — IndexedDB stores, data flows, integrity
 *   3. feature-scout  — TODOs, gaps, unimplemented features
 *   4. test-validator — test coverage, quality, missing scenarios
 *
 * Usage:
 *   node team.js                        # run all 4 agents in parallel
 *   node team.js --agents code-analyst  # run a single named agent
 *   node team.js --agents code-analyst,test-validator  # run a subset
 */

import { query } from '@anthropic-ai/claude-agent-sdk';
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const REPORTS_DIR = join(__dirname, 'reports');
mkdirSync(REPORTS_DIR, { recursive: true });

// ─── Agent Definitions ───────────────────────────────────────────────────────

const AGENTS = {
  'code-analyst': {
    name: 'code-analyst',
    label: 'Code Analyst',
    systemPrompt: 'You are a senior code reviewer specialising in vanilla JavaScript, security, and local-first web apps.',
    prompt: `Review the BORIS codebase at the project root. Focus on the src/ directory.

Investigate:
1. **Security** — XSS risks (missing escapeHTML calls on user content), eval/innerHTML misuse, event-listener injection
2. **Code quality** — overly complex functions, duplicated logic, inconsistent naming
3. **Architecture** — blocks that import db.js directly (should use store adapters), event handlers that aren't cleaned up on unmount, blocks missing the unmount() return
4. **Performance** — synchronous IDB calls outside store adapters, excessive DOM repaints, missing debounce on input handlers

Produce a structured Markdown report with severity labels (🔴 HIGH / 🟡 MEDIUM / 🟢 LOW) for each finding. Include the file path and line number for every issue.`,
    tools: ['Read', 'Glob', 'Grep'],
  },

  'data-inspector': {
    name: 'data-inspector',
    label: 'Data Inspector',
    systemPrompt: 'You are a data-architecture expert specialising in IndexedDB, local-first systems, and JavaScript store patterns.',
    prompt: `Audit the data layer of the BORIS project at the project root.

Investigate:
1. **Store adapters** (src/stores/) — missing input validation, inconsistent error propagation, stores that bypass validate.js
2. **Migration manager** (src/core/migrationManager.js) — gaps between schema versions, object stores missing required indexes, non-append-only migrations
3. **Soft-delete flow** (src/db.js) — records that skip soft-delete and call remove() directly, purge logic correctness
4. **Cross-store integrity** — tasks referencing deleted projects, list items orphaned from their parent list, daily plans referencing non-existent modes
5. **Settings persistence** — settings that use localStorage instead of IDB getSetting/setSetting

Produce a structured Markdown report with risk levels (🔴 HIGH / 🟡 MEDIUM / 🟢 LOW) and recommended fixes for each finding.`,
    tools: ['Read', 'Glob', 'Grep'],
  },

  'feature-scout': {
    name: 'feature-scout',
    label: 'Feature Scout',
    systemPrompt: 'You are a product analyst who surfaces incomplete features, planned work, and user-facing gaps in software projects.',
    prompt: `Scan the BORIS project at the project root for feature gaps and planned-but-unimplemented work.

Investigate:
1. **TODO / FIXME / HACK comments** — scan all src/ files and list every comment with its file + line
2. **tasks/ directory** — read todo.md, next-steps.md, and any other planning docs; cross-reference with actual src/ implementation
3. **Block completeness** — for each block in src/blocks/, check if it fully implements mount(), returns unmount(), handles all declared events
4. **Command palette** — commands registered in src/core/commands.js that navigate to routes not in VALID_ROUTES (src/os/deepLinks.js)
5. **Settings UI** — settings exposed in the Settings tab that have no corresponding store read/write

Produce a prioritised Markdown backlog sorted by impact (🔴 High / 🟡 Medium / 🟢 Low), with a brief description and the relevant file path for each item.`,
    tools: ['Read', 'Glob', 'Grep'],
  },

  'test-validator': {
    name: 'test-validator',
    label: 'Test Validator',
    systemPrompt: 'You are a QA engineer specialising in JavaScript unit testing with Vitest and local-first web applications.',
    prompt: `Audit the test suite of the BORIS project at the project root (tests/ directory, vitest config in vite.config.js).

Investigate:
1. **Coverage gaps** — list every src/stores/ adapter and src/core/ module that has no corresponding test file
2. **Test setup** — examine tests/setup.js: does DB reset run correctly between tests? Are all 31 object stores cleared?
3. **Edge-case gaps** — for existing test files, identify missing scenarios: ValidationError handling, mode-switching side effects, soft-delete + undo, concurrent write-guard usage
4. **Anti-patterns** — tests that assert on implementation details instead of behaviour, tests that share mutable state, missing async/await on IDB calls
5. **Flakiness risks** — any test that relies on ordering, real timers, or global state that isn't cleaned up

Produce a structured Markdown report with priority labels (🔴 HIGH / 🟡 MEDIUM / 🟢 LOW) and specific suggested test cases for the top gaps.`,
    tools: ['Read', 'Glob', 'Grep'],
  },
};

// ─── Run a Single Agent ──────────────────────────────────────────────────────

async function runAgent(agentDef) {
  const start = Date.now();
  const tag = `[${agentDef.label}]`;
  console.log(`${tag} Starting…`);

  let result = '_(no output)_';

  try {
    for await (const message of query({
      prompt: agentDef.prompt,
      options: {
        cwd: ROOT,
        allowedTools: agentDef.tools,
        permissionMode: 'default',
        systemPrompt: agentDef.systemPrompt,
        model: 'claude-opus-4-6',
        maxTurns: 40,
      },
    })) {
      if ('result' in message) {
        result = message.result;
      }
    }
  } catch (err) {
    result = `**Error:** ${err.message}`;
    console.error(`${tag} Failed:`, err.message);
  }

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`${tag} Done in ${elapsed}s`);

  const reportPath = join(REPORTS_DIR, `${agentDef.name}.md`);
  writeFileSync(
    reportPath,
    `# ${agentDef.label} Report\n_Generated: ${new Date().toISOString()} — elapsed: ${elapsed}s_\n\n${result}\n`,
  );

  return { agent: agentDef.name, label: agentDef.label, elapsed, reportPath };
}

// ─── Orchestrator ────────────────────────────────────────────────────────────

async function main() {
  // Parse --agents flag for selective runs
  const flagIdx = process.argv.indexOf('--agents');
  let selected = Object.keys(AGENTS);
  if (flagIdx !== -1 && process.argv[flagIdx + 1]) {
    selected = process.argv[flagIdx + 1].split(',').map((s) => s.trim());
    const unknown = selected.filter((n) => !AGENTS[n]);
    if (unknown.length) {
      console.error(`Unknown agents: ${unknown.join(', ')}`);
      console.error(`Available: ${Object.keys(AGENTS).join(', ')}`);
      process.exit(1);
    }
  }

  const agentDefs = selected.map((n) => AGENTS[n]);

  console.log(
    `\nBORIS Agent Team — launching ${agentDefs.length} agent(s) in parallel\n` +
      agentDefs.map((a) => `  • ${a.label}`).join('\n') +
      '\n',
  );

  const t0 = Date.now();

  // All agents run concurrently via Promise.allSettled
  const outcomes = await Promise.allSettled(agentDefs.map(runAgent));

  const totalElapsed = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`\nAll agents finished in ${totalElapsed}s\n`);

  // Print per-agent results
  const summaryLines = [
    `# Agent Team Summary`,
    `_Run: ${new Date().toISOString()} | Total: ${totalElapsed}s_\n`,
    `## Results\n`,
  ];

  for (const outcome of outcomes) {
    if (outcome.status === 'fulfilled') {
      const { label, elapsed, reportPath } = outcome.value;
      console.log(`  ✓ ${label} (${elapsed}s) → ${reportPath}`);
      summaryLines.push(`- ✅ **${label}** — ${elapsed}s → \`${reportPath}\``);
    } else {
      console.error(`  ✗ agent failed:`, outcome.reason);
      summaryLines.push(`- ❌ agent failed: ${outcome.reason?.message ?? outcome.reason}`);
    }
  }

  const summaryPath = join(REPORTS_DIR, 'summary.md');
  writeFileSync(summaryPath, summaryLines.join('\n') + '\n');
  console.log(`\n  Summary → ${summaryPath}\n`);
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
