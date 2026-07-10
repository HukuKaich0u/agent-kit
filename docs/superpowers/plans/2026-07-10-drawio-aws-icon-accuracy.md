# drawio skill AWS アイコン精度強化 (v1.16.0) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** AWS 公式アイコンセット（Release 22-2025.07.31）を規範レイヤーとして drawio skill に統合し、アイコン選定・公式色・グループ枠の正確さを validate.py の決定的ゲートで保証する。

**Architecture:** 公式 SVG アセット（SVG のみ・1サイズ）を `assets/aws/` に取り込み、`build_aws_index.py` が「正式名称→別名→カテゴリ→mxgraph.aws4 スタイル→SVG パス」の索引 `data/aws-icon-index.json` を生成する。`shapesearch.py` は AWS クエリでこの索引を優先し、`validate.py` は索引を source of truth としてカテゴリ色・グループ枠の公式準拠を検査する。描画は従来どおり `mxgraph.aws4`（カバレッジほぼ完全）、真に欠落する5アイコンのみ公式 SVG の data URI 埋め込み。

**Tech Stack:** Python 3 標準ライブラリのみ（gzip/json/re/os）。テストは fixture .drawio ファイル + CLI 検証（この repo にテストフレームワークはない）。

**Spec:** `docs/superpowers/specs/2026-07-10-drawio-aws-icon-accuracy-design.md`

**事前確定済みの実データ**（このセッションで実測済み。計画中の値はすべて検証済み）:
- 公式サービスアイコン 64px SVG = **309 個**、リソース 48px SVG = **430 個**、グループ SVG = **15 個**、カテゴリ 64px SVG = **25 個**
- `mxgraph.aws4` の resourceIcon は公式サービスアイコンをほぼ全カバー。正規化名で不一致の28件の対応表は Task 2 の `OVERRIDES` に確定済み（真の欠落は Elemental 系4件 + WorkDocs SDK の5件のみ）
- 現行 `references/aws-architecture.md` の Region 行は**旧パレット**（#879196）。現行公式は stroke=#00A4A6 / font=#147EBA（shape-index 実測）— Task 6 で修正する

---

## File Structure

| Path | 役割 |
|---|---|
| `skills/tooling/drawio/assets/aws/service/<Arch_Category>/*.svg` | 公式サービスアイコン（64px SVG、Create） |
| `skills/tooling/drawio/assets/aws/resource/<Res_Category>/*.svg` | 公式リソースアイコン（48px SVG、Create） |
| `skills/tooling/drawio/assets/aws/group/*.svg` | 公式グループアイコン（Create） |
| `skills/tooling/drawio/assets/aws/category/*.svg` | 公式カテゴリアイコン（Create） |
| `skills/tooling/drawio/scripts/build_aws_index.py` | 索引生成スクリプト（Create） |
| `skills/tooling/drawio/data/aws-icon-index.json` | 生成された索引（Create、commit する） |
| `skills/tooling/drawio/scripts/shapesearch.py` | AWS 索引の優先参照を追加（Modify） |
| `skills/tooling/drawio/scripts/validate.py` | 公式準拠チェックを追加（Modify） |
| `skills/tooling/drawio/references/aws-architecture.md` | グループ表全種化 + 公式規則の焼き込み（Modify） |
| `skills/tooling/drawio/SKILL.md` | 索引参照手順 + version 1.16.0（Modify） |

作業ディレクトリはすべて `/Users/KokiAoyagi/Documents/repos/personal/agent-kit`（以下 repo ルート）。fixture 等の一時ファイルはセッションの scratchpad ディレクトリに置く。

---

### Task 1: 公式アセットの取り込み

**Files:**
- Create: `skills/tooling/drawio/assets/aws/{service,resource,group,category}/`

- [ ] **Step 1: SVG のみ・1サイズのみをコピー**

```bash
cd /Users/KokiAoyagi/Documents/repos/personal/agent-kit
SRC=~/Downloads/aws-architecture-icons
DST=skills/tooling/drawio/assets/aws
mkdir -p "$DST/service" "$DST/resource" "$DST/group" "$DST/category"
# サービス: 64px SVG、カテゴリフォルダ維持
find "$SRC/Architecture-Service-Icons_07312025" -path '*/64/*_64.svg' | while read -r f; do
  cat=$(basename "$(dirname "$(dirname "$f")")")
  mkdir -p "$DST/service/$cat"
  cp "$f" "$DST/service/$cat/"
done
# リソース: 48px SVG、カテゴリフォルダ維持
find "$SRC/Resource-Icons_07312025" -name '*_48.svg' | while read -r f; do
  cat=$(basename "$(dirname "$f")")
  mkdir -p "$DST/resource/$cat"
  cp "$f" "$DST/resource/$cat/"
done
# グループ / カテゴリ
cp "$SRC/Architecture-Group-Icons_07312025/"*.svg "$DST/group/"
cp "$SRC/Category-Icons_07312025/Arch-Category_64/"*.svg "$DST/category/"
```

- [ ] **Step 2: 件数とサイズを検証**

```bash
find skills/tooling/drawio/assets/aws/service -name '*.svg' | wc -l    # 期待: 309
find skills/tooling/drawio/assets/aws/resource -name '*.svg' | wc -l   # 期待: 430
ls skills/tooling/drawio/assets/aws/group/*.svg | wc -l                # 期待: 15
ls skills/tooling/drawio/assets/aws/category/*.svg | wc -l             # 期待: 25
du -sh skills/tooling/drawio/assets/aws                                # 期待: 数MB（10MB 未満）
```

期待値と一致しない場合はコピーコマンドのパターンを見直す（Downloads 側は読み取りに macOS TCC 権限が必要。`Operation not permitted` が出たらユーザーに権限付与を依頼する）。

