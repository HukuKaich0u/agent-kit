import test from "node:test";
import assert from "node:assert/strict";
import {
  decideVerificationState,
  capConfidence,
  claimIndependence,
  buildRegistry,
} from "../../scripts/lib/pipeline.mjs";

test("decision table matches design section 10.8", () => {
  const d = decideVerificationState;
  assert.deepEqual(d(null, null), { state: "not_checked", needsAdjudication: false });
  assert.deepEqual(d({ verdict: "supported" }, null), { state: "not_checked", needsAdjudication: false });
  assert.equal(d({ verdict: "unsupported" }, { status: "contradicted" }).state, "refuted");
  assert.equal(d({ verdict: "unsupported" }, { status: "no_counterevidence_found" }).state, "refuted");
  assert.equal(d({ verdict: "inaccessible" }, { status: "no_counterevidence_found" }).state, "insufficient");
  assert.equal(d({ verdict: "supported" }, { status: "search_failed" }).state, "insufficient");
  assert.equal(d({ verdict: "supported" }, { status: "no_counterevidence_found" }).state, "confirmed");
  assert.equal(d({ verdict: "partially_supported" }, { status: "no_counterevidence_found" }).state, "qualified");
  assert.equal(d({ verdict: "supported" }, { status: "materially_qualified" }).state, "qualified");
  assert.equal(d({ verdict: "partially_supported" }, { status: "materially_qualified" }).state, "qualified");
  const conflict = d({ verdict: "supported" }, { status: "contradicted" });
  assert.equal(conflict.needsAdjudication, true);
  assert.equal(conflict.state, null);
});

function sourcesMap(entries) {
  return new Map(
    entries.map(([id, quality, independenceKey, independenceConfidence]) => [
      id,
      { id, quality, independenceKey, independenceConfidence },
    ]),
  );
}

test("confidence cap: high requires 2+ established keys, a high-quality source, no low-quality dependence", () => {
  const sources = sourcesMap([
    ["S001", "high", "publisher:a", "established"],
    ["S002", "medium", "publisher:b", "established"],
  ]);
  const accepted = [
    { sourceId: "S001", excerptId: "E001", role: "support" },
    { sourceId: "S002", excerptId: "E002", role: "support" },
  ];
  assert.equal(
    capConfidence({ verificationState: "confirmed", acceptedEvidence: accepted, sourcesById: sources }),
    "high",
  );
});

test("confidence cap: single established source caps at medium", () => {
  const sources = sourcesMap([["S001", "high", "publisher:a", "established"]]);
  const accepted = [{ sourceId: "S001", excerptId: "E001", role: "support" }];
  assert.equal(
    capConfidence({ verificationState: "confirmed", acceptedEvidence: accepted, sourcesById: sources }),
    "medium",
  );
});

test("confidence cap: low-quality dependence blocks high", () => {
  const sources = sourcesMap([
    ["S001", "high", "publisher:a", "established"],
    ["S002", "low", "publisher:b", "established"],
  ]);
  const accepted = [
    { sourceId: "S001", excerptId: "E001", role: "support" },
    { sourceId: "S002", excerptId: "E002", role: "support" },
  ];
  assert.equal(
    capConfidence({ verificationState: "confirmed", acceptedEvidence: accepted, sourcesById: sources }),
    "medium",
  );
});

test("confidence cap: provisional-only evidence is low; contested is always low", () => {
  const sources = sourcesMap([
    ["S001", "high", "host:a.example.com", "provisional"],
    ["S002", "high", "host:b.example.com", "provisional"],
  ]);
  const accepted = [
    { sourceId: "S001", excerptId: "E001", role: "support" },
    { sourceId: "S002", excerptId: "E002", role: "support" },
  ];
  assert.equal(
    capConfidence({ verificationState: "confirmed", acceptedEvidence: accepted, sourcesById: sources }),
    "low",
  );
  assert.equal(
    capConfidence({ verificationState: "contested", acceptedEvidence: accepted, sourcesById: sources }),
    "low",
  );
});

