#!/usr/bin/env python3
"""Auto-layout a logical graph into draw.io XML using Graphviz.

Minimal layout pass for the drawio skill: takes a graph (nodes + edges as
JSON), runs `dot` to position the nodes, and emits a .drawio file with the
mxGeometry x/y filled in. draw.io routes the edges itself (orthogonal style).
This removes the manual-coordinate ceiling for medium/large diagrams.

Input JSON:
  {
    "direction": "TB",          # TB (top-bottom, default) or LR (left-right)
    "nodes": [
      {"id": "a", "label": "Service A", "style": "rounded=1;...",
       "width": 120, "height": 60}
    ],
    "edges": [
      {"source": "a", "target": "b", "label": "calls"}
    ]
  }
Only "id" is required per node; label defaults to id and style/width/height
have defaults. Node ids must be unique and must not be "0" or "1" (reserved
for the draw.io root cells). Requires Graphviz `dot` on PATH.

Usage: python3 autolayout.py graph.json [-o diagram.drawio]
"""
import argparse
import json
import os
import shlex
import subprocess
import sys
from xml.sax.saxutils import escape

DEFAULT_W, DEFAULT_H = 120, 60
NODE_STYLE = "rounded=1;whiteSpace=wrap;html=1;fillColor=#dae8fc;strokeColor=#6c8ebf;"
# Orthogonal routing with dot's bends replayed as waypoints: draw.io keeps the
# segments at right angles (no diagonal final approach into a port).
# jettySize=22 (not auto): auto shrinks terminal stubs to ~10px in tight
# spots, which puts the arrowhead on a bend; a 22px stub keeps the last bend
# ≥20px from the node (the rule renderlint enforces) even on same-rank hops.
# rounded=0 (sharp corners — the AWS-official right-angle look): a rounded
# corner's 10px arc would eat most of the stub before the arrowhead.
EDGE_STYLE = "edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=22;html=1;"
GROUP_STYLE = ("rounded=0;whiteSpace=wrap;html=1;fillColor=none;strokeColor=#999999;"
               "verticalAlign=top;align=left;spacingLeft=8;fontStyle=2;dashed=1;")
# Group colours come from the skill's own palette (styles/built-in/default.json)
# so there is a single source of truth, not a second list baked in here. When a
# grouped graph is laid out, each top-level group takes the next colour (cycled
# in a fixed, harmonious role order) so related modules read as a coloured
# cluster. Nodes that carry their own `style` keep it; only styleless grouped
# nodes are tinted. Disable with --mono.
_PALETTE_ORDER = ["primary", "success", "accent", "secondary", "warning", "danger", "neutral"]
_PALETTE_FILE = os.path.join(os.path.dirname(__file__), "..", "styles", "built-in", "default.json")
_FALLBACK_PALETTE = [("#dae8fc", "#6c8ebf"), ("#d5e8d4", "#82b366"), ("#ffe6cc", "#d79b00"),
                     ("#e1d5e7", "#9673a6"), ("#fff2cc", "#d6b656"), ("#f8cecc", "#b85450")]


def container_tint(fill, keep=0.40):
    """Light background for a container: keep `keep` of the hue, rest white."""
    try:
        r, g, b = (int(fill[i:i + 2], 16) for i in (1, 3, 5))
    except (ValueError, IndexError):
        return "#FAFAFA"
    mix = lambda v: round(255 * (1 - keep) + v * keep)  # noqa: E731
    return "#{:02X}{:02X}{:02X}".format(mix(r), mix(g), mix(b))


def load_palette():
    """Ordered (fill, stroke, containerFill) list from the default preset's
    palette; fall back to the same colours inline if the file can't be read."""
    try:
        with open(_PALETTE_FILE, encoding="utf-8") as fh:
            pal = json.load(fh)["palette"]
        colors = [(pal[r]["fillColor"], pal[r]["strokeColor"],
                   pal[r].get("containerFill") or container_tint(pal[r]["fillColor"]))
                  for r in _PALETTE_ORDER if r in pal]
        if colors:
            return colors
    except (OSError, KeyError, ValueError):
        pass
    return [(f, s, container_tint(f)) for f, s in _FALLBACK_PALETTE]


