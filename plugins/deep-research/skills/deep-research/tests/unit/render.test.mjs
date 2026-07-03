import test from "node:test";
import assert from "node:assert/strict";
import { escapeMarkdown, auditReport, renderReportMarkdown } from "../../scripts/lib/render.mjs";

const SOURCES = [
  {
    id: "S001",
    title: "Stats <b>2024</b>",
    publisher: "Bureau",
    publishedAt: "2024-06-01",
    canonicalUrl: "https://stats.example.gov/solar/2024",
  },
  {
    id: "S002",
    title: "Study",
    publisher: null,
    publishedAt: null,
    canonicalUrl: "https://research.example.edu/solar-study",
  },
];

const VERIFICATION = [
  { claimId: "C001", verificationState: "confirmed", confidence: "high" },
  { claimId: "C002", verificationState: "refuted", confidence: "low" },
  { claimId: "C003", verificationState: "insufficient", confidence: "low" },
];

function report(overrides = {}) {
  return {
    schemaVersion: "1.0",
    title: "T",
    asOf: "2026-07-02",
    scope: "US",
    executiveSummary: "Summary.",
    findings: [
      {
        id: "F01",
        heading: "H",
        claim: "Capacity doubled",
        explanation: "E",
        confidence: "high",
        verificationState: "confirmed",
        sourceIds: ["S001"],
        claimIds: ["C001"],
      },
    ],
    disagreements: [],
    limitations: [],
    openQuestions: [],
    methodology: "M",
    ...overrides,
  };
}

test("auditReport passes a clean report", () => {
  const result = auditReport({ report: report(), sources: SOURCES, verification: VERIFICATION });
  assert.equal(result.ok, true);
});

test("auditReport flags unknown source IDs", () => {
  const bad = report();
  bad.findings[0].sourceIds = ["S999"];
  const result = auditReport({ report: bad, sources: SOURCES, verification: VERIFICATION });
  assert.equal(result.ok, false);
  assert.match(result.problems[0], /unknown source S999/);
});

test("auditReport flags refuted claims in findings", () => {
  const bad = report();
  bad.findings[0].claimIds = ["C002"];
  const result = auditReport({ report: bad, sources: SOURCES, verification: VERIFICATION });
  assert.equal(result.ok, false);
  assert.equal(result.problems.some((p) => /refuted claim C002/.test(p)), true);
});

test("auditReport flags insufficient claims with non-low confidence", () => {
  const bad = report();
  bad.findings[0].claimIds = ["C003"];
  bad.findings[0].verificationState = "insufficient";
  const result = auditReport({ report: bad, sources: SOURCES, verification: VERIFICATION });
  assert.equal(result.ok, false);
  assert.equal(result.problems.some((p) => /confidence high but claim C003/.test(p)), true);
});

test("auditReport flags confirmed findings whose claims are not confirmed", () => {
  const bad = report();
  bad.findings[0].claimIds = ["C003"];
  bad.findings[0].confidence = "low";
  const result = auditReport({ report: bad, sources: SOURCES, verification: VERIFICATION });
  assert.equal(result.ok, false);
  assert.equal(
    result.problems.some((p) => /claims confirmed but claim C003 is insufficient/.test(p)),
    true,
  );
});

test("escapeMarkdown neutralizes HTML", () => {
  assert.equal(escapeMarkdown("<script>alert(1)</script>"), "&lt;script&gt;alert(1)&lt;/script&gt;");
});

test("renderReportMarkdown escapes HTML, cites sources, and separates uncited sources", () => {
  const md = renderReportMarkdown({
    report: report(),
    sources: SOURCES,
    preset: "quick",
    auditIncomplete: false,
  });
  assert.match(md, /&lt;b&gt;2024&lt;\/b&gt;/);
  assert.doesNotMatch(md, /<b>/);
  assert.match(md, /\[S001\]/);
  assert.match(md, /### Consulted but not cited/);
  assert.match(md, /- \[S002\]/);
  assert.match(md, /> Preset: quick/);
  assert.doesNotMatch(md, /citation audit incomplete/);
});

test("renderReportMarkdown shows the audit warning when incomplete", () => {
  const md = renderReportMarkdown({
    report: report(),
    sources: SOURCES,
    preset: "quick",
    auditIncomplete: true,
  });
  assert.match(md, /citation audit incomplete/);
});
