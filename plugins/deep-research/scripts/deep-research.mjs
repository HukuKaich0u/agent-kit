#!/usr/bin/env node
/**
 * Deep research orchestrator CLI (design section 8.3).
 *
 *   node scripts/deep-research.mjs \
 *     --question "<research question>" \
 *     --preset standard \
 *     --output .deep-research/runs
 */

import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { RunStore, MANIFEST_SCHEMA_VERSION, slugify, questionHash, readJson } from "./lib/artifacts.mjs";
import { resolveBudget, PRESETS } from "./lib/budget.mjs";
import { probeEnvironment } from "./lib/codex-worker.mjs";
import { runPipeline, PipelineError } from "./lib/pipeline.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PROMPTS_DIR = path.join(HERE, "..", "prompts");

const FLAG_SPEC = {
  "--question": { key: "question", takesValue: true },
  "--preset": { key: "preset", takesValue: true },
  "--output": { key: "output", takesValue: true },
  "--run-id": { key: "runId", takesValue: true },
  "--resume": { key: "resume", takesValue: true },
  "--as-of": { key: "asOf", takesValue: true },
  "--locale": { key: "locale", takesValue: true },
  "--max-concurrency": { key: "maxConcurrency", takesValue: true },
  "--model": { key: "model", takesValue: true },
  "--keep-going": { key: "keepGoing", takesValue: true },
  "--dry-run": { key: "dryRun", takesValue: false },
  "--codex-bin": { key: "codexBin", takesValue: true },
};

export function parseArgs(argv) {
  const options = {
    question: null,
    preset: "standard",
    output: ".deep-research/runs",
    runId: null,
    resume: null,
    asOf: null,
    locale: null,
    maxConcurrency: null,
    model: null,
    keepGoing: true,
    dryRun: false,
    codexBin: "codex",
  };
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i];
    const spec = FLAG_SPEC[flag];
    if (!spec) {
      throw new Error(`unknown flag: ${flag}`);
    }
    if (!spec.takesValue) {
      options[spec.key] = true;
      continue;
    }
    const value = argv[++i];
    if (value === undefined) {
      throw new Error(`flag ${flag} requires a value`);
    }
    options[spec.key] = value;
  }
  if (typeof options.keepGoing === "string") {
    if (options.keepGoing !== "true" && options.keepGoing !== "false") {
      throw new Error(`--keep-going must be true or false, got: ${options.keepGoing}`);
    }
    options.keepGoing = options.keepGoing === "true";
  }
  if (!(options.preset in PRESETS)) {
    throw new Error(`unknown preset: ${options.preset} (expected quick|standard|deep)`);
  }
  if (options.asOf != null && !/^\d{4}-\d{2}-\d{2}$/.test(options.asOf)) {
    throw new Error(`--as-of must be YYYY-MM-DD, got: ${options.asOf}`);
  }
  if (options.resume == null && (options.question == null || options.question.trim() === "")) {
    throw new Error("--question is required (or use --resume <run-dir>)");
  }
  return options;
}

function log(message) {
  process.stdout.write(`${message}\n`);
}

async function main() {
  let options;
  try {
    options = parseArgs(process.argv.slice(2));
  } catch (err) {
    process.stderr.write(`error: ${err.message}\n`);
    process.exit(2);
  }

  let budget = resolveBudget(options.preset, { maxConcurrency: options.maxConcurrency });
  let asOf = options.asOf ?? new Date().toISOString().slice(0, 10);
  let reportLanguage = options.locale ?? "the same language as the research question";

  if (options.dryRun) {
    log("dry run: no workers will be started");
    log(`preset: ${budget.preset} (v${budget.presetVersion})`);
    log(JSON.stringify(budget, null, 2));
    log("phase plan: scope -> search -> selection -> extraction -> verification -> synthesis -> audit");
    process.exit(0);
  }

  const environment = probeEnvironment(options.codexBin);
  if (!environment.version) {
    process.stderr.write(
      `error: cannot run '${options.codexBin} --version'; is the codex CLI installed and authenticated?\n`,
    );
    process.exit(2);
  }

  let store;
  let question;
  let resume = false;
  if (options.resume) {
    const runDir = path.resolve(options.resume);
    if (!existsSync(runDir)) {
      process.stderr.write(`error: resume path does not exist: ${runDir}\n`);
      process.exit(2);
    }
    store = RunStore.open(runDir);
    const manifest = store.readManifest();
    if (manifest.schemaVersion !== MANIFEST_SCHEMA_VERSION) {
      process.stderr.write(
        `error: incompatible manifest schema version ${manifest.schemaVersion} (supported: ${MANIFEST_SCHEMA_VERSION})\n`,
      );
      process.exit(2);
    }
    const brief = readJson(store.filePath("brief.json"));
    if (options.question && questionHash(options.question) !== manifest.questionHash) {
      process.stderr.write("error: --question does not match the resumed run's question hash\n");
      process.exit(2);
    }
    question = brief.question;
    // Restore the original run settings unless explicitly overridden.
    if (options.asOf == null && brief.asOf) asOf = brief.asOf;
    if (options.locale == null && brief.reportLanguage) reportLanguage = brief.reportLanguage;
    if (options.model == null && brief.model) options.model = brief.model;
    if (brief.preset && brief.preset !== options.preset) {
      budget = resolveBudget(brief.preset, { maxConcurrency: options.maxConcurrency });
    }
    resume = true;
    store.updateManifest({ runStatus: "running" });
    store.event({ type: "resume" });
    log(`resuming run: ${runDir}`);
  } else {
    question = options.question.trim();
    const outputDir = path.resolve(options.output);
    mkdirSync(outputDir, { recursive: true });
    const runId =
      options.runId ??
      `${new Date().toISOString().replace(/[:.]/g, "").slice(0, 15)}-${slugify(question)}`;
    store = RunStore.create({ outputDir, runId, question, budget, environment });
    store.writeJson("brief.json", {
      question,
      preset: budget.preset,
      asOf,
      reportLanguage,
      keepGoing: options.keepGoing,
      model: options.model,
      createdAt: new Date().toISOString(),
    });
    log(`run directory: ${store.runDir}`);
  }

  try {
    const result = await runPipeline({
      store,
      question,
      budget,
      promptsDir: PROMPTS_DIR,
      asOf,
      reportLanguage,
      model: options.model,
      codexBin: options.codexBin,
      keepGoing: options.keepGoing,
      resume,
      log,
    });
    const manifest = store.readManifest();
    log("");
    log(`Run ${result.runStatus}`);
    log(
      `${result.counts.angles} angles, ${result.counts.candidates} candidates, ` +
        `${result.counts.sources} sources, ${result.counts.claims} claims`,
    );
    log(`verification states: ${JSON.stringify(result.counts.states)}`);
    log(
      `${manifest.workerCounts.total} worker calls, ${manifest.workerCounts.retried} retried, ` +
        `${manifest.workerCounts.failed} failed`,
    );
    log(`Report: ${result.reportPath}`);
    process.exit(0);
  } catch (err) {
    const errorClass = err instanceof PipelineError ? err.errorClass : "internal_error";
    store.addError(errorClass, String(err.message ?? err));
    store.updateManifest({ runStatus: "failed" });
    process.stderr.write(`error [${errorClass}]: ${err.message}\n`);
    if (!(err instanceof PipelineError)) {
      process.stderr.write(`${err.stack}\n`);
    }
    process.exit(1);
  }
}

const isDirectRun =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirectRun) {
  await main();
}