PALETTE = load_palette()
# Uniform container padding; the title sits in the top pad (verticalAlign=top).
# dot's cluster margin is set to this same value so each container box equals
# dot's cluster box — which dot guarantees never overlaps, at any nesting depth.
# 32px (not 24) so a side-entering edge still gets a ≥20px straight run between
# the container border and the node, and the 14px bold title breathes.
GROUP_PAD = 32


def attr(value):
    return escape(str(value), {'"': "&quot;"})


def dot_quote(value):
    # Wrap as a DOT double-quoted string, escaping backslash and quote so ids
    # with those characters can't corrupt the Graphviz input.
    return '"' + str(value).replace("\\", "\\\\").replace('"', '\\"') + '"'


def snap(value, grid=10):
    # Align to the grid the skill uses everywhere (multiples of 10).
    return int(round(value / grid) * grid)


def group_tree(nodes):
    """Parse hierarchical `group` paths ("a/b") into a container tree.

    Returns (gpath, direct, children, ordered):
      gpath[node_id] = tuple of path segments (the node's deepest container)
      direct[path]   = node ids whose group is exactly this path
      children[path] = child container paths
      ordered        = all container paths, shallow-to-deep (stable)
    """
    gpath, direct, paths = {}, {}, set()
    for node in nodes:
        g = node.get("group")
        if g is None or str(g).strip("/") == "":
            continue
        t = tuple(str(g).strip("/").split("/"))
        gpath[node["id"]] = t
        direct.setdefault(t, []).append(node["id"])
        for k in range(1, len(t) + 1):
            paths.add(t[:k])
    children = {}
    for p in sorted(paths):
        if len(p) > 1:
            children.setdefault(p[:-1], []).append(p)
    ordered = sorted(paths, key=lambda p: (len(p), p))
    return gpath, direct, children, ordered


def build_dot(graph):
    rankdir = "LR" if str(graph.get("direction", "TB")).upper() == "LR" else "TB"
    # splines=ortho makes dot route edges as orthogonal polylines; we replay
    # those bends as draw.io waypoints so edges go around nodes, not through them.
    # ranksep/nodesep ≈ the skill's spacing constants (dot defaults are 36/18px
    # — too tight: corners land right on node borders and arrowheads sit on
    # bends). Scale the corridors with edge count: each parallel edge in a
    # corridor needs a ~10px lane, so a 124-edge graph needs far more than
    # the 72px that suits a 10-edge one.
    n_edges = len(graph.get("edges", []))
    ranksep = min(2.5, max(1.0, n_edges / 50.0))
    nodesep = min(1.2, max(0.6, n_edges / 120.0))
    lines = [f"digraph G {{ rankdir={rankdir}; splines=ortho; "
             f"ranksep={ranksep:.2f}; nodesep={nodesep:.2f}; "
             f"node [shape=box fixedsize=true];"]
    # Group nodes into (possibly nested) clusters so dot keeps each group
    # together; a node's first appearance fixes its cluster, so list members
    # before the size attributes. The cluster margin reserves room for the
    # padded container boxes we draw below (extra on Y for the title strip) so
    # neighbouring boxes do not overlap.
    _, direct, children, ordered = group_tree(graph["nodes"])
    cidx = {p: i for i, p in enumerate(ordered)}

    def emit_cluster(p, pad):
        lines.append(f'{pad}subgraph cluster_{cidx[p]} {{ margin={GROUP_PAD};')
        for c in children.get(p, []):
            emit_cluster(c, pad + "  ")
        lines.extend(f'{pad}  {dot_quote(m)};' for m in direct.get(p, []))
        lines.append(pad + "}")

    for root in [p for p in ordered if len(p) == 1]:
        emit_cluster(root, "")
    for node in graph["nodes"]:
        # Pass our pixel sizes to dot as inches so it lays out at the real size.
        w = node.get("width", DEFAULT_W) / 72.0
        h = node.get("height", DEFAULT_H) / 72.0
        lines.append(f'{dot_quote(node["id"])} [width={w:.4f} height={h:.4f}];')
    for edge in graph.get("edges", []):
        lines.append(f'{dot_quote(edge["source"])} -> {dot_quote(edge["target"])};')
    lines.append("}")
    return "\n".join(lines)


