# Vendored Skills

外部リポジトリから取り込んだ(vendoring した)skill の出自と同期状態を記録する。

配置は agent-kit の領域カテゴリ(`skills/<領域>/`)に分散しているため、
「どれが外部由来でどのコミットから来たか」はここで一元管理する。

## 同期の考え方

- vendoring = コピー取り込み。上流が更新されても自動では入らない。
- 上流差分を確認するには `scripts/check-vendored.sh` を使う(下記コミットと最新を比較)。
- 取り込み後にローカルで改造した場合は、その旨を備考に書く(差分取り込み時に上書き注意)。

---

## mattpocock/skills

- Source: https://github.com/mattpocock/skills
- License: MIT (Copyright (c) 2026 Matt Pocock)
- Vendored commit: `9603c1cc8118d08bc1b3bf34cf714f62178dea3b`
- Vendored date: 2026-07-19
- Upstream commit date: 2026-07-16

| agent-kit の配置 | 上流パス | 改造 | 備考 |
|---|---|---|---|
| `skills/meta/grilling` | `skills/productivity/grilling` | なし | 本体。自動発火。1問ずつ計画/設計を詰める |
| `skills/meta/handoff` | `skills/productivity/handoff` | なし | 会話を引き継ぎ文書に圧縮 |
| `skills/testing/tdd` | `skills/engineering/tdd` | なし | red-green-refactor。`tests.md`/`mocking.md` 添付。`CONTEXT.md` は任意参照 |
| `skills/backend/codebase-design` | `skills/engineering/codebase-design` | なし | deep module 設計語彙。`DEEPENING.md`/`DESIGN-IT-TWICE.md` 添付 |
| `skills/backend/domain-modeling` | `skills/engineering/domain-modeling` | なし | ドメインモデル/ADR/用語集。`ADR-FORMAT.md`/`CONTEXT-FORMAT.md` 添付 |
| `skills/tooling/diagnosing-bugs` | `skills/engineering/diagnosing-bugs` | なし | 難バグ/性能劣化の診断ループ。`scripts/hitl-loop.template.sh` 添付 |
| `skills/tooling/resolving-merge-conflicts` | `skills/engineering/resolving-merge-conflicts` | なし | マージ/リベース衝突の解消 |
| `skills/tooling/git-guardrails-claude-code` | `skills/misc/git-guardrails-claude-code` | なし | 危険 git を hook でブロック。**Claude Code 専用**(Codex 不可) |
| `skills/tooling/code-review` | `skills/engineering/code-review` | なし | Standards+Spec 2軸レビュー。**要注意**(下記) |
| `skills/tooling/prototype` | `skills/engineering/prototype` | なし | 使い捨てプロトタイプで設計検証。`LOGIC.md`/`UI.md` 添付 |
| `skills/tooling/research` | `skills/engineering/research` | なし | 軽量な一次情報調査→repo に Markdown。deep-research plugin と用途が近接 |

### 取り込み時の注意

- **code-review**: `docs/agents/issue-tracker.md` が無いと Spec 軸が機能しない。
  上流は `/setup-matt-pocock-skills`(未取り込み)でこれを作る前提。
  単体で使う場合は Standards 軸のみ有効、または issue-tracker.md を手動用意する。
  **TODO(カスタマイズ保留中):** 上流そのままで取り込み済み。ユーザーの実運用
  (GitHub Issues / ローカル Markdown spec 等)に合わせて SKILL.md 13行目・29行目の
  `docs/agents/issue-tracker.md` / `/setup-matt-pocock-skills` 依存を書き換える予定。
  改造したらこの表の「改造」列を「あり」にし、上流差分取り込み時の上書きに注意。
- **research**: 既存の `plugins/deep-research` と用途が近接。トリガーが被り得るので、
  project 側で apm.yml に入れる際はどちらを使うか意識する。
- **domain-modeling / diagnosing-bugs / tdd**: `CONTEXT.md` や `docs/adr/` を任意参照するが、
  無くても動作する(あれば読む、なければ domain-modeling が作る)。
