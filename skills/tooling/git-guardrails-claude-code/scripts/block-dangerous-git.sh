#!/bin/bash

# Safety net, not a hard guarantee: patterns are regex heuristics and can be
# bypassed (aliases, scripts that call git, exotic quoting). Treat this as an
# accident-prevention layer on top of the agent's own rules, not as proof
# that a blocked operation cannot happen.

if ! command -v jq >/dev/null 2>&1; then
  echo "BLOCKED: jq is required by this hook but was not found. Failing safe (blocking); install jq or remove the hook from settings." >&2
  exit 2
fi

INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty')

# \bgit\s+... tolerates extra whitespace and prefixes like `command git`,
# while the word boundary avoids matching substrings of other words.
DANGEROUS_PATTERNS=(
  '\bgit\s+push\b'
  '\bgit\s+reset\s+--hard\b'
  '\bgit\s+clean\s+-[a-zA-Z]*f'
  '\bgit\s+branch\s+(-[a-zA-Z]*\s+)*-D\b'
  '\bgit\s+checkout\s+\.'
  '\bgit\s+restore\s+\.'
  '\bpush\s+--force\b'
  '--force-with-lease\b'
  '\breset\s+--hard\b'
)

for pattern in "${DANGEROUS_PATTERNS[@]}"; do
  if echo "$COMMAND" | grep -qE "$pattern"; then
    echo "BLOCKED: '$COMMAND' matches dangerous pattern '$pattern'. The user has prevented you from doing this." >&2
    exit 2
  fi
done

exit 0
