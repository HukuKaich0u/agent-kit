/**
 * Budget presets (design section 11). Values are pre-measurement
 * hypotheses; bump PRESET_VERSION whenever a value changes.
 *
 * 1.1: live evaluation showed real adversarial-search workers exceed a
 * 3-minute timeout and a 10-minute quick deadline ends before any claim
 * is verified; quick now gets the standard worker timeout and 20 minutes.
 */

export const PRESET_VERSION = "1.1";

export const PRESETS = {
  quick: {
    searchAngles: 3,
    candidatesPerAngle: 5,
    selectedSources: 8,
    claimsExtractedCap: 15,
    claimsVerifiedCap: 8,
    maxConcurrency: 2,
    retryPerWorker: 1,
    adjudicationCap: 3,
    perWorkerTimeoutMs: 5 * 60 * 1000,
    runDeadlineMs: 20 * 60 * 1000,
  },
  standard: {
    searchAngles: 5,
    candidatesPerAngle: 8,
    selectedSources: 20,
    claimsExtractedCap: 40,
    claimsVerifiedCap: 20,
    maxConcurrency: 4,
    retryPerWorker: 2,
    adjudicationCap: 8,
    perWorkerTimeoutMs: 5 * 60 * 1000,
    runDeadlineMs: 30 * 60 * 1000,
  },
  deep: {
    searchAngles: 8,
    candidatesPerAngle: 10,
    selectedSources: 40,
    claimsExtractedCap: 80,
    claimsVerifiedCap: 35,
    maxConcurrency: 4,
    retryPerWorker: 2,
    adjudicationCap: 15,
    perWorkerTimeoutMs: 8 * 60 * 1000,
    runDeadlineMs: 90 * 60 * 1000,
  },
};

export function resolveBudget(presetName, overrides = {}) {
  const preset = PRESETS[presetName];
  if (!preset) {
    throw new Error(`unknown preset: ${presetName}`);
  }
  const effective = { ...preset };
  if (overrides.maxConcurrency != null) {
    const n = Number(overrides.maxConcurrency);
    if (!Number.isInteger(n) || n < 1 || n > 16) {
      throw new Error(`invalid max-concurrency: ${overrides.maxConcurrency}`);
    }
    effective.maxConcurrency = n;
  }
  return {
    preset: presetName,
    presetVersion: PRESET_VERSION,
    ...effective,
  };
}

/**
 * Order claims by verification priority (design section 10.5):
 * central first, then time-sensitive, then single-source strong claims,
 * then claims with numeric disagreement across sources.
 */
export function prioritizeClaims(claims) {
  const importanceRank = { central: 0, supporting: 1, contextual: 2 };
  const sensitivityRank = { high: 0, medium: 1, low: 2 };
  return [...claims].sort((a, b) => {
    const imp = importanceRank[a.importance] - importanceRank[b.importance];
    if (imp !== 0) return imp;
    const sens = sensitivityRank[a.timeSensitivity] - sensitivityRank[b.timeSensitivity];
    if (sens !== 0) return sens;
    const single =
      (a.independentSourceCount === 1 ? 0 : 1) - (b.independentSourceCount === 1 ? 0 : 1);
    if (single !== 0) return single;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
}
