/**
 * Research pipeline orchestration (design section 10).
 * Deterministic work (IDs, dedup, decision table, confidence caps,
 * budget, audit) happens here; LLM workers only handle scope
 * decomposition, search, extraction, verification, and synthesis.
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { readJsonl } from "./artifacts.mjs";
import { prioritizeClaims } from "./budget.mjs";
import { runWorker, runPool } from "./codex-worker.mjs";
import { canonicalizeCandidates, selectSources } from "./ranking.mjs";
import { auditReport, renderReportMarkdown } from "./render.mjs";
import { schemaPath, validate } from "./schema.mjs";
import { canonicalizeUrl, independenceKey } from "./url.mjs";

export function renderPrompt(template, vars) {
  return template.replace(/\{\{([A-Z_]+)\}\}/g, (match, name) => {
    if (!(name in vars)) {
      throw new Error(`prompt template references unknown variable: ${name}`);
    }
    return String(vars[name]);
  });
}

function pad(n, width) {
  return String(n).padStart(width, "0");
}

export const sourceIdOf = (n) => `S${pad(n, 3)}`;
export const excerptIdOf = (n) => `E${pad(n, 3)}`;
export const claimIdOf = (n) => `C${pad(n, 3)}`;

/**
 * Deterministic verification decision table (design section 10.8).
 * support / challenge are the worker payloads or null when the check
 * did not run (budget skip or worker failure treated per section 4.4).
 *
 * @returns {{state: string | null, needsAdjudication: boolean}}
 */
export function decideVerificationState(support, challenge) {
  if (support == null || challenge == null) {
    return { state: "not_checked", needsAdjudication: false };
  }
  const verdict = support.verdict;
  const status = challenge.status;
  if (verdict === "unsupported") return { state: "refuted", needsAdjudication: false };
  if (verdict === "inaccessible") return { state: "insufficient", needsAdjudication: false };
  if (status === "search_failed") return { state: "insufficient", needsAdjudication: false };
  if (verdict === "supported" && status === "no_counterevidence_found") {
    return { state: "confirmed", needsAdjudication: false };
  }
  if (verdict === "partially_supported" && status === "no_counterevidence_found") {
    return { state: "qualified", needsAdjudication: false };
  }
  if (
    (verdict === "supported" || verdict === "partially_supported") &&
    status === "materially_qualified"
  ) {
    return { state: "qualified", needsAdjudication: false };
  }
  if (
    (verdict === "supported" || verdict === "partially_supported") &&
    status === "contradicted"
  ) {
    return { state: null, needsAdjudication: true };
  }
  return { state: "insufficient", needsAdjudication: false };
}

/**
 * Orchestrator-owned confidence cap (design section 10.8). The model's
 * own confidence is advisory; this is the ceiling.
 */
export function capConfidence({ verificationState, acceptedEvidence, sourcesById }) {
  if (verificationState !== "confirmed" && verificationState !== "qualified") {
    return "low";
  }
  const supportEvidence = acceptedEvidence.filter((e) => e.role === "support");
  if (supportEvidence.length === 0) return "low";

  const keys = new Set();
  let establishedKeys = new Set();
  let hasHighQuality = false;
  let dependsOnLowQuality = false;
  let hasEstablished = false;
  let hasProvisional = false;
  for (const evidence of supportEvidence) {
    const source = sourcesById.get(evidence.sourceId);
    if (!source) continue;
    keys.add(source.independenceKey);
    if (source.independenceConfidence === "established") {
      hasEstablished = true;
      establishedKeys.add(source.independenceKey);
    } else {
      hasProvisional = true;
    }
    if (source.quality === "high") hasHighQuality = true;
    if (source.quality === "low") dependsOnLowQuality = true;
  }
  if (hasProvisional && !hasEstablished) return "low";
  if (establishedKeys.size >= 2 && hasHighQuality && !dependsOnLowQuality) return "high";
  return "medium";
}

export function claimIndependence(supportingSourceIds, sourcesById) {
  const keys = new Set();
  let hasEstablished = false;
  let hasProvisional = false;
  for (const sid of supportingSourceIds) {
    const source = sourcesById.get(sid);
    if (!source) continue;
    keys.add(source.independenceKey);
    if (source.independenceConfidence === "established") hasEstablished = true;
    else hasProvisional = true;
  }
  const confidence =
    hasEstablished && hasProvisional
      ? "mixed"
      : hasEstablished
        ? "established"
        : "provisional";
  return { keys: [...keys].sort(), count: keys.size, confidence };
}

