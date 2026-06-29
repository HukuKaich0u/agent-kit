# Skill Inventory (棚卸し表)

mizchi import 由来 skill の精査用台帳。正規化ルールは [skill-normalization-rules](./2026-06-28-skill-normalization-rules.md) を参照。

## 判断方針(この棚卸し時点)

- **使う技術**: Cloudflare Workers / AWS・ECS / Frontend レビュー一式 → 原則 **残**
- **使わない技術**: MoonBit / Gleam → 原則 **消**
- **mizchi 個人ツール依存**(waxa, flaker, vlmkit, utels 等): 調べた結果いずれも公開 OSS/npm/SaaS で自分も使えると判明。「使えるものは積極的に使う」方針で **全て残す**(2026-06-28 確定)。utels だけは SaaS 依存でハードル高めだが Cloudflare Workers のエラー追跡の選択肢として保持。
- 動作確認用サンプル: **消**

## ステータス凡例

- 推奨: `残` / `消`(`保留` は 2026-06-28 に全て `残` へ確定済み)
- 正規化: `未`(apm 定型ブロック残存) / `済`(R1〜R5 適用済み) / `-`(削除予定)

## meta

| skill | 推奨 | 正規化 | メモ |
|---|---|---|---|
| empirical-prompt-tuning | 残 | 済 | 正規化実例 |
| extract-glossary | 残 | 済 | 正規化実例 |
| optimizing-descriptions | 残 | 済 | description 改善 meta。R1〜R5 適用済み |
| retrospective-codify | 残 | 済 | 学びの codify。R1〜R5 適用。MoonBit 例→aws-oidc 例に差替 |
| skill-finder | 残 | 済 | catalog 外 skill 探索。R1〜R5 + rejection-log の mizchi 表現一般化 |
| skill-selector | 残 | 済 | apm catalog 選定。R1〜R5 + catalog.md を agent-kit 実在 skill だけに全面再構築 |
| waxa-eval | 残 | 済 | waxa CLI 操作。R1〜R5(@mizchi/waxa は npm 名なので保持) |

## ai

| skill | 推奨 | 正規化 | メモ |
|---|---|---|---|
| review-image | 残 | 済 | 同梱 Deno script。固定 ~/.claude path 一般化 + R5(Deno/API key 前提を明記) |
| vlmkit | 残 | 済 | orient skill。install/doctor 参照を自 repo に、サブスキル(upstream mizchi/vlmkit)とnpm名は保持。欠損 smoke-dist.sh 行を除去 + R5 |

## aws (使う → 残)

| skill | 推奨 | 正規化 | メモ |
|---|---|---|---|
| ecs-codedeploy-blue-green | 残 | 済 | 出典色なし。R5(harness 非依存)のみ |
| ecs-service-connect-ipv6 | 残 | 済 | 出典色なし。R5 のみ |
| github-oidc-scoped-role | 残 | 済 | 出典色なし。Bedrock 記述は具体例として保持(R5 に省略可と明記) |
| vault-mfa-iam | 残 | 済 | 出典色なし。R5 のみ |

## cloudflare (使う → 残)

| skill | 推奨 | 正規化 | メモ |
|---|---|---|---|
| access-app-setup | 残 | 済 | R4/R5。同梱 script 明示 + 上流クレジット化 |
| deploy | 残 | 済 | 公式系で出典色なし。sandbox 表現を harness 一般化 + R5 |
| ~~mbt-worker-bundle~~ | 削除済 | - | MoonBit 依存(2026-06-28 削除) |
| workers-otel-utels | 残 | 済 | R4/R5。同梱 runtime 明示。utels は実在 SaaS で保持 |

## devops

| skill | 推奨 | 正規化 | メモ |
|---|---|---|---|
| actions-ci-tuning | 残 | 済 | 汎用 GHA。出典色なし、R5 のみ |
| flaker-storage-cache-on-ci | 残 | 済 | @mizchi/flaker は実在 npm OSS で保持。R5 のみ |
| gh-fix-ci | 残 | 済 | 汎用。同梱 python script、R5 のみ |
| opentelemetry | 残 | 済 | platform 非依存。R5 のみ |
| otel-node | 残 | 済 | 出典色なし。R5 のみ |
| workers-cd-rollback | 残 | 済 | Cloudflare Workers CD。R5 + 上流クレジット化(cloudflare commit に同梱) |