- [ ] **Step 3: Commit**

```bash
git add skills/tooling/drawio/assets
git commit -m "feat(skills): drawio に AWS 公式アイコンアセットを追加(SVG のみ・Release 22)"
```

---

### Task 2: 索引生成スクリプト `build_aws_index.py`

**Files:**
- Create: `skills/tooling/drawio/scripts/build_aws_index.py`
- Create: `skills/tooling/drawio/data/aws-icon-index.json`（生成物）

- [ ] **Step 1: スクリプトを作成**

`skills/tooling/drawio/scripts/build_aws_index.py` を以下の内容で作成:

```python
#!/usr/bin/env python3
"""Build data/aws-icon-index.json from the official AWS icon assets.

Sources:
  assets/aws/                — official AWS Architecture Icons (SVG only,
                               Release 22-2025.07.31)
  data/shape-index.json.gz   — draw.io shape index (mxgraph.aws4 styles)

Output entry kinds:
  service  — Architecture-Service-Icons (the 78x78 resourceIcon set); carries
             the matching mxgraph.aws4 style, or null when the icon has no
             aws4 counterpart (embed the official SVG instead)
  resource — Resource-Icons (48px variants; best-effort aws4 match)
  group    — official group frames (verified against the current
             mxgraph.aws4 palette; consumed by validate.py as the
             source of truth for frame-color checks)

Usage: python3 build_aws_index.py        # writes data/aws-icon-index.json
"""
import gzip
import json
import os
import re

ROOT = os.path.normpath(os.path.join(os.path.dirname(__file__), ".."))
ASSETS = os.path.join(ROOT, "assets", "aws")
SHAPE_INDEX = os.path.join(ROOT, "data", "shape-index.json.gz")
OUT = os.path.join(ROOT, "data", "aws-icon-index.json")


def norm(s):
    s = s.lower()
    s = re.sub(r"^(amazon|aws)[-_ ]+", "", s)
    return re.sub(r"[^a-z0-9]", "", s)


# normalized official name -> aws4 resIcon token, for the 28 official names
# whose normalized form does not equal the aws4 title (verified 2026-07-10
# against shape-index.json.gz). None = no aws4 counterpart: embed the SVG.
OVERRIDES = {
    "costandusagereport": "mxgraph.aws4.cost_and_usage_report",
    "elementalconductor": None,
    "elementaldelta": None,
    "elementallive": None,
    "elementalserver": None,
    "iamidentitycenter": "mxgraph.aws4.single_sign_on",
    "identityandaccessmanagement": "mxgraph.aws4.identity_and_access_management",
    "iotanalytics": "mxgraph.aws4.iot_analytics",
    "iotbutton": "mxgraph.aws4.iot_button",
    "iotcore": "mxgraph.aws4.iot_core",
    "iotdevicedefender": "mxgraph.aws4.iot_device_defender",
    "iotdevicemanagement": "mxgraph.aws4.iot_device_management",
    "iotevents": "mxgraph.aws4.iot_events",
    "iotexpresslink": "mxgraph.aws4.iot_expresslink",
    "iotfleetwise": "mxgraph.aws4.iot_fleetwise",
    "iotsitewise": "mxgraph.aws4.iot_sitewise",
    "iottwinmaker": "mxgraph.aws4.iot_twinmaker",
    "marketplacedark": "mxgraph.aws4.marketplace",
    "marketplacelight": "mxgraph.aws4.marketplace",
    "appstream2": "mxgraph.aws4.appstream_20",
    "augmentedaia2i": "mxgraph.aws4.augmented_ai",
    "efs": "mxgraph.aws4.elastic_file_system",
    "fsxforwfs": "mxgraph.aws4.fsx_for_windows_file_server",
    "gameliftservers": "mxgraph.aws4.gamelift_2",
    "pinpointapis": "mxgraph.aws4.pinpoint",
    "simplestorageservice": "mxgraph.aws4.s3",
    "simplestorageserviceglacier": "mxgraph.aws4.glacier",
    "workdocssdk": None,
}

# Curated official short forms (guideline: short forms are allowed once the
# full name has appeared). Keys are normalized official names.
EXTRA_ALIASES = {
    "simplestorageservice": ["S3"],
    "simplestorageserviceglacier": ["S3 Glacier", "Glacier"],
    "identityandaccessmanagement": ["IAM"],
    "iamidentitycenter": ["SSO", "Identity Center"],
    "simplequeueservice": ["SQS"],
    "simplenotificationservice": ["SNS"],
    "simpleemailservice": ["SES"],
    "elastickubernetesservice": ["EKS"],
    "elasticcontainerservice": ["ECS"],
    "elasticcontainerregistry": ["ECR"],
    "relationaldatabaseservice": ["RDS"],
    "elasticloadbalancing": ["ELB"],
    "elasticblockstore": ["EBS"],
    "keymanagementservice": ["KMS"],
    "virtualprivatecloud": ["VPC"],
}

# Official group frames, current mxgraph.aws4 palette (dumped from
# shape-index.json.gz 2026-07-10 + guideline deck slide 25).
# "Security group" is the one row not present in the bundled shape-index;
# its colors follow the draw.io palette and are re-verified in Task 9.
GROUPS = [
    # (name, grIcon, strokeColor, fontColor, fillColor, dashed)
    ("AWS Cloud", "mxgraph.aws4.group_aws_cloud_alt", "#232F3E", "#232F3E", "none", 0),
    ("AWS Cloud (logo)", "mxgraph.aws4.group_aws_cloud", "#232F3E", "#232F3E", "none", 0),
    ("Region", "mxgraph.aws4.group_region", "#00A4A6", "#147EBA", "none", 1),
    ("Availability Zone", "mxgraph.aws4.group_availability_zone", "#545B64", "#545B64", "none", 1),
    ("VPC", "mxgraph.aws4.group_vpc2", "#8C4FFF", "#AAB7B8", "none", 0),
    ("Public subnet", "mxgraph.aws4.group_security_group", "#7AA116", "#248814", "#F2F6E8", 0),
    ("Private subnet", "mxgraph.aws4.group_security_group", "#00A4A6", "#147EBA", "#E6F6F7", 0),
    ("Security group", "mxgraph.aws4.group_security_group", "#DD3522", "#DD3522", "none", 0),
    ("Auto Scaling group", "mxgraph.aws4.group_auto_scaling_group", "#D86613", "#D86613", "none", 1),
    ("Server contents", "mxgraph.aws4.group_on_premise", "#7D8998", "#5A6C86", "none", 0),
    ("Corporate data center", "mxgraph.aws4.group_corporate_data_center", "#7D8998", "#5A6C86", "none", 0),
    ("EC2 instance contents", "mxgraph.aws4.group_ec2_instance_contents", "#D86613", "#D86613", "none", 0),
    ("Spot Fleet", "mxgraph.aws4.group_spot_fleet", "#D86613", "#D86613", "none", 0),
    ("AWS account", "mxgraph.aws4.group_account", "#CD2264", "#CD2264", "none", 0),
    ("IoT Greengrass Deployment", "mxgraph.aws4.group_iot_greengrass_deployment", "#7AA116", "#3F8624", "none", 0),
    ("IoT Greengrass", "mxgraph.aws4.group_iot_greengrass", "#7AA116", "#3F8624", "none", 0),
    ("Elastic Beanstalk container", "mxgraph.aws4.group_elastic_beanstalk", "#D86613", "#D86613", "none", 0),
    ("Step Functions workflow", "mxgraph.aws4.group_aws_step_functions_workflow", "#CD2264", "#CD2264", "none", 0),
]


def aws4_maps():
    """resIcon token -> (style, title); normalized aws4 title -> token."""
    with gzip.open(SHAPE_INDEX, "rt", encoding="utf-8") as f:
        shapes = json.load(f)
    by_token, token_by_title = {}, {}
    for s in shapes:
        st = s.get("style", "")
        m = re.search(r"resIcon=(mxgraph\.aws4\.[a-z0-9_]+)", st)
        if not m:
            continue
        tok = m.group(1)
        by_token.setdefault(tok, (st, s.get("title", "")))
        token_by_title.setdefault(norm(s.get("title", "")), tok)
    return by_token, token_by_title


def svg_color(path):
    """First fill that isn't white/black — the category color of an icon."""
    try:
        txt = open(path, encoding="utf-8", errors="ignore").read()
    except OSError:
        return None
    for c in re.findall(r"#[0-9A-Fa-f]{6}", txt):
        if c.upper() not in ("#FFFFFF", "#000000"):
            return c.upper()
    return None


def walk_icons(subdir, pattern):
    """Yield (category_folder, filename, raw_name, abs_path)."""
    root = os.path.join(ASSETS, subdir)
    for cat in sorted(os.listdir(root)):
        cdir = os.path.join(root, cat)
        if not os.path.isdir(cdir):
            continue
        for f in sorted(os.listdir(cdir)):
            m = re.match(pattern, f)
            if m:
                yield cat, f, m.group(1), os.path.join(cdir, f)


def main():
    by_token, token_by_title = aws4_maps()
    entries, unmatched = [], []

    def add(kind, cat_prefix, cat, fname, raw, path, track_unmatched):
        key = norm(raw)
        tok = OVERRIDES[key] if key in OVERRIDES else token_by_title.get(key)
        style, title = by_token.get(tok, (None, None)) if tok else (None, None)
        if tok and style is None:
            unmatched.append((raw, tok))
        elif style is None and track_unmatched and key not in OVERRIDES:
            unmatched.append((raw, None))
        aliases = list(EXTRA_ALIASES.get(key, []))
        if title and norm(title) != key and title not in aliases:
            aliases.append(title)
        entries.append({
            "kind": kind,
            "name": raw.replace("-", " ").replace("_", " "),
            "aliases": aliases,
            "category": cat.replace(cat_prefix, "").replace("-", " "),
            "official_color": svg_color(path),
            "aws4_style": style,
            "svg": os.path.relpath(path, ROOT).replace(os.sep, "/"),
        })

    for cat, f, raw, path in walk_icons("service", r"Arch_(.+)_64\.svg$"):
        add("service", "Arch_", cat, f, raw, path, track_unmatched=True)
    for cat, f, raw, path in walk_icons("resource", r"Res_(.+)_48\.svg$"):
        add("resource", "Res_", cat, f, raw, path, track_unmatched=False)
    for name, gricon, stroke, font, fill, dashed in GROUPS:
        entries.append({
            "kind": "group", "name": name, "aliases": [], "grIcon": gricon,
            "strokeColor": stroke, "fontColor": font, "fillColor": fill,
            "dashed": dashed,
        })

    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(entries, f, ensure_ascii=False, indent=1)

    n_svc = sum(1 for e in entries if e["kind"] == "service")
    n_hit = sum(1 for e in entries if e["kind"] == "service" and e["aws4_style"])
    n_res = sum(1 for e in entries if e["kind"] == "resource")
    n_grp = sum(1 for e in entries if e["kind"] == "group")
    print(f"service {n_svc} (aws4 matched {n_hit}), resource {n_res}, "
          f"group {n_grp} -> {OUT}")
    for raw, tok in unmatched:
        suffix = f" (override token {tok} not in shape-index)" if tok else ""
        print(f"  unmatched: {raw}{suffix}")


if __name__ == "__main__":
    main()
```

