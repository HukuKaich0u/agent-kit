---
created: <YYYY-MM-DD>
author: <git config user.name>
type: configuration
---

# Design records

Design records live in `docs/specs/YYYY-MM-DD-<slug>.md`.

Each record is an immutable, point-in-time account of an approved design. It must start with `created`, `author`, and `type: design-record` YAML frontmatter, followed by a notice that current truth lives in code, tests, ADRs, and the domain glossary.

Do not update a design record after it is written. If the direction changes, re-grill and create a new record whose `## Supersedes` section names the earlier path. Work tickets link to the record; the record is never published to the issue tracker or given a work status.
