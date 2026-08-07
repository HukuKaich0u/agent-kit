---
created: 2026-07-20
updated: 2026-08-07
author: Koki Aoyagi
type: reference
---

# Vendored Skills

外部リポジトリから取り込んだ(vendoring した)skill の出自と同期状態を記録する。

## 方針(2026-07-20 更新)

- **curated set**: 上流 2 repo を倉庫として完全ミラーせず、1クラスタずつ吟味して残す。
- 判断は **維持 / カスタマイズ / 保留 / 削除** の4状態で行い、削除したものは Git 履歴か上流から復元する。
- **上流 verbatim**: vendored `SKILL.md` 本体は上流そのまま・ローカル改造なしを基本とし、
  使うものから少しずつカスタマイズする。隣接 `README.md` はagent-kit用install案内を自動生成する。
  `SKILL.md` を改造したらこのファイルに記録する。
- 2026-07-20 以前のカスタム済み状態(壊れ参照修正・自作 audit スクリプト等)は
  commit `0fd8ec3` に保全してある。再カスタム時はそこから個別に拾える:
  `git show 0fd8ec3:skills/<path>/SKILL.md`
- 上流差分の確認は `scripts/check-vendored.sh`(検知のみ、取り込みは手動)。
- 例外: `skills/tools/waxa`(mizchi 由来の CLI ツール)は Deno 未導入環境のため
  Bun 移植版を維持(上流 verbatim ではない)。

上流の壊れ参照(存在しない skill への参照、mizchi/mattpocock 個人環境前提)は
[`meta/ask-koki/references/catalog.md`](meta/ask-koki/references/catalog.md) の
🔧 行(Use when 列)に要点を記載する。

---

## mizchi/skills(36本)

- Source: https://github.com/mizchi/skills
- License: リポジトリに LICENSE ファイルは無いが、上流 README の License 節に
  「各 skill 内の `LICENSE.txt` が優先、無い skill は MIT 既定」と明記。
  `devops/gh-fix-ci` のみ Apache-2.0 の `LICENSE.txt` 同梱。
- Vendored commit: `7a0d72866a0bb3e9ac3e2768c328b09ba2bc40c4`
- Vendored date: 2026-07-20(初回 import は 2026-06-28 の `d799945`)
- 改造: **2本**(`meta/skill-finder`、および `tooling/tech-trend-watch` — 2026-07-26 に削除した dep-lib-review への参照 2 箇所を frontend/review-deps へ付け替えた最小修正)。`meta/skill-selector` は 2026-07-26 に上流 verbatim へ復元(下記)。残りは上流 verbatim。

### 2026-07-26 — skill-selector を上流 verbatim へ復元、カタログは ask-koki へ移設

skill 選定の実務は自作 `skills/meta/ask-koki`(router)が担う体制へ変更。
`meta/skill-selector` は mizchi 本家の原設計(外部レジストリ横断)を参照在庫として
verbatim で保持する。一次カタログ `references/catalog.md` は
`skills/meta/ask-koki/references/catalog.md` へ移設し、2026-07-26 の skill 監査
(`docs/skill-audit-2026-07-26.md`)の結果で状態列を更新した。
下記 2026-07-24 の skill-selector 改造記録は当時の記録として残す(現状とは異なる)。

### 改造記録(2026-07-24 — skill 選定・探索の基盤を agent-kit 化)

`meta/skill-selector` と対の `meta/skill-finder` を上流 mizchi の外部前提から agent-kit 専用に改造した。

| skill | 改造内容 |
|---|---|
| `skills/meta/skill-selector` | `references/catalog.md` を mizchi 外部レジストリの一覧から**このリポジトリ現存78本**の一次カタログへ全面再構築(install 文字列を `HukuKaich0u/agent-kit/skills/<path>` に統一、状態列を INVENTORY の ✅/🔧/⏸/🎯 に対応、削除済み MoonBit/Gleam/Cloudflare/AWS/dotenvx/Nix/pkfire/chezmoi 等の行を一掃)。SKILL.md のシグナル例・APM 0.12/`--frozen-lockfile` 記述・Related の superpowers/chezmoi 参照・同期先 `mizchi/skills` を修正。`evals/` の scenario-a/b を現行スタック(TS+Playwright / Rust+SQL)へ作り直し、ledger をリセット |
| `skills/meta/skill-finder` | waxa 呼び出しを Bun 版(`bun run src/cli.ts`、npx はフォールバック)へ、自動 `iterate` を使用停止(one-shot 評価 + 人間承認)に。非冗長ペア例・Related・rejection-log の `superpowers:writing-skills`/`chezmoi` を現存 skill(`writing-great-skills` 等)へ、fork 先を `mizchi/skills` からこの repo へ、`nix-setup/evals` 参照・`executor: claude-cli`・`self_report` 表記を修正。ledger をリセット。外部ソース表の `obra/superpowers` 等は探索先として維持 |

