# Draw.io XML authoring

Read this **before writing or editing any `.drawio` XML** — file skeleton, shape/edge rules, containers, typography, title & legend, palette, and layout constants. `validate.py` and `renderlint.py` enforce most of these rules deterministically; writing to them the first time is what keeps the fix cycles short.

## File skeleton

```xml
<?xml version="1.0" encoding="UTF-8"?>
<mxfile host="drawio" version="26.0.0">
  <diagram name="Page-1">
    <mxGraphModel>
      <root>
        <mxCell id="0" />
        <mxCell id="1" parent="0" />
        <!-- user shapes start at id="2" -->
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>
```

**Rules:**
- `id="0"` and `id="1"` are required root cells — never omit them
- User shapes start at `id="2"` and increment sequentially
- All shapes have `parent="1"` (unless inside a container — then use container's id)
- **Document order = paint order (z-order).** A cell paints on top of everything written before it. Write cells in this order: containers → nodes inside them → edges → free-floating text/legend cells last (so text is never buried under a shape or line). Never *rely* on z-order to hide an edge crossing a shape — fix the route; z-order only decides what wins when things legitimately touch. Caution: an edge written before a filled container disappears under its fill
- All text uses `html=1` in style for proper rendering
- **Never use `--` inside XML comments** — it's illegal per XML spec and causes parse errors
- Escape special characters in attribute values: `&amp;`, `&lt;`, `&gt;`, `&quot;`
- **Multi-line text in labels:** use `&#xa;` for line breaks inside `value` attributes (not literal `\n`). Example: `value="Line 1&#xa;Line 2"`

## Shape types (vertex)

| Style keyword | Use for |
|--------------|---------|
| `rounded=0` | plain rectangle (default) |
| `rounded=1` | rounded rectangle — services, modules |
| `ellipse;` | circles/ovals — start/end, databases |
| `rhombus;` | diamond — decision points |
| `shape=mxgraph.aws4.resourceIcon;` | AWS icons |
| `shape=cylinder3;` | cylinder — databases |
| `swimlane;` | group/container with title bar |

For **vendor/branded icons** (AWS/Azure/GCP/Cisco/Kubernetes) and any non-trivial shape, don't guess the `shape=mxgraph.*` name — a wrong name renders as a blank box. Run `python3 <this-skill-dir>/scripts/shapesearch.py "<keywords>"` to get the exact official style + size, or see `references/shapes.md` for the hand-writable cheatsheet. For **AI/LLM brand logos** (OpenAI, Claude, Gemini, …), which draw.io has none of, use `python3 <this-skill-dir>/scripts/aiicons.py "<brand>"`. For **AWS services** specifically, `shapesearch.py` consults the official icon index first (`data/aws-icon-index.json.gz`): querying an official name or short form (`"S3"`, `"IAM"`, `"Bedrock"`) returns the official name, category color and exact style. Use the returned style **unmodified** — `validate.py` errors on recolored icons and non-official group frames.

## Required properties

```xml
<!-- Rectangle / rounded box -->
<mxCell id="2" value="Label" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#dae8fc;strokeColor=#6c8ebf;" vertex="1" parent="1">
  <mxGeometry x="100" y="100" width="160" height="60" as="geometry" />
</mxCell>

<!-- Cylinder (database) -->
<mxCell id="3" value="DB" style="shape=cylinder3;whiteSpace=wrap;html=1;fillColor=#f5f5f5;strokeColor=#666666;fontColor=#333333;" vertex="1" parent="1">
  <mxGeometry x="350" y="100" width="120" height="80" as="geometry" />
</mxCell>

<!-- Diamond (decision) -->
<mxCell id="4" value="Check?" style="rhombus;whiteSpace=wrap;html=1;fillColor=#fff2cc;strokeColor=#d6b656;" vertex="1" parent="1">
  <mxGeometry x="100" y="220" width="160" height="80" as="geometry" />
</mxCell>
```

## Containers and groups

For architecture diagrams with nested elements, use draw.io's parent-child containment — do **not** just place shapes on top of larger shapes.

| Type | Style | When to use |
|------|-------|-------------|
| **Group** (invisible) | `group;pointerEvents=0;` | No visual border needed, container has no connections |
| **Swimlane** (titled) | `swimlane;startSize=30;` | Container needs a visible title bar, or container itself has connections |
| **Custom container** | Add `container=1;pointerEvents=0;` to any shape | Any shape acting as a container without its own connections |

**Key rules:**
- Add `pointerEvents=0;` to container styles that should not capture connections between children
- Children set `parent="containerId"` and use coordinates **relative to the container**
- **Nested title bands stack.** An edge descending through nested containers (e.g. AZ → subnet → group) must clear the title zone of **every** level it enters — reserve ~40px per nesting level from each container's top edge (3 levels ≈ 120px below the outermost top), and route the descent in a margin clear of all title texts. Neither validate.py nor renderlint.py measures container-title strike-through — it's a vision-check item, so get the clearance right in the coordinate plan

**Tint ladder — containers get a background, three levels deep.** A container drawn as a bare wireframe doesn't read as a region; a container filled as strongly as its nodes drowns them. Use three fill strengths, lightest at the back:

1. **Canvas** — white (or the page background).
2. **Container** — the tier hue at ~40% toward white (`containerFill` in the preset palette; e.g. blue tier `#F0F6FE`). Border = the hue's strokeColor; title = same color, `fontSize=14;fontStyle=1;align=left` (top-LEFT — a centered title sits exactly where edges enter centered child nodes and gets struck through).
3. **Node** — the full palette fillColor (`#dae8fc` etc.).

Nested containers alternate: tint → white → tint, so every nesting level stays distinguishable. AWS diagrams are the exception — their group frames are official styles (`references/aws-architecture.md`): subnets already carry official light fills; never invent fills for AWS Cloud/Region/VPC frames.

```xml
<!-- Tier container on the tint ladder: light fill, hue border, top-left bold title -->
<mxCell id="tier1" value="Service Tier" style="rounded=0;whiteSpace=wrap;html=1;fillColor=#F0F6FE;strokeColor=#6c8ebf;fontColor=#6c8ebf;verticalAlign=top;align=left;spacingLeft=8;fontStyle=1;fontSize=14;container=1;pointerEvents=0;" vertex="1" parent="1">
  <mxGeometry x="80" y="120" width="400" height="220" as="geometry"/>
</mxCell>
```

```xml
<!-- Swimlane container -->
<mxCell id="svc1" value="User Service" style="swimlane;startSize=30;fillColor=#dae8fc;strokeColor=#6c8ebf;" vertex="1" parent="1">
  <mxGeometry x="100" y="100" width="300" height="200" as="geometry"/>
</mxCell>
<!-- Child inside container — coordinates relative to parent -->
<mxCell id="api1" value="REST API" style="rounded=1;whiteSpace=wrap;html=1;" vertex="1" parent="svc1">
  <mxGeometry x="20" y="40" width="120" height="60" as="geometry"/>
</mxCell>
<mxCell id="db1" value="Database" style="shape=cylinder3;whiteSpace=wrap;html=1;" vertex="1" parent="svc1">
  <mxGeometry x="160" y="40" width="120" height="60" as="geometry"/>
</mxCell>
```

## Connector (edge)

**CRITICAL:** Every edge `mxCell` must contain a `<mxGeometry relative="1" as="geometry" />` child element. Self-closing edge cells (`<mxCell ... edge="1" ... />`) are **invalid** and will not render. Always use the expanded form.

```xml
<!-- Directed arrow — always include rounded, orthogonalLoop, jettySize for clean routing -->
<mxCell id="10" value="" style="edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;" edge="1" parent="1" source="2" target="3">
  <mxGeometry relative="1" as="geometry" />
</mxCell>

<!-- Arrow with label + explicit entry/exit points to control direction.
     Labeled edges always carry the demoted label style + background. -->
<mxCell id="11" value="HTTP/REST" style="edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;fontSize=10;fontColor=#595959;labelBackgroundColor=#ffffff;exitX=0.5;exitY=1;exitDx=0;exitDy=0;entryX=0.5;entryY=0;entryDx=0;entryDy=0;" edge="1" parent="1" source="2" target="4">
  <mxGeometry relative="1" as="geometry" />
</mxCell>

<!-- Arrow with waypoints — use when edge must route around other shapes -->
<mxCell id="12" value="" style="edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;" edge="1" parent="1" source="3" target="5">
  <mxGeometry relative="1" as="geometry">
    <Array as="points">
      <mxPoint x="500" y="50" />
    </Array>
  </mxGeometry>
</mxCell>
```

**Edge style rules:**
- **Every labeled edge gets `labelBackgroundColor=#ffffff;`** (match the canvas color if not white). Without it the text is struck through by its own line and becomes unreadable wherever it crosses another edge or shape — the single most common readability bug. When two edge labels sit close, also shift one along its edge (label child geometry `x` in −0.6…0.6).
- **Every labeled edge also gets the demoted label style `fontSize=10;fontColor=#595959;`** — see "Typography & spacing". Edge text must recede behind node text.
- **Moving an edge label off a congested spot:** run `renderlint.py --fix` first — it searches the rendered route for a clear slot and slides the label itself. Hand-edit only if it prints `advice: no clear slot`. Mechanics, for that case: the label is either the edge's own `value` or a child `mxCell` with `<mxGeometry relative="1">`. In that geometry, `x` is the position **along** the edge (−1 = source end, 0 = middle, 1 = target end), `y` is the **perpendicular** distance from the edge in px, and an optional `<mxPoint as="offset">` child adds a fixed pixel shift on top. If no position on the edge is clear (dense corridor), drop the inline label and let the legend carry the semantic.
- **Animated connectors:** add `flowAnimation=1;` to any edge style to show a moving dot animation along the arrow. Works in SVG export and draw.io desktop — ideal for data-flow and pipeline diagrams. Example: `style="edgeStyle=orthogonalEdgeStyle;flowAnimation=1;rounded=1;..."`
- **Always** include `rounded=1;orthogonalLoop=1;jettySize=auto` — these enable smart routing that avoids overlaps
- Pin `exitX/exitY/entryX/entryY` on every edge when a node has 2+ connections — distributes lines across the shape perimeter
- **Bottom-labeled shapes (all AWS/Azure/GCP icons): a bottom exit is only safe OUTSIDE the label span — which usually means don't use one.** The label is centered *under* the icon and often wider than it (`API Gateway` ≈ 77px under a 78px icon), so `exitX=0.25/0.75` strikes the text just like `0.5` does. Estimate the span first (ASCII ≈ 0.6×fontSize, CJK ≈ fontSize px/char): if the label exceeds ~half the icon width — true for most real service names — **use a side port** (`exitX=0/1;exitY=0.5`) and route down beside the icon. Bottom exits are for short labels (≤5 ASCII / ≤3 CJK chars) only. Entering the top (`entryY=0`) is always safe. **Leaving the edge unpinned does not avoid this** — when the two icons sit in a column, draw.io's router picks bottom-center on its own and strikes the label anyway; pin a side port explicitly. `validate.py` checks bottom ports against the estimated span (pinned ones, plus the bottom-center port it infers for an unpinned edge to a node directly below); `renderlint.py` verifies the rendered route. See `references/aws-architecture.md`.
- Add `<Array as="points">` waypoints when an edge must detour around an intermediate shape
- **Leave room for arrowheads:** the last bend must sit ≥20px from the target shape. If closer, the arrowhead overlaps the bend and looks broken. Fix by increasing node spacing or adding explicit waypoints. (Both gates enforce the same 20px rule: `validate.py` on the model-space waypoint→entry distance, `renderlint.py` on the rendered path — trailing straight run + arrowhead gap to the node border)

## Distributing connections on a shape

When multiple edges connect to the same shape, assign different entry/exit points to prevent stacking:

| Position | exitX/entryX | exitY/entryY | Use when |
|----------|-------------|-------------|----------|
| Top center | 0.5 | 0 | connecting to node above |
| Top-left | 0.25 | 0 | 2nd connection from top |
| Top-right | 0.75 | 0 | 3rd connection from top |
| Right center | 1 | 0.5 | connecting to node on right |
| Bottom center | 0.5 | 1 | connecting to node below |
| Left center | 0 | 0.5 | connecting to node on left |

**Rule:** if a shape has N connections on one side, space them evenly (e.g., 3 connections on bottom → exitX = 0.25, 0.5, 0.75)

## Color palette (fillColor / strokeColor)

*Used only when no preset is active (`references/style-presets.md` → "Applying a preset").*

| Color name | fillColor | strokeColor | Use for |
|-----------|-----------|-------------|---------|
| Blue | `#dae8fc` | `#6c8ebf` | services, clients |
| Green | `#d5e8d4` | `#82b366` | success, databases |
| Yellow | `#fff2cc` | `#d6b656` | queues, decisions |
| Orange | `#ffe6cc` | `#d79b00` | gateways, APIs |
| Red/Pink | `#f8cecc` | `#b85450` | errors, alerts |
| Grey | `#f5f5f5` | `#666666` | external/neutral |
| Purple | `#e1d5e7` | `#9673a6` | security, auth |

## Typography & spacing

Flat, same-size text everywhere is the single biggest "amateur diagram" tell. Build a size hierarchy anchored on the node label, and give text room to breathe.

**Size hierarchy — node labels are the anchor (fontSize 12); every other role is derived:**

| Text role | style keys | Notes |
|---|---|---|
| Diagram title | `fontSize=20;fontStyle=1;fontColor=#333333` | One per diagram, top-left. See "Title & legend" |
| Container / group title | `fontSize=14;fontStyle=1` + the container's strokeColor as fontColor | AWS group frames keep their official fontColor/12 — don't restyle those |
| Node label | `fontSize=12` | The anchor. Never mix two node-label sizes in the same tier |
| Edge label | `fontSize=10;fontColor=#595959;labelBackgroundColor=#ffffff` | **Always demoted**: smaller AND grayer than node labels, so line text recedes behind box text |
| Annotation / legend body | `fontSize=10;fontStyle=2;fontColor=#808080` | Italic gray — clearly not part of the system |

At most 3 sizes should be visible below the title (14 / 12 / 10). An edge label at node size shouts; a container title at node size disappears.

**Inner padding — text must never touch a border.** draw.io's default label padding (~2px) makes boxed labels — especially CJK — look cramped. On every box-shaped node with an inside label, add `spacing=6` (8 for CJK-heavy diagrams) to the style. Size shapes text-first: estimated label width (CJK ≈ fontSize px/char, ASCII ≈ 0.6×fontSize) + 2×spacing + ≥8px slack → that's the minimum width. `validate.py` reads `spacing`/`spacingLeft`/`spacingRight`/`spacingTop`/`spacingBottom` when checking label fit, and emits a `note:` when text merely *nearly* touches the border.

**CJK-safe font stack.** A bare `fontFamily=Helvetica` renders Japanese through an environment-dependent fallback (inconsistent metrics, cramped glyphs). Pin the stack — commas are legal inside a style value (only `;` and `=` are reserved):

```
fontFamily=Helvetica Neue, Helvetica, Hiragino Sans, Yu Gothic UI, Meiryo, Noto Sans CJK JP, sans-serif;
```

The built-in presets ship this stack (corporate leads with Arial). Keep one fontFamily per diagram.

**Line breaks.** HTML labels render at a fixed line-height of 1.2 — control density with `&#xa;` breaks, not spacing hacks. Keep labels ≤2 lines on icons, ≤3 lines in boxes.

## Title & legend

A finished architecture diagram carries a title and, when it uses more than one line semantic, a legend. Add both by default for architecture/system diagrams (skip for trivial flowcharts or when the user provides their own caption).

**Title** — top-left, aligned with the content's left edge, ~70px reserved above the topmost shape. Optional subtitle line for date/version:

```xml
<mxCell id="title" value="注文処理システム 全体構成" style="text;html=1;align=left;verticalAlign=middle;fontSize=20;fontStyle=1;fontColor=#333333;" vertex="1" parent="1">
  <mxGeometry x="40" y="20" width="480" height="30" as="geometry"/>
</mxCell>
<mxCell id="subtitle" value="2026-07-25 · v1.0" style="text;html=1;align=left;verticalAlign=middle;fontSize=10;fontStyle=2;fontColor=#808080;" vertex="1" parent="1">
  <mxGeometry x="40" y="54" width="480" height="16" as="geometry"/>
</mxCell>
```

**Arrow semantics — encode meaning in line style, never in color alone:**

| Meaning | Edge style additions |
|---|---|
| Sync call / primary flow | solid, `endArrow=classic;endFill=1;` (AWS diagrams: `endArrow=open;endFill=0;strokeWidth=2;`) |
| Async / event / queue | `dashed=1;endArrow=open;endFill=0;` |
| Cross-cutting (logs, metrics, monitoring) | `dashed=1;strokeColor=#7F7F7F;` — one shared corridor, one label |
| Optional / fallback | `dashed=1;dashPattern=1 4;` (dotted) |

Keep it to ≤3 line semantics per diagram; more than that means the diagram is trying to say too much.

**Legend** — a small bordered box in a margin corner (top-right or bottom-right, clear of all routes), listing **only the semantics the diagram actually uses**. Sample lines are edges with absolute `sourcePoint`/`targetPoint` (no nodes needed); write legend cells last in document order so they paint on top:

```xml
<mxCell id="legend" value="凡例" style="rounded=0;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#999999;verticalAlign=top;align=left;spacingLeft=8;fontStyle=1;fontSize=12;container=1;pointerEvents=0;" vertex="1" parent="1">
  <mxGeometry x="900" y="40" width="200" height="100" as="geometry"/>
</mxCell>
<mxCell id="lg1" style="endArrow=classic;endFill=1;html=1;" edge="1" parent="legend">
  <mxGeometry relative="1" as="geometry">
    <mxPoint x="12" y="42" as="sourcePoint"/>
    <mxPoint x="52" y="42" as="targetPoint"/>
  </mxGeometry>
</mxCell>
<mxCell id="lg1t" value="同期呼び出し" style="text;html=1;align=left;verticalAlign=middle;fontSize=10;fontColor=#333333;" vertex="1" parent="legend">
  <mxGeometry x="60" y="30" width="130" height="24" as="geometry"/>
</mxCell>
<mxCell id="lg2" style="dashed=1;endArrow=open;endFill=0;html=1;" edge="1" parent="legend">
  <mxGeometry relative="1" as="geometry">
    <mxPoint x="12" y="72" as="sourcePoint"/>
    <mxPoint x="52" y="72" as="targetPoint"/>
  </mxGeometry>
</mxCell>
<mxCell id="lg2t" value="非同期 / イベント" style="text;html=1;align=left;verticalAlign=middle;fontSize=10;fontColor=#333333;" vertex="1" parent="legend">
  <mxGeometry x="60" y="60" width="130" height="24" as="geometry"/>
</mxCell>
```

Size the legend box to its rows (~30px per row + 30px title zone); it goes through the same validate/renderlint gates as everything else.

## Layout tips

**Spacing — scale with complexity:**

| Diagram complexity | Nodes | Horizontal gap | Vertical gap |
|-------------------|-------|----------------|--------------|
| Simple | ≤5 | 200px | 150px |
| Medium | 6–10 | 280px | 200px |
| Complex | >10 | 350px | 250px |

**Label zones — size shapes from the text, not the text from the shape:**
- Estimate label width first: fullwidth (CJK) char ≈ fontSize px, ASCII ≈ 0.6×fontSize (at fontSize 12: 「注文処理サービス」≈ 96px, `API Gateway` ≈ 79px). Inside a box with `whiteSpace=wrap`, the shape must be wide/tall enough for the wrapped lines (≈16px per line at fontSize 12) — otherwise the text clips.
- Shapes with `verticalLabelPosition=bottom` (every AWS/Azure/GCP icon) paint the label **below and outside** the geometry box, and the label can be **wider than the shape**. Reserve ~20px per label line below the icon in ALL spacing decisions: row pitch, container bottom padding, and edge routes. `validate.py` models these zones — trust its warnings.
- Row pitch for icon grids: ≥160px top-to-top; column pitch ≥200px center-to-center (more for long CJK labels, or wrap with `&#xa;`). Full constants: `references/aws-architecture.md`.

**Routing corridors:** between shape rows/columns, leave an extra ~80px empty corridor where edges can route without crossing shapes. Never place a shape in a gap that edges need to traverse. Cross-cutting hub edges (all services → CloudWatch/monitoring) get **one** reserved corridor outside the main flow, dashed gray, labeled once — N separately-routed labeled lines to the same hub read as noise.

**Grid alignment:** snap all `x`, `y`, `width`, `height` values to **multiples of 10** — this ensures shapes align cleanly on draw.io's default grid and makes manual editing easier.

**General rules:**
- Plan a grid before assigning x/y coordinates — sketch node positions on paper/mentally first
- Group related nodes in the same horizontal or vertical band
- Use `swimlane` cells for logical grouping with visible borders
- Place heavily-connected "hub" nodes centrally so edges radiate outward instead of crossing
- To force straight vertical connections, pin entry/exit points explicitly on edges:
  `exitX=0.5;exitY=1;exitDx=0;exitDy=0;entryX=0.5;entryY=0;entryDx=0;entryDy=0`
- Always center-align a child node under its parent (same center x) to avoid diagonal routing
- **Event bus pattern**: place Kafka/bus nodes in the **center of the service row**, not below — services on either side can reach it with short horizontal arrows (`exitX=1` left side, `exitX=0` right side), eliminating all line crossings
- Horizontal connections (`exitX=1` or `exitX=0`) never cross vertical nodes in the same row; use them for peer-to-peer and publish connections

**Avoiding edge-shape overlap:**
- Before finalizing coordinates, trace each edge path mentally — if it must cross an unrelated shape, either move the shape or add waypoints
- For tree/hierarchical layouts: assign nodes to layers (rows), connect only between adjacent layers to minimize crossings
- For star/hub layouts: place the hub center, satellites around it — edges stay short and radial
- When an edge must span multiple rows/columns, route it along the outer corridor, not through the middle of the diagram
