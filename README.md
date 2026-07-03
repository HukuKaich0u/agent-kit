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
- `plugins/deep-research`: deep research plugin(引用付きレポートを生成する CLI orchestrator + Skill)。skill は自己完結で、Claude Code / Codex のどちらでも使える

```sh
# deep-research skill をユーザースコープに導入する場合
apm install -g HukuKaich0u/agent-kit/plugins/deep-research/skills/deep-research
```
