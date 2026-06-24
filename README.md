# agent-kit

Reusable agent assets for KokiAoyagi.

## Install with APM

Install the shared core instructions globally:

```sh
apm install -g HukuKaich0u/agent-kit/instructions/core
```

Or add them to a project manifest:

```yaml
dependencies:
  apm:
    - HukuKaich0u/agent-kit/instructions/core
```

## Paths

- `instructions/core`: shared instruction files for Claude and Codex
- `skills/`: local skills to install selectively
- `agents/`, `claude/`, `codex/`: harness-specific assets kept in git
