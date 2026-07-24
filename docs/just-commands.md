---
created: 2026-07-24
author: Koki Aoyagi
type: runbook
---

# just コマンド説明書

agent-kit のタスクランナーは [`justfile`](../justfile)。リポジトリ直下で `just <recipe>` で実行する。
レシピ一覧は引数なしの `just`(= `just --list`)。

このファイルは各レシピの目的・実行内容・使いどころをまとめた説明書。
コマンドの定義そのものは justfile が source of truth なので、レシピを増減したらここも更新する。

## いちばん使うもの

### `just sync`

instructions/core を変更したあとの **一括反映**。これ1つ覚えておけば足りる。

- 実行内容: `just update`(apm)+ `just codex`(AGENTS.md 生成)を順に実行。
- 使いどき: `instructions/core/.apm/instructions/*.instructions.md` を追加・削除・編集したあと。
- 反映先: Claude は `~/.claude/rules/`、Codex は `~/.codex/AGENTS.md`。
- 補足: `update` の中で `cd ~/.apm` するので、agent-kit のディレクトリから叩けばよい。

## 反映系(個別)

### `just update`

グローバル apm を最新化して **Claude 側**に反映する。

- 実行内容: `cd ~/.apm && apm update --yes`。
- 反映先: `~/.claude/rules/`。
- 前提: 反映したい変更が GitHub の `origin/main` に push 済みであること。
  apm はリモートの main を解決するため、未 push の commit は反映されない。

### `just codex`

instructions/core を結合して **Codex 向け** `~/.codex/AGENTS.md` を生成する。

- 実行内容: `./scripts/gen-codex-agents.sh`。
- 背景: apm は user スコープで Codex に instructions を配布できないため、この生成で代替している。
- 補足: スクリプトは instructions を glob で拾うので、instruction を増減しても追従する。

### `just skill-readme`

各 skill フォルダの `SKILL.md` の frontmatter(name / description)から、
隣の `README.md` を生成・更新する。

- 実行内容: `ruby ./scripts/gen-skill-readme.rb`。
- 補足: 生成部分はマーカーコメントで囲まれており、その外の手書き文章は再生成しても残る。

## 検証系(書き込みなし)

`check` 系は生成物が最新か確かめるだけで、ファイルは書き換えない。
差分があれば非0終了するので CI でも使える。

### `just check`

生成物全体(codex AGENTS.md + skill README)が最新かをまとめて検証する。
`check-codex` と `check-skill-readme` を順に実行する。

### `just check-codex`

`~/.codex/AGENTS.md` が instructions/core と一致するか検証する
(= `gen-codex-agents.sh --check`)。

### `just check-skill-readme`

各 skill の README が SKILL.md の frontmatter と一致するか検証する
(= `gen-skill-readme.rb --check`)。

### `just check-vendored [ARGS]`

vendored skill の上流差分をチェックする(= `scripts/check-vendored.sh`)。
`just check-vendored --diff` のように引数を渡すと実 diff も表示する。

## 用語

- **frontmatter**: markdown 先頭の `---` で挟んだ YAML メタデータ。SKILL.md では
  `name` と `description` を持ち、apm / Claude / Codex がこれを読んで skill を認識する。
- **instructions/core**: Claude / Codex で共有する core instructions の source of truth。
  詳細は [`AGENTS.md`](../AGENTS.md) を参照。
