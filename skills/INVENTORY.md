---
created: 2026-07-25
updated: 2026-07-25
author: Koki Aoyagi
type: inventory
---

# Skills Inventory(棚卸し表)

agent-kit の全 skill(現在 **82本**)の棚卸しと状態管理。
各 skill が「何をするか・出自・環境依存・重複」を一覧化し、精査の起点にする。

## この表の使い方

このリポジトリの運用モデルは「**優秀な人(mizchi / mattpocock 等)の公開資産を取ってきて自分用にカスタマイズする**」。
だから各 skill は「捨てる/残す」の二択ではなく、次の観点で継続的に精査する:

- **✅ 使う** — 日常で使う。tooling / testing は全部これ。ただし「もっと便利/効果的な公開資産がないか」は常に精査対象。
- **🔧 要カスタム** — 他人の環境固有の前提が残っている。自分向けに直す必要あり。
- **🔗 統合候補** — 別の skill と機能が重なる。役割分担を明記するか片方に寄せる。
- **🔎 上位互換を探す** — 現状で足りるが、より優れた公開 skill があれば差し替え検討(skill-finder + waxa-eval で評価)。

出自: **mizchi 36・mattpocock 33・自作 12・Agents365-ai 1**(計82)。
※ meta/empirical-prompt-tuning は旧自作版を mizchi 版で置換したため mizchi 由来にカウント。
※ 自作の追加(2026-07-24): meta/decision-interview、lang/go、lang/python。
  ユーザーの主要言語は Rust / Go / Python / TypeScript の4つ(全部がっつり使う)。言語 skill を4言語に揃えた。

## 2026-07-20 に確定した変更

- **mattpocock 11本 vendoring**(→ [`VENDORED.md`](VENDORED.md)、上流追従は check-vendored.sh)
- **waxa を Deno→Bun 移植**(`tools/waxa/`)。これで waxa-eval / skill-finder が環境で動くようになった
- **3本削除**: utels-project-bootstrap / cloudflare/workers-otel-utels / k8s/crd-from-typed-schema(utels.dev 未使用・k8s 非スタック)
- **`setup-agent-kit` 移植**(上流 `setup-matt-pocock-skills` をリネーム+調整)。これで code-review の Spec 軸が機能する
- **mizchi 48本を VENDORED.md 管理下に**(→ [`VENDORED.md`](VENDORED.md) の mizchi セクション)。
  base commit を事後特定(`d799945`、import 内容と 47/48 完全一致で確定)し、
  共通正規化と個別改造37本の内容を記録。check-vendored.sh は mattpocock + mizchi の両上流対応に一般化。
- **vendored 60本を上流 HEAD に全リセット**(同日、上記の直後)。
  「クリーンな上流状態を起点に、必要なものから少しずつカスタマイズし直す」方針に転換。
  旧カスタム済み状態(壊れ参照の修正・自作 audit スクリプト・改善)は commit `0fd8ec3` から個別に拾える。
  これに伴い、過去に「解決済み」とした項目のいくつかが未解決に戻った(下の要カスタム参照)。
- **完全ミラー化で +48本 → 計117本**(同日)。上流 2 repo の skill を取捨選択せず全部置く方針に。
  mizchi +19(MoonBit 系・k8s・utels 等の削除済み13を再取込+formal-methods 2+review-perspectives 5)、
  mattpocock +29(to-spec / to-tickets / triage / implement 等の実用系15+deprecated 4+in-progress 9…)。
  追加分は**全て未精査**。mattpocock の `deprecated/` `in-progress/` `personal/` はステータスが分かるよう同名ディレクトリに配置。
- **MoonBit 専用5本を削除 → 計112本**(同日)。完全ミラー方針をやめ、1クラスタずつ吟味する方針に転換。
  削除: `lang/moonbit-practice`・`lang/moonbit-js-binding`・`lang/ts2moonbit-migration`・
  `sql/sqlc-gen-moonbit-safety`・`cloudflare/mbt-worker-bundle`。
  MoonBit 前提を含む `devops/workers-cd-rollback` は、言語非依存の rollback 設計を TypeScript / Rust 向けに
  応用できるため、要カスタム候補として残した。
- **`deprecated/design-an-interface` を削除 → 計111本**(同日)。
  `backend/codebase-design/DESIGN-IT-TWICE.md` に、問題設定・依存分類・比較軸・推奨提示まで強化された形で
  統合済みのため、能力を失わない重複整理と判断した。
- **`deprecated/qa` を `tooling/bug-intake` に一度再設計**(同日)。
  会話型の不具合受付という固有価値を確認した。完成形を十分に吟味してからカスタマイズする方針へ改め、
  2026-07-22にこの先行実装を取り下げて上流 `deprecated/qa` を復元した。
- **`deprecated/request-refactor-plan` を削除 → 計110本**(同日)。
  聞き取りは `grilling`、仕様化は `to-spec`、安全な分割は `to-tickets` のvertical slice / expand–contract、
  architecture候補の発見は `improve-codebase-architecture` に分解済みで、旧skill固有の能力が残っていないと判断した。
- **`deprecated/ubiquitous-language` を削除 → 計109本**(同日)。
  会話中のdomain language更新は `backend/domain-modeling`、repoからの初期用語抽出は `meta/extract-glossary` が
  より強い形で担当しており、旧 `UBIQUITOUS_LANGUAGE.md` workflowは重複と判断した。
- **`personal/edit-article` を削除 → 計108本**(同日)。
  固有部分はMatt個人向けの「1段落240文字以下」だけで、汎用的な明瞭化指示は独立skillとして薄い。
  情報の依存順序は `writing-shape` / `writing-beats` のgrounding設計に強化された形で含まれると判断した。
- **`personal/obsidian-vault` を削除 → 計107本**(同日)。
  Matt固有のWindows/WSL vaultパスとflat root・Title Case・Index note規約に固定されている。
  ローカルにはObsidian vaultもなく、汎用部分は基本的な検索とwikilink説明だけのため削除した。
- **`tooling/scaffold-exercises` を削除 → 計106本**(同日)。
  `ai-hero-cli`、course directory、lint規約に固定されたMattのAI Hero repository専用品で、
  ローカルには対応するCLIも構造もないため削除した。
- **`tooling/migrate-to-shoehorn` を削除 → 計105本**(2026-07-21)。
  現在のrepository群でshoehornを使用しておらず、interface縮小やtest data builderより先に
  型assertion wrapperを導入する狭い移行skillを常駐させる価値は薄いと判断した。
- **`tooling/setup-pre-commit` を削除 → 計104本**(同日)。
  Husky・Prettier・Node.jsとcommit時の全test実行に固定されたsetupで、TypeScript / Rust・Bunを使う
  現在の用途には狭すぎる。将来はhook導入そのものではなく、pre-commit / pre-push / CIへ検査を適切に
  配置する自作用候補 `setup-quality-gates` として別途設計する。
- **grill系3本を上流のまま維持**(2026-07-22)。
  `grilling` を一問ずつ合意を詰めるprimitive、`grill-me` を文書を残さない明示的入口、
  `grill-with-docs` を `domain-modeling` と組み合わせて用語集・ADRを残す入口として役割分担する。
- **frontend weekly + perspective 5本を削除 → 計98本**(同日)。
  移行元 `mizchi/frontend-review` は現在取得不能で、mizchi配下の公開code検索でも参照先のaudit scripts / checklist /
  data / templatesは見つからなかった。二次的なexpert人格による重複reportと週次KPI自動運用は使わず、
  frontend domain review 8本を必要時に手動起動する。固有観点は各domain skillの将来カスタム時に回収する。
- **`lang/gleam-practice` を削除 → 計97本**(同日)。
  Gleam / OTP / Wisp / Mist固有のtoolchain・実装patternとassetsで、現在使う予定がなく、TypeScript / Rust向けに
  独立して残す固有workflowもないため削除した。
- **`cloudflare/workers-otel-utels` を削除 → 計96本**(同日)。
  Workersのfetch境界OTLPとD1遅延検知には固有価値があるが、現在使わないutels、欠落references、
  pnpm前提、約1,500行の実装資産を保有し続けてまで将来用に予約しない。必要になったら、
  必要な信号とD1計装だけを小さく設計し直す。
- **`k8s/crd-from-typed-schema` を削除 → 計95本**(同日)。
  Kubernetes operator / CRD自作に限定したStructural Schemaのチェックリストで、現在のスタック外。
  型からschemaを作る一般設計への独立した転用価値も薄く、同梱済みと記載された
  `examples/adapter.ts` も存在しないため削除した。
