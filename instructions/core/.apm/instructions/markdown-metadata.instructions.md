---
description: Require basic metadata frontmatter at the top of markdown documents
---

- When creating a new markdown document, always start it with YAML frontmatter containing at least:

```markdown
---
created: <YYYY-MM-DD>
author: <who wrote it: the user's name, or the agent name/model if agent-generated>
type: <document type, e.g. note / design / runbook / adr / report>
---
```

- When editing an existing markdown document, add the frontmatter if missing; if present, add or update `updated: <YYYY-MM-DD>`.
- Exception: do not apply this to files whose format is dictated by tooling (e.g. SKILL.md, CLAUDE.md, README.md, apm.yml-managed files). Follow the tool's required format instead.