def layout(dot_src):
    """Run `dot -Tplain`; return (height_in, {id: (xc, yc)}, {(src, dst): [(x, y), ...]}).

    Node coords are inches (bottom-left origin); each edge's value is the list
    of orthogonal control points dot computed for routing, endpoints included.
    """
    try:
        proc = subprocess.run(
            ["dot", "-Tplain"], input=dot_src,
            capture_output=True, text=True, check=True,
        )
    except FileNotFoundError:
        sys.exit("error: Graphviz `dot` not found on PATH (brew install graphviz)")
    except subprocess.CalledProcessError as exc:
        sys.exit(f"error: dot failed: {exc.stderr.strip()}")
    height, pos, edges = 0.0, {}, {}
    for line in proc.stdout.splitlines():
        tok = shlex.split(line)
        if not tok:
            continue
        if tok[0] == "graph":
            height = float(tok[3])                        # graph scale width height
        elif tok[0] == "node":
            pos[tok[1]] = (float(tok[2]), float(tok[3]))  # node name x y ...
        elif tok[0] == "edge":                            # edge tail head n x1 y1 ... xn yn
            n = int(tok[3])
            edges[(tok[1], tok[2])] = [
                (float(tok[4 + 2 * i]), float(tok[5 + 2 * i])) for i in range(n)
            ]
    return height, pos, edges


def group_style(stroke, fill):
    """Container box: light tinted background + coloured border and title.

    The tint ladder (canvas < container fill < node fill) is what makes a
    group read as a region instead of a wire frame. Nested containers
    alternate tint/white by depth so each level stays distinguishable.
    """
    # Title top-LEFT (AWS-group convention): a centered title sits exactly where
    # edges enter centered child nodes and gets struck through.
    return (f"rounded=0;whiteSpace=wrap;html=1;fillColor={fill};strokeColor={stroke};"
            f"fontColor={stroke};verticalAlign=top;align=left;spacingLeft=8;"
            f"fontStyle=1;fontSize=14;dashed=0;")