- **`meta/mizchi-blog-style` を削除 → 計94本**(同日)。
  mizchi本人の記事構成・文体・定型句を模倣する個人専用skillで、技術に限らない自分のessayや
  記事の声を作る目的と合わない。汎用的な執筆workflowは残したwriting系で別途吟味する。
- **`tooling/chezmoi-management` を削除 → 計93本**(2026-07-23)。
  mizchi固有のdotfiles remote、Nix / home-managerとの境界、pkfire + secretlint、APM配置、
  絶対pathを前提とした個人運用メモ。汎用chezmoi操作は公式docsで代替でき、未採用の現状で
  ほぼ全文を書き直して保持する価値はない。将来採用するなら自分のdotfilesを正として再設計する。
- **`tooling/utels-project-bootstrap` を削除 → 計92本**(同日)。
  utels.dev専用のproject登録とCloudflare Worker secret更新helperで、利用側の
  `cloudflare/workers-otel-utels` も削除済み。汎用的な「tokenをstdoutに出さずstdinで渡す」設計は、
  実際に必要なservice向けworkflowを作るときに承認境界を含めて再設計する。
- **`node/pi-coding-agent` を削除 → 計91本**(同日)。
  `@mariozechner/pi-coding-agent` で独自agent CLI・extension・packageを作るための約500行の
  特定SDK専用reference。現在のrepoに利用実績がなく、一般的な「Nodeにagentを組み込む」依頼で
  piを先に選ぶdescriptionも不要な誘導になる。採用を決めたprojectで最新上流とともに再導入する。
- **`devops/flaker-storage-cache-on-ci` を削除 → 計90本**(同日)。
  `@mizchi/flaker` 導入済みrepoでDuckDB履歴をGitHub Actions cacheに保存する補助skillで、
  flaky test検出自体を導入するものではない。現在の利用実績がなく、将来flakerを採用するprojectで
  最新のsetup / management / storageと、cache保持・並行実行・branch間分離の要件を一組で再評価する。
- **Cloudflare 2本・AWS 3本を削除 → 計85本**(2026-07-24)。
  `cloudflare/deploy`・`devops/workers-cd-rollback`・`aws/ecs-codedeploy-blue-green`・
  `aws/ecs-service-connect-ipv6`・`aws/vault-mfa-iam` は、account・identity・network・deploy・rollbackを
  自分たちの実構成に合わせて作り直す必要があるため、汎用または他人用のrunbookを保持しない。
- **残りのCloudflare / AWS 2本も削除 → 計83本**(同日)。
  `cloudflare/access-app-setup` は説明に対してpolicy・service token・更新・CLI引数の実装が欠落。
  `aws/github-oidc-scoped-role` はOIDC setupとBedrock agent roleが混在し、現行AWS仕様と異なる前提もある。
  どちらも実際のaccount・repository・IaC・最小権限を正として必要時に作り直す。
- **`lang/translate-programming-language` を上流のまま維持**(同日、本数変更なし)。
  source runtime / standardをoracleにしたfixture、移植testの可視化、一時compatibility layerと削除計画、
  riskに応じたreplay・shadow・canary・rollbackという言語非依存の設計があり、固有環境や欠落assetもない。
  TypeScript / Rust等の本格的な言語・runtime移植で使えるため、現時点ではカスタマイズ不要と判断した。
- **`node/sqlite-vec` を削除 → 計82本**(同日)。
  `node:sqlite`の対応version・flag・extension loadとVitest非互換について古い断定を含み、
  pre-v1の特定libraryに固定されたrecipe。利用実績もないため、vector storageを実際に採用するprojectで
  SQLite / Postgres / 外部serviceとruntimeを選んだ後、対象versionに合わせて作り直す。
- **SQL監査2本を削除、2本を要カスタマイズで維持 → 計80本**(同日)。
  `sql/lint` はsqlc / SQLFluffで代替できる形式検査と粗いpattern判定、`sql/security` は複数行・小文字SQL・
  data flowを見ないscannerのため削除した。`sql/plan-audit` はplan baseline diff、`sql/schema-audit` は
  SQLiteのindex / FK awarenessに固有価値があるため、自分たちのengine・query layer向けに直す候補として残す。
- **`tooling/dotenvx` を削除 → 計79本**(同日)。
  現在dotenvxを採用しておらず、非推奨の `.env.vault` を発火条件に含み、存在する `dotenvx rotate` を
  「未提供」として手製rotationを案内していた。同梱Actions例も `pull_request` でprivate keyを渡して
  変更後codeを実行し、installerをversion未固定の `curl | sh` で取得する。採用時にsecret manager・
  CI trust boundary・複数鍵の移行期間を正として専用workflowを作るため、古い汎用runbookは保持しない。
- **`tooling/nix-setup` を削除 → 計78本**(同日)。
  開発環境はprojectのruntime・CI・team構成ごとに変わり、共通skillでtemplateを固定しない。
  未採用のNix / devboxに加え、MoonBit・Haskell・OCaml・OxCaml・home-manager・Claude Code webまで
  一括配布し、APM 0.8.11やsandbox無効のsystem installerも抱えていた。必要時に対象repo内で
  devenv / devbox / flake等を選び、最小構成を設計する。
- **`tooling/bug-intake` を取り下げ、`deprecated/qa` を上流のまま復元**(2026-07-23、本数変更なし)。
  会話型issue intakeは要カスタムとして残すが、tracker設計・承認境界・`triage`との責務分担を改めて考えるまで
  skill本体を先行改造しない。これにより現時点のvendored skillはすべて上流verbatimへ戻った。
- **残骸掃除 + 配布基盤3本のカスタム開始**(2026-07-24、本数変更なし=78本)。
  「上流verbatimから使う順に少しずつカスタムし直す」方針の最初の着手。
  - **残骸掃除**: 削除済みskill(aws/cloudflare/node/dotenvx/nix-setup/moonbit系/sql lint・security 等)の
    空ディレクトリ・git管理外ファイル(`cli.ts.deno.bak`)と空カテゴリ `node/README.md` を除去。
    SKILL.md実数は78本で不変(残骸はSKILL.mdを持たないゴミだった)。
  - **`meta/setup-agent-kit`**: 内部 `name` が上流 `setup-matt-pocock-skills` のままで、参照側6skill
    (code-review / to-spec / to-tickets / triage / wayfinder / ask-matt)の `/setup-matt-pocock-skills`
    呼び出しが発火名とズレて壊れていたのを `setup-agent-kit` へ統一。タイトル・openai.yaml・
    通常導線外の `qa` 参照も修正。→ **要カスタム表の「壊れている内容」を解消**。
  - **`meta/skill-selector`**: `references/catalog.md` を mizchi 外部レジストリ前提から
    **このrepo現存78本の一次catalog**へ全面再構築(install 文字列を `HukuKaich0u/agent-kit/skills/<path>` に統一、
    状態列を ✅/🔧/⏸/🎯 に対応、削除済み skill 行を一掃、現存と完全一致)。SKILL.md のシグナル例・
    APM 0.12/`--frozen-lockfile`・superpowers/chezmoi 参照・同期先を修正。evals も現行スタックへ作り直し。
  - **`meta/skill-finder`**: waxa 呼び出しを Bun 版へ、自動 `iterate` を使用停止(one-shot + 人間承認)、
    superpowers/chezmoi/nix-setup/cloudflare-deploy 参照と fork 先を現存 skill・この repo へ修正。
    外部ソース表の `obra/superpowers` 等は探索先として維持。
  - vendored 改造は `VENDORED.md` の「改造記録」に記録(mizchi 2本・mattpocock 7本+ローカル改名分)。
