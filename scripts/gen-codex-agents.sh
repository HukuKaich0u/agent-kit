#!/usr/bin/env bash
#
# codex 向けに instructions を結合して AGENTS.md を生成する。
#
# apm は user スコープで codex に instructions primitive を配布できない
# (0.26 時点で codex は "partially supported"。skills 等は配布するが
# instructions は claude の ~/.claude/rules/ にしか統合されない)。
# その回避策として、instructions を唯一のソースに codex の
# グローバル AGENTS.md (~/.codex/AGENTS.md) を生成する。
#
#   scripts/gen-codex-agents.sh              # ~/.codex/AGENTS.md に書き出す
#   scripts/gen-codex-agents.sh --stdout     # 標準出力に出す(確認用)
#   scripts/gen-codex-agents.sh --check      # 生成物が最新か検証(差分あれば非0終了)
#   scripts/gen-codex-agents.sh -o PATH      # 出力先を指定
#
# instructions/*.instructions.md を glob で全て拾うため、instruction を
# 追加・削除しても再実行するだけで AGENTS.md に追従する(手動列挙なし)。
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC_DIR="$ROOT/instructions/.apm/instructions"
OUT="${CODEX_AGENTS_PATH:-$HOME/.codex/AGENTS.md}"
MODE="write"

while [ $# -gt 0 ]; do
  case "$1" in
    --stdout) MODE="stdout" ;;
    --check)  MODE="check" ;;
    -o)       shift; OUT="$1" ;;
    *) echo "unknown arg: $1" >&2; exit 2 ;;
  esac
  shift
done

if [ ! -d "$SRC_DIR" ]; then
  echo "source dir not found: $SRC_DIR" >&2
  exit 1
fi

# instruction ファイルの frontmatter (--- ... ---) を除いた本文を出し、
# 本文中の見出しを1段繰り下げる。
#
# 各 instruction は "## <name>" の下にぶら下がるので、本文が ## を使うと
# instruction 名と同階層になり、どこまでがその instruction かが判別できなくなる。
# ``` で囲まれたコードブロック内の # はコメントなので繰り下げない。
strip_frontmatter() {
  awk '
    NR==1 && $0=="---" { infm=1; next }
    infm && $0=="---"   { infm=0; next }
    infm               { next }
    /^```/             { infence = !infence; print; next }
    !infence && /^#{1,5} / { print "#" $0; next }
    { print }
  ' "$1"
}

render() {
  cat <<'HEADER'
# AGENTS.md

<!--
  このファイルは scripts/gen-codex-agents.sh が自動生成する。手動で編集しない。
  ソースは agent-kit の instructions/.apm/instructions/*.instructions.md。
  内容を変えるときはソースを編集し、scripts/gen-codex-agents.sh を再実行する。
  (codex は apm の user スコープ instructions 配布に非対応のための回避策)
-->

Claude と共有する instructions。各セクションは agent-kit の
instructions に対応する。
HEADER

  # ファイル名順で安定させる(glob なので追加分も自動で入る)
  for f in "$SRC_DIR"/*.instructions.md; do
    [ -e "$f" ] || continue
    name="$(basename "$f" .instructions.md)"
    printf '\n\n## %s\n\n' "$name"
    strip_frontmatter "$f" | sed -e 's/[[:space:]]*$//' | cat -s
  done
}

case "$MODE" in
  stdout)
    render
    ;;
  check)
    if [ ! -f "$OUT" ]; then
      echo "AGENTS.md not found: $OUT (run without --check to generate)" >&2
      exit 1
    fi
    if diff -q <(render) "$OUT" >/dev/null; then
      echo "up to date: $OUT"
    else
      echo "stale: $OUT differs from instructions (regenerate)" >&2
      exit 1
    fi
    ;;
  write)
    mkdir -p "$(dirname "$OUT")"
    render > "$OUT"
    echo "wrote $OUT"
    ;;
esac
