---
name: "deep-research"
description: "Use when the user asks for deep research, a multi-source investigation, a cited report, or explicitly wants counterevidence checked — e.g. 'Xについてdeep researchして', '複数の情報源を調べて引用付きレポートにして', '反対意見も含めて徹底的に調査して'. Runs a resumable multi-worker research pipeline (scope → search fan-out → extraction → claim verification → cited report) via a Node.js orchestrator. Works from Codex and Claude Code alike. Do NOT trigger for simple fact checks, single-URL summaries, or questions answerable from conversation."
---

# Deep Research

## Overview

Run structured, cited Web research through the plugin's Node.js orchestrator.
The orchestrator spawns ephemeral `codex --search exec` workers for scope
planning, multi-angle search, source extraction, claim-level verification
(support check + adversarial search + adjudication), and synthesis. It writes
resumable JSON artifacts and a cited `report.md`.

Do NOT run the research yourself in this session. Your job is to clarify the
request, launch the orchestrator, then read the artifacts back to the user.
This works the same whether the calling agent is Codex or Claude Code; the
workers are always codex CLI processes.

## Locate the orchestrator

This skill is self-contained: the orchestrator lives NEXT TO this SKILL.md
(`scripts/deep-research.mjs`, with `prompts/` and `schemas/` as siblings).
`SKILL_DIR` is this file's directory (resolve symlinks with `realpath` if
needed). No separate plugin checkout is required.

## Prerequisites

- Node.js >= 22
- Authenticated `codex` CLI >= 0.142.5 with web search available
  (required even when invoked from Claude Code — workers run on codex)
- Run `npm install` once inside `SKILL_DIR` if `node_modules` is missing
  (single runtime dependency: ajv)

## Clarification boundary

Before launching, ask the user ONLY if the answer would materially change the
research outcome and it is not inferable from the request:

- target region
- time period or reference date
- decision purpose (what will this research be used for)
- comparison targets
- hard constraints

If the ambiguity is minor, proceed and note the assumption; the scope worker
records assumptions in the research brief. Never make workers ask the user.

If the user's request contains private data (names, internal project details),
confirm with the user before it goes into search queries.

## Launch

Choose a preset: `quick` (fast survey), `standard` (default), `deep`
(thorough). From `SKILL_DIR`:

```bash
node scripts/deep-research.mjs \
  --question "<research question>" \
  --preset standard \
  --output .deep-research/runs
```

Useful flags:

- `--as-of YYYY-MM-DD` reference date (defaults to today)
- `--locale <lang>` report language (defaults to the question's language)
- `--dry-run` print the budget and phase plan without spawning workers
- `--resume <run-dir>` continue an interrupted run
- `--max-concurrency <n>` override worker parallelism

The run takes ~20-30 minutes (quick) up to well over an hour (deep). Tell the
user before starting a standard or deep run.

Long-run hygiene (measured on macOS):

- Prefix with `caffeinate -i` (macOS) — system sleep suspends workers and
  timers, which blows the run deadline and fails the run.
- From Claude Code, launch it as a background task and report progress from
  the run directory (`events.jsonl`) while waiting.
- If a run fails or is interrupted, `--resume <run-dir>` reuses every phase
  that completed; do not restart from scratch.

## After the run

1. Read `report.md` in the printed run directory and present it.
2. Report the run status honestly: `completed_with_warnings` means some
   claims were unverified or the citation audit found problems — say which
   (see `manifest.json` warnings).
3. Point the user at the artifacts for auditing: `sources.json`,
   `claims.json`, `verification.json`, `events.jsonl`.
4. If the run failed, check `manifest.json` errors and either `--resume` the
   run directory or report the blocking error.

## Hard rules

- Never present a `contested`, `insufficient`, or `not_checked` claim as fact.
- Never drop the qualifications attached to a `qualified` finding.
- Do not edit `report.md` claims beyond formatting; the citations must keep
  matching `sources.json`.