## frontend (レビュー一式 → 残)

| skill | 推奨 | 正規化 | メモ |
|---|---|---|---|
| review-ci | 残 | 済 | self-contained 化(gh 直叩き)。宙ぶらりん checklist/script 参照を除去 |
| review-deps | 残 | 済 | self-contained 化(pnpm outdated/audit 直叩き) |
| review-hygiene | 残 | 済 | self-contained 化(tsc/eslint/knip/similarity 直叩き) |
| review-performance | 残 | 済 | script 無し。宙ぶらりん checklist 除去 + R5 |
| review-perspectives/frontend-expert | 残 | 済 | 宙ぶらりん checklist→Related に置換 + R5 |
| review-perspectives/frontend-ops-expert | 残 | 済 | 同上 |
| review-perspectives/performance-expert | 残 | 済 | 同上 |
| review-perspectives/react-expert | 残 | 済 | 同上 |
| review-perspectives/security-expert | 残 | 済 | 同上 |
| review-security | 残 | 済 | self-contained 化(grep/ast-grep 直叩き) |
| review-state | 残 | 済 | script 無し。宙ぶらりん checklist 除去 + R5 |
| review-testing | 残 | 済 | self-contained 化(vitest --coverage 直叩き) |
| review-triage | 残 | 済 | self-contained 化。app-classification を本文 inline 化 |
| review-weekly | 残 | 済 | orchestrator。subagent dispatch の degrade 方針を R5 に明記。宙ぶらりん engagement docs 参照を除去 |

> **重要**: frontend-review-* は元々 `scripts/audit-*.sh` 実行前提だったが、そのスクリプトは mizchi の非公開コンサル業務 repo 専用で公開 skill には未同梱・入手不能と判明(2026-06-29 確認)。各 skill を「agent が gh/pnpm/tsc/grep 等を直接叩く」self-contained 構成に書き換えて対応。

## k8s

| skill | 推奨 | 正規化 | メモ |
|---|---|---|---|
| crd-from-typed-schema | 残 | 済 | 出典色なし。R5 のみ |

## lang (MoonBit/Gleam → 消)

| skill | 推奨 | 正規化 | メモ |
|---|---|---|---|
| ~~gleam-practice~~ | 削除済 | - | Gleam(2026-06-28 削除) |
| ~~moonbit-js-binding~~ | 削除済 | - | MoonBit(2026-06-28 削除) |
| ~~moonbit-practice~~ | 削除済 | - | MoonBit(2026-06-28 削除) |
| rust | 残 | 済 | 出典色なし。R5 のみ。中身が薄い("guideline" のみ)→加筆は後回し案あり |
| translate-programming-language | 残 | 済 | 出典色なし。R5 のみ(subagent 分担の degrade も明記) |
| ~~ts2moonbit-migration~~ | 削除済 | - | MoonBit(2026-06-28 削除) |

## node

| skill | 推奨 | 正規化 | メモ |
|---|---|---|---|
| pi-coding-agent | 残 | 済 | @mariozechner/pi(実在 OSS)。出典色なし、R5 のみ |
| sqlite-vec | 残 | 済 | Node 標準 sqlite。出典色なし、R5 のみ |

## sql

| skill | 推奨 | 正規化 | メモ |
|---|---|---|---|
| lint | 残 | 済 | 同梱 mjs。R5。MoonBit 言及は host 言語の例として保持 |
| plan-audit | 残 | 済 | 同梱 mjs(node:sqlite)。出典色なし、R5 のみ |
| schema-audit | 残 | 済 | 同梱 mjs(node:sqlite)。出典色なし、R5 のみ |
| security | 残 | 済 | 同梱 mjs。pkfire 参照→汎用 pre-push hook 記述に置換。R5 |
| ~~sqlc-gen-moonbit-safety~~ | 削除済 | - | MoonBit(2026-06-28 削除) |

