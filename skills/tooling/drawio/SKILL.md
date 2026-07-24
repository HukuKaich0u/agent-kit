---
name: drawio
version: 1.19.2
description: Use when the user requests diagrams, flowcharts, architecture diagrams, ER diagrams, UML / sequence / class diagrams, network topology, ML/DL model figures (Transformer/CNN/LSTM), mind maps, or any visualization. Also use proactively when explaining systems with 3+ components, complex data flows, or relationships that benefit from visual representation. Best suited when the diagram needs custom styling, rich shape vocabulary, swimlanes, or exportable images (PNG/SVG/PDF/JPG). Generates .drawio XML and exports locally via the native draw.io desktop CLI.
license: MIT
homepage: https://github.com/Agents365-ai/drawio-skill
compatibility: Requires draw.io desktop app CLI on PATH (macOS/Linux/Windows). Self-check step requires a vision-enabled model (e.g., Claude Sonnet/Opus); gracefully skipped if unavailable. Optional auto-layout (scripts/autolayout.py) needs Graphviz (dot).
platforms: [macos, linux, windows]
metadata: {"openclaw":{"requires":{"anyBins":["draw.io","drawio"]},"emoji":"📐","os":["darwin","linux","win32"],"install":[{"id":"brew-drawio","kind":"brew","formula":"drawio","bins":["drawio"],"label":"Install draw.io via Homebrew","os":["darwin"]},{"id":"brew-graphviz","kind":"brew","formula":"graphviz","bins":["dot"],"label":"Install Graphviz for optional autolayout.py","os":["darwin"],"optional":true}]},"hermes":{"tags":["drawio","diagram","flowchart","architecture","visualization","uml"],"category":"design","requires_tools":["drawio","draw.io"],"related_skills":["mermaid","excalidraw","plantuml"]},"author":"Agents365-ai","version":"1.19.2"}
---

# Draw.io Diagrams

## Overview

Generate `.drawio` XML files and export to PNG/SVG/PDF/JPG locally using the native draw.io desktop app CLI.

**Supported formats:** PNG, SVG, PDF, JPG — no browser automation needed.

PNG, SVG, and PDF exports support `--embed-diagram` (`-e`) — the exported file contains the full diagram XML, so opening it in draw.io recovers the editable diagram. Use double extensions (`name.drawio.png`) to signal embedded XML.

**Deliverable policy — image files only on explicit request.** The default deliverable is the `.drawio` file alone. Produce PNG/SVG/PDF/JPG *deliverables* only when the user explicitly asks for an image format ("PNGも出して", "export as SVG", "画像もください", …). The preview PNG used for vision self-check and the review loop (steps 4–6) is an **internal working file**: write it to a temp dir (the harness scratchpad or `mktemp -d`), never the user's output dir, and do not report it as a deliverable.

## When to use / when NOT to use

**Use this skill for:** polished, precise diagrams (architecture, network, strict UML, ERD), anything needing solid opaque fills, 10,000+ stock/branded shapes, swimlanes, or custom geometry, exported as editable PNG/SVG/PDF.

**Do NOT use it — route elsewhere — for:**
- A casual hand-drawn / whiteboard look → **excalidraw** or **tldraw**.
- Diagrams-as-code that live in git / render in Markdown → **mermaid** (general) or **plantuml** (UML).
- Freeform infinite-canvas sketching or freehand strokes → **tldraw**.
- **Data charts** (bar / line / pie / scatter, anything plotting quantities) → the **dataviz** skill (HTML/React/plotting libraries) or **mermaid** (`xychart-beta`, `pie`). draw.io has no data-driven chart primitives — hand-building bars from rectangles is slow, inaccurate, and unmaintainable. Tables/matrices ARE in scope (`references/tables.md`); numeric annotations on nodes/edges are fine as labels.

## Bundled resources

When the workflow references one of these, read it on demand — none of them need to be in context up front.