- **横断的な壊れ参照の一括掃討 + apm-usage/waxa-eval カスタム**(2026-07-24、本数変更なし=78本)。
  基盤3本で繰り返し出た壊れパターンを全skill横断で一掃した。
  - **SKILL-ja.md 10本を削除しEN一本化**: 上流で復活した日本語版が壊れ参照を英語版と重複して抱え
    drift の温床だったため削除。SKILL.md を唯一の正とする。生成スクリプト・check-vendored は SKILL.md のみ参照。
  - **全skill横断の壊れ参照除去**(subagent 3本で分担、Opus 本体がレビュー): 存在しない superpowers /
    削除済み chezmoi-management / pkfire / create-plan / cloudflare-deploy / workers-otel-utels /
    node-sqlite-vec / mizchi-blog-style / nix-setup / moonbit・gleam 系の参照を除去または現存 skill へ置換。
    vlmkit の install 元・見出し(vrt→vlmkit)も修正。→ **真の壊れ参照はゼロを確認**。
  - **`tooling/apm-usage`**: 手元の apm 0.26.0 で全コマンドを検証し実仕様へ更新
    (`apm update`/`--frozen`/`lock`/`outdated`/`doctor`/`audit --ci`・targets 解決順、chezmoi 節の一般化)。
  - **`meta/waxa-eval`**: 自動 `iterate` を使用停止(reseen≠resolved の誤収束)、Bun 版へ、パス誤り修正。
  - npm フラグ(pnpm `--frozen-lockfile` 等)・npm パッケージ名・skill-finder の外部ソース表
    `obra/superpowers` は正当な参照として保持(誤って消さない)。
- **frontend review 8本を単発手動レビューへ自立化**(2026-07-24、本数変更なし=78本)。
  上流の週次KPI自動運用フレーム前提で存在しない asset(`scripts/audit-*.sh`・`checklist/*`・`phase/*`・
  `templates/*`・`data/*.json`・`.frontend-review/` 出力パス)を参照して壊れていた8本を修正。
  中身のレビュー観点・コード例は保持し、壊れた配管だけ外した(subagent 3本で分担、Opus 本体がレビュー)。
  audit-*.sh 実行前提 → agent が直接 rg/コードを読む、固定出力パス → 会話報告 + 依頼時 `docs/reviews/*.md`、
  欠落 checklist/phase 参照除去、`gh issue create` 固定 → issue-tracker 準拠 or draft 提示、
  固定閾値・特定ライブラリを相対化(React Compiler 検出・実測基準・package manager 検出等)。
  review-triage は他7本への入口として案内を強化。→ **frontend 8本の欠落 asset 参照は解消済み**。
- **`meta/decision-interview` を追加 → 計79本**(2026-07-24、自作9本目)。
  曖昧なアイデアを1問ずつの構造化インタビューでユーザー所有の明示的な意思決定へ変える自作 skill。
  decision ledger(confirmed/open/assumptions/deferred)を保ち承認で締める。`grilling`(問い詰め)や
  in-progress の `to-questionnaire`(他者向け質問票)とは別の役割。catalog の grill 系に追加済み。
- **`lang/go`・`lang/python` を追加 → 計81本**(2026-07-24、自作10・11本目)。
  ユーザーの主要言語が **Rust / Go / Python / TypeScript の4つ(全部がっつり使う)**と判明したため、
  言語 skill を rust/typescript の2本から4本に揃えた。`lang/rust` と同じ構造(番号付き節・
  「AIがよく間違う」表・ツールゲート・日本語本文+コード例)で翻案。
  - go: error wrap・goroutine リーク防止・context 伝播・interface 設計(accept interfaces, return structs)・nil の落とし穴
  - python: 型ヒント・具体的例外・mutable default 引数・dataclass/TypedDict・context manager・async 落とし穴
  skill-selector のシグナル検出(go.mod / pyproject.toml)・言語 heuristic・catalog に4言語すべて反映済み。
  **注意: 今後 review/依存監査/test/CI/lint 系 skill は4言語すべてを想定する。非スタック扱い可は MoonBit / Gleam のみ。**
- **backend review lens 5本を4言語対応 + 出力パス修正**(2026-07-25、本数変更なし=81本)。
  自作の backend review lens(architecture/concurrency/data-access/transactions/triage)を、
  4言語(Rust/Go/Python/TS)と実 DB スタックに合わせて強化。中身のレビュー観点は保持し追加・訂正のみ。
  Rust/Tokio・Rust ORM(SQLx/Diesel/SeaORM)を追加、DynamoDB ProjectionExpression の誤りを訂正、
  `npx madge` を承認制に、固定出力パスを会話報告へ。詳細は上の要カスタム表(backend review lens)参照。
- **`tooling/to-tasks` を追加 → 計82本**(2026-07-25、自作12本目)。
  design record / tracker issue を作るほどではない現session限定の小規模作業を 2–5 step の
  ephemeral task list へ分解する軽量経路。`to-tickets` が committed design record を必須化した
  代償として空いた中間domainを埋め、小さい作業に issue を切らせないガードを兼ねる。

---

## まず判断が要るもの(❓ と 🔧 と 🔗)

ここだけ見れば仕分けは進む。✅ 残す組は下の全一覧に回した。

### 🔧 要カスタム — 全リセット(2026-07-20)で上流の壊れ参照が復活している

上流は mizchi / mattpocock の個人環境前提のため、以下は**使う前に修正が必要**。
旧修正版はすべて commit `0fd8ec3` にあり、個別に拾って再適用できる。

**優先度高(使うと決まっているのに壊れているもの):**

| skill | 壊れている内容 / 状態 |
|---|---|
| meta/setup-agent-kit | ✅ **解消済み(2026-07-24)**。`name` を `setup-agent-kit` へ統一、参照側6skillの呼び出しも修正 |
| meta/skill-selector | ✅ **解消済み(2026-07-24)**。`catalog.md` を現存78本の一次catalogへ全面再構築。SKILL.md/evals の壊れ参照も一掃 |
| meta/skill-finder | ✅ **解消済み(2026-07-24)**。waxa を Bun 版へ、自動iterate停止、superpowers/chezmoi/nix-setup 参照を修正 |
| tooling/code-review | 🔧 **部分解消**。`/setup-matt-pocock-skills` → `/setup-agent-kit` と、design record / ticketを読むIntent軸は修正済み。残: parallel subagent opt-in化・severity/根拠/対象行・findings上限の設計 |
| meta/waxa-eval | 🔧 **部分解消(2026-07-24)**。自動 `iterate` を使用停止(reseen≠resolved 明記)、Bun 版 `bun run src/cli.ts` へ、nix-setup 参照除去。残: ledger / convergence の運用を実 eval で回して確認 |
| frontend/review-* 8本 | ✅ **自立化完了(2026-07-24)**。欠落 `scripts/audit-*.sh`・checklist・phase・KPI パス参照を除去し、単発手動レビュー(agent が直接コードを読む)へ。旧自作 `.mjs`(0fd8ec3)は回収せず、agent 直読み方式を採用 |

**新規に設計するもの:**

- **`setup-quality-gates`** — 削除したMatt版 `setup-pre-commit` の置換候補。pre-commitは高速・staged対象・
  原則networkなし、pre-pushはtypecheck / unit test等、CIは完全検査という責務分離を基本にする。
  TypeScript / Rust・Bunを扱い、既存runner / formatter / hookを優先する。上書き・依存追加・新runner導入は
  承認制とし、意図的fail→復元→passで導入を検証できる形にする。pkfireはpolyglot monorepo・task graph・
  cacheの実需要が生じた場合だけ選択肢にする。棚卸し中には実装しない。

**依存先の棚卸し後に直すもの:**

- **meta/ask-matt** — skill群を状況別のflowへ案内するrouterとして残す。ただしMatt個人向けの名前、
  `/setup-matt-pocock-skills` 参照、固定的なcontext上限、会話型issue intakeを含まない導線、未精査skillの
  標準扱いを直す必要がある。行き先となるskillの採否が確定してから、`agent-kit-guide` または
  `workflow-router` 相当へ改名・再設計する。明示起動専用は維持する。

**価値が高いが運用を安全化するもの:**

- **deprecated/qa** — 会話型の不具合受付をissueへ固定する着眼点は残す。ただし上流版は草案承認なしの
  即時公開、background subagent、削除済み `UBIQUITOUS_LANGUAGE.md`、GitHub固定、`triage`との曖昧な境界を
  含む。具体的な利用場面とtracker運用を改めて吟味するまでは原形を維持し、通常導線には載せない。
- **meta/teach** — mission・信頼できるresources・理解を示したlearning recordsを複数sessionで蓄積する
  学習workspaceとして残す。技術以外にも使える。一方、現在のrepo直下を汚さない専用workspace確認、
  Markdown / 会話を標準としてHTML教材は必要時だけにする軽量化、Obsidian風linkとworkspace構成の不整合、
  GUI起動・外部community提案の承認境界を直してから使う。明示起動専用は維持する。
