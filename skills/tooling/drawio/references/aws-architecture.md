# AWS Architecture Diagrams (mxgraph.aws4)

Read this whenever the diagram uses AWS icons (`mxgraph.aws4.*`) — the same rules apply to Azure/GCP icon sets, which share the external-label style. Icon choice, category colors and group frames are machine-checked against `data/aws-icon-index.json` (built from the official Release 22 assets in `assets/aws/`).

## The failure mode that causes most broken AWS diagrams

Every `mxgraph.aws4.resourceIcon` style carries `verticalLabelPosition=bottom;verticalAlign=top` — **the label paints BELOW the icon's geometry box, outside it**. Spacing that only considers the 78×78 geometry box produces labels that collide with the node below, with edges, and with neighbouring labels. Treat every icon as occupying **icon box + label zone**:

```
┌──────────┐
│  78×78   │  geometry box (what x/y/w/h describe)
└──────────┘
 ラベル1行目   ← label zone: ~20px per line, centered, can be WIDER than the icon
 (2行目)
```

- Label zone height ≈ `20px × line count` (fontSize 12).
- Label width: fullwidth (CJK) char ≈ **12px**, ASCII char ≈ **7px**. `ElastiCache Redis` ≈ 120px — wider than the 78px icon; it sticks out ~21px on each side. `注文テーブル` (6 fullwidth) ≈ 72px.
- Keep labels ≤ 2 lines; break with `&#xa;` (e.g. `value="Lambda&#xa;注文受付"`).

## Spacing constants (hand-placed icons)

| Constraint | Minimum | Why |
|---|---|---|
| Row pitch (icon top → next icon top, same column) | **160px** | 78 icon + ~40 label (2 lines) + 40 edge corridor |
| Column pitch (icon center → icon center) | **200px**; 240px when labels ≥ 12 fullwidth chars | half-label + half-label + 20px gap |
| Container top padding (children `y`) | **40px** | group title zone |
| Container side/bottom padding | **20px** | |
| Gap between sibling containers | **40px** | edge corridor between boxes |
| Clearance under a bottom row of icons to the container edge | **30px** | label zone must stay inside the box |

## Port discipline on bottom-labeled icons

- **Never `exitX=0.5;exitY=1` (bottom center)** — the vertical line strikes straight through the label text. This is the #1 cause of "text under a line".
- Downward edge → exit at `exitX=0.25;exitY=1` or `exitX=0.75;exitY=1` (the two lines straddle the centered label), or exit a side (`exitX=0/1;exitY=0.5..0.8`).
- Entering the **top** of an icon (`entryY=0`) is always safe. Side entries are safe.
- Cross-cutting edges (logs, metrics, image pull) must not cut across the main flow: exit sideways and route through a **reserved corridor** (see below).

## Cross-cutting services (CloudWatch, ECR, X-Ray, …)

N services → 1 hub is the second-biggest source of tangled lines:

- Place the hub **outside** the main flow (left or right margin column, or bottom margin row), never between tiers.
- Reserve one vertical (or horizontal) corridor at a fixed x (or y) for ALL edges to that hub; give each edge a waypoint into the corridor. Keep the corridor ≥ 40px away from any icon/label/other edge label.
- Style them as background noise: `dashed=1;strokeColor=#7F7F7F;` and label **one** edge only (e.g. 「ログ出力」) — not all N.
- If exact per-service edges don't matter, one edge from the enclosing container boundary is cleaner than N parallel lines.

## Official diagram rules (AWS Architecture Icons guideline, Release 22)

Icons:
- Use icons at their **predefined size, color and format**. Never recolor, crop, flip or rotate a service/resource icon. Keep 78×78 for resourceIcon. (`validate.py` errors when fillColor deviates from the official category color.)
- Pick icons via the official index: `python3 <this-skill-dir>/scripts/shapesearch.py "<official name or S3/IAM-style short form>"`. Never guess a resIcon name.