const IMPORTANCE_RANK = { central: 0, supporting: 1, contextual: 2 };
const SENSITIVITY_RANK = { high: 0, medium: 1, low: 2 };

function normalizeClaimText(text) {
  return text.normalize("NFKC").toLowerCase().trim().replace(/\s+/g, " ");
}

/**
 * Build the source catalog and claim registry from extraction payloads
 * (design sections 10.4-10.5). Global IDs are assigned here; exact and
 * normalized-text duplicate claims are merged deterministically.
 */
export function buildRegistry({ extractionPayloads, selectedByRequestedUrl, claimsExtractedCap }) {
  const sources = [];
  const claimsByKey = new Map();
  let sourceSeq = 0;
  let excerptSeq = 0;

  for (const payload of extractionPayloads) {
    for (const raw of payload.sources) {
      const selected = selectedByRequestedUrl.get(raw.requestedUrl) ?? null;
      const canon = canonicalizeUrl(raw.resolvedUrl);
      const canonicalUrl = canon.ok ? canon.canonical : (selected?.canonicalUrl ?? raw.requestedUrl);
      const hostname = canon.ok ? canon.hostname : (selected?.canonicalHostname ?? "unknown");
      const indep = independenceKey({
        originUrl: raw.originUrl,
        publisherGroup: raw.publisherGroup ?? selected?.publisherGroup ?? null,
        canonicalHostname: hostname,
      });
      sourceSeq += 1;
      const source = {
        id: sourceIdOf(sourceSeq),
        canonicalUrl,
        hostname,
        title: raw.title,
        publisher: raw.publisher,
        publisherGroup: raw.publisherGroup,
        originUrl: raw.originUrl,
        independenceKey: indep.key,
        independenceConfidence: indep.confidence,
        author: raw.author,
        publishedAt: raw.publishedAt,
        retrievedAt: raw.retrievedAt,
        sourceType: raw.sourceType,
        quality: raw.quality,
        qualityRationale: raw.qualityRationale,
        extractionStatus: raw.extractionStatus,
        role: "research",
        excerpts: [],
      };
      const excerptIdByLocal = new Map();
      for (const excerpt of raw.excerpts) {
        excerptSeq += 1;
        const id = excerptIdOf(excerptSeq);
        excerptIdByLocal.set(excerpt.localId, id);
        source.excerpts.push({ id, text: excerpt.text, locator: excerpt.locator });
      }
      sources.push(source);

      if (raw.extractionStatus !== "extracted") continue;
      for (const claim of raw.claims) {
        const evidence = claim.evidenceExcerptLocalIds
          .map((localId) => excerptIdByLocal.get(localId))
          .filter(Boolean)
          .map((excerptId) => ({ sourceId: source.id, excerptId }));
        if (evidence.length === 0) continue;
        const key = normalizeClaimText(claim.text);
        const existing = claimsByKey.get(key);
        if (existing) {
          existing.supportingEvidence.push(...evidence);
          if (IMPORTANCE_RANK[claim.importance] < IMPORTANCE_RANK[existing.importance]) {
            existing.importance = claim.importance;
          }
          if (SENSITIVITY_RANK[claim.timeSensitivity] < SENSITIVITY_RANK[existing.timeSensitivity]) {
            existing.timeSensitivity = claim.timeSensitivity;
          }
        } else {
          claimsByKey.set(key, {
            text: claim.text,
            scope: claim.scope,
            importance: claim.importance,
            timeSensitivity: claim.timeSensitivity,
            supportingEvidence: evidence,
          });
        }
      }
    }
  }

  const sourcesById = new Map(sources.map((s) => [s.id, s]));
  let claims = [...claimsByKey.values()].map((claim, index) => {
    const supportingSourceIds = [...new Set(claim.supportingEvidence.map((e) => e.sourceId))];
    const indep = claimIndependence(supportingSourceIds, sourcesById);
    return {
      id: claimIdOf(index + 1),
      text: claim.text,
      scope: claim.scope,
      importance: claim.importance,
      timeSensitivity: claim.timeSensitivity,
      supportingEvidence: claim.supportingEvidence,
      independenceKeys: indep.keys,
      independentSourceCount: indep.count,
      independenceConfidence: indep.confidence,
      verificationState: "pending",
    };
  });

  const prioritized = prioritizeClaims(claims);
  const kept = new Set(prioritized.slice(0, claimsExtractedCap).map((c) => c.id));
  const dropped = claims.length - kept.size;
  claims = claims.filter((c) => kept.has(c.id));

  return { sources, claims, droppedClaims: dropped };
}