test("claimIndependence counts distinct keys and mixes confidence", () => {
  const sources = sourcesMap([
    ["S001", "high", "publisher:a", "established"],
    ["S002", "high", "publisher:a", "established"],
    ["S003", "high", "host:x.example.com", "provisional"],
  ]);
  const result = claimIndependence(["S001", "S002", "S003"], sources);
  assert.equal(result.count, 2); // same publisher counted once
  assert.equal(result.confidence, "mixed");
});

test("buildRegistry merges normalized duplicate claims and assigns stable IDs", () => {
  const payload = {
    schemaVersion: "1.0",
    sources: [
      {
        requestedUrl: "https://a.example.com/x",
        resolvedUrl: "https://a.example.com/x",
        title: "A",
        publisher: "A Pub",
        publisherGroup: "A Group",
        originUrl: null,
        author: null,
        publishedAt: "2025-01-01",
        retrievedAt: "2026-07-02",
        sourceType: "secondary_reporting",
        quality: "medium",
        qualityRationale: "ok",
        extractionStatus: "extracted",
        excerpts: [{ localId: "x1", text: "evidence one", locator: null }],
        claims: [
          {
            text: "Solar   capacity DOUBLED",
            scope: "US",
            importance: "supporting",
            timeSensitivity: "low",
            evidenceExcerptLocalIds: ["x1"],
          },
        ],
      },
      {
        requestedUrl: "https://b.example.com/y",
        resolvedUrl: "https://b.example.com/y",
        title: "B",
        publisher: "B Pub",
        publisherGroup: "B Group",
        originUrl: null,
        author: null,
        publishedAt: "2025-02-01",
        retrievedAt: "2026-07-02",
        sourceType: "primary_research",
        quality: "high",
        qualityRationale: "ok",
        extractionStatus: "extracted",
        excerpts: [{ localId: "x1", text: "evidence two", locator: null }],
        claims: [
          {
            text: "solar capacity doubled",
            scope: "US",
            importance: "central",
            timeSensitivity: "high",
            evidenceExcerptLocalIds: ["x1"],
          },
        ],
      },
    ],
  };
  const { sources, claims } = buildRegistry({
    extractionPayloads: [payload],
    selectedByRequestedUrl: new Map(),
    claimsExtractedCap: 10,
  });
  assert.equal(sources.length, 2);
  assert.deepEqual(sources.map((s) => s.id), ["S001", "S002"]);
  assert.equal(claims.length, 1);
  assert.equal(claims[0].id, "C001");
  assert.equal(claims[0].importance, "central"); // strongest importance wins
  assert.equal(claims[0].timeSensitivity, "high");
  assert.equal(claims[0].supportingEvidence.length, 2);
  assert.equal(claims[0].independentSourceCount, 2);
  assert.equal(claims[0].independenceConfidence, "established");
});

test("buildRegistry drops claims whose excerpts are missing and non-extracted sources", () => {
  const payload = {
    schemaVersion: "1.0",
    sources: [
      {
        requestedUrl: "https://a.example.com/x",
        resolvedUrl: "https://a.example.com/x",
        title: "A",
        publisher: null,
        publisherGroup: null,
        originUrl: null,
        author: null,
        publishedAt: null,
        retrievedAt: "2026-07-02",
        sourceType: "unknown",
        quality: "unknown",
        qualityRationale: "n/a",
        extractionStatus: "inaccessible",
        excerpts: [],
        claims: [],
      },
    ],
  };
  const { sources, claims } = buildRegistry({
    extractionPayloads: [payload],
    selectedByRequestedUrl: new Map(),
    claimsExtractedCap: 10,
  });
  assert.equal(sources.length, 1); // kept in catalog for audit
  assert.equal(claims.length, 0);
});