- [ ] **Step 2: 実行して生成**

```bash
cd /Users/KokiAoyagi/Documents/repos/personal/agent-kit
python3 skills/tooling/drawio/scripts/build_aws_index.py
```

期待: `service 309 (aws4 matched 304), resource 430, group 18 -> .../aws-icon-index.json`。
`unmatched:` 行は Elemental 系4件 + WorkDocs SDK の5件のみ（`OVERRIDES` で None 指定のもの。これらは unmatched に出ない設計なので、**期待は unmatched 0 行**。1行でも出たら OVERRIDES の対応漏れ — トークンを `shapesearch.py` で調べて OVERRIDES に追記して再実行）。
matched 数が 304 ちょうどでなくても ±3 程度なら許容（Light/Dark 重複等）。**300 未満なら正規化ロジックのバグを疑う**。

- [ ] **Step 3: 索引の中身を検証**

```bash
python3 - << 'EOF'
import json
idx = json.load(open('skills/tooling/drawio/data/aws-icon-index.json'))
svc = {e['name']: e for e in idx if e['kind'] == 'service'}
s3 = next(e for e in idx if 'S3' in e.get('aliases', []))
assert s3['aws4_style'] and 'resIcon=mxgraph.aws4.s3;' in s3['aws4_style'], s3
assert s3['category'] == 'Storage', s3['category']
iam = next(e for e in idx if 'IAM' in e.get('aliases', []))
assert 'identity_and_access_management' in iam['aws4_style'], iam
groups = [e for e in idx if e['kind'] == 'group']
assert len(groups) == 18
vpc = next(g for g in groups if g['name'] == 'VPC')
assert vpc['strokeColor'] == '#8C4FFF' and vpc['grIcon'] == 'mxgraph.aws4.group_vpc2'
nulls = [e['name'] for e in idx if e['kind'] == 'service' and not e['aws4_style']]
assert len(nulls) == 5, nulls   # Elemental x4 + WorkDocs SDK
print('index OK:', len(idx), 'entries')
EOF
```

