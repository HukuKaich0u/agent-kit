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

# 各 SKILL.md 隣の README.md を frontmatter から生成/更新
skill-readme:
    ruby ./scripts/gen-skill-readme.rb

# 生成物(codex AGENTS.md + skill README)が最新か検証
check: check-codex check-skill-readme

# codex AGENTS.md が instructions/core と一致するか検証
check-codex:
    ./scripts/gen-codex-agents.sh --check

# skill README が frontmatter と一致するか検証
check-skill-readme:
    ruby ./scripts/gen-skill-readme.rb --check

# vendored skill の上流差分をチェック
check-vendored *ARGS:
    ./scripts/check-vendored.sh {{ARGS}}
