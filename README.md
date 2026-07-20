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

上流 2 repo を**完全ミラー**(全 skill を取り込む方針)している:

- [mizchi/skills](https://github.com/mizchi/skills)(MIT 既定 / 一部 Apache-2.0)— 67本。
  上流と同一のカテゴリ階層(`sql/` `frontend/` `aws/` 等)で配置
- [mattpocock/skills](https://github.com/mattpocock/skills)(MIT)— 41本。
  `productivity` / `engineering` / `misc` は領域カテゴリに振り分け、
  `deprecated/` `in-progress/` `personal/` は上流のステータスのまま配置

```sh
# 例: 計画/設計を1問ずつ詰める grilling を project に追加
apm install HukuKaich0u/agent-kit/skills/meta/grilling
```

現在は全108本とも**上流の内容そのまま(ローカル改造なし)**。2026-07-20 にクリーンリセットし、
使うものから少しずつカスタマイズし直す方針(旧カスタム版は git 履歴 `0fd8ec3` にある)。

各 skill の一覧と状態は [`skills/INVENTORY.md`](skills/INVENTORY.md)、
出自・取り込みコミットの詳細は [`skills/VENDORED.md`](skills/VENDORED.md) を参照。

上流の更新確認: `scripts/check-vendored.sh`(両上流を一括チェック、`--diff` で実 diff も表示)
