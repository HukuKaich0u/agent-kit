#!/usr/bin/env python3
"""Deterministic structural + layout linter for .drawio files.

Catches the class of mistakes a vision self-check is slow and unreliable at:

Structural (errors):
  dangling edge endpoints, duplicate or reserved ids, broken parent
  references, missing/invalid vertex geometry, edges without the required
  <mxGeometry relative="1"> child (they silently don't render).

Layout (warnings — the overlap/readability class of bugs):
  - node-node overlap in ABSOLUTE coordinates (across containers, not just
    same-parent siblings)
  - child shapes overflowing their container's bounds
  - child shapes sitting in a container's title bar zone (swimlane startSize
    / AWS group label area)
  - external bottom labels (verticalLabelPosition=bottom — every AWS/Azure/GCP
    icon style) colliding with neighbouring nodes or other external labels;
    the label renders OUTSIDE the shape's geometry box, so pure geometry
    spacing does not protect it
  - labels that don't fit their shape (CJK-aware width estimate: fullwidth
    chars ≈ fontSize px, ASCII ≈ 0.6×fontSize)
  - edges whose path (straight corridor, or explicit waypoints) passes
    through an unrelated node
  - parallel edges on the same node pair with no distinguishing exit/entry
    points or waypoints (they render stacked)
  - labeled edges without labelBackgroundColor (unreadable where they cross
    other edges/shapes)

Runs without launching draw.io, so it is a fast pre-export gate.

  python3 validate.py diagram.drawio

Exit status is non-zero when any error (or, with --strict, any warning) is
found, so it can gate a workflow. Compressed (non-XML) diagram pages are
skipped with a warning — this skill always writes uncompressed XML.

Usage: python3 validate.py <file.drawio> [--strict]
"""
import argparse
import math
import re
import sys
import unicodedata
import xml.etree.ElementTree as ET

RESERVED = {"0", "1"}
DEFAULT_FONT = 12
ASCII_W = 0.6      # avg glyph advance / fontSize for latin text
WIDE_W = 1.0       # fullwidth (CJK) glyph advance / fontSize
LINE_H = 1.35      # line height / fontSize
LABEL_PAD = 4      # inner horizontal padding per side inside a shape
EPS = 1.0          # tolerance px for touch-vs-overlap


# ---------- style / geometry helpers ----------

def style_of(cell):
    """Parse 'key=val;flag;...' into a dict (flags map to '1')."""
    out = {}
    for part in (cell.get("style") or "").split(";"):
        if not part:
            continue
        if "=" in part:
            k, v = part.split("=", 1)
            out[k] = v
        else:
            out[part] = "1"
    return out


def rect(cell):
    """(x, y, w, h) floats from a cell's own geometry, or None.

    x/y default to 0 (draw.io semantics); only width/height must be numeric.
    """
    g = cell.find("mxGeometry")
    if g is None:
        return None
    try:
        return (float(g.get("x", "0")), float(g.get("y", "0")),
                float(g.get("width", "nan")), float(g.get("height", "nan")))
    except ValueError:
        return None


def is_edge_label(cell, ids):
    """True for edge labels / relative-positioned child vertices.

    These omit or repurpose geometry (position is relative to a parent edge),
    so every geometry-based check must skip them.
    """
    if "edgeLabel" in (cell.get("style") or ""):
        return True
    parent = ids.get(cell.get("parent"))
    if parent is not None and parent.get("edge") == "1":
        return True
    g = cell.find("mxGeometry")
    return g is not None and g.get("relative") == "1"


def abs_rect(cell, ids, _depth=0):
    """Resolve a vertex's rect to page-absolute coordinates via parent chain."""
    r = rect(cell)
    if r is None or any(v != v for v in r) or _depth > 32:
        return None
    x, y, w, h = r
    parent = ids.get(cell.get("parent"))
    while parent is not None and parent.get("id") not in RESERVED:
        pr = rect(parent)
        if pr is None or any(v != v for v in pr):
            break
        x += pr[0]
        y += pr[1]
        parent = ids.get(parent.get("parent"))
        _depth += 1
        if _depth > 32:
            break
    return (x, y, w, h)


def overlap(a, b, eps=EPS):
    ax, ay, aw, ah = a
    bx, by, bw, bh = b
    return (ax + eps < bx + bw and bx + eps < ax + aw and
            ay + eps < by + bh and by + eps < ay + ah)


# ---------- label size estimation ----------

