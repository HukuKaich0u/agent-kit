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
});

test("parseArgs supports bare --keep-going, --keep-going true|false, and --no-keep-going", () => {
  const bare = parseArgs(["--question", "q", "--keep-going"]);
  assert.equal(bare.keepGoing, true);

  const explicitTrue = parseArgs(["--question", "q", "--keep-going", "true"]);
  assert.equal(explicitTrue.keepGoing, true);

  const explicitFalse = parseArgs(["--question", "q", "--keep-going", "false"]);
  assert.equal(explicitFalse.keepGoing, false);

  const negated = parseArgs(["--question", "q", "--no-keep-going"]);
  assert.equal(negated.keepGoing, false);

  // A bare --keep-going does not consume an unrelated following flag.
  const bareThenDryRun = parseArgs(["--question", "q", "--keep-going", "--dry-run"]);
  assert.equal(bareThenDryRun.keepGoing, true);
  assert.equal(bareThenDryRun.dryRun, true);
});

test("parseArgs allows resume without question", () => {
  const options = parseArgs(["--resume", "some/run"]);
  assert.equal(options.resume, "some/run");
});