期待: `index OK: 757 entries`（309 + 430 + 18）。assert が落ちたら生成ロジックを直してから先に進む。

- [ ] **Step 4: Commit**

```bash
git add skills/tooling/drawio/scripts/build_aws_index.py skills/tooling/drawio/data/aws-icon-index.json
git commit -m "feat(skills): AWS 公式アイコン索引の生成スクリプトと索引を追加"
```

---

### Task 3: shapesearch.py の AWS 優先参照

**Files:**
- Modify: `skills/tooling/drawio/scripts/shapesearch.py`

- [ ] **Step 1: RED — 現状の挙動を記録**

```bash
python3 skills/tooling/drawio/scripts/shapesearch.py "IAM Identity Center" | head -4
```

期待（現状の失敗）: `[AWS official]` 行が出ない。汎用検索結果のみ（`Identity Center` 等）が返り、公式色や正式名称の情報がない。

- [ ] **Step 2: AWS 索引参照を実装**

`shapesearch.py` の `INDEX = ...` 行の直後に追加:

```python
AWS_INDEX = os.path.join(os.path.dirname(__file__), "..", "data", "aws-icon-index.json")


def norm_aws(s):
    s = s.lower()
    s = re.sub(r"^(amazon|aws)[-_ ]+", "", s)
    return re.sub(r"[^a-z0-9]", "", s)


def aws_lookup(query):
    """Entries whose official name or alias equals the query (normalized)."""
    if not os.path.exists(AWS_INDEX):
        return []
    key = norm_aws(query)
    if not key:
        return []
    with open(AWS_INDEX, encoding="utf-8") as f:
        entries = json.load(f)
    return [e for e in entries
            if any(norm_aws(n) == key for n in [e["name"]] + e.get("aliases", []))]
```

`main()` 内、`if not os.path.exists(INDEX):` の直前に追加:

```python
    aws = aws_lookup(args.query)
    if aws:
        if args.json:
            print(json.dumps(aws, indent=2, ensure_ascii=False))
            return
        for e in aws:
            if e["kind"] == "group":
                print(f"[AWS official group] {e['name']}")
                print(f"  grIcon={e['grIcon']};strokeColor={e['strokeColor']};"
                      f"fontColor={e['fontColor']};fillColor={e['fillColor']};"
                      f"dashed={e['dashed']}  — full style: references/aws-architecture.md")
                continue
            color = e.get("official_color") or "?"
            print(f"[AWS official] {e['name']}  ({e['kind']}, {e['category']}, {color})")
            if e.get("aws4_style"):
                print(f"  {e['aws4_style']}")
            else:
                print("  no mxgraph.aws4 counterpart — embed the official SVG "
                      "(see references/aws-architecture.md):")
                print(f"  svg: {e['svg']}")
        return
```

docstring の `Usage:` の前に1行追加:

```
For AWS queries, exact official-name/alias hits consult data/aws-icon-index.json
first and return the official name, category color and style; generic search is
the fallback.
```

- [ ] **Step 3: GREEN — 動作を検証**

```bash
python3 skills/tooling/drawio/scripts/shapesearch.py "IAM Identity Center"
# 期待: [AWS official] AWS IAM Identity Center  (service, Security Identity Compliance, #DD3522)
#       resIcon=mxgraph.aws4.single_sign_on を含む style 行
python3 skills/tooling/drawio/scripts/shapesearch.py "S3"
# 期待: [AWS official] Amazon Simple Storage Service ... resIcon=mxgraph.aws4.s3
python3 skills/tooling/drawio/scripts/shapesearch.py "AWS Elemental Live"
# 期待: no mxgraph.aws4 counterpart — embed the official SVG + svg: パス
python3 skills/tooling/drawio/scripts/shapesearch.py "uml actor" | head -3
# 期待: 従来どおりの汎用検索結果（挙動不変）
```

