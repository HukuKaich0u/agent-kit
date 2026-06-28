# Mizchi Skills Import Design

## Goal

`github.com/mizchi/skills` の `skills/` 配下を、この repo の `skills/` 配下へ一括取り込みする。今回は再利用しやすい洗練された skill 群を素早く手元に置くことを優先し、同期基盤や配布 metadata の整備は後回しにする。

## Scope

- import 元は `mizchi/skills` の `skills/` ディレクトリ
- import 先はこの repo の `skills/` ディレクトリ
- カテゴリ構成は元 repo のまま維持する
- 既存 path と衝突した skill は上書きせず、既存版を退避して両方残す
- import 後に `SKILL.md` 一覧を確認し、追加件数と衝突有無を把握する

## Non-Goals

- 再同期スクリプトの作成
- 出典 manifest や source-tracking metadata の追加
- APM 用 package 分割や plugin 基盤整備
- import 後の内容レビュー、環境依存修正、不要 skill の削除

## Import Rules

### Source of truth

今回の source は `mizchi/skills` 側の現行 `skills/` ツリーとする。取り込み後はこの repo 側で自由に編集してよい。

### Collision handling

既存の `skills/` 配下に同じ path がある場合は、機械的上書きを避ける。衝突した既存 skill を退避し、import された skill と両方残る状態にする。退避名は実行時に一意に決める。

### Layout

`skills/frontend/...` や `skills/tooling/...` のようなカテゴリ構造はそのまま保持する。`vendor/` や `skills/mizchi/` のような別 namespace は作らない。

## Verification

- import 前後の `SKILL.md` 件数差分を確認する
- 衝突した path の一覧を確認する
- `skills/` 配下の主要カテゴリが copy されていることを確認する

## Risks

- 既存 skill との重複や責務の衝突が増える
- 環境依存の記述がそのまま入る可能性がある
- 出典管理を省くため、後から由来を追いにくくなる

## Follow-up

取り込み後は必要に応じて以下を手作業で進める。

- 環境依存の差し替え
- 不要 skill の削除
- 使う skill の文言や構成の調整
