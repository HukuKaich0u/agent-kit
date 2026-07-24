# agent-kit タスクランナー
#
# instructions を変更したら `just sync` で両ランタイムへ反映する。
# レシピ一覧: `just`(= just --list)

_default:
    @just --list

# instructions の変更を両ランタイムへ反映
sync:
    cd ~/.apm && apm update --yes
    ./scripts/gen-codex-agents.sh
    @echo "✅ sync 完了: Claude(~/.claude/rules) と Codex(~/.codex/AGENTS.md)へ反映した"

# 各 SKILL.md 隣の README.md を frontmatter から生成/更新
skill-readme:
    ruby ./scripts/gen-skill-readme.rb

# 生成物(codex AGENTS.md + skill README)が最新か検証
check:
    ./scripts/gen-codex-agents.sh --check
    ruby ./scripts/gen-skill-readme.rb --check

# vendored skill の上流差分をチェック
check-vendored *ARGS:
    ./scripts/check-vendored.sh {{ARGS}}