Labels (official naming rules):
- ≤ 2 lines, never break mid-word. "Amazon"/"AWS" must stay on the same line as the first word of the service name (`Amazon QuickSight`, never `Amazon` / `Quick-Sight` — if a break is unavoidable, break after the second word).
- Keep the Amazon/AWS prefix with the service name at least once; short forms (S3, IAM, SQS …) are fine after the full name has appeared once in the diagram.
- Never reuse one short form for two services (e.g. ELB for both Elastic Load Balancing and Elastic Beanstalk).

Arrows:
- Official preset = **open arrowhead** (not filled classic): use `endArrow=open;endFill=0;` on AWS diagrams; keep orthogonal right-angle routing wherever possible, a single diagonal only when right angles are impossible.
- Line weight 2 (`strokeWidth=2`) matches the official deck's 2pt rule.

Groups:
- Nested groups need a visible buffer on all sides (the padding constants above already exceed the official minimum).
- Do not invent group frames: copy a row from the table below verbatim (`validate.py` errors otherwise). If no preset fits, use a plain rectangle container in the service's **category color** — not a recolored official group.

Numbered callouts (optional):
- Black circle, bold white number: `ellipse;fillColor=#232F3E;strokeColor=none;fontColor=#ffffff;fontStyle=1;fontSize=12;` at 24×24 (simple diagrams may use 32×32; never mix sizes in one diagram).
- Number linearly (left→right / top→bottom / clockwise) and keep placement consistent.

Icons with no mxgraph.aws4 counterpart (`shapesearch.py` prints `no mxgraph.aws4 counterpart`): embed the official SVG —

```
style="aspect=fixed;html=1;verticalLabelPosition=bottom;verticalAlign=top;align=center;fontSize=12;shape=image;image=data:image/svg+xml,<BASE64>;"
```

`<BASE64>` は `python3 -c "import base64,sys;print(base64.b64encode(open(sys.argv[1],'rb').read()).decode())" <svg path>` で生成（URI 内に `;` を含めないこと — style の区切りと衝突する）。geometry は 78×78。

## Group containers — official styles (copy verbatim)

All are used with `vertex="1"`, children set `parent="<container-id>"` with **relative** coordinates, first child at `y ≥ 40`. If a style below lacks `container=1`, append `container=1;pointerEvents=0;` before using it as a parent.

Every row is used with `vertex="1"` + `container=1`. The `points=[[0,0],[0.25,0],…]` connection-point array from the skeleton below may be prepended to any row (it only adds edge anchor points). **This table is generated from and kept in sync with `data/aws-icon-index.json` — `validate.py` errors on any frame whose stroke/font/dashed deviates** (e.g. the pre-2021 gray Region `#879196` is an error; current official Region is teal `#00A4A6`).