**上流パスの対応**: 選定した skill を `skills/<上流パス>` にそのまま配置(リネームなし)。
`scripts/check-vendored.sh` は上流の skill を自動検出し、明示的な除外を飛ばして残した skill の更新を確認する。

カテゴリ別(36本):

- `ai/` 2 ・ `devops/` 4 ・ `formal-methods/` 2
- `frontend/` 8
- `lang/` 1 ・ `meta/` 8 ・ `sql/` 2 ・ `testing/` 2 ・ `tooling/` 7

**除外済み(2026-07-20):**

- `cloudflare/mbt-worker-bundle`
- `lang/moonbit-js-binding`
- `lang/moonbit-practice`
- `lang/ts2moonbit-migration`
- `sql/sqlc-gen-moonbit-safety`

MoonBit 固有の実装知識は不要だが、これらに見られる段階的開示、失敗パターン、実行可能な assets、
境界とコアの分離、検証ゲートといった設計は、TypeScript / Rust 等の skill を吟味・改善するときに応用する。

**除外済み(2026-07-22):**

- `cloudflare/workers-otel-utels` — Cloudflare Workersのfetch境界OTLP、D1遅延検知、utels例外通知を
  約1,500行のTypeScript assetsにまとめたskill。utelsを使わず、欠落referencesとpnpm前提があり、
  必要になった時点で小さいWorkers固有計装を改めて設計するため削除
- `k8s/crd-from-typed-schema` — Kubernetes operator / CRD自作時のStructural Schema専用知識で
  現在のスタック外。本文が同梱済みとする `examples/adapter.ts` も存在しないため削除
- `meta/mizchi-blog-style` — mizchi本人の記事構成・文体・定型句を模倣する個人専用skill。
  自分の技術記事や個人essayの声を作る用途と合わないため削除
- `tooling/chezmoi-management` — mizchi固有のdotfiles remote、Nix / home-manager、pkfire、APM配置、
  絶対pathに依存する個人運用メモ。汎用操作はchezmoi公式docsで代替でき、現在未採用のため削除
- `tooling/utels-project-bootstrap` — utels.devへのproject登録とCloudflare Workerのsecret更新を行う
  専用helper。利用側の `cloudflare/workers-otel-utels` も削除済みで、汎用的なsecret受け渡し原則は
  実際に必要なservice向けworkflowで改めて設計するため削除
- `node/pi-coding-agent` — `@mariozechner/pi-coding-agent` をNodeに組み込み、独自agent CLI・extension・
  packageを作るための特定SDK専用reference。現在の利用実績がなく、採用するprojectで
  最新の上流docsとともに再導入する方が確実なため削除
- `devops/flaker-storage-cache-on-ci` — `@mizchi/flaker` 導入済みrepoでDuckDB履歴を
  GitHub Actions cache間で持ち回る特定CLIの補助skill。現在の利用実績がなく、flaker本体を
  採用するprojectでsetup / management / storageを一組で再評価するため削除
- `frontend/review-weekly` — 欠落したaudit scripts / checklist / KPI assetsとperspective 5本を前提とする
  週次consulting orchestrator。週次自動運用はせず、domain review 8本を必要時に手動起動するため削除
- `frontend/review-perspectives/frontend-expert`
- `frontend/review-perspectives/frontend-ops-expert`
- `frontend/review-perspectives/performance-expert`
- `frontend/review-perspectives/react-expert`
- `frontend/review-perspectives/security-expert`
- `lang/gleam-practice` — Gleam / OTP / Wisp / Mist固有で現在使う予定がなく、TypeScript / Rustへ残す
  独立workflowもないため削除

perspective 5本はdomain reviewのraw出力を専門家人格で再解釈する二次report層で、既存skillと重複する。
移行元 `mizchi/frontend-review` は現在取得不能で、mizchi配下の公開code検索でも参照先assetsは見つからなかった。
CWV / bundle / React hooks / RSC / CVE reachability / release hygiene等の固有観点は、残したdomain skillを
カスタマイズするときに必要なものだけ回収する。

**除外済み(2026-07-26):**

- `tooling/dep-lib-review` — pnpm 専用の依存更新 runbook。CVE の攻撃ベクトル triage は
  `frontend/review-deps` とほぼ同一で、固有価値だった更新バッチ戦略・codemod 手順・
  Renovate/Dependabot 確認・anti-patterns を `frontend/review-deps` の承認制
  update-execution モードとして吸収統合したうえで削除。参照していた
  `tech-trend-watch`・`skill-finder`・`lang/typescript` は review-deps へ付け替えた