- **meta/writing-great-skills** — predictability、context / cognitive load、router、completion criterion、
  premature completion、leading word、no-op / sediment / sprawlという設計語彙に独自価値があるため、
  `skill-creator` の実装workflowとは分けた明示起動の設計原則referenceとして残す。Agent Skills標準と
  Claude Code / Codex固有の起動制御を分離し、negationやleading wordは絶対法則ではなく検証対象の
  heuristicとして扱うようcross-agent向けに直す。`skill-design-principles` 相当への改名も候補。
- **meta/tech-article-reproducibility** — how-to、tutorial、setup、検証記事の公開前に、読者が
  記事から同じ環境・コード・結果を再現できるかを確かめる独立した品質gateとして残す。
  個人essayや概念記事には発火させない。mizchi固有の絶対path、削除した `mizchi-blog-style`参照、
  自動subagent起動、点数の目的化、実行検証と読解上の推測の混同を直す。将来は、OS / runtime /
  dependency version、最小の完全コード、期待結果、失敗条件をevidence付きfindingsで出し、
  network・credential・環境変更を承認制にする明示起動の要カスタム候補。
- **CIクラスタ: devops/actions-ci-tuning ・ frontend/review-ci ・ devops/gh-fix-ci** — 3本とも一旦残し、
  通常のCI監査・高速化、frontend固有の計測・レビュー、既に失敗したPR checksの診断・修正という
  仮の責務分担で要カスタムとする。`actions-ci-tuning` はBun・既存package manager検出・変更前承認・
  action version / SHAの都度検証を追加する。`frontend/review-ci` は欠落した `scripts/audit-ci.sh`、checklist、
  phase、template、`.frontend-review/report/` 前提をどうするか、固定時間目標とfrontend固有部分が独立して
  必要かを別途吟味する。`gh-fix-ci` はread-only調査を先行し、修正実装は承認後とする境界を維持しつつ、
  存在しない `create-plan` 参照を外す。統合・削除は実案で使い比べてから判断する。
- **OTelクラスタ: devops/opentelemetry ・ devops/otel-node** — 前者をplatform / 言語に依存しない
  signal選択・span設計・context propagation・samplingのreference、後者をNode.js SDK初期化・
  instrumentation・診断として分離したまま、両方を要カスタムで残す。汎用側から
  JavaScript固有exporter例をNode側へ移し、SDK 2.xの `resourceFromAttributes`・`ATTR_SERVICE_NAME`・
  `traceExporter` / `spanProcessors`、現行semantic conventionsに更新する。ESMは公式loader hookと
  bundled ESMの制約を分け、「static importは常に自動計装不可」と断定しない。BunではNodeとの
  同一動作を仮定せず小さな実行検証を必須とし、高cardinality属性はPII・費用・保持方針を
  確認する。削除済み `cloudflare/workers-otel-utels` 参照を外し、Workers計装は必要な
  projectで改めて設計する。確認根拠はOpenTelemetry JS公式docs / repositoryの2026-07-24時点。
- **依存監査クラスタ: tooling/dep-lib-review ・ frontend/review-deps ・ tooling/tech-trend-watch** —
  `dep-lib-review` を日常的な依存棚卸しと承認後の安全な更新、`frontend/review-deps` をbrowser SPA /
  SSR / Edge / build / CI、bundle、tree-shakingの追加risk profile、`tech-trend-watch` を長期的な
  採否・移行判断として、3本とも要カスタムで残す。中核はlockfile / manifestからBun・npm・pnpm・
  yarn・Cargoを検出し、`bun audit` / `cargo audit` 等の既存toolでread-only調査を先行する。
  更新・codemod・lockfile変更・commitは完全な差分と検証方法を提示した後の承認制にし、
  patchの一括更新やlockfile削除を自動の回復手順にしない。CVEはdevDependency・browserという
  scopeだけでignoreせず、build / test / CIでの実行、user input到達性、supply chain、導入先の権限を確かめる。
  frontend側の欠落 `audit-deps.sh`・`audit-trend-watch.sh`・data・checklist・phase・report構造は後で必要性から
  作り直す。長期判断はprojectの実際の痛み、公式maintenance / release / security / compatibility、
  migration cost、小さなPoCを一次根拠とし、State of JS / CSS・Tech Radar・固定移行表は補助信号にする。
  TypeScriptだけでなくRustも対象にする。確認根拠はBun公式docs・RustSec・Cargo Book・GitHub dependency reviewの
  2026-07-24時点。
- **調査クラスタ: tooling/research ・ plugins/deep-research** — 統合せず、前者を軽量な一次情報調査、
  後者を明示的な重量級調査として分担する。`tooling/research` は要カスタムとし、通常はforegroundで
  数件の高信頼sourceを調べて会話内で回答する。永続的なMarkdown artifactは依頼または既存workflowが
  求める場合だけ、background agentは独立した並行作業に価値がある場合だけ使う。技術調査では公式docs・
  spec・source codeを優先しつつ、非技術分野では一次情報だけを絶対条件にせず、必要な報道・専門家分析も
  出所と限界を示して扱う。自作 `deep-research` はmulti-angle search、抽出、claim検証、反証探索、
  adjudication、citation auditを予算上限つきで行う別用途として現状維持する。単純なfact check・
  単一URL要約には使わない。将来の小改善候補として、`quick` を含む全presetで実行前に調査規模・
  所要時間・出力先を提示する。
- **glossaryクラスタ: meta/extract-glossary ・ backend/domain-modeling** — 統合せず、前者を既存repo群から
  用語・repository map・architecture・onboarding資料を根拠付きで作る初期採掘、後者を人間との会話で
  曖昧な用語・境界・重要な意思決定を合意し、継続更新する運用として分担する。`extract-glossary` は
  `confirmed` / `inferred` / `needs-check` と小さな図への分割を維持しつつ、`.claude/skills/` 固定例を
  cross-agent化し、GitHub以外のremote、調査日・commit、差分更新と陳腐化確認、diagramのopt-inを補う。
  `domain-modeling` は `setup-agent-kit` のdomain docs設計と一緒に、`CONTEXT.md` / `CONTEXT-MAP.md` /
  `docs/adr/` の固定配置をprojectごとの既存規約優先へ直し、合意事項も即時書き込みではなく差分提示後に
  反映する。ADRをhard-to-reverse・surprising・real trade-offに限定する原則は残す。2本とも要カスタム。
- **review入口クラスタ: backend/review-triage ・ frontend/review-triage ・ tooling/code-review** —
  一旦3本とも削除せず要カスタムで残す。backend / frontendのtriageはrepo全体を分類して適用するdomain lensを
  選ぶ入口、`code-review` は固定点からの差分をStandards / Intent軸で見る入口として分担する。
  `backend/review-triage` はDynamoDB・D1・Bun・Rust workspace・Cloudflare Workers等の実stack検出を補い、
  repo全体とdiff reviewのscopeを明示する。`frontend/review-triage` は欠落した `audit-triage.sh`、
  app classification / known issues checklist、phase文書、report構造を、手動domain reviewの入口として
  本当に必要かを含めて後で作り直す。`code-review` は古い `/setup-matt-pocock-skills` 参照を直し、
  parallel subagentをopt-inにし、correctness・tests・securityの扱い、severity・根拠・対象行、
  人間が把握できるfindings数の上限を設計する。
- **backend review lens 4本 + triage: review-architecture ・ review-concurrency ・ review-data-access ・
  review-transactions ・ review-triage** — ✅ **カスタム完了(2026-07-25)**。4言語(Rust/Go/Python/TS)対応 +
  出力パス修正を実施(subagent 2本で分担、Opus 本体がレビュー)。
  - 共通: 出力先の固定パス `.backend-review/report/latest/md/*.md` → 会話報告 + 依頼時 `docs/reviews/*.md`。
  - `architecture`: 依存グラフ取得に Rust(`cargo modules`/`cargo tree` + grep fallback)を追加し4言語化。
    `npx madge` を承認制(ネットワーク越しツール)に。axum/actix 例・workspace のクレート間 vs モジュール間循環。
  - `concurrency`: 全項目に Rust/Tokio 追加(JoinSet/buffer_unordered、spawn_blocking、JoinHandle 破棄の
    panic、timeout/CancellationToken、select! キャンセル安全性、Arc<Mutex> の await 跨ぎ)。`lang/rust` §6 と整合。
    非スタックの Ruby を Rust に置換。
  - `data-access`: N+1 表に Rust ORM(SQLx/Diesel/SeaORM)を追加。**DynamoDB ProjectionExpression の誤りを訂正**
    (RCU/WCU は full item size で決まり projection では減らない。network/payload 理由でのみ flag)。
  - `transactions`: Rust の illusory tx 罠(SQLx の `&mut *tx`、Diesel の別 conn)、Cloudflare D1 の
    single-writer + 分散レイテンシ補足、engine 上限は version 確認する注記。
  - `triage`: 出力パスを会話報告へ(stack 検出は既に4言語対応済み)。
