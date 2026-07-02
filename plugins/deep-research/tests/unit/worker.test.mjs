import test from "node:test";
import assert from "node:assert/strict";
import {
  classifyFailure,
  backoffMs,
  buildWorkerArgs,
  runPool,
} from "../../scripts/lib/codex-worker.mjs";

test("classifyFailure: timeout and generic non-zero exits are retryable process errors", () => {
  assert.deepEqual(classifyFailure({ exitCode: null, timedOut: true, stderr: "", schemaValid: null }), {
    errorClass: "worker_process_error",
    retryable: true,
  });
  assert.deepEqual(classifyFailure({ exitCode: 1, timedOut: false, stderr: "boom", schemaValid: null }), {
    errorClass: "worker_process_error",
    retryable: true,
  });
});

test("classifyFailure: rate limits are retryable, quota exhaustion is not", () => {
  assert.deepEqual(
    classifyFailure({ exitCode: 1, timedOut: false, stderr: "429 Too Many Requests", schemaValid: null }),
    { errorClass: "rate_limit_error", retryable: true },
  );
  assert.deepEqual(
    classifyFailure({ exitCode: 1, timedOut: false, stderr: "usage limit reached", schemaValid: null }),
    { errorClass: "rate_limit_error", retryable: false },
  );
});

test("classifyFailure: schema errors are retryable schema_error", () => {
  assert.deepEqual(classifyFailure({ exitCode: 0, timedOut: false, stderr: "", schemaValid: false }), {
    errorClass: "schema_error",
    retryable: true,
  });
});

test("backoffMs grows exponentially with bounded jitter", () => {
  const noJitter = { random: () => 0 };
  assert.equal(backoffMs(1, { baseMs: 100, ...noJitter }), 100);
  assert.equal(backoffMs(2, { baseMs: 100, ...noJitter }), 200);
  assert.equal(backoffMs(3, { baseMs: 100, ...noJitter }), 400);
  const maxJitter = backoffMs(1, { baseMs: 100, random: () => 1 });
  assert.equal(maxJitter, 125);
});

test("buildWorkerArgs matches the section 9 contract", () => {
  const args = buildWorkerArgs({
    workDir: "/tmp/w",
    schemaFile: "/s.json",
    resultFile: "/r.json",
    model: null,
  });
  assert.deepEqual(args, [
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
    "/tmp/w",
    "--output-schema",
    "/s.json",
    "--output-last-message",
    "/r.json",
    "-",
  ]);
  const withModel = buildWorkerArgs({
    workDir: "/tmp/w",
    schemaFile: "/s.json",
    resultFile: "/r.json",
    model: "gpt-5",
  });
  assert.deepEqual(withModel.slice(-3), ["--model", "gpt-5", "-"]);
});

test("runPool bounds concurrency and preserves order", async () => {
  let active = 0;
  let peak = 0;
  const tasks = Array.from({ length: 6 }, (_, i) => async () => {
    active += 1;
    peak = Math.max(peak, active);
    await new Promise((r) => setTimeout(r, 10));
    active -= 1;
    return i;
  });
  const results = await runPool(tasks, 2);
  assert.deepEqual(results, [0, 1, 2, 3, 4, 5]);
  assert.equal(peak <= 2, true);
});

test("runPool rethrows the first task error after draining in-flight work", async () => {
  const tasks = [
    async () => 1,
    async () => {
      throw new Error("boom");
    },
    async () => 3,
  ];
  await assert.rejects(() => runPool(tasks, 1), /boom/);
});
