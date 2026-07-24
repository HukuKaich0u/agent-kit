# Curated skill catalog (Phase 1)

`skill-selector` Phase 1 の一次カタログ。**このリポジトリ (`HukuKaich0u/agent-kit`) が
現在保有している skill だけ**を載せる。外部レジストリの一覧ではない — 外部探索は
Phase 2 (`skill-finder`) の仕事。

グルーピングはプロジェクトシグナル(言語 / ツール / プロセス)別。シグナルを検出したら
対応する行を提案する。

## Install 文字列

すべて `HukuKaich0u/agent-kit/skills/<path>` 形式。

- **project スコープ**: `apm.yml` の `dependencies.apm` にこの文字列を追加して `apm install`。
- **global スコープ**: `apm install -g HukuKaich0u/agent-kit/skills/<path>`。

正確な `apm.yml` 構文は install 前に `apm-usage` で確認する(APM 0.26.0 系。
`--frozen-lockfile` は存在しない、`--frozen` を使う)。

## 状態列(Status)

各行の状態は [`INVENTORY.md`](../../../INVENTORY.md) の棚卸しに準拠する:

| 状態 | 意味 | 提案時の扱い |
|---|---|---|
| **✅ 使う** | 上流 verbatim / 自作で、そのまま使える | シグナル一致で通常提案 |
| **🔧 要カスタム** | 他人の環境前提や壊れ参照が残る。使う前に修正が要る | 提案時に「要カスタム」と明示。install しても本文の壊れ参照に注意 |
| **⏸ 保留** | 通常導線に載せない(deprecated / in-progress)。実案件で試してから昇格判断 | 原則提案しない。プロジェクトが強く必要とする場合のみ散文で言及 |
| **🎯 明示起動** | `disable-model-invocation` またはユーザーが明示起動する前提の meta skill | 自動提案しない。ユーザーが名指しした時だけ |

**要カスタムの詳細**(何が壊れているか)は `INVENTORY.md` の「要カスタム」節が一次情報。
catalog の説明だけを信頼せず、install 前に対象 skill の SKILL.md・asset・依存を確認する。

デフォルトは**少なく**。各 skill は毎会話 context を消費する。近く繰り返す作業に必要な
2〜5 本だけを、理由と状態を添えて提案する。

---

## 言語 / ランタイム

### TypeScript / Node.js
**Signals**: `package.json`, `tsconfig.json`, `pnpm-lock.yaml` / `bun.lock`, `node_modules/`

| Status | Skill | Install (`skills/<path>`) | Use when |
|---|---|---|---|
| ✅ | typescript | `lang/typescript` | TypeScript を書く / レビューする — strict 型設計・命名・error handling・module/API 境界 |
| 🔧 | otel-node | `devops/otel-node` | Node.js の OTel SDK 初期化・auto-instrumentation・esbuild ESM の silent-failure。SDK 2.x 未対応の例が残る要カスタム |

### Rust
**Signals**: `Cargo.toml`, `*.rs`, `target/`

| Status | Skill | Install (`skills/<path>`) | Use when |
|---|---|---|---|
| ✅ | rust | `lang/rust` | Rust を書く / レビューする — error handling・borrow checker・ownership・iterator vs loop・async の落とし穴 |

### Go
**Signals**: `go.mod`, `go.sum`, `*.go`

| Status | Skill | Install (`skills/<path>`) | Use when |
|---|---|---|---|
| ✅ | go | `lang/go` | Go を書く / レビューする — error wrap・goroutine リーク防止・context 伝播・interface 設計・nil の落とし穴 |

### Python
**Signals**: `pyproject.toml`, `requirements.txt`, `setup.py`, `*.py`

| Status | Skill | Install (`skills/<path>`) | Use when |
|---|---|---|---|
| ✅ | python | `lang/python` | Python を書く / レビューする — 型ヒント・具体的例外・mutable default・dataclass・context manager・async 落とし穴 |

### 言語間移植
**Signals**: あるランタイム/言語から別へポートする作業

| Status | Skill | Install (`skills/<path>`) | Use when |
|---|---|---|---|
| ✅ | translate-programming-language | `lang/translate-programming-language` | oracle-driven parity で言語・ランタイムを安全に移植。fixture・shadow/canary・rollback 設計込み |