- **frontend review lens: review-performance ・ review-security** — 2本とも要カスタムで残す。
  `performance` はReact renderingのprofiler-first lensに絞り、100 items以上を一律virtualizeする閾値や
  inline callbackを悪、manual `memo` / `useMemo` / `useCallback`を良とする固定判定を外す。React version・
  Compiler有無・DOM complexity・target device・実測profileを根拠にし、欠落checklistを参照しない。
  `security` はrisky sink、public env、session storage、auth boundary、security headersのread-only reviewとして
  残す。欠落 `audit-security.sh` / checklistを作り直し、cookie / BFF / OAuth・OIDC等の実構成を特定してから
  評価する。`SameSite=Strict`・固定token lifetime・`X-Frame-Options`を絶対条件にせず、CSRFとのtrade-offや
  CSP `frame-ancestors`を対象systemと現行OWASP guidanceに沿って扱う。stagingへの接続・実検証は対象と
  許可を確認してから行う。
- **frontend review lens: review-hygiene ・ review-state ・ review-testing** — 3本とも要カスタムで残す。
  `hygiene` はTypeScript・lint・dead code・duplicationのread-only監査とし、欠落した3本のaudit script /
  checklist依存を作り直す。package managerと既存scriptを検出し、tool追加・baseline作成・継続KPI運用は
  承認制にする。formatter / linterの分離を絶対条件にせず、設定競合・二重実行・CI時間という実害を見る。
  `state` はserver / URL / form / local / globalの分類軸を残す一方、TanStack Query・React Hook Form等の
  特定libraryを正解として強制しない。既存framework規約を優先し、二重source of truth、同期漏れ、
  不要なglobal化、広範囲rerender、logout時のdata残留を具体的evidenceで報告する。
  `testing` は欠落 `audit-coverage.sh` / phase / checklistを作り直し、既存runnerとpackage managerを検出する。
  固定coverage率・controller branchごとのE2E・in-source test標準化を外し、重要なuser journey・変更risk・
  過去障害からtestを選ぶ。observable behaviorとtest failureのspec / implementation / test誤りtriageは維持し、
  test実行は外部service・data mutation・必要credentialを確認してから行う。
- **Playwrightクラスタ: testing/playwright-cli ・ testing/playwright-test** — 統合せず、前者を既存Playwrightの
  安全な起動・実行、後者をtest suite / config / CIの設計・実装・reviewとして、両方を要カスタムで残す。
  `playwright-cli` は `npx` 固定と存在しない `claude-in-chrome` 前提を外し、Bun・npm・pnpm・yarnとlocal
  dependencyを検出する。暗黙package install、browser download、`--with-deps`、GUI起動、外部URL・credential・
  staging data変更は事前確認する。`playwright-test` は606行の本体を薄いrouterとtopic別referenceへ分け、
  package manager・Node / action version・shard数・browser matrix・retryをrepoと実測から選ぶ。
  存在しない `expect.configure({ flaky: true })` とtestingで非推奨の `networkidle` 例を外し、
  web-first assertion、test isolation、retry後のflaky分類、必要時の `--fail-on-flaky-tests`、blob report /
  mergeは対象versionの公式docsに基づいて使う。
- **画像reviewクラスタ: ai/review-image ・ ai/vlmkit** — 統合せず、前者を単画像の意味・内容をVLMで
  判定する軽量review、後者をbaseline / currentのpixel・computed style・a11y等の差分を測るVRT基盤として、
  両方を要カスタムで残す。`review-image` はDenoからBun / Nodeへ移植し、OpenRouterへのprivate image送信、
  model・費用上限・timeout・retry、CIのfail-open / fail-closedを明示する。VLM gateはfixtureで
  false positive / negativeを測るまで必須checkにせず、script errorと画像failを区別するexit codeは維持する。
  `vlmkit` はローカルの `@mizchi/vrt` 0.5系記述を、0.6.0で `@mizchi/vlmkit`へ改名・拡張された現行上流に
  合わせ、必要部分だけ取り直す。まずHTML / URL / PNG diff、agent report、mask、snapshot stability、
  人間によるbaseline承認という決定論的範囲に絞る。CSS auto-repair、self-healing、subagent migration等の
  自律loopは標準導線に入れない。Node / Playwright / package導入、外部URL、baseline更新は事前確認する。
- **SQL監査クラスタ: sql/plan-audit ・ sql/schema-audit** — 前者のquery plan baseline diffと、
  後者のSQLite index coverage・FK列indexの保全という設計は残すが、そのままCI gateにはしない。
  `plan-audit` は新規query、同数のSCAN置換、EXPLAIN errorを必ず検出し、SQLiteでは実際のschema / stats、
  Postgresでは対象major version・代表data・custom / generic plan差を確認する。旧Postgres runnerは
  `0fd8ec3` から設計材料として回収できる。`schema-audit` のdrop candidateはcatalog外queryとproduction usageを
  確認する人間向けsignalに限定し、N+1はRust / TypeScriptのASTまたは実際のquery layerに合わせて作り直す。
  engineと導入projectが決まるまでは通常導線に載せない要カスタム候補。
- **tooling/to-tasks** — durableなrecordやtracker issueを作るほどではない2–5段階の作業を、現session限定の
  ephemeral task listへ分解する。Issue・label・dependencyを一切書かず、multi-session化・他agentへの委譲・
  durableな追跡が必要になったら `to-spec` → `to-tickets` へ昇格する。
- **tooling/implement** — work ticketとそのdesign record、または確認済みのcurrent-session task listから `tdd`、段階的検証、`code-review` をつなぐ薄いorchestratorとして
  残す。一度に一つの合意済みscope、開始時のbase commitと既存変更の保全、狭いtestから広いtestへの展開、
  review findings修正後の再検証、理解可能なvertical sliceを原則にする。実装・検証・review結果を提示し、
  commitとtracker更新は明示承認後に行うよう直す。`code-review` 修正後に使う高優先度候補。
- **tooling/to-spec** — `grilling` で合意した会話を、`docs/specs/YYYY-MM-DD-<slug>.md` の不変design recordへ
  固定する境界として残す。current truthを担わせず、承認後に一度だけ作成する。恒久的な判断はADRへ、実行可能な
  acceptance criteriaは後段ticketのcode / testへ分離する。方向転換時は既存recordを編集せずre-grillして
  successorを作る。`ready-for-agent` を付けずtrackerへ公開しない高優先度カスタムとして実装済み。
- **tooling/to-tickets** — approved design recordだけを入力に、vertical slice・blocking graph・expand–contractで
  work ticketへ分解する。ticketは不変recordのパスを参照し、parent spec issueを作らない。完全なissue本文・label・
  blocking関係を承認後に公開し、human / secret / 外部操作が必要なticketは `ready-for-agent` にしない。
  部分的な公開失敗で重複を作らない回復手順とDAG検証は追加検討事項。
- **tooling/triage** — 将来カスタマイズする会話型QAから渡されるものを含む既存issue / PRを、検証・
  maintainer判断・agent briefを経て次のstateへ進める中核は残す。tracker変更前に完全な操作内容を承認し、
  外部PRは現在のworktreeへcheckoutせず、untrusted code実行には隔離と明示承認を要求する。
  `ready-for-agent` は追加質問なしで開始可能だがcommit等にはcheckpointがある状態とし、decision / secret /
  外部権限 / 手動検証が残るものは除外する。`.out-of-scope/` はprojectごとのopt-in、再実行はidempotentにする。
  `setup-agent-kit` と合わせて直す中程度・高優先度のカスタム候補。
