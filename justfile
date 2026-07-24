# agent-kit タスクランナー
#
# instructions/core を変更したら `just sync` で両ランタイムへ反映する。
# レシピ一覧: `just`(= just --list)

_default:
    @just --list

# instructions/core の変更を両ランタイムへ反映(apm update + codex 生成)
sync: update codex
    @echo "✅ sync 完了: Claude(~/.claude/rules) と Codex(~/.codex/AGENTS.md)へ反映した"

# グローバル apm を最新化(Claude の ~/.claude/rules に反映)
update:
    cd ~/.apm && apm update --yes

# codex 向け ~/.codex/AGENTS.md を instructions/core から生成
codex:
    ./scripts/gen-codex-agents.sh

# 生成物(codex AGENTS.md)が instructions/core と一致するか検証
check:
    ./scripts/gen-codex-agents.sh --check

# vendored skill の上流差分をチェック
check-vendored *ARGS:
    ./scripts/check-vendored.sh {{ARGS}}