（Security Identity Compliance の色表示は `official_color` の実測値。#DD3522 でなくても赤系ならよい — assert 対象は resIcon の一致。）

- [ ] **Step 4: Commit**

```bash
git add skills/tooling/drawio/scripts/shapesearch.py
git commit -m "feat(skills): shapesearch に AWS 公式索引の優先参照を追加"
```

---

### Task 4: validate.py の公式準拠チェック

**Files:**
- Modify: `skills/tooling/drawio/scripts/validate.py`

- [ ] **Step 1: RED — 誤色の fixture を作り、現状スルーされることを確認**

scratchpad に `aws-badcolor.drawio` を作成:

```xml
<mxfile><diagram name="t"><mxGraphModel><root>
<mxCell id="0"/><mxCell id="1" parent="0"/>
<mxCell id="s3" value="S3" style="sketch=0;outlineConnect=0;fontColor=#232F3E;fillColor=#FF0000;strokeColor=#ffffff;dashed=0;verticalLabelPosition=bottom;verticalAlign=top;align=center;html=1;fontSize=12;fontStyle=0;aspect=fixed;shape=mxgraph.aws4.resourceIcon;resIcon=mxgraph.aws4.s3;" vertex="1" parent="1"><mxGeometry x="40" y="40" width="78" height="78" as="geometry"/></mxCell>
</root></mxGraphModel></diagram></mxfile>
```

```bash
python3 skills/tooling/drawio/scripts/validate.py <scratchpad>/aws-badcolor.drawio
```

期待（現状の失敗）: `0 error(s), 0 warning(s)` — S3 が赤（公式は #7AA116）でも検出されない。

- [ ] **Step 2: チェックを実装**

`validate.py` の import 群（`import argparse` の後）に追加:

```python
import json
import os
```

`EPS = 1.0` 行の直後に追加:

```python
AWS_INDEX = os.path.join(os.path.dirname(__file__), "..", "data", "aws-icon-index.json")
_AWS_CACHE = None


def aws_index():
    """(resIcon token -> official fillColor, grIcon -> allowed frame combos)."""
    global _AWS_CACHE
    if _AWS_CACHE is not None:
        return _AWS_CACHE
    res, gr = {}, {}
    if os.path.exists(AWS_INDEX):
        with open(AWS_INDEX, encoding="utf-8") as f:
            for e in json.load(f):
                if e["kind"] == "group":
                    gr.setdefault(e["grIcon"], []).append(e)
                elif e.get("aws4_style"):
                    m = re.search(r"resIcon=(mxgraph\.aws4\.[a-z0-9_]+)", e["aws4_style"])
                    fm = re.search(r"fillColor=(#[0-9A-Fa-f]{6})", e["aws4_style"])
                    if m and fm:
                        res[m.group(1)] = fm.group(1).upper()
    _AWS_CACHE = (res, gr)
    return _AWS_CACHE
```

`check_page()` 内、`# --- labeled edges without a label background ---` ブロックの後・`return errors, warns` の直前に追加:

```python
    # --- AWS official style conformance (data/aws-icon-index.json) ---
    res_fill, gr_combos = aws_index()
    if res_fill or gr_combos:
        for c in cells:
            if c.get("vertex") != "1":
                continue
            st = style_of(c)
            cid = c.get("id")
            if st.get("shape") == "mxgraph.aws4.resourceIcon":
                ri = st.get("resIcon", "")
                if ri not in res_fill:
                    warns.append(f"cell {cid!r} resIcon {ri!r} not in the official AWS icon "
                                 f"index — icon name may be wrong or outdated "
                                 f"(look it up with shapesearch.py)")
                else:
                    fill = (st.get("fillColor") or "").upper()
                    if fill != res_fill[ri]:
                        errors.append(f"cell {cid!r} fillColor {fill or '(none)'} != official "
                                      f"category color {res_fill[ri]} for {ri} — do not "
                                      f"recolor AWS icons")
            gi = st.get("grIcon")
            if gi and gi.startswith("mxgraph.aws4.group"):
                allowed = gr_combos.get(gi)
                if allowed is None:
                    warns.append(f"cell {cid!r} grIcon {gi!r} not in the official AWS "
                                 f"group table")
                    continue
                def nc(v):
                    return (v or "").upper()
                ok = any(nc(st.get("strokeColor")) == nc(a["strokeColor"]) and
                         nc(st.get("fontColor")) == nc(a["fontColor"]) and
                         (st.get("dashed") or "0") == str(a["dashed"])
                         for a in allowed)
                if not ok:
                    names = " / ".join(a["name"] for a in allowed)
                    errors.append(f"cell {cid!r} group frame (grIcon {gi!r}) does not match "
                                  f"any official variant ({names}) — copy the style verbatim "
                                  f"from references/aws-architecture.md")
```

docstring の Layout 箇条書きの末尾に追加:

```
  - AWS official-style conformance (needs data/aws-icon-index.json):
    resourceIcon fillColor must equal the official category color (error),
    group frames must match an official variant (error), unknown
    resIcon/grIcon names (warning)
```

- [ ] **Step 3: GREEN — fixture 3種で検証**

```bash
# 1) 誤色 → error
python3 skills/tooling/drawio/scripts/validate.py <scratchpad>/aws-badcolor.drawio
# 期待: error: cell 's3' fillColor #FF0000 != official category color #7AA116 ... / exit 1
```

`aws-badgroup.drawio`（VPC 枠を非公式色に）:

```xml
<mxfile><diagram name="t"><mxGraphModel><root>
<mxCell id="0"/><mxCell id="1" parent="0"/>
<mxCell id="vpc" value="VPC" style="outlineConnect=0;gradientColor=none;html=1;whiteSpace=wrap;fontSize=12;container=1;pointerEvents=0;collapsible=0;recursiveResize=0;shape=mxgraph.aws4.group;grIcon=mxgraph.aws4.group_vpc2;strokeColor=#FF0000;fillColor=none;verticalAlign=top;align=left;spacingLeft=30;fontColor=#AAB7B8;dashed=0;" vertex="1" parent="1"><mxGeometry x="40" y="40" width="400" height="300" as="geometry"/></mxCell>
</root></mxGraphModel></diagram></mxfile>
```

