---
name: research
description: Investigate a question against high-trust primary sources and capture the findings as a Markdown file in the repo. Use when the user wants a topic researched, docs or API facts gathered, or reading legwork delegated to a background agent.
---

Spin up a **background agent** to do the research, so you keep working while it reads. In Claude Code this means the Agent tool run in the background (in other runtimes, whatever detached-subagent mechanism exists); give it web access (WebFetch / WebSearch) and relay its findings when the completion notification arrives.

Scope check first: this skill is for a **light** investigation — one question, a handful of primary sources, one findings file. If the question needs a multi-source sweep with counterevidence checks or a cited report across many workers, use the `deep-research` plugin instead of stretching this one.

Its job:

1. Investigate the question against **primary sources** — official docs, source code, specs, first-party APIs — not a secondary write-up of them. Follow every claim back to the source that owns it.
2. Write the findings to a single Markdown file, citing each claim's source.
3. Save it where the repo already keeps such notes; match the existing convention, and if there is none, put it somewhere sensible and say where.
