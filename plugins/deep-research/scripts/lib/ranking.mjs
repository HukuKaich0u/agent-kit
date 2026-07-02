/**
 * Deterministic source selection (design section 10.3).
 * Static scoring followed by greedy selection that recomputes
 * angle-coverage and independence gains as sources are picked.
 */

import { canonicalizeUrl, independenceKey } from "./url.mjs";

const RELEVANCE_SCORE = { high: 30, medium: 15, low: 0 };
export const HOST_CAP_DEFAULT = 2;
export const HOST_CAP_EXCEPTION = 4;

/**
 * Candidates enter as raw search results (search.schema.json shape plus
 * angleId). Returns { candidates, quarantined } where each candidate
 * gains canonical URL and independence key metadata; duplicates by
 * canonical URL are merged (first occurrence wins, angles unioned).
 */
export function canonicalizeCandidates(rawResults) {
  const byCanonical = new Map();
  const quarantined = [];
  for (const raw of rawResults) {
    const canon = canonicalizeUrl(raw.url);
    if (!canon.ok) {
      quarantined.push({ ...raw, quarantineReason: canon.reason });
      continue;
    }
    const existing = byCanonical.get(canon.canonical);
    if (existing) {
      if (!existing.angleIds.includes(raw.angleId)) {
        existing.angleIds.push(raw.angleId);
      }
      continue;
    }
    const indep = independenceKey({
      originUrl: null,
      publisherGroup: raw.publisherGroup,
      canonicalHostname: canon.hostname,
    });
    byCanonical.set(canon.canonical, {
      ...raw,
      canonicalUrl: canon.canonical,
      canonicalHostname: canon.hostname,
      independenceKey: indep.key,
      independenceConfidence: indep.confidence,
      angleIds: [raw.angleId],
    });
  }
  return { candidates: [...byCanonical.values()], quarantined };
}

/**
 * Static portion of the selection score. Dynamic gains (angle coverage,
 * independence) are added during greedy selection.
 */
export function staticScore(candidate, scope) {
  let score = RELEVANCE_SCORE[candidate.relevance] ?? 0;
  if (scope.expectedSourceTypes.includes(candidate.sourceType)) {
    score += 15;
  }
  const { dateFrom, dateTo } = scope.temporalScope;
  if (candidate.publishedAt == null || (dateFrom == null && dateTo == null)) {
    score += 0;
  } else {
    const inRange =
      (dateFrom == null || candidate.publishedAt >= dateFrom) &&
      (dateTo == null || candidate.publishedAt <= dateTo);
    score += inRange ? 10 : -20;
  }
  if (candidate.sourceType === "commercial_content" || candidate.sourceType === "community") {
    score -= 10;
  }
  if (candidate.sourceType === "unknown") {
    score -= 5;
  }
  return score;
}

function compareTieBreak(a, b) {
  const relRank = { high: 0, medium: 1, low: 2 };
  const rel = relRank[a.relevance] - relRank[b.relevance];
  if (rel !== 0) return rel;
  // Newer published date first; unknown dates sort after known dates.
  if (a.publishedAt != null && b.publishedAt != null) {
    if (a.publishedAt !== b.publishedAt) return a.publishedAt > b.publishedAt ? -1 : 1;
  } else if (a.publishedAt != null) {
    return -1;
  } else if (b.publishedAt != null) {
    return 1;
  }
  return a.canonicalUrl < b.canonicalUrl ? -1 : a.canonicalUrl > b.canonicalUrl ? 1 : 0;
}

function hostCapFor(candidate, scope) {
  // Exception path: primary-dataset style sources may need multiple pages
  // when the scope explicitly expects that source type.
  const exceptionTypes = ["official_statistics", "official_document", "primary_research"];
  if (
    exceptionTypes.includes(candidate.sourceType) &&
    scope.expectedSourceTypes.includes(candidate.sourceType)
  ) {
    return HOST_CAP_EXCEPTION;
  }
  return HOST_CAP_DEFAULT;
}

/**
 * Two-stage selection: sort by static score (with deterministic
 * tie-breaks), then greedily pick while recomputing coverage and
 * independence gains and enforcing the per-host cap.
 *
 * @returns {{selected: object[], dropped: Array<{candidate: object, reason: string}>, exceptions: object[]}}
 */
export function selectSources(candidates, scope, limit) {
  const scored = candidates
    .map((c) => ({ ...c, staticScore: staticScore(c, scope) }))
    .sort((a, b) => b.staticScore - a.staticScore || compareTieBreak(a, b));

  const selected = [];
  const dropped = [];
  const exceptions = [];
  const hostCounts = new Map();
  const coveredAngles = new Set();
  const seenIndependenceKeys = new Set();

  for (const candidate of scored) {
    if (selected.length >= limit) {
      dropped.push({ candidate, reason: "budget_limit" });
      continue;
    }
    const cap = hostCapFor(candidate, scope);
    const hostCount = hostCounts.get(candidate.canonicalHostname) ?? 0;
    if (hostCount >= cap) {
      dropped.push({ candidate, reason: "host_cap" });
      continue;
    }

    let dynamicScore = candidate.staticScore;
    const newAngles = candidate.angleIds.filter((a) => !coveredAngles.has(a));
    if (newAngles.length > 0) dynamicScore += 10;
    if (!seenIndependenceKeys.has(candidate.independenceKey)) dynamicScore += 10;

    if (hostCount >= HOST_CAP_DEFAULT) {
      exceptions.push({
        canonicalUrl: candidate.canonicalUrl,
        hostname: candidate.canonicalHostname,
        reason: `host cap exception: sourceType=${candidate.sourceType} expected by scope`,
      });
    }

    hostCounts.set(candidate.canonicalHostname, hostCount + 1);
    for (const a of candidate.angleIds) coveredAngles.add(a);
    seenIndependenceKeys.add(candidate.independenceKey);
    selected.push({ ...candidate, selectionScore: dynamicScore });
  }

  return { selected, dropped, exceptions };
}