- **tooling/wayfinder** — 一度に見通せない大規模案件をdestination・decision tickets・fog of warへ分け、
  一sessionで一判断だけ解決して道が見えたら `to-spec` へ渡す設計は残す。destination、map草案、ticket / edge、
  次に扱うfrontier、resolution、tracker更新をそれぞれ人間が承認する。research subagent / branchはopt-in、
  ticketは削除せずclose / supersedeで履歴を残し、外部service・credential・権限・data変更は個別承認とする。
  100K tokenではなく人間が一度に理解・reviewできる問いを単位にし、並行更新と部分失敗から回復可能にする。
  明示起動専用のまま、大幅な安全化後に試す高価値カスタム候補。
- **tooling/apm-usage** — このrepoの配布・依存管理と、他のmeta skillが正確なAPM構文を参照するために
  残すが、APM 0.26.0に合わせた優先度の高いカスタム候補。非推奨の `apm install --update` を
  `apm update`、存在しない `--frozen-lockfile` を `--frozen` へ直し、`apm lock` / `outdated` /
  `doctor` / `audit --ci` を反映する。`target:` / `targets:` のschema不整合、英語版・日本語版・
  referencesのdriftを解消し、削除済み `chezmoi-management` 参照と未採用のchezmoi前提を外す。
  skill作成一般は `skill-creator` に任せ、ここではAPM固有のmanifest・lockfile・install / update /
  audit・配布に責務を絞る。
- **tooling/ast-grep-practice** — 通常のlinterを優先し、project固有の構造規則と安全なmigrationだけを
  valid / invalidテスト先行で実装する設計は残す。`retrospective-codify` が発見した知見をTypeScript /
  Rust / Go / Pythonの機械的ruleへ落とす実行先にもする。一方、ast-grep 0.44.0ではstructured outputは
  `--format json` でなく `--json` で、Go例の同階層に重複した `has:` はYAMLで上書きされる。
  全サンプルをfixtureで実行検証し、本文と約500行のreferencesの重複、英語版・日本語版のdriftを減らしてから
  通常利用する要カスタム候補。
- **tooling/conventional-changelog** — TypeScript / Rust等のrelease方式を選ぶ比較入口として残すが、
  Conventional Commits仕様がsemver上の意味を定める `fix` / `feat` / breaking changeと、各toolの
  preset方針を分離する。release-pleaseのmonorepo対象はcommit scopeでなくpackage pathを基準にし、
  registry publishは別責務であることを明記する。beta→rc→stable、`workspace:*`、cargo-release連携は
  fixture repoで検証し、削除済み `chezmoi-management` / `pkfire` と存在しない `npm-release` 参照を外す。
  「自動生成なら漏れない」等の断定を避け、方式選択と人間のrelease note reviewから最新公式docsへ渡す
  薄い判断ガイドへ縮小する中優先度の要カスタム候補。
- **tooling/justfile** — 新しいtask runnerを選ぶskillではなく、既存repoのjustfileを理解・安全に編集する
  小さなreferenceとして残す。自分に関係ないpkfire優先をdescriptionから外し、存在しない
  `set ignore-errors`、deprecatedな `env_var*()`、確認なしのtag pushと広い `rm -rf`、無条件の
  dotenv読込を修正する。CIではjust version / action SHAをpinし、新しい構文を使う場合は
  `set minimum-version` を示す軽度の要カスタム候補。
- **tooling/upstream-fix-and-pin** — 依存libraryの修正を上流へPRし、正式releaseまで下流を一時overrideして
  確実に撤去するworkflowとして残す。mizchi固有の `~/ghq` とpnpm v10専用記述を外し、実際に使うBun /
  npm / pnpmとCargoの `[patch]` / git `rev` を対象にする。小さな修正はpackage managerのpatch機能も
  比較し、共有branchではfull SHAとlockfileを固定、local path / `link:` は個人検証に限定する。
  merge時のmain HEADでなく対象PRの正確なcommitを使い、上流へ `dist/` 管理を強制しない。
  自動scheduleは状態確認と変更案まで、適用は承認制とし、通常versionへ戻すexit criteriaを導入時に記録する
  中優先度の要カスタム候補。
- **meta/skill-selector** — ✅ **カスタム完了(2026-07-24)**。`references/catalog.md` を現存78本の
  一次catalog(install=`HukuKaich0u/agent-kit/skills/<path>`、状態列=✅/🔧/⏸/🎯、現存と完全一致)へ
  全面再構築。SKILL.md のシグナル例・APM 0.12/`--frozen-lockfile`・superpowers/chezmoi 参照・
  同期先 `mizchi/skills` を修正。evals も現行スタックへ作り直し ledger リセット。
  残る継続課題: 外部候補を複数project実績後にcatalog昇格させる運用は今後の実運用で回す。
- **meta/skill-finder** — ✅ **カスタム完了(2026-07-24)**。waxa 呼び出しを Bun 版
  (`bun run src/cli.ts`、npx はフォールバック)へ、自動 `iterate` を使用停止(one-shot + 人間承認)に。
  削除済み `nix-setup/evals` / chezmoi / cloudflare-deploy 参照、superpowers 参照、`mizchi/skills` fork先、
  `executor: claude-cli`・`self_report` 表記を修正し ledger / rejection-log を現存 skill 前提へ。
  外部ソース表の `obra/superpowers` 等は探索先として維持。
- **meta/optimizing-descriptions** — 棚卸し完了後にagent-kit全体のfrontmatter `description` を横断監査する
  明示起動のbatch workflowとして残す。mizchi固有のProject=常時pushy / Meta=明示起動という二分法を、
  明示依頼・task自動・file / error / tool signal・他skill専用・保留という実際の発火方針へ置き換える。
  削除済みCloudflare / AWS / sqlite-vec / dotenvx / Gleam / chezmoiとsuperpowersの例、`~/.claude`直copy、
  commit規約を外す。静的な1024文字・intent・境界監査とshould / should-not trigger query作成を担当し、
  新規skillの単体作成・trigger evalは公式 `skill-creator`、output品質は `waxa-eval` と分担する
  中優先度の要カスタム候補。
- **meta/retrospective-codify** — 試行錯誤で得た再発しそうな教訓を、明示依頼された場合だけ恒久化する
  meta skillとして残す。最初の失敗・最終的な成功・両者を分けた知見を根拠にし、既存ruleとの重複を調べ、
  恒久化しない選択肢も含めて書込み前に承認を取る設計は維持する。「task完了前」等の自動発火を誘う本文、
  `~/.claude`固定、無断のglobal書込み、superpowers / `update-config` 参照、MoonBit例を外す。
  保存先は既存compiler / linter / config、project instructions、agent-kitのskill、ast-grep ruleの順に
  適性を比較し、skill化は公式 `skill-creator` へ渡す。出力を根拠・保存先・重複確認・変更案へ縮める
  中優先度の要カスタム候補。
- **meta/empirical-prompt-tuning** — skill / instructionsの品質を作者の再読だけで判断せず、fresh agentに
  固定scenarioを実行させてcritical要件・曖昧点・agentが補った判断から改善する方法論として残す。
  descriptionと本文の整合確認、通常例とedge caseの事前固定、修正を一themeに絞る点は維持する。
  Claude固有の `Task` / `Agent` と取得不能な `tool_uses` / `duration_ms` 前提、superpowers参照、
  自動発火を誘う本文、plateauまで無制限に回す設計を外す。初回はscenario 2件・各1回・修正案1件までとし、
  人間が結果と次iterationを承認する。runtime間で比較できない細かな速度閾値より成果物・critical要件・
  qualitative feedbackを優先し、継続的・CLI評価は `waxa-eval` へ渡す中優先度の要カスタム候補。
- **meta/waxa-eval + tools/waxa** — skillあり / なしのbaseline、typical / edge scenario、複数grader、
  ledgerを永続化する評価基盤として残すが、現状の自動 `iterate` は使用停止とする。実装はskillを編集せず
  同じpromptを再実行し、未解決の同一問題を `reseen` とすると `new_unclear_count=0` になり、2回続けば
  誤って収束判定できる。当面はローカルBun版のone-shot評価と `--baseline` だけを正規導線にし、結果と
  変更案を人間が承認してskillを編集した後に次回を実行する。収束を未解決問題ゼロで判定し、`iterate` は
  checkpoint方式へ変更または削除する。npm / Deno中心のdocs、hardcodeされた `claude -p` とmodel、
  superpowers参照を整理し、executor設定とledger / convergence testを追加してから通常利用する
  高優先度・使用保留の要カスタム候補。
