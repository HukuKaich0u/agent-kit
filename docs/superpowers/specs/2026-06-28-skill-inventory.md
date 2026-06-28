# Skill Inventory (棚卸し表)

mizchi import 由来 skill の精査用台帳。正規化ルールは [skill-normalization-rules](./2026-06-28-skill-normalization-rules.md) を参照。

## 判断方針(この棚卸し時点)

- **使う技術**: Cloudflare Workers / AWS・ECS / Frontend レビュー一式 → 原則 **残**
- **使わない技術**: MoonBit / Gleam → 原則 **消**
- **mizchi 個人ツール依存**(waxa, flaker, vlmkit, pkfire, chezmoi, upstream-fix-and-pin 等): 一括では決めず skill ごとに **保留** で個別判断
- 動作確認用サンプル: **消**

## ステータス凡例

- 推奨: `残` / `消` / `保留`(要相談)
- 正規化: `未`(apm 定型ブロック残存) / `済`(R1〜R5 適用済み) / `-`(削除予定)

## meta

| skill | 推奨 | 正規化 | メモ |
|---|---|---|---|
| empirical-prompt-tuning | 残 | 済 | 正規化実例 |
| extract-glossary | 残 | 済 | 正規化実例 |
| optimizing-descriptions | 残 | 未 | description 改善 meta。自分の正規化作業と相性良 |
| retrospective-codify | 残 | 未 | 学びの codify。汎用 |
| skill-finder | 保留 | 未 | catalog 外 skill 探索。waxa-eval gate 前提あり→要確認 |
| skill-selector | 保留 | 未 | apm catalog 前提。自分の catalog 運用次第 |
| waxa-eval | 保留 | 未 | mizchi waxa CLI 依存。使うか要判断 |

## ai

| skill | 推奨 | 正規化 | メモ |
|---|---|---|---|
| review-image | 保留 | 未 | OpenRouter VLM。Deno script 同梱。汎用性あり |
| vlmkit | 保留 | 未 | @mizchi/vlmkit 依存。個人ツール |

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
| access-app-setup | 残 | 未 | |
| deploy | 残 | 未 | |
| ~~mbt-worker-bundle~~ | 削除済 | - | MoonBit 依存(2026-06-28 削除) |
| workers-otel-utels | 保留 | 未 | utels(mizchi)依存。OTel 部分は汎用 |

## devops

| skill | 推奨 | 正規化 | メモ |
|---|---|---|---|
| actions-ci-tuning | 残 | 未 | 汎用 GHA |
| flaker-storage-cache-on-ci | 保留 | 未 | @mizchi/flaker 依存 |
| gh-fix-ci | 残 | 未 | 汎用 |
| opentelemetry | 残 | 未 | platform 非依存 |
| otel-node | 残 | 未 | |
| workers-cd-rollback | 残 | 未 | Cloudflare Workers CD |

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
| crd-from-typed-schema | 保留 | 未 | k8s 使うか次第 |

## lang (MoonBit/Gleam → 消)

| skill | 推奨 | 正規化 | メモ |
|---|---|---|---|
| ~~gleam-practice~~ | 削除済 | - | Gleam(2026-06-28 削除) |
| ~~moonbit-js-binding~~ | 削除済 | - | MoonBit(2026-06-28 削除) |
| ~~moonbit-practice~~ | 削除済 | - | MoonBit(2026-06-28 削除) |
| rust | 保留 | 未 | Rust 使うか次第。中身が薄い("guideline" のみ) |
| translate-programming-language | 保留 | 未 | 言語間移行。汎用だが重い |
| ~~ts2moonbit-migration~~ | 削除済 | - | MoonBit(2026-06-28 削除) |

## node

| skill | 推奨 | 正規化 | メモ |
|---|---|---|---|
| pi-coding-agent | 保留 | 未 | @mariozechner/pi 依存 |
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
| justfile | 保留 | 未 | mizchi は pkfire 推奨と明記。自分は just 使う?→要確認 |
| nix-setup | 保留 | 未 | devbox/Nix 使うか次第。MoonBit template 含む |
| tech-trend-watch | 残 | 未 | 汎用 |
| upstream-fix-and-pin | 保留 | 未 | mizchi 運用色だが内容は汎用的 |
| utels-project-bootstrap | 保留 | 未 | utels(mizchi)依存 |

## tools

| skill | 推奨 | 正規化 | メモ |
|---|---|---|---|
| waxa | 保留 | 未 | waxa CLI 本体。waxa-eval とセット |
| waxa/examples/echo-skill/... | 消 | - | 動作確認用サンプル。catalog に出す必要なし |

## 集計(推奨ベース)

- 残: Frontend 14 + AWS 4 + cloudflare 2 + devops 5 + sql 4 + testing 2 + tooling 7 + meta 4 + node 1 = **約 43**
- 消: MoonBit/Gleam 系 7 + chezmoi 1 + echo-skill 1 = **約 9**
- 保留(個別判断): **約 18**

## 次アクション

1. `消` を一括削除して MoonBit/Gleam 等を整理(別 commit)
2. `保留` を上から個別に相談して残/消を確定
3. `残` を正規化ルールに沿って 1 つずつ精査(優先度: meta → 使用頻度高いカテゴリ)
