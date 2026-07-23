# agent-kit — 作業ルール

Claude Code / Codex で共有する agent assets を管理するリポジトリ。
このファイルは repo で作業する agent 向けの指示の source of truth。
Codex は `AGENTS.md`、Claude Code は `CLAUDE.md`(`@AGENTS.md` を import)経由で
同じ内容を読む。ユーザー向け概要は `README.md`。

## 配布の仕組み(instructions/core)

`instructions/core/.apm/instructions/*.instructions.md` が core instructions の
source of truth。ここを編集したら各ランタイムへの反映が要る:

- **Claude**: `apm install` / `apm update` で `~/.claude/rules/` に反映される。
- **Codex**: apm は user スコープで codex に instructions primitive を配布できない
  (0.26 時点。skills 等は配布するが instructions は `~/.claude/rules/` にしか統合されない)。
  そのため `scripts/gen-codex-agents.sh` が instructions/core を結合して
  codex 向け `~/.codex/AGENTS.md` を生成する。

**どちらの反映(`apm install` / `gen-codex-agents.sh`)もユーザーが手で実行する。**
agent が勝手に実行するものではない。agent の責務は instructions/core と
`scripts/gen-codex-agents.sh` を正しく保つところまで。

- `gen-codex-agents.sh` は instructions を glob で拾うので、ファイルの追加・削除に
  自動追従する。instruction を増減しても スクリプト側の修正は不要。
- 生成物が最新か検証: `scripts/gen-codex-agents.sh --check`(差分があれば非0終了)。

## commit 規約

- source of truth は `instructions/core/.apm/instructions/*`。`~/.claude/rules/` に直書きしない(apm 管理)。
- commit format は `git-commit` instruction に従う(`type(scope): 日本語で簡潔に説明`)。
- 無関係な変更を混ぜず、内容ごとに commit を切り分ける。
