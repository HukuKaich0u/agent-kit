# drawio skill AWS 精度強化 設計（v1.16.0 想定）

日付: 2026-07-10
対象: `skills/tooling/drawio/`
承認: ユーザー承認済み（案A採用）

## 背景と目的

drawio skill v1.15.0 でレイアウト品質（重なり・ラベル衝突・線貫通）は解消済み。次の精度課題は次の3点で、いずれも AWS 公式アセット（AWS Architecture Icons Release 22-2025.07.31、4084 SVG/PNG + 公式ガイドライン PPTX）を規範として解決する。

1. **アイコン選定の正確さ** — サービスに対し間違った/古い/存在しないアイコンが使われる
2. **公式ガイドライン準拠** — 色・グループ枠・矢印・命名が AWS 公式作図規則からずれる
3. **見た目の仕上がり** — 公式ドキュメント水準のレイアウト品質

### 実測済みの前提

- draw.io 組み込み `mxgraph.aws4`（shape-index.json.gz 内 1,363 エントリ）は公式サービスアイコン307種を**ほぼ全カバー**。正規化名マッチで不一致となる28件の大半は命名ゆれ（例: Amazon-Simple-Storage-Service ↔ S3、AWS-Identity-and-Access-Management ↔ IAM）
- したがって本質的な問題は「アイコンの欠落」ではなく「**正式名称→正しいアイコン/色への対応付け**」と「**公式規則の機械検査の不在**」
- 公式 PPTX（Light BG 版）には System / Guidelines / Examples セクションがあり、矢印・グループ・アイコン使用規則の公式定義を含む

### 設計原則

v1.15.0 の教訓を踏襲する: **初回 XML の品質を決定的検出（validate.py）で必須ゲート化するのが最有効**。今回はこのゲートを「色・アイコン選定・グループ枠」に拡張する。

## 構成要素

### 1. アセット取り込み — `skills/tooling/drawio/assets/aws/`

- コピー元: `~/Downloads/aws-architecture-icons/`（4フォルダ: Architecture-Service-Icons / Resource-Icons / Category-Icons / Architecture-Group-Icons、いずれも 07312025 版）
- **SVG のみ・1サイズのみ**を取り込む（PNG と重複サイズ除外）。サービスアイコンは 64px 版、リソース/カテゴリ/グループはフォルダ提供サイズの最大のもの。4084 → 約1,300 ファイル・数MB
- `.DS_Store` 等は除外
- PPTX 2つはコピーしない。規則テキストを抽出して references に焼き込み、元ファイルは使い捨て

### 2. 公式アイコン索引 — `data/aws-icon-index.json`（新規）

生成スクリプト `scripts/build_aws_index.py`（再生成可能、生成物を commit）。

エントリ構造（1アイコン = 1エントリ）:

```json
{
  "name": "Amazon Simple Storage Service",
  "aliases": ["S3", "Amazon S3"],
  "category": "Storage",
  "official_color": "#7AA116",
  "aws4_style": "sketch=0;...resIcon=mxgraph.aws4.s3;",
  "svg": "assets/aws/service/Storage/Arch_Amazon-Simple-Storage-Service_64.svg",
  "kind": "service"
}
```

- `aws4_style` の照合: 正規化名マッチ（lowercase、`amazon`/`aws` プレフィックス除去、記号除去）＋ **命名ゆれ28件の手動対応表**（スクリプト内に定数として保持）
- 照合不能（真に欠落）のアイコンは `aws4_style: null` とし、SVG data URI 埋め込みで描画する対象としてマーク
- `official_color` はカテゴリ→色の公式対応（Arch アイコン SVG の fill から抽出）
- グループ枠（Architecture-Group-Icons 由来）は `kind: "group"` で同索引に含め、公式枠属性（`strokeColor` / `fontColor` / `dashed` / 対応する `grIcon`）を持たせる。**機械検査（validate.py）の source of truth はこの索引**であり、references の枠スタイル表は作図者（agent）向けの転記

### 3. shapesearch.py の AWS 優先参照

- AWS 関連クエリ（クエリが索引の name/alias にヒットする場合）は `aws-icon-index.json` を優先参照し、`正式名称・aws4 スタイル・公式色・（欠落時）SVG パス` を返す
- 非 AWS クエリは従来どおり shape-index.json.gz を検索（挙動変更なし）

### 4. 公式ガイドラインの焼き込み — `references/aws-architecture.md` 拡充

- PPTX の System / Guidelines セクションからテキスト抽出し、次を規則化して追記:
  - 矢印スタイル（意味・線種・色の公式規則）
  - グループの使い分け（AWS Cloud / Region / VPC / AZ / subnet / Account / Auto Scaling group 等の適用基準）
  - アイコン使用の do/don't（改変禁止・色変更禁止・サイズ比率等）
  - サービスの公式命名規則（Amazon/AWS プレフィックスの使い分け）
- グループ枠スタイル表を現行6種 → 公式 Group アイコン全種（約15種: AWS Account、Auto Scaling group、Corporate data center、EC2 instance contents、Server contents、Spot Fleet、AWS Cloud Dark 等）に拡充。各行は mxgraph.aws4 の group スタイル文字列を verbatim で記載

### 5. validate.py の検査追加

決定的ゲートの拡張。いずれも error レベル:

- **カテゴリ色検査**: `shape=mxgraph.aws4.resourceIcon` の各セルについて、`resIcon` を索引で引き、`fillColor` が公式カテゴリ色と不一致なら error
- **グループ枠検査**: `shape=mxgraph.aws4.group` の各セルについて、`grIcon` から索引の group エントリを引き、`strokeColor` / `fontColor` / `dashed` が不一致なら error
- 索引にない `resIcon` / `grIcon` は warning（存在しないアイコン名の検出）

### 6. SKILL.md 更新

- AWS 図の手順に「アイコンは索引経由で引く（名称・スタイル・色をセットで取得）」を明記
- validate.py 必須ゲートは従来どおり（検査項目が増えるだけでフローは不変）

## 検証（writing-skills の TDD 手順）

- **RED**: 現行 skill のまま fresh agent に「新しめのサービス（例: Bedrock AgentCore、S3 Vectors、GameLift Streams）を含む AWS 構成図」を生成させ、アイコン・色・枠の誤りを記録する
- **GREEN**: 強化後、同一シナリオ・fresh agent で validate.py 初回パス 0 error / 0 warning ＋ vision チェックで公式ガイドライン準拠を確認
- fresh-agent 検証は前回確立したパターンを踏襲: subagent に `~/.claude/skills/drawio/SKILL.md` を読ませて生成 → vision + validate.py で採点。drawio CLI のストール対策として `perl -e 'alarm 120; exec @ARGV'` をプロンプトに明記（macOS に timeout コマンドはない）

## スコープ外

- Azure / GCP アイコンセットへの同様の拡張（将来課題。external-label 規則は既に共通適用）
- 公式 SVG への全面切替（案B。カバレッジほぼ完全な現状ではリターンが小さいため不採用）
- PPTX Examples セクションのレイアウトテンプレート化（今回は Guidelines の規則抽出まで）

## 完了後の後始末

- `~/.claude/skills/drawio` へ同期（agent-kit が source of truth）
- `~/Downloads` の元フォルダ・zip は残置（扱いはユーザー判断）