- **meta/extract-glossary** — 複数repoからdomain用語、repo責務、依存関係、調査入口を根拠付きで作る
  onboarding / agent参照資料として残す。`confirmed` / `inferred` / `needs-check` の区別とsource追跡は
  維持するが、glossary・repository map・architecture・図の固定セットを毎回作らず依頼に必要なものだけに
  絞る。通常docsを基本とし、反復参照される場合だけskill化する。`.claude/skills` / GitHub固定を外して
  remote host + commit SHAを使い、対象repo・調査深度を先に限定する。private情報を外部へ出さず、
  `.env` / credential / secret / 生成物を除外し、調査commitと更新日を記録する。小図はMermaid、
  複雑な図は `drawio` へ渡す軽度〜中程度の要カスタム候補。
- **backend/improve-codebase-architecture** — 独立scannerとして `backend/review-architecture` と重複させず、
  自作reviewの証拠付きfindingsから人間が選んだ一候補を `codebase-design` + `grilling` で改善設計し、
  `to-spec` へ渡す役割に絞る。自動Explore subagent、CDN依存HTML、GUI自動起動、固定用語の強制を外し、
  Markdownで3〜5候補以内、domain docs変更と代替interface用subagentは承認制とする。
  `architecture-improvement-planning` 相当への改名も候補とする統合カスタム。
- **formal-methods/reconciler ・ drift-guard** — 最初の小さなformal check作成と、その後のspec / code / model
  drift保守を担う対として残す。設計は有用だが、本人の理解と具体的な適用例ができるまでは通常導線に載せない。
  普通のunit / property-based testで十分かを先に判定し、TypeScriptの認可・configとRustのstate / invariant、
  現在利用可能なZ3を主対象にする。未導入toolは承認制、MoonBit選択肢は外し、property変更はdomain ownerの
  判断を必須にする。実案件で小さく試してからカスタマイズする保留・要カスタム候補。

**存在しない skill への参照(発火すると迷子になる):**

> ✅ **全解消済み(2026-07-24)**。全skill横断で真の壊れ参照はゼロを確認済み。
> 以下は解消記録(何をどこから消したか):
>
> - superpowers 系(empirical-prompt-tuning / optimizing-descriptions / retrospective-codify)→ `writing-great-skills` 等へ
> - pkfire(justfile / conventional-changelog)→ 除去
> - `chezmoi-management`(apm-usage)→ 汎用 dotfiles manager へ一般化
> - `cloudflare-deploy` / `aws-vault-mfa-iam` / `node-sqlite-vec` / `dotenvx`(optimizing-descriptions の trigger 例)→ 現存 skill の例へ
> - `nix-setup` eval 例(waxa-eval)→ waxa-eval 自身の eval へ
> - `create-plan`(gh-fix-ci)→ 除去(plan 方針は inline draft へ)
> - `workers-otel-utels`(opentelemetry / otel-node)→ 除去
> - `mizchi-blog-style`(tech-article-reproducibility)→ 一般表現へ
> - `cloudflare-deploy`(lang/typescript)→ 除去(npm `@cloudflare/workers-types` は保持)
>
> 注: npm フラグ(pnpm `--frozen-lockfile` 等)・npm パッケージ名・skill-finder の外部ソース表
> `obra/superpowers` は**正当な参照として保持**。

**mizchi 個人環境の値・古い記述(残る課題):**

- ai/vlmkit — install 元・見出しは修正済み。ただし `@mizchi/vrt` 0.5系の CLI コマンド体系・
  バージョン番号は未更新(0.6.0 `@mizchi/vlmkit` への全面追従は要カスタム時に)
- devops/opentelemetry ・ otel-node — 削除済み Workers 版参照は除去済み。OTel SDK 2.x 未対応の
  コード例の全面更新は未着手(要カスタム時に)

**その他(方針判断):**

- ✅ `SKILL-ja.md` は 2026-07-24 に10本削除し EN 版へ一本化。壊れ参照の drift 温床を解消。
  「Agent compatibility」節の再追加は別途判断(今回は見送り)。
- sql/plan-audit の PG/RDS 用 EXPLAIN runner(自作)は外れている。必要時に `0fd8ec3` から設計材料として回収する

### ❓ 保留・様子見

- **in-progress/batch-grill-me** — 上流の標準導線は、1問ずつ掘る `grill-me` / `grill-with-docs` / `grilling`。
  一方これは、前提が解決済みの独立した質問だけをラウンド単位でまとめる明示起動の実験版。
  通常導線には載せず、実案件で一度試してから昇格または削除を判断する。
- **in-progress/claude-handoff** — 通常の `handoff` が引き継ぎ文書を一時保存するのに対し、
  会話要約を渡して `claude --bg` で背景agentを即起動する明示起動版。ローカルCLIは必要な
  `--bg` / `--name` / `claude agents` をサポート済み。通常導線には載せず、実利用後に昇格を判断する。
- **in-progress/loop-me** — 反復する個人・チーム業務を発見し、workflow仕様へ落とす着眼点は固有。
  ただし現状はworkspace初期化・承認境界・仕様schemaが未整備。完全自律loopは、人間の認知を越えた
  outputが蓄積して障害時に修正不能になる危険もあるため、将来カスタムする場合も「人間が理解・修正できる
  checkpointを持つ反復業務の仕様化」を原則とする。当面は通常導線に載せず `in-progress` に留める。
- **in-progress/to-questionnaire** — ユーザー自身にも不足している知識を、別の有識者から非同期で
  引き出す質問票を作る。`grilling` の代替ではなく、人間の知識境界を尊重する固有の役割がある。
  締切・利用先・機密性の確認、保存先、送付前承認を整備するまでは `in-progress` に留める。
- **in-progress/wizard** — 人間がブラウザ操作とcheckpointを担い、agentが再現可能な対話scriptへ
  手順を落とす共通基盤。完全自律化を避けつつsetupを再現可能にする価値がある。一方、現templateは
  `.env` のgitignore確認、対象GitHub repoの明示、既存値の上書き承認、変数名・値の検証、TTY必須化が
  不足している。秘密情報まわりを安全化するまでは `in-progress` の要カスタム候補とする。
- **in-progress/setup-ts-deep-modules** — dependency-cruiserでTypeScriptのpublic entry pointを
  機械的に守り、pass→意図的違反でfail→復元してpassまで証明する設計は有用。優先度の高い要カスタム候補。
  `bun.lock` 対応、実際のmodule root検出、明示的public API、contract testとprivate unit testの分離、
  一時fixtureでのrule検証、cycle ruleの段階導入へ直してから昇格する。
- **in-progress/writing-fragments** — 技術記事・個人essayを問わず、構成を決める前に本人の経験・主張・
  比喩・違和感を素材として蓄えるexplore段階。後段を一括生成せず本人の認知を残せるため維持する。
- **in-progress/writing-shape** — 固定した素材から、読者の前提と論旨の依存関係を守りつつ一段落ずつ
  組み立てるexploit段階。説明・主張中心の記事の標準候補として維持する。
- **in-progress/writing-beats** — `writing-shape` の重複ではなく、場面・問い・角度・感情の遷移を
  beat単位で選ぶessay向けの別UX。AIが生む格差、時間の価値観など技術に閉じない執筆用途があるため、
  `fragments → shape` と `fragments → beats` の二系統を `in-progress` で試す。
- **meta/waxa-eval ↔ empirical-prompt-tuning** — 同じ「skill 品質評価」。waxa-eval=CLI/CI 永続化、empirical=in-session subagent。両方 waxa 移植で生きる。役割分担は明確なので共存。

### 🔗 統合候補 — 機能が重なってる群(整理すると本数が減る)

1. **CI系**: `devops/actions-ci-tuning` ↔ `frontend/review-ci` ↔ `devops/gh-fix-ci`。3本とも要カスタムで残し、
   予防的監査・frontend固有review・失敗PR診断の仮分担を実案で検証してから統合可否を決める。
2. **OTel系2本**: `devops/opentelemetry`(汎用設計)↔ `otel-node`(Node実装)の階層で両方残す。
   SDK 2.x・semantic conventions・ESM loader・Bun検証・削除済みWorkers版参照を直す要カスタム。
3. **依存監査系3本**: `dep-lib-review`(共通運用)↔ `frontend/review-deps`(frontend追加profile)↔
   `tech-trend-watch`(長期採否判断)に責務分担して3本とも残す。Bun / Rust・承認境界・CVE到達性・
   欠落asset・一次情報優先を直す要カスタム。
