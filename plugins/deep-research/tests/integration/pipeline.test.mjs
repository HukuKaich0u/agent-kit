import test from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtempSync, readFileSync, readdirSync, writeFileSync, chmodSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const execFileAsync = promisify(execFile);
const HERE = path.dirname(fileURLToPath(import.meta.url));
const PLUGIN_ROOT = path.join(HERE, "..", "..");
const CLI = path.join(PLUGIN_ROOT, "scripts", "deep-research.mjs");
const FAKE_CODEX = path.join(HERE, "..", "fixtures", "fake-codex.mjs");
const BASE_SCENARIO = JSON.parse(
  readFileSync(path.join(HERE, "..", "fixtures", "scenario-base.json"), "utf8"),
);

chmodSync(FAKE_CODEX, 0o755);

function tempDir(prefix) {
  return mkdtempSync(path.join(tmpdir(), `dr-int-${prefix}-`));
}

function writeScenario(dir, scenario) {
  const file = path.join(dir, "scenario.json");
  writeFileSync(file, JSON.stringify(scenario));
  return file;
}

async function runCli(args, scenarioFile, stateDir) {
  try {
    const result = await execFileAsync(
      process.execPath,
      [CLI, ...args, "--codex-bin", FAKE_CODEX],
      {
        env: {
          ...process.env,
          FAKE_CODEX_SCENARIO: scenarioFile,
          FAKE_CODEX_STATE: stateDir,
        },
        timeout: 120_000,
      },
    );
    return { code: 0, stdout: result.stdout, stderr: result.stderr };
  } catch (err) {
    return { code: err.code ?? 1, stdout: err.stdout ?? "", stderr: err.stderr ?? "" };
  }
}

function runDirOf(outputDir) {
  const entries = readdirSync(outputDir);
  assert.equal(entries.length, 1);
  return path.join(outputDir, entries[0]);
}

function readJson(file) {
  return JSON.parse(readFileSync(file, "utf8"));
}