def to_drawio(graph, height, pos, edge_pts, color=True):
    nodes = graph["nodes"]
    # Absolute snapped rect for every placed node.
    rects = {}
    for node in nodes:
        nid = node["id"]
        if nid not in pos:
            continue
        w, h = node.get("width", DEFAULT_W), node.get("height", DEFAULT_H)
        xc, yc = pos[nid]
        x = snap(xc * 72 - w / 2)
        y = snap((height - yc) * 72 - h / 2)             # flip: dot origin is bottom-left
        rects[nid] = (x, y, w, h)
    # Parse the (possibly nested) group tree and assign each container a
    # collision-free id and a title (the path's last segment, or a member's groupLabel).
    gpath, direct, children, ordered = group_tree(nodes)
    # Assign each top-level group a palette colour, in order of first appearance.
    top_order = []
    for node in nodes:
        t = gpath.get(node["id"])
        if t and t[0] not in top_order:
            top_order.append(t[0])

    def gcolor(seg):
        return PALETTE[top_order.index(seg) % len(PALETTE)]

    used = {n["id"] for n in nodes}
    label_override = {}
    for node in nodes:
        if node["id"] in gpath and "groupLabel" in node:
            label_override.setdefault(gpath[node["id"]], str(node["groupLabel"]))
    gid, glabel = {}, {}
    for i, p in enumerate(ordered):
        cid = f"group_{i}"
        while cid in used:                               # never collide with a node id
            cid += "_"
        used.add(cid)
        gid[p] = cid
        glabel[p] = label_override.get(p, p[-1])
    # Container bounding box (members + nested children + uniform padding),
    # computed deepest-first so a parent can wrap its already-sized children.
    gbox = {}
    for p in sorted(ordered, key=len, reverse=True):
        xs = [(rects[m][0], rects[m][1], rects[m][0] + rects[m][2], rects[m][1] + rects[m][3])
              for m in direct.get(p, []) if m in rects]
        xs += [(gbox[c][0], gbox[c][1], gbox[c][0] + gbox[c][2], gbox[c][1] + gbox[c][3])
               for c in children.get(p, []) if c in gbox]
        if not xs:
            continue
        x0 = min(b[0] for b in xs) - GROUP_PAD
        y0 = min(b[1] for b in xs) - GROUP_PAD
        x1 = max(b[2] for b in xs) + GROUP_PAD
        y1 = max(b[3] for b in xs) + GROUP_PAD
        gbox[p] = (x0, y0, x1 - x0, y1 - y0)

    # Shift everything positive: a container's top padding can push its top edge
    # above the page origin. Only translates when something would be negative.
    absx = [r[0] for r in rects.values()] + [b[0] for b in gbox.values()]
    absy = [r[1] for r in rects.values()] + [b[1] for b in gbox.values()]
    dx = GROUP_PAD - min(absx) if absx and min(absx) < 0 else 0
    dy = GROUP_PAD - min(absy) if absy and min(absy) < 0 else 0

    def rebase(x, y, parent_path):
        """Absolute -> coordinates relative to parent_path's box (or shifted if top-level)."""
        if parent_path is None:
            return x + dx, y + dy, "1"
        px, py, _, _ = gbox[parent_path]
        return x - px, y - py, gid[parent_path]

    cells = []
    # Containers shallow-first so each parent precedes its children.
    for p in ordered:
        if p not in gbox:
            continue
        gx, gy, gw, gh = gbox[p]
        x, y, parent = rebase(gx, gy, p[:-1] if len(p) > 1 else None)
        if color:
            _, stroke, cfill = gcolor(p[0])
            # alternate tint / white by nesting depth so levels stay readable
            gstyle = group_style(stroke, cfill if len(p) % 2 == 1 else "#ffffff")
        else:
            gstyle = GROUP_STYLE
        cells.append(
            f'        <mxCell id="{attr(gid[p])}" value="{attr(glabel[p])}" '
            f'style="{gstyle}" vertex="1" parent="{attr(parent)}">\n'
            f'          <mxGeometry x="{x}" y="{y}" width="{gw}" height="{gh}" as="geometry"/>\n'
            f"        </mxCell>"
        )
    for node in nodes:
        nid = node["id"]
        if nid not in rects:
            continue
        rx, ry, w, h = rects[nid]
        x, y, parent = rebase(rx, ry, gpath.get(nid) if gpath.get(nid) in gbox else None)
        if node.get("style"):
            style = node["style"]                         # explicit style always wins
        elif color and nid in gpath:
            fill, stroke, _ = gcolor(gpath[nid][0])       # tint styleless nodes by group
            style = f"rounded=1;whiteSpace=wrap;html=1;fillColor={fill};strokeColor={stroke};"
        else:
            style = NODE_STYLE
        cells.append(
            f'        <mxCell id="{attr(nid)}" value="{attr(node.get("label", nid))}" '
            f'style="{attr(style)}" vertex="1" parent="{attr(parent)}">\n'
            f'          <mxGeometry x="{x}" y="{y}" width="{w}" height="{h}" as="geometry"/>\n'
            f"        </mxCell>"
        )
    def near_rect(pt, rect, margin=16):
        if rect is None:
            return False
        x, y, w, h = rect
        return (x - margin <= pt[0] <= x + w + margin and
                y - margin <= pt[1] <= y + h + margin)

    # --- pin ports: distribute exits/entries so edges never share a stem ---
    # The side each edge attaches to comes from dot's OWN spline endpoints
    # (they sit on the node boundary), so the pinned port always agrees with
    # the replayed route. Multiple edges on one side are spread evenly in
    # dot's order — SKILL.md's port-distribution rule, applied automatically.
    def to_px(p):
        return (p[0] * 72, (height - p[1]) * 72)

    def side_of(pt, rect):
        x, y, w, h = rect
        cands = [("top", abs(pt[1] - y)), ("bottom", abs(pt[1] - (y + h))),
                 ("left", abs(pt[0] - x)), ("right", abs(pt[0] - (x + w)))]
        return min(cands, key=lambda c: c[1])[0]

    exit_groups, entry_groups = {}, {}
    for idx, e in enumerate(graph.get("edges", [])):
        spline = edge_pts.get((e["source"], e["target"]))
        rs, rt = rects.get(e["source"]), rects.get(e["target"])
        if not spline or len(spline) < 2 or rs is None or rt is None \
                or e["source"] == e["target"]:
            continue
        p0, p1 = to_px(spline[0]), to_px(spline[-1])
        s_side, t_side = side_of(p0, rs), side_of(p1, rt)
        along = p0[0] if s_side in ("top", "bottom") else p0[1]
        exit_groups.setdefault((e["source"], s_side), []).append((along, idx))
        along = p1[0] if t_side in ("top", "bottom") else p1[1]
        entry_groups.setdefault((e["target"], t_side), []).append((along, idx))

    SIDE_FIXED = {"top": ("X", 0), "bottom": ("X", 1), "left": ("Y", 0), "right": ("Y", 1)}
    port_style = {}
    port_frac = {}                                # (idx, prefix) -> (side, frac)

    def assign(groups, prefix):
        for (nid, side), members in groups.items():
            rect = rects.get(nid)
            if rect is None:
                continue
            axis, fixed = SIDE_FIXED[side]
            base, span = (rect[0], rect[2]) if axis == "X" else (rect[1], rect[3])
            # Keep dot's ACTUAL attachment fraction (so the pinned port agrees
            # with the replayed waypoints — no S-bend at the terminal), then
            # push near-coincident ports apart so edges don't share a stem.
            # clamp toward the middle half: a port hugging a corner (dot often
            # attaches at 0.9+) leaves the router a <10px final approach
            fr = sorted((max(0.25, min(0.75, (along - base) / max(span, 1))), idx)
                        for along, idx in members)
            vals = [f for f, _ in fr]
            # separation floor in PIXELS (16px), not fraction — 0.12 on a 60px
            # node side is only 7px and the stems still read as one line
            min_sep = max(0.12, 16.0 / max(span, 1))
            for k in range(1, len(vals)):
                if vals[k] - vals[k - 1] < min_sep:
                    vals[k] = vals[k - 1] + min_sep
            if vals and vals[-1] > 0.9:            # shift the cluster back in range
                over = vals[-1] - 0.9
                vals = [max(0.1, v - over) for v in vals]
            for (_, idx), v in zip(fr, vals):
                frac = round(v, 3)
                if axis == "X":
                    frag = f"{prefix}X={frac};{prefix}Y={fixed};"
                else:
                    frag = f"{prefix}X={fixed};{prefix}Y={frac};"
                port_style[idx] = port_style.get(idx, "") + \
                    f"{frag}{prefix}Dx=0;{prefix}Dy=0;"
                port_frac[(idx, prefix)] = (side, frac)
    assign(exit_groups, "exit")
    assign(entry_groups, "entry")

    def px(pt):
        return (snap(pt[0] * 72), snap((height - pt[1]) * 72))

    all_edges = graph.get("edges", [])
    wp = []                                        # per-edge waypoints, px coords
    for edge in all_edges:
        # Drop the first/last points (they sit on the node borders, where
        # draw.io attaches anyway) and replay the interior bends as waypoints.
        interior = [px(p) for p in
                    edge_pts.get((edge["source"], edge["target"]), [])[1:-1]]
        interior = [p for k, p in enumerate(interior)
                    if k == 0 or p != interior[k - 1]]        # dedupe repeats
        # Also drop bends hugging an endpoint node: dot places spline points on
        # the boundary, which would leave a <20px final segment — the arrowhead
        # then lands on a bend. draw.io routes the last stretch cleanly itself.
        interior = [p for p in interior
                    if not near_rect(p, rects.get(edge["source"])) and
                    not near_rect(p, rects.get(edge["target"]))]
        # The approach bend needs more clearance than a passing bend: prune
        # bends closer than 28px so the router's entry run (jetty 22 + arrow)
        # clears the 20px rule. NOT more than 28: with ranksep=72 the inter-
        # rank corridor bends sit ~36px from the nodes, and pruning those
        # deletes the entire detour — the router then plows through the row.
        while interior and near_rect(interior[-1], rects.get(edge["target"]), 28):
            interior.pop()
        while interior and near_rect(interior[0], rects.get(edge["source"]), 28):
            interior.pop(0)
        wp.append(interior)

    def port_point(idx, edge, prefix, end_key):
        r = rects.get(edge[end_key])
        pf = port_frac.get((idx, prefix))
        if r is None or pf is None:
            return None
        side, frac = pf
        x, y, w, h = r
        return {"top": (x + frac * w, y), "bottom": (x + frac * w, y + h),
                "left": (x, y + frac * h), "right": (x + w, y + frac * h)}[side]

    # Lane assignment: dot routes many edges along the SAME orthogonal rail,
    # which renders as one line. Claim every segment's rail; when a later
    # edge's interior segment conflicts (same axis, <6px apart, >24px shared
    # length), nudge that segment sideways in 10px steps until free. Only
    # waypoint-to-waypoint segments move — port-adjacent runs stay put.
    claimed = []                                   # (axis, coord, lo, hi, edge)

    def rail_blocked(axis, c, lo, hi, exclude=(), pad=6):
        """Would a rail at this coordinate plow through a node? A shifted or
        inserted lane must never trade a stacking note for a through-node
        warning."""
        for nid, r in rects.items():
            if nid in exclude:
                continue
            x, y, w, h = r
            if axis == "v":
                if x - pad < c < x + w + pad and min(hi, y + h) - max(lo, y) > 0:
                    return True
            else:
                if y - pad < c < y + h + pad and min(hi, x + w) - max(lo, x) > 0:
                    return True
        return False
    for i, edge in enumerate(all_edges):
        pts = [port_point(i, edge, "exit", "source")] + wp[i] + \
              [port_point(i, edge, "entry", "target")]
        pts = [p for p in pts if p is not None]
        base = 1 if port_frac.get((i, "exit")) else 0  # wp offset inside pts
        for k in range(len(pts) - 1):
            (x1, y1), (x2, y2) = pts[k], pts[k + 1]
            if abs(x1 - x2) < 1e-6 and abs(y1 - y2) < 1e-6:
                continue
            vert = abs(x1 - x2) <= abs(y1 - y2)
            axis = "v" if vert else "h"
            coord = x1 if vert else y1
            lo, hi = (min(y1, y2), max(y1, y2)) if vert else (min(x1, x2), max(x1, x2))

            def conflict(c):
                return any(a == axis and e != i and abs(c - cc) < 6 and
                           min(hi, chi) - max(lo, clo) > 24
                           for a, cc, clo, chi, e in claimed)
            movable = base <= k and k + 1 - base < len(wp[i]) and k >= 1
            if movable and conflict(coord):
                excl = (edge["source"], edge["target"])
                for delta in (10, -10, 20, -20, 30, -30, 40, -40, 50, -50, 60, -60):
                    if not conflict(coord + delta) and \
                            not rail_blocked(axis, coord + delta, lo, hi, excl):
                        coord += delta
                        a_i, b_i = k - base, k + 1 - base
                        if vert:
                            wp[i][a_i] = (coord, wp[i][a_i][1])
                            wp[i][b_i] = (coord, wp[i][b_i][1])
                        else:
                            wp[i][a_i] = (wp[i][a_i][0], coord)
                            wp[i][b_i] = (wp[i][b_i][0], coord)
                        break
            claimed.append((axis, coord, lo, hi, i))

    # Router-created approach rails: from the outermost waypoint the router
    # runs at that waypoint's coordinate to reach a port (side port → vertical
    # descent, top/bottom port → horizontal run). Two edges converging on
    # neighbouring ports share that rail even though no waypoint segment
    # overlaps — the 200px "one line into the database" stack. Claim these
    # implied rails too, shifting the outermost waypoint when taken.
    for i, edge in enumerate(all_edges):
        if not wp[i]:
            continue
        for wk, prefix, end_key in ((-1, "entry", "target"), (0, "exit", "source")):
            pf = port_frac.get((i, prefix))
            pp = port_point(i, edge, prefix, end_key)
            if pf is None or pp is None:
                continue
            wx, wy = wp[i][wk]
            if pf[0] in ("left", "right"):
                axis, coord = "v", wx
                lo, hi = min(wy, pp[1]), max(wy, pp[1])
            else:
                axis, coord = "h", wy
                lo, hi = min(wx, pp[0]), max(wx, pp[0])
            if hi - lo < 24:
                continue

            def rail_conflict(c):
                return any(a == axis and e != i and abs(c - cc) < 6 and
                           min(hi, chi) - max(lo, clo) > 24
                           for a, cc, clo, chi, e in claimed)
            if rail_conflict(coord):
                excl = (edge["source"], edge["target"])
                for delta in (10, -10, 20, -20, 30, -30, 40, -40, 50, -50, 60, -60):
                    if not rail_conflict(coord + delta) and \
                            not rail_blocked(axis, coord + delta, lo, hi, excl):
                        coord += delta
                        wp[i][wk] = (coord, wy) if axis == "v" else (wx, coord)
                        break
            claimed.append((axis, coord, lo, hi, i))

    # Waypoint-less edges route entirely by the runtime router: exit stub,
    # one long run at the exit port's coordinate, then into the entry port.
    # That long run is a rail too — when it collides with a claimed rail
    # (e.g. another edge's descent into the same target), INSERT waypoints
    # to pull the run onto a free lane.
    for i, edge in enumerate(all_edges):
        if wp[i]:
            continue
        pe = port_point(i, edge, "exit", "source")
        pn = port_point(i, edge, "entry", "target")
        fe, fn = port_frac.get((i, "exit")), port_frac.get((i, "entry"))
        if pe is None or pn is None or fe is None or fn is None:
            continue
        if fe[0] in ("top", "bottom"):             # main run is vertical at exit.x
            axis, coord = "v", pe[0]
            lo, hi = min(pe[1], pn[1]), max(pe[1], pn[1])
        else:                                      # main run is horizontal at exit.y
            axis, coord = "h", pe[1]
            lo, hi = min(pe[0], pn[0]), max(pe[0], pn[0])
        if hi - lo < 48:                           # too short to matter/re-lane
            claimed.append((axis, coord, lo, hi, i))
            continue
        excl = (edge["source"], edge["target"])
        if rail_blocked(axis, coord, lo, hi, excl):
            # the straight run doesn't exist — the router detours around the
            # obstacle; our simple rail model can't reason about that path,
            # so neither claim nor re-lane it
            continue

        def run_conflict(c):
            return any(a == axis and e != i and abs(c - cc) < 6 and
                       min(hi, chi) - max(lo, clo) > 24
                       for a, cc, clo, chi, e in claimed)
        if run_conflict(coord):
            for delta in (10, -10, 20, -20, 30, -30, 40, -40, 50, -50, 60, -60):
                if not run_conflict(coord + delta) and \
                        not rail_blocked(axis, coord + delta, lo, hi, excl):
                    c = coord + delta
                    if axis == "v":
                        wp[i] = [(c, lo + 24), (c, hi - 24)]
                    else:
                        wp[i] = [(lo + 24, c), (hi - 24, c)]
                    coord = c
                    break
        claimed.append((axis, coord, lo, hi, i))

    # Snap a leftover waypoint that ALMOST aligns with its port onto the port
    # line — a few px of misalignment makes the router add a micro-jog with
    # the arrowhead right on it.
    for i, edge in enumerate(all_edges):
        if not wp[i]:
            continue
        for wk, prefix, end_key in ((0, "exit", "source"), (-1, "entry", "target")):
            pp = port_point(i, edge, prefix, end_key)
            if pp is None:
                continue
            wx, wy = wp[i][wk]
            if abs(wx - pp[0]) <= 12 and abs(wx - pp[0]) > 0:
                wp[i][wk] = (pp[0], wy)
            elif abs(wy - pp[1]) <= 12 and abs(wy - pp[1]) > 0:
                wp[i][wk] = (wx, pp[1])

    for i, edge in enumerate(all_edges):
        if wp[i]:
            points = "".join(f'<mxPoint x="{x + dx}" y="{y + dy}"/>'
                             for x, y in wp[i])
            geom = (f'<mxGeometry relative="1" as="geometry">'
                    f'<Array as="points">{points}</Array></mxGeometry>')
        else:
            geom = '<mxGeometry relative="1" as="geometry"/>'
        # Labeled edges get a background (readable at crossings) and the demoted
        # label style (smaller + gray — same typography rule as hand-written edges).
        estyle = EDGE_STYLE + ("labelBackgroundColor=#ffffff;fontSize=10;fontColor=#595959;"
                               if edge.get("label") else "") + port_style.get(i, "")
        cells.append(
            f'        <mxCell id="e{i}" value="{attr(edge.get("label", ""))}" '
            f'style="{estyle}" edge="1" parent="1" '
            f'source="{attr(edge["source"])}" target="{attr(edge["target"])}">\n'
            f"          {geom}\n"
            f"        </mxCell>"
        )
    return (
        '<mxfile>\n  <diagram id="autolayout" name="Page-1">\n'
        '    <mxGraphModel dx="800" dy="600" grid="1" gridSize="10" guides="1" '
        'tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" '
        'pageWidth="850" pageHeight="1100" math="0" shadow="0">\n'
        "      <root>\n"
        '        <mxCell id="0"/>\n'
        '        <mxCell id="1" parent="0"/>\n'
        + "\n".join(cells)
        + "\n      </root>\n    </mxGraphModel>\n  </diagram>\n</mxfile>\n"
    )


def main():
    ap = argparse.ArgumentParser(description="Auto-layout a graph JSON into draw.io XML.")
    ap.add_argument("input", help="graph JSON file")
    ap.add_argument("-o", "--output", help="output .drawio path (default: stdout)")
    ap.add_argument("--mono", action="store_true",
                    help="don't colour groups by palette (monochrome boxes)")
    args = ap.parse_args()
    with open(args.input, encoding="utf-8") as f:
        graph = json.load(f)
    height, pos, edge_pts = layout(build_dot(graph))
    xml = to_drawio(graph, height, pos, edge_pts, color=not args.mono)
    if args.output:
        with open(args.output, "w", encoding="utf-8") as f:
            f.write(xml)
        print(f"wrote {args.output} ({len(graph['nodes'])} nodes, "
              f"{len(graph.get('edges', []))} edges)", file=sys.stderr)
    else:
        sys.stdout.write(xml)


if __name__ == "__main__":
    main()
