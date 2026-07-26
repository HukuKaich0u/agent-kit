---
name: improve-codebase-architecture
description: Turn evidence-backed findings into a shortlist of deepening candidates, then design the one the user picks through codebase-design + grilling and hand it to to-spec.
disable-model-invocation: true
---

# Improve Codebase Architecture

Surface architectural friction and propose **deepening opportunities** — refactors that turn shallow modules into deep ones. The aim is testability and AI-navigability.

This is not an independent scanner. Repo-wide structural scanning belongs to the review skills (e.g. `/backend-review-architecture`); this skill starts from **evidence** — review findings, a pain point the user names, or friction observed while working — and turns one chosen candidate into a designed improvement.

This command is _informed_ by the project's domain model and built on a shared design vocabulary:

- Run the `/codebase-design` skill for the architecture vocabulary (**module**, **interface**, **depth**, **seam**, **adapter**, **leverage**, **locality**) and its principles (the deletion test, "the interface is the test surface", "one adapter = hypothetical seam, two = real"). Prefer these terms in every suggestion so candidates stay comparable — but follow the project's own established vocabulary where the two conflict.
- The domain language in the project's glossary gives names to good seams; existing ADRs record decisions this command should not re-litigate.

## Process

### 1. Gather evidence

**Scope before you look — YAGNI.** Deepening a module pays off by making future changes to it easier, so put extra weight on the parts of the codebase that have recently changed.

- If the user brings review findings or names a direction — a module, a subsystem, a pain point — start from that.
- Otherwise, walk back a good stretch of the commit history (`git log --oneline`) to find the hot spots — the files and areas that keep coming up — and read the code in those areas directly. Keep the reading scoped; if what's really needed is a full structural scan, run the review skill first rather than duplicating it here.

Read the project's domain glossary and the ADRs in the area you're touching first (see `/domain-modeling` for where they live).

While reading, note where you experience friction:

- Where does understanding one concept require bouncing between many small modules?
- Where are modules **shallow** — interface nearly as complex as the implementation?
- Where have pure functions been extracted just for testability, but the real bugs hide in how they're called (no **locality**)?
- Where do tightly-coupled modules leak across their seams?
- Which parts of the codebase are untested, or hard to test through their current interface?

Apply the **deletion test** to anything you suspect is shallow: would deleting it concentrate complexity, or just move it? A "yes, concentrates" is the signal you want.

### 2. Present candidates in the conversation

Present **3–5 candidates at most**, as Markdown in the conversation — no report files, nothing written to the repo or opened in a browser. For each candidate:

- **Files** — which files/modules are involved
- **Problem** — why the current architecture is causing friction, with the evidence (the finding, the commit churn, the code path)
- **Solution** — plain English description of what would change
- **Benefits** — explained in terms of locality and leverage, and how tests would improve
- **Recommendation strength** — one of `Strong`, `Worth exploring`, `Speculative`

End with a **top recommendation**: which candidate you'd tackle first and why.

**ADR conflicts**: if a candidate contradicts an existing ADR, only surface it when the friction is real enough to warrant revisiting the ADR. Mark it clearly (_"contradicts ADR-0007 — but worth reopening because…"_). Don't list every theoretical refactor an ADR forbids.

Do NOT propose interfaces yet. Ask the user: "Which of these would you like to explore?"

### 3. Grilling loop

Once the user picks a candidate, run the `/grilling` skill to walk the decision tree with them — constraints, dependencies, the shape of the deepened module, what sits behind the seam, what tests survive.

Run the `/domain-modeling` skill alongside to keep the domain model current — proposing glossary and ADR updates as decisions crystallize, applied after the user confirms each one:

- **Naming a deepened module after a concept not in the glossary?** Propose the term.
- **Sharpening a fuzzy term during the conversation?** Propose the update right there.
- **User rejects the candidate with a load-bearing reason?** Offer an ADR, framed as: _"Want me to record this as an ADR so future architecture reviews don't re-suggest it?"_ Only offer when the reason would actually be needed by a future explorer to avoid re-suggesting the same thing — skip ephemeral reasons ("not worth it right now") and self-evident ones.
- **Want to explore alternative interfaces for the deepened module?** Ask first; on approval, run the `/codebase-design` skill and use its design-it-twice parallel sub-agent pattern.

### 4. Hand off

When the design is agreed and the work won't fit the current session, run `/to-spec` to turn it into a spec; a small change can go straight to implementation in-session.