- `ai/review-image` — OpenRouter vision model で単画像を判定する Deno スクリプト2本
  (freeform 版と CI gate 版)。スクリプトが `Deno.env` 等の Deno 専用 API 直書きで
  Bun 環境では実行不可、API cost 上限ガードもない。ユーザーが使わないと判断したため
  削除。VRT を組む際に必要になれば、上流から取得して waxa と同様の Bun 移植で再導入する。
  `ai/vlmkit` 本文に例示として名前が残るが一般例のため verbatim を維持

**除外済み(2026-07-24):**

- `cloudflare/deploy` — Cloudflare製品全般を対象とする巨大なplatform referenceで、自分たちのaccount・
  environment・binding・承認境界に合わせて作り直す必要があるため削除
- `devops/workers-cd-rollback` — MoonBit build、固定branch、dotenvx構成など個別前提が強く、
  deploy方式とdata migrationを含めて自分たちのproject用に設計し直すため削除
- `aws/ecs-codedeploy-blue-green` — ECS blue/greenのdeploy・traffic切替を特定構成で行うrunbook。
  実際のIaC・network・rollback方針に合わせた専用品を作るため削除
- `aws/ecs-service-connect-ipv6` — 特定のService Connect / IPv6障害と構成名に寄ったrunbookで、
  自分たちのnetwork構成を正として作り直すため削除
- `aws/vault-mfa-iam` — IAM user・aws-vault・TOTPを前提にした認証runbookで、
  自分たちが採用するidentity / role構成に合わせて作り直すため削除
- `cloudflare/access-app-setup` — app・policy・service tokenの一括作成を説明する一方、同梱scriptは
  app作成しか実装しておらず、CLI引数・更新・policy・token処理も欠ける。必要時に実構成用として作り直すため削除
- `aws/github-oidc-scoped-role` — GitHub Actions OIDCの汎用設定とBedrock用agent roleが混在し、
  `sub`必須・ReadOnlyAccess・Marketplace権限に現行仕様と異なる前提があるため、必要最小権限で作り直す目的で削除
- `node/sqlite-vec` — Node 24、experimental flag、extension load、Vitest非互換に古い断定を含む
  pre-v1 library専用recipe。実際にvector storageを採用するprojectでruntimeとversionを決めて作り直すため削除
- `sql/lint` — sqlcが検出するcatalog形式エラーと、`SELECT *`・`LIKE '%...%'`の粗い正規表現判定が中心。
  SQLFluffやproject既存lintへ統合する方がよく、独立skillとして維持しないため削除
- `sql/security` — 1行・大文字SQLだけを見るtext scannerで、複数行query・data flow・Goを検査できず、
  clean exitが安全を示さない。parameter binding規約とAST / taint reviewへ作り直すため削除
- `tooling/dotenvx` — 未採用のsecret管理toolに対する古いrunbook。非推奨 `.env.vault`、現在存在する
  `rotate` の欠落、PR codeへprivate keyを渡すActions例、version未固定installerを含むため削除。
  採用時に実際のsecret managerとCI trust boundaryに合わせて作り直す
- `tooling/nix-setup` — Nix / devbox未採用で、開発環境はprojectごとに設計する方針。
  MoonBit等の非対象言語、個人home-manager、Claude Code web、古いAPM derivation、sandbox無効installerを
  含む巨大bundleを共通skillとして保持せず、必要なrepoで最小構成を作るため削除

---

## mattpocock/skills(32本)

- Source: https://github.com/mattpocock/skills
- License: MIT (Copyright (c) 2026 Matt Pocock)
- Vendored commit: `84fdeffd12f2ee307994d1eb6feb48173b6e0502`
  (2026-08-07 に `ed37663` から更新。上流 v1.2.0〜1.2.3、106 commit 分。
  取り込みの詳細は下記 2026-08-07 の改造記録)
- Vendored date: 2026-08-07(完全ミラー化は 2026-07-20。初回取り込みは 2026-07-19 の 11本)
- Upstream commit date: 2026-08-06
- 改造: 下記「改造記録」参照。design record 系の改造は 2026-07-26 に撤回した。

### 改造記録(2026-08-07 — 上流 v1.2.0〜1.2.3 の一括取り込み)

上流 `ed37663..84fdeff`(106 commit)を取り込んだ。方法は「上流 diff を
patch / 3-way merge でローカルへ適用」で、既存のローカル改造は保持した。
conflict は各 1〜2 箇所で、次の方針で解決した:

- `tooling/code-review` — 上流の PRD→spec 用語統一と subagent 呼び出しの
  harness 中立化(Claude Code 固有のツール名削除)を採用。working tree /
  branch の 2 mode と spec 探索順(implement context 優先)のカスタムは維持
