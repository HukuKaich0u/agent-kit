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
| review-image | 残 | 未 | OpenRouter VLM。Deno script 同梱。汎用性あり |
| vlmkit | 残 | 未 | @mizchi/vlmkit 依存。個人ツール |

## aws (使う → 残)

| skill | 推奨 | 正規化 | メモ |
|---|---|---|---|
| ecs-codedeploy-blue-green | 残 | 未 | |
| ecs-service-connect-ipv6 | 残 | 未 | 実体験ベースの trouble shooting |
| github-oidc-scoped-role | 残 | 未 | Bedrock 前提の記述あり→自分の用途に合わせ要調整 |
| vault-mfa-iam | 残 | 未 | aws-vault 前提 |

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
| actions-ci-tuning | 残 | 未 | 汎用 GHA |
| flaker-storage-cache-on-ci | 残 | 未 | @mizchi/flaker 依存 |
| gh-fix-ci | 残 | 未 | 汎用 |
| opentelemetry | 残 | 未 | platform 非依存 |
| otel-node | 残 | 未 | |
| workers-cd-rollback | 残 | 済 | Cloudflare Workers CD。R5 + 上流クレジット化(cloudflare commit に同梱) |

## frontend (レビュー一式 → 残)

| skill | 推奨 | 正規化 | メモ |
|---|---|---|---|
| review-ci | 残 | 未 | |
| review-deps | 残 | 未 | |
| review-hygiene | 残 | 未 | |
| review-performance | 残 | 未 | React 前提 |
| review-perspectives/frontend-expert | 残 | 未 | |
| review-perspectives/frontend-ops-expert | 残 | 未 | |
| review-perspectives/performance-expert | 残 | 未 | |
| review-perspectives/react-expert | 残 | 未 | |
| review-perspectives/security-expert | 残 | 未 | |
| review-security | 残 | 未 | |
| review-state | 残 | 未 | |
| review-testing | 残 | 未 | |
| review-triage | 残 | 未 | |
| review-weekly | 残 | 未 | 全 review-* を orchestrate。mizchi の運用色強め→要確認 |

## k8s

| skill | 推奨 | 正規化 | メモ |
|---|---|---|---|
| crd-from-typed-schema | 残 | 未 | k8s 使うか次第 |

## lang (MoonBit/Gleam → 消)

| skill | 推奨 | 正規化 | メモ |
|---|---|---|---|
| ~~gleam-practice~~ | 削除済 | - | Gleam(2026-06-28 削除) |
| ~~moonbit-js-binding~~ | 削除済 | - | MoonBit(2026-06-28 削除) |
| ~~moonbit-practice~~ | 削除済 | - | MoonBit(2026-06-28 削除) |
| rust | 残 | 未 | Rust 使うか次第。中身が薄い("guideline" のみ) |
| translate-programming-language | 残 | 未 | 言語間移行。汎用だが重い |
| ~~ts2moonbit-migration~~ | 削除済 | - | MoonBit(2026-06-28 削除) |

## node

| skill | 推奨 | 正規化 | メモ |
|---|---|---|---|
| pi-coding-agent | 残 | 未 | @mariozechner/pi 依存 |
| sqlite-vec | 残 | 未 | Node 標準 sqlite。汎用 |

## sql

| skill | 推奨 | 正規化 | メモ |
|---|---|---|---|
| lint | 残 | 未 | sqlc 前提だが汎用寄り |
| plan-audit | 残 | 未 | SQLite/D1 |
| schema-audit | 残 | 未 | SQLite/D1 |
| security | 残 | 未 | SQL injection screening |
| ~~sqlc-gen-moonbit-safety~~ | 削除済 | - | MoonBit(2026-06-28 削除) |

## testing (→ 残)

| skill | 推奨 | 正規化 | メモ |
|---|---|---|---|
| playwright-cli | 残 | 未 | |
| playwright-test | 残 | 未 | |

## tooling

| skill | 推奨 | 正規化 | メモ |
|---|---|---|---|
| apm-usage | 残 | 未 | apm 運用の参照。自分が apm 使う |
| ast-grep-practice | 残 | 未 | 汎用 lint |
| ~~chezmoi-management~~ | 削除済 | - | mizchi dotfiles 専用(2026-06-28 削除) |
| conventional-changelog | 残 | 未 | 汎用 |
| dep-lib-review | 残 | 未 | 汎用 |
| dotenvx | 残 | 未 | 汎用 |
| drawio | 残 | 未 | 汎用 |
| justfile | 残 | 未 | mizchi は pkfire 推奨と明記。自分は just 使う?→要確認 |
| nix-setup | 残 | 未 | devbox/Nix 使うか次第。MoonBit template 含む |
| tech-trend-watch | 残 | 未 | 汎用 |
| upstream-fix-and-pin | 残 | 未 | mizchi 運用色だが内容は汎用的 |
| utels-project-bootstrap | 残 | 未 | utels(mizchi)依存 |

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
3. `残` を正規化ルールに沿って 1 つずつ精査(優先度: meta → 使用頻度高いカテゴリ)← **次はここ**

## アイデア置き場(後回し)

- **lang/typescript を新規作成** + **lang/rust を加筆充実**。消した moonbit-practice の構造
  (Guidelines / Common Pitfalls / AI がよく間違う構文 / Tests / pre-release checklist /
  CI&publishing / Quick Reference)を雛形に。構造は `git show c1fc7e8^:skills/lang/moonbit-practice/SKILL.md` で参照可能。
  着手時に「どの runtime/用途を主軸にするか」を先に確定すること(空想で書くと薄くなる)。
