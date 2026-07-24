#!/usr/bin/env python3
"""Post-render lint: check the ACTUAL rendered geometry of a .drawio diagram.

validate.py lints the model XML before export, but the real edge routes are
computed by draw.io's router at render time — an orthogonal edge with
jettySize=auto and no waypoints can detour, stack, or cross in ways the model
never shows. This script closes that gap: it parses the SVG export (which
contains the final routed paths, measured label boxes, and data-cell-id
markers) and reports what the diagram ACTUALLY looks like.

Checks (on real rendered geometry):
  warnings — fix these:
    - edge routed through an unrelated node
    - edge passing through a text label (the "line strikes through text" bug;
      external AWS-style labels and edge labels have tight measured boxes)
    - two edges overlapping collinearly (stacked segments — reads as one line)
    - two labels overlapping (measured, not estimated)
    - a label overlapping an unrelated node
    - final edge segment before the arrowhead shorter than 20px (arrowhead
      lands on a bend and looks broken)
  info — minimize, but sometimes unavoidable:
    - edge-edge crossings (count per pair; a planar layout is not always
      possible — reduce by moving nodes / reserving corridors)

Usage:
  python3 renderlint.py diagram.drawio                 # auto-exports SVG via CLI
  python3 renderlint.py diagram.drawio --svg out.svg   # lint a pre-exported SVG

The auto-export resolves the binary like SKILL.md step 1 (drawio, draw.io,
macOS .app path; override with $DRAWIO_BIN) and runs `-x -f svg` WITHOUT -e or
scale flags — the SVG must be exported at scale 1 for stable thresholds.

Exit status: non-zero on errors (unparseable input) or, with --strict, on any
warning. Info lines never fail the run.

Known limits: crossings within 12px of an edge endpoint are skipped (edges
legitimately converge at shared ports); wrapped in-node labels are covered by
the node-hit check, not the label-hit check (their rendered box spans the full
node width).
"""
import argparse
import math
import os
import re
import shutil
import subprocess
import sys
import tempfile
import xml.etree.ElementTree as ET

EPS = 1.0            # px tolerance for touch-vs-overlap
NODE_SHRINK = 2.0    # shrink node boxes so border tangency doesn't count
LABEL_SHRINK = 1.0
ENDPOINT_SKIP = 12.0  # crossings this close to an edge endpoint = shared port
STACK_TOL = 1.5      # max lateral distance for "collinear" segments
STACK_MIN = 24.0     # min shared length before stacking is reported
ARROW_MIN = 20.0     # min final-segment length before the arrowhead
CURVE_SAMPLES = (0.25, 0.5, 0.75)

MACOS_APP = "/Applications/draw.io.app/Contents/MacOS/draw.io"


# ---------- model (.drawio) ----------

def parse_model(path):
    """Map cell id -> {parent, source, target, edge, vertex} from the .drawio."""
    tree = ET.parse(path)
    root = tree.getroot()
    parent_of = {ch: p for p in root.iter() for ch in p}
    cells = {}
    for c in root.iter("mxCell"):
        cid = c.get("id")
        if cid is None:                            # <object>/<UserObject> wrapper
            cid = parent_of.get(c, root).get("id") if parent_of.get(c) is not None else None
        if cid is None:
            continue
        cells[cid] = {
            "parent": c.get("parent"),
            "source": c.get("source"),
            "target": c.get("target"),
            "edge": c.get("edge") == "1",
            "vertex": c.get("vertex") == "1",
        }
    return cells


def ancestors(cid, cells):
    seen = set()
    cur = cells.get(cid, {}).get("parent")
    while cur is not None and cur not in seen:
        seen.add(cur)
        cur = cells.get(cur, {}).get("parent")
    return seen


# ---------- svg parsing ----------

def tag(el):
    return el.tag.rsplit("}", 1)[-1]


def parse_transform(s):
    """(dx, dy, scale) from a translate/scale-only transform string."""
    dx = dy = 0.0
    sc = 1.0
    for name, args in re.findall(r"(translate|scale|matrix)\(([^)]*)\)", s or ""):
        nums = [float(v) for v in re.split(r"[,\s]+", args.strip()) if v]
        if name == "translate":
            dx += nums[0] * sc
            dy += (nums[1] if len(nums) > 1 else 0.0) * sc
        elif name == "scale":
            sc *= nums[0]
        elif name == "matrix" and len(nums) == 6:
            sc *= nums[0]
            dx += nums[4]
            dy += nums[5]
    return dx, dy, sc


