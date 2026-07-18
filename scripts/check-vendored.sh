#!/usr/bin/env bash
# frozen_string_literal: false
#
# vendoring した skill の上流差分をチェックする。
#
# skills/VENDORED.md に記録した "Vendored commit" と上流 HEAD を比較し、
# 各 vendored skill の上流パスに差分コミットがあるか報告する。
#
#   scripts/check-vendored.sh            # 差分の有無を表示
#   scripts/check-vendored.sh --diff     # 差分がある skill の実 diff も表示
#
# 上流を shallow clone するため git とネットワークが必要。
# 差分があった場合の取り込みは手動(このスクリプトは検知のみ)。
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
VENDORED="$ROOT/skills/VENDORED.md"
SHOW_DIFF="${1:-}"

UPSTREAM="https://github.com/mattpocock/skills.git"
# VENDORED.md から取り込み時コミットを抽出
BASE_COMMIT="$(grep -m1 'Vendored commit:' "$VENDORED" | grep -oE '[0-9a-f]{40}')"
if [ -z "$BASE_COMMIT" ]; then
  echo "ERROR: VENDORED.md から Vendored commit を読めない" >&2
  exit 1
fi

# agent-kit の配置 -> 上流パス の対応(VENDORED.md の表と一致させること)
declare -a MAP=(
  "skills/meta/grilling:skills/productivity/grilling"
  "skills/meta/handoff:skills/productivity/handoff"
  "skills/testing/tdd:skills/engineering/tdd"
  "skills/backend/codebase-design:skills/engineering/codebase-design"
  "skills/backend/domain-modeling:skills/engineering/domain-modeling"
  "skills/tooling/diagnosing-bugs:skills/engineering/diagnosing-bugs"
  "skills/tooling/resolving-merge-conflicts:skills/engineering/resolving-merge-conflicts"
  "skills/tooling/git-guardrails-claude-code:skills/misc/git-guardrails-claude-code"
  "skills/tooling/code-review:skills/engineering/code-review"
  "skills/tooling/prototype:skills/engineering/prototype"
  "skills/tooling/research:skills/engineering/research"
)

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

echo "上流を取得中: $UPSTREAM"
git clone --quiet --filter=blob:none --no-checkout "$UPSTREAM" "$TMP/up"
cd "$TMP/up"
HEAD_COMMIT="$(git rev-parse HEAD)"

echo
echo "取り込み時: $BASE_COMMIT"
echo "上流 HEAD  : $HEAD_COMMIT"
if [ "$BASE_COMMIT" = "$HEAD_COMMIT" ]; then
  echo "→ 上流に更新なし。全 vendored skill は最新。"
  exit 0
fi
echo

CHANGED=0
for entry in "${MAP[@]}"; do
  local_path="${entry%%:*}"
  up_path="${entry##*:}"
  # 取り込みコミット..HEAD で該当パスに変更があったか
  n="$(git rev-list --count "${BASE_COMMIT}..${HEAD_COMMIT}" -- "$up_path" 2>/dev/null || echo 0)"
  if [ "$n" -gt 0 ]; then
    CHANGED=$((CHANGED+1))
    echo "★ 更新あり ($n commit): $local_path  ← $up_path"
    if [ "$SHOW_DIFF" = "--diff" ]; then
      git --no-pager diff "${BASE_COMMIT}..${HEAD_COMMIT}" -- "$up_path" | sed 's/^/    /'
      echo
    fi
  fi
done

echo
if [ "$CHANGED" -eq 0 ]; then
  echo "→ vendored skill に該当する上流変更はなし(他パスの更新のみ)。"
  echo "  取り込み済みマークだけ更新したい場合は VENDORED.md の Vendored commit を $HEAD_COMMIT に。"
else
  echo "→ $CHANGED 個の skill に上流更新あり。取り込むなら手動で cp し、VENDORED.md を更新すること。"
  echo "  実 diff を見るには: scripts/check-vendored.sh --diff"
fi
