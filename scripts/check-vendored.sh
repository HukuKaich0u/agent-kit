#!/usr/bin/env bash
#
# vendoring した skill の上流差分をチェックする。
#
# skills/VENDORED.md に記録した各上流セクションの "Vendored commit" と
# 上流 HEAD を比較し、各 vendored skill の上流パスに差分コミットがあるか報告する。
#
#   scripts/check-vendored.sh            # 全上流の差分の有無を表示
#   scripts/check-vendored.sh --diff     # 差分がある skill の実 diff も表示
#
# 上流を shallow clone するため git とネットワークが必要。
# 差分があった場合の取り込みは手動(このスクリプトは検知のみ)。
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
VENDORED="$ROOT/skills/VENDORED.md"
SHOW_DIFF="${1:-}"

# VENDORED.md の "## <section>" セクション内から Vendored commit を抽出
base_commit_for() {
  local section="$1"
  awk -v sec="$section" '
    index($0, "## " sec) == 1 { in_sec = 1; next }
    in_sec && /^## / { exit }
    in_sec && /Vendored commit:/ {
      if (match($0, /[0-9a-f]{40}/)) { print substr($0, RSTART, RLENGTH); exit }
    }
  ' "$VENDORED"
}

# mattpocock: agent-kit の配置 -> 上流パス(VENDORED.md の表と一致させること)
declare -a MAP_MATTPOCOCK=(
  "skills/backend/codebase-design:skills/engineering/codebase-design"
  "skills/backend/domain-modeling:skills/engineering/domain-modeling"
  "skills/backend/improve-codebase-architecture:skills/engineering/improve-codebase-architecture"
  "skills/meta/ask-matt:skills/engineering/ask-matt"
  "skills/meta/grill-me:skills/productivity/grill-me"
  "skills/meta/grill-with-docs:skills/engineering/grill-with-docs"
  "skills/meta/grilling:skills/productivity/grilling"
  "skills/meta/handoff:skills/productivity/handoff"
  "skills/meta/setup-agent-kit:skills/engineering/setup-matt-pocock-skills"
  "skills/meta/teach:skills/productivity/teach"
  "skills/meta/writing-great-skills:skills/productivity/writing-great-skills"
  "skills/testing/tdd:skills/engineering/tdd"
  "skills/tooling/code-review:skills/engineering/code-review"
  "skills/tooling/diagnosing-bugs:skills/engineering/diagnosing-bugs"
  "skills/tooling/git-guardrails-claude-code:skills/misc/git-guardrails-claude-code"
  "skills/tooling/implement:skills/engineering/implement"
  "skills/tooling/migrate-to-shoehorn:skills/misc/migrate-to-shoehorn"
  "skills/tooling/prototype:skills/engineering/prototype"
  "skills/tooling/research:skills/engineering/research"
  "skills/tooling/resolving-merge-conflicts:skills/engineering/resolving-merge-conflicts"
  "skills/tooling/scaffold-exercises:skills/misc/scaffold-exercises"
  "skills/tooling/setup-pre-commit:skills/misc/setup-pre-commit"
  "skills/tooling/to-spec:skills/engineering/to-spec"
  "skills/tooling/to-tickets:skills/engineering/to-tickets"
  "skills/tooling/triage:skills/engineering/triage"
  "skills/tooling/wayfinder:skills/engineering/wayfinder"
  "skills/deprecated/design-an-interface:skills/deprecated/design-an-interface"
  "skills/deprecated/qa:skills/deprecated/qa"
  "skills/deprecated/request-refactor-plan:skills/deprecated/request-refactor-plan"
  "skills/deprecated/ubiquitous-language:skills/deprecated/ubiquitous-language"
  "skills/in-progress/batch-grill-me:skills/in-progress/batch-grill-me"
  "skills/in-progress/claude-handoff:skills/in-progress/claude-handoff"
  "skills/in-progress/loop-me:skills/in-progress/loop-me"
  "skills/in-progress/setup-ts-deep-modules:skills/in-progress/setup-ts-deep-modules"
  "skills/in-progress/to-questionnaire:skills/in-progress/to-questionnaire"
  "skills/in-progress/wizard:skills/in-progress/wizard"
  "skills/in-progress/writing-beats:skills/in-progress/writing-beats"
  "skills/in-progress/writing-fragments:skills/in-progress/writing-fragments"
  "skills/in-progress/writing-shape:skills/in-progress/writing-shape"
  "skills/personal/edit-article:skills/personal/edit-article"
  "skills/personal/obsidian-vault:skills/personal/obsidian-vault"
)

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

