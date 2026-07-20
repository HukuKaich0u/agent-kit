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
  awk -v sec="## $section" '
    $0 == sec { in_sec = 1; next }
    in_sec && /^## / { exit }
    in_sec && /Vendored commit:/ {
      if (match($0, /[0-9a-f]{40}/)) { print substr($0, RSTART, RLENGTH); exit }
    }
  ' "$VENDORED"
}

# agent-kit の配置 -> 上流パス の対応(VENDORED.md の表と一致させること)

declare -a MAP_MATTPOCOCK=(
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
  "skills/meta/setup-agent-kit:skills/engineering/setup-matt-pocock-skills"
)

# mizchi は全 skill が「skills/ を除いたパス = 上流パス」の機械的対応
declare -a MAP_MIZCHI=(
  "skills/ai/review-image:ai/review-image"
  "skills/ai/vlmkit:ai/vlmkit"
  "skills/aws/ecs-codedeploy-blue-green:aws/ecs-codedeploy-blue-green"
  "skills/aws/ecs-service-connect-ipv6:aws/ecs-service-connect-ipv6"
  "skills/aws/github-oidc-scoped-role:aws/github-oidc-scoped-role"
  "skills/aws/vault-mfa-iam:aws/vault-mfa-iam"
  "skills/cloudflare/access-app-setup:cloudflare/access-app-setup"
  "skills/cloudflare/deploy:cloudflare/deploy"
  "skills/devops/actions-ci-tuning:devops/actions-ci-tuning"
  "skills/devops/flaker-storage-cache-on-ci:devops/flaker-storage-cache-on-ci"
  "skills/devops/gh-fix-ci:devops/gh-fix-ci"
  "skills/devops/opentelemetry:devops/opentelemetry"
  "skills/devops/otel-node:devops/otel-node"
  "skills/devops/workers-cd-rollback:devops/workers-cd-rollback"
  "skills/frontend/review-ci:frontend/review-ci"
  "skills/frontend/review-deps:frontend/review-deps"
  "skills/frontend/review-hygiene:frontend/review-hygiene"
  "skills/frontend/review-performance:frontend/review-performance"
  "skills/frontend/review-security:frontend/review-security"
  "skills/frontend/review-state:frontend/review-state"
  "skills/frontend/review-testing:frontend/review-testing"
  "skills/frontend/review-triage:frontend/review-triage"
  "skills/frontend/review-weekly:frontend/review-weekly"
  "skills/lang/translate-programming-language:lang/translate-programming-language"
  "skills/meta/empirical-prompt-tuning:meta/empirical-prompt-tuning"
  "skills/meta/extract-glossary:meta/extract-glossary"
  "skills/meta/optimizing-descriptions:meta/optimizing-descriptions"
  "skills/meta/retrospective-codify:meta/retrospective-codify"
  "skills/meta/skill-finder:meta/skill-finder"
  "skills/meta/skill-selector:meta/skill-selector"
  "skills/meta/waxa-eval:meta/waxa-eval"
  "skills/node/pi-coding-agent:node/pi-coding-agent"
  "skills/node/sqlite-vec:node/sqlite-vec"
  "skills/sql/lint:sql/lint"
  "skills/sql/plan-audit:sql/plan-audit"
  "skills/sql/schema-audit:sql/schema-audit"
  "skills/sql/security:sql/security"
  "skills/testing/playwright-cli:testing/playwright-cli"
  "skills/testing/playwright-test:testing/playwright-test"
  "skills/tooling/apm-usage:tooling/apm-usage"
  "skills/tooling/ast-grep-practice:tooling/ast-grep-practice"
  "skills/tooling/conventional-changelog:tooling/conventional-changelog"
  "skills/tooling/dep-lib-review:tooling/dep-lib-review"
  "skills/tooling/dotenvx:tooling/dotenvx"
  "skills/tooling/justfile:tooling/justfile"
  "skills/tooling/nix-setup:tooling/nix-setup"
  "skills/tooling/tech-trend-watch:tooling/tech-trend-watch"
  "skills/tooling/upstream-fix-and-pin:tooling/upstream-fix-and-pin"
)

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

TOTAL_CHANGED=0

check_upstream() {
  local name="$1" url="$2" clone_dir="$3"
  shift 3
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

  echo
  echo "取り込み時: $base_commit"
  echo "上流 HEAD  : $head_commit"
  if [ "$base_commit" = "$head_commit" ]; then
    echo "→ 上流に更新なし。全 vendored skill は最新。"
    echo
    return 0
  fi
  echo

  local changed=0
  for entry in "${map[@]}"; do
    local local_path="${entry%%:*}"
    local up_path="${entry##*:}"
    # 取り込みコミット..HEAD で該当パスに変更があったか
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
    echo "→ vendored skill に該当する上流変更はなし(他パスの更新のみ)。"
    echo "  取り込み済みマークだけ更新したい場合は VENDORED.md の $name の Vendored commit を $head_commit に。"
  else
    echo "→ $changed 個の skill に上流更新あり。取り込むなら手動で cp し、VENDORED.md を更新すること。"
    echo "  改造ありの skill は VENDORED.md の備考を確認してから上書きすること。"
    echo "  実 diff を見るには: scripts/check-vendored.sh --diff"
  fi
  echo
  TOTAL_CHANGED=$((TOTAL_CHANGED+changed))
}

check_upstream "mattpocock/skills" "https://github.com/mattpocock/skills.git" "$TMP/mattpocock" "${MAP_MATTPOCOCK[@]}"
check_upstream "mizchi/skills"     "https://github.com/mizchi/skills.git"     "$TMP/mizchi"     "${MAP_MIZCHI[@]}"

echo "=============================================="
echo "合計: $TOTAL_CHANGED 個の skill に上流更新あり"
