# Generic Tables (comparison / matrix / feature grid)

Read this when the deliverable includes a **table that is not an ERD entity**: a comparison matrix, feature/support grid, RACI chart, decision matrix, or a small reference table embedded in an architecture diagram. (ERD entities keep using the ERD preset in `references/diagram-types.md`.)

**When NOT to build a table in draw.io:** if the user wants a table as a *document* (Markdown/HTML deliverable), write Markdown — a `.drawio` table is only worth it when it must live inside a diagram or ship as a diagram image. For data **charts** (bar/line/pie), do not use draw.io at all — see "When to use / when NOT to use" in SKILL.md.

## Structure — three nested layers

draw.io tables are containers with `childLayout=tableLayout`: **table → rows → cells**. The layout engine keeps geometry consistent, so widths/heights only need to be right at creation.

| Layer | style | Geometry rules |
|---|---|---|
| Table | `shape=table;startSize=0;container=1;collapsible=0;childLayout=tableLayout;html=1;whiteSpace=wrap;fillColor=none;strokeColor=#6c8ebf;` | width = Σ column widths, height = Σ row heights. `startSize=30` + a `value` adds a title bar (then height += 30) |
| Row | `shape=tableRow;horizontal=0;startSize=0;swimlaneHead=0;swimlaneBody=0;fillColor=none;collapsible=0;dropTarget=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;html=1;` | child of table; `x=0`, `y` = cumulative, width = table width, height = row height (30 default, 36+ for 2-line cells) |
| Cell | `shape=partialRectangle;html=1;whiteSpace=wrap;connectable=0;overflow=hidden;fillColor=none;top=0;left=0;bottom=0;right=0;spacing=6;` | child of its row; `y=0`, `x` = cumulative, height = row height |

## Sizing — columns from content, not the other way round

Column width = widest cell text (CJK ≈ fontSize px/char, ASCII ≈ 0.6×fontSize) + 2×spacing + 8px slack, snapped up to a multiple of 10. Rows: 30px for 1-line cells (fontSize 12), 44px for 2-line. `validate.py` checks cell label fit like any other shape — trust its warnings.

## Styling rules