def label_lines(cell):
    """Plain-text lines of a cell label (entities decoded by the XML parser)."""
    v = cell.get("value") or ""
    if not v.strip():
        return []
    v = re.sub(r"<br\s*/?>", "\n", v, flags=re.I)
    v = re.sub(r"</(div|p|li|tr)>", "\n", v, flags=re.I)
    v = re.sub(r"<[^>]+>", "", v)          # strip remaining html tags
    lines = [ln.strip() for ln in v.split("\n")]
    return [ln for ln in lines if ln]


def text_width(s, font):
    """Estimated pixel width: CJK fullwidth ≈ font px, ASCII ≈ 0.6×font px."""
    w = 0.0
    for ch in s:
        w += WIDE_W * font if unicodedata.east_asian_width(ch) in ("W", "F") \
            else ASCII_W * font
    return w


def font_size(st):
    try:
        return float(st.get("fontSize", DEFAULT_FONT))
    except ValueError:
        return DEFAULT_FONT


def has_external_bottom_label(st):
    return st.get("verticalLabelPosition") == "bottom"


def external_label_rect(cell, r, st):
    """Rect the label occupies BELOW the shape (verticalLabelPosition=bottom)."""
    lines = label_lines(cell)
    if not lines:
        return None
    font = font_size(st)
    lw = max(text_width(ln, font) for ln in lines)
    lh = len(lines) * font * LINE_H
    x, y, w, h = r
    return (x + w / 2 - lw / 2, y + h, lw, lh)


# ---------- segment / rect intersection ----------

def _orient(p, q, r):
    v = (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0])
    return 0 if abs(v) < 1e-9 else (1 if v > 0 else -1)


def _on_seg(p, q, r):
    return (min(p[0], q[0]) - 1e-9 <= r[0] <= max(p[0], q[0]) + 1e-9 and
            min(p[1], q[1]) - 1e-9 <= r[1] <= max(p[1], q[1]) + 1e-9)


def segs_intersect(p1, p2, p3, p4):
    o1, o2 = _orient(p1, p2, p3), _orient(p1, p2, p4)
    o3, o4 = _orient(p3, p4, p1), _orient(p3, p4, p2)
    if o1 != o2 and o3 != o4:
        return True
    return ((o1 == 0 and _on_seg(p1, p2, p3)) or (o2 == 0 and _on_seg(p1, p2, p4)) or
            (o3 == 0 and _on_seg(p3, p4, p1)) or (o4 == 0 and _on_seg(p3, p4, p2)))


def seg_hits_rect(p1, p2, r, shrink=2.0):
    """Does segment p1→p2 enter rect r (shrunk slightly so tangency doesn't count)?"""
    x, y, w, h = r[0] + shrink, r[1] + shrink, r[2] - 2 * shrink, r[3] - 2 * shrink
    if w <= 0 or h <= 0:
        return False

    def inside(p):
        return x < p[0] < x + w and y < p[1] < y + h
    if inside(p1) or inside(p2):
        return True
    c = [(x, y), (x + w, y), (x + w, y + h), (x, y + h)]
    return any(segs_intersect(p1, p2, c[i], c[(i + 1) % 4]) for i in range(4))


def edge_polyline(cell, ids, st):
    """Approximate edge path: exit point (pinned or source center) → waypoints
    → entry point (pinned or target center). None if either endpoint lacks
    geometry. For orthogonal edges without waypoints this is a straight-line
    *corridor* proxy — a hit means the direct corridor is blocked and the
    router will detour or overlap."""
    src, tgt = ids.get(cell.get("source")), ids.get(cell.get("target"))
    if src is None or tgt is None:
        return None
    rs, rt = abs_rect(src, ids), abs_rect(tgt, ids)
    if rs is None or rt is None:
        return None

    def endpoint(r, xk, yk, dxk, dyk):
        try:
            fx, fy = float(st[xk]), float(st[yk])
            return (r[0] + fx * r[2] + float(st.get(dxk, 0)),
                    r[1] + fy * r[3] + float(st.get(dyk, 0)))
        except (KeyError, ValueError):
            return (r[0] + r[2] / 2, r[1] + r[3] / 2)
    pts = [endpoint(rs, "exitX", "exitY", "exitDx", "exitDy")]
    g = cell.find("mxGeometry")
    arr = g.find("Array[@as='points']") if g is not None else None
    if arr is not None:
        for p in arr.findall("mxPoint"):
            try:
                pts.append((float(p.get("x", "0")), float(p.get("y", "0"))))
            except ValueError:
                pass
    pts.append(endpoint(rt, "entryX", "entryY", "entryDx", "entryDy"))
    return pts


# ---------- per-page checks ----------