| Group | style |
|---|---|
| AWS Cloud | `sketch=0;outlineConnect=0;gradientColor=none;html=1;whiteSpace=wrap;fontSize=12;fontStyle=0;container=1;pointerEvents=0;collapsible=0;recursiveResize=0;shape=mxgraph.aws4.group;grIcon=mxgraph.aws4.group_aws_cloud_alt;strokeColor=#232F3E;fillColor=none;verticalAlign=top;align=left;spacingLeft=30;fontColor=#232F3E;dashed=0;` |
| AWS Cloud (logo) | `sketch=0;outlineConnect=0;gradientColor=none;html=1;whiteSpace=wrap;fontSize=12;fontStyle=0;container=1;pointerEvents=0;collapsible=0;recursiveResize=0;shape=mxgraph.aws4.group;grIcon=mxgraph.aws4.group_aws_cloud;strokeColor=#232F3E;fillColor=none;verticalAlign=top;align=left;spacingLeft=30;fontColor=#232F3E;dashed=0;` |
| Region | `sketch=0;outlineConnect=0;gradientColor=none;html=1;whiteSpace=wrap;fontSize=12;fontStyle=0;container=1;pointerEvents=0;collapsible=0;recursiveResize=0;shape=mxgraph.aws4.group;grIcon=mxgraph.aws4.group_region;strokeColor=#00A4A6;fillColor=none;verticalAlign=top;align=left;spacingLeft=30;fontColor=#147EBA;dashed=1;` |
| Availability Zone | `sketch=0;outlineConnect=0;gradientColor=none;html=1;whiteSpace=wrap;fontSize=12;fontStyle=0;container=1;pointerEvents=0;collapsible=0;recursiveResize=0;shape=mxgraph.aws4.group;grIcon=mxgraph.aws4.group_availability_zone;strokeColor=#545B64;fillColor=none;verticalAlign=top;align=left;spacingLeft=30;fontColor=#545B64;dashed=1;` |
| VPC | `sketch=0;outlineConnect=0;gradientColor=none;html=1;whiteSpace=wrap;fontSize=12;fontStyle=0;container=1;pointerEvents=0;collapsible=0;recursiveResize=0;shape=mxgraph.aws4.group;grIcon=mxgraph.aws4.group_vpc2;strokeColor=#8C4FFF;fillColor=none;verticalAlign=top;align=left;spacingLeft=30;fontColor=#AAB7B8;dashed=0;` |
| Public subnet | `sketch=0;outlineConnect=0;gradientColor=none;html=1;whiteSpace=wrap;fontSize=12;fontStyle=0;container=1;pointerEvents=0;collapsible=0;recursiveResize=0;shape=mxgraph.aws4.group;grIcon=mxgraph.aws4.group_security_group;grStroke=0;strokeColor=#7AA116;fillColor=#F2F6E8;verticalAlign=top;align=left;spacingLeft=30;fontColor=#248814;dashed=0;` |
| Private subnet | `sketch=0;outlineConnect=0;gradientColor=none;html=1;whiteSpace=wrap;fontSize=12;fontStyle=0;container=1;pointerEvents=0;collapsible=0;recursiveResize=0;shape=mxgraph.aws4.group;grIcon=mxgraph.aws4.group_security_group;grStroke=0;strokeColor=#00A4A6;fillColor=#E6F6F7;verticalAlign=top;align=left;spacingLeft=30;fontColor=#147EBA;dashed=0;` |
| Security group | `sketch=0;outlineConnect=0;gradientColor=none;html=1;whiteSpace=wrap;fontSize=12;fontStyle=0;container=1;pointerEvents=0;collapsible=0;recursiveResize=0;shape=mxgraph.aws4.group;grIcon=mxgraph.aws4.group_security_group;strokeColor=#DD3522;fillColor=none;verticalAlign=top;align=left;spacingLeft=30;fontColor=#DD3522;dashed=0;` |
| Auto Scaling group | `sketch=0;outlineConnect=0;gradientColor=none;html=1;whiteSpace=wrap;fontSize=12;fontStyle=0;container=1;pointerEvents=0;collapsible=0;recursiveResize=0;shape=mxgraph.aws4.group;grIcon=mxgraph.aws4.group_auto_scaling_group;strokeColor=#D86613;fillColor=none;verticalAlign=top;align=left;spacingLeft=30;fontColor=#D86613;dashed=1;` |
| Server contents | `sketch=0;outlineConnect=0;gradientColor=none;html=1;whiteSpace=wrap;fontSize=12;fontStyle=0;container=1;pointerEvents=0;collapsible=0;recursiveResize=0;shape=mxgraph.aws4.group;grIcon=mxgraph.aws4.group_on_premise;strokeColor=#7D8998;fillColor=none;verticalAlign=top;align=left;spacingLeft=30;fontColor=#5A6C86;dashed=0;` |
| Corporate data center | `sketch=0;outlineConnect=0;gradientColor=none;html=1;whiteSpace=wrap;fontSize=12;fontStyle=0;container=1;pointerEvents=0;collapsible=0;recursiveResize=0;shape=mxgraph.aws4.group;grIcon=mxgraph.aws4.group_corporate_data_center;strokeColor=#7D8998;fillColor=none;verticalAlign=top;align=left;spacingLeft=30;fontColor=#5A6C86;dashed=0;` |
| EC2 instance contents | `sketch=0;outlineConnect=0;gradientColor=none;html=1;whiteSpace=wrap;fontSize=12;fontStyle=0;container=1;pointerEvents=0;collapsible=0;recursiveResize=0;shape=mxgraph.aws4.group;grIcon=mxgraph.aws4.group_ec2_instance_contents;strokeColor=#D86613;fillColor=none;verticalAlign=top;align=left;spacingLeft=30;fontColor=#D86613;dashed=0;` |
| Spot Fleet | `sketch=0;outlineConnect=0;gradientColor=none;html=1;whiteSpace=wrap;fontSize=12;fontStyle=0;container=1;pointerEvents=0;collapsible=0;recursiveResize=0;shape=mxgraph.aws4.group;grIcon=mxgraph.aws4.group_spot_fleet;strokeColor=#D86613;fillColor=none;verticalAlign=top;align=left;spacingLeft=30;fontColor=#D86613;dashed=0;` |
| AWS account | `sketch=0;outlineConnect=0;gradientColor=none;html=1;whiteSpace=wrap;fontSize=12;fontStyle=0;container=1;pointerEvents=0;collapsible=0;recursiveResize=0;shape=mxgraph.aws4.group;grIcon=mxgraph.aws4.group_account;strokeColor=#CD2264;fillColor=none;verticalAlign=top;align=left;spacingLeft=30;fontColor=#CD2264;dashed=0;` |
| IoT Greengrass Deployment | `sketch=0;outlineConnect=0;gradientColor=none;html=1;whiteSpace=wrap;fontSize=12;fontStyle=0;container=1;pointerEvents=0;collapsible=0;recursiveResize=0;shape=mxgraph.aws4.group;grIcon=mxgraph.aws4.group_iot_greengrass_deployment;strokeColor=#7AA116;fillColor=none;verticalAlign=top;align=left;spacingLeft=30;fontColor=#3F8624;dashed=0;` |
| IoT Greengrass | `sketch=0;outlineConnect=0;gradientColor=none;html=1;whiteSpace=wrap;fontSize=12;fontStyle=0;container=1;pointerEvents=0;collapsible=0;recursiveResize=0;shape=mxgraph.aws4.group;grIcon=mxgraph.aws4.group_iot_greengrass;strokeColor=#7AA116;fillColor=none;verticalAlign=top;align=left;spacingLeft=30;fontColor=#3F8624;dashed=0;` |
| Elastic Beanstalk container | `sketch=0;outlineConnect=0;gradientColor=none;html=1;whiteSpace=wrap;fontSize=12;fontStyle=0;container=1;pointerEvents=0;collapsible=0;recursiveResize=0;shape=mxgraph.aws4.group;grIcon=mxgraph.aws4.group_elastic_beanstalk;strokeColor=#D86613;fillColor=none;verticalAlign=top;align=left;spacingLeft=30;fontColor=#D86613;dashed=0;` |
| Step Functions workflow | `sketch=0;outlineConnect=0;gradientColor=none;html=1;whiteSpace=wrap;fontSize=12;fontStyle=0;container=1;pointerEvents=0;collapsible=0;recursiveResize=0;shape=mxgraph.aws4.group;grIcon=mxgraph.aws4.group_aws_step_functions_workflow;strokeColor=#CD2264;fillColor=none;verticalAlign=top;align=left;spacingLeft=30;fontColor=#CD2264;dashed=0;` |