def path_points(d):
    """Flatten a path `d` into a polyline (absolute M/L/Q/C/H/V/Z; relative ok)."""
    toks = re.findall(r"[MmLlQqCcHhVvZzAa]|-?\d*\.?\d+(?:e-?\d+)?", d or "")
    pts, cur, start = [], (0.0, 0.0), (0.0, 0.0)
    i, cmd = 0, None

    def num(k):
        return float(toks[k])
    while i < len(toks):
        t = toks[i]
        if t.isalpha() or t in "Aa":
            cmd = t
            i += 1
            if cmd in "Zz":
                if start != cur:
                    pts.append(start)
                    cur = start
            continue
        rel = cmd.islower()
        c = cmd.upper()
        if c == "M":
            x, y = num(i), num(i + 1)
            i += 2
            cur = (cur[0] + x, cur[1] + y) if rel else (x, y)
            start = cur
            pts.append(cur)
            cmd = "l" if rel else "L"
        elif c == "L":
            x, y = num(i), num(i + 1)
            i += 2
            cur = (cur[0] + x, cur[1] + y) if rel else (x, y)
            pts.append(cur)
        elif c == "H":
            x = num(i)
            i += 1
            cur = (cur[0] + x if rel else x, cur[1])
            pts.append(cur)
        elif c == "V":
            y = num(i)
            i += 1
            cur = (cur[0], cur[1] + y if rel else y)
            pts.append(cur)
        elif c == "Q":
            cx, cy, x, y = (num(i + k) for k in range(4))
            i += 4
            if rel:
                cx, cy, x, y = cur[0] + cx, cur[1] + cy, cur[0] + x, cur[1] + y
            for t_ in CURVE_SAMPLES:
                mt = 1 - t_
                pts.append((mt * mt * cur[0] + 2 * mt * t_ * cx + t_ * t_ * x,
                            mt * mt * cur[1] + 2 * mt * t_ * cy + t_ * t_ * y))
            cur = (x, y)
            pts.append(cur)
        elif c == "C":
            c1x, c1y, c2x, c2y, x, y = (num(i + k) for k in range(6))
            i += 6
            if rel:
                c1x, c1y, c2x, c2y, x, y = (cur[0] + c1x, cur[1] + c1y,
                                            cur[0] + c2x, cur[1] + c2y,
                                            cur[0] + x, cur[1] + y)
            for t_ in CURVE_SAMPLES:
                mt = 1 - t_
                pts.append((mt ** 3 * cur[0] + 3 * mt * mt * t_ * c1x +
                            3 * mt * t_ * t_ * c2x + t_ ** 3 * x,
                            mt ** 3 * cur[1] + 3 * mt * mt * t_ * c1y +
                            3 * mt * t_ * t_ * c2y + t_ ** 3 * y))
            cur = (x, y)
            pts.append(cur)
        elif c == "A":                                  # arc: keep endpoint only
            x, y = num(i + 5), num(i + 6)
            i += 7
            cur = (cur[0] + x, cur[1] + y) if rel else (x, y)
            pts.append(cur)
        else:
            i += 1
    return pts


class SvgCell:
    __slots__ = ("cid", "polylines", "bbox", "labels", "is_leaf")

    def __init__(self, cid):
        self.cid = cid
        self.polylines = []   # fill="none" stroked paths (edge routes)
        self.bbox = None      # union bbox of shape geometry (vertices)
        self.labels = []      # (bbox, nowrap, has_bg)
        self.is_leaf = True


def grow(bbox, xs, ys):
    if not xs:
        return bbox
    x0, y0, x1, y1 = min(xs), min(ys), max(xs), max(ys)
    if bbox is None:
        return [x0, y0, x1, y1]
    return [min(bbox[0], x0), min(bbox[1], y0), max(bbox[2], x1), max(bbox[3], y1)]


