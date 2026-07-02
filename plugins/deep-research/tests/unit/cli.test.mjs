import test from "node:test";
import assert from "node:assert/strict";
import { parseArgs } from "../../scripts/deep-research.mjs";

test("parseArgs accepts the documented contract", () => {
  const options = parseArgs([
    "--question",
    "how fast is solar growing?",
    "--preset",
    "quick",
    "--output",
    "out",
    "--as-of",
    "2026-07-01",
    "--max-concurrency",
    "2",
    "--keep-going",
    "false",
    "--dry-run",
  ]);
  assert.equal(options.preset, "quick");
  assert.equal(options.keepGoing, false);
  assert.equal(options.dryRun, true);
});

test("parseArgs rejects unknown flags", () => {
  assert.throws(() => parseArgs(["--nope"]), /unknown flag/);
});

test("parseArgs rejects an empty question", () => {
  assert.throws(() => parseArgs(["--question", "   "]), /--question is required/);
  assert.throws(() => parseArgs([]), /--question is required/);
});

test("parseArgs rejects invalid preset, as-of, and keep-going values", () => {
  assert.throws(() => parseArgs(["--question", "q", "--preset", "mega"]), /unknown preset/);
  assert.throws(() => parseArgs(["--question", "q", "--as-of", "July 1"]), /--as-of/);
  assert.throws(() => parseArgs(["--question", "q", "--keep-going", "maybe"]), /--keep-going/);
});

test("parseArgs allows resume without question", () => {
  const options = parseArgs(["--resume", "some/run"]);
  assert.equal(options.resume, "some/run");
});
