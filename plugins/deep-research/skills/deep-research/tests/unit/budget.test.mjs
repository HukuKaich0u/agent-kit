import test from "node:test";
import assert from "node:assert/strict";
import { PRESETS, resolveBudget, prioritizeClaims } from "../../scripts/lib/budget.mjs";

test("presets match design section 11", () => {
  assert.equal(PRESETS.quick.searchAngles, 3);
  assert.equal(PRESETS.standard.selectedSources, 20);
  assert.equal(PRESETS.deep.claimsVerifiedCap, 35);
  assert.equal(PRESETS.quick.runDeadlineMs, 20 * 60 * 1000);
  assert.equal(PRESETS.quick.perWorkerTimeoutMs, 5 * 60 * 1000);
});

test("resolveBudget applies concurrency override with validation", () => {
  const b = resolveBudget("standard", { maxConcurrency: "2" });
  assert.equal(b.maxConcurrency, 2);
  assert.throws(() => resolveBudget("standard", { maxConcurrency: "0" }));
  assert.throws(() => resolveBudget("standard", { maxConcurrency: "abc" }));
  assert.throws(() => resolveBudget("nope"));
});

test("prioritizeClaims orders central, time-sensitive, single-source first", () => {
  const claims = [
    { id: "C001", importance: "contextual", timeSensitivity: "low", independentSourceCount: 3 },
    { id: "C002", importance: "central", timeSensitivity: "low", independentSourceCount: 3 },
    { id: "C003", importance: "central", timeSensitivity: "high", independentSourceCount: 3 },
    { id: "C004", importance: "supporting", timeSensitivity: "high", independentSourceCount: 1 },
    { id: "C005", importance: "supporting", timeSensitivity: "high", independentSourceCount: 2 },
  ];
  const ordered = prioritizeClaims(claims).map((c) => c.id);
  assert.deepEqual(ordered, ["C003", "C002", "C004", "C005", "C001"]);
});