---

## Backend レビュー

**Signals**: サーバ / API / DB を持つ backend のレビュー依頼

| Status | Skill | Install (`skills/<path>`) | Use when |
|---|---|---|---|
| ✅ | backend-review-triage | `backend/review-triage` | backend レビューの入口。repo 全体を分類し適用する domain lens を選ぶ |
| 🔧 | backend-review-architecture | `backend/review-architecture` | 構造・依存方向・境界漏れ。`npx madge` 暗黙取得を外す要カスタム |
| 🔧 | backend-review-concurrency | `backend/review-concurrency` | async / 並行 / batch の危険パターン。Rust/Tokio・Bun 追加の要カスタム |
| 🔧 | backend-review-data-access | `backend/review-data-access` | N+1 / 過剰取得(DynamoDB 対応)。SQLx/Diesel/D1 追加の要カスタム |
| 🔧 | backend-review-transactions | `backend/review-transactions` | トランザクション整合性(PG/SQLite/DynamoDB 差分)。engine 別上限を version 確認する要カスタム |

### 設計・ドメイン
| Status | Skill | Install (`skills/<path>`) | Use when |
|---|---|---|---|
| ✅ | codebase-design | `backend/codebase-design` | 深いモジュール設計の語彙(DESIGN-IT-TWICE 込み) |
| 🔧 | domain-modeling | `backend/domain-modeling` | 会話でドメイン用語・境界・ADR を合意し継続更新。固定配置を既存規約優先に直す要カスタム |
| 🔧 | improve-codebase-architecture | `backend/improve-codebase-architecture` | 証拠付き findings から一候補を codebase-design + grilling で改善設計し to-spec へ。自動 Explore/HTML を外す要カスタム |

---

## Database / SQL

**Signals**: schema migration, `*.sql` catalog, SQLite/D1/Postgres/DynamoDB

| Status | Skill | Install (`skills/<path>`) | Use when |
|---|---|---|---|
| ✅ | db-migration-safety | `db/migration-safety` | DB 移行の安全性分類(PG/RDS/SQLite/DynamoDB 全対応) |
| 🔧 | sql-plan-audit | `sql/plan-audit` | query plan baseline diff。engine / query layer に合わせて再設計する要カスタム。CI gate 化は保留 |
| 🔧 | sql-schema-audit | `sql/schema-audit` | SQLite/D1 の index coverage・FK 列 index・N+1。AST/query layer に合わせて作り直す要カスタム |

---

## Testing / Browser

**Signals**: `playwright.config.*`, `e2e/`, TDD 依頼, 画像 diff

| Status | Skill | Install (`skills/<path>`) | Use when |
|---|---|---|---|
| ✅ | tdd | `testing/tdd` | red-green-refactor。test-first で機能追加・バグ修正 |
| 🔧 | playwright-test | `testing/playwright-test` | Playwright E2E の設計・実装・review。`npx` 固定・非推奨 API 例を直す要カスタム |
| 🔧 | playwright-cli | `testing/playwright-cli` | Playwright の安全な起動・実行。`claude-in-chrome` 前提を外す要カスタム |

---

## Frontend レビュー(手動起動スイート)

**Signals**: frontend プロジェクトで構造的レビューをしたいとき。
週次 orchestrator は廃止済み。必要な領域を**手動で**起動する。
全 8 本とも欠落 `scripts/audit-*.sh` 参照が残る **🔧 要カスタム**(旧自作 `.mjs` は commit `0fd8ec3`)。

| Status | Skill | Install (`skills/<path>`) | Use when |
|---|---|---|---|
| 🔧 | frontend-review-triage | `frontend/review-triage` | frontend レビューの入口(day-1 assessment) |
| 🔧 | frontend-review-ci | `frontend/review-ci` | CI が遅い(>10 min)/ flaky。frontend の GitHub Actions 最適化 |
| 🔧 | frontend-review-hygiene | `frontend/review-hygiene` | TypeScript strictness・lint・dead code・duplication |
| 🔧 | frontend-review-deps | `frontend/review-deps` | 依存の健全性・CVE triage・deprecated 検出 |
| 🔧 | frontend-review-testing | `frontend/review-testing` | vitest coverage・playwright config・VRT setup |
| 🔧 | frontend-review-security | `frontend/review-security` | HTML sink・auth/token storage・route guard・env 露出 |
| 🔧 | frontend-review-state | `frontend/review-state` | state 分類(server/URL/form/UI)・anti-pattern |
| 🔧 | frontend-review-performance | `frontend/review-performance` | React rendering・profiler-first・memo 正当性 |

