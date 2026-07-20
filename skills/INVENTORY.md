# Skills Inventory(棚卸し表)

agent-kit の全 skill(現在 **69本**)の棚卸しと状態管理。
各 skill が「何をするか・出自・環境依存・重複」を一覧化し、精査の起点にする。

## この表の使い方

このリポジトリの運用モデルは「**優秀な人(mizchi / mattpocock 等)の公開資産を取ってきて自分用にカスタマイズする**」。
だから各 skill は「捨てる/残す」の二択ではなく、次の観点で継続的に精査する:

- **✅ 使う** — 日常で使う。tooling / testing は全部これ。ただし「もっと便利/効果的な公開資産がないか」は常に精査対象。
- **🔧 要カスタム** — 他人の環境固有の前提が残っている。自分向けに直す必要あり。
- **🔗 統合候補** — 別の skill と機能が重なる。役割分担を明記するか片方に寄せる。
- **🔎 上位互換を探す** — 現状で足りるが、より優れた公開 skill があれば差し替え検討(skill-finder + waxa-eval で評価)。

出自は git 初出コミットで確定。**mizchi 48・mattpocock 12・自作 8・Agents365-ai 1**(計69)。
※ meta/empirical-prompt-tuning は旧自作版を mizchi 版で置換したため mizchi 由来にカウント。

## 2026-07-20 に確定した変更

- **mattpocock 11本 vendoring**(→ [`VENDORED.md`](VENDORED.md)、上流追従は check-vendored.sh)
- **waxa を Deno→Bun 移植**(`tools/waxa/`)。これで waxa-eval / skill-finder が環境で動くようになった
- **3本削除**: utels-project-bootstrap / cloudflare/workers-otel-utels / k8s/crd-from-typed-schema(utels.dev 未使用・k8s 非スタック)
- **`setup-agent-kit` 移植**(上流 `setup-matt-pocock-skills` をリネーム+調整)。これで code-review の Spec 軸が機能する
- **mizchi 48本を VENDORED.md 管理下に**(→ [`VENDORED.md`](VENDORED.md) の mizchi セクション)。
  base commit を事後特定(`d799945`、import 内容と 47/48 完全一致で確定)し、
  共通正規化と個別改造37本の内容を記録。check-vendored.sh は mattpocock + mizchi の両上流対応に一般化。

---

## まず判断が要るもの(❓ と 🔧 と 🔗)

ここだけ見れば仕分けは進む。✅ 残す組は下の全一覧に回した。

### 🔧 要カスタム(6本)— 使う前に自分向けの調整が必要

| skill | 何をする | 何を直す必要があるか |
|---|---|---|
| ~~tooling/code-review~~ | Standards/Spec 2軸でPRレビュー | **解決済み(2026-07-20)**: `setup-agent-kit` を移植し issue-tracker 依存を差し替え。GitHub Issues + repo内spec 両対応 |
| cloudflare/access-app-setup | CF Access保護アプリをAPIで設定 | `mizchi/mnemo` 由来のドメインデフォルトが assets/scripts に残ってないか。**CF はこれから使う** |
| devops/workers-cd-rollback | CF Worker CDの自動ロールバック | `.env.cloudflare`+dotenvx 規約が mizchi 固有。**CF はこれから使う** |
| aws/github-oidc-scoped-role | GitHub Actions→AWS IAM OIDC | Bedrock 固有 ARN 前提。**残す確定**、汎用化するか要確認 |
| meta/skill-finder ・ skill-selector | skill運用メタ系 | `apm` CLI 前提。**残す確定**(skill-finder は本人が明示的に欲しい) |
| meta/waxa-eval | skill品質評価の CLI 操作 | **解決済み**: waxa を Bun 移植したので環境で動く。`bun run tools/waxa/src/cli.ts`。SKILL も更新済み |

### ❓ 保留・様子見

- **node/pi-coding-agent** — `@mariozechner/pi-coding-agent` を Node に組み込む用。この runtime 使う予定ある?未確認。
- **devops/flaker-storage-cache-on-ci** — `@mizchi/flaker`(mizchi 製 flaky test 検出 CLI)前提。flaker 導入するかで要否が決まる。未確認。
- **meta/waxa-eval ↔ empirical-prompt-tuning** — 同じ「skill 品質評価」。waxa-eval=CLI/CI 永続化、empirical=in-session subagent。両方 waxa 移植で生きる。役割分担は明確なので共存。

### 🔗 統合候補 — 機能が重なってる群(整理すると本数が減る)

