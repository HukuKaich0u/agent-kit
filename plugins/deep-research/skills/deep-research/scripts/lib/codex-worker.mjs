/**
 * Codex worker runner (design section 9).
 * Workers are ephemeral `codex --search exec` subprocesses executed in a
 * dedicated temporary directory outside the research repository, with the
 * prompt passed on stdin and results returned via --output-last-message.
 */

import { spawn, execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { validate } from "./schema.mjs";

export const ERROR_CLASSES = [
  "configuration_error",
  "worker_process_error",
  "schema_error",
  "search_error",
  "source_access_error",
  "rate_limit_error",
  "budget_exhausted",
  "audit_error",
  "internal_error",
];

/**
 * Classify a worker failure for retry policy (design section 13).
 * @returns {{errorClass: string, retryable: boolean}}
 */
export function classifyFailure({ exitCode, timedOut, stderr, schemaValid }) {
  if (timedOut) {
    return { errorClass: "worker_process_error", retryable: true };
  }
  if (exitCode !== 0) {
    const text = (stderr ?? "").toLowerCase();
    if (/rate.?limit|429|too many requests|overloaded/.test(text)) {
      return { errorClass: "rate_limit_error", retryable: true };
    }
    if (/usage.?limit|quota/.test(text)) {
      return { errorClass: "rate_limit_error", retryable: false };
    }
    return { errorClass: "worker_process_error", retryable: true };
  }
  if (schemaValid === false) {
    return { errorClass: "schema_error", retryable: true };
  }
  return { errorClass: "internal_error", retryable: false };
}

export function backoffMs(attempt, { baseMs = 2000, jitterRatio = 0.25, random = Math.random } = {}) {
  const exp = baseMs * 2 ** (attempt - 1);
  const jitter = exp * jitterRatio * random();
  return Math.round(exp + jitter);
}

export function buildWorkerArgs({ workDir, schemaFile, resultFile, model }) {
  const args = [
    "--search",
    "--ask-for-approval",
    "never",
    "exec",
    "--ephemeral",
    "--skip-git-repo-check",
    "--sandbox",
    "read-only",
    "--color",
    "never",
    "--json",
    "--cd",
    workDir,
    "--output-schema",
    schemaFile,
    "--output-last-message",
    resultFile,
  ];
  if (model) {
    args.push("--model", model);
  }
  args.push("-");
  return args;
}

function spawnOnce({ codexBin, args, prompt, timeoutMs }) {
  return new Promise((resolve) => {
    const startedAt = new Date().toISOString();
    const child = spawn(codexBin, args, { stdio: ["pipe", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGKILL");
    }, timeoutMs);
    child.stdout.on("data", (d) => (stdout += d));
    child.stderr.on("data", (d) => (stderr += d));
    child.on("error", (err) => {
      clearTimeout(timer);
      resolve({
        startedAt,
        finishedAt: new Date().toISOString(),
        exitCode: null,
        spawnError: String(err),
        timedOut,
        stdout,
        stderr,
      });
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({
        startedAt,
        finishedAt: new Date().toISOString(),
        exitCode: code,
        spawnError: null,
        timedOut,
        stdout,
        stderr,
      });
    });
    child.stdin.write(prompt);
    child.stdin.end();
  });
}

const SCHEMA_RETRY_INSTRUCTION =
  "\n\nIMPORTANT: Your previous response did not validate against the required JSON schema. " +
  "Return ONLY a single JSON object that conforms exactly to the schema. " +
  "Do not wrap it in markdown fences or add commentary.";

/**
 * Run one worker with retry (design sections 9 and 13.2).
 *
 * @param {object} opts
 * @param {string} opts.workerId
 * @param {string} opts.role
 * @param {string} opts.prompt
 * @param {string} opts.schemaName  logical schema name for payload validation
 * @param {string} opts.schemaFile  path passed to --output-schema
 * @param {number} opts.timeoutMs
 * @param {number} opts.maxRetries  additional attempts after the first
 * @param {string} [opts.model]
 * @param {string} [opts.codexBin]
 * @param {(rec: object) => void} [opts.onEvent]
 * @param {(attempt: number) => Promise<void>} [opts.sleep]
 * @returns {Promise<{execution: object, payload: object | null, stdout: string, stderr: string, prompt: string}>}
 */
export async function runWorker(opts) {
  const {
    workerId,
    role,
    prompt,
    schemaName,
    schemaFile,
    timeoutMs,
    maxRetries,
    model = null,
    codexBin = "codex",
    onEvent = () => {},
    sleep = (attempt) => new Promise((r) => setTimeout(r, backoffMs(attempt))),
  } = opts;

  let attempt = 0;
  let lastError = null;
  let lastStdout = "";
  let lastStderr = "";
  let effectivePrompt = prompt;

  while (attempt <= maxRetries) {
    attempt += 1;
    const workDir = mkdtempSync(path.join(tmpdir(), `deep-research-${role}-`));
    const resultFile = path.join(workDir, "last-message.json");
    const args = buildWorkerArgs({ workDir, schemaFile, resultFile, model });
    onEvent({ type: "worker", workerId, role, status: "running", attempt });

    const proc = await spawnOnce({ codexBin, args, prompt: effectivePrompt, timeoutMs });
    lastStdout = proc.stdout;
    lastStderr = proc.stderr;

    let payload = null;
    let schemaValid = null;
    let schemaErrors = [];
    if (proc.exitCode === 0 && existsSync(resultFile)) {
      try {
        payload = JSON.parse(readFileSync(resultFile, "utf8"));
        const result = validate(schemaName, payload);
        schemaValid = result.valid;
        schemaErrors = result.errors;
      } catch (err) {
        schemaValid = false;
        schemaErrors = [`invalid JSON in result file: ${err}`];
      }
    } else if (proc.exitCode === 0) {
      schemaValid = false;
      schemaErrors = ["result file missing"];
    }

    rmSync(workDir, { recursive: true, force: true });

    if (proc.exitCode === 0 && schemaValid) {
      const execution = {
        workerId,
        role,
        status: "succeeded",
        attempt,
        startedAt: proc.startedAt,
        finishedAt: proc.finishedAt,
        exitCode: proc.exitCode,
        schemaValid: true,
        error: null,
      };
      onEvent({ type: "worker", workerId, role, status: "succeeded", attempt });
      return { execution, payload, stdout: lastStdout, stderr: lastStderr, prompt: effectivePrompt };
    }

    if (proc.spawnError) {
      const execution = {
        workerId,
        role,
        status: "failed",
        attempt,
        startedAt: proc.startedAt,
        finishedAt: proc.finishedAt,
        exitCode: null,
        schemaValid: null,
        error: { class: "configuration_error", message: proc.spawnError },
      };
      onEvent({ type: "worker", workerId, role, status: "failed", attempt, errorClass: "configuration_error" });
      return { execution, payload: null, stdout: lastStdout, stderr: lastStderr, prompt: effectivePrompt };
    }

    const failure = classifyFailure({
      exitCode: proc.exitCode,
      timedOut: proc.timedOut,
      stderr: proc.stderr,
      schemaValid,
    });
    lastError = {
      class: failure.errorClass,
      message:
        failure.errorClass === "schema_error"
          ? `schema validation failed: ${schemaErrors.slice(0, 5).join("; ")}`
          : proc.timedOut
            ? `worker timed out after ${timeoutMs}ms`
            : `exit code ${proc.exitCode}`,
    };
    onEvent({
      type: "worker",
      workerId,
      role,
      status: "retrying",
      attempt,
      errorClass: failure.errorClass,
    });

    if (!failure.retryable || attempt > maxRetries) break;
    if (failure.errorClass === "schema_error") {
      // Schema errors get exactly one corrective retry (design 13.2).
      if (effectivePrompt.includes(SCHEMA_RETRY_INSTRUCTION)) break;
      effectivePrompt = prompt + SCHEMA_RETRY_INSTRUCTION;
    }
    await sleep(attempt);
  }

  const execution = {
    workerId,
    role,
    status: "failed",
    attempt,
    startedAt: null,
    finishedAt: new Date().toISOString(),
    exitCode: null,
    schemaValid: false,
    error: lastError ?? { class: "internal_error", message: "unknown failure" },
  };
  onEvent({
    type: "worker",
    workerId,
    role,
    status: "failed",
    attempt,
    errorClass: execution.error.class,
  });
  return { execution, payload: null, stdout: lastStdout, stderr: lastStderr, prompt: effectivePrompt };
}

/**
 * Bounded-concurrency pool. Tasks are () => Promise<T>; results keep
 * input order. Task rejections abort the pool: in-flight tasks finish,
 * queued tasks are not started, and the first error is rethrown so the
 * caller (e.g. --keep-going=false) can fail the run.
 */
export async function runPool(tasks, concurrency) {
  const results = new Array(tasks.length).fill(null);
  let next = 0;
  let firstError = null;
  async function drain() {
    while (next < tasks.length && firstError === null) {
      const index = next++;
      try {
        results[index] = await tasks[index]();
      } catch (err) {
        firstError ??= err;
      }
    }
  }
  const workers = [];
  for (let i = 0; i < Math.max(1, Math.min(concurrency, tasks.length)); i++) {
    workers.push(drain());
  }
  await Promise.all(workers);
  if (firstError !== null) throw firstError;
  return results;
}

/**
 * Record the effective worker environment (design section 9.2) without
 * capturing credential values or user config contents.
 */
export function probeEnvironment(codexBin = "codex") {
  let version = null;
  try {
    version = execFileSync(codexBin, ["--version"], { encoding: "utf8" }).trim();
  } catch {
    // handled by caller as configuration_error
  }
  return {
    version,
    binaryPath: codexBin,
    sandbox: "read-only",
    searchEnabled: true,
    userConfigInherited: true,
  };
}