## testing (→ 残)

| skill | 推奨 | 正規化 | メモ |
|---|---|---|---|
| playwright-cli | 残 | 済 | 出典色なし。R5 のみ |
| playwright-test | 残 | 済 | 出典色なし。R5 のみ |

## tooling

| skill | 推奨 | 正規化 | メモ |
|---|---|---|---|
| apm-usage | 残 | 済 | デプロイ先 path を harness 一般化。chezmoi-management 参照除去。publishing.md の例示 owner を自分に。R5 |
| ast-grep-practice | 残 | 済 | 出典色なし。R5 のみ |
| ~~chezmoi-management~~ | 削除済 | - | mizchi dotfiles 専用(2026-06-28 削除) |
| conventional-changelog | 残 | 済 | pkfire/chezmoi 参照を汎用 task-runner 記述に置換。R5 |
| dep-lib-review | 残 | 済 | 出典色なし。R5 のみ |
| dotenvx | 残 | 済 | 出典色なし。R5 のみ |
| drawio | 残 | 済 | sandbox 配慮は harness 横断で保持。R5 |
| justfile | 残 | 済 | description の pkfire 推奨を除去。R5 |
| nix-setup | 残 | 済 | mizchi/<repo> デフォルト + 固定 path を一般化。MoonBit overlay は一例で保持。R5 |
| tech-trend-watch | 残 | 済 | 出典色なし。R5 のみ |
| upstream-fix-and-pin | 残 | 済 | 出典色なし。R5 のみ |
| utels-project-bootstrap | 残 | 済 | 同梱 setup-utels.ts を正と明示、mnemo は上流クレジット化。R5 |

## tools

| skill | 推奨 | 正規化 | メモ |
|---|---|---|---|
| waxa | 残 | 未 | waxa CLI 本体。waxa-eval とセット |
| waxa/examples/echo-skill/... | 消 | - | 動作確認用サンプル。catalog に出す必要なし |

## 集計(推奨ベース)

- 残: 保留 18 件を全て残に確定したため **約 61**(全カテゴリの大半)
- 消(完了): MoonBit/Gleam 系 6 + chezmoi 1 = **7**(c1fc7e8)
- 消(前セッション分・未 commit): mizchi-blog-style + tech-article-reproducibility = 2

## 次アクション

1. ~~`消` を一括削除して MoonBit/Gleam 等を整理~~ (完了: c1fc7e8)
2. ~~`保留` を個別判断~~ (完了: 全て公開 OSS で使えると判明し全て残に確定 2026-06-28)
3. ~~`残` を正規化ルールに沿って 1 つずつ精査~~ (完了: 全カテゴリ正規化済み 2026-06-29)
   - meta / cloudflare / aws / devops / frontend / k8s / lang / node / testing / sql / ai / tooling = 全 58 skill 済
   - README 生成スクリプト移植 + catalog 再構築済み

## アイデア置き場(後回し)

- **frontend-review-* の audit-*.sh を自前実装**(2026-06-29 方針確定)。
  現状は self-contained 化(agent が gh/pnpm/grep を直接叩く)で動くが、実行のばらつきが出る。
  スクリプト化すれば実行が決定的になり出力 JSON も固定 → review-weekly の KPI diff/ratchet が機能する。
  8本: audit-{triage,ci,typescript,lint,similarity,deps,coverage,security}.sh。
  **前提構成はパッケージマネージャ自動検出**(lockfile を見て pnpm/npm/yarn 判定、linter も eslint/biome 自動検出)。
  実装したら各 SKILL.md の Procedure を「スクリプト実行」に戻し、description も合わせる。
- **lang/typescript を新規作成** + **lang/rust を加筆充実**。消した moonbit-practice の構造
  (Guidelines / Common Pitfalls / AI がよく間違う構文 / Tests / pre-release checklist /
  CI&publishing / Quick Reference)を雛形に。構造は `git show c1fc7e8^:skills/lang/moonbit-practice/SKILL.md` で参照可能。
  着手時に「どの runtime/用途を主軸にするか」を先に確定すること(空想で書くと薄くなる)。
