---
created: 2026-07-24
updated: 2026-07-25
author: Koki Aoyagi
type: runbook
---

# just コマンド説明書

agent-kit のタスクランナーは [`justfile`](../justfile)。
リポジトリ直下で `just <recipe>` を実行する。
引数なしの `just` はコマンド一覧を表示する。

コマンドは次の4つだけ。

| コマンド | 用途 |
| --- | --- |
| `just sync` | core instructions をClaudeとCodexへ反映する |
| `just skill-readme` | 各skillのREADMEを生成・更新する |
| `just check` | 生成物が最新か検証する |
| `just check-vendored` | vendored skillの上流更新を調べる |

## `just sync`

`instructions/core`を変更したあと、ClaudeとCodexの両方へ反映する。

内部では次を順番に実行する。

```bash
cd ~/.apm && apm update --yes
./scripts/gen-codex-agents.sh
```

- Claudeの反映先: `~/.claude/rules/`
- Codexの反映先: `~/.codex/AGENTS.md`
- Claude側はリモートの`main`を解決するため、変更をpushしてから実行する。
- このコマンドはユーザーが手動で実行する。agentは自動実行しない。

## `just skill-readme`

各skillフォルダの`SKILL.md`にある`name`と`description`から、
隣の`README.md`を生成・更新する。

- 生成部分の外にある手書き文章は残る。
- `SKILL.md`のfrontmatterを変更したあとに使う。

## `just check`

次の2種類の生成物が最新かまとめて検証する。

- `~/.codex/AGENTS.md`
- 各skillフォルダの`README.md`

ファイルは書き換えない。差分があれば非0で終了するため、CIでも使える。

## `just check-vendored [ARGS]`

vendored skillについて、取り込み時のcommitと上流HEADを比較する。

- 上流に更新があるskillを表示する。
- 上流に追加された未選定のskillも表示する。
- 検知のみで、更新は取り込まない。
- Gitとネットワーク接続が必要。

実際のdiffまで見る場合:

```bash
just check-vendored --diff
```