test("happy path: quick preset run completes with a cited report", async () => {
  const work = tempDir("happy");
  const scenarioFile = writeScenario(work, BASE_SCENARIO);
  const out = path.join(work, "runs");
  const result = await runCli(
    ["--question", "How fast is residential solar adoption growing?", "--preset", "quick", "--output", out],
    scenarioFile,
    path.join(work, "state"),
  );
  assert.equal(result.code, 0, result.stderr);

  const runDir = runDirOf(out);
  const manifest = readJson(path.join(runDir, "manifest.json"));
  assert.equal(manifest.runStatus, "completed");
  for (const status of Object.values(manifest.phases)) {
    assert.equal(status, "completed");
  }

  // Dedup and quarantine happened deterministically.
  const candidates = readJson(path.join(runDir, "candidates.json"));
  assert.equal(candidates.quarantined.length, 1);
  assert.equal(candidates.quarantined[0].quarantineReason, "unparsable_url");
  const statsEntries = candidates.selected.filter((c) =>
    c.canonicalUrl.startsWith("https://stats.example.gov/solar/2024"),
  );
  assert.equal(statsEntries.length, 1); // trailing-slash variant merged
  assert.deepEqual([...statsEntries[0].angleIds].sort(), ["A01", "A02"]);

  // Claim merge: the doubling claim is backed by two established sources.
  const { claims } = readJson(path.join(runDir, "claims.json"));
  const doubling = claims.find((c) => /doubled/.test(c.text));
  assert.ok(doubling);
  assert.equal(doubling.independentSourceCount >= 2, true);
  assert.equal(doubling.verificationState, "confirmed");

  // Conflict path went through adjudication.
  const { verification } = readJson(path.join(runDir, "verification.json"));
  const contested = claims.find((c) => /contested tariff/.test(c.text));
  const adjudicated = verification.find((v) => v.claimId === contested.id);
  assert.equal(adjudicated.adjudicated, true);
  assert.equal(adjudicated.verificationState, "qualified");

  // High-confidence claim got its confidence from the orchestrator cap.
  const confirmed = verification.find((v) => v.claimId === doubling.id);
  assert.equal(confirmed.confidence, "high");

  // Counter source was cataloged.
  const { sources } = readJson(path.join(runDir, "sources.json"));
  assert.equal(sources.some((s) => s.role === "counter"), true);

  // Report exists, cites known sources, escapes HTML.
  const md = readFileSync(path.join(runDir, "report.md"), "utf8");
  assert.match(md, /## Key Findings/);
  assert.match(md, /\[S0\d\d\]/);
  const report = readJson(path.join(runDir, "report.json"));
  const sourceIds = new Set(sources.map((s) => s.id));
  for (const finding of report.findings) {
    for (const sid of finding.sourceIds) assert.equal(sourceIds.has(sid), true);
  }

  // Worker artifacts persisted.
  const workerDirs = readdirSync(path.join(runDir, "workers"));
  assert.equal(workerDirs.includes("scope-01"), true);
  assert.equal(workerDirs.some((d) => d.startsWith("search-")), true);
  assert.equal(workerDirs.some((d) => d.startsWith("adjudicate-")), true);
  const execution = readJson(path.join(runDir, "workers", "scope-01", "execution.json"));
  assert.equal(execution.status, "succeeded");
});

test("partial search failure degrades to completed_with_warnings", async () => {
  const work = tempDir("searchfail");
  const scenario = structuredClone(BASE_SCENARIO);
  scenario.searchFailAngles = ["A02"];
  const scenarioFile = writeScenario(work, scenario);
  const out = path.join(work, "runs");
  const result = await runCli(
    ["--question", "solar?", "--preset", "quick", "--output", out],
    scenarioFile,
    path.join(work, "state"),
  );
  assert.equal(result.code, 0, result.stderr);
  const runDir = runDirOf(out);
  const manifest = readJson(path.join(runDir, "manifest.json"));
  assert.equal(manifest.runStatus, "completed_with_warnings");
  assert.equal(manifest.phases.search, "completed_with_warnings");
  assert.equal(manifest.warnings.some((w) => /angle A02 failed/.test(w)), true);
  // Research continued with the surviving angles.
  assert.equal(existsSync(path.join(runDir, "report.md")), true);
});

test("invalid JSON payload is retried once with a corrective instruction", async () => {
  const work = tempDir("badjson");
  const scenario = structuredClone(BASE_SCENARIO);
  scenario.searchInvalidJsonAngles = ["A01"];
  const scenarioFile = writeScenario(work, scenario);
  const out = path.join(work, "runs");
  const result = await runCli(
    ["--question", "solar?", "--preset", "quick", "--output", out],
    scenarioFile,
    path.join(work, "state"),
  );
  assert.equal(result.code, 0, result.stderr);
  const runDir = runDirOf(out);
  const manifest = readJson(path.join(runDir, "manifest.json"));
  assert.equal(manifest.runStatus, "completed");
  assert.equal(manifest.workerCounts.retried >= 1, true);
  // The searches file still contains all three angles.
  const lines = readFileSync(path.join(runDir, "searches.jsonl"), "utf8")
    .split("\n")
    .filter(Boolean);
  assert.equal(lines.length, 3);
});

test("citation audit failure triggers exactly one synthesis retry", async () => {
  const work = tempDir("audit");
  const scenario = structuredClone(BASE_SCENARIO);
  scenario.auditFailFirstSynthesis = true;
  const scenarioFile = writeScenario(work, scenario);
  const out = path.join(work, "runs");
  const result = await runCli(
    ["--question", "solar?", "--preset", "quick", "--output", out],
    scenarioFile,
    path.join(work, "state"),
  );
  assert.equal(result.code, 0, result.stderr);
  const runDir = runDirOf(out);
  const workerDirs = readdirSync(path.join(runDir, "workers"));
  assert.equal(workerDirs.includes("synthesize-01"), true);
  assert.equal(workerDirs.includes("synthesize-02"), true);
  const report = readJson(path.join(runDir, "report.json"));
  for (const finding of report.findings) {
    assert.equal(finding.sourceIds.includes("S999"), false);
  }
  const manifest = readJson(path.join(runDir, "manifest.json"));
  assert.equal(manifest.phases.audit, "completed");
});

test("total extraction failure fails the run, and --resume completes it", async () => {
  const work = tempDir("resume");
  const broken = structuredClone(BASE_SCENARIO);
  broken.extractFail = true;
  const brokenFile = writeScenario(tempDir("resume-broken"), broken);
  const out = path.join(work, "runs");
  const first = await runCli(
    ["--question", "solar?", "--preset", "quick", "--output", out],
    brokenFile,
    path.join(work, "state1"),
  );
  assert.equal(first.code, 1);
  const runDir = runDirOf(out);
  let manifest = readJson(path.join(runDir, "manifest.json"));
  assert.equal(manifest.runStatus, "failed");
  assert.equal(manifest.phases.extraction, "failed");
  assert.equal(manifest.errors.some((e) => e.class === "source_access_error"), true);

  const fixedFile = writeScenario(work, BASE_SCENARIO);
  const second = await runCli(["--resume", runDir], fixedFile, path.join(work, "state2"));
  assert.equal(second.code, 0, second.stderr);
  manifest = readJson(path.join(runDir, "manifest.json"));
  assert.equal(manifest.runStatus, "completed");
  assert.equal(existsSync(path.join(runDir, "report.md")), true);
  // Resume restores the original preset from brief.json even though the
  // second invocation did not pass --preset.
  const md = readFileSync(path.join(runDir, "report.md"), "utf8");
  assert.match(md, /> Preset: quick/);
  // Scope and search results were reused, not re-run.
  assert.match(second.stdout, /scope: reused from previous run/);
  assert.match(second.stdout, /search: reusing 3 angle results/);
});

test("budget exhaustion: claims beyond the verified cap end up not_checked", async () => {
  const work = tempDir("budget");
  const scenario = structuredClone(BASE_SCENARIO);
  // Inflate one source with many extra claims to exceed quick's cap of 8.
  const study = scenario.extraction["https://research.example.edu/solar-study"];
  for (let i = 0; i < 10; i++) {
    study.claims.push({
      text: `Auxiliary observation number ${i} about installer economics`,
      scope: "US",
      importance: "contextual",
      timeSensitivity: "low",
      evidenceExcerptLocalIds: ["x2"],
    });
  }
  const scenarioFile = writeScenario(work, scenario);
  const out = path.join(work, "runs");
  const result = await runCli(
    ["--question", "solar?", "--preset", "quick", "--output", out],
    scenarioFile,
    path.join(work, "state"),
  );
  assert.equal(result.code, 0, result.stderr);
  const runDir = runDirOf(out);
  const { verification } = readJson(path.join(runDir, "verification.json"));
  const notChecked = verification.filter((v) => v.verificationState === "not_checked");
  assert.equal(notChecked.length > 0, true);
  // Central claims were prioritized over contextual ones.
  const { claims } = readJson(path.join(runDir, "claims.json"));
  for (const claim of claims.filter((c) => c.importance === "central")) {
    const v = verification.find((x) => x.claimId === claim.id);
    assert.notEqual(v.verificationState, "not_checked");
  }
});

test("--keep-going false aborts on the first recoverable failure", async () => {
  const work = tempDir("keepgoing");
  const scenario = structuredClone(BASE_SCENARIO);
  scenario.searchFailAngles = ["A02"];
  const scenarioFile = writeScenario(work, scenario);
  const out = path.join(work, "runs");
  const result = await runCli(
    ["--question", "solar?", "--preset", "quick", "--output", out, "--keep-going", "false"],
    scenarioFile,
    path.join(work, "state"),
  );
  assert.equal(result.code, 1);
  const runDir = runDirOf(out);
  const manifest = readJson(path.join(runDir, "manifest.json"));
  assert.equal(manifest.runStatus, "failed");
});

test("dry run prints the plan without creating a run directory", async () => {
  const work = tempDir("dry");
  const scenarioFile = writeScenario(work, BASE_SCENARIO);
  const out = path.join(work, "runs");
  const result = await runCli(
    ["--question", "solar?", "--preset", "deep", "--output", out, "--dry-run"],
    scenarioFile,
    path.join(work, "state"),
  );
  assert.equal(result.code, 0);
  assert.match(result.stdout, /dry run/);
  assert.match(result.stdout, /"searchAngles": 8/);
  assert.equal(existsSync(out), false);
});