def parse_svg(path):
    """Walk the SVG; return {cell id: SvgCell} using data-cell-id markers."""
    root = ET.parse(path).getroot()
    out = {}

    def walk(el, cell, dx, dy, sc, in_switch):
        t = tag(el)
        if t == "g":
            cid = el.get("data-cell-id")
            tdx, tdy, tsc = parse_transform(el.get("transform"))
            ndx, ndy, nsc = dx + tdx * sc, dy + tdy * sc, sc * tsc
            if cid is not None and cid not in ("0", "1"):
                if cell is not None:
                    cell.is_leaf = False
                nxt = out.setdefault(cid, SvgCell(cid))
                for ch in el:
                    walk(ch, nxt, ndx, ndy, nsc, in_switch)
                return
            for ch in el:
                walk(ch, cell, ndx, ndy, nsc, in_switch)
            return
        if cell is None:
            for ch in el:                          # descend through <svg> etc.
                walk(ch, None, dx, dy, sc, in_switch)
            return
        if t == "switch":
            # label subtree: use the <image> fallback (measured box) + html style
            img = None
            for sub in el.iter():
                if tag(sub) == "image" and img is None:
                    img = sub
            html = ET.tostring(el, encoding="unicode")
            nowrap = "nowrap" in html
            has_bg = "background-color" in html
            if img is not None:
                try:
                    x = float(img.get("x", "0")) * sc + dx
                    y = float(img.get("y", "0")) * sc + dy
                    w = float(img.get("width", "0")) * sc
                    h = float(img.get("height", "0")) * sc
                    cell.labels.append(((x, y, x + w, y + h), nowrap, has_bg))
                except ValueError:
                    pass
            return
        if t == "path":
            pts = [(x * sc + dx, y * sc + dy) for x, y in path_points(el.get("d"))]
            if el.get("fill") == "none" and el.get("stroke") not in (None, "none"):
                if len(pts) >= 2:
                    cell.polylines.append(pts)
            xs, ys = [p[0] for p in pts], [p[1] for p in pts]
            cell.bbox = grow(cell.bbox, xs, ys)
            return
        geo = None
        if t in ("rect", "image"):
            try:
                x = float(el.get("x", "0"))
                y = float(el.get("y", "0"))
                geo = (x, y, x + float(el.get("width", "0")),
                       y + float(el.get("height", "0")))
            except ValueError:
                pass
        elif t == "ellipse":
            try:
                cx, cy = float(el.get("cx", "0")), float(el.get("cy", "0"))
                rx, ry = float(el.get("rx", "0")), float(el.get("ry", "0"))
                geo = (cx - rx, cy - ry, cx + rx, cy + ry)
            except ValueError:
                pass
        if geo:
            x0, y0, x1, y1 = geo
            cell.bbox = grow(cell.bbox, [x0 * sc + dx, x1 * sc + dx],
                             [y0 * sc + dy, y1 * sc + dy])
        for ch in el:
            walk(ch, cell, dx, dy, sc, in_switch)

    walk(root, None, 0.0, 0.0, 1.0, False)
    return out


# ---------- geometry ----------

def seg_len(a, b):
    return math.hypot(b[0] - a[0], b[1] - a[1])


def _orient(p, q, r):
    v = (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0])
    return 0 if abs(v) < 1e-9 else (1 if v > 0 else -1)


def seg_intersection(p1, p2, p3, p4):
    """Proper crossing point of two segments, or None (collinear -> None)."""
    d1 = (p2[0] - p1[0], p2[1] - p1[1])
    d2 = (p4[0] - p3[0], p4[1] - p3[1])
    den = d1[0] * d2[1] - d1[1] * d2[0]
    if abs(den) < 1e-9:
        return None
    t = ((p3[0] - p1[0]) * d2[1] - (p3[1] - p1[1]) * d2[0]) / den
    u = ((p3[0] - p1[0]) * d1[1] - (p3[1] - p1[1]) * d1[0]) / den
    if -1e-9 <= t <= 1 + 1e-9 and -1e-9 <= u <= 1 + 1e-9:
        return (p1[0] + t * d1[0], p1[1] + t * d1[1])
    return None


def collinear_overlap(p1, p2, p3, p4):
    """Length of the shared corridor of two near-parallel, near-touching segments."""
    d1 = (p2[0] - p1[0], p2[1] - p1[1])
    l1 = math.hypot(*d1)
    l2 = seg_len(p3, p4)
    if l1 < 1e-6 or l2 < 1e-6:
        return 0.0
    u = (d1[0] / l1, d1[1] / l1)
    # both endpoints of seg2 must sit within STACK_TOL of seg1's carrier line
    for p in (p3, p4):
        lat = abs((p[0] - p1[0]) * u[1] - (p[1] - p1[1]) * u[0])
        if lat > STACK_TOL:
            return 0.0
    # 1-D projection overlap
    a0, a1 = 0.0, l1
    b0 = (p3[0] - p1[0]) * u[0] + (p3[1] - p1[1]) * u[1]
    b1 = (p4[0] - p1[0]) * u[0] + (p4[1] - p1[1]) * u[1]
    lo, hi = max(a0, min(b0, b1)), min(a1, max(b0, b1))
    return max(0.0, hi - lo)


