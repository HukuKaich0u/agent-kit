# agent-kit

再利用可能な agent assets 集です。

## APM で追加する

### グローバル assets

共有の core instructions をユーザースコープの APM manifest に追加する場合:

```sh
apm install -g HukuKaich0u/agent-kit/instructions/core
```

これで `~/.apm/apm.yml` が更新され、解決結果の pin は
`~/.apm/apm.lock.yaml` に書かれます。

`~/.apm/apm.yml` を自分で管理する場合は、依存を書いたうえで次を実行します。

```sh
apm install -g
```

例:

```yaml
name: koki-global
version: 0.1.0
targets:
  - claude
  - codex
dependencies:
  apm:
    - HukuKaich0u/agent-kit/instructions/core
```

### プロジェクト assets

現在のリポジトリに依存を追加する場合:

```sh
apm install HukuKaich0u/agent-kit/instructions/core
```

または、プロジェクトの `apm.yml` に直接書きます。

```yaml
dependencies:
  apm:
    - HukuKaich0u/agent-kit/instructions/core
```

その後に次を実行します。

```sh
apm install
```

### 更新

- `apm install`: 現在の manifest と lockfile に従って install する
- `apm update`: プロジェクトの依存を更新する
- `apm update -g`: `~/.apm/` 配下のグローバル依存を更新する

## パス

- `instructions/core`: Claude / Codex で共通利用する instructions
- `skills/`: 必要なものだけ選んで導入する local skills
- `plugins/deep-research`: deep research plugin(引用付きレポートを生成する CLI orchestrator + Skill)。skill は自己完結で、Claude Code / Codex のどちらでも使える (要 codex CLI ≥ 0.142.5)

```sh
# deep-research skill をユーザースコープに導入する場合
apm install -g HukuKaich0u/agent-kit/plugins/deep-research/skills/deep-research
```

### vendored skills

外部リポジトリから取り込んだ skill は、agent-kit の領域カテゴリに分散して配置している。
出自(取得元・ライセンス・取り込みコミット)と上流差分の確認手順は
[`skills/VENDORED.md`](skills/VENDORED.md) に一元管理している。

現在 [mattpocock/skills](https://github.com/mattpocock/skills)(MIT)から取り込み済み:

```sh
# 例: 計画/設計を1問ずつ詰める grilling を project に追加
apm install HukuKaich0u/agent-kit/skills/meta/grilling
```

| skill | 用途 | 配置 |
|---|---|---|
| grilling | 計画/設計を1問ずつ詰める | `skills/meta/grilling` |
| handoff | 会話を引き継ぎ文書に圧縮 | `skills/meta/handoff` |
| tdd | red-green-refactor | `skills/testing/tdd` |
| codebase-design | deep module 設計語彙 | `skills/backend/codebase-design` |
| domain-modeling | ドメインモデル/ADR/用語集 | `skills/backend/domain-modeling` |
| diagnosing-bugs | 難バグ/性能劣化の診断ループ | `skills/tooling/diagnosing-bugs` |
| resolving-merge-conflicts | マージ/リベース衝突の解消 | `skills/tooling/resolving-merge-conflicts` |
| git-guardrails-claude-code | 危険 git を hook でブロック(Claude Code 専用) | `skills/tooling/git-guardrails-claude-code` |
| code-review | Standards+Spec 2軸レビュー | `skills/tooling/code-review` |
| prototype | 使い捨てプロトタイプで設計検証 | `skills/tooling/prototype` |
| research | 軽量な一次情報調査→repo に Markdown | `skills/tooling/research` |

上流の更新確認: `scripts/check-vendored.sh`(`--diff` で実 diff も表示)
