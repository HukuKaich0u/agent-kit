---
name: vlmkit
description: Entry-point for the `@mizchi/vlmkit` toolkit — visual regression (snapshot / diff / regression-watch), markup synthesis from screenshots, design-token / theme / a11y / i18n audits, and a VLM + LLM CSS auto-repair loop. Use when an agent edited HTML/CSS and needs to know what visibly changed and where, or the task is markup-from-image / token / theme audit / CSS fix-loop. Orients to the 5 sub-skills (vrt-visual-diff / vrt-migration-eval / vrt-markup-synth / vrt-regression-watch / vrt-css-fix-loop) and the CLI; not for pure-data snapshot tests, Lighthouse, or content-correctness review.
---

# vlmkit

`vlmkit` is a TypeScript visual-regression toolkit built on Playwright +
pixelmatch. Beyond raw pixel diffs, it surfaces **agent-friendly
signal**: computed-style deltas split into universal vs.
breakpoint-gated, per-section diffRatio against component bboxes,
worst-viewport screenshot paths inline, and (optionally) VLM-emitted
CHANGE lists feeding an LLM CSS-fix step.

Source: <https://github.com/mizchi/vlmkit>. CHANGELOG +
old-CLI-to-new-CLI mapping: [`CHANGELOG.md`](https://github.com/mizchi/vlmkit/blob/main/CHANGELOG.md).

**Naming note**: the project was renamed `vrt` → `vlmkit`. `@mizchi/vlmkit`
(bin `vlmkit`) is current and is what this skill installs and calls
throughout; `@mizchi/vrt` (bin `vrt`) is the old pre-rename package name,
mentioned below only where it's still relevant (0.4.x deprecation shims).

## When to invoke this skill

- An agent edited CSS / HTML / a component and you need "what visibly
  changed, and where."
- You're auditing a refactor PR for unintended layout drift.
- You're comparing two URLs (dev server vs. preview deploy; baseline
  vs. variant).
- You want a CI gate that flags regression across PRs.
- You're swapping a framework / CSS library and need to verify the
  rewrite is visually equivalent.

## When NOT to invoke

- Snapshot testing of pure-data structures (use Jest snapshots).
- Lighthouse / Web Vitals beyond CLS/LCP/FCP (use Lighthouse directly).
- Browser-driver-only flows with no diff component (use Playwright Test).
- Reviewing AI-generated **screenshots** for content correctness (use a
  vision-LLM tool like `review-image`).

## Install

**Prerequisite: Node 24+.** The CLI and the workspace packages all
rely on Node's `--experimental-strip-types` (default-on at 24+).
**Node 22 will not work** — verify with `node --version` before
installing. Use `nvm install 24 && nvm use 24` (or `fnm` / `volta` /
your preferred manager) to upgrade.

**Pre-flight check**: run `scripts/doctor.sh` to verify Node version,
Playwright Chromium, optional API keys, and installed sub-skills in
one pass. Two invocation forms by setup phase:

- **Pre-install (no apm yet)**: one-shot via curl —
  `bash <(curl -sSL https://raw.githubusercontent.com/HukuKaich0u/agent-kit/main/skills/ai/vlmkit/scripts/doctor.sh)`
- **Post-install (`apm install -g HukuKaich0u/agent-kit/skills/ai/vlmkit` done)**: local
  copy — `bash <agent-skills-dir>/vlmkit/scripts/doctor.sh` (e.g. `~/.claude/skills/vlmkit/scripts/doctor.sh` on Claude)

Severity rules: only **Node 24+** and **Playwright Chromium** are
FAIL-class (block exit 0). Everything else — including `vlmkit` CLI not
yet on PATH — is WARN by design, because the script is meant to be
runnable mid-install (a WARN on `vlmkit CLI` is expected the first time
through; resolve all FAILs first, install `@mizchi/vlmkit`, re-run, and
the WARN clears).