- `meta/ask-matt` — 上流の phase boundary decision tree
  (`PHASE-BOUNDARIES.md` 新規同梱)、wayfinder 誤用 2 パターンへの警告、
  handoff の役割限定、`/grilling`・`/resolving-merge-conflicts`・
  `/wizard`・`/to-questionnaire`・`/wait-what` への route を採用。
  smart zone の model 依存表記・会話中 bug の起票導線・implement の
  承認境界記述・`/setup-agent-environment` 参照のカスタム 4 点は維持。
  escape hatch は上流に合わせ `/handoff` から「phase boundary で
  `/compact`」へ変更(handoff 限定化と整合するため)
- `tooling/triage` — 上流の grill round 化の文言と、ローカルの
  「CONTEXT.md/ADR 更新は propose」承認境界を合成
- `tooling/wayfinder` — 上流の Grilling type 文言と italics 表記を採用。
  Task type の外部 service / credential / data 承認例外は維持
- `backend/improve-codebase-architecture` — 上流の変更は Explore subagent
  呼び出しの harness 中立化だが、ローカルは 2026-07-25 の再設計で
  subagent 自動起動自体を廃止済みのため、ローカル本文を維持
- `meta/setup-agent-environment` — issue tracker explainer と triage
  labels の単一質問化・local tracker の 1 ticket 1 file 化を採用。
  Section C/D 等のカスタムは維持

上流の構造変更にも追従した:

- **改名**: `meta/writing-great-skills` → `meta/writing-for-agents`
  (上流 breaking rename)。対象が skill から「agent が読む文書全般」へ
  広がり、GLOSSARY.md は SKILL.md へ統合、skill 固有 mechanics は
  `SKILL-MECHANICS.md` へ分離、model-invoked 化。参照側 6 file
  (retrospective-codify / empirical-prompt-tuning / waxa-eval /
  skill-finder 本文+rejection-log / optimizing-descriptions)と
  ask-koki catalog・`scripts/check-vendored.sh` を追従。
  `docs/skill-audit-2026-07-26.md` は当時の記録のため旧名のまま
- **昇格**: `in-progress/wizard` → `tooling/wizard`(上流 engineering、
  model-invoked 化・time estimate 削除)、`in-progress/to-questionnaire`
  → `meta/to-questionnaire`(上流 productivity)。従来ローカルで wizard に
  付けていた「秘密情報の安全化まで保留」は、上流昇格版の hidden secret
  entry と書き出し前 stage list 確認を確認のうえ解除(ユーザー判断)
- **新規採用**: `meta/wait-what`(冗長回答の一語矯正、上流 productivity)
- **削除追従**: `deprecated/qa`(上流は triage / to-tickets に吸収済みと
  して削除。2026-07-20 の「要カスタム候補として原形維持」判断を上書き)、
  `in-progress/batch-grill-me`(grilling 本体の round-by-round 化に吸収)。
  いずれもユーザー承認済み

**訂正**: `testing/tdd`(mocking.md / tests.md 冒頭の Rust / Go / Python /
TypeScript スタック注記)と `tooling/prototype`(SKILL.md step 6 の
commit 提案→承認境界)にはローカル改造があったが、この表に未記録だった
(2026-07-26 の監査時の修正とみられる)。今回の取り込みでも維持しており、
ここに記録する。

検証: `scripts/check-vendored.sh` で上流 HEAD との差分が既知のローカル
改造のみであることを確認し、`ruby scripts/gen-skill-readme.rb` で README を
再生成した。

### 改造記録(2026-07-27 — Delivery batch 層の追加と flow 接続を setup へ寄せる)

自作 `tooling/batch-tickets`(ticket を人間が 1 PR として review できる batch へ
束ねる)を追加した。`to-tickets` が切る単位は agent の fresh context に合わせた
もので、人間の review 単位と一致しない。そのまま PR にすると review 負荷が ticket
数に比例して増える。ai-agent-workforce-core の実運用文書から repo 固有部分
(`dev`→`main` release、SemVer、pnpm / Terraform、merge commit 方針)を除いて
skill 化した。

`to-tickets` 本体に節を足す案は採らなかった。2026-07-26 に上流 verbatim へ復元
した方針を再び崩すため。また ticket 分解と PR 単位への束ねは工程として別で、
skill 境界としても分かれるのが自然。

**flow の接続は skill 本体に書かず `setup-agent-environment` に寄せた。** 上流は
`to-tickets` 末尾の `/implement` 案内 1 行を `ed37663` で削除しており(上記
Vendored commit 注記)、skill 単体が次工程を名指ししない設計を取っている。この
設計は保ったまま、repo 側の `docs/agents/development-flow.md` と CLAUDE.md /
AGENTS.md の `## Agent skills` に flow を書き出すことで接続する。2026-07-26 に
削除した design-record 規約の scaffold と同じ場所に再び独自ブロックを足すが、
今回書くのは特定の spec 運用ではなく「どの skill がどの順で何を出すか」であり、
`batch-tickets` を install した repo でのみ生成される(Section D は skill 未
導入なら skip)。