4. **skill運用メタ系**: `skill-finder` ↔ `skill-selector`(対で設計・境界明確)、`empirical-prompt-tuning` ↔ `waxa-eval`(同手法の手動版/CLI版)。

---

## ✅ 残す組(全一覧・出自別)

判断不要でそのまま使えるもの。出自ごとにまとめた。

### 自作(11本)— 一番信頼できる、君が書いたもの

- backend/review-architecture — BE構造・依存方向・境界漏れをレビュー
- backend/review-concurrency — 非同期/並行処理の危険パターン
- backend/review-data-access — DBアクセスのN+1/過剰取得(◎ DynamoDB対応)
- backend/review-transactions — トランザクション整合性(◎ PG/SQLite/DynamoDB差分表)
- backend/review-triage — BEレビューの入口
- db/migration-safety — DB移行の安全性分類(◎ PG/RDS/SQLite/DynamoDB全対応)
- lang/rust — Rustベストプラクティス
- lang/typescript — TypeScriptベストプラクティス
- lang/go — Goベストプラクティス(2026-07-24 追加。error wrap・goroutineリーク・context・interface設計・nil)
- lang/python — Pythonベストプラクティス(2026-07-24 追加。型ヒント・具体的例外・mutable default・dataclass・async)
- meta/decision-interview — 曖昧なアイデアを1問ずつの構造化インタビューでユーザー所有の明示的決定へ(2026-07-24 追加。grilling=問い詰めと違い決定の明示化・記録)

※ meta/empirical-prompt-tuning は旧自作版があったが mizchi 版で置換済み(mizchi の項に移動)

### mattpocock(33本, MIT, VENDORED.md 管理済み)

初期取り込みの12本(精査済み):

- meta/setup-agent-kit — repo ごとの issue-tracker/domain 設定を scaffold(🔧 リセットで中身は上流 `setup-matt-pocock-skills` のまま)

- meta/grilling — 計画を1問ずつ問い詰める
- meta/handoff — 会話を引き継ぎ文書に圧縮
- testing/tdd — red-green-refactor
- backend/codebase-design — 深いモジュール設計の語彙
- backend/domain-modeling — 🔧 合意した用語・ADRを継続更新する運用として要カスタム
- tooling/diagnosing-bugs — 難バグ/性能劣化の診断ループ
- tooling/resolving-merge-conflicts — マージ衝突解消
- tooling/git-guardrails-claude-code — 危険git操作をhookでブロック(Claude Code専用)
- tooling/prototype — 使い捨てプロトタイプで設計検証
- tooling/research — 🔧 軽量調査として要カスタム。重量級の deep-research とは分担
- tooling/code-review — 🔧 差分review入口として要カスタム

完全ミラー時に追加し、現在残している実用系11本(精査進行中、2026-07-20):

- meta/ask-matt ・ grill-me ・ grill-with-docs ・ teach ・ writing-great-skills、
  tooling/implement ・ to-spec ・ to-tickets ・ triage ・ wayfinder、backend/improve-codebase-architecture
  ※ to-spec / to-tickets / triage が入ったので setup-agent-kit のテンプレが言及する skill 群が揃った
- deprecated/ は `qa` 1本を要カスタムで原形維持し、他3本は削除済み。in-progress/ 9本は個別精査し、通常導線に載せず保留または要カスタムとした。
  personal/ は `edit-article` と `obsidian-vault` を削除し、精査完了(0本)。

### Agents365-ai(1本, MIT)

- tooling/drawio — draw.io CLIで図生成(君が v1.16.0 まで検証済み。v1.18 で renderlint/typography/tint ladder/legend/表、v1.19 で外部レビュー3件反映=ラベル幅対応ポート検査・重大度3分類ゲート・autolayoutレーン割当。60ノード級まで live 検証済み)

### mizchi(36本, MIT 既定 / 一部 Apache-2.0, VENDORED.md 管理済み)

要カスタマイズ:
- sql/plan-audit ・ sql/schema-audit — plan baselineとSQLite index / FK監査。engine・query layerに合わせて再設計

汎用で使える(○ / -):
- ai/review-image ・ ai/vlmkit — 画像/VRTレビュー
- devops/actions-ci-tuning ・ devops/gh-fix-ci ・ devops/opentelemetry ・ devops/otel-node — CI/OTel
- frontend/review-*(8本)— 週次orchestratorを置かず、必要な領域を手動起動するフロントレビュー一式
- lang/translate-programming-language — ✅ oracle-driven parityで言語・runtimeを安全に移植。上流のまま維持
- meta/empirical-prompt-tuning — 🔧 人間の継続承認を挟む小規模なfresh-agent評価へ直す要カスタム
- meta/waxa-eval — 🔧 自動iterateを止め、Bun版の人間承認付き評価基盤へ直す要カスタム
- meta/retrospective-codify — 🔧 明示依頼された再発防止知見だけを恒久化する要カスタム
- meta/optimizing-descriptions — 🔧 棚卸し後のdescription一括監査へ直す要カスタム
- meta/skill-selector — 🔧 現在の棚卸しを一次catalogにする最優先の要カスタム
- meta/skill-finder — 🔧 外部候補の安全な探索・段階評価を担う高優先度の要カスタム
- meta/extract-glossary — 🔧 必要量だけ作る根拠付きonboarding資料生成へ直す要カスタム
- testing/playwright-cli ・ playwright-test — Playwright
- tooling/apm-usage — ✅ **カスタム完了(2026-07-24)**。実 apm 0.26.0 で全コマンド検証し、`apm update`/`--frozen`/`lock`/`outdated`/`doctor`/`audit --ci`・targets 解決順を反映、chezmoi 節を一般化
- tooling/ast-grep-practice — 🔧 ast-grep 0.44.0で全実例を検証・簡潔化する要カスタム
- tooling/conventional-changelog — 🔧 release方式の薄い判断ガイドへ縮小する要カスタム
- tooling/dep-lib-review ・ tech-trend-watch — ツール系
- tooling/justfile — 🔧 既存justfile専用の安全なreferenceへ絞る軽度カスタム
- tooling/upstream-fix-and-pin — 🔧 一時的な依存overrideの導入・検証・撤去を扱う要カスタム

完全ミラー時に追加し、現在残している3本(全て精査済み、2026-07-23):

- 新規: formal-methods/drift-guard ・ reconciler
- 再取込(非スタック/個人用途として一度削除したもの):
  meta/tech-article-reproducibility

---

## 残った論点(次に向き合うもの)

1. **壊れ参照の再修正を「使う順」に少しずつ**(全リセット後の新しい進め方)。
   上の 🔧 要カスタム表が対象リスト。旧修正は commit `0fd8ec3` から拾えるが、
   そのままコピーせず「本当に要るか」を見てから当てる。
   - ✅ 済(2026-07-24): setup-agent-kit(名統一)・skill-selector(catalog再構築)・skill-finder(agent-kit整合)。
   - 次の優先候補: **apm-usage**(APM 0.26.0準拠。selector/finder が委譲する先)、**waxa-eval**(自動iterate誤収束バグの本丸)、
     **code-review の Intent軸残り**、frontend audit スクリプト。
2. **「もっと良い公開資産がないか」の精査**(君の本命)。tooling/testing/backend は使うが、より優れた mizchi/mattpocock/一流の skill がないか skill-finder + waxa-eval で精査したい。特に tooling/testing から。
3. **domain review系14本**(backend 5 + frontend 8 + tooling/code-review)は最大クラスタ。
   frontend 8本は手動起動で残したが、欠落asset参照を外すか旧自作auditを必要な分だけ回収する精査が必要。
4. **再正規化の方針決め**: SKILL-ja.md の扱い・Agent compatibility 節・README 自動生成(gen-skill-readme.rb)を再適用するか、上流のまま運用するか。
5. **完全ミラー時の追加分を順に精査**: 現在残る mattpocock 実用系11本(特に to-spec / to-tickets / triage は code-review・setup 系と連動)と
   formal-methods 2本は中身を見る価値あり。deprecated / in-progress / personal は内容を理解してから個別判断する。

※ 上流追従の仕組み(VENDORED.md + check-vendored.sh 両上流対応)は、明示的な除外を考慮して維持する。
2026-07-24 から配布基盤3本(setup-agent-kit / skill-selector / skill-finder)のカスタムを開始した。
改造した skill は `VENDORED.md` の「改造記録」に記録し、上流差分はそこを基準に確認する。