```bash
# 2) 非公式グループ枠 → error（"does not match any official variant (VPC)"）
python3 skills/tooling/drawio/scripts/validate.py <scratchpad>/aws-badgroup.drawio
```

`aws-good.drawio`（正しい S3 + 正しい VPC 枠。上記2ファイルの style の色を公式値に直したもの: S3 は fillColor=#7AA116、VPC は strokeColor=#8C4FFF。S3 セルは VPC の子にせず離して配置）:

```xml
<mxfile><diagram name="t"><mxGraphModel><root>
<mxCell id="0"/><mxCell id="1" parent="0"/>
<mxCell id="vpc" value="VPC" style="outlineConnect=0;gradientColor=none;html=1;whiteSpace=wrap;fontSize=12;container=1;pointerEvents=0;collapsible=0;recursiveResize=0;shape=mxgraph.aws4.group;grIcon=mxgraph.aws4.group_vpc2;strokeColor=#8C4FFF;fillColor=none;verticalAlign=top;align=left;spacingLeft=30;fontColor=#AAB7B8;dashed=0;" vertex="1" parent="1"><mxGeometry x="40" y="40" width="400" height="300" as="geometry"/></mxCell>
<mxCell id="s3" value="S3" style="sketch=0;outlineConnect=0;fontColor=#232F3E;fillColor=#7AA116;strokeColor=#ffffff;dashed=0;verticalLabelPosition=bottom;verticalAlign=top;align=center;html=1;fontSize=12;fontStyle=0;aspect=fixed;shape=mxgraph.aws4.resourceIcon;resIcon=mxgraph.aws4.s3;" vertex="1" parent="1"><mxGeometry x="520" y="40" width="78" height="78" as="geometry"/></mxCell>
</root></mxGraphModel></diagram></mxfile>
```

```bash
# 3) 公式準拠 → 0/0
python3 skills/tooling/drawio/scripts/validate.py <scratchpad>/aws-good.drawio
# 期待: 0 error(s), 0 warning(s) / exit 0
```

さらに回帰確認: 既存の検査が壊れていないことを、リポジトリに ある既存の .drawio サンプル（無ければ aws-good.drawio で代用）で `--strict` 実行して確認。

- [ ] **Step 4: Commit**

```bash
git add skills/tooling/drawio/scripts/validate.py
git commit -m "feat(skills): validate.py に AWS 公式色・グループ枠の準拠チェックを追加"
```

---

### Task 5: references/aws-architecture.md の拡充

**Files:**
- Modify: `skills/tooling/drawio/references/aws-architecture.md`

- [ ] **Step 1: グループ表を全種に置換（Region 行の旧パレット修正を含む）**

既存の「## Group containers — official styles (copy verbatim)」の表（AWS Cloud〜Private subnet の6行）を以下の18行に置換する。基本スタイルの雛形は共通:

```
sketch=0;outlineConnect=0;gradientColor=none;html=1;whiteSpace=wrap;fontSize=12;fontStyle=0;container=1;pointerEvents=0;collapsible=0;recursiveResize=0;shape=mxgraph.aws4.group;grIcon=<grIcon>;strokeColor=<stroke>;fillColor=<fill>;verticalAlign=top;align=left;spacingLeft=30;fontColor=<font>;dashed=<dashed>;
```

| Group | grIcon | stroke | font | fill | dashed |
|---|---|---|---|---|---|
| AWS Cloud | `mxgraph.aws4.group_aws_cloud_alt` | #232F3E | #232F3E | none | 0 |
| AWS Cloud (logo) | `mxgraph.aws4.group_aws_cloud` | #232F3E | #232F3E | none | 0 |
| Region | `mxgraph.aws4.group_region` | #00A4A6 | #147EBA | none | 1 |
| Availability Zone | `mxgraph.aws4.group_availability_zone` | #545B64 | #545B64 | none | 1 |
| VPC | `mxgraph.aws4.group_vpc2` | #8C4FFF | #AAB7B8 | none | 0 |
| Public subnet | `mxgraph.aws4.group_security_group` (+`grStroke=0`) | #7AA116 | #248814 | #F2F6E8 | 0 |
| Private subnet | `mxgraph.aws4.group_security_group` (+`grStroke=0`) | #00A4A6 | #147EBA | #E6F6F7 | 0 |
| Security group | `mxgraph.aws4.group_security_group` | #DD3522 | #DD3522 | none | 0 |
| Auto Scaling group | `mxgraph.aws4.group_auto_scaling_group` | #D86613 | #D86613 | none | 1 |
| Server contents | `mxgraph.aws4.group_on_premise` | #7D8998 | #5A6C86 | none | 0 |
| Corporate data center | `mxgraph.aws4.group_corporate_data_center` | #7D8998 | #5A6C86 | none | 0 |
| EC2 instance contents | `mxgraph.aws4.group_ec2_instance_contents` | #D86613 | #D86613 | none | 0 |
| Spot Fleet | `mxgraph.aws4.group_spot_fleet` | #D86613 | #D86613 | none | 0 |
| AWS account | `mxgraph.aws4.group_account` | #CD2264 | #CD2264 | none | 0 |
| IoT Greengrass Deployment | `mxgraph.aws4.group_iot_greengrass_deployment` | #7AA116 | #3F8624 | none | 0 |
| IoT Greengrass | `mxgraph.aws4.group_iot_greengrass` | #7AA116 | #3F8624 | none | 0 |
| Elastic Beanstalk container | `mxgraph.aws4.group_elastic_beanstalk` | #D86613 | #D86613 | none | 0 |
| Step Functions workflow | `mxgraph.aws4.group_aws_step_functions_workflow` | #CD2264 | #CD2264 | none | 0 |