| skill | 内容 |
|---|---|
| `skills/tooling/batch-tickets` | 新規自作。batch 境界規則、承認後の親 spec への plan 記録(local tracker は `.scratch/<feature-slug>/delivery-plan.md`)、plan は単一で in-place 更新、`to-tickets` が全 ticket へ付けた `ready-for-agent` を先頭 batch へ絞る |
| `skills/meta/setup-agent-environment` | Section D(開発フロー)を追加。`batch-tickets` 導入時のみ実行し、branch 命名と PR base を確認して `docs/agents/development-flow.md` と `## Agent skills` の `### Development flow` を生成。seed template `development-flow.md` を同梱。Explore に skill 導入検出と default branch / 既存 branch 命名の調査を追加 |
| `skills/tooling/implement` | ticket 着手前に親 spec の Delivery plan と repo の開発フロー記述を読み、batch の branch で作業する指示を追加(承認境界のカスタムは維持) |

### 改造記録(2026-07-27 — commit 前の working tree review を接続)

`ask-matt` / `implement` は実装後に `code-review` を実行し、その結果を含めて
commit 案をユーザーへ提示する順序を定めている。一方、上流 `code-review` は
`git diff <fixed-point>...HEAD` の commit 済み差分しか扱わず、`implement` から
呼ぶと未 commit の実装が review 対象に入らない。description が明記する
work-in-progress review とも矛盾していたため、実運用で確認した不整合として
必要最小限の customization を加えた。

| skill | 内容 |
|---|---|
| `skills/tooling/code-review` | working tree と branch / PR の2 modeを明記。working tree mode は staged / unstaged / untracked をすべて対象にし、`implement` context の ticket / spec を最優先の照合元にする |
| `skills/tooling/implement` | commit 前の working-tree modeを明示し、元ticket / specとuntracked fileをreviewへ渡す |

### 改造記録(2026-07-26 — design record 化を撤回し開発フローを上流へ復帰)

`to-spec` を「tracker 上の可変 PRD」から「`docs/specs/` の不変 design record」へ
作り替え、`to-tickets` / `code-review` / `implement` / `ask-matt` /
`setup-agent-environment` をそれに追従させていたが、**撤回した**。

理由: matt の開発フロー(grill → to-spec → to-tickets → implement → code-review)は
skill 単体ではなく flow 全体で辻褄が合う設計で、中核概念だけ差し替えると全体の前提が
ずれる。実際に `to-spec` からは上流が中核に置いていた `## User Stories`
(「extremely extensive」)と `## Testing Decisions` が丸ごと落ち、`code-review` の
Intent 軸が照合する acceptance evidence の担い手が record から ticket へ移っていた。
この設計変更が精度に効いているかを**上流版を使い込む前に**判断できないため、
まず上流のまま運用して痛みを実測してから改めて設計し直す(ユーザー判断)。

復元は上流完全ミラー commit `c623ea6` の verbatim から行った。

| skill | 内容 |
|---|---|
| `skills/tooling/to-spec` | 上流 verbatim へ復元(PRD を tracker へ publish)。差分は `/setup-agent-environment` 参照のみ |
| `skills/tooling/to-tickets` | 同上。入力の design record 必須化・`ready-for-agent` の条件付与も撤回 |
| `skills/tooling/code-review` | 同上。第2軸を Intent から **Spec** へ戻し、spec 探索順(issue 参照 → 引数 → `docs/`/`specs/`/`.scratch/`)も上流へ |
| `skills/tooling/implement` | design record 参照を削除し上流本文へ。**承認境界(commit 提案→承認、push 禁止)は維持** |
| `skills/meta/ask-matt` | main flow / context hygiene / wayfinder hand off の記述を上流へ。smart zone の model 依存表記・会話中 bug の起票導線・improve-codebase-architecture 記述は維持 |
| `skills/meta/setup-agent-environment` | design-record 規約の scaffold(`design-records.md`、`## Agent skills` の該当ブロック、issue-tracker 3種の「design records は docs/specs」注記)を削除し上流構成へ。改名と既存規約検出は維持 |
| `skills/backend/improve-codebase-architecture` | hand off 先の `/to-spec` 説明を上流表現へ |

自作 `tooling/to-tasks`(design record 運用の重さを補う軽量経路として新設し
`6f2425a` で削除済み)は**復活させない**。上流は小さい仕事を `/implement` 直行で
受けており、design record を撤回した以上この層の存在理由がないため。

### 改造記録(2026-07-25 — wayfinder の安全化)

