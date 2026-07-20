# Vendored Skills

外部リポジトリから取り込んだ(vendoring した)skill の出自と同期状態を記録する。

## 方針(2026-07-20 確定)

- **完全ミラー**: 上流 2 repo の skill は全部取り込む(取捨選択しない)。
- **上流 verbatim**: 取り込み内容は上流そのまま・ローカル改造なしを基本とし、
  使うものから少しずつカスタマイズする。改造したらこのファイルに記録する。
- 2026-07-20 以前のカスタム済み状態(壊れ参照修正・自作 audit スクリプト等)は
  commit `0fd8ec3` に保全してある。再カスタム時はそこから個別に拾える:
  `git show 0fd8ec3:skills/<path>/SKILL.md`
- 上流差分の確認は `scripts/check-vendored.sh`(検知のみ、取り込みは手動)。
- 例外: `skills/tools/waxa`(mizchi 由来の CLI ツール)は Deno 未導入環境のため
  Bun 移植版を維持(上流 verbatim ではない)。

上流の壊れ参照(存在しない skill への参照、mizchi/mattpocock 個人環境前提)は
[`INVENTORY.md`](INVENTORY.md) の「要カスタム」節に一覧がある。

---

## mizchi/skills(67本)

- Source: https://github.com/mizchi/skills
- License: リポジトリに LICENSE ファイルは無いが、上流 README の License 節に
  「各 skill 内の `LICENSE.txt` が優先、無い skill は MIT 既定」と明記。
  `cloudflare/deploy` と `devops/gh-fix-ci` のみ Apache-2.0 の `LICENSE.txt` 同梱。
- Vendored commit: `7a0d72866a0bb3e9ac3e2768c328b09ba2bc40c4`
- Vendored date: 2026-07-20(完全ミラー化。初回 import は 2026-06-28 の `d799945`)
- 改造: **全67本なし**(上流 verbatim)

**上流パスの対応**: 上流の全 skill を `skills/<上流パス>` にそのまま配置(リネームなし)。
上流 HEAD の SKILL.md を持つディレクトリ全部が対象。

カテゴリ別(67本):

- `ai/` 2 ・ `aws/` 4 ・ `cloudflare/` 4 ・ `devops/` 6 ・ `formal-methods/` 2
- `frontend/` 9 + `frontend/review-perspectives/` 5(入れ子構造は上流のまま)
- `k8s/` 1 ・ `lang/` 5 ・ `meta/` 9 ・ `node/` 2 ・ `sql/` 5 ・ `testing/` 2 ・ `tooling/` 11

※ MoonBit 系・k8s・utels・chezmoi・mizchi-blog-style 等は 2026-07 の監査で一度削除したが、
完全ミラー方針への転換(2026-07-20)で再取り込みした。

---

## mattpocock/skills(41本)

- Source: https://github.com/mattpocock/skills
- License: MIT (Copyright (c) 2026 Matt Pocock)
- Vendored commit: `9603c1cc8118d08bc1b3bf34cf714f62178dea3b`
- Vendored date: 2026-07-20(完全ミラー化。初回取り込みは 2026-07-19 の 11本)
- Upstream commit date: 2026-07-16
- 改造: **全41本なし**(上流 verbatim)

**配置ルール**: 上流の `productivity` / `engineering` / `misc` は agent-kit の領域カテゴリに
振り分け。上流の `deprecated` / `in-progress` / `personal` はステータスが分かるよう
同名ディレクトリのまま(`skills/deprecated/` 等)。

| agent-kit の配置 | 上流パス |
|---|---|
| `skills/backend/codebase-design` | `skills/engineering/codebase-design` |
| `skills/backend/domain-modeling` | `skills/engineering/domain-modeling` |
| `skills/backend/improve-codebase-architecture` | `skills/engineering/improve-codebase-architecture` |
| `skills/meta/ask-matt` | `skills/engineering/ask-matt` |
| `skills/meta/grill-me` | `skills/productivity/grill-me` |
| `skills/meta/grill-with-docs` | `skills/engineering/grill-with-docs` |
| `skills/meta/grilling` | `skills/productivity/grilling` |
| `skills/meta/handoff` | `skills/productivity/handoff` |
| `skills/meta/setup-agent-kit` | `skills/engineering/setup-matt-pocock-skills` ⚠️ dir 名のみローカル命名。中身は上流のまま |
| `skills/meta/teach` | `skills/productivity/teach` |
| `skills/meta/writing-great-skills` | `skills/productivity/writing-great-skills` |
| `skills/testing/tdd` | `skills/engineering/tdd` |
| `skills/tooling/code-review` | `skills/engineering/code-review` ⚠️ `/setup-matt-pocock-skills` 前提。要カスタム |
| `skills/tooling/diagnosing-bugs` | `skills/engineering/diagnosing-bugs` |
| `skills/tooling/git-guardrails-claude-code` | `skills/misc/git-guardrails-claude-code`(Claude Code 専用) |
| `skills/tooling/implement` | `skills/engineering/implement` |
| `skills/tooling/migrate-to-shoehorn` | `skills/misc/migrate-to-shoehorn` |
| `skills/tooling/prototype` | `skills/engineering/prototype` |
| `skills/tooling/research` | `skills/engineering/research` |
| `skills/tooling/resolving-merge-conflicts` | `skills/engineering/resolving-merge-conflicts` |
| `skills/tooling/scaffold-exercises` | `skills/misc/scaffold-exercises` |
| `skills/tooling/setup-pre-commit` | `skills/misc/setup-pre-commit` |
| `skills/tooling/to-spec` | `skills/engineering/to-spec` |
| `skills/tooling/to-tickets` | `skills/engineering/to-tickets` |
| `skills/tooling/triage` | `skills/engineering/triage` |
| `skills/tooling/wayfinder` | `skills/engineering/wayfinder` |
| `skills/deprecated/design-an-interface` | `skills/deprecated/design-an-interface` |
| `skills/deprecated/qa` | `skills/deprecated/qa` |
| `skills/deprecated/request-refactor-plan` | `skills/deprecated/request-refactor-plan` |
| `skills/deprecated/ubiquitous-language` | `skills/deprecated/ubiquitous-language` |
| `skills/in-progress/batch-grill-me` | `skills/in-progress/batch-grill-me` |
| `skills/in-progress/claude-handoff` | `skills/in-progress/claude-handoff` |
| `skills/in-progress/loop-me` | `skills/in-progress/loop-me` |
| `skills/in-progress/setup-ts-deep-modules` | `skills/in-progress/setup-ts-deep-modules` |
| `skills/in-progress/to-questionnaire` | `skills/in-progress/to-questionnaire` |
| `skills/in-progress/wizard` | `skills/in-progress/wizard` |
| `skills/in-progress/writing-beats` | `skills/in-progress/writing-beats` |
| `skills/in-progress/writing-fragments` | `skills/in-progress/writing-fragments` |
| `skills/in-progress/writing-shape` | `skills/in-progress/writing-shape` |
| `skills/personal/edit-article` | `skills/personal/edit-article` |
| `skills/personal/obsidian-vault` | `skills/personal/obsidian-vault` |
