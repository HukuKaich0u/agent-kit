# Vendored Skills

外部リポジトリから取り込んだ(vendoring した)skill の出自と同期状態を記録する。

配置は agent-kit の領域カテゴリ(`skills/<領域>/`)に分散しているため、
「どれが外部由来でどのコミットから来たか」はここで一元管理する。

## 同期の考え方

- vendoring = コピー取り込み。上流が更新されても自動では入らない。
- 上流差分を確認するには `scripts/check-vendored.sh` を使う(下記コミットと最新を比較)。
- 取り込み後にローカルで改造した場合は、その旨を備考に書く(差分取り込み時に上書き注意)。

---

## mattpocock/skills

- Source: https://github.com/mattpocock/skills
- License: MIT (Copyright (c) 2026 Matt Pocock)
- Vendored commit: `9603c1cc8118d08bc1b3bf34cf714f62178dea3b`
- Vendored date: 2026-07-19
- Upstream commit date: 2026-07-16

| agent-kit の配置 | 上流パス | 改造 | 備考 |
|---|---|---|---|
| `skills/meta/grilling` | `skills/productivity/grilling` | なし | 本体。自動発火。1問ずつ計画/設計を詰める |
| `skills/meta/handoff` | `skills/productivity/handoff` | なし | 会話を引き継ぎ文書に圧縮 |
| `skills/testing/tdd` | `skills/engineering/tdd` | なし | red-green-refactor。`tests.md`/`mocking.md` 添付。`CONTEXT.md` は任意参照 |
| `skills/backend/codebase-design` | `skills/engineering/codebase-design` | なし | deep module 設計語彙。`DEEPENING.md`/`DESIGN-IT-TWICE.md` 添付 |
| `skills/backend/domain-modeling` | `skills/engineering/domain-modeling` | なし | ドメインモデル/ADR/用語集。`ADR-FORMAT.md`/`CONTEXT-FORMAT.md` 添付 |
| `skills/tooling/diagnosing-bugs` | `skills/engineering/diagnosing-bugs` | なし | 難バグ/性能劣化の診断ループ。`scripts/hitl-loop.template.sh` 添付 |
| `skills/tooling/resolving-merge-conflicts` | `skills/engineering/resolving-merge-conflicts` | なし | マージ/リベース衝突の解消 |
| `skills/tooling/git-guardrails-claude-code` | `skills/misc/git-guardrails-claude-code` | なし | 危険 git を hook でブロック。**Claude Code 専用**(Codex 不可) |
| `skills/tooling/code-review` | `skills/engineering/code-review` | **あり** | Standards+Spec 2軸レビュー。issue-tracker 依存を書き換え(下記) |
| `skills/meta/setup-agent-kit` | `skills/engineering/setup-matt-pocock-skills` | **あり** | リネーム+agent-kit 向けに調整。テンプレ4種同梱(下記) |
| `skills/tooling/prototype` | `skills/engineering/prototype` | なし | 使い捨てプロトタイプで設計検証。`LOGIC.md`/`UI.md` 添付 |
| `skills/tooling/research` | `skills/engineering/research` | なし | 軽量な一次情報調査→repo に Markdown。deep-research plugin と用途が近接 |

### 取り込み時の注意

- **code-review**(改造あり / 2026-07-20): `docs/agents/issue-tracker.md` が Spec 軸のソース。
  上流の `/setup-matt-pocock-skills` 依存を `setup-agent-kit` skill に差し替え済み。
  あわせて「issue-tracker.md が無くても Spec 軸は step 2 のフォールバック(引数パス /
  repo 内 spec ファイル)で動く。GitHub remote があれば `gh issue view` が既定」を明記。
  上流差分を取り込む際、SKILL.md の該当2行(13行目付近・spec 探索順の1項目)は上書き注意。

- **setup-agent-kit**(改造あり / 2026-07-20): 上流 `setup-matt-pocock-skills` の移植。
  ほぼそのまま移植する方針で、テンプレート4種(`issue-tracker-github/gitlab/local.md`、
  `triage-labels.md`、`domain.md`)も同梱。加えた変更:
  - skill 名・見出し・文言を `setup-agent-kit` / agent-kit 向けにリネーム
  - 対象 skill の説明を agent-kit の実態(現状 `code-review` の Spec 軸)に合わせた
  - Section B(triage ラベル)は「agent-kit は triage skill を同梱しないので通常スキップ」と明記
  - `issue-tracker-github.md` / `issue-tracker-local.md` の「fetch the relevant ticket」節に、
    issue 番号が無い場合の repo 内 spec フォールバック(`docs/` `specs/` `.scratch/`)を追記
  上流の `agents/openai.yaml`(Codex 用 policy)は未取り込み。
  なお triage / to-tickets / to-spec / qa / wayfinder 等、テンプレが言及する skill は agent-kit 未導入。
  将来取り込むならテンプレの該当節がそのまま効く。