destination / decision ticket / fog of war の設計と明示起動専用は維持したまま、
2026-07-04 監査が挙げた安全化を適用した。当初あわせて変更した ticket の単位
(「100K token session」→「人間が一度に理解・review できる一決定」)は、
安全化ではなく flow 設計に属する判断のため 2026-07-26 に上流へ戻した。

| skill | 改造内容 |
|---|---|
| `skills/tooling/wayfinder` | 「The human owns the map」節を追加し、destination・map 本文・ticket 群と blocking edge・次に扱う frontier・resolution・map 更新の各 tracker 書き込みを提示→承認後に変更。research subagent / branch 作成を opt-in 化。外部 service・credential・権限・data 操作は ticket type を問わず個別承認。ticket の削除を廃止し close / supersede+comment で履歴保持。並行更新に対する再読込・idempotent 書き込みと、多段書き込みの部分失敗時に map へ進捗 comment を残して再開可能にする手順を追加 |

### 改造記録(2026-07-25 — ask-matt の router 記述を現行 flow へ整合)

2026-07-04 監査の残項目を解消。改名(`workflow-router` 等)は検討の上、
Matt の flow 設計思想に由来することが名前から分かる価値を取って
**現状維持**と決めた(ユーザー判断)。

| skill | 改造内容 |
|---|---|
| `skills/meta/ask-matt` | smart zone の固定値「~120k tokens」を model 依存の説明へ置換。会話中に報告された bug / request を「草案→承認→起票→/triage」で tracker に入れる導線を追加。/implement の説明を commit・tracker 更新の承認後実行に、/improve-codebase-architecture の説明を証拠ベース設計フローに更新 |

`/research`・`/teach`・`/code-review` への案内は残す(採用済みで動作する。
残る要カスタムは品質改善であり、状態は ask-koki catalog が管理)。

### 改造記録(2026-07-25 — improve-codebase-architecture を設計特化へ再設計)

上流は「自動 Explore subagent で repo を scan → CDN 依存の HTML report を
温存 dir に書いて GUI で自動起動」する独立 scanner だったが、repo-wide の
構造 scan は `backend/review-architecture` の役割と重複する。証拠
(review findings・ユーザー指名の pain point・作業中の friction)を入力に、
Markdown で3〜5候補を会話内提示 → 選ばれた一候補を `codebase-design` +
`grilling` で設計 → `/to-spec` へ渡す役割に絞った。