def seg_hits_box(p1, p2, box, shrink):
    x0, y0, x1, y1 = box[0] + shrink, box[1] + shrink, box[2] - shrink, box[3] - shrink
    if x1 <= x0 or y1 <= y0:
        return False

    def inside(p):
        return x0 < p[0] < x1 and y0 < p[1] < y1
    if inside(p1) or inside(p2):
        return True
    corners = [(x0, y0), (x1, y0), (x1, y1), (x0, y1)]
    for k in range(4):
        if seg_intersection(p1, p2, corners[k], corners[(k + 1) % 4]):
            return True
        # collinear pass along a box edge counts too
        if collinear_overlap(p1, p2, corners[k], corners[(k + 1) % 4]) > EPS:
            return True
    return False


def boxes_overlap(a, b, eps=EPS):
    return (a[0] + eps < b[2] and b[0] + eps < a[2] and
            a[1] + eps < b[3] and b[1] + eps < a[3])


# ---------- export ----------

def resolve_binary():
    for cand in (os.environ.get("DRAWIO_BIN"), "drawio", "draw.io"):
        if cand and shutil.which(cand):
            return shutil.which(cand)
    if os.path.exists(MACOS_APP):
        return MACOS_APP
    return None


def export_svg(drawio_file):
    binary = resolve_binary()
    if binary is None:
        sys.exit("error: draw.io CLI not found — export an SVG yourself "
                 "(drawio -x -f svg -o out.svg in.drawio) and pass --svg out.svg")
    tmp = tempfile.mkdtemp(prefix="renderlint-")
    out = os.path.join(tmp, "render.svg")
    try:
        subprocess.run([binary, "-x", "-f", "svg", "-o", out, drawio_file],
                       capture_output=True, text=True, timeout=120, check=True)
    except subprocess.TimeoutExpired:
        sys.exit("error: draw.io CLI timed out exporting SVG — pass --svg instead")
    except subprocess.CalledProcessError as exc:
        sys.exit(f"error: draw.io SVG export failed: {(exc.stderr or '').strip()}"
                 " — pass --svg with a pre-exported file")
    if not os.path.exists(out):
        sys.exit("error: draw.io CLI produced no SVG (sandboxed environment?) "
                 "— pass --svg with a pre-exported file")
    return out


# ---------- checks ----------

def near_any_endpoint(pt, polyline, dist=ENDPOINT_SKIP):
    return (seg_len(pt, polyline[0]) < dist or seg_len(pt, polyline[-1]) < dist)