md 上の表は各行に完全なスタイル文字列（雛形に値を代入したもの）を verbatim で記載する。AWS Cloud と VPC と subnet の既存行が持つ `points=[[0,0],...]` の接続点配列はそのまま維持してよい。表の直後に注記を追加: 「Region は中国など AWS ロゴ使用不可リージョンでは AWS Cloud (logo なし) を使う」「この表は data/aws-icon-index.json と同期しており validate.py が枠色を検査する（旧パレット #879196 の Region は error になる）」。

- [ ] **Step 2: 公式作図規則セクションを追加**

「## Group containers」セクションの前に以下のセクションを追加（内容は公式ガイドライン PPTX Release 22 slides 13-18, 25-26 から抽出済み）:

```markdown
## Official diagram rules (AWS Architecture Icons guideline, Release 22)

Icons:
- Use icons at their **predefined size, color and format**. Never recolor,
  crop, flip or rotate a service/resource icon. Keep 78×78 for resourceIcon.
  (`validate.py` errors when fillColor deviates from the official category color.)
- Pick icons via the official index: `python3 <this-skill-dir>/scripts/shapesearch.py "<official name or S3/IAM-style short form>"`.
  Never guess a resIcon name.

Labels (official naming rules):
- ≤ 2 lines, never break mid-word. "Amazon"/"AWS" must stay on the same line
  as the first word of the service name (`Amazon QuickSight`, not `Amazon` / `QuickSight` split after Amazon… break after the 2nd word instead).
- Keep the Amazon/AWS prefix with the service name at least once; short forms
  (S3, IAM, SQS …) are fine after the full name has appeared once in the doc.
- Never reuse one short form for two services (e.g. ELB for both Elastic Load
  Balancing and Elastic Beanstalk).

Arrows:
- Official preset = **open arrowhead** (not filled classic): use
  `endArrow=open;endFill=0;` on AWS diagrams; keep orthogonal right-angle
  routing wherever possible, a single diagonal only when right angles are impossible.
- Line weight 2 (`strokeWidth=2`) matches the official deck's 2pt rule.

Groups:
- Nested groups need a visible buffer on all sides (the padding constants
  below already exceed the official minimum).
- Do not invent group frames: copy a row from the table below verbatim
  (validate.py errors otherwise). If no preset fits, use a plain rectangle
  container in the service's **category color** — not a recolored official group.

Numbered callouts (optional):
- Black circle, bold white number: `ellipse;fillColor=#232F3E;strokeColor=none;fontColor=#ffffff;fontStyle=1;fontSize=12;` at 24×24 (simple diagrams may use 32×32; never mix sizes in one diagram).
- Number linearly (left→right / top→bottom / clockwise) and keep placement consistent.

Icons with no mxgraph.aws4 counterpart (shapesearch prints `no mxgraph.aws4
counterpart`): embed the official SVG —

    style="aspect=fixed;html=1;verticalLabelPosition=bottom;verticalAlign=top;align=center;fontSize=12;shape=image;image=data:image/svg+xml,<BASE64>;"