- **Header row**: cells get `fillColor` = the diagram's tier color (e.g. `#dae8fc`) + `fontStyle=1`. Use `fillColor` on the header *cells*, not the row (row fill stays `none`).
- **Zebra striping** (tables ≥5 data rows): alternate data-row cell fills `none` / `#F5F7FA` (or the palette's neutral `containerFill`). Skip zebra for short tables — it's noise.
- **Alignment**: text left (`align=left`), numbers right (`align=right`), status marks center. Set per cell.
- **Typography**: cells fontSize 12 (or 11 in dense grids), header = same size bold — the hierarchy comes from weight and fill, not size.
- **First column** as row header (RACI, feature matrix): `fontStyle=1` + the same fill as the header row.
- Yes/no marks: `◯` / `—` (or `✓` / `✗`) as cell text — don't embed icons in table cells.

## Worked example — 3-column comparison, header + zebra

```xml
<mxCell id="tbl" value="" style="shape=table;startSize=0;container=1;collapsible=0;childLayout=tableLayout;html=1;whiteSpace=wrap;fillColor=none;strokeColor=#6c8ebf;" vertex="1" parent="1">
  <mxGeometry x="40" y="40" width="420" height="120" as="geometry"/>
</mxCell>
<!-- header row -->
<mxCell id="r0" style="shape=tableRow;horizontal=0;startSize=0;swimlaneHead=0;swimlaneBody=0;fillColor=none;collapsible=0;dropTarget=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;html=1;" vertex="1" parent="tbl">
  <mxGeometry x="0" y="0" width="420" height="30" as="geometry"/>
</mxCell>
<mxCell id="r0c1" value="方式" style="shape=partialRectangle;html=1;whiteSpace=wrap;connectable=0;overflow=hidden;fillColor=#dae8fc;fontStyle=1;align=left;spacing=6;top=0;left=0;bottom=0;right=0;" vertex="1" parent="r0">
  <mxGeometry x="0" y="0" width="140" height="30" as="geometry"/>
</mxCell>
<mxCell id="r0c2" value="レイテンシ" style="shape=partialRectangle;html=1;whiteSpace=wrap;connectable=0;overflow=hidden;fillColor=#dae8fc;fontStyle=1;align=right;spacing=6;top=0;left=0;bottom=0;right=0;" vertex="1" parent="r0">
  <mxGeometry x="140" y="0" width="140" height="30" as="geometry"/>
</mxCell>
<mxCell id="r0c3" value="運用コスト" style="shape=partialRectangle;html=1;whiteSpace=wrap;connectable=0;overflow=hidden;fillColor=#dae8fc;fontStyle=1;align=right;spacing=6;top=0;left=0;bottom=0;right=0;" vertex="1" parent="r0">
  <mxGeometry x="280" y="0" width="140" height="30" as="geometry"/>
</mxCell>
<!-- data row 1 -->
<mxCell id="r1" style="shape=tableRow;horizontal=0;startSize=0;swimlaneHead=0;swimlaneBody=0;fillColor=none;collapsible=0;dropTarget=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;html=1;" vertex="1" parent="tbl">
  <mxGeometry x="0" y="30" width="420" height="30" as="geometry"/>
</mxCell>
<mxCell id="r1c1" value="ポーリング" style="shape=partialRectangle;html=1;whiteSpace=wrap;connectable=0;overflow=hidden;fillColor=none;align=left;spacing=6;top=0;left=0;bottom=0;right=0;" vertex="1" parent="r1">
  <mxGeometry x="0" y="0" width="140" height="30" as="geometry"/>
</mxCell>
<mxCell id="r1c2" value="高" style="shape=partialRectangle;html=1;whiteSpace=wrap;connectable=0;overflow=hidden;fillColor=none;align=right;spacing=6;top=0;left=0;bottom=0;right=0;" vertex="1" parent="r1">
  <mxGeometry x="140" y="0" width="140" height="30" as="geometry"/>
</mxCell>
<mxCell id="r1c3" value="低" style="shape=partialRectangle;html=1;whiteSpace=wrap;connectable=0;overflow=hidden;fillColor=none;align=right;spacing=6;top=0;left=0;bottom=0;right=0;" vertex="1" parent="r1">
  <mxGeometry x="280" y="0" width="140" height="30" as="geometry"/>
</mxCell>
<!-- data row 2 (zebra) -->
<mxCell id="r2" style="shape=tableRow;horizontal=0;startSize=0;swimlaneHead=0;swimlaneBody=0;fillColor=none;collapsible=0;dropTarget=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;html=1;" vertex="1" parent="tbl">
  <mxGeometry x="0" y="60" width="420" height="30" as="geometry"/>
</mxCell>
<mxCell id="r2c1" value="Webhook" style="shape=partialRectangle;html=1;whiteSpace=wrap;connectable=0;overflow=hidden;fillColor=#F5F7FA;align=left;spacing=6;top=0;left=0;bottom=0;right=0;" vertex="1" parent="r2">
  <mxGeometry x="0" y="0" width="140" height="30" as="geometry"/>
</mxCell>
<mxCell id="r2c2" value="低" style="shape=partialRectangle;html=1;whiteSpace=wrap;connectable=0;overflow=hidden;fillColor=#F5F7FA;align=right;spacing=6;top=0;left=0;bottom=0;right=0;" vertex="1" parent="r2">
  <mxGeometry x="140" y="0" width="140" height="30" as="geometry"/>
</mxCell>
<mxCell id="r2c3" value="中" style="shape=partialRectangle;html=1;whiteSpace=wrap;connectable=0;overflow=hidden;fillColor=#F5F7FA;align=right;spacing=6;top=0;left=0;bottom=0;right=0;" vertex="1" parent="r2">
  <mxGeometry x="280" y="0" width="140" height="30" as="geometry"/>
</mxCell>
<!-- data row 3 -->
<mxCell id="r3" style="shape=tableRow;horizontal=0;startSize=0;swimlaneHead=0;swimlaneBody=0;fillColor=none;collapsible=0;dropTarget=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;html=1;" vertex="1" parent="tbl">
  <mxGeometry x="0" y="90" width="420" height="30" as="geometry"/>
</mxCell>
<mxCell id="r3c1" value="ストリーミング" style="shape=partialRectangle;html=1;whiteSpace=wrap;connectable=0;overflow=hidden;fillColor=none;align=left;spacing=6;top=0;left=0;bottom=0;right=0;" vertex="1" parent="r3">
  <mxGeometry x="0" y="0" width="140" height="30" as="geometry"/>
</mxCell>
<mxCell id="r3c2" value="最小" style="shape=partialRectangle;html=1;whiteSpace=wrap;connectable=0;overflow=hidden;fillColor=none;align=right;spacing=6;top=0;left=0;bottom=0;right=0;" vertex="1" parent="r3">
  <mxGeometry x="140" y="0" width="140" height="30" as="geometry"/>
</mxCell>
<mxCell id="r3c3" value="高" style="shape=partialRectangle;html=1;whiteSpace=wrap;connectable=0;overflow=hidden;fillColor=none;align=right;spacing=6;top=0;left=0;bottom=0;right=0;" vertex="1" parent="r3">
  <mxGeometry x="280" y="0" width="140" height="30" as="geometry"/>
</mxCell>
```

## Embedding a table in an architecture diagram

- Treat the whole table as one node for spacing: reserve the normal node pitch around its outer geometry.
- Edges connect to the **table** container, not to rows/cells (`connectable=0` on cells enforces this).
- Keep embedded tables small (≤5×5); anything larger deserves its own page (`<diagram>`) or a Markdown deliverable instead.