/**
 * Normalize challenge counter sources into catalog entries with global
 * IDs (design section 10.7).
 */
export function catalogCounterSources(challengePayload, nextSourceSeq, nextExcerptSeq) {
  const sources = [];
  const accepted = [];
  let sourceSeq = nextSourceSeq;
  let excerptSeq = nextExcerptSeq;
  for (const counter of challengePayload.counterSources) {
    const canon = canonicalizeUrl(counter.url);
    if (!canon.ok) continue;
    sourceSeq += 1;
    excerptSeq += 1;
    const sourceId = sourceIdOf(sourceSeq);
    const excerptId = excerptIdOf(excerptSeq);
    const indep = independenceKey({
      originUrl: null,
      publisherGroup: counter.publisher,
      canonicalHostname: canon.hostname,
    });
    sources.push({
      id: sourceId,
      canonicalUrl: canon.canonical,
      hostname: canon.hostname,
      title: counter.title,
      publisher: counter.publisher,
      publisherGroup: null,
      originUrl: null,
      independenceKey: indep.key,
      independenceConfidence: indep.confidence,
      author: null,
      publishedAt: counter.publishedAt,
      retrievedAt: null,
      sourceType: counter.sourceType,
      quality: counter.quality,
      qualityRationale: `counter source (${counter.relationship}) for ${challengePayload.claimId}`,
      extractionStatus: "extracted",
      role: "counter",
      excerpts: [{ id: excerptId, text: counter.evidenceExcerpt, locator: counter.locator }],
    });
    accepted.push({ sourceId, excerptId, relationship: counter.relationship });
  }
  return { sources, accepted, nextSourceSeq: sourceSeq, nextExcerptSeq: excerptSeq };
}

export class PipelineError extends Error {
  constructor(errorClass, message) {
    super(message);
    this.errorClass = errorClass;
  }
}