| File | Read it when |
|---|---|
| `references/diagram-types.md` | The user names a specific diagram type (ERD, UML class, sequence, architecture, ML/DL, flowchart) |
| `references/aws-architecture.md` | The diagram uses **AWS icons** (`mxgraph.aws4`) — or Azure/GCP icons, which share the external-bottom-label style. Icon label zones, spacing constants, port discipline, official VPC/AZ/subnet group styles. Read it BEFORE writing coordinates, not after something overlaps |
| `references/shapes.md` + `scripts/shapesearch.py` | The diagram needs a **specific shape** — a cloud icon (AWS/Azure/GCP), Cisco/Kubernetes/network symbol, UML/BPMN/ER/electrical/P&ID element — or any time you'd otherwise guess a `style=` string. `shapesearch.py "<keywords>"` returns the exact official style for 10k+ shapes |
| `scripts/aiicons.py` | The diagram involves an **AI/LLM brand** (OpenAI, Claude, Gemini, Mistral, Llama, HuggingFace, Ollama, LangChain, …) — `aiicons.py "<brand>"` returns a draw.io `image` style for the brand logo (lobe-icons via CDN; `--embed` to inline). draw.io has no built-in AI logos. See `references/shapes.md` → "AI / LLM brand logos" |
| `references/style-presets.md` | The user asks to learn / save / list / set-default / delete a style preset, or you've resolved an active preset and need the application rules |
| `references/tables.md` | The deliverable includes a **generic table** — comparison matrix, feature grid, RACI, decision matrix — standalone or embedded in a diagram (ERD entities keep the ERD preset) |
| `references/style-extraction.md` | You're inside the Learn flow and need the extraction procedure (called from `style-presets.md`) |
| `references/troubleshooting.md` | An export fails, vision rejects a PNG, or a rendering looks wrong |
| `scripts/repair_png.py` | After every `-e` PNG export — fixes draw.io's truncated IEND chunk (issue #8) |
| `scripts/encode_drawio_url.py` | The CLI is unavailable and you need a browser-fallback diagrams.net URL (`--edit` for an editable editor URL) |
| `references/autolayout.md` | The diagram is large or layout-heavy (dependency/call graph, code structure, >~15 nodes) and you want Graphviz to place nodes + route edges instead of hand-placing coordinates |
| `scripts/pyimports.py` · `jsimports.py` · `goimports.py` · `rustimports.py` | The user wants to visualize a **Python, JS/TS, Go, or Rust project** structure — extracts the import graph (transitive-reduced, optional `--group` containers, nested by sub-package) for autolayout |
| `scripts/pyclasses.py` | The user wants a **Python class hierarchy / class diagram** — extracts classes + inheritance edges (boxed by module with `--group`) for autolayout |
| `scripts/validate.py` | **Mandatory after every generated/edited `.drawio`, before any export.** Deterministic structural + layout lint: dangling edges, dup/reserved ids, broken parents, absolute-coordinate overlaps, container overflow/title-zone hits, icon label-zone collisions, clipped labels (CJK-aware), edges through nodes, edge corridors through icon label zones, bottom ports landing inside a bottom-labeled icon's label span (pinned or router-inferred), arrowheads landing on bends, stacked parallel edges, missing edge-label backgrounds |
| `scripts/renderlint.py` | **Mandatory after the draft export (step 4), when the CLI is available.** Lints the **actually rendered** geometry via an SVG export: real edge routes through nodes/labels, collinear stacked edges, measured label collisions, edge-edge crossings, arrowhead landing room. Catches what draw.io's runtime router does that the model XML can't show |

## Prerequisites

The draw.io desktop app must be installed and the CLI accessible:

**macOS sandbox / sandbox isolation note (e.g., codex.app):** In some sandboxed macOS environments, invoking the draw.io desktop CLI (even `drawio --version`) can crash the draw.io process or produce no output. If that happens, treat the CLI as **unavailable in this sandbox isolation** — do not keep retrying inside the sandbox. Prefer a **non-sandboxed host environment** (outside sandbox isolation) for any CLI export work, or use the browser fallback / XML-only outputs.

```bash
# macOS (Homebrew — recommended; CLI binary is `drawio`, not `draw.io`)
brew install --cask drawio
drawio --version

# macOS (full path if not in PATH)
/Applications/draw.io.app/Contents/MacOS/draw.io --version

# Windows
"C:\Program Files\draw.io\draw.io.exe" --version

# Linux
drawio --version
```

Install draw.io desktop if missing:
- macOS: `brew install --cask drawio` or download from https://github.com/jgraph/drawio-desktop/releases
- Windows: download installer from https://github.com/jgraph/drawio-desktop/releases
- Linux: download `.deb`/`.rpm` from https://github.com/jgraph/drawio-desktop/releases — **do not use snap** (AppArmor sandbox denies secrets/keyring on servers, causes crash)

## Workflow

Before starting the workflow, assess whether the user's request is specific enough. If key details are missing, ask 1-3 focused questions:
- **Diagram type** — which preset? (ERD, UML, Sequence, Architecture, ML/DL, Flowchart, or general)
- **Output format** — default deliverable is the `.drawio` file only. Do **not** ask whether they also want an image; export PNG/SVG/PDF/JPG only when the user has explicitly requested one (see Deliverable policy above).
- **Output location** — default is the user's working dir; honor any explicit path the user gives (e.g. "put it in `./artifacts/`"). Don't ask if they didn't mention one.
- **Scope/fidelity** — how many components? Any specific technologies or labels?

Skip clarification if the request already specifies these details or is clearly simple (e.g., "draw a flowchart of X").

