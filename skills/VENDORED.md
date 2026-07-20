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
| `skills/tooling/code-review` | `skills/engineering/code-review` | **あり** | Standards+Spec 2軸レビュー。issue-tracker 依存を書き換え(下記) |
| `skills/meta/setup-agent-kit` | `skills/engineering/setup-matt-pocock-skills` | **あり** | リネーム+agent-kit 向けに調整。テンプレ4種同梱(下記) |
| `skills/tooling/prototype` | `skills/engineering/prototype` | なし | 使い捨てプロトタイプで設計検証。`LOGIC.md`/`UI.md` 添付 |
| `skills/tooling/research` | `skills/engineering/research` | なし | 軽量な一次情報調査→repo に Markdown。deep-research plugin と用途が近接 |

### 取り込み時の注意

- **code-review**(改造あり / 2026-07-20): `docs/agents/issue-tracker.md` が Spec 軸のソース。
  上流の `/setup-matt-pocock-skills` 依存を `setup-agent-kit` skill に差し替え済み。
  あわせて「issue-tracker.md が無くても Spec 軸は step 2 のフォールバック(引数パス /
  repo 内 spec ファイル)で動く。GitHub remote があれば `gh issue view` が既定」を明記。
  上流差分を取り込む際、SKILL.md の該当2行(13行目付近・spec 探索順の1項目)は上書き注意。

- **setup-agent-kit**(改造あり / 2026-07-20): 上流 `setup-matt-pocock-skills` の移植。
  ほぼそのまま移植する方針で、テンプレート4種(`issue-tracker-github/gitlab/local.md`、
  `triage-labels.md`、`domain.md`)も同梱。加えた変更:
  - skill 名・見出し・文言を `setup-agent-kit` / agent-kit 向けにリネーム
  - 対象 skill の説明を agent-kit の実態(現状 `code-review` の Spec 軸)に合わせた
  - Section B(triage ラベル)は「agent-kit は triage skill を同梱しないので通常スキップ」と明記
  - `issue-tracker-github.md` / `issue-tracker-local.md` の「fetch the relevant ticket」節に、
    issue 番号が無い場合の repo 内 spec フォールバック(`docs/` `specs/` `.scratch/`)を追記
  上流の `agents/openai.yaml`(Codex 用 policy)は未取り込み。
  なお triage / to-tickets / to-spec / qa / wayfinder 等、テンプレが言及する skill は agent-kit 未導入。
  将来取り込むならテンプレの該当節がそのまま効く。
- **research**: 既存の `plugins/deep-research` と用途が近接。トリガーが被り得るので、
  project 側で apm.yml に入れる際はどちらを使うか意識する。
- **domain-modeling / diagnosing-bugs / tdd**: `CONTEXT.md` や `docs/adr/` を任意参照するが、
  無くても動作する(あれば読む、なければ domain-modeling が作る)。