```bash
# CLI (global)
pnpm add -g @mizchi/vlmkit
# or per-project
pnpm add -D @mizchi/vlmkit
npx playwright install chromium

# Library packages (deep imports via .ts source)
pnpm add @mizchi/vlmkit-core @mizchi/vlmkit-capture @mizchi/vlmkit-markup @mizchi/vlmkit-ai
```

The single-token commands from 0.4.x (`vrt compare`, `vrt png-diff`,
`vrt theme-parity`, …) remain as deprecation shims on the old `vrt`
binary that print a one-line hint and forward to the `vlmkit` verb-group
equivalent.

## Command index

Verb groups: `vlmkit diff|snapshot|check|inspect|stress|scan|build|
migration|watch|manifest|diff-pr|baseline <sub-verb> [args] [--output <dir>]`.
Each verb group is documented in depth by the sub-skill that owns it
(table below) — this orient skill does not duplicate the flag reference.

## Sub-skill routing

**Two repos, by design**: this orient skill lives in this repo
(`HukuKaich0u/agent-kit`, general-purpose skills); the five sub-skills
live upstream in [`mizchi/vlmkit`](https://github.com/mizchi/vlmkit)
under `.claude/skills/`. The two `apm install` paths look different
because they target different repos — that is intentional, not a typo.

**The CLI is fully functional without any sub-skill installed** —
sub-skills are agent-facing reference material that deepens the routing
for a specific task shape. Install only when an agent needs the extra
context; end users running `vlmkit` from the command line never need
them.

**Scope boundary**: this orient skill stops at *routing*. Once you know
which sub-skill to load, deeper operational detail — full flag lists,
persistence paths (e.g. `.vrt/last-diff-for-agent.json` for regression
watch), per-mode semantics, output schema — lives in the corresponding
sub-skill. Install it via the `apm` command below when an agent needs
that depth.

```bash
apm install mizchi/vlmkit/.claude/skills/<skill-name>
```

Pick by task shape:

| Sub-skill | Use when | Entry workflow |
|---|---|---|
| `vrt-visual-diff` | One-shot "did this CSS edit change pixels, and where?" | `vlmkit diff html` → `vlmkit diff agent` |
| `vrt-regression-watch` | CI gate / scheduled drift detection across runs | `vlmkit diff agent --previous --fail-on-regression` |
| `vrt-migration-eval` | Framework / CSS-lib / build-system swap audit (deliberate large diff) | `vlmkit migration compare\|blind\|subagent` |
| `vrt-markup-synth` | Screenshot → HTML/CSS, token / theme / i18n / a11y audits | `vlmkit build\|scan\|check\|stress` |
| `vrt-css-fix-loop` | Automated CSS-repair loop with VLM + LLM | `fix-loop.ts` (`VRT_VLM_MODEL=…`) |

**Routing heuristic** (ask yourself once the user states the task):

```
Is the markup deliberately different (rewrite / framework swap)?
├─ yes → vrt-migration-eval
└─ no
   ├─ Need to detect change between runs over time? → vrt-regression-watch
   ├─ Want a CSS-fix loop (auto-repair)?          → vrt-css-fix-loop
   ├─ Building from a screenshot / token audit?   → vrt-markup-synth
   └─ One-shot "what changed"                     → vrt-visual-diff
```

## Reporting issues / contributing

vlmkit は外部 OSS。バグや要望は upstream へ:

- Issues / feature requests: <https://github.com/mizchi/vlmkit/issues>
- Source: <https://github.com/mizchi/vlmkit>

## Agent compatibility

- Claude と Codex のどちらでも使える。この skill は `@mizchi/vlmkit`(実在 OSS)CLI へのルーティング案内で、案内する agent の harness には依存しない。
- **Node 24+ と Playwright Chromium が前提**(`scripts/doctor.sh` で確認)。`pnpm`/`npx` で CLI とブラウザを入れる。
- 5つのサブスキルは upstream の `mizchi/vlmkit` 別 repo にある(この orient skill とは別物)。CLI はサブスキル無しでも動く。
- skill 配置先 path(`~/.claude/skills/...`)は harness 固有。固定でなく install 先として読む。