Region 注記: 中国など AWS ロゴが使用できないリージョンでは AWS Cloud (logo) ではなく AWS Cloud を使う。

Resource icons: get exact styles with `shapesearch.py` (`python3 <this-skill-dir>/scripts/shapesearch.py "aws lambda"`); default size 78×78 — keep it.

## Layout recipe — plan BEFORE writing XML

1. **Pick one main-flow direction** (TB: client top → data bottom is the AWS convention) and keep every main-flow arrow pointing that way.
2. **Write the lane plan as a comment/table first**: columns (x centers, using the pitch constants), rows (y, one per tier), and reserved corridors for cross-cutting edges. Only then assign coordinates.
3. **Multi-AZ**: do NOT mirror the full stack into an AZ that only holds a standby. Give AZ-A the real stack; size AZ-C (and its subnets) to what it actually contains. Two large empty subnet boxes are a layout bug, not "HA notation".
4. Size every container to content + padding constants; never let a child (or a bottom icon's label zone) cross the container border.
5. Edge labels: every labeled edge gets `labelBackgroundColor=#ffffff;`. Nudge labels along the edge (label child geometry `x` in −0.6…0.6) so no two labels and no label+bend collide.

## Minimal correct skeleton (VPC → AZ → subnet → icon)

```xml
<mxCell id="vpc" value="VPC" style="points=[[0,0],[0.25,0],[0.5,0],[0.75,0],[1,0],[1,0.25],[1,0.5],[1,0.75],[1,1],[0.75,1],[0.5,1],[0.25,1],[0,1],[0,0.75],[0,0.5],[0,0.25]];outlineConnect=0;gradientColor=none;html=1;whiteSpace=wrap;fontSize=12;fontStyle=0;container=1;pointerEvents=0;collapsible=0;recursiveResize=0;shape=mxgraph.aws4.group;grIcon=mxgraph.aws4.group_vpc2;strokeColor=#8C4FFF;fillColor=none;verticalAlign=top;align=left;spacingLeft=30;fontColor=#AAB7B8;dashed=0;" vertex="1" parent="1">
  <mxGeometry x="80" y="120" width="560" height="360" as="geometry"/>
</mxCell>
<mxCell id="pub" value="パブリックサブネット" style="points=[[0,0],[0.25,0],[0.5,0],[0.75,0],[1,0],[1,0.25],[1,0.5],[1,0.75],[1,1],[0.75,1],[0.5,1],[0.25,1],[0,1],[0,0.75],[0,0.5],[0,0.25]];outlineConnect=0;gradientColor=none;html=1;whiteSpace=wrap;fontSize=12;fontStyle=0;container=1;pointerEvents=0;collapsible=0;recursiveResize=0;shape=mxgraph.aws4.group;grIcon=mxgraph.aws4.group_security_group;grStroke=0;strokeColor=#7AA116;fillColor=#F2F6E8;verticalAlign=top;align=left;spacingLeft=30;fontColor=#248814;dashed=0;" vertex="1" parent="vpc">
  <mxGeometry x="20" y="40" width="240" height="180" as="geometry"/>
</mxCell>
<!-- child of subnet: y=40 clears the title zone; 78×78 kept; bottom label zone
     (≈20px) still ends ≥30px above the subnet's bottom edge -->
<mxCell id="alb" value="ALB" style="sketch=0;points=[[0,0,0],[0.25,0,0],[0.5,0,0],[0.75,0,0],[1,0,0],[0,1,0],[0.25,1,0],[0.5,1,0],[0.75,1,0],[1,1,0],[0,0.25,0],[0,0.5,0],[0,0.75,0],[1,0.25,0],[1,0.5,0],[1,0.75,0]];outlineConnect=0;fontColor=#232F3E;fillColor=#8C4FFF;strokeColor=#ffffff;dashed=0;verticalLabelPosition=bottom;verticalAlign=top;align=center;html=1;fontSize=12;fontStyle=0;aspect=fixed;shape=mxgraph.aws4.resourceIcon;resIcon=mxgraph.aws4.application_load_balancer;" vertex="1" parent="pub">
  <mxGeometry x="81" y="40" width="78" height="78" as="geometry"/>
</mxCell>
<!-- downward edge: 0.25/1 exit straddles the label instead of striking it -->
<mxCell id="e1" value="HTTPS" style="edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;labelBackgroundColor=#ffffff;exitX=0.25;exitY=1;exitDx=0;exitDy=0;entryX=0.5;entryY=0;entryDx=0;entryDy=0;" edge="1" parent="1" source="alb" target="svc">
  <mxGeometry relative="1" as="geometry"/>
</mxCell>
```

## Pre-export checklist (AWS diagrams)

- `validate.py` reports 0 errors / 0 warnings (it models label zones, container bounds, edge corridors)
- No `exitX=0.5;exitY=1` on any bottom-labeled icon
- Every labeled edge has `labelBackgroundColor`
- No full-size empty containers; every container sized to content + padding
- Cross-cutting hub edges share one corridor and carry at most one label
- resIcon は shapesearch.py（公式索引）で引いたもの。色は style をそのまま使用（改変禁止）
- グループ枠は本ファイルの表から verbatim コピー