TOTAL_CHANGED=0

check_upstream() {
  local name="$1" url="$2" clone_dir="$3" map_mode="$4"
  shift 4
  local map=("$@")

  local base_commit
  base_commit="$(base_commit_for "$name")"
  if [ -z "$base_commit" ]; then
    echo "ERROR: VENDORED.md の '## $name' セクションから Vendored commit を読めない" >&2
    exit 1
  fi

  echo "=============================================="
  echo "上流: $name"
  echo "=============================================="
  echo "取得中: $url"
  git clone --quiet --filter=blob:none --no-checkout "$url" "$clone_dir"
  local head_commit
  head_commit="$(git -C "$clone_dir" rev-parse HEAD)"

  # 完全ミラー上流は「上流 HEAD の SKILL.md を持つ全ディレクトリ」を対象に自動導出
  if [ "$map_mode" = "mirror" ]; then
    map=()
    while read -r rel; do
      map+=("skills/$rel:$rel")
    done < <(git -C "$clone_dir" ls-tree -r --name-only "$head_commit" | grep '/SKILL.md$' | sed 's|/SKILL.md$||')
  fi

  echo
  echo "取り込み時: $base_commit"
  echo "上流 HEAD  : $head_commit"
  if [ "$base_commit" = "$head_commit" ]; then
    echo "→ 上流に更新なし。全 vendored skill は最新。"
    echo
    return 0
  fi
  echo

  # 完全ミラーの場合、上流に「新しく増えた skill」も検知したい
  if [ "$map_mode" = "mirror" ]; then
    for entry in "${map[@]}"; do
      local local_path="${entry%%:*}"
      if [ ! -d "$ROOT/$local_path" ]; then
        echo "★ 上流に新規 skill: ${entry##*:}(ローカル未取込)"
        TOTAL_CHANGED=$((TOTAL_CHANGED+1))
      fi
    done
  fi

  local changed=0
  for entry in "${map[@]}"; do
    local local_path="${entry%%:*}"
    local up_path="${entry##*:}"
    [ -d "$ROOT/$local_path" ] || continue
    local n
    n="$(git -C "$clone_dir" rev-list --count "${base_commit}..${head_commit}" -- "$up_path" 2>/dev/null || echo 0)"
    if [ "$n" -gt 0 ]; then
      changed=$((changed+1))
      echo "★ 更新あり ($n commit): $local_path  ← $up_path"
      if [ "$SHOW_DIFF" = "--diff" ]; then
        git -C "$clone_dir" --no-pager diff "${base_commit}..${head_commit}" -- "$up_path" | sed 's/^/    /'
        echo
      fi
    fi
  done

  echo
  if [ "$changed" -eq 0 ]; then
    echo "→ vendored skill に該当する上流変更はなし。"
    echo "  取り込み済みマークだけ更新したい場合は VENDORED.md の $name の Vendored commit を $head_commit に。"
  else
    echo "→ $changed 個の skill に上流更新あり。取り込むなら手動で cp し、VENDORED.md を更新すること。"
    echo "  改造ありの skill は VENDORED.md の記録を確認してから上書きすること。"
    echo "  実 diff を見るには: scripts/check-vendored.sh --diff"
  fi
  echo
  TOTAL_CHANGED=$((TOTAL_CHANGED+changed))
}

check_upstream "mattpocock/skills" "https://github.com/mattpocock/skills.git" "$TMP/mattpocock" "static" "${MAP_MATTPOCOCK[@]}"
check_upstream "mizchi/skills"     "https://github.com/mizchi/skills.git"     "$TMP/mizchi"     "mirror"

echo "=============================================="
echo "合計: $TOTAL_CHANGED 件(上流更新 + 未取込の新規)"