---

## AI / VLM

**Signals**: screenshot review, visual regression testing

| Status | Skill | Install (`skills/<path>`) | Use when |
|---|---|---|---|
| 🔧 | review-image | `ai/review-image` | 単画像を VLM で判定する軽量 review。Deno→Bun 移植・model/費用上限を直す要カスタム |
| 🔧 | vlmkit | `ai/vlmkit` | baseline/current の pixel・style・a11y diff を測る VRT 基盤。`@mizchi/vrt` 0.5→0.6 移行が要る要カスタム |

---

## DevOps / CI

**Signals**: `.github/workflows/`, failing PR checks, OTel

| Status | Skill | Install (`skills/<path>`) | Use when |
|---|---|---|---|
| 🔧 | actions-ci-tuning | `devops/actions-ci-tuning` | GitHub Actions の監査・高速化。Bun 検出・変更前承認を追加する要カスタム |
| 🔧 | gh-fix-ci | `devops/gh-fix-ci` | 失敗した PR checks の診断・修正。read-only 調査を先行し修正は承認後の境界を維持する要カスタム |
| 🔧 | opentelemetry | `devops/opentelemetry` | platform 非依存の OTel 設計 reference。SDK 2.x・削除済み Workers 版参照を直す要カスタム |

---

## Tooling(日常)

**Signals**: バグ調査 / マージ衝突 / 図 / プロトタイプ / 調査 など

| Status | Skill | Install (`skills/<path>`) | Use when |
|---|---|---|---|
| ✅ | diagnosing-bugs | `tooling/diagnosing-bugs` | 難バグ・性能劣化の診断ループ |
| ✅ | resolving-merge-conflicts | `tooling/resolving-merge-conflicts` | 進行中の git merge/rebase 衝突解消 |
| ✅ | prototype | `tooling/prototype` | 使い捨てプロトタイプで設計判断を検証 |
| ✅ | drawio | `tooling/drawio` | draw.io CLI で図生成(v1.16.0 まで検証済み) |
| ✅ | git-guardrails-claude-code | `tooling/git-guardrails-claude-code` | 危険 git 操作を hook でブロック(**Claude Code 専用**) |
| 🔧 | research | `tooling/research` | 軽量な一次情報調査。重量級は `deep-research` plugin と分担する要カスタム |
| 🔧 | code-review | `tooling/code-review` | 固定点からの差分を Standards / Spec 軸で review。Spec 軸の残りカスタムは継続 |
| 🔧 | ast-grep-practice | `tooling/ast-grep-practice` | project 固有の構造規則・安全な migration。ast-grep 0.44.0 で全実例を検証する要カスタム |
| 🔧 | justfile | `tooling/justfile` | 既存 justfile の理解・安全な編集。pkfire 優先や危険例を外す要カスタム |
| 🔧 | conventional-changelog | `tooling/conventional-changelog` | release 方式の比較入口。存在しない `npm-release` 参照等を外す要カスタム |
| 🔧 | apm-usage | `tooling/apm-usage` | APM の manifest/lockfile/install。**APM 0.26.0 準拠へ更新する高優先要カスタム** |
| 🔧 | upstream-fix-and-pin | `tooling/upstream-fix-and-pin` | 依存の上流 PR + 一時 override + 撤去。`~/ghq`・pnpm 専用記述を外す要カスタム |

### 依存監査
| Status | Skill | Install (`skills/<path>`) | Use when |
|---|---|---|---|
| 🔧 | dep-lib-review | `tooling/dep-lib-review` | 日常の依存棚卸しと承認後の更新。Bun/Rust・承認境界を直す要カスタム |
| 🔧 | tech-trend-watch | `tooling/tech-trend-watch` | 長期的な採否・移行判断。一次情報優先へ直す要カスタム |

