---
created: 2026-07-26
author: Koki Aoyagi
type: report
---

# Skill 監査 2026-07-26 — 即戦力 skill(mattpocock 開発フロー + review 系)

catalog / VENDORED の記載を信用せず、上流実物との diff と本文レビューだけで
「どこを直せば使えるか」を確定した監査の記録。未監査 skill に同じ手順を
適用できるよう、手法も残す。

## 対象

- mattpocock 開発フロー 21 本(ask-matt / grilling 系 / domain-modeling /
  codebase-design / improve-codebase-architecture / to-spec / to-tickets /
  triage / implement / wayfinder / tdd / code-review / diagnosing-bugs /
  prototype / research / resolving-merge-conflicts / git-guardrails-claude-code /
  setup-agent-environment / handoff)
- review 系 15 本(backend/review-* 5、frontend/review-* 8、
  tooling/dep-lib-review、ai/review-image)
- meta/skill-selector・meta/skill-finder(巻き戻し判断込み)

スコープ外(未監査、今後同手順で): lang 系 5、devops 4、formal-methods 2、
sql 2、db/migration-safety、testing/playwright-*、ai/vlmkit、
meta 残り(decision-interview / empirical-prompt-tuning / extract-glossary /
optimizing-descriptions / retrospective-codify / teach /
tech-article-reproducibility / waxa-eval / writing-great-skills)、
tooling 残り(apm-usage / ast-grep-practice / conventional-changelog / drawio /
justfile / tech-trend-watch / to-questionnaire ではなく upstream-fix-and-pin)、
in-progress 9、deprecated/qa、tools/waxa。

## 手法(再現手順)

1. **上流 clone**: mizchi/skills と mattpocock/skills を scratchpad に clone。
   HEAD と vendored commit の差(上流 drift)を確認。
2. **出自の実測分類**: 対象 skill ごとに上流ディレクトリと
   `diff -rq --exclude README.md`。VERBATIM / DIFFERS / NO-UPSTREAM(自作)に分類。
   記録(VENDORED.md)ではなく diff を正とする。
3. **subagent 並列レビュー**(sonnet、read-only): 5〜10 本ずつグループ化し、
   観点を固定して本文レビュー。観点:
   1. 壊れ参照(参照 skill・ファイル・script の実在)
   2. 他人環境前提(個人 tracker / パス / pnpm / Deno / npx)
   3. スタック適合(Rust / Go / Python / TS、Bun 優先、
      Postgres / SQLite 系 / DynamoDB)
   4. 承認境界(無承認の tracker 書き込み・commit・push・外部送信・
      untrusted code 実行)
   5. 改変品質(ローカル改変が上流の設計意図・skill 間整合を壊していないか)
4. **本体で検証**: subagent の high/med 指摘は本体が実ファイルで裏取りし、
   誤検出を棄却してから採用する。

## 前提の実測結果

- mizchi/skills 上流は vendored commit `7a0d728` から**更新ゼロ**。
- mattpocock/skills は vendored 後 1 commit のみ
  (`ed37663` to-tickets の冗長 1 行削除)。
- **backend/review-* 5 本は上流に存在しない自作 skill**
  (mizchi に backend カテゴリ自体がない)。
- frontend/review-* 8 本は audit script 依存を除去するローカル改変済み。
- 出自分類は VENDORED.md の改造記録と一致した(記録は正確だった)。

## 判定一覧

「✅ そのまま使える」= 今回の監査で high/med 指摘なし。

### mattpocock 開発フロー

| skill | 判定 | 要点 |
|---|---|---|
| to-spec / triage / implement | ✅ | 承認境界改変は上流意図と整合 |
| to-tickets | 小修正 | 上流 `ed37663`(末尾 1 行削除)未取り込み。ask-matt と重複 |
| ask-matt / wayfinder / setup-agent-environment | ✅ | 壊れ参照なし(setup の `triage-labels.md` 表ヘッダに旧名 "mattpocock/skills" 残り = low) |
| code-review | ✅(低) | design record 複数候補時の選択ルール未規定(最新優先・Supersedes 除外を明文化する余地) |
| domain-modeling / improve-codebase-architecture / codebase-design | ✅ | HTML-REPORT 残骸なし。codebase-design は verbatim のままで可(語彙が言語非依存) |
| grilling / grill-me / grill-with-docs / handoff / diagnosing-bugs | ✅ | verbatim のままで可 |
| tdd | 小修正 | tests.md / mocking.md の例が TS/JS 決め打ち。4 言語例か言語非依存注記を追加 |
| prototype | 小修正 | throwaway branch への commit が無承認手順。提案→承認に |
| research | 小修正 | 「background agent」が Claude Code のどのツールか未指定で曖昧 |
| resolving-merge-conflicts | 小修正 | 「Stage everything and commit」が commit 規約(パス明示 stage・明示要求時のみ commit)と衝突。「never --abort」の断定にも例外明記が要る |
| git-guardrails-claude-code | 小修正 | block script の regex が誤検知(`git log --grep "git push"`)とすり抜け(空白 2 個等)あり。jq 依存も未記載。「絶対防御でなく事故防止レイヤー」の注記を |

