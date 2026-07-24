---
name: optimizing-descriptions
description: 'Meta-skill for auditing and rewriting SKILL.md `description` fields per the agentskills.io optimizing-descriptions framework, layered with a two-track trigger policy (Meta = explicit-invoke-only, Project = pushy auto-trigger). Invoke ONLY when the user explicitly asks to "optimize a skill description," "audit descriptions," or "rewrite descriptions per agentskills." Do NOT auto-invoke after every SKILL.md edit; description tuning is a deliberate batch, not a per-edit reflex.'
---

# Optimizing Skill Descriptions

Operational guide for auditing and rewriting SKILL.md `description` fields so they trigger the way this repository's authors want them to.

The upstream reference is [agentskills.io/skill-creation/optimizing-descriptions](https://agentskills.io/skill-creation/optimizing-descriptions). This skill keeps the framework intact and adds this repository's two-track policy on top.

## Why this exists

Agents see `name + description` at startup (progressive disclosure) and decide from that alone whether to load the full SKILL.md. The description is the entire triggering contract:

- **Under-specified** → skill never fires when it should.
- **Over-broad** → skill fires when it shouldn't, wasting context.

Both failures are silent — the skill simply isn't doing its job. This audit makes them visible.

## When to invoke

Meta-skill, explicit invocation only. Triggers:

- "optimize / audit / rewrite this skill's description"
- "audit descriptions per agentskills"
- "tune trigger accuracy"
- "go through the skill catalog and fix descriptions"

Do NOT use for:

- Single-skill ad-hoc edits during normal skill authoring.
- Newly written skills that haven't been used yet (write the description as part of `writing-great-skills`; tune only after observed mistriggering).

## Two-track policy

This repository's skills split into two categories and need **different** description shapes. Picking the wrong one is the most common audit miss.

| Track | Trigger policy | Description shape | Examples |
|---|---|---|---|
| **Project** | Pushy — auto-trigger desirable | `Use when ... — [symptom keywords]. Trigger on [file shapes] even if user does not name [domain].` | `playwright-test`, `gh-fix-ci`, `actions-ci-tuning`, `otel-node`, `ast-grep-practice` |
| **Meta** | Under-trigger — explicit invoke only | `Invoke ONLY when the user explicitly asks ... Do NOT auto-invoke on [common ambient signals].` | `skill-selector`, `skill-finder`, `waxa-eval`, `apm-usage`, `empirical-prompt-tuning`, `retrospective-codify`, this skill |

How to classify a skill you're auditing:

- Body contains "Meta-skill" / "explicit invocation" / "明示 invoke" → **Meta**.
- Body is "best practices for X" / "reference for Y" / "how to use Z" → **Project**.
- Persona / chat-only skills (e.g. `ask-matt`) follow the Meta shape but with "Activate during ..." phrasing.

## Audit checklist

### Universal (both tracks)

- [ ] Imperative phrasing — `Use when ...` (Project) or `Invoke ONLY when ...` (Meta). No `Reference for ...` openers without a follow-up imperative.
- [ ] User-intent focused — describes what the user wants to do, not the skill's internal mechanics.
- [ ] Concise — under 1024 chars (the spec hard limit; descriptions tend to grow during optimization, so check on every edit).
- [ ] First clause covers the trigger condition — `name + first sentence` is what the agent actually scans most.

### Project-track additional

- [ ] Symptom / surface keywords listed: file names (`.rs`, `Cargo.toml`), error strings (`network is unreachable`, `InvalidClientTokenId`), commands (`apm install`, `waxa audit`).
- [ ] Pushy phrasing — `even if user doesn't name <domain>` / `Trigger on <symptom> even when <tool> isn't mentioned`. Captures cases where the user describes the problem without naming the technology.

### Meta-track additional

- [ ] `Invoke ONLY when ...` / `Use ONLY when ...` opener.
- [ ] `Do NOT auto-invoke on ...` clause listing the common ambient signals that would otherwise trigger it (touching certain files, finishing certain tasks, etc.).
- [ ] Trigger phrases the user actually says, enumerated (`"codify today's lessons"`, `"find a Stripe skill"`, etc.) — agents match natural phrasing better when the exact verbalization is on the page.

## Common rewrite patterns

Distilled from a single-pass audit of this repository's skill catalog.

### Project rewrites

```
# Before: passive, no trigger
Reference for the otel-node instrumentation setup.

# After: imperative + symptom + pushy
Use when instrumenting a Node.js service with OpenTelemetry — wiring the
SDK, exporters, and auto-instrumentation, debugging missing spans or
broken trace context propagation. Trigger on `@opentelemetry/*` deps or
OTel Collector symptoms even when the user does not say "OpenTelemetry".
```

```
# Before: describes the situation but no imperative
ECS Service Connect の DNS alias が IPv6 アドレスを返して接続できない問題の回避策。

# After: imperative + error-string symptoms
Use when ECS Service Connect の DNS alias が IPv6 アドレスを返し、 IPv4-only
の Fargate task から `network is unreachable` / `EAI_AGAIN` で接続失敗する
とき。 OTel Collector → Tempo の OTLP gRPC、 Fargate → Service Connect
の HTTP/gRPC 通信が失敗する症状から起動 (user が IPv6 と特定していなくても OK)。
```

### Meta rewrites

```
# Before: "Use after X" promotes auto-trigger
On task completion, pair "what failed first" with "what finally worked"
and codify ... Use after trial-and-error solutions to spare future-you
the same trap. Trigger phrases: "codify today's lessons," ...

# After: explicit-only with user-phrase trigger anchoring
Pair "what failed first" with "what finally worked" and codify the
should-have-known-it insight as an ast-grep rule, a skill, or a
CLAUDE.md rule. Meta-skill: invoke ONLY when the user explicitly says
"codify today's lessons," "make it a skill," "drop it into lint," or
asks to extract a reusable rule from a trial-and-error fix. Do NOT
auto-invoke at every task completion.
```

```
# Before: "Consult when touching" auto-triggers on path matches
apm.yml syntax, install / uninstall / update commands, target detection,
lockfile workflow. Consult when touching apm.yml or running an apm
command.

# After: explicit-intent + Do NOT auto-invoke clause
Meta-skill for APM (Agent Package Manager). Invoke ONLY when the user
mentions APM by name, asks to author or audit an apm.yml, or runs into
an unfamiliar APM command / error. Do NOT auto-invoke merely because a
project happens to have skills installed via APM — routine usage needs
only general APM knowledge.
```

## Workflow

1. **Extract** every `description:` field. Quick recipe:

   ```bash
   for f in */SKILL.md; do
     dir=$(dirname "$f")
     echo "=== $dir ==="
     awk 'BEGIN{in_fm=0; in_desc=0}
          /^---$/{in_fm=!in_fm; if(!in_fm) exit; next}
          in_fm && /^description:/{in_desc=1; sub(/^description:[[:space:]]*/,""); print; next}
          in_fm && in_desc && /^[a-zA-Z]+:/{in_desc=0}
          in_fm && in_desc{print}' "$f"
     echo
   done
   ```

2. **Classify** each skill as Meta or Project from the body (see Two-track policy table above).

3. **Apply the checklist** per skill. Note the failing checks, don't fix yet.

4. **Patch in one batch.** Rewrite all flagged descriptions. Don't mix description-tuning commits with skill-body edits — keep the diff to `description:` lines only so the change is reviewable as a description-only audit.

5. **Verify with `waxa audit <skill>`** — picks up surface frontmatter issues (length, name shape, trigger-condition shape). Errors must be zero; warnings about body / LICENSE are out of scope here.

6. **Propagate** via `apm update` (or `just sync`) so the running session's `~/.claude/rules/` / installed skills reflect the edit — do not hand-edit the installed copy directly.

7. **Commit as one** with a per-skill summary in the message. One audit pass = one commit, even when it touches 10+ skills.

## Trigger accuracy testing (next stage)

The agentskills.io page describes an empirical step on top of manual review: run a query set against the agent with the skill installed, count trigger rate per query, split train/validation to avoid overfitting. waxa does not have this yet — when it does (`waxa trigger` sub-command in a future release), the manual audit produced by this skill becomes the input layer, and trigger-rate measurement becomes the verification layer. Until then, manual audit + `waxa audit` is the working approach.

If you do run the empirical step by hand, follow agentskills.io's specifics:

- 20 queries: ~10 should-trigger + ~10 should-not-trigger.
- 3 runs per query (non-determinism averaging); threshold trigger_rate ≥ 0.5 to pass should-trigger, < 0.5 to pass should-not-trigger.
- 60/40 train / validation split; select the best iteration by validation pass rate, not train.
- Most valuable should-not-trigger queries are **near-misses** (keyword overlap, different intent).

## Common pitfalls

| Mistake | Fix |
|---|---|
| Adding specific keywords from failed-trigger queries verbatim | Overfitting. Generalize to the category (`.rs files` ≫ `Cargo.toml exists`). |
| Writing the description in terms of internal implementation | Rewrite from user intent. "What is the user trying to do?" |
| Meta skill with `Use after X` / `Consult when X` | Auto-triggers on ambient signals. Rewrite to `Invoke ONLY when explicitly asked ... Do NOT auto-invoke on X`. |
| Project skill with `ONLY when the user explicitly says ...` | Under-triggers. Make it pushy: `Use when ... Trigger on [symptoms] even if X not named.` |
| Description grows past 1024 chars during rewrite | Check length on every edit; cut the least-load-bearing clause first. |
| Iterating five rounds with no improvement | The query set is the problem, not the description. Look at the query examples — are they too easy / too hard / mislabeled? |
| Rewriting description and body in the same commit | Hard to review and to revert. Description-tuning is a separate batch. |

## Related

- `agentskills.io/skill-creation/optimizing-descriptions` — upstream methodology document (the framework this skill operationalizes).
- `writing-great-skills` — when creating a new skill from scratch; description is one of several components. Use this skill (`optimizing-descriptions`) only after the skill exists and has been observed.
- `waxa-eval` — for measuring trigger accuracy empirically (when `waxa trigger` lands).
- `waxa audit <skill>` — picks up the surface frontmatter issues (length, name shape, basic trigger-condition phrasing) that this audit also flags; useful as a fast pre-check.
- `skill-finder` — the rubric there includes "frontmatter-health" which overlaps with this skill's universal checklist; skill-finder uses `optimizing-descriptions` patterns implicitly when evaluating an external skill candidate.