| skill | 改造内容 |
|---|---|
| `skills/backend/improve-codebase-architecture` | 自動 Explore subagent・HTML report(HTML-REPORT.md ごと削除)・GUI 自動起動を廃止。候補提示を Markdown 3〜5件に制限。codebase-design 用語の強制(don't drift)を project 語彙優先の推奨へ緩和。domain docs 変更は提案→承認後、design-it-twice subagent は承認制に。手順末尾に `/to-spec` への hand off を追加 |

### 改造記録(2026-07-25 — triage / implement の承認境界と外部 PR 隔離)

to-spec / to-tickets で確立した「書き込み前に全文提示→承認」の境界を
実装フローの残り2本へ展開した。triage は外部 PR のコードを現 worktree に
checkout してテスト実行する手順が untrusted code の無隔離実行になっていた点、
tracker への comment / label / close が本文提示なしに行われる点、
`.out-of-scope/` ディレクトリを repo に無断で作る点を直した。

| skill | 改造内容 |
|---|---|
| `skills/tooling/implement` | 完了時に変更・検証結果・残作業を報告し、commit(stage 対象+message)と tracker 更新を提案→承認後に実行するよう変更。push 禁止を明記 |
| `skills/tooling/triage` | 冒頭に write gate(tracker 変更は全文提示→承認後)を追加。外部 PR の検証を「diff を read-only で確認→実行が要るなら承認+隔離 worktree+secrets なし」へ変更。`.out-of-scope/` を opt-in 化(OUT-OF-SCOPE.md にも明記)。grill 手順の文言を domain-modeling の提案→承認方式に合わせた |

### 改造記録(2026-07-25 — setup-agent-kit を setup-agent-environment へ改名)

skill の役割(repo ごとの tracker / labels / domain docs の scaffold)を
repo 名でなく機能で表すため、`setup-agent-kit` を
`setup-agent-environment` へ改名した。frontmatter `name`・タイトル・
`agents/openai.yaml` の `display_name` を変更し、参照側 10 skill
(wayfinder / to-tickets / to-spec / code-review / triage /
frontend review-state・review-security・review-performance / ask-matt /
domain-modeling)と `skill-selector` catalog・`scripts/check-vendored.sh` の
上流対応表を追従。README は `gen-skill-readme.rb` で再生成。
以下の過去の改造記録に出る旧パス `skills/meta/setup-agent-kit` は当時の記録として残す。

### 改造記録(2026-07-25 — domain docs の既存規約優先化)

`grill-with-docs` 経路の相棒 `domain-modeling` と、その配置設定を scaffold する
`setup-agent-kit` を一体で改造。上流は `CONTEXT.md` / `docs/adr/` の配置を固定していたが、
既存の glossary / ADR 規約を持つ repo に並行構造を作ってしまうため、
「repo 設定(`docs/agents/domain.md`)→ 既存規約 → デフォルト」の優先順で解決するよう変更。
あわせて CONTEXT.md の即時書き込みを差分提示→承認後反映へ改めた
(to-spec / to-tickets と同じ承認境界方針)。ADR の3条件
(hard to reverse / surprising / real trade-off)は上流のまま維持。

| skill | 改造内容 |
|---|---|
| `skills/backend/domain-modeling` | SKILL.md の File structure を「Where domain docs live」(解決順つき)へ再構成、CONTEXT.md 更新を propose→confirm に変更。ADR-FORMAT.md / CONTEXT-FORMAT.md に既存規約優先の注記を追加 |
| `skills/meta/setup-agent-kit` | Explore に別名 glossary(`GLOSSARY.md` 等)・別配置 decision log(`docs/decisions/` 等)の検出を追加。Section C を「既存規約があればそれを記録」優先へ変更し、domain.md テンプレの path 書き換え指示を追加 |

### 改造記録(2026-07-24 — 配布基盤の壊れ参照修正)

上流 `setup-matt-pocock-skills` の skill 名を agent-kit 用に `setup-agent-kit` へ統一し、
それを参照する skill の `/setup-matt-pocock-skills` 呼び出しを `/setup-agent-kit` に直した。

⚠️ この表のうち **design record 化に関する記述は 2026-07-26 に撤回済み**
(先頭の「design record 化を撤回し開発フローを上流へ復帰」節を参照)。
当時の記録として残す。skill 名の参照修正だけが現在も有効。

| skill | 改造内容 |
|---|---|
| `skills/meta/setup-agent-kit` | frontmatter `name` を `setup-agent-kit` に、タイトルと `agents/openai.yaml` の `display_name` を agent-kit 用に変更。work tracker・domain docsに加え、不変design record規約をrepo設定へ追加。README は `gen-skill-readme.rb` で再生成 |
| `skills/tooling/code-review` | `/setup-matt-pocock-skills` → `/setup-agent-kit`。tracker issue / PRDを現在仕様とみなさず、design recordとwork ticketをIntent軸としてreviewするよう再設計 |
| `skills/tooling/to-spec` | tracker公開型PRDを廃止し、承認済み会話から `docs/specs/YYYY-MM-DD-<slug>.md` の不変design recordを一度だけ作成するworkflowへ再設計 |
| `skills/tooling/to-tickets` | 不変design recordを入力に、参照パス付きのwork ticketだけをconfigured trackerへ公開するworkflowへ再設計 |
| `skills/tooling/triage` | 同上 |
| `skills/tooling/wayfinder` | 同上 |
| `skills/meta/ask-matt` | `/setup-matt-pocock-skills` → `/setup-agent-kit`。main flowを不変design record → work ticketへ更新(ask-matt自体のリネームは未着手) |

**配置ルール**: 上流の `productivity` / `engineering` / `misc` は agent-kit の領域カテゴリに
振り分け。上流の `deprecated` / `in-progress` / `personal` はステータスが分かるよう
同名ディレクトリのまま(`skills/deprecated/` 等)。

| agent-kit の配置 | 上流パス |
|---|---|
| `skills/backend/codebase-design` | `skills/engineering/codebase-design` |
| `skills/backend/domain-modeling` | `skills/engineering/domain-modeling`(2026-07-25 に既存規約優先・承認後反映へ改造。改造記録参照) |
| `skills/backend/improve-codebase-architecture` | `skills/engineering/improve-codebase-architecture`(2026-07-25 に設計特化へ再設計。改造記録参照) |
| `skills/meta/ask-matt` | `skills/engineering/ask-matt`(2026-07-24 に参照修正、2026-07-25 に router 記述を現行 flow へ整合。名前は検討の上で維持。改造記録参照) |
| `skills/meta/grill-me` | `skills/productivity/grill-me` |
| `skills/meta/grill-with-docs` | `skills/engineering/grill-with-docs` |
| `skills/meta/grilling` | `skills/productivity/grilling` |
| `skills/meta/handoff` | `skills/productivity/handoff` |
| `skills/meta/setup-agent-environment` | `skills/engineering/setup-matt-pocock-skills`(2026-07-24 に `setup-agent-kit` へ改造、2026-07-25 に現名へ再改名。改造記録参照) |
| `skills/meta/teach` | `skills/productivity/teach` |
| `skills/meta/to-questionnaire` | `skills/productivity/to-questionnaire`(2026-08-07 に上流昇格へ追従し in-progress から移動) |
| `skills/meta/wait-what` | `skills/productivity/wait-what`(2026-08-07 に新規採用) |
| `skills/meta/writing-for-agents` | `skills/productivity/writing-for-agents`(2026-08-07 に上流 rename へ追従。旧 `writing-great-skills`) |
| `skills/testing/tdd` | `skills/engineering/tdd` |
| `skills/tooling/code-review` | `skills/engineering/code-review`(working tree / branch の2 modeと、commit前ticket照合をカスタマイズ) |
| `skills/tooling/diagnosing-bugs` | `skills/engineering/diagnosing-bugs` |
| `skills/tooling/git-guardrails-claude-code` | `skills/misc/git-guardrails-claude-code`(Claude Code 専用) |
| `skills/tooling/implement` | `skills/engineering/implement`(2026-07-25 に commit・tracker 更新を承認後へ改造。改造記録参照) |
| `skills/tooling/prototype` | `skills/engineering/prototype` |
| `skills/tooling/research` | `skills/engineering/research` |
| `skills/tooling/resolving-merge-conflicts` | `skills/engineering/resolving-merge-conflicts` |
| `skills/tooling/to-spec` | `skills/engineering/to-spec`(2026-07-26 に上流 verbatim へ復元。差分は `/setup-agent-environment` 参照のみ) |
| `skills/tooling/to-tickets` | `skills/engineering/to-tickets`(2026-07-26 に上流 verbatim へ復元。差分は `/setup-agent-environment` 参照のみ) |
| `skills/tooling/triage` | `skills/engineering/triage`(2026-07-25 に承認境界・外部 PR 隔離・`.out-of-scope/` opt-in へ改造。改造記録参照) |
| `skills/tooling/wayfinder` | `skills/engineering/wayfinder`(2026-07-25 に承認境界・opt-in subagent・履歴保持・部分失敗回復へ改造。改造記録参照) |
| `skills/tooling/wizard` | `skills/engineering/wizard`(2026-08-07 に上流昇格へ追従し in-progress から移動) |
| `skills/in-progress/claude-handoff` | `skills/in-progress/claude-handoff` |
| `skills/in-progress/loop-me` | `skills/in-progress/loop-me` |
| `skills/in-progress/setup-ts-deep-modules` | `skills/in-progress/setup-ts-deep-modules` |
| `skills/in-progress/writing-beats` | `skills/in-progress/writing-beats` |
| `skills/in-progress/writing-fragments` | `skills/in-progress/writing-fragments` |
| `skills/in-progress/writing-shape` | `skills/in-progress/writing-shape` |

**除外済み(2026-08-07):**

- `skills/deprecated/qa` — 2026-07-20 は要カスタム候補として原形維持としていたが、
  上流が 2026-08-05 に「triage / to-tickets に吸収済み」として削除したため追従(ユーザー承認)
- `skills/in-progress/batch-grill-me` — grilling 本体の round-by-round 化に吸収され上流削除。追従

**除外済み(2026-07-20):**

- `skills/deprecated/design-an-interface` — `backend/codebase-design/DESIGN-IT-TWICE.md` に機能統合済み
- `skills/deprecated/request-refactor-plan` — `grilling` → `to-spec` → `to-tickets` の現役フローに分解・強化済み
- `skills/deprecated/ubiquitous-language` — `backend/domain-modeling` と `meta/extract-glossary` に役割分担済み
- `skills/personal/edit-article` — 固有部分がMatt個人向けの1段落240文字制限だけで、情報の依存順序は
  `writing-shape` / `writing-beats` のgrounding設計に強化された形で含まれるため削除
- `skills/personal/obsidian-vault` — Matt固有のWindows/WSL vaultパスと整理規約に固定され、
  ローカルにはObsidian vaultもなく、汎用部分は基本的なファイル検索とwikilink説明だけのため削除
- `skills/misc/scaffold-exercises` — `ai-hero-cli`、course directory、lint規約に固定された
  MattのAI Hero repository専用品で、ローカルに対応環境がないため削除
- `skills/misc/migrate-to-shoehorn` — 現在のrepository群でshoehornを使用しておらず、
  interface縮小やtest data builderより先に型assertion wrapperを導入する狭い移行skillのため削除
- `skills/misc/setup-pre-commit` — Husky・Prettier・Node.jsとcommit時の全test実行に固定され、
  TypeScript / Rust・Bunを使うローカル用途には狭すぎるため削除。将来は検査をpre-commit / pre-push / CIへ
  配置する自作用候補 `setup-quality-gates` として別途検討する