### review 系

| skill | 判定 | 要点 |
|---|---|---|
| backend/review-architecture / concurrency / data-access / transactions | ✅ | 自作 4 本。4 言語+実 DB スタックを過不足なくカバー。品質高い |
| backend/review-triage | 小修正 | **security lens が存在しない**(認可・secrets・injection が導線から欠落)。cache 層(Redis 等)の受け皿 lens もない |
| frontend/review-triage / ci / hygiene / testing | ✅ | script 依存除去は徹底されている |
| frontend/review-deps | 小修正 | jq コード例が pnpm 固定(本文は manager 検出方式に一般化済みなのに例だけ残存)。`Array.prototype.groupBy` は実在しない API(正: `Object.groupBy` / `Map.groupBy`、上流由来の誤り) |
| frontend/review-security / state / performance | ✅(低) | `## Reference` 節の有無が 8 本で不揃い(low のみ) |
| tooling/dep-lib-review | **要判断** | pnpm/Node 専用で Rust / Bun 非対応。frontend/review-deps(bun/cargo 対応)と機能重複した劣化版。無承認の `pnpm update`→commit 手順も残る。**廃止して review-deps を汎用 deps review に昇格させる案を推奨** |
| ai/review-image | **要判断** | スクリプトが Deno 専用(`Deno.env` 等)で Bun では実行不可。API cost 上限ガードなし。使うなら waxa と同様の Bun 移植、使わないなら保留へ |

### skill-selector / skill-finder(巻き戻し判断)

**巻き戻し不要、ローカル改変を維持**。

- 上流は「外部レジストリ横断カタログ」設計で、現在の用途
  (自 repo の在庫管理)に合わない。戻すと全面改変のやり直しになるだけ。
- catalog.md の掲載 skill と実在庫(`find skills -name SKILL.md`)は
  **100% 一致**(欠落 0・幽霊 0)。実在庫の管理は機能している。
- ただし**状態列(✅/🔧)は陳腐化**: frontend/review-* に「audit script
  壊れ参照が残る」と書くが実物は修正済み。状態列はこの監査結果で
  更新が必要。
- skill-finder の waxa 呼び出し(Bun 版)は実装と整合。eval ledger は
  空のままで one-shot 評価は未実証(実行するなら別途)。

## 棄却した指摘(誤検出の記録)

- frontend/review-security・state・performance の
  「`docs/agents/issue-tracker.md` は壊れ参照(high)」→ **棄却**。
  これは setup-agent-environment が**対象 repo に生成する**規約ファイルへの
  参照で、code-review / triage も使う確立された規約。壊れていない。

## catalog / VENDORED の信頼性評価

- **VENDORED.md**: 出自分類・改造記録は実測 diff と一致。出自・ライセンス・
  除外理由の記録として維持する価値あり。廃止は不要。ただし「何が改造済みか」は
  `scripts/check-vendored.sh` + diff で機械的に再現できるので、
  詳細な改造記録の増殖は今後抑えてよい(commit log で足りる)。
- **catalog.md**: 実在庫は正確、**状態列と Use when の「何が壊れているか」が
  古い**。skill 本文を直した commit で catalog 行も同時更新する規律が
  守られていなかった。この監査の判定で状態列を更新すべき。

## 優先順位付きアクション(未実施、承認待ち)

1. **frontend/review-deps**: jq 例の multi-manager 化(bun/npm/yarn)+
   `Array.prototype.groupBy` 誤り訂正
2. **backend/review-triage**: security lens の追加(新設
   backend-review-security を作るか、frontend-review-security の転用かは要設計)
   + cache 観点の受け皿を明記
3. **dep-lib-review の廃止判断**: frontend/review-deps を汎用 deps review に
   昇格(frontend 縛りを外す)し、dep-lib-review は削除する案
4. **to-tickets**: 上流 `ed37663` の 1 行削除を取り込み
5. **resolving-merge-conflicts / prototype**: commit 手順を
   「提案→承認後」に整合
6. **tdd**: 4 言語例 or 言語非依存注記
7. **research**: background agent の具体化(Agent tool / run_in_background)
8. **git-guardrails-claude-code**: regex 強化 + 限界の注記 + jq 依存明記
9. **review-image の扱い判断**: Bun 移植 / Deno 導入 / 保留(in-progress 落とし)
10. low まとめて: code-review の record 選択ルール、setup の表ヘッダ、
    Reference 節の統一
11. **catalog.md 状態列をこの監査結果で更新**(skill 修正と同 commit で)

## 未監査 skill への適用

上記「手法」をそのまま使う。1 グループ 5〜10 本、観点 5 つ固定、
subagent は read-only、high/med は本体で裏取り。監査結果はこのファイルの
形式で `docs/skill-audit-<date>.md` に追記または新規作成し、
catalog.md の状態列更新まで含めて 1 サイクルとする。