- **research**: 既存の `plugins/deep-research` と用途が近接。トリガーが被り得るので、
  project 側で apm.yml に入れる際はどちらを使うか意識する。
- **domain-modeling / diagnosing-bugs / tdd**: `CONTEXT.md` や `docs/adr/` を任意参照するが、
  無くても動作する(あれば読む、なければ domain-modeling が作る)。

---

## mizchi/skills

- Source: https://github.com/mizchi/skills
- License: リポジトリに LICENSE ファイルは無いが、上流 README の License 節に
  「各 skill 内の `LICENSE.txt` が優先、無い skill は MIT 既定」と明記。
  `cloudflare/deploy` と `devops/gh-fix-ci` のみ Apache-2.0 の `LICENSE.txt` 同梱(ローカルにも保持済み)。
- Vendored commit: `d7999453cdb4e0e09df1c7f82fd23752539c546c`
- Vendored date: 2026-06-28(agent-kit commit `1bd245b`)
- Upstream commit date: 2026-06-25

**base commit の確定方法**(取り込み時に記録が無かったため 2026-07-20 に事後特定):
import commit `1bd245b` の内容と上流 `d799945` を全ファイル比較し、48本中47本が完全一致。
唯一の差分 `meta/empirical-prompt-tuning` は取り込み前から自作版が存在し、
mizchi 版で置換した(旧自作版は `SKILL.md.pre-mizchi-import` として一時保存後に削除済み)。

**上流パスの対応**: 全48本、`skills/<カテゴリ>/<名前>` から `skills/` を除いたものが
そのまま上流パス(例: `skills/sql/lint` ← 上流 `sql/lint`)。mattpocock と違いリネームなし。

### 全 skill 共通の改造(一括正規化、2026-06-29 `6363b2a` ほか)

- `README.md` を `scripts/gen-skill-readme.rb` による自動生成版に置換
- `SKILL-ja.md` を削除(ja 版は持たない方針、2026-07 監査)
- `SKILL.md` 末尾に「Agent compatibility」節を一律追加

下表の「改造」列は上記共通分を除いた個別改造の有無。

### 個別改造なし(共通正規化のみ・11本)

`aws/vault-mfa-iam` ・ `devops/actions-ci-tuning` ・ `lang/translate-programming-language` ・
`node/pi-coding-agent` ・ `node/sqlite-vec` ・ `sql/schema-audit` ・ `testing/playwright-cli` ・
`testing/playwright-test` ・ `tooling/ast-grep-practice` ・ `tooling/dotenvx` ・ `tooling/upstream-fix-and-pin`

### 個別改造あり(37本)

上流差分を取り込む際は下記の改造を上書きしないよう注意。

