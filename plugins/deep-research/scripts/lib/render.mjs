/**
 * Report rendering and citation audit (design sections 10.10 and 15).
 * The renderer emits Markdown text only; anything that could be parsed
 * as HTML is escaped.
 */

const STATE_LABEL = {
  confirmed: "Confirmed",
  qualified: "Qualified",
  contested: "Contested",
  refuted: "Refuted",
  insufficient: "Insufficient",
  not_checked: "Not checked",
};

const CONFIDENCE_LABEL = { high: "High", medium: "Medium", low: "Low" };

export function escapeMarkdown(text) {
  return String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * Machine citation audit (design section 10.10).
 * @returns {{ok: boolean, problems: string[]}}
 */
export function auditReport({ report, sources, verification }) {
  const problems = [];
  const sourceIds = new Set(sources.map((s) => s.id));
  const verificationByClaim = new Map(verification.map((v) => [v.claimId, v]));

  for (const finding of report.findings) {
    for (const sid of finding.sourceIds) {
      if (!sourceIds.has(sid)) {
        problems.push(`finding ${finding.id} cites unknown source ${sid}`);
      }
    }
    if (finding.sourceIds.length === 0) {
      problems.push(`finding ${finding.id} has no citations`);
    }
    for (const cid of finding.claimIds) {
      const v = verificationByClaim.get(cid);
      if (!v) {
        problems.push(`finding ${finding.id} references unknown claim ${cid}`);
        continue;
      }
      if (v.verificationState === "refuted") {
        problems.push(`finding ${finding.id} includes refuted claim ${cid}`);
      }
      if (
        (v.verificationState === "not_checked" || v.verificationState === "insufficient") &&
        finding.confidence !== "low"
      ) {
        problems.push(
          `finding ${finding.id} has confidence ${finding.confidence} but claim ${cid} is ${v.verificationState}`,
        );
      }
      if (finding.verificationState === "confirmed" && v.verificationState !== "confirmed") {
        problems.push(
          `finding ${finding.id} claims confirmed but claim ${cid} is ${v.verificationState}`,
        );
      }
    }
    if (finding.claimIds.length === 0) {
      problems.push(`finding ${finding.id} references no claims`);
    }
  }

  for (const disagreement of report.disagreements) {
    for (const position of disagreement.positions) {
      for (const sid of position.sourceIds) {
        if (!sourceIds.has(sid)) {
          problems.push(`disagreement "${disagreement.topic}" cites unknown source ${sid}`);
        }
      }
    }
  }

  return { ok: problems.length === 0, problems };
}

export function usedSourceIds(report) {
  const used = new Set();
  for (const finding of report.findings) {
    for (const sid of finding.sourceIds) used.add(sid);
  }
  for (const disagreement of report.disagreements) {
    for (const position of disagreement.positions) {
      for (const sid of position.sourceIds) used.add(sid);
    }
  }
  return used;
}

/**
 * Render report.md (design section 15).
 */
export function renderReportMarkdown({ report, sources, preset, auditIncomplete = false }) {
  const lines = [];
  const esc = escapeMarkdown;

  lines.push(`# ${esc(report.title)}`);
  lines.push("");
  lines.push(`> As of: ${esc(report.asOf)}`);
  lines.push(`> Scope: ${esc(report.scope)}`);
  lines.push(`> Preset: ${esc(preset)}`);
  if (auditIncomplete) {
    lines.push(`> Warning: citation audit incomplete`);
  }
  lines.push("");
  lines.push("## Executive Summary");
  lines.push("");
  lines.push(esc(report.executiveSummary));
  lines.push("");
  lines.push("## Key Findings");

  for (const finding of report.findings) {
    lines.push("");
    lines.push(`### ${esc(finding.heading)}`);
    const cites = finding.sourceIds.map((s) => `[${s}]`).join(" ");
    lines.push(`${esc(finding.claim)} ${cites}`.trim());
    lines.push("");
    lines.push(esc(finding.explanation));
    lines.push("");
    lines.push(`- Confidence: ${CONFIDENCE_LABEL[finding.confidence]}`);
    lines.push(`- Verification: ${STATE_LABEL[finding.verificationState]}`);
  }

  lines.push("");
  lines.push("## Disagreements and Uncertainty");
  lines.push("");
  if (report.disagreements.length === 0) {
    lines.push("No unresolved disagreements were identified within the searched scope.");
  } else {
    for (const disagreement of report.disagreements) {
      lines.push(`### ${esc(disagreement.topic)}`);
      lines.push("");
      for (const position of disagreement.positions) {
        const cites = position.sourceIds.map((s) => `[${s}]`).join(" ");
        lines.push(`- ${esc(position.position)} ${cites}`.trim());
      }
      lines.push("");
      lines.push(`Unresolved because: ${esc(disagreement.unresolvedReason)}`);
      lines.push("");
    }
  }

  lines.push("");
  lines.push("## Limitations");
  lines.push("");
  for (const item of report.limitations) lines.push(`- ${esc(item)}`);
  if (report.limitations.length === 0) lines.push("- None recorded.");

  lines.push("");
  lines.push("## Open Questions");
  lines.push("");
  for (const item of report.openQuestions) lines.push(`- ${esc(item)}`);
  if (report.openQuestions.length === 0) lines.push("- None recorded.");

  lines.push("");
  lines.push("## Methodology");
  lines.push("");
  lines.push(esc(report.methodology));

  lines.push("");
  lines.push("## Sources");
  lines.push("");
  const used = usedSourceIds(report);
  const cited = sources.filter((s) => used.has(s.id));
  const uncited = sources.filter((s) => !used.has(s.id));
  for (const source of cited) {
    lines.push(`- [${source.id}] ${esc(sourceLine(source))}`);
  }
  if (uncited.length > 0) {
    lines.push("");
    lines.push("### Consulted but not cited");
    lines.push("");
    for (const source of uncited) {
      lines.push(`- [${source.id}] ${esc(sourceLine(source))}`);
    }
  }
  lines.push("");
  return lines.join("\n");
}

function sourceLine(source) {
  const parts = [source.title];
  if (source.publisher) parts.push(source.publisher);
  if (source.publishedAt) parts.push(source.publishedAt);
  parts.push(source.canonicalUrl);
  return parts.join(", ");
}
