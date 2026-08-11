---
name: drawio
version: 1.21.0
description: Use when the user requests diagrams, flowcharts, architecture diagrams, ER diagrams, UML / sequence / class diagrams, network topology, ML/DL model figures (Transformer/CNN/LSTM), mind maps, or any visualization. Also use proactively when explaining systems with 3+ components, complex data flows, or relationships that benefit from visual representation. Best suited when the diagram needs custom styling, rich shape vocabulary, swimlanes, or exportable images (PNG/SVG/PDF/JPG). Generates .drawio XML and exports locally via the native draw.io desktop CLI.
license: MIT
compatibility: Requires draw.io desktop app CLI on PATH (macOS/Linux/Windows). Self-check step requires a vision-enabled model (e.g., Claude Sonnet/Opus); gracefully skipped if unavailable. Optional auto-layout (scripts/autolayout.py) needs Graphviz (dot).
platforms: [macos, linux, windows]
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
| `references/xml-authoring.md` | **Before writing or editing any `.drawio` XML** (step 3) — file skeleton, shape/edge rules, containers & tint ladder, typography, title & legend, palette, layout & spacing constants |
| `references/export.md` | You need anything beyond the two canonical export commands below — full flag reference, macOS/Windows/Linux-headless/WSL2 variants, install & PATH detection, browser fallback, fallback chain |
| `references/diagram-types.md` | The user names a specific diagram type (ERD, UML class, sequence, architecture, ML/DL, flowchart) |
| `references/aws-architecture.md` | The diagram uses **AWS icons** (`mxgraph.aws4`) — or Azure/GCP icons, which share the external-bottom-label style. Icon label zones, spacing constants, port discipline, official VPC/AZ/subnet group styles. Read it BEFORE writing coordinates, not after something overlaps |
| `references/shapes.md` + `scripts/shapesearch.py` | The diagram needs a **specific shape** — a cloud icon (AWS/Azure/GCP), Cisco/Kubernetes/network symbol, UML/BPMN/ER/electrical/P&ID element — or any time you'd otherwise guess a `style=` string. `shapesearch.py "<keywords>"` returns the exact official style for 10k+ shapes |
| `scripts/aiicons.py` | The diagram involves an **AI/LLM brand** (OpenAI, Claude, Gemini, Mistral, Llama, HuggingFace, Ollama, LangChain, …) — `aiicons.py "<brand>"` returns a draw.io `image` style for the brand logo (lobe-icons via CDN; `--embed` to inline). draw.io has no built-in AI logos. See `references/shapes.md` → "AI / LLM brand logos" |
| `references/style-presets.md` | The user asks to learn / save / list / set-default / delete a style preset, or you've resolved an active preset and need the application rules |
| `references/tables.md` | The deliverable includes a **generic table** — comparison matrix, feature grid, RACI, decision matrix — standalone or embedded in a diagram (ERD entities keep the ERD preset) |
| `references/style-extraction.md` | You're inside the Learn flow and need the extraction procedure (called from `style-presets.md`) |
| `references/troubleshooting.md` | An export fails, vision rejects a PNG, or a rendering looks wrong |
| `scripts/repair_png.py` | After every `-e` PNG export — fixes draw.io's truncated IEND chunk |
| `scripts/encode_drawio_url.py` | The CLI is unavailable and you need a browser-fallback diagrams.net URL (`--edit` for an editable editor URL) |
| `references/autolayout.md` | The diagram is large or layout-heavy (dependency/call graph, code structure, >~15 nodes) and you want Graphviz to place nodes + route edges instead of hand-placing coordinates |
| `scripts/pyimports.py` · `jsimports.py` · `goimports.py` · `rustimports.py` | The user wants to visualize a **Python, JS/TS, Go, or Rust project** structure — extracts the import graph (transitive-reduced, optional `--group` containers, nested by sub-package) for autolayout |
| `scripts/pyclasses.py` | The user wants a **Python class hierarchy / class diagram** — extracts classes + inheritance edges (boxed by module with `--group`) for autolayout |
| `scripts/validate.py` | **Mandatory after every generated/edited `.drawio`, before any export — always with `--fix`.** Deterministic structural + layout lint: dangling edges, dup/reserved ids, broken parents, absolute-coordinate overlaps, container overflow/title-zone hits, icon label-zone collisions, clipped labels (CJK-aware), edges through nodes, edge corridors through icon label zones, bottom ports landing inside a bottom-labeled icon's label span (pinned or router-inferred), arrowheads landing on bends, stacked parallel edges, missing edge-label backgrounds. `--fix` repairs the mechanical subset in place and prints `fixed:` lines — only what survives needs your judgment |
| `scripts/renderlint.py` | **Mandatory after the draft export (step 4), when the CLI is available — always with `--fix`.** Lints the **actually rendered** geometry via an SVG export: real edge routes through nodes/labels, collinear stacked edges, measured label collisions, edge-edge crossings, arrowhead landing room. Catches what draw.io's runtime router does that the model XML can't show. `--fix` slides colliding edge labels to a measured clear slot by itself |