def run_checks(cells, svgcells):
    warns, infos = [], []

    # classify
    edges = {cid: sc for cid, sc in svgcells.items()
             if cells.get(cid, {}).get("edge") and sc.polylines}
    nodes = {cid: sc for cid, sc in svgcells.items()
             if cells.get(cid, {}).get("vertex") and sc.bbox and sc.is_leaf}

    # exemption sets per edge: endpoints + their ancestor/descendant chains
    exempt = {}
    for cid in edges:
        m = cells.get(cid, {})
        ex = {cid, m.get("source"), m.get("target")}
        for end in (m.get("source"), m.get("target")):
            if end:
                ex |= ancestors(end, cells)
                ex |= {k for k in cells if end in ancestors(k, cells)}
        exempt[cid] = ex

    # 1. edge through unrelated node (real route)
    for cid, sc in sorted(edges.items()):
        hit = set()
        for line in sc.polylines:
            for k in range(len(line) - 1):
                for nid, nsc in nodes.items():
                    if nid in exempt[cid] or nid in hit:
                        continue
                    if seg_hits_box(line[k], line[k + 1], nsc.bbox, NODE_SHRINK):
                        hit.add(nid)
        for nid in sorted(hit):
            warns.append(f"edge {cid!r} is routed through node {nid!r} "
                         f"(rendered route, not the model) — move the node, "
                         f"add waypoints, or pin exit/entry")

    # 2. edge through a text label (tight/nowrap labels only)
    tight = []                                    # (owner, box, has_bg)
    for cid, sc in svgcells.items():
        for box, nowrap, has_bg in sc.labels:
            if nowrap:
                tight.append((cid, box, has_bg))
    for cid, sc in sorted(edges.items()):
        seen = set()
        for line in sc.polylines:
            for k in range(len(line) - 1):
                for owner, box, has_bg in tight:
                    if owner == cid or owner in seen:
                        continue
                    if seg_hits_box(line[k], line[k + 1], box, LABEL_SHRINK):
                        seen.add(owner)
        for owner in sorted(seen):
            what = "label" if cells.get(owner, {}).get("vertex") else "edge label"
            warns.append(f"edge {cid!r} passes through the {what} of {owner!r} — "
                         f"reroute the edge or move/wrap the label "
                         f"(line-through-text)")

    # 3. stacked collinear edges
    eids = sorted(edges)
    for i in range(len(eids)):
        for j in range(i + 1, len(eids)):
            a, b = edges[eids[i]], edges[eids[j]]
            ma, mb = cells.get(eids[i], {}), cells.get(eids[j], {})
            if {ma.get("source"), ma.get("target")} == {mb.get("source"), mb.get("target")}:
                continue                          # same pair: validate.py's job
            worst = 0.0
            for la in a.polylines:
                for lb in b.polylines:
                    for k in range(len(la) - 1):
                        for m in range(len(lb) - 1):
                            worst = max(worst, collinear_overlap(
                                la[k], la[k + 1], lb[m], lb[m + 1]))
            if worst >= STACK_MIN:
                warns.append(f"edges {eids[i]!r} and {eids[j]!r} overlap for "
                             f"{worst:.0f}px on the same line — they render as "
                             f"one line; separate the routes (different exit/"
                             f"entry, waypoints, or an offset corridor)")

    # 4. edge-edge crossings (info)
    for i in range(len(eids)):
        for j in range(i + 1, len(eids)):
            a, b = edges[eids[i]], edges[eids[j]]
            pts = []
            for la in a.polylines:
                for lb in b.polylines:
                    for k in range(len(la) - 1):
                        for m in range(len(lb) - 1):
                            p = seg_intersection(la[k], la[k + 1], lb[m], lb[m + 1])
                            if p is None:
                                continue
                            if near_any_endpoint(p, la) or near_any_endpoint(p, lb):
                                continue
                            if all(seg_len(p, q) > 4 for q in pts):
                                pts.append(p)
            if pts:
                where = ", ".join(f"({p[0]:.0f},{p[1]:.0f})" for p in pts[:3])
                infos.append(f"edges {eids[i]!r} × {eids[j]!r} cross "
                             f"{len(pts)} time(s) at {where}")

    # 5. label-label overlap (measured boxes)
    for i in range(len(tight)):
        for j in range(i + 1, len(tight)):
            (oa, ba, _), (ob, bb, _) = tight[i], tight[j]
            if oa != ob and boxes_overlap(ba, bb):
                warns.append(f"labels of {oa!r} and {ob!r} overlap (rendered "
                             f"boxes) — widen spacing, wrap with &#xa;, or "
                             f"shift an edge label along its edge")

    # 6. label overlapping an unrelated node
    for owner, box, _ in tight:
        own_chain = {owner} | ancestors(owner, cells)
        for nid, nsc in nodes.items():
            if nid in own_chain:
                continue
            if boxes_overlap(box, nsc.bbox):
                warns.append(f"label of {owner!r} overlaps node {nid!r} "
                             f"(rendered box) — increase pitch or wrap the label")

    # 7. arrowhead landing room: final segment ≥ ARROW_MIN
    for cid, sc in sorted(edges.items()):
        for line in sc.polylines:
            if len(line) < 3:                     # straight line: no bend
                continue
            last = seg_len(line[-2], line[-1])
            if last < ARROW_MIN:
                warns.append(f"edge {cid!r} final segment is {last:.0f}px "
                             f"(<{ARROW_MIN:.0f}px) — the arrowhead lands on a "
                             f"bend; extend spacing or move the last waypoint")
                break

    return warns, infos


def main():
    ap = argparse.ArgumentParser(
        description="Lint the rendered (SVG) geometry of a .drawio diagram.")
    ap.add_argument("file", help=".drawio file")
    ap.add_argument("--svg", help="pre-exported SVG (skip auto-export)")
    ap.add_argument("--strict", action="store_true",
                    help="exit non-zero on warnings too")
    args = ap.parse_args()

    try:
        cells = parse_model(args.file)
    except (ET.ParseError, OSError) as exc:
        sys.exit(f"error: cannot parse {args.file}: {exc}")
    svg_path = args.svg or export_svg(args.file)
    try:
        svgcells = parse_svg(svg_path)
    except (ET.ParseError, OSError) as exc:
        sys.exit(f"error: cannot parse SVG {svg_path}: {exc}")
    if not svgcells:
        sys.exit("error: no data-cell-id markers in the SVG — export it with "
                 "the draw.io CLI (browser saves may differ)")

    warns, infos = run_checks(cells, svgcells)
    for w in warns:
        print(f"warning: {w}")
    for n in infos:
        print(f"info: {n}")
    print(f"{len(warns)} warning(s), {len(infos)} info(s) [rendered geometry]")
    if args.strict and warns:
        sys.exit(1)


if __name__ == "__main__":
    main()
