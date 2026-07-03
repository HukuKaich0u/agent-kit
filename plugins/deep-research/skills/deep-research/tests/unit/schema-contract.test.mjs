import test from "node:test";
import assert from "node:assert/strict";
import { validate, SCHEMA_NAMES } from "../../scripts/lib/schema.mjs";

const VALID = {
  scope: {
    schemaVersion: "1.0",
    question: "q",
    summary: "s",
    assumptions: [],
    temporalScope: { asOf: "2026-07-02", dateFrom: null, dateTo: null, rationale: "r" },
    geographicScope: ["US"],
    searchLanguages: ["en"],
    reportLanguage: "en",
    decisionCriteria: [],
    ambiguities: [],
    excludedAreas: [],
    expectedSourceTypes: ["official_statistics"],
    angles: [
      {
        id: "A01",
        label: "baseline",
        rationale: "r",
        queries: ["q1"],
        preferredSourceTypes: ["secondary_reporting"],
      },
    ],
  },
  search: {
    schemaVersion: "1.0",
    angleId: "A01",
    results: [
      {
        url: "https://example.com/a",
        title: "t",
        publisher: null,
        hostname: "example.com",
        publisherGroup: null,
        snippet: "s",
        publishedAt: null,
        sourceType: "secondary_reporting",
        relevance: "high",
        relevanceRationale: "r",
        query: "q",
      },
    ],
  },
  extraction: {
    schemaVersion: "1.0",
    sources: [
      {
        requestedUrl: "https://example.com/a",
        resolvedUrl: "https://example.com/a",
        title: "t",
        publisher: null,
        publisherGroup: null,
        originUrl: null,
        author: null,
        publishedAt: null,
        retrievedAt: "2026-07-02",
        sourceType: "secondary_reporting",
        quality: "medium",
        qualityRationale: "r",
        extractionStatus: "extracted",
        excerpts: [{ localId: "x1", text: "e", locator: null }],
        claims: [
          {
            text: "c",
            scope: "s",
            importance: "central",
            timeSensitivity: "low",
            evidenceExcerptLocalIds: ["x1"],
          },
        ],
      },
    ],
  },
  support: {
    schemaVersion: "1.0",
    claimId: "C001",
    verdict: "supported",
    rationale: "r",
    checkedEvidence: [{ sourceId: "S001", excerptId: "E001", supportsClaim: true, issue: null }],
    scopeCorrections: [],
  },
  challenge: {
    schemaVersion: "1.0",
    claimId: "C001",
    status: "no_counterevidence_found",
    rationale: "r",
    counterSources: [],
    queriesUsed: ["q"],
  },
  adjudication: {
    schemaVersion: "1.0",
    claimId: "C001",
    verificationState: "qualified",
    confidence: "medium",
    rationale: "r",
    acceptedEvidence: [{ sourceId: "S001", excerptId: "E001", role: "support" }],
    rejectedEvidence: [],
    qualifications: ["only in the US"],
  },
  report: {
    schemaVersion: "1.0",
    title: "t",
    asOf: "2026-07-02",
    scope: "s",
    executiveSummary: "e",
    findings: [
      {
        id: "F01",
        heading: "h",
        claim: "c",
        explanation: "e",
        confidence: "high",
        verificationState: "confirmed",
        sourceIds: ["S001"],
        claimIds: ["C001"],
      },
    ],
    disagreements: [
      {
        topic: "t",
        positions: [
          { position: "p1", sourceIds: ["S001"] },
          { position: "p2", sourceIds: ["S001"] },
        ],
        unresolvedReason: "r",
      },
    ],
    limitations: [],
    openQuestions: [],
    methodology: "m",
  },
};

for (const name of SCHEMA_NAMES) {
  test(`schema ${name}: fixture validates`, () => {
    const fixture = VALID[name];
    assert.ok(fixture, `missing fixture for ${name}`);
    const result = validate(name, fixture);
    assert.deepEqual(result.errors, []);
    assert.equal(result.valid, true);
  });

  test(`schema ${name}: rejects empty object, wrong version, extra properties`, () => {
    assert.equal(validate(name, {}).valid, false);
    assert.equal(validate(name, { ...VALID[name], schemaVersion: "2.0" }).valid, false);
    assert.equal(validate(name, { ...VALID[name], extra: 1 }).valid, false);
  });
}

test("search schema rejects non-http urls and bad enums", () => {
  const bad = structuredClone(VALID.search);
  bad.results[0].url = "ftp://example.com/a";
  assert.equal(validate("search", bad).valid, false);
  const badRel = structuredClone(VALID.search);
  badRel.results[0].relevance = "very-high";
  assert.equal(validate("search", badRel).valid, false);
});

test("extraction schema enforces the two-source cap and ID patterns", () => {
  const bad = structuredClone(VALID.extraction);
  bad.sources = [bad.sources[0], bad.sources[0], bad.sources[0]];
  assert.equal(validate("extraction", bad).valid, false);
  const badClaim = structuredClone(VALID.support);
  badClaim.claimId = "X1";
  assert.equal(validate("support", badClaim).valid, false);
});

test("extraction schema allows null resolvedUrl/title when not extracted, but forbids excerpts/claims", () => {
  const inaccessible = structuredClone(VALID.extraction);
  inaccessible.sources[0].extractionStatus = "inaccessible";
  inaccessible.sources[0].resolvedUrl = null;
  inaccessible.sources[0].title = null;
  inaccessible.sources[0].excerpts = [];
  inaccessible.sources[0].claims = [];
  assert.equal(validate("extraction", inaccessible).valid, true);

  const stillNonEmpty = structuredClone(inaccessible);
  stillNonEmpty.sources[0].excerpts = [{ localId: "x1", text: "e", locator: null }];
  assert.equal(validate("extraction", stillNonEmpty).valid, false);

  const stillHasClaims = structuredClone(inaccessible);
  stillHasClaims.sources[0].claims = [
    {
      text: "c",
      scope: "s",
      importance: "central",
      timeSensitivity: "low",
      evidenceExcerptLocalIds: ["x1"],
    },
  ];
  assert.equal(validate("extraction", stillHasClaims).valid, false);
});

test("extraction schema still requires non-null resolvedUrl/title when extracted", () => {
  const bad = structuredClone(VALID.extraction);
  bad.sources[0].resolvedUrl = null;
  assert.equal(validate("extraction", bad).valid, false);
  const badTitle = structuredClone(VALID.extraction);
  badTitle.sources[0].title = null;
  assert.equal(validate("extraction", badTitle).valid, false);
});

test("report schema requires at least one source and claim per finding", () => {
  const bad = structuredClone(VALID.report);
  bad.findings[0].sourceIds = [];
  assert.equal(validate("report", bad).valid, false);
  const badClaims = structuredClone(VALID.report);
  badClaims.findings[0].claimIds = [];
  assert.equal(validate("report", badClaims).valid, false);
});