1. **レビュー系が14本超**: `backend/review-*`(5)+ `frontend/review-*`(9)+ `tooling/code-review`。観点は分かれてるが、入口(triage)が backend/frontend で2つあるなど重複あり。
2. **CI系**: `devops/actions-ci-tuning` ↔ `frontend/review-ci`(ほぼ同じ)、`devops/gh-fix-ci`。
3. **OTel系2本**: `devops/opentelemetry`(汎用)↔ `otel-node`(Node)。階層で分かれてるので整理不要。※CF版(workers-otel-utels)は削除済み。CF で OTel が要るようになったら fetch 境界計装を別途検討。
4. **依存監査系3本**: `frontend/review-deps` ↔ `tooling/dep-lib-review` ↔ `tech-trend-watch`。
5. **skill運用メタ系**: `skill-finder` ↔ `skill-selector`(対で設計・境界明確)、`empirical-prompt-tuning` ↔ `waxa-eval`(同手法の手動版/CLI版)。
6. **調査系**: `tooling/research`(mattpocock)↔ `plugins/deep-research`(自作の重量級)。
7. **glossary系**: `meta/extract-glossary`(mizchi)↔ `backend/domain-modeling`(mattpocock)。

---

## ✅ 残す組(全一覧・出自別)

判断不要でそのまま使えるもの。出自ごとにまとめた。

### 自作(8本)— 一番信頼できる、君が書いたもの

- backend/review-architecture — BE構造・依存方向・境界漏れをレビュー
- backend/review-concurrency — 非同期/並行処理の危険パターン
- backend/review-data-access — DBアクセスのN+1/過剰取得(◎ DynamoDB対応)
- backend/review-transactions — トランザクション整合性(◎ PG/SQLite/DynamoDB差分表)
- backend/review-triage — BEレビューの入口
- db/migration-safety — DB移行の安全性分類(◎ PG/RDS/SQLite/DynamoDB全対応)
- lang/rust — Rustベストプラクティス
- lang/typescript — TypeScriptベストプラクティス

※ meta/empirical-prompt-tuning は旧自作版があったが mizchi 版で置換済み(mizchi の項に移動)

### mattpocock(12本, MIT, VENDORED.md 管理済み)

- meta/setup-agent-kit — repo ごとの issue-tracker/domain 設定を scaffold(上流 `setup-matt-pocock-skills` を改造移植)

- meta/grilling — 計画を1問ずつ問い詰める
- meta/handoff — 会話を引き継ぎ文書に圧縮
- testing/tdd — red-green-refactor
- backend/codebase-design — 深いモジュール設計の語彙
- backend/domain-modeling — ドメインモデル/ADR/用語集
- tooling/diagnosing-bugs — 難バグ/性能劣化の診断ループ
- tooling/resolving-merge-conflicts — マージ衝突解消
- tooling/git-guardrails-claude-code — 危険git操作をhookでブロック(Claude Code専用)
- tooling/prototype — 使い捨てプロトタイプで設計検証
- tooling/research — 一次情報調査→Markdown(🔗 deep-research と重複)
- tooling/code-review — 🔧 上の要カスタム参照

### Agents365-ai(1本, MIT)

- tooling/drawio — draw.io CLIで図生成(君が v1.16.0 まで検証済み)

### mizchi(48本, MIT 既定 / 一部 Apache-2.0, VENDORED.md 管理済み)

実スタック直結(◎):
- cloudflare/deploy — Workers/Pagesデプロイ
- sql/lint ・ sql/plan-audit ・ sql/schema-audit ・ sql/security — SQL監査4点(SQLite/D1/PG対応)

汎用で使える(○ / -):
- ai/review-image ・ ai/vlmkit — 画像/VRTレビュー
- aws/ecs-codedeploy-blue-green ・ aws/ecs-service-connect-ipv6 ・ aws/vault-mfa-iam — AWS運用
- devops/actions-ci-tuning ・ devops/gh-fix-ci ・ devops/opentelemetry ・ devops/otel-node — CI/OTel
- frontend/review-*(9本)— フロントレビュー一式
- lang/translate-programming-language — 言語間移行
- meta/empirical-prompt-tuning ・ extract-glossary ・ optimizing-descriptions ・ retrospective-codify ・ skill-finder ・ skill-selector ・ waxa-eval — メタ系
- node/sqlite-vec — Node sqlite-vec(○ Turso/D1関連)
- testing/playwright-cli ・ playwright-test — Playwright
- tooling/apm-usage ・ ast-grep-practice ・ conventional-changelog ・ dep-lib-review ・ dotenvx ・ justfile ・ nix-setup ・ tech-trend-watch ・ upstream-fix-and-pin — ツール系

---

## 残った論点(次に向き合うもの)

1. ~~**mizchi 由来の上流追従が未整備**~~ → **完了(2026-07-20)**。48本を VENDORED.md 管理下に置き、check-vendored.sh を両上流対応に一般化。
2. **「もっと良い公開資産がないか」の精査**(君の本命)。tooling/testing/backend は使うが、より優れた mizchi/mattpocock/一流の skill がないか skill-finder + waxa-eval(移植済み)で精査したい。特に tooling/testing から。
3. ~~**code-review の issue-tracker カスタマイズ**~~ → **完了(2026-07-20)**。`meta/setup-agent-kit` を mattpocock から移植し、GitHub Issues + repo内spec の両対応に。
4. **レビュー系14本**(backend 5 + frontend 9)は最大クラスタ。内容の強化・改善の余地あり(本人談)。精査対象。
