# Skill Normalization Rules

## Goal

`mizchi/skills` から取り込んだ skill を、出典色を消して **Claude / Codex 両対応の自分用 asset** に正規化するためのルールを固定する。1 skill ずつ精査する際の判断基準とチェックリストとして使う。

## 適用対象

`skills/` 配下の、mizchi import 由来でまだ正規化していない skill。すでに自分で書き起こした skill には適用しない(任意で参照のみ)。

## 判断フロー

各 skill について、まず **残す / 消す** を決め、残す場合のみ正規化する。

### Step 0: 残す / 消す判定

次のいずれかに当てはまるなら **削除** する。

- **mizchi 個人依存**: mizchi 本人の文体・個人ブランド・個人ワークフロー前提で、自分には応用が効かない。
- **用途がない**: そのタスク自体を自分がやらない。

> 削除実績: `mizchi-blog-style`(個人依存), `tech-article-reproducibility`(用途なし)。

判断に迷う skill は削除せず保留にし、棚卸し表(別ドキュメント)で「保留」マークを付ける。

## 正規化チェックリスト(残す skill のみ)

| # | ルール | 内容 |
|---|---|---|
| R1 | README 定型ブロック削除 | `<!-- apm:readme:begin --> 〜 <!-- apm:readme:end -->` の自動生成ブロック(Install 手順・agentskills.io 説明)を削除する。 |
| R2 | README 短文化 | README は「何の skill か」の日本語 1〜2 文 + `SKILL.md` への導線だけに薄くする。末尾に「Claude / Codex の両方で使う前提で整えています」を入れる。 |
| R3 | description の書き換え | SKILL.md frontmatter の `description` を **「Use when ...」形式の英語**で、発火条件が明確に伝わるよう書き直す。 |
| R4 | harness 依存表現の一般化 | Claude 固有の語を概念語へ置換する。`Task tool` → `fresh subagent` / `usage meta`・`tool_uses`・`duration_ms` → `execution metadata`(取れない環境前提の but 句を添える)/ `~/.claude/skills/...` → agent 非依存 path の例示。 |
| R5 | Agent compatibility 節 | SKILL.md 末尾に `## Agent compatibility` を追加し、Claude/Codex 両対応で読むための注意・degrade 方針を箇条書きする。 |

## 正規化の degrade 方針(R4/R5 の補足)

harness 機能に依存する手順は「取れる環境では使い、取れない環境では落とす」形に書く。

- subagent metadata が取れない環境 → accuracy / structured reflection を主指標にし、step count・duration は補助に落とす。
- subagent dispatch 自体ができない環境 → skill を適用せず構造レビューに留める。
- 成果物の保存先 → agent 固有 path に固定せず、共有可能な URL と repo 相対の説明に寄せる。

## 完了の定義(1 skill あたり)

- [ ] Step 0 判定済み(残す/消す/保留)
- [ ] 残す場合 R1〜R5 を満たす
- [ ] `git diff` で意図しない差分がない
- [ ] 棚卸し表のステータスを更新

## 参考: 正規化済みの実例

- `skills/meta/empirical-prompt-tuning`(R1〜R5 全適用)
- `skills/meta/extract-glossary`(R1〜R5 全適用)