---

## 実装フロー(spec → ticket → 実装 → review)

**Signals**: 仕様固め・チケット分割・実装オーケストレーション。
`setup-agent-kit` で issue tracker を設定済みが前提。全て 🔧 要カスタム(承認境界を直す)。

| Status | Skill | Install (`skills/<path>`) | Use when |
|---|---|---|---|
| 🔧 | to-spec | `tooling/to-spec` | grilling で合意した会話を仕様へ固定し tracker へ公開 |
| 🔧 | to-tickets | `tooling/to-tickets` | plan/spec を vertical slice の tracer-bullet ticket へ分割 |
| 🔧 | triage | `tooling/triage` | 既存 issue/PR を triage role の state machine で進める |
| 🔧 | implement | `tooling/implement` | spec/ticket から tdd → 段階検証 → code-review をつなぐ薄い orchestrator |
| 🔧 | wayfinder | `tooling/wayfinder` | 一 session で見通せない大規模案件を decision ticket の地図へ分解(明示起動) |

---

## Formal Methods

**Signals**: Z3 / Alloy / TLA+ / spec-vs-code 突合・authz soundness・model checking

| Status | Skill | Install (`skills/<path>`) | Use when |
|---|---|---|---|
| ⏸🔧 | formal-methods-reconciler | `formal-methods/reconciler` | 最初の小さな formal check 作成。普通の property test で足りるか先に判定する保留・要カスタム |
| ⏸🔧 | formal-methods-drift-guard | `formal-methods/drift-guard` | reconciler の後、spec/code/model drift を保守する対の skill。同上 |

---

## Process / Meta(明示起動が基本)

このリポジトリの運用そのものを扱う meta skill。**自動提案しない** — ユーザーが名指しした時だけ。

### skill 運用の基盤
| Status | Skill | Install (`skills/<path>`) | Use when |
|---|---|---|---|
| 🎯 | setup-agent-kit | `meta/setup-agent-kit` | repo ごとに issue tracker / triage labels / domain docs を scaffold(engineering flow の前に一度) |
| 🎯🔧 | skill-selector | `meta/skill-selector` | この catalog から project skill を選ぶ入口(= この skill 自身) |
| 🎯🔧 | skill-finder | `meta/skill-finder` | catalog に無いものを外部探索(Phase 2)。安全確認 + waxa eval gate |

> `apm-usage`(`tooling/apm-usage`)は上の **Tooling(日常)** 節に記載。APM の manifest/lockfile 構文が必要なときに参照する。

### skill / prompt の品質
| Status | Skill | Install (`skills/<path>`) | Use when |
|---|---|---|---|
| 🎯🔧 | optimizing-descriptions | `meta/optimizing-descriptions` | frontmatter `description` の横断監査 |
| 🎯🔧 | empirical-prompt-tuning | `meta/empirical-prompt-tuning` | fresh-agent の固定 scenario で skill/instruction を評価・改善 |
| 🎯🔧 | waxa-eval | `meta/waxa-eval` | waxa CLI で skill prompt を評価。**自動 iterate は使用保留**の要カスタム |
| 🎯🔧 | retrospective-codify | `meta/retrospective-codify` | 再発しそうな教訓を rule / skill / CLAUDE.md へ恒久化 |
| 🎯🔧 | writing-great-skills | `meta/writing-great-skills` | skill を書く / 直すときの設計原則 reference |
| 🎯🔧 | extract-glossary | `meta/extract-glossary` | 複数 repo から用語・repo map・onboarding 資料を根拠付きで抽出 |

### 計画を詰める(grill 系)
| Status | Skill | Install (`skills/<path>`) | Use when |
|---|---|---|---|
| ✅ | grilling | `meta/grilling` | 計画・決定・アイデアを1問ずつ問い詰める primitive |
| ✅ | grill-me | `meta/grill-me` | 文書を残さない明示的な grill の入口 |
| ✅ | grill-with-docs | `meta/grill-with-docs` | grill しながら ADR・用語集を残す入口(domain-modeling と併用) |
| ✅ | decision-interview | `meta/decision-interview` | 曖昧なアイデアを1問ずつの構造化インタビューで**ユーザー所有の明示的な意思決定**へ。decision ledger + 承認で締める。grilling が問い詰めなのに対しこちらは決定の明示化・記録 |
| ✅ | handoff | `meta/handoff` | 会話を引き継ぎ文書に圧縮 |
| 🎯🔧 | ask-matt | `meta/ask-matt` | 状況別に skill/flow を案内する router。名前・参照を直す要カスタム(通常導線外) |

