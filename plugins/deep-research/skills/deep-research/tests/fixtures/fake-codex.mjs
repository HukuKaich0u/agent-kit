#!/usr/bin/env node
/**
 * Fake `codex` executable for mock integration tests (design 16.3).
 * Deterministic, no network, no model. Behavior is driven by:
 *   FAKE_CODEX_SCENARIO  path to a scenario JSON file
 *   FAKE_CODEX_STATE     directory for attempt counters
 *
 * It parses the worker prompt from stdin, detects the role from the
 * prompt's "# Role:" header, and writes a canned payload to the
 * --output-last-message path.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";

function fail(message) {
  process.stderr.write(`fake-codex: ${message}\n`);
  process.exit(1);
}

const argv = process.argv.slice(2);
function argValue(flag) {
  const i = argv.indexOf(flag);
  return i === -1 ? null : argv[i + 1];
}

if (argv.includes("--version")) {
  process.stdout.write("fake-codex 0.142.5\n");
  process.exit(0);
}

const resultFile = argValue("--output-last-message");
if (!resultFile) fail("missing --output-last-message");
if (!argv.includes("--ephemeral")) fail("missing --ephemeral");
if (!argv.includes("--search")) fail("missing --search");

const scenarioPath = process.env.FAKE_CODEX_SCENARIO;
if (!scenarioPath) fail("FAKE_CODEX_SCENARIO not set");
const scenario = JSON.parse(readFileSync(scenarioPath, "utf8"));

const prompt = readFileSync(0, "utf8");

function attemptNumber() {
  const stateDir = process.env.FAKE_CODEX_STATE;
  if (!stateDir) return 1;
  mkdirSync(stateDir, { recursive: true });
  const key = createHash("sha256").update(prompt).digest("hex").slice(0, 16);
  const file = path.join(stateDir, key);
  const n = existsSync(file) ? Number(readFileSync(file, "utf8")) + 1 : 1;
  writeFileSync(file, String(n));
  return n;
}

function section(name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`\\n## ${escaped}\\n\\n([\\s\\S]*?)(?=\\n## |$)`);
  const match = prompt.match(re);
  return match ? match[1].trim() : null;
}

function emit(payload) {
  writeFileSync(resultFile, JSON.stringify(payload));
  // Minimal JSONL event stream on stdout, mirroring codex exec --json.
  process.stdout.write(JSON.stringify({ type: "turn.started" }) + "\n");
  process.stdout.write(JSON.stringify({ type: "turn.completed" }) + "\n");
  process.exit(0);
}

function emitInvalid() {
  writeFileSync(resultFile, "this is not json {");
  process.stdout.write(JSON.stringify({ type: "turn.completed" }) + "\n");
  process.exit(0);
}

const isSchemaRetry = prompt.includes("did not validate against the required JSON schema");

const roleMatch = prompt.match(/^# Role: (.+)$/m);
if (!roleMatch) fail("cannot detect role from prompt");
const role = roleMatch[1].trim();

if (role === "Research scope planner") {
  const angles = scenario.scope?.angles ?? [
    { id: "A01", label: "baseline overview", queries: ["solar power growth overview"] },
    { id: "A02", label: "official statistics", queries: ["solar capacity statistics 2024"] },
    { id: "A03", label: "skeptical evidence", queries: ["solar growth overstated criticism"] },
  ];
  emit({
    schemaVersion: "1.0",
    question: "How fast is residential solar adoption growing?",
    summary: "Assess the growth rate of residential solar adoption and its drivers.",
    assumptions: ["Focus on grid-connected residential installations"],
    temporalScope: { asOf: "2026-07-02", dateFrom: "2020-01-01", dateTo: null, rationale: "recent trend window" },
    geographicScope: ["US"],
    searchLanguages: ["en"],
    reportLanguage: "en",
    decisionCriteria: ["growth rate", "policy impact"],
    ambiguities: [],
    excludedAreas: ["utility-scale solar"],
    expectedSourceTypes: ["official_statistics", "secondary_reporting"],
    angles: angles.map((a) => ({
      id: a.id,
      label: a.label,
      rationale: `covers ${a.label}`,
      queries: a.queries,
      preferredSourceTypes: ["official_statistics", "secondary_reporting"],
    })),
  });
}

if (role === "Search worker") {
  const angleId = (prompt.match(/- angleId: (A[0-9]+)/) ?? [])[1];
  if (!angleId) fail("cannot detect angleId");
  if ((scenario.searchFailAngles ?? []).includes(angleId)) {
    fail(`injected search failure for ${angleId}`);
  }
  if (scenario.searchInvalidJsonAngles?.includes(angleId) && !isSchemaRetry) {
    emitInvalid();
  }
  const results = (scenario.searchResults?.[angleId] ?? []).map((r) => ({
    publisher: null,
    publisherGroup: null,
    publishedAt: null,
    sourceType: "secondary_reporting",
    relevance: "medium",
    relevanceRationale: "matches the research question",
    query: "canned query",
    snippet: "canned snippet",
    ...r,
    hostname: r.hostname ?? new URL(r.url).hostname,
  }));
  emit({ schemaVersion: "1.0", angleId, results });
}

if (role === "Source extractor") {
  if (scenario.extractFail) {
    fail("injected extraction failure");
  }
  const assigned = JSON.parse(section("Assigned sources"));
  const sources = assigned.map((request) => {
    const fixture = scenario.extraction?.[request.requestedUrl];
    if (!fixture) {
      return {
        requestedUrl: request.requestedUrl,
        resolvedUrl: request.requestedUrl,
        title: request.title,
        publisher: null,
        publisherGroup: null,
        originUrl: null,
        author: null,
        publishedAt: null,
        retrievedAt: "2026-07-02",
        sourceType: "secondary_reporting",
        quality: "medium",
        qualityRationale: "no fixture; generic medium quality",
        extractionStatus: "inaccessible",
        excerpts: [],
        claims: [],
      };
    }
    return {
      requestedUrl: request.requestedUrl,
      resolvedUrl: fixture.resolvedUrl ?? request.requestedUrl,
      title: fixture.title ?? request.title,
      publisher: fixture.publisher ?? null,
      publisherGroup: fixture.publisherGroup ?? null,
      originUrl: fixture.originUrl ?? null,
      author: null,
      publishedAt: fixture.publishedAt ?? null,
      retrievedAt: "2026-07-02",
      sourceType: fixture.sourceType ?? "secondary_reporting",
      quality: fixture.quality ?? "medium",
      qualityRationale: "fixture quality",
      extractionStatus: "extracted",
      excerpts: fixture.excerpts,
      claims: fixture.claims,
    };
  });
  emit({ schemaVersion: "1.0", sources });
}

function claimBehavior() {
  const claimText = (prompt.match(/- text: (.+)/) ?? [])[1] ?? "";
  for (const [needle, behavior] of Object.entries(scenario.claimBehavior?.byText ?? {})) {
    if (claimText.includes(needle)) return behavior;
  }
  return scenario.claimBehavior?.default ?? { support: "supported", challenge: "no_counterevidence_found" };
}

if (role === "Support checker") {
  const claimId = (prompt.match(/claimId: (C[0-9]+)/) ?? [])[1];
  const evidence = JSON.parse(section("Recorded evidence"));
  const behavior = claimBehavior();
  emit({
    schemaVersion: "1.0",
    claimId,
    verdict: behavior.support,
    rationale: "fixture support judgment",
    checkedEvidence: evidence.map((e) => ({
      sourceId: e.sourceId,
      excerptId: e.excerptId,
      supportsClaim: behavior.support !== "unsupported",
      issue: behavior.support === "unsupported" ? "excerpt does not entail claim" : null,
    })),
    scopeCorrections: behavior.support === "partially_supported" ? ["applies to the US only"] : [],
  });
}

if (role === "Adversarial searcher") {
  const claimId = (prompt.match(/claimId: (C[0-9]+)/) ?? [])[1];
  const behavior = claimBehavior();
  const counterSources =
    behavior.challenge === "contradicted" || behavior.challenge === "materially_qualified"
      ? [
          {
            url: behavior.counterUrl ?? "https://counter-evidence.example.org/analysis",
            title: "Counter analysis",
            publisher: "Counter Institute",
            publishedAt: "2026-05-01",
            sourceType: "expert_analysis",
            quality: "medium",
            relationship: behavior.challenge === "contradicted" ? "contradicts" : "qualifies",
            evidenceExcerpt: "Independent data shows the opposite trend for this period.",
            locator: null,
          },
        ]
      : [];
  emit({
    schemaVersion: "1.0",
    claimId,
    status: behavior.challenge,
    rationale: "fixture challenge judgment",
    counterSources,
    queriesUsed: ["counterevidence query"],
  });
}

if (role === "Adjudicator") {
  const claimId = (prompt.match(/claimId: (C[0-9]+)/) ?? [])[1];
  const catalog = JSON.parse(section("Evidence catalog (sources and excerpts you may cite)"));
  emit({
    schemaVersion: "1.0",
    claimId,
    verificationState: scenario.adjudicationState ?? "qualified",
    confidence: "medium",
    rationale: "fixture adjudication: claim holds with conditions",
    acceptedEvidence: catalog.map((e) => ({
      sourceId: e.sourceId,
      excerptId: e.excerptId,
      role: e.role === "counter" ? "counter" : "support",
    })),
    rejectedEvidence: [],
    qualifications: ["holds only for the 2020-2024 window"],
  });
}

if (role === "Report synthesizer") {
  const claims = JSON.parse(section("Verified claim registry"));
  const sources = JSON.parse(section("Source catalog"));
  const isAuditRetry = prompt.includes("Previous attempt failed citation audit");
  const usable = claims.filter(
    (c) => c.verificationState !== "refuted" && c.verificationState !== "not_checked",
  );
  const findings = usable.slice(0, 5).map((claim, i) => ({
    id: `F${String(i + 1).padStart(2, "0")}`,
    heading: `Finding about ${claim.id}`,
    claim: claim.text,
    explanation: `Verified as ${claim.verificationState}. ${claim.qualifications.join("; ") || "No qualifications."}`,
    confidence:
      claim.verificationState === "confirmed" || claim.verificationState === "qualified"
        ? claim.confidence
        : "low",
    verificationState: claim.verificationState,
    sourceIds:
      scenario.auditFailFirstSynthesis && !isAuditRetry && i === 0
        ? ["S999"]
        : claim.supportingSourceIds,
    claimIds: [claim.id],
  }));
  emit({
    schemaVersion: "1.0",
    title: "Residential solar adoption growth",
    asOf: "2026-07-02",
    scope: "US residential solar, 2020 onward",
    executiveSummary: "Residential solar adoption grew rapidly, with qualifications noted below.",
    findings,
    disagreements: [],
    limitations: ["Based on fixture data"],
    openQuestions: ["What happens after 2026?"],
    methodology: "Multi-angle search with claim-level verification (mock).",
  });
}

fail(`no handler for role: ${role}`);