**Step 0 — Resolve active preset.** Determine which (if any) user-defined style preset applies to this generation.

- Scan the user's message for a phrase that clearly names a style preset: "use my `<name>` style", "with my `<name>` style", "in `<name>` mode", "in the style of `<name>`". A bare `with <name>` does **not** count — "draw a diagram with redis" names a component, not a style. If a clear match is found → active preset = `<name>`.
- Else, check `~/.drawio-skill/styles/` for any file with `"default": true`. If found → active preset = that one.
- Else → no preset active; fall through to the built-in color/shape/edge conventions for the rest of the workflow.

Load the preset JSON from `~/.drawio-skill/styles/<name>.json`, falling back to `<this-skill-dir>/styles/built-in/<name>.json`. If the named preset exists in neither location, tell the user the name is unknown, list the available presets (user dir + built-in), and stop — do **not** silently fall back to defaults.

When a preset loads successfully, mention it in the first line of the reply: *"Using preset `<name>` (confidence: `<level>`)."* See `references/style-presets.md` → "Applying a preset" for how the preset changes color/shape/edge/font decisions.

1. **Check deps** — **resolve which name the binary has on this system** and use that name verbatim in every subsequent command in this workflow. Try in order: (a) `drawio --version` (the canonical name for Homebrew cask, jgraph `.deb`/`.rpm`, Arch AUR), (b) `draw.io --version` (older builds, some custom symlinks, some distro packages), (c) macOS `.app` direct: `/Applications/draw.io.app/Contents/MacOS/draw.io --version`, (d) Windows: `"C:\Program Files\draw.io\draw.io.exe" --version`. The first one that prints a version is your binary; remember the exact path/name and substitute it for `drawio` in every export command below. **Do not copy the example commands verbatim if your binary is named differently** — the examples use `drawio` only because it's the most common. On macOS-Homebrew, `drawio` is just a thin wrapper script that execs `/Applications/draw.io.app/Contents/MacOS/draw.io` — they run the same engine, so candidate (c) is only needed when the `drawio` wrapper is absent (e.g. the app was installed by drag-and-drop without the cask).
2. **Plan** — identify shapes, relationships, layout (LR or TB), group by tier/layer. **Write the coordinate plan before any XML**: a lane table of columns (x centers) and rows (y), plus reserved empty corridors for edges that must travel across the diagram (cross-cutting hubs like logging/monitoring get one dedicated corridor). Estimate label widths first — a fullwidth (CJK) char ≈ fontSize px, ASCII ≈ 0.6×fontSize — and derive shape sizes and pitches from them, not the other way round. For vendor-icon diagrams (AWS/Azure/GCP) apply the spacing constants in `references/aws-architecture.md`
3. **Generate** — write `.drawio` XML file to disk. Hand-place coordinates for small/styled diagrams. **For large or layout-heavy diagrams (dependency/call graphs, code structure, >~15 nodes), don't hand-place** — describe the graph as JSON and run `python3 <this-skill-dir>/scripts/autolayout.py graph.json -o <name>.drawio` to compute node positions + orthogonal edge routing via Graphviz (see `references/autolayout.md`). For a **Python / JS-TS / Go / Rust project**, the matching importer (`scripts/pyimports.py`, `jsimports.py`, `goimports.py`, or `rustimports.py`) extracts the import graph (transitive-reduced; add `--group` to box modules by sub-package, nested for deep trees) ready for autolayout; for a **Python class hierarchy**, `scripts/pyclasses.py` extracts classes + inheritance instead. **After generating any `.drawio`, the validate gate is mandatory**: run `python3 <this-skill-dir>/scripts/validate.py <name>.drawio`. It deterministically catches what vision review is unreliable at — node overlaps in absolute coordinates, container overflow/title-zone collisions, icon label-zone collisions, labels too big for their shape (CJK-aware), edges passing through nodes, stacked parallel edges, missing edge-label backgrounds. Fix **every** error and warning and re-run until it reports `0 error(s), 0 warning(s)` (max 3 fix cycles; a warning may be left standing only if you can state concretely why it is a false positive). **Precedence rule:** validate.py's corridor-based warnings (edges through nodes/labels) approximate routes as straight lines, but the real routes are chosen by draw.io's router — the step-4 renderlint gate measures them exactly. If renderlint comes back clean on the same spot, that IS the concrete false-positive justification: leave the validate warning standing and move on. Do not export a draft that hasn't passed this gate — vision self-check is the second line of defense, not the first. Default output dir is the user's working dir; if the user specified an output path or directory (e.g. `./artifacts/`, `docs/images/`), use that instead — `mkdir -p` the target dir first. This dir choice applies to the `.drawio` file and to step-7 image exports (if any); the step-4 preview PNG always goes to a temp dir instead.
4. **Export draft + render lint** — run CLI to produce a preview PNG. **Do NOT pass `-e`** at this step — the embedded `zTXt mxGraphModel` chunk it adds causes vision APIs (Claude included) to return 400 "Could not process image" in step 5. **Cap the preview width with `--width 2000` (not `-s 2`)** — Claude's vision API rejects images larger than 2576×2576px with "Unable to resize image — dimensions exceed the 2576x2576px limit", and `-s 2` on a medium-or-larger diagram easily overshoots that ceiling. Save the clean preview as `<name>.png` (single extension) **in a temp dir** (harness scratchpad or `mktemp -d`) — it's an internal working file for self-check and the review loop, not a deliverable, so it must not land in the user's output dir. Embedding and full-resolution scale are for the final export only (step 7).
   **Then run the render gate**: `python3 <this-skill-dir>/scripts/renderlint.py <name>.drawio`. It exports an SVG to a temp dir itself and lints the **actual rendered geometry** — the routes draw.io's runtime router really chose, which the model XML (and therefore validate.py) cannot see. It reports three severities, and the gate scales with diagram size:
   - **`warning:`** (edge through a node, line striking through label text — measured boxes, not estimates) — **must reach 0** regardless of diagram size; these are always fixable by rerouting or moving a node. Max 3 fix cycles.
   - **`note:`** (stacked collinear edges, label-label / label-node collisions, arrowhead landing on a bend) — on small/medium diagrams (≲30 nodes) fix them all; on large or auto-generated graphs, fix the worst offenders each cycle, drive the count down, and **state the residual count and why it stands** when you stop.
   - **`info:`** — aggregated edge-crossing counts (total + worst edges). Minimize via corridors and node moves; some crossings are unavoidable in dense graphs.

   Output is capped at 15 detail lines per severity (`--all` lists everything); the summary line always has full counts. Re-export the preview PNG once the gate is clean. Skip this gate only when the CLI is unavailable (browser fallback path).
