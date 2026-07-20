# Vendored Skills

外部リポジトリから取り込んだ(vendoring した)skill の出自と同期状態を記録する。

配置は agent-kit の領域カテゴリ(`skills/<領域>/`)に分散しているため、
「どれが外部由来でどのコミットから来たか」はここで一元管理する。

## 同期の考え方

- vendoring = コピー取り込み。上流が更新されても自動では入らない。
- 上流差分を確認するには `scripts/check-vendored.sh` を使う(下記コミットと最新を比較)。
- 取り込み後にローカルで改造した場合は、改造列と備考に書く(差分取り込み時に上書き注意)。

## 2026-07-20 全リセット

vendored 60本を**上流 HEAD の内容そのまま(改造なし)に全リセット**した。
方針: クリーンな上流状態を起点に、必要になったものから少しずつカスタマイズし直す。

- リセット直前のカスタム済み状態は commit `0fd8ec3` に全て残っている。
  旧カスタムの内容一覧(どの skill に何の改造が入っていたか)も同コミットの VENDORED.md にある。
  再カスタマイズ時はそこから個別に拾える: `git show 0fd8ec3:skills/<path>/SKILL.md`
- 例外: `skills/tools/waxa`(mizchi 由来の CLI ツール)はリセット対象外。
  Deno 未導入環境のため Bun 移植版を維持([[理由は INVENTORY 参照]])。

リセットにより既知の「上流の壊れ参照」が復活している(存在しない skill への参照、
mizchi/mattpocock 個人環境前提など)。何が壊れているかは
[`INVENTORY.md`](INVENTORY.md) の「要カスタム」節を参照。

---

## mattpocock/skills

- Source: https://github.com/mattpocock/skills
- License: MIT (Copyright (c) 2026 Matt Pocock)
- Vendored commit: `9603c1cc8118d08bc1b3bf34cf714f62178dea3b`
- Vendored date: 2026-07-20(全リセットで再取り込み。初回取り込みは 2026-07-19)
- Upstream commit date: 2026-07-16
- 改造: **全12本なし**(上流 verbatim)

| agent-kit の配置 | 上流パス | 備考 |
|---|---|---|
| `skills/meta/grilling` | `skills/productivity/grilling` | 1問ずつ計画/設計を詰める |
| `skills/meta/handoff` | `skills/productivity/handoff` | 会話を引き継ぎ文書に圧縮 |
| `skills/testing/tdd` | `skills/engineering/tdd` | red-green-refactor |
| `skills/backend/codebase-design` | `skills/engineering/codebase-design` | deep module 設計語彙 |
| `skills/backend/domain-modeling` | `skills/engineering/domain-modeling` | ドメインモデル/ADR/用語集 |
| `skills/tooling/diagnosing-bugs` | `skills/engineering/diagnosing-bugs` | 難バグ/性能劣化の診断ループ |
| `skills/tooling/resolving-merge-conflicts` | `skills/engineering/resolving-merge-conflicts` | マージ/リベース衝突の解消 |
| `skills/tooling/git-guardrails-claude-code` | `skills/misc/git-guardrails-claude-code` | 危険 git を hook でブロック。**Claude Code 専用** |
| `skills/tooling/code-review` | `skills/engineering/code-review` | ⚠️ 上流のまま=`/setup-matt-pocock-skills` と `docs/agents/issue-tracker.md` 前提。要カスタム |
| `skills/tooling/prototype` | `skills/engineering/prototype` | 使い捨てプロトタイプで設計検証 |
| `skills/tooling/research` | `skills/engineering/research` | 軽量な一次情報調査。deep-research plugin と用途近接 |
| `skills/meta/setup-agent-kit` | `skills/engineering/setup-matt-pocock-skills` | ⚠️ ディレクトリ名のみローカル命名。中身は上流のまま(skill 名も `setup-matt-pocock-skills`)。要カスタム |

---

## mizchi/skills

- Source: https://github.com/mizchi/skills
- License: リポジトリに LICENSE ファイルは無いが、上流 README の License 節に
  「各 skill 内の `LICENSE.txt` が優先、無い skill は MIT 既定」と明記。
  `cloudflare/deploy` と `devops/gh-fix-ci` のみ Apache-2.0 の `LICENSE.txt` 同梱。
- Vendored commit: `7a0d72866a0bb3e9ac3e2768c328b09ba2bc40c4`
- Vendored date: 2026-07-20(全リセットで再取り込み。初回取り込みは 2026-06-28、当時の base は `d799945`)
- 改造: **全48本なし**(上流 verbatim)

**上流パスの対応**: 全48本、`skills/<カテゴリ>/<名前>` から `skills/` を除いたものが
そのまま上流パス(例: `skills/sql/lint` ← 上流 `sql/lint`)。リネームなし。

対象48本(カテゴリ別):

- `ai/`: review-image ・ vlmkit
- `aws/`: ecs-codedeploy-blue-green ・ ecs-service-connect-ipv6 ・ github-oidc-scoped-role ・ vault-mfa-iam
- `cloudflare/`: access-app-setup ・ deploy
- `devops/`: actions-ci-tuning ・ flaker-storage-cache-on-ci ・ gh-fix-ci ・ opentelemetry ・ otel-node ・ workers-cd-rollback
- `frontend/`: review-ci ・ review-deps ・ review-hygiene ・ review-performance ・ review-security ・ review-state ・ review-testing ・ review-triage ・ review-weekly
- `lang/`: translate-programming-language
- `meta/`: empirical-prompt-tuning ・ extract-glossary ・ optimizing-descriptions ・ retrospective-codify ・ skill-finder ・ skill-selector ・ waxa-eval
- `node/`: pi-coding-agent ・ sqlite-vec
- `sql/`: lint ・ plan-audit ・ schema-audit ・ security
- `testing/`: playwright-cli ・ playwright-test
- `tooling/`: apm-usage ・ ast-grep-practice ・ conventional-changelog ・ dep-lib-review ・ dotenvx ・ justfile ・ nix-setup ・ tech-trend-watch ・ upstream-fix-and-pin

### 過去に import して削除済みの skill(13ディレクトリ)

check-vendored.sh の対象外。再取り込みするなら上流の同パスから。

- MoonBit 系(非スタック): `lang/gleam-practice` `lang/moonbit-js-binding` `lang/moonbit-practice` `lang/ts2moonbit-migration` `sql/sqlc-gen-moonbit-safety` `cloudflare/mbt-worker-bundle`
- mizchi 個人環境向け: `meta/mizchi-blog-style` `meta/tech-article-reproducibility` `tooling/chezmoi-management` `tooling/utels-project-bootstrap`
- 2026-07 監査での削除: `cloudflare/workers-otel-utels`(utels 未使用)`k8s/crd-from-typed-schema`(k8s 非スタック)`frontend/review-perspectives`(perspective 層廃止、5 skill)

なお上流 HEAD には import 対象外の新 skill(formal-methods 系ほか)もあるが、未取り込み。
