import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  RunStore,
  atomicWriteJson,
  appendJsonl,
  readJsonl,
  questionHash,
  slugify,
} from "../../scripts/lib/artifacts.mjs";
import { resolveBudget } from "../../scripts/lib/budget.mjs";

function tempDir() {
  return mkdtempSync(path.join(tmpdir(), "deep-research-test-"));
}

test("atomicWriteJson leaves no temp files and round-trips", () => {
  const dir = tempDir();
  const file = path.join(dir, "sub", "data.json");
  atomicWriteJson(file, { a: 1 });
  assert.deepEqual(JSON.parse(readFileSync(file, "utf8")), { a: 1 });
  const leftovers = readdirSync(path.dirname(file)).filter((f) => f.endsWith(".tmp"));
  assert.equal(leftovers.length, 0);
});

test("appendJsonl is append-only and readJsonl parses all lines", () => {
  const dir = tempDir();
  const file = path.join(dir, "events.jsonl");
  appendJsonl(file, { n: 1 });
  appendJsonl(file, { n: 2 });
  assert.deepEqual(readJsonl(file).map((r) => r.n), [1, 2]);
});

test("questionHash is stable and slugify handles Japanese input", () => {
  assert.equal(questionHash("q"), questionHash("q"));
  assert.notEqual(questionHash("q"), questionHash("r"));
  assert.equal(slugify("Solar Power! Growth?"), "solar-power-growth");
  assert.notEqual(slugify("太陽光の成長"), "");
});

test("RunStore manifest lifecycle and phase transitions", () => {
  const dir = tempDir();
  const budget = resolveBudget("quick");
  const store = RunStore.create({
    outputDir: dir,
    runId: "run-1",
    question: "q",
    budget,
    environment: { version: "test" },
  });
  let manifest = store.readManifest();
  assert.equal(manifest.runStatus, "running");
  assert.equal(manifest.phases.scope, "pending");

  store.setPhase("scope", "running");
  store.setPhase("scope", "completed");
  manifest = store.readManifest();
  assert.equal(manifest.phases.scope, "completed");

  assert.throws(() => store.setPhase("nope", "completed"));
  assert.throws(() => store.setPhase("scope", "nope"));

  store.addWarning("w1");
  store.addError("search_error", "boom");
  store.bumpWorkerCounts({ total: 2, failed: 1 });
  manifest = store.readManifest();
  assert.deepEqual(manifest.warnings, ["w1"]);
  assert.equal(manifest.errors[0].class, "search_error");
  assert.equal(manifest.workerCounts.total, 2);

  const events = readJsonl(store.filePath("events.jsonl"));
  assert.equal(events.some((e) => e.type === "phase" && e.status === "completed"), true);

  // Re-creating over an existing run must fail rather than clobber.
  assert.throws(() =>
    RunStore.create({ outputDir: dir, runId: "run-1", question: "q", budget, environment: {} }),
  );
  // Opening requires a manifest.
  assert.throws(() => RunStore.open(path.join(dir, "missing")));
  const reopened = RunStore.open(store.runDir);
  assert.equal(reopened.readManifest().runId, "run-1");
});