export async function runPipeline(ctx) {
  const {
    store,
    question,
    budget,
    promptsDir,
    asOf,
    reportLanguage,
    model = null,
    codexBin = "codex",
    log = () => {},
    resume = false,
    keepGoing = true,
  } = ctx;

  // Recoverable failures continue with a warning unless --keep-going=false.
  function recoverable(errorClass, message) {
    if (!keepGoing) throw new PipelineError(errorClass, message);
    store.addWarning(message);
  }

  const startedAtMs = Date.now();
  const deadlineExceeded = () => Date.now() - startedAtMs > budget.runDeadlineMs;
  const promptTemplate = (name) => readFileSync(path.join(promptsDir, `${name}.md`), "utf8");

  const workerDefaults = {
    timeoutMs: budget.perWorkerTimeoutMs,
    maxRetries: budget.retryPerWorker,
    model,
    codexBin,
    onEvent: (rec) => store.event(rec),
  };

  async function runTrackedWorker(opts) {
    const result = await runWorker({ ...workerDefaults, ...opts });
    store.saveWorkerArtifacts(opts.workerId, {
      prompt: result.prompt,
      stdout: result.stdout,
      stderr: result.stderr,
      execution: result.execution,
      payload: result.payload ?? undefined,
    });
    store.bumpWorkerCounts({
      total: 1,
      succeeded: result.execution.status === "succeeded" ? 1 : 0,
      failed: result.execution.status === "failed" ? 1 : 0,
      retried: result.execution.attempt > 1 ? 1 : 0,
    });
    return result;
  }

  function loadValidPhaseJson(name, schemaName) {
    if (!resume) return null;
    const data = store.readJsonIfExists(name);
    if (data == null) return null;
    if (schemaName) {
      const check = validate(schemaName, data);
      if (!check.valid) {
        store.addWarning(`resume: ${name} failed schema validation; re-running phase`);
        return null;
      }
    }
    return data;
  }

  // ---- Phase 0: Scope -------------------------------------------------
  let scope = loadValidPhaseJson("scope.json", "scope");
  if (scope) {
    log("scope: reused from previous run");
    store.setPhase("scope", "completed");
  } else {
    store.setPhase("scope", "running");
    const prompt = renderPrompt(promptTemplate("scope"), {
      QUESTION: question,
      AS_OF: asOf,
      REPORT_LANGUAGE: reportLanguage,
      MIN_ANGLES: Math.min(3, budget.searchAngles),
      MAX_ANGLES: budget.searchAngles,
    });
    const result = await runTrackedWorker({
      workerId: "scope-01",
      role: "scope",
      prompt,
      schemaName: "scope",
      schemaFile: schemaPath("scope"),
    });
    if (!result.payload) {
      store.setPhase("scope", "failed");
      throw new PipelineError(
        result.execution.error?.class ?? "worker_process_error",
        `scope worker failed: ${result.execution.error?.message}`,
      );
    }
    scope = result.payload;
    if (scope.angles.length > budget.searchAngles) {
      scope.angles = scope.angles.slice(0, budget.searchAngles);
      store.addWarning(`scope produced extra angles; truncated to ${budget.searchAngles}`);
    }
    store.writeJson("scope.json", scope);
    store.setPhase("scope", "completed");
  }
  log(`scope: ${scope.angles.length} angles`);

  // ---- Phase 1: Search fan-out ----------------------------------------
  store.setPhase("search", "running");
  const existingSearches = resume ? readJsonl(store.filePath("searches.jsonl")) : [];
  const doneAngles = new Set(
    existingSearches.filter((r) => validate("search", r.payload ?? {}).valid).map((r) => r.payload.angleId),
  );
  const pendingAngles = scope.angles.filter((a) => !doneAngles.has(a.id));
  if (doneAngles.size > 0) log(`search: reusing ${doneAngles.size} angle results`);

  const searchTasks = pendingAngles.map((angle, i) => async () => {
    const prompt = renderPrompt(promptTemplate("search"), {
      QUESTION: question,
      SCOPE_SUMMARY: scope.summary,
      TEMPORAL_SCOPE: JSON.stringify(scope.temporalScope),
      GEOGRAPHIC_SCOPE: JSON.stringify(scope.geographicScope),
      ANGLE_ID: angle.id,
      ANGLE_LABEL: angle.label,
      ANGLE_RATIONALE: angle.rationale,
      ANGLE_QUERIES: JSON.stringify(angle.queries),
      ANGLE_SOURCE_TYPES: JSON.stringify(angle.preferredSourceTypes),
      MAX_RESULTS: budget.candidatesPerAngle,
    });
    const result = await runTrackedWorker({
      workerId: `search-${pad(i + 1 + doneAngles.size, 2)}`,
      role: "search",
      prompt,
      schemaName: "search",
      schemaFile: schemaPath("search"),
    });
    if (result.payload) {
      store.event({ type: "search_angle", angleId: angle.id, results: result.payload.results.length });
      return { angleId: angle.id, payload: result.payload };
    }
    recoverable("worker_process_error", `search worker for angle ${angle.id} failed`);
    return null;
  });
  const searchResults = (await runPool(searchTasks, budget.maxConcurrency)).filter(Boolean);
  for (const record of searchResults) {
    store.event({ type: "search_saved", angleId: record.angleId });
  }
  const allSearchRecords = [
    ...existingSearches.filter((r) => doneAngles.has(r.payload?.angleId)),
    ...searchResults,
  ];
  // Rewrite searches.jsonl deterministically (append-only within a run;
  // rewritten as a whole on resume merge).
  store.writeText(
    "searches.jsonl",
    allSearchRecords.map((r) => JSON.stringify(r)).join("\n") + "\n",
  );
  if (allSearchRecords.length === 0) {
    store.setPhase("search", "failed");
    throw new PipelineError("search_error", "all search workers failed");
  }
  store.setPhase(
    "search",
    allSearchRecords.length < scope.angles.length ? "completed_with_warnings" : "completed",
  );
  log(`search: ${allSearchRecords.length}/${scope.angles.length} angles returned results`);

  // ---- Deterministic source selection ----------------------------------
  store.setPhase("selection", "running");
  const rawCandidates = allSearchRecords.flatMap((record) =>
    record.payload.results
      .slice(0, budget.candidatesPerAngle)
      .map((r) => ({ ...r, angleId: record.payload.angleId })),
  );
  const { candidates, quarantined } = canonicalizeCandidates(rawCandidates);
  const selection = selectSources(candidates, scope, budget.selectedSources);
  store.writeJson("candidates.json", {
    total: rawCandidates.length,
    deduped: candidates.length,
    quarantined,
    selected: selection.selected,
    dropped: selection.dropped.map((d) => ({
      canonicalUrl: d.candidate.canonicalUrl,
      reason: d.reason,
    })),
    hostCapExceptions: selection.exceptions,
  });
  for (const drop of selection.dropped) {
    store.event({ type: "source_dropped", url: drop.candidate.canonicalUrl, reason: drop.reason });
  }
  store.setPhase("selection", "completed");
  log(`selection: ${selection.selected.length} sources from ${candidates.length} candidates`);

  // ---- Phase 2: Extraction ---------------------------------------------
  let registryData = resume ? store.readJsonIfExists("sources.json") : null;
  let claimsData = resume ? store.readJsonIfExists("claims.json") : null;
  let sources;
  let claims;
  if (registryData && claimsData) {
    log("extraction: reused from previous run");
    sources = registryData.sources;
    claims = claimsData.claims;
    store.setPhase("extraction", "completed");
  } else {
    store.setPhase("extraction", "running");
    // Pair small sources; long-form types go alone (design 10.4).
    const soloTypes = new Set(["primary_research", "official_statistics", "systematic_review"]);
    const batches = [];
    let pending = null;
    for (const candidate of selection.selected) {
      if (soloTypes.has(candidate.sourceType)) {
        batches.push([candidate]);
        continue;
      }
      if (pending) {
        batches.push([pending, candidate]);
        pending = null;
      } else {
        pending = candidate;
      }
    }
    if (pending) batches.push([pending]);

    const extractTasks = batches.map((batch, i) => async () => {
      if (deadlineExceeded()) {
        store.event({ type: "budget", detail: "run deadline reached; skipping extraction batch" });
        return null;
      }
      const prompt = renderPrompt(promptTemplate("extract"), {
        QUESTION: question,
        SCOPE_SUMMARY: scope.summary,
        AS_OF: asOf,
        SOURCES_JSON: JSON.stringify(
          batch.map((c) => ({
            requestedUrl: c.url,
            title: c.title,
            snippet: c.snippet,
            sourceTypeHint: c.sourceType,
          })),
          null,
          2,
        ),
      });
      const result = await runTrackedWorker({
        workerId: `extract-${pad(i + 1, 2)}`,
        role: "extract",
        prompt,
        schemaName: "extraction",
        schemaFile: schemaPath("extraction"),
      });
      if (!result.payload) {
        recoverable("worker_process_error", `extraction batch ${i + 1} failed`);
        return null;
      }
      return result.payload;
    });
    const extractionPayloads = (await runPool(extractTasks, budget.maxConcurrency)).filter(Boolean);
    if (extractionPayloads.length === 0) {
      store.setPhase("extraction", "failed");
      throw new PipelineError("source_access_error", "all extraction workers failed");
    }

    const selectedByRequestedUrl = new Map(selection.selected.map((c) => [c.url, c]));
    const registry = buildRegistry({
      extractionPayloads,
      selectedByRequestedUrl,
      claimsExtractedCap: budget.claimsExtractedCap,
    });
    sources = registry.sources;
    claims = registry.claims;
    if (registry.droppedClaims > 0) {
      store.event({
        type: "claims_capped",
        dropped: registry.droppedClaims,
        cap: budget.claimsExtractedCap,
      });
    }
    store.writeJson("sources.json", { sources });
    store.writeJson("claims.json", { claims });
    store.setPhase(
      "extraction",
      extractionPayloads.length < batches.length ? "completed_with_warnings" : "completed",
    );
  }
  log(`extraction: ${sources.length} sources, ${claims.length} claims`);

  // ---- Phases 3-5: Verification ----------------------------------------
  let verificationData = resume ? store.readJsonIfExists("verification.json") : null;
  let verification;
  if (verificationData) {
    log("verification: reused from previous run");
    verification = verificationData.verification;
    sources = store.readJsonIfExists("sources.json").sources;
    store.setPhase("verification", "completed");
  } else {
    store.setPhase("verification", "running");
    const sourcesById = new Map(sources.map((s) => [s.id, s]));
    const excerptText = new Map();
    for (const source of sources) {
      for (const excerpt of source.excerpts) {
        excerptText.set(excerpt.id, excerpt);
      }
    }
    const prioritized = prioritizeClaims(claims);
    const toVerify = prioritized.slice(0, budget.claimsVerifiedCap);
    const skipped = prioritized.slice(budget.claimsVerifiedCap);
    for (const claim of skipped) {
      store.event({ type: "claim_skipped", claimId: claim.id, reason: "claims_verified_cap" });
    }

    const checkResults = new Map();
    const verifyTasks = toVerify.map((claim) => async () => {
      if (deadlineExceeded()) {
        store.event({ type: "budget", detail: `run deadline reached; skipping checks for ${claim.id}` });
        return null;
      }
      const evidence = claim.supportingEvidence.map((e) => {
        const source = sourcesById.get(e.sourceId);
        const excerpt = excerptText.get(e.excerptId);
        return {
          sourceId: e.sourceId,
          excerptId: e.excerptId,
          excerpt: excerpt?.text ?? null,
          locator: excerpt?.locator ?? null,
          url: source?.canonicalUrl ?? null,
          title: source?.title ?? null,
          publisher: source?.publisher ?? null,
          publishedAt: source?.publishedAt ?? null,
          sourceType: source?.sourceType ?? null,
          quality: source?.quality ?? null,
        };
      });
      const supportPrompt = renderPrompt(promptTemplate("support-check"), {
        CLAIM_ID: claim.id,
        CLAIM_TEXT: claim.text,
        CLAIM_SCOPE: claim.scope,
        EVIDENCE_JSON: JSON.stringify(evidence, null, 2),
      });
      const supportingHosts = [
        ...new Set(claim.supportingEvidence.map((e) => sourcesById.get(e.sourceId)?.hostname).filter(Boolean)),
      ];
      const challengePrompt = renderPrompt(promptTemplate("adversarial-search"), {
        QUESTION: question,
        AS_OF: asOf,
        CLAIM_ID: claim.id,
        CLAIM_TEXT: claim.text,
        CLAIM_SCOPE: claim.scope,
        SUPPORTING_HOSTS: JSON.stringify(supportingHosts),
      });
      const [supportResult, challengeResult] = await Promise.all([
        runTrackedWorker({
          workerId: `support-${claim.id}`,
          role: "support",
          prompt: supportPrompt,
          schemaName: "support",
          schemaFile: schemaPath("support"),
        }),
        runTrackedWorker({
          workerId: `challenge-${claim.id}`,
          role: "challenge",
          prompt: challengePrompt,
          schemaName: "challenge",
          schemaFile: schemaPath("challenge"),
        }),
      ]);
      checkResults.set(claim.id, {
        support: supportResult.payload,
        challenge: challengeResult.payload,
      });
      return claim.id;
    });
    await runPool(verifyTasks, Math.max(1, Math.floor(budget.maxConcurrency / 2)));

    // Catalog counter sources before adjudication (design 10.7).
    let nextSourceSeq = sources.length;
    let nextExcerptSeq = [...excerptText.keys()].length;
    const counterEvidenceByClaim = new Map();
    for (const [claimId, checks] of checkResults) {
      if (!checks.challenge || checks.challenge.counterSources.length === 0) continue;
      const cataloged = catalogCounterSources(checks.challenge, nextSourceSeq, nextExcerptSeq);
      nextSourceSeq = cataloged.nextSourceSeq;
      nextExcerptSeq = cataloged.nextExcerptSeq;
      sources.push(...cataloged.sources);
      for (const source of cataloged.sources) {
        sourcesById.set(source.id, source);
        for (const excerpt of source.excerpts) excerptText.set(excerpt.id, excerpt);
      }
      counterEvidenceByClaim.set(claimId, cataloged.accepted);
    }

    // Decision table + bounded adjudication.
    verification = [];
    const needingAdjudication = [];
    for (const claim of claims) {
      const checks = checkResults.get(claim.id) ?? { support: null, challenge: null };
      const decided = decideVerificationState(checks.support, checks.challenge);
      if (decided.needsAdjudication) {
        needingAdjudication.push({ claim, checks });
        continue;
      }
      const acceptedEvidence = [];
      if (checks.support) {
        for (const evidence of checks.support.checkedEvidence) {
          if (evidence.supportsClaim) {
            acceptedEvidence.push({
              sourceId: evidence.sourceId,
              excerptId: evidence.excerptId,
              role: "support",
            });
          }
        }
      }
      for (const counter of counterEvidenceByClaim.get(claim.id) ?? []) {
        acceptedEvidence.push({
          sourceId: counter.sourceId,
          excerptId: counter.excerptId,
          role: counter.relationship === "qualifies" || counter.relationship === "updates" ? "qualification" : "counter",
        });
      }
      const confidence = capConfidence({
        verificationState: decided.state,
        acceptedEvidence,
        sourcesById,
      });
      verification.push({
        schemaVersion: "1.0",
        claimId: claim.id,
        verificationState: decided.state,
        confidence,
        rationale: checks.support
          ? `decision table: support=${checks.support.verdict}, challenge=${checks.challenge?.status ?? "missing"}`
          : "not verified within budget",
        acceptedEvidence,
        rejectedEvidence: [],
        qualifications: checks.support?.scopeCorrections ?? [],
        adjudicated: false,
      });
    }

    const adjudicable = needingAdjudication.slice(0, budget.adjudicationCap);
    const overflow = needingAdjudication.slice(budget.adjudicationCap);
    for (const { claim, checks } of overflow) {
      store.event({ type: "claim_skipped", claimId: claim.id, reason: "adjudication_cap" });
      verification.push({
        schemaVersion: "1.0",
        claimId: claim.id,
        verificationState: "contested",
        confidence: "low",
        rationale: "support and challenge conflict; adjudication budget exhausted",
        acceptedEvidence: [],
        rejectedEvidence: [],
        qualifications: checks.support?.scopeCorrections ?? [],
        adjudicated: false,
      });
    }

    const adjudicateTasks = adjudicable.map(({ claim, checks }) => async () => {
      const evidenceCatalog = [];
      for (const evidence of claim.supportingEvidence) {
        const source = sourcesById.get(evidence.sourceId);
        const excerpt = excerptText.get(evidence.excerptId);
        evidenceCatalog.push({
          sourceId: evidence.sourceId,
          excerptId: evidence.excerptId,
          role: "support",
          excerpt: excerpt?.text ?? null,
          url: source?.canonicalUrl,
          title: source?.title,
          publishedAt: source?.publishedAt,
          sourceType: source?.sourceType,
          quality: source?.quality,
        });
      }
      for (const counter of counterEvidenceByClaim.get(claim.id) ?? []) {
        const source = sourcesById.get(counter.sourceId);
        const excerpt = excerptText.get(counter.excerptId);
        evidenceCatalog.push({
          sourceId: counter.sourceId,
          excerptId: counter.excerptId,
          role: "counter",
          excerpt: excerpt?.text ?? null,
          url: source?.canonicalUrl,
          title: source?.title,
          publishedAt: source?.publishedAt,
          sourceType: source?.sourceType,
          quality: source?.quality,
        });
      }
      const prompt = renderPrompt(promptTemplate("adjudicate"), {
        CLAIM_ID: claim.id,
        CLAIM_TEXT: claim.text,
        CLAIM_SCOPE: claim.scope,
        AS_OF: asOf,
        SUPPORT_JSON: JSON.stringify(checks.support, null, 2),
        CHALLENGE_JSON: JSON.stringify(checks.challenge, null, 2),
        EVIDENCE_CATALOG_JSON: JSON.stringify(evidenceCatalog, null, 2),
      });
      const result = await runTrackedWorker({
        workerId: `adjudicate-${claim.id}`,
        role: "adjudicate",
        prompt,
        schemaName: "adjudication",
        schemaFile: schemaPath("adjudication"),
      });
      if (!result.payload) {
        store.addWarning(`adjudication for ${claim.id} failed; marking contested`);
        return {
          schemaVersion: "1.0",
          claimId: claim.id,
          verificationState: "contested",
          confidence: "low",
          rationale: "adjudication worker failed; conflict unresolved",
          acceptedEvidence: [],
          rejectedEvidence: [],
          qualifications: [],
          adjudicated: false,
        };
      }
      const capped = capConfidence({
        verificationState: result.payload.verificationState,
        acceptedEvidence: result.payload.acceptedEvidence,
        sourcesById,
      });
      const order = { low: 0, medium: 1, high: 2 };
      const confidence =
        order[result.payload.confidence] < order[capped] ? result.payload.confidence : capped;
      return { ...result.payload, confidence, adjudicated: true };
    });
    const adjudicated = (await runPool(adjudicateTasks, budget.maxConcurrency)).filter(Boolean);
    verification.push(...adjudicated);

    verification.sort((a, b) => (a.claimId < b.claimId ? -1 : 1));
    for (const record of verification) {
      const claim = claims.find((c) => c.id === record.claimId);
      if (claim) claim.verificationState = record.verificationState;
    }
    store.writeJson("sources.json", { sources });
    store.writeJson("claims.json", { claims });
    store.writeJson("verification.json", { verification });
    store.setPhase("verification", "completed");
  }
  const stateCounts = {};
  for (const record of verification) {
    stateCounts[record.verificationState] = (stateCounts[record.verificationState] ?? 0) + 1;
  }
  log(`verification: ${JSON.stringify(stateCounts)}`);

  // ---- Phase 6: Synthesis + citation audit ------------------------------
  store.setPhase("synthesis", "running");
  const verificationByClaim = new Map(verification.map((v) => [v.claimId, v]));
  const claimsForReport = claims.map((claim) => {
    const v = verificationByClaim.get(claim.id);
    return {
      id: claim.id,
      text: claim.text,
      scope: claim.scope,
      importance: claim.importance,
      verificationState: v?.verificationState ?? "not_checked",
      confidence: v?.confidence ?? "low",
      qualifications: v?.qualifications ?? [],
      supportingSourceIds: [...new Set(claim.supportingEvidence.map((e) => e.sourceId))],
      counterSourceIds: [
        ...new Set((v?.acceptedEvidence ?? []).filter((e) => e.role !== "support").map((e) => e.sourceId)),
      ],
    };
  });
  const sourcesForReport = sources.map((s) => ({
    id: s.id,
    title: s.title,
    publisher: s.publisher,
    publishedAt: s.publishedAt,
    sourceType: s.sourceType,
    quality: s.quality,
    canonicalUrl: s.canonicalUrl,
    role: s.role,
  }));

  async function synthesize(auditFeedback) {
    const prompt = renderPrompt(promptTemplate("synthesize"), {
      QUESTION: question,
      SCOPE_JSON: JSON.stringify(scope, null, 2),
      AS_OF: asOf,
      REPORT_LANGUAGE: reportLanguage,
      CLAIMS_JSON: JSON.stringify(claimsForReport, null, 2),
      SOURCES_JSON: JSON.stringify(sourcesForReport, null, 2),
      AUDIT_FEEDBACK: auditFeedback
        ? `## Previous attempt failed citation audit\n\nFix these problems:\n${auditFeedback.map((p) => `- ${p}`).join("\n")}`
        : "",
    });
    return runTrackedWorker({
      workerId: auditFeedback ? "synthesize-02" : "synthesize-01",
      role: "synthesize",
      prompt,
      schemaName: "report",
      schemaFile: schemaPath("report"),
    });
  }

  let synthesisResult = await synthesize(null);
  if (!synthesisResult.payload) {
    store.setPhase("synthesis", "failed");
    throw new PipelineError(
      synthesisResult.execution.error?.class ?? "worker_process_error",
      `synthesis worker failed: ${synthesisResult.execution.error?.message}`,
    );
  }
  store.setPhase("synthesis", "completed");

  store.setPhase("audit", "running");
  let report = synthesisResult.payload;
  let audit = auditReport({ report, sources, verification });
  let auditIncomplete = false;
  if (!audit.ok) {
    store.event({ type: "audit_failed", problems: audit.problems });
    const retry = await synthesize(audit.problems);
    if (retry.payload) {
      report = retry.payload;
      audit = auditReport({ report, sources, verification });
    }
    if (!audit.ok) {
      auditIncomplete = true;
      for (const problem of audit.problems) {
        store.addWarning(`citation audit: ${problem}`);
      }
    }
  }
  store.writeJson("report.json", report);
  const markdown = renderReportMarkdown({
    report,
    sources,
    preset: budget.preset,
    auditIncomplete,
  });
  store.writeText("report.md", markdown);
  store.setPhase("audit", auditIncomplete ? "completed_with_warnings" : "completed");

  // ---- Completion policy (design 13.3) ----------------------------------
  const centralClaims = claims.filter((c) => c.importance === "central");
  const centralUnverified = centralClaims.filter((c) => {
    const v = verificationByClaim.get(c.id);
    return !v || v.verificationState === "not_checked";
  });
  const warnings = [];
  if (centralClaims.length > 0 && centralUnverified.length * 2 > centralClaims.length) {
    warnings.push("majority of central claims were not verified");
  }
  const researchSources = sources.filter((s) => s.role === "research" && s.extractionStatus === "extracted");
  if (researchSources.length < Math.min(3, budget.selectedSources)) {
    warnings.push("fewer usable sources than expected");
  }
  if (auditIncomplete) warnings.push("citation audit incomplete");
  for (const warning of warnings) store.addWarning(warning);

  const manifest = store.readManifest();
  const anyPhaseWarn = Object.values(manifest.phases).some(
    (s) => s === "completed_with_warnings",
  );
  const runStatus = warnings.length > 0 || anyPhaseWarn ? "completed_with_warnings" : "completed";
  store.updateManifest({ runStatus });

  return {
    runStatus,
    reportPath: store.filePath("report.md"),
    counts: {
      angles: scope.angles.length,
      candidates: candidates.length,
      sources: sources.length,
      claims: claims.length,
      states: stateCounts,
    },
  };
}