### 記事・再現性(明示起動)
| Status | Skill | Install (`skills/<path>`) | Use when |
|---|---|---|---|
| 🎯🔧 | teach | `meta/teach` | 複数 session で学習 workspace を蓄積。承認境界を直す要カスタム |
| 🎯🔧 | tech-article-reproducibility | `meta/tech-article-reproducibility` | how-to/tutorial 記事の公開前再現性チェック。mizchi 固有 path 等を直す要カスタム |

---

## ⏸ 保留(通常導線に載せない)

deprecated / in-progress。実案件で一度試してから昇格または削除を判断する。
**原則 catalog 提案に入れない** — プロジェクトが強く必要とする場合のみ散文で言及する。

| Status | Skill | Install (`skills/<path>`) | 位置づけ |
|---|---|---|---|
| ⏸🔧 | qa | `deprecated/qa` | 会話型の不具合受付を issue へ固定。tracker 運用を吟味するまで原形維持 |
| ⏸ | batch-grill-me | `in-progress/batch-grill-me` | 独立質問をラウンド単位でまとめる grill の実験版 |
| ⏸ | claude-handoff | `in-progress/claude-handoff` | 会話要約を `claude --bg` で背景 agent 起動 |
| ⏸ | loop-me | `in-progress/loop-me` | 反復業務を workflow 仕様へ落とす |
| ⏸🔧 | setup-ts-deep-modules | `in-progress/setup-ts-deep-modules` | dependency-cruiser で public entry を機械的に守る。優先度高の要カスタム候補 |
| ⏸ | to-questionnaire | `in-progress/to-questionnaire` | 答えきれない決定を他者向け質問票にする |
| ⏸🔧 | wizard | `in-progress/wizard` | 手順を再現可能な対話 script へ。秘密情報まわりを安全化するまで保留 |
| ⏸ | writing-fragments | `in-progress/writing-fragments` | 執筆の explore 段階(素材採掘) |
| ⏸ | writing-shape | `in-progress/writing-shape` | 執筆の exploit 段階(段落構築) |
| ⏸ | writing-beats | `in-progress/writing-beats` | essay 向け beat 単位の構築 |

---

## Deliberately not in catalog

以下の軸は設計上 catalog 行を持たない。Phase 2 へエスカレーションしない — 一度きりの
setup であって、繰り返す skill 型のニーズではない。framework docs でインラインに解決する。

| 軸 | 理由 |
|---|---|
| Vite / React / Next.js の scaffolding | 一度きりの setup。framework docs で十分。繰り返すパターン(E2E/build/CI)は他の行がカバー |
| 単発の config 変換(webpack→Vite, Jest→Vitest) | 一度きりの migration。AI 支援でインライン処理 |
| 単発のデータ移行 / backfill | 繰り返さない |
| ORM / DB client 一般 | project 固有すぎる。具体的な運用痛点があるものだけ載せる |

---

## When the catalog has no fit

どの行も一致せず、ニーズが**繰り返す**なら `skill-finder` skill 経由で Phase 2 へ。
GitHub topic 検索をインラインで走らせない。`skill-finder` が source priority と
waxa eval gate を担う。

## Catalog hygiene

- ここに行がある = **このリポジトリに実在する** skill である。外部候補は Phase 2 の
  `skill-finder` を通し、複数 project での実利用と waxa eval 通過後にだけ昇格する。
- skill を追加・削除・改名したら、同じ編集でこの catalog の行も更新する。
- 状態(✅/🔧/⏸/🎯)は `INVENTORY.md` の棚卸しを一次情報とする。乖離を見つけたら
  `INVENTORY.md` を正として直す。
- `find skills -name SKILL.md` の結果とこの表の行数が一致するのが健全な状態
  (`tools/waxa/examples/` の fixture skill は対象外)。
