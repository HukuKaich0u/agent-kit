/**
 * Run artifact store (design section 12).
 * All JSON writes are atomic (temp file + rename); JSONL logs are
 * append-only.
 */

import {
  mkdirSync,
  writeFileSync,
  renameSync,
  readFileSync,
  appendFileSync,
  existsSync,
} from "node:fs";
import { createHash, randomBytes } from "node:crypto";
import path from "node:path";

export const MANIFEST_SCHEMA_VERSION = "1.0";

export const PHASE_NAMES = [
  "scope",
  "search",
  "selection",
  "extraction",
  "verification",
  "synthesis",
  "audit",
];

export const PHASE_STATUS = [
  "pending",
  "running",
  "completed",
  "completed_with_warnings",
  "failed",
  "cancelled",
];

export function questionHash(question) {
  return createHash("sha256").update(question, "utf8").digest("hex");
}

export function slugify(question) {
  const slug = question
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return slug === "" ? "run" : slug;
}

export function atomicWriteJson(filePath, data) {
  mkdirSync(path.dirname(filePath), { recursive: true });
  const tmp = `${filePath}.${randomBytes(6).toString("hex")}.tmp`;
  writeFileSync(tmp, JSON.stringify(data, null, 2) + "\n", "utf8");
  renameSync(tmp, filePath);
}

export function atomicWriteText(filePath, text) {
  mkdirSync(path.dirname(filePath), { recursive: true });
  const tmp = `${filePath}.${randomBytes(6).toString("hex")}.tmp`;
  writeFileSync(tmp, text, "utf8");
  renameSync(tmp, filePath);
}

export function appendJsonl(filePath, record) {
  mkdirSync(path.dirname(filePath), { recursive: true });
  appendFileSync(filePath, JSON.stringify(record) + "\n", "utf8");
}

export function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

export function readJsonl(filePath) {
  if (!existsSync(filePath)) return [];
  return readFileSync(filePath, "utf8")
    .split("\n")
    .filter((line) => line.trim() !== "")
    .map((line) => JSON.parse(line));
}

export class RunStore {
  constructor(runDir) {
    this.runDir = runDir;
  }

  static create({ outputDir, runId, question, budget, environment }) {
    const runDir = path.join(outputDir, runId);
    if (existsSync(path.join(runDir, "manifest.json"))) {
      throw new Error(`run directory already has a manifest: ${runDir}`);
    }
    mkdirSync(path.join(runDir, "workers"), { recursive: true });
    const store = new RunStore(runDir);
    const now = new Date().toISOString();
    const phases = {};
    for (const name of PHASE_NAMES) phases[name] = "pending";
    store.writeManifest({
      schemaVersion: MANIFEST_SCHEMA_VERSION,
      pluginVersion: "0.1.0",
      runId,
      questionHash: questionHash(question),
      createdAt: now,
      updatedAt: now,
      preset: budget.preset,
      effectiveBudget: budget,
      environment,
      phases,
      workerCounts: { total: 0, succeeded: 0, failed: 0, retried: 0 },
      warnings: [],
      errors: [],
      runStatus: "running",
    });
    return store;
  }

  static open(runDir) {
    if (!existsSync(path.join(runDir, "manifest.json"))) {
      throw new Error(`not a run directory (missing manifest.json): ${runDir}`);
    }
    return new RunStore(runDir);
  }

  filePath(name) {
    return path.join(this.runDir, name);
  }

  workerDir(workerId) {
    return path.join(this.runDir, "workers", workerId);
  }

  readManifest() {
    return readJson(this.filePath("manifest.json"));
  }

  writeManifest(manifest) {
    atomicWriteJson(this.filePath("manifest.json"), manifest);
  }

  updateManifest(patch) {
    const manifest = this.readManifest();
    const next =
      typeof patch === "function" ? patch(manifest) : { ...manifest, ...patch };
    next.updatedAt = new Date().toISOString();
    this.writeManifest(next);
    return next;
  }

  setPhase(phase, status) {
    if (!PHASE_NAMES.includes(phase)) throw new Error(`unknown phase: ${phase}`);
    if (!PHASE_STATUS.includes(status)) throw new Error(`unknown phase status: ${status}`);
    this.updateManifest((m) => ({ ...m, phases: { ...m.phases, [phase]: status } }));
    this.event({ type: "phase", phase, status });
  }

  addWarning(message) {
    this.updateManifest((m) => ({ ...m, warnings: [...m.warnings, message] }));
    this.event({ type: "warning", message });
  }

  addError(errorClass, message) {
    this.updateManifest((m) => ({
      ...m,
      errors: [...m.errors, { class: errorClass, message }],
    }));
    this.event({ type: "error", class: errorClass, message });
  }

  bumpWorkerCounts(patch) {
    this.updateManifest((m) => {
      const counts = { ...m.workerCounts };
      for (const [k, v] of Object.entries(patch)) counts[k] = (counts[k] ?? 0) + v;
      return { ...m, workerCounts: counts };
    });
  }

  event(record) {
    appendJsonl(this.filePath("events.jsonl"), { at: new Date().toISOString(), ...record });
  }

  writeJson(name, data) {
    atomicWriteJson(this.filePath(name), data);
  }

  writeText(name, text) {
    atomicWriteText(this.filePath(name), text);
  }

  readJsonIfExists(name) {
    const p = this.filePath(name);
    return existsSync(p) ? readJson(p) : null;
  }

  saveWorkerArtifacts(workerId, { prompt, stdout, stderr, execution, payload }) {
    const dir = this.workerDir(workerId);
    mkdirSync(dir, { recursive: true });
    atomicWriteText(path.join(dir, "prompt.txt"), prompt);
    if (stdout != null) atomicWriteText(path.join(dir, "stdout.jsonl"), stdout);
    if (stderr != null) atomicWriteText(path.join(dir, "stderr.log"), stderr);
    atomicWriteJson(path.join(dir, "execution.json"), execution);
    if (payload !== undefined) atomicWriteJson(path.join(dir, "result.json"), payload);
  }
}
