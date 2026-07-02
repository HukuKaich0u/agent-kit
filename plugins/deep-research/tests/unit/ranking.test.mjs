import test from "node:test";
import assert from "node:assert/strict";
import { canonicalizeCandidates, selectSources, staticScore } from "../../scripts/lib/ranking.mjs";

const SCOPE = {
  expectedSourceTypes: ["official_statistics"],
  temporalScope: { asOf: "2026-07-02", dateFrom: "2020-01-01", dateTo: "2026-07-02" },
};

function candidate(overrides) {
  return {
    url: "https://example.com/a",
    title: "t",
    publisher: null,
    hostname: "example.com",
    publisherGroup: null,
    snippet: "s",
    publishedAt: null,
    sourceType: "secondary_reporting",
    relevance: "medium",
    relevanceRationale: "r",
    query: "q",
    angleId: "A01",
    ...overrides,
  };
}

test("canonicalizeCandidates merges duplicates and unions angles", () => {
  const { candidates } = canonicalizeCandidates([
    candidate({ url: "https://www.example.com/a?utm_source=x", angleId: "A01" }),
    candidate({ url: "https://example.com/a", angleId: "A02" }),
  ]);
  assert.equal(candidates.length, 1);
  assert.deepEqual(candidates[0].angleIds, ["A01", "A02"]);
});

test("canonicalizeCandidates quarantines bad schemes", () => {
  const { candidates, quarantined } = canonicalizeCandidates([
    candidate({ url: "ftp://example.com/f" }),
  ]);
  assert.equal(candidates.length, 0);
  assert.equal(quarantined.length, 1);
  assert.match(quarantined[0].quarantineReason, /unsupported_scheme/);
});

test("staticScore follows the fixed weight table", () => {
  const base = canonicalizeCandidates([candidate({})]).candidates[0];
  assert.equal(staticScore(base, SCOPE), 15); // medium relevance only

  const official = canonicalizeCandidates([
    candidate({ sourceType: "official_statistics", relevance: "high", publishedAt: "2024-01-01" }),
  ]).candidates[0];
  assert.equal(staticScore(official, SCOPE), 30 + 15 + 10);

  const stale = canonicalizeCandidates([
    candidate({ publishedAt: "2010-01-01" }),
  ]).candidates[0];
  assert.equal(staticScore(stale, SCOPE), 15 - 20);

  const community = canonicalizeCandidates([
    candidate({ sourceType: "community", relevance: "low" }),
  ]).candidates[0];
  assert.equal(staticScore(community, SCOPE), -10);

  const unknown = canonicalizeCandidates([
    candidate({ sourceType: "unknown", relevance: "low" }),
  ]).candidates[0];
  assert.equal(staticScore(unknown, SCOPE), -5);
});

test("selectSources enforces the default host cap of 2", () => {
  const { candidates } = canonicalizeCandidates([
    candidate({ url: "https://example.com/1", relevance: "high" }),
    candidate({ url: "https://example.com/2", relevance: "high" }),
    candidate({ url: "https://example.com/3", relevance: "high" }),
    candidate({ url: "https://other.example.org/1", relevance: "low" }),
  ]);
  const { selected, dropped } = selectSources(candidates, SCOPE, 10);
  const hosts = selected.map((s) => s.canonicalHostname);
  assert.equal(hosts.filter((h) => h === "example.com").length, 2);
  assert.equal(dropped.some((d) => d.reason === "host_cap"), true);
  assert.equal(hosts.includes("other.example.org"), true);
});

test("selectSources allows up to 4 pages for expected primary datasets and records the exception", () => {
  const stats = ["1", "2", "3", "4", "5"].map((n) =>
    candidate({
      url: `https://stats.example.gov/${n}`,
      sourceType: "official_statistics",
      relevance: "high",
    }),
  );
  const { candidates } = canonicalizeCandidates(stats);
  const { selected, exceptions } = selectSources(candidates, SCOPE, 10);
  assert.equal(selected.length, 4);
  assert.equal(exceptions.length, 2); // 3rd and 4th picks exceed the default cap
});

test("selectSources respects the budget limit", () => {
  const many = Array.from({ length: 10 }, (_, i) =>
    candidate({ url: `https://site${i}.example.com/page`, hostname: `site${i}.example.com` }),
  );
  const { candidates } = canonicalizeCandidates(many);
  const { selected, dropped } = selectSources(candidates, SCOPE, 3);
  assert.equal(selected.length, 3);
  assert.equal(dropped.filter((d) => d.reason === "budget_limit").length, 7);
});

test("selectSources tie-break is deterministic (relevance, newer date, url)", () => {
  const { candidates } = canonicalizeCandidates([
    candidate({ url: "https://b.example.com/x", publishedAt: null, relevance: "medium" }),
    candidate({ url: "https://a.example.com/x", publishedAt: "2025-01-01", relevance: "medium" }),
  ]);
  const { selected } = selectSources(candidates, {
    expectedSourceTypes: [],
    temporalScope: { asOf: "2026-07-02", dateFrom: null, dateTo: null },
  }, 10);
  // Known date sorts before unknown date at equal score.
  assert.equal(selected[0].canonicalHostname, "a.example.com");
});