| agent-kit の配置 | 個別改造の内容 |
|---|---|
| `skills/ai/review-image` | スクリプトパス記述を harness 非依存化(Claude 以外のパス表記追加) |
| `skills/ai/vlmkit` | vrt→vlmkit 改称対応・install 参照を本リポジトリに差し替え・コマンド詳細/出力仕様を sub-skill へ委譲し大幅削減 |
| `skills/aws/ecs-codedeploy-blue-green` | トラフィック切替前の health gate 必須化、canary→100% の段階シフト規律、Boundaries 節追加 |
| `skills/aws/ecs-service-connect-ipv6` | 実サービス名(study-aws.local 等)を `<service>.<namespace>.local` にプレースホルダ化 |
| `skills/aws/github-oidc-scoped-role` | `thumbprint_list` がレガシーである旨の注記追加 |
| `skills/cloudflare/access-app-setup` | スクリプト参照先を mizchi/mnemo 外部 URL から同梱 `assets/scripts/` に変更 |
| `skills/cloudflare/deploy` | `sandbox_permissions` 記述を Claude Code 限定注記+他 harness 向け代替の案内に一般化 |
| `skills/devops/flaker-storage-cache-on-ci` | flaker 0.11.x 限定の適用範囲スコープ注記追加 |
| `skills/devops/gh-fix-ci` | 存在しない `create-plan` skill 参照を「カタログにあれば使う」条件付き表現に差し替え |
| `skills/devops/opentelemetry` | SDK 2.x 移行注記(`NodeTracerProvider` 生成)追加、削除済み workers-otel-utels への参照除去 |
| `skills/devops/otel-node` | SDK 2.x API 移行注記(`resourceFromAttributes`/`ATTR_SERVICE_NAME`)追加、workers-otel-utels 参照除去 |
| `skills/devops/workers-cd-rollback` | `moon build` 例をプロジェクト固有ビルドへの置換注記に変更、Boundaries 節追加。`assets/workflows/deploy.yml` も変更 |
| `skills/frontend/review-ci` | audit スクリプトを自作 Node 版 `scripts/audit-ci.mjs` に差し替え、app 分類連動・file:line 必須化・レポート行数上限 |
| `skills/frontend/review-deps` | audit-deps/trend-watch を自作 `.mjs` に統合、`ignored-cves.md` へのパス変更、tech-trend-watch へ委譲 |
| `skills/frontend/review-hygiene` | audit 3種を自作 `scripts/audit-hygiene.mjs` に統合、similarity 観点削除、file:line 必須化 |
| `skills/frontend/review-performance` | React 19 / Compiler 導入時の判定手順追加、iot-ops 固有表現を汎用化 |
| `skills/frontend/review-security` | audit-security を自作 `.mjs` 化(出力に file+line 付与)、Boundaries 強化 |
| `skills/frontend/review-state` | app 分類連動ステップ追加・file:line 必須化・Related 整理 |
| `skills/frontend/review-testing` | audit-coverage を自作 `.mjs` 化(suite 実行は `--run` 明示オプトイン)・Related 整理 |
| `skills/frontend/review-triage` | audit-triage を自作 `.mjs` に統合、app 分類ルール明文化、checklist/phase 参照を廃止 |
| `skills/frontend/review-weekly` | 5 perspective 並列 dispatch を廃止し、オーケストレーター自身が統合する synthesis 方式に変更 |
| `skills/meta/empirical-prompt-tuning` | 旧自作版と合流。superpowers / Task tool 依存記述を汎用「fresh subagent」表現に置換 |
| `skills/meta/extract-glossary` | description 英語化・出力先を Claude 固有パスから汎用 skills dir 表記に変更 |
| `skills/meta/optimizing-descriptions` | mizchi 固有の言い回し除去、mirror 先パスの harness 非依存化、superpowers:writing-skills 参照を自前手順に置換 |
| `skills/meta/retrospective-codify` | CLAUDE.md / skills dir パスを harness 非依存化、writing-skills 参照を自前テンプレートに置換 |
| `skills/meta/skill-finder` | superpowers 参照除去(optimizing-descriptions へ差し替え)、waxa を vendored Bun 版 CLI 呼び出しに変更。`references/rejection-log.md` はローカル運用ファイル |
| `skills/meta/skill-selector` | mizchi/skills 固有参照を本リポジトリの `skills/` 参照に一般化、superpowers/chezmoi 参照除去。`references/catalog.md` はローカルで再構築済み |
| `skills/meta/waxa-eval` | npx 実行から vendored Bun 版 CLI(`tools/waxa`)呼び出しに変更、zsh の `$WAXA` 変数展開の注意点追記 |
| `skills/sql/lint` | `.sqlfluff` のルールコード修正(L009→LT12)のみ |
| `skills/sql/plan-audit` | Postgres/RDS 用 `scripts/explain-runner-pg.mjs` を自作追加(SQLite 専用→engine 拡張) |
| `skills/sql/security` | pkfire skill 依存の secretlint レシピ参照を汎用 pre-push フック案内に置換 |
| `skills/tooling/apm-usage` | グローバル install 先の説明を harness 非依存表記に変更、chezmoi-management 参照除去。`references/publishing.md` の owner 名も差し替え |
| `skills/tooling/conventional-changelog` | pkfire/chezmoi 依存の運用例を汎用タスクランナー経由の案内に置換 |
| `skills/tooling/dep-lib-review` | frontend-review-deps 関連説明を agent 直接実行方式に合わせて更新 |
| `skills/tooling/justfile` | mizchi 固有の pkfire 推奨コメントを削除し justfile 利用リポジトリ全般向けに一般化 |
| `skills/tooling/nix-setup` | mizchi/<repo> 前提の記述を汎用化、スクリプトコピー元パスを harness 非依存表記に変更 |
| `skills/tooling/tech-trend-watch` | WebFetch 不可時のフォールバック(repo-local 信号のみで報告)追加 |

### import 後に削除した skill(13ディレクトリ)

check-vendored.sh の対象外。再取り込みするなら上流の同パスから。

- MoonBit 系(非スタック): `lang/gleam-practice` `lang/moonbit-js-binding` `lang/moonbit-practice` `lang/ts2moonbit-migration` `sql/sqlc-gen-moonbit-safety` `cloudflare/mbt-worker-bundle`
- mizchi 個人環境向け: `meta/mizchi-blog-style` `meta/tech-article-reproducibility` `tooling/chezmoi-management` `tooling/utels-project-bootstrap`
- 2026-07 監査での削除: `cloudflare/workers-otel-utels`(utels 未使用)`k8s/crd-from-typed-schema`(k8s 非スタック)`frontend/review-perspectives`(perspective 層廃止、5 skill)