def check_page(diagram):
    """Return (errors, warnings) for one <diagram> page."""
    name = diagram.get("name", "?")
    model = diagram.find("mxGraphModel")
    if model is None:
        if (diagram.text or "").strip():
            return [], [f"page {name!r}: compressed, skipped (cannot lint)"]
        return [f"page {name!r}: no <mxGraphModel>"], []
    root = model.find("root")
    cells = root.findall(".//mxCell") if root is not None else []
    errors, warns = [], []

    ids = {}
    for c in cells:
        cid = c.get("id")
        if cid in ids:
            errors.append(f"duplicate id {cid!r}")
        ids[cid] = c
    parents = {c.get("parent") for c in cells}            # ids that have children

    def ancestors(cell):
        seen = set()
        p = ids.get(cell.get("parent"))
        while p is not None and p.get("id") not in seen:
            seen.add(p.get("id"))
            p = ids.get(p.get("parent"))
        return seen

    # --- structural ---
    for c in cells:
        cid, parent = c.get("id"), c.get("parent")
        is_v, is_e = c.get("vertex") == "1", c.get("edge") == "1"
        if parent is not None and parent not in ids:
            errors.append(f"cell {cid!r} parent {parent!r} does not exist")
        for end in ("source", "target"):
            ref = c.get(end)
            if ref and ref not in ids:
                errors.append(f"edge {cid!r} {end} {ref!r} does not exist")
        if (is_v or is_e) and cid in RESERVED:
            errors.append(f"cell {cid!r} reuses reserved id 0/1")
        if is_e and c.find("mxGeometry") is None:
            errors.append(f"edge {cid!r} lacks <mxGeometry relative=\"1\"> child — it will not render")
        if is_v and not is_edge_label(c, ids):
            r = rect(c)
            if r is None or any(v != v for v in r):       # None or NaN
                errors.append(f"vertex {cid!r} has missing/invalid geometry")
            else:
                if r[2] <= 0 or r[3] <= 0:
                    warns.append(f"vertex {cid!r} non-positive size {r[2]:g}x{r[3]:g}")
                ar = abs_rect(c, ids)
                if ar and (ar[0] < 0 or ar[1] < 0):
                    warns.append(f"vertex {cid!r} at negative absolute position ({ar[0]:g},{ar[1]:g})")

    # --- collect leaf vertices with absolute rects ---
    leaves = []                                            # (id, cell, abs_rect, style)
    for c in cells:
        if c.get("vertex") != "1" or is_edge_label(c, ids):
            continue
        if c.get("id") in parents:                         # containers wrap children
            continue
        ar = abs_rect(c, ids)
        if ar is None or any(v != v for v in ar):
            continue
        leaves.append((c.get("id"), c, ar, style_of(c)))

    # --- node-node overlap in absolute coordinates (across containers) ---
    for i in range(len(leaves)):
        for j in range(i + 1, len(leaves)):
            (ia, ca, ra, _), (ib, cb, rb, _) = leaves[i], leaves[j]
            if ib in ancestors(ca) or ia in ancestors(cb):
                continue
            if overlap(ra, rb):
                warns.append(f"nodes {ia!r} and {ib!r} overlap (absolute coords)")

    # --- children vs container bounds and title zone ---
    for c in cells:
        if c.get("vertex") != "1" or is_edge_label(c, ids):
            continue
        p = ids.get(c.get("parent"))
        if p is None or p.get("id") in RESERVED or p.get("vertex") != "1":
            continue
        cr, pr = rect(c), rect(p)
        if cr is None or pr is None or any(v != v for v in cr) or any(v != v for v in pr):
            continue
        cid, pid = c.get("id"), p.get("id")
        if (cr[0] < -EPS or cr[1] < -EPS or
                cr[0] + cr[2] > pr[2] + EPS or cr[1] + cr[3] > pr[3] + EPS):
            warns.append(f"child {cid!r} overflows container {pid!r} bounds")
        pst = style_of(p)
        title_h = 0.0
        if "swimlane" in pst:
            try:
                title_h = float(pst.get("startSize", 30))
            except ValueError:
                title_h = 30.0
        elif "grIcon" in pst or ".group" in (pst.get("shape") or ""):
            title_h = 40.0                                 # AWS-style group label zone
        if title_h and cr[1] < title_h - EPS:
            warns.append(f"child {cid!r} sits in container {pid!r} title zone (y={cr[1]:g} < {title_h:g})")

    # --- external bottom labels (AWS icon style) ---
    ext = []                                               # (id, label_rect)
    for cid, c, r, st in leaves:
        if has_external_bottom_label(st):
            lr = external_label_rect(c, r, st)
            if lr:
                ext.append((cid, lr))
    for cid, lr in ext:
        for oid, _, orct, _ in leaves:
            if oid != cid and overlap(lr, orct):
                warns.append(f"external label of {cid!r} overlaps node {oid!r} — "
                             f"leave ≥{math.ceil(lr[3])}px below the icon or shorten/wrap the label")
    for i in range(len(ext)):
        for j in range(i + 1, len(ext)):
            (ia, la), (ib, lb) = ext[i], ext[j]
            if overlap(la, lb):
                warns.append(f"external labels of {ia!r} and {ib!r} overlap — "
                             f"widen horizontal gap or use &#xa; to wrap")

    # --- labels that don't fit their shape ---
    for cid, c, r, st in leaves:
        if has_external_bottom_label(st):
            continue
        lines = label_lines(c)
        if not lines:
            continue
        font = font_size(st)
        widest = max(text_width(ln, font) for ln in lines)
        inner_w = r[2] - 2 * LABEL_PAD
        if inner_w <= 0:
            continue
        if st.get("whiteSpace") == "wrap":
            need = sum(max(1, math.ceil(text_width(ln, font) / inner_w)) for ln in lines)
            if need * font * LINE_H > r[3] + EPS:
                warns.append(f"label of {cid!r} likely clipped: needs ~{need} wrapped line(s) "
                             f"({need * font * LINE_H:.0f}px) in {r[3]:g}px height — enlarge shape or shorten text")
        elif widest > r[2] + EPS:
            warns.append(f"label of {cid!r} wider than shape ({widest:.0f}px > {r[2]:g}px) "
                         f"and whiteSpace=wrap is not set")

    # --- edge paths through unrelated nodes ---
    edges = [c for c in cells if c.get("edge") == "1"]
    for e in edges:
        st = style_of(e)
        pts = edge_polyline(e, ids, st)
        if not pts:
            continue
        eid = e.get("id")
        skip = {e.get("source"), e.get("target")}
        src, tgt = ids.get(e.get("source")), ids.get(e.get("target"))
        for cell in (src, tgt):
            if cell is not None:
                skip |= ancestors(cell)
        hit = set()
        for k in range(len(pts) - 1):
            for cid, _, r, _ in leaves:
                if cid in skip or cid in hit:
                    continue
                if seg_hits_rect(pts[k], pts[k + 1], r):
                    hit.add(cid)
        for cid in sorted(hit):
            via = "waypoints" if len(pts) > 2 else "direct corridor"
            warns.append(f"edge {eid!r} ({e.get('source')}→{e.get('target')}) {via} passes through "
                         f"node {cid!r} — add/adjust waypoints, pin exit/entry, or move the node")

    # --- stacked parallel edges ---
    seen_pairs = {}
    for e in edges:
        s, t = e.get("source"), e.get("target")
        if not s or not t:
            continue
        st = style_of(e)
        g = e.find("mxGeometry")
        has_way = g is not None and g.find("Array[@as='points']") is not None
        sig = (st.get("exitX"), st.get("exitY"), st.get("entryX"), st.get("entryY"), has_way)
        key = tuple(sorted((s, t)))
        if key in seen_pairs and sig in seen_pairs[key]:
            warns.append(f"edges {seen_pairs[key][sig]!r} and {e.get('id')!r} both connect "
                         f"{s!r}↔{t!r} with identical routing — they render stacked; "
                         f"pin different exit/entry points")
        seen_pairs.setdefault(key, {})[sig] = e.get("id")

    # --- labeled edges without a label background ---
    for e in edges:
        if (e.get("value") or "").strip():
            st = style_of(e)
            if "labelBackgroundColor" not in st:
                warns.append(f"edge {e.get('id')!r} has a label but no labelBackgroundColor — "
                             f"text becomes unreadable where it crosses lines/shapes; "
                             f"add labelBackgroundColor=#ffffff;")
    return errors, warns


def main():
    ap = argparse.ArgumentParser(description="Lint a .drawio file for structural and layout errors.")
    ap.add_argument("file")
    ap.add_argument("--strict", action="store_true", help="treat warnings as failure too")
    args = ap.parse_args()
    try:
        tree = ET.parse(args.file)
    except (ET.ParseError, OSError) as exc:
        sys.exit(f"error: cannot parse {args.file}: {exc}")
    pages = tree.getroot().findall("diagram") or [tree.getroot()]
    errors, warns = [], []
    for page in pages:
        e, w = check_page(page)
        errors += e
        warns += w
    for w in warns:
        print(f"warning: {w}")
    for e in errors:
        print(f"error: {e}")
    print(f"{len(errors)} error(s), {len(warns)} warning(s)")
    if errors or (args.strict and warns):
        sys.exit(1)


if __name__ == "__main__":
    main()