## Prerequisites

The draw.io desktop app must be installed and the CLI accessible — quick check: `drawio --version` (Homebrew: `brew install --cask drawio`). Install guidance, platform binary paths, and the PATH-detection snippet: `references/export.md`.

**macOS sandbox isolation note (e.g., codex.app):** in some sandboxed environments, invoking the CLI (even `--version`) crashes or produces no output. Treat the CLI as **unavailable in this sandbox** — do not keep retrying; prefer a non-sandboxed host for export work, or the browser fallback / XML-only outputs.

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

1. **Check deps** — **resolve which name the binary has on this system** and use that name verbatim in every subsequent command. Try in order: (a) `drawio --version`, (b) `draw.io --version`, (c) macOS `.app` direct: `/Applications/draw.io.app/Contents/MacOS/draw.io --version`, (d) Windows: `"C:\Program Files\draw.io\draw.io.exe" --version`. The first one that prints a version is your binary; substitute it for `drawio` in every export command (the examples use `drawio` only because it's the most common name). WSL2 and detection-snippet details: `references/export.md`.
2. **Plan** — identify shapes, relationships, layout (LR or TB), group by tier/layer. **Write the coordinate plan before any XML**: a lane table of columns (x centers) and rows (y), plus reserved empty corridors for edges that must travel across the diagram (cross-cutting hubs like logging/monitoring get one dedicated corridor). Estimate label widths first — a fullwidth (CJK) char ≈ fontSize px, ASCII ≈ 0.6×fontSize — and derive shape sizes and pitches from them, not the other way round. For vendor-icon diagrams (AWS/Azure/GCP) apply the spacing constants in `references/aws-architecture.md`
3. **Generate** — **read `references/xml-authoring.md` first** (file skeleton, edge/label rules, containers, typography, layout constants — writing to those rules the first time is what keeps the fix cycles short), then write the `.drawio` XML file to disk. Hand-place coordinates for small/styled diagrams. **For large or layout-heavy diagrams (dependency/call graphs, code structure, >~15 nodes), don't hand-place** — describe the graph as JSON and run `python3 <this-skill-dir>/scripts/autolayout.py graph.json -o <name>.drawio` to compute node positions + orthogonal edge routing via Graphviz (see `references/autolayout.md`). For a **Python / JS-TS / Go / Rust project**, the matching importer (`scripts/pyimports.py`, `jsimports.py`, `goimports.py`, or `rustimports.py`) extracts the import graph (transitive-reduced; add `--group` to box modules by sub-package, nested for deep trees) ready for autolayout; for a **Python class hierarchy**, `scripts/pyclasses.py` extracts classes + inheritance instead. **After generating any `.drawio`, the validate gate is mandatory**: run `python3 <this-skill-dir>/scripts/validate.py <name>.drawio --fix`. It deterministically catches what vision review is unreliable at — node overlaps in absolute coordinates, container overflow/title-zone collisions, icon label-zone collisions, labels too big for their shape (CJK-aware), edges passing through nodes, stacked parallel edges, missing edge-label backgrounds — and **`--fix` repairs the mechanical subset itself, in place** (label backgrounds, shape/container sizing, children out of title zones, bottom-label side-port moves, stacked-edge port distribution, arrowhead waypoint pullback, page translation, official AWS recolor), printing a `fixed:` line per repair. **Do not hand-edit anything a `fixed:` line already covered.** What survives `--fix` needs a layout/routing decision — that is your job: fix it and re-run until `0 error(s), 0 warning(s)` (max 3 fix cycles; a warning may be left standing only if you can state concretely why it is a false positive). **Precedence rule:** validate.py's corridor-based warnings (edges through nodes/labels) approximate routes as straight lines, but the real routes are chosen by draw.io's router — the step-4 renderlint gate measures them exactly. If renderlint comes back clean on the same spot, that IS the concrete false-positive justification: leave the validate warning standing and move on. Do not export a draft that hasn't passed this gate — vision self-check is the second line of defense, not the first. Default output dir is the user's working dir; if the user specified an output path or directory (e.g. `./artifacts/`, `docs/images/`), use that instead — `mkdir -p` the target dir first. This dir choice applies to the `.drawio` file and to step-7 image exports (if any); the step-4 preview PNG always goes to a temp dir instead.
4. **Export draft + render lint** — run the CLI to produce a preview PNG (canonical command under "Export" below). **Do NOT pass `-e`** at this step — the embedded `zTXt mxGraphModel` chunk it adds causes vision APIs (Claude included) to return 400 "Could not process image" in step 5. **Cap the preview width with `--width 2000` (not `-s 2`)** — Claude's vision API rejects images larger than 2576×2576px, and `-s 2` on a medium-or-larger diagram easily overshoots that ceiling. Save the clean preview as `<name>.png` (single extension) **in a temp dir** (harness scratchpad or `mktemp -d`) — it's an internal working file for self-check and the review loop, not a deliverable, so it must not land in the user's output dir. Embedding and full-resolution scale are for the final export only (step 7).
   **Then run the render gate**: `python3 <this-skill-dir>/scripts/renderlint.py <name>.drawio --fix`. It exports an SVG to a temp dir itself and lints the **actual rendered geometry** — the routes draw.io's runtime router really chose, which the model XML (and therefore validate.py) cannot see. **`--fix` slides colliding edge labels to a measured clear slot on their own route by itself** (re-exporting and re-checking internally, up to 3 rounds); when it prints `advice: no clear slot`, drop that inline label and let the legend carry the semantic — do not hunt for a spot by hand. It reports three severities, and the gate scales with diagram size:
   - **`warning:`** (edge through a node, line striking through label text — measured boxes, not estimates) — **must reach 0** regardless of diagram size; these are always fixable by rerouting or moving a node. Max 3 fix cycles of rerouting/nudging; **if a warning survives cycle 3, the layout is wrong, not the route** — stop nudging coordinates and make one structural change instead (relocate or regenerate the congested region, or drop the inline edge label and let the legend carry its semantic). A structural change resets the cycle count once.
   - **`note:`** (stacked collinear edges, label-label / label-node collisions, arrowhead landing on a bend) — on small/medium diagrams (≲30 nodes) fix them all; on large or auto-generated graphs, fix the worst offenders each cycle, drive the count down, and **state the residual count and why it stands** when you stop.
   - **`info:`** — aggregated edge-crossing counts (total + worst edges). Minimize via corridors and node moves; some crossings are unavoidable in dense graphs.

   Output is capped at 15 detail lines per severity (`--all` lists everything); the summary line always has full counts. Re-export the preview PNG once the gate is clean. Skip this gate only when the CLI is unavailable (browser fallback path).
5. **Self-check** — use the agent's built-in vision capability to read the exported PNG, catch obvious issues, auto-fix before showing user (requires a vision-enabled model such as Claude Sonnet/Opus). If reading the PNG returns a 400 / "Could not process image" error, you almost certainly exported with `-e` by mistake — re-export without `-e` and retry once. If it still fails, skip self-check and continue to step 6.
6. **Review loop** — show image to user, collect feedback, apply targeted XML edits, re-export, repeat until approved
7. **Final export — only if the user explicitly requested image formats.** If the user never asked for an image, **skip this step entirely**: the deliverable is the `.drawio` file alone; report its path and stop (the temp-dir preview is not a deliverable — don't copy it out or mention it as one). If image formats were requested, re-export the approved version to each of them. Use `-e` here (PNG/SVG/PDF) so the deliverable stays editable in draw.io; save as `<name>.drawio.png` to signal embedded XML. **For PNG with `-e`, run `python3 <this-skill-dir>/scripts/repair_png.py <name>.drawio.png` immediately after** — draw.io's CLI truncates the IEND chunk in `-e` PNG output (8 bytes missing), producing a corrupt file that vision APIs and strict PNG decoders reject. Report file paths.

**If `drawio --version` crashes or prints nothing (common in restricted macOS sandbox isolation like codex.app):** do not keep retrying CLI invocations inside the sandbox. Skip steps 4–7 (CLI export + PNG-based review) and use the browser fallback (`scripts/encode_drawio_url.py`) or deliver the `.drawio` XML only; if the user needs PNG/SVG/PDF, ask them to run the export in a non-sandboxed host environment. Full degradation table: `references/export.md` → "Fallback chain".

Escalation rule:
- If the binary exists on PATH (or known app path exists) but execution fails with abnormal exit, empty output, Electron startup failure, display/session error, or likely sandbox restriction, prefer one escalated retry before falling back.
- If the binary is missing entirely, do not escalate just to search more aggressively; go to install guidance or fallback.

### Step 5: Self-Check

After exporting the draft PNG, use the agent's vision capability (e.g., Claude's image input) to read the image and check for these issues before showing the user. If the agent does not support vision, skip self-check and show the PNG directly.

By this point the two deterministic gates (validate.py on the model, renderlint.py on the rendered SVG) have already caught the geometry class of bugs — vision's job is what they can't measure: overall balance and alignment rhythm, color contrast and tier consistency, a wrong icon glyph, labels that are technically unclipped but cramped, **an edge striking a container/group title** (neither gate models title-band text), anything semantically off. The table below stays as the fallback checklist for when a gate was skipped (e.g. CLI unavailable).

**Important:** the draft PNG read here must have been exported **without** `-e` (see step 4). If you see a 400 error here, re-export without `-e` and retry once; if it still fails (any other reason), skip self-check and proceed to step 6.

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

## Export

Canonical commands — `drawio` stands for the binary resolved in step 1:

```bash
# Preview PNG (step 4) — NO -e, width-capped for vision, output to a temp dir
drawio -x -f png --width 2000 -o <tmpdir>/diagram.png diagram.drawio

# Final PNG (step 7, only if the user requested an image) — WITH -e, then repair the IEND chunk
drawio -x -f png -e -s 2 -o diagram.drawio.png diagram.drawio
python3 <this-skill-dir>/scripts/repair_png.py diagram.drawio.png

# SVG / PDF (final) — -e is safe for both
drawio -x -f svg -e -o diagram.svg diagram.drawio
drawio -x -f pdf -e -o diagram.pdf diagram.drawio
```

Everything else — the full flag reference (`-b`, `-t`, `--page-index`, `--height`, …), macOS/Windows/Linux-headless/WSL2 command variants, the browser fallback (`encode_drawio_url.py`), and the degradation chain when tools are missing — is in `references/export.md`.

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
- sandbox 分離環境(Claude Code / codex.app 等)で CLI export がクラッシュする件の対処は Prerequisites と `references/export.md`(Fallback chain)に記載。`python` と draw.io desktop が前提。