5. **Self-check** — use the agent's built-in vision capability to read the exported PNG, catch obvious issues, auto-fix before showing user (requires a vision-enabled model such as Claude Sonnet/Opus). If reading the PNG returns a 400 / "Could not process image" error, you almost certainly exported with `-e` by mistake — re-export without `-e` and retry once. If it still fails, skip self-check and continue to step 6.
6. **Review loop** — show image to user, collect feedback, apply targeted XML edits, re-export, repeat until approved
7. **Final export — only if the user explicitly requested image formats.** If the user never asked for an image, **skip this step entirely**: the deliverable is the `.drawio` file alone; report its path and stop (the temp-dir preview is not a deliverable — don't copy it out or mention it as one). If image formats were requested, re-export the approved version to each of them. Use `-e` here (PNG/SVG/PDF) so the deliverable stays editable in draw.io; save as `<name>.drawio.png` to signal embedded XML. **For PNG with `-e`, run `python3 <this-skill-dir>/scripts/repair_png.py <name>.drawio.png` immediately after** — draw.io's CLI truncates the IEND chunk in `-e` PNG output (8 bytes missing), producing a corrupt file that vision APIs and strict PNG decoders reject (issue #8). Report file paths.

**If `drawio --version` crashes or prints nothing (common in restricted macOS sandbox isolation like codex.app):**
- Do not keep retrying CLI invocations inside the sandbox.
- Skip steps 4, 5, 6, and 7 (CLI export + PNG-based review) and use **Browser fallback** (`scripts/encode_drawio_url.py`) or deliver the `.drawio` XML only.
- If the user needs PNG/SVG/PDF outputs, ask them to run the export commands in a **non-sandboxed host environment** (outside sandbox isolation) and share the resulting files.

Escalation rule:
- If the binary exists on PATH (or known app path exists) but execution fails with abnormal exit, empty output, Electron startup failure, display/session error, or likely sandbox restriction, prefer one escalated retry before falling back.
- If the binary is missing entirely, do not escalate just to search more aggressively; go to install guidance or fallback.

### Step 5: Self-Check

After exporting the draft PNG, use the agent's vision capability (e.g., Claude's image input) to read the image and check for these issues before showing the user. If the agent does not support vision, skip self-check and show the PNG directly.

By this point the two deterministic gates (validate.py on the model, renderlint.py on the rendered SVG) have already caught the geometry class of bugs — vision's job is what they can't measure: overall balance and alignment rhythm, color contrast and tier consistency, a wrong icon glyph, labels that are technically unclipped but cramped, anything semantically off. The table below stays as the fallback checklist for when a gate was skipped (e.g. CLI unavailable).

**Important:** the draft PNG read here must have been exported **without** `-e`. Draw.io's `-e` flag emits a PNG with a truncated IEND chunk (8 bytes of type+CRC missing) that the Anthropic vision API rejects with 400 "Could not process image" (issue #8). The simplest fix for the preview step is to skip `-e` entirely; the final export in step 7 keeps `-e` and runs the repair snippet. If you see the 400 error here, re-export without `-e` and retry once; if it still fails (any other reason), skip self-check and proceed to step 6.

| Check | What to look for | Auto-fix action |
|-------|-----------------|-----------------|
| Overlapping shapes | Two or more shapes stacked on top of each other | Shift shapes apart by ≥200px |
| Clipped labels | Text cut off at shape boundaries | Increase shape width/height to fit label |
| Missing connections | Arrows that don't visually connect to shapes | Verify `source`/`target` ids match existing cells |
| Off-canvas shapes | Shapes at negative coordinates or far from the main group | Move to positive coordinates near the cluster |
| Edge-shape overlap | An edge/arrow visually crosses through an unrelated shape | Add waypoints (`<Array as="points">`) to route around the shape, or increase spacing between shapes |
| Stacked edges | Multiple edges overlap each other on the same path | Distribute entry/exit points across the shape perimeter (use different exitX/entryX values) |
| Line through label text | An edge strikes through a shape's bottom label or an edge label (text looks struck-through) | For icon labels: move the exit off bottom-center (0.25/0.75 or side). For edge labels: add `labelBackgroundColor=#ffffff` and shift the label along the edge |
| Label-label collision | Two labels (edge labels, or bottom labels of adjacent icons) overlap | Increase pitch between the shapes, wrap long labels with `&#xa;`, or shift edge labels apart along their edges |
| Empty oversized containers | A container (subnet/AZ/lane) drawn full-size but nearly empty | Shrink it to content + padding, or remove it — mirrored empty boxes are a layout bug, not notation |

- Max **2 self-check rounds** — if issues remain after 2 fixes, show the user anyway
- Re-export after each fix and re-read the new PNG

### Step 6: Review Loop

After self-check, show the exported image and ask the user for feedback.

**Targeted edit rules** — for each type of feedback, apply the minimal XML change:

| User request | XML edit action |
|-------------|----------------|
| Change color of X | Find `mxCell` by `value` matching X, update `fillColor`/`strokeColor` in `style` |
| Add a new node | Append a new `mxCell` vertex with next available `id`, position near related nodes |
| Remove a node | Delete the `mxCell` vertex and any edges with matching `source`/`target` |
| Move shape X | Update `x`/`y` in the `mxGeometry` of the matching `mxCell` |
| Resize shape X | Update `width`/`height` in the `mxGeometry` of the matching `mxCell` |
| Add arrow from A to B | Append a new `mxCell` edge with `source`/`target` matching A and B ids |
| Change label text | Update the `value` attribute of the matching `mxCell` |
| Change layout direction | **Full regeneration** — rebuild XML with new orientation |

**Rules:**
- For single-element changes: edit existing XML in place — preserves layout tuning from prior iterations
- For layout-wide changes (e.g., swap LR↔TB, "start over"): regenerate full XML
- Overwrite the same temp-dir `{name}.png` (no `-e`) each iteration — do not create `v1`, `v2`, `v3` files. `-e` is reserved for the final export in step 7.
- After applying edits, re-export and show the updated image
- Loop continues until user says approved / done / LGTM
- **Safety valve:** after 5 iteration rounds, suggest the user open the `.drawio` file in draw.io desktop for fine-grained adjustments

### Step 7: Final Export

Once the user approves:
- **No image format explicitly requested → no image export.** The deliverable is the `.drawio` file only; report its path. Do not export a PNG "just in case" and do not surface the temp-dir preview as a deliverable.
- If the user explicitly requested image formats (PNG, SVG, PDF, JPG), export to exactly those formats and report the paths of the `.drawio` source file and each exported image
- **Auto-launch:** offer to open the `.drawio` file in draw.io desktop for fine-tuning — `open diagram.drawio` (macOS), `xdg-open` (Linux), `start` (Windows)
- Confirm files are saved and ready to use

## Style Presets

A **style preset** is a named JSON file capturing a user's visual preferences (palette, shapes, font, edges). When active, it fully replaces the built-in color/shape conventions in this skill.

**Lookup order** when SKILL.md's Step 0 resolves a preset name:
1. `~/.drawio-skill/styles/<name>.json` — user presets (survive `git pull`)
2. `<this-skill-dir>/styles/built-in/<name>.json` — shipped built-ins (`default`, `corporate`, `handdrawn`)

Always lowercase the user-provided name before any file operation — the schema enforces lowercase.

**For everything else — Learn flow (extracting a preset from a file), management ops (list/default/delete/rename), application rules (color lookup, shape keywords, edges, fonts, extras, interaction with diagram-type presets), and validation — read `references/style-presets.md`.** It's only needed when the user invokes those flows or when an active preset must be applied to the current generation.

## Draw.io XML Structure

### File skeleton

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

### Shape types (vertex)

| Style keyword | Use for |
|--------------|---------|
| `rounded=0` | plain rectangle (default) |
| `rounded=1` | rounded rectangle — services, modules |
| `ellipse;` | circles/ovals — start/end, databases |
| `rhombus;` | diamond — decision points |
| `shape=mxgraph.aws4.resourceIcon;` | AWS icons |
| `shape=cylinder3;` | cylinder — databases |
| `swimlane;` | group/container with title bar |

For **vendor/branded icons** (AWS/Azure/GCP/Cisco/Kubernetes) and any non-trivial shape, don't guess the `shape=mxgraph.*` name — a wrong name renders as a blank box. Run `python3 <this-skill-dir>/scripts/shapesearch.py "<keywords>"` to get the exact official style + size, or see `references/shapes.md` for the hand-writable cheatsheet. For **AI/LLM brand logos** (OpenAI, Claude, Gemini, …), which draw.io has none of, use `python3 <this-skill-dir>/scripts/aiicons.py "<brand>"`. For **AWS services** specifically, `shapesearch.py` consults the official icon index first (`data/aws-icon-index.json`, built from the official Release 22 assets): querying an official name or short form (`"S3"`, `"IAM"`, `"Bedrock"`) returns the official name, category color and exact style. Use the returned style **unmodified** — `validate.py` errors on recolored icons and non-official group frames.

### Required properties

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

### Containers and groups

For architecture diagrams with nested elements, use draw.io's parent-child containment — do **not** just place shapes on top of larger shapes.

| Type | Style | When to use |
|------|-------|-------------|
| **Group** (invisible) | `group;pointerEvents=0;` | No visual border needed, container has no connections |
| **Swimlane** (titled) | `swimlane;startSize=30;` | Container needs a visible title bar, or container itself has connections |
| **Custom container** | Add `container=1;pointerEvents=0;` to any shape | Any shape acting as a container without its own connections |

**Key rules:**
- Add `pointerEvents=0;` to container styles that should not capture connections between children
- Children set `parent="containerId"` and use coordinates **relative to the container**

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

### Connector (edge)

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
- **Animated connectors:** add `flowAnimation=1;` to any edge style to show a moving dot animation along the arrow. Works in SVG export and draw.io desktop — ideal for data-flow and pipeline diagrams. Example: `style="edgeStyle=orthogonalEdgeStyle;flowAnimation=1;rounded=1;..."`
- **Always** include `rounded=1;orthogonalLoop=1;jettySize=auto` — these enable smart routing that avoids overlaps
- Pin `exitX/exitY/entryX/entryY` on every edge when a node has 2+ connections — distributes lines across the shape perimeter
- **Bottom-labeled shapes (all AWS/Azure/GCP icons): a bottom exit is only safe OUTSIDE the label span — which usually means don't use one.** The label is centered *under* the icon and often wider than it (`API Gateway` ≈ 77px under a 78px icon), so `exitX=0.25/0.75` strikes the text just like `0.5` does. Estimate the span first (ASCII ≈ 0.6×fontSize, CJK ≈ fontSize px/char): if the label exceeds ~half the icon width — true for most real service names — **use a side port** (`exitX=0/1;exitY=0.5`) and route down beside the icon. Bottom exits are for short labels (≤5 ASCII / ≤3 CJK chars) only. Entering the top (`entryY=0`) is always safe. **Leaving the edge unpinned does not avoid this** — when the two icons sit in a column, draw.io's router picks bottom-center on its own and strikes the label anyway; pin a side port explicitly. `validate.py` checks bottom ports against the estimated span (pinned ones, plus the bottom-center port it infers for an unpinned edge to a node directly below); `renderlint.py` verifies the rendered route. See `references/aws-architecture.md`.
- Add `<Array as="points">` waypoints when an edge must detour around an intermediate shape
- **Leave room for arrowheads:** the last bend must sit ≥20px from the target shape. If closer, the arrowhead overlaps the bend and looks broken. Fix by increasing node spacing or adding explicit waypoints. (Both gates enforce the same 20px rule: `validate.py` on the model-space waypoint→entry distance, `renderlint.py` on the rendered path — trailing straight run + arrowhead gap to the node border)

### Distributing connections on a shape

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

### Color palette (fillColor / strokeColor)

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

### Typography & spacing

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

### Title & legend

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

### Layout tips

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

## Export

### Commands

There are **two** export modes:

- **Preview / self-check** (step 4 of the workflow) — no `-e`. Output `diagram.png` **in a temp dir** (internal working file, never a deliverable). Required for vision self-check; using `-e` here triggers a 400 "Could not process image" error from the vision API (issue #8).
- **Final / deliverable** (step 7) — **only when the user explicitly requested an image format.** Pass `-e`. Output `diagram.drawio.png`. The embedded XML keeps the file editable in draw.io.

> All commands below write `drawio` as a placeholder for the binary you resolved in Step 1. If your binary is on PATH as `draw.io` (with dot — some older or distro-packaged installs), substitute `draw.io` throughout. If only the macOS `.app` or Windows `.exe` is available, use the full path variant shown a few lines down.

```bash
# Preview PNG (use this in step 4, before self-check) — NO -e, width-capped to stay under vision's 2576px ceiling
drawio -x -f png --width 2000 -o diagram.png input.drawio

# Final PNG (step 7, after user approval) — WITH -e, double extension
drawio -x -f png -e -s 2 -o diagram.drawio.png input.drawio

# macOS — full path (if not in PATH); preview / final variants
/Applications/draw.io.app/Contents/MacOS/draw.io -x -f png --width 2000 -o diagram.png input.drawio
/Applications/draw.io.app/Contents/MacOS/draw.io -x -f png -e -s 2 -o diagram.drawio.png input.drawio

# Windows
"C:\Program Files\draw.io\draw.io.exe" -x -f png -e -s 2 -o diagram.drawio.png input.drawio

# Linux (headless — requires xvfb-run; on servers add HOME and --disable-gpu)
export HOME=${HOME:-/tmp}
xvfb-run -a --server-args="-screen 0 1280x1024x24" \
  drawio -x -f png -e -s 2 -o diagram.drawio.png input.drawio --disable-gpu
# Running as root (CI / Docker)? Append --no-sandbox AT THE END (placing it earlier makes drawio treat it as the input filename)

# SVG export (final — -e is safe; SVG is text)
drawio -x -f svg -e -o diagram.svg input.drawio

# PDF export (final)
drawio -x -f pdf -e -o diagram.pdf input.drawio

# Custom output directory (e.g. CI artifacts dir) — create if missing, then export there
mkdir -p ./artifacts && drawio -x -f png -e -s 2 -o ./artifacts/diagram.drawio.png input.drawio
```

### Post-export PNG repair (required after `-e` PNG export)

draw.io CLI truncates the IEND chunk when emitting `-e` PNGs — the file ends with the 4-byte IEND length field but the `IEND` type + CRC (8 bytes) are missing. Result: vision APIs return 400 "Could not process image" and strict PNG decoders error out. SVG/PDF are unaffected.

Run this immediately after every `-e` PNG export:

```bash
python3 <this-skill-dir>/scripts/repair_png.py diagram.drawio.png
```

The script's `endswith(IEND)` guard makes it a no-op once draw.io fixes the bug upstream — safe to run unconditionally.

**Key flags:**
- `-x` — export mode (required)
- `-f` — format: `png`, `svg`, `pdf`, `jpg`
- `-e` — embed diagram XML in output (PNG, SVG, PDF) — exported file remains editable in draw.io. **Skip for the preview PNG used in step 5 self-check** — `-e` PNGs have a truncated IEND chunk that vision APIs reject (issue #8). For final PNG export, keep `-e` and run `scripts/repair_png.py` (see Post-export PNG repair). SVG/PDF unaffected.
- `-s` — scale: `1`, `2`, `3` (2 recommended for final PNG; do NOT use for the step-4 preview — see `--width`)
- `--width <px>` — target width in pixels (no short form; `-w` does **not** exist and silently breaks the input-file parser). Use `--width 2000` for the step-4 preview to keep the PNG under Claude's 2576×2576 vision ceiling. There's also a `--height <px>` flag for tall-narrow diagrams. Don't combine `--width` with `-s`.
- `-o` — output file path; accepts any directory (e.g. `./artifacts/diagram.drawio.png`) — `mkdir -p` the target dir first. Use `.drawio.png` double extension when embedding.
- `-b` — border width around diagram (default: 0, recommend 10)
- `-t` — transparent background (PNG only)
- `--page-index 0` — export specific page (default: all)

### Browser fallback (no CLI needed)

When the draw.io desktop CLI is unavailable, generate a client-side URL:

```bash
python3 <this-skill-dir>/scripts/encode_drawio_url.py input.drawio          # read-only viewer
python3 <this-skill-dir>/scripts/encode_drawio_url.py --edit input.drawio    # opens in the editor
```

Default prints a `https://viewer.diagrams.net/...#R…` viewer URL; `--edit` prints a `https://app.diagrams.net/...#create=…` URL that opens straight into the editable editor. Either way the diagram XML is `encodeURIComponent`-encoded, deflate-compressed, and base64'd into the URL fragment — the fragment (after `#`) is never sent to the server, so nothing is uploaded. The `encodeURIComponent` step is mandatory: without it, any diagram containing a literal `%` or non-ASCII (e.g. CJK) label makes the browser throw "URI malformed" and the diagram never opens.

Open the URL with `open "$URL"` (macOS) / `xdg-open "$URL"` (Linux). On **WSL2 / Windows**, `cmd.exe` drops the `#fragment` — write a `.url` shortcut file and open that instead (see `references/troubleshooting.md` → "WSL2 / Windows specifics").

### Fallback chain

When tools are unavailable, degrade gracefully:

| Scenario | Behavior |
|----------|----------|
| draw.io CLI missing, Python available | Use browser fallback (diagrams.net URL) |
| draw.io CLI missing, Python missing | Generate `.drawio` XML only; instruct user to open in draw.io desktop or diagrams.net manually |
| draw.io CLI crashes / no output in macOS sandbox isolation | Treat CLI as unavailable in-sandbox; use browser fallback / XML-only; ask user to run CLI exports in a non-sandboxed host environment |
| Vision unavailable for self-check | Skip self-check (step 5); proceed directly to showing user the exported PNG |
| Export fails (Chromium/display issues) | On Linux, retry with `xvfb-run -a`; if still failing, deliver `.drawio` XML and suggest manual export |
| Export fails on Linux server (headless) | Try in order: (1) `xvfb-run -a`, (2) append `--no-sandbox` at the very end if root, (3) add `--disable-gpu`, (4) `export HOME=/tmp`, (5) install apt deps (`libgtk-3-0 libnotify4 libnss3 libgbm1 libasound2t64` etc.), (6) fall back to [tomkludy/drawio-renderer](https://hub.docker.com/r/tomkludy/drawio-renderer) Docker (REST API for headless export) |

### Checking if drawio is in PATH

```bash
# Prefer the Homebrew / Linux-package binary name (no dot)
if command -v drawio &>/dev/null; then
  DRAWIO="drawio"
# Fall back to the dot-named binary (older installs, manual symlinks)
elif command -v draw.io &>/dev/null; then
  DRAWIO="draw.io"
# macOS .app bundle (binary inside the bundle keeps the dot)
elif [ -f "/Applications/draw.io.app/Contents/MacOS/draw.io" ]; then
  DRAWIO="/Applications/draw.io.app/Contents/MacOS/draw.io"
# WSL2: the CLI is the Windows desktop exe, reached via /mnt/c (note the space)
elif grep -qi microsoft /proc/version 2>/dev/null && [ -f "/mnt/c/Program Files/draw.io/draw.io.exe" ]; then
  DRAWIO="/mnt/c/Program Files/draw.io/draw.io.exe"
else
  echo "drawio not found — install from https://github.com/jgraph/drawio-desktop/releases (Homebrew: brew install --cask drawio)"
fi
```

On **WSL2 / native Windows**, opening exported files and browser-fallback URLs needs path conversion + a `.url`-file workaround (`cmd.exe` drops URL `#fragment`s) — see the "WSL2 / Windows specifics" section in `references/troubleshooting.md`.

## Common Mistakes

When something looks wrong (export fails, vision rejects a PNG, layout broken, edges misroute), see `references/troubleshooting.md` for a row-by-row mistake → fix table.

## Diagram Type Presets

When the user requests a specific diagram type, read `references/diagram-types.md` for the matching preset (shapes, edges, layout direction). Pick by user phrasing:

| User says | Section in `references/diagram-types.md` |
|---|---|
| "ER diagram", "schema diagram", "data model" | ERD |
| "UML class diagram", "class diagram" | UML Class |
| "sequence diagram", "interaction diagram", "lifeline" | Sequence |
| "architecture", "system diagram", "service diagram" | Architecture |
| "neural network", "model architecture", "ML diagram", "deep learning" | ML / Deep Learning Model |
| "flowchart", "decision tree", "process flow" | Flowchart |
| "comparison table", "matrix", "feature grid", "RACI" | — read `references/tables.md` instead |

The diagram-type preset sets **structural** style keywords. If a user style preset is also active (see `## Style Presets`), keep the structural keywords and layer color/font/edge/extras on top — read `references/style-presets.md` → "Interaction with diagram-type presets" for the merge rules.

## Agent compatibility

- Claude と Codex のどちらでも使える。同梱の Python スクリプト + draw.io desktop CLI で動く。
- sandbox 分離環境(Claude Code / codex.app 等)で CLI export がクラッシュする件は本文に harness 横断で対処法を記載済み(非 sandbox host での実行 / browser fallback / XML-only)。`python` と draw.io desktop が前提。