`<BASE64>` は `python3 -c "import base64,sys;print(base64.b64encode(open(sys.argv[1],'rb').read()).decode())" <svg path>` で生成(URI 内に `;` を含めないこと — style の区切りと衝突する)。geometry は 78×78。
```

- [ ] **Step 3: 冒頭とチェックリストを更新**

- 冒頭の説明文に1文追加: 「Icon choice, category colors and group frames are machine-checked against `data/aws-icon-index.json` (built from the official Release 22 assets in `assets/aws/`).」
- 「## Pre-export checklist (AWS diagrams)」に2項目追加:
  - `resIcon は shapesearch.py（公式索引）で引いたもの。色は style をそのまま使用（改変禁止）`
  - `グループ枠は本ファイルの表から verbatim コピー`

- [ ] **Step 4: 検証と Commit**

```bash
grep -c "mxgraph.aws4.group_" skills/tooling/drawio/references/aws-architecture.md   # 期待: 18 以上
git add skills/tooling/drawio/references/aws-architecture.md
git commit -m "feat(skills): AWS 公式作図規則とグループ枠全種を references に焼き込み"
```

---

### Task 6: SKILL.md 更新と version bump

**Files:**
- Modify: `skills/tooling/drawio/SKILL.md`

- [ ] **Step 1: version を 1.16.0 に**

- 3行目 `version: 1.15.0` → `version: 1.16.0`
- metadata JSON 内の `"version":"1.15.0"` → `"version":"1.16.0"`

- [ ] **Step 2: アイコン参照手順に索引を明記**

「For **vendor/branded icons** …」の段落（`scripts/shapesearch.py` に言及している箇所、221行目付近）の末尾に追加:

```
For **AWS services** specifically, `shapesearch.py` consults the official icon
index first (`data/aws-icon-index.json`, built from the official Release 22
assets): querying an official name or short form (`"S3"`, `"IAM"`, `"Bedrock"`)
returns the official name, category color and exact style. Use the returned
style **unmodified** — `validate.py` errors on recolored icons and non-official
group frames.
```

- [ ] **Step 3: Commit**

```bash
git add skills/tooling/drawio/SKILL.md
git commit -m "feat(skills): drawio v1.16.0 AWS 公式索引の参照手順を追加"
```

---

### Task 7: RED ベースライン（現行インストール版 skill で fresh-agent）

インストール側 `~/.claude/skills/drawio` はまだ v1.15.0 のまま（同期前）なので、現行版の失敗を記録できる。

- [ ] **Step 1: fresh subagent でシナリオ生成**

Agent tool（general-purpose）で以下のプロンプトを実行（1体でよい）:

```
~/.claude/skills/drawio/SKILL.md を読み、その手順に従って次の AWS 構成図を
.drawio で作成し PNG に export してください。
シナリオ: 「社内ドキュメント RAG チャットボット」
- ユーザー → API Gateway → Lambda → Bedrock AgentCore
- ベクトル格納: S3 Vectors(なければ S3)、認証: IAM Identity Center
- 監視: CloudWatch(横断サービスとして)
- VPC は使わず AWS Cloud 直下に配置、Region 枠あり
出力先: <scratchpad>/red-baseline/
注意: drawio CLI 実行は `perl -e 'alarm 120; exec @ARGV' <drawio バイナリ> ...`
でタイムアウトを付けること(macOS に timeout コマンドはない)。
最後に、生成した .drawio の XML パスと export した PNG パス、および
validate.py の「初回実行」の出力(自己修正を加える前のもの)をそのまま報告してください。
```

- [ ] **Step 2: 誤りを記録**

生成された .drawio に対して**強化後の** validate.py を実行し、公式準拠エラーを記録:

```bash
python3 skills/tooling/drawio/scripts/validate.py <scratchpad>/red-baseline/*.drawio
```

期待（RED の証拠）: 次のいずれかが観測される — ①IAM Identity Center や Bedrock AgentCore の resIcon 誤り/warning、②Region 枠が旧パレット #879196 で error、③アイコン色の改変 error。PNG を Read して目視でも記録。**何も観測されなければ**その旨を記録して先へ（GREEN 比較の基準が「既に良い」になるだけで、強化の妨げにはならない）。

---

### Task 8: インストール側への同期

- [ ] **Step 1: rsync で同期し name フィールドを復元**

```bash
rsync -a --exclude '.DS_Store' /Users/KokiAoyagi/Documents/repos/personal/agent-kit/skills/tooling/drawio/ ~/.claude/skills/drawio/
# installed 側の name は drawio-skill(apm 配布名)を維持する
sed -i '' '1,5s/^name: .*/name: drawio-skill/' ~/.claude/skills/drawio/SKILL.md
head -3 ~/.claude/skills/drawio/SKILL.md   # 期待: name: drawio-skill / version: 1.16.0
```

- [ ] **Step 2: 同期先でスクリプトが動くことを確認**

```bash
python3 ~/.claude/skills/drawio/scripts/shapesearch.py "S3" | head -2   # [AWS official] 行
python3 ~/.claude/skills/drawio/scripts/validate.py <scratchpad>/aws-badcolor.drawio; echo "exit=$?"  # error / exit=1
```

---

### Task 9: GREEN 検証（fresh-agent live、writing-skills の TDD 手順）

- [ ] **Step 1: Task 7 と同一シナリオを強化版で実行**

Task 7 Step 1 と同一プロンプト（出力先のみ `<scratchpad>/green-1/` に変更）を fresh subagent で実行。長時間run になる場合は `caffeinate` 推奨。

- [ ] **Step 2: 採点**

```bash
python3 skills/tooling/drawio/scripts/validate.py <scratchpad>/green-1/*.drawio
```

合格基準:
- validate.py **初回パス 0 error / 0 warning**（agent が self-check で直した後ではなく、agent の報告する初回 XML に対して。subagent に「validate.py 初回実行の結果をそのまま報告せよ」と指示しておく）
- PNG を Read し vision で確認: アイコンが公式デザイン・色、Region 枠が現行パレット（teal 破線）、ラベル2行以内・単語分断なし
- Security group 行の要検証項目: シナリオに Security group が出た場合のみ、draw.io desktop でスタイルを目視確認し、#DD3522 が誤りなら `build_aws_index.py` の GROUPS と references の表を実測値に直して再生成・再同期

- [ ] **Step 3: 2シナリオ目（グループ枠の網羅）**

同形式のプロンプトで別シナリオを1本:

```
シナリオ: 「マルチ AZ Web アプリ + オンプレ接続」
- Region > VPC > AZ-A(Public subnet: ALB / Private subnet: ECS, RDS)
- AZ-C は standby の RDS のみ(空箱を作らない)
- Corporate data center から Site-to-Site VPN で VPC へ
- Auto Scaling group を ECS に重ねる
出力先: <scratchpad>/green-2/
```

合格基準は Step 2 と同じ。特にグループ枠5種以上（Region/VPC/AZ/subnet×2/ASG/Corporate DC）がすべて公式スタイルで validate 0/0 になること。

- [ ] **Step 4: 失敗時の扱い**

GREEN が失敗したら: 誤りの原因（索引・references・SKILL.md のどれが不十分か）を特定して該当 Task の成果物を修正 → 再同期（Task 8）→ 同一シナリオで再実行。2回連続で初回パス 0/0 になるまで完了としない。

---

### Task 10: 後始末

- [ ] **Step 1: 最終 commit（未 commit 分があれば）と状態確認**

```bash
cd /Users/KokiAoyagi/Documents/repos/personal/agent-kit
git status   # clean であること
git log --oneline -8
```

- [ ] **Step 2: memory 更新**

`~/.claude/projects/-Users-KokiAoyagi-Documents-repos-personal-agent-kit/memory/drawio-skill-layout-hardening.md` に v1.16.0 の結果（検証結果・Security group 行の確定値・未解決事項）を追記し、`MEMORY.md` の該当行の hook を更新する。

- [ ] **Step 3: ユーザーへ報告**

RED/GREEN の比較（何が検出され、何が直ったか）、Downloads の元フォルダは残置している旨、`~/Downloads` の zip/フォルダを消してよいかの確認を報告に含める。
