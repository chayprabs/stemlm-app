# stemLM Diagram Compiler Research

A later-executable plan for least-resource, compiler-owned STEM figures.

This document is the research deliverable. It does not implement product code. It specifies what a later implementer must build: a compact figure spec the chatbot emits, and a local Manifest V3 extension compiler (no LLM) that owns layout and produces aesthetically clean, no-overwriting, clean-numbering, human-quality diagrams and circuits across stemLM's subjects.

**Majority scheme name:** Declarative Scene Spec (DSS), compiled by the stemLM Figure Compiler (SFC) through a Shared Layout Kernel (SLK).

**Leftover share:** specialized Family Compilers that still emit the same Scene IR and still go through SLK. None of the leftover families are "unsupported" or "later."

**AI-generated images are rejected.** Raster "screenshot the figure" is rejected. Full TeX / CircuiTikZ as a server or in-extension typesetter is rejected. Asking the model to emit complete SVG coordinates with tighter prompt rules is rejected.

---

## Second-pass ledger (2026-08-21)

This block is a critic pass over the document below. **The previous recommendation remains the primary recommendation.** Declarative Scene Spec + Shared Layout Kernel, five engines `plot` / `scene` / `graph` / `table` / `netlist` (`type=circuit`), leftover Family Compilers, keep `@diagram` envelope, no JSON capsule, no LLM in the compiler, AI images rejected, elkjs rejected for v1, jcampconverter rejected, CircuitJS rejected. A contender architecture is recorded in §26; it does **not** meet the replacement bar.

Heading numbers §0–§20 are unchanged. New material is this ledger, in-place `Second-pass (2026-08-21)` notes, extra family rows in §9.13, extra leftover methods in §11.17+, and operational appendices §21–§28.

### What was verified and found solid

- Product shape: MV3 overlay, no server, no login, one ` ```stemlm ` capsule, `stemlm-protocol.txt` via the **+** button, no LLM after capture. Subjects in `types.ts` match the doc.
- Envelope: keep `@diagram` … `@enddiagram` and `@end`. JSON capsule rejection is in-tree (`protocol.ts`).
- Root defect: model-chosen coordinates. `pathLineSegments` in `svg-present.ts` and `diagram-quality.ts` is M/L-only (`/([MLml])\s*([^MLml]*)/g`). Post-nudge cannot see cubics. More SVG prompt rules will not fix the screenshot class.
- `sanitize.ts` strips `foreignObject` / `image` / `script` / remote href; do not lift that ban.
- Bounds: `DIAGRAM_BOUNDS` step 300×165, solution 340×185, print 480×275. `PRINT_DIAGRAM_MM` 125×72.
- Mermaid timeout 12_000 in both `mermaid.ts` and `resolve-diagram.ts`. `htmlLabels: false`.
- PDF path is vector SVG in a print iframe; no html2canvas. Print CSS hides `.katex-html` and unclips MathML (`pdf.ts`).
- `DiagramRenderer` degrades to `<pre class="slm-diagram-fallback">`. Unknown `type=` collapses to `svg` today (see corrections).
- Hybrid-π completeness regex: `HYBRID_PI_REQUIRED_LABELS = ['rpi','gm','re','rc']` plus ≥2 of `B,C,E`. Flags; cannot draw.
- Five-engine split + leftover Family Compilers is the right majority/leftover cut. Coverage must not stop at 75%. Electrical leftovers (hybrid-π, op-amp, phasor, Bode-class, Smith, …) are the subject's identity.
- Weave arXiv:2607.03835 **exists** (2026-07-04). Steal Sugiyama + round-trip connectivity; do not ship elkjs.
- elkjs@0.12.0 `elk-worker.min.js` is 1,595,334 B min / 464,174 B gzip (jsDelivr + local gzip). Reject stands.
- jcampconverter@12.5.5 npm license is **CC-BY-NC-SA-4.0**. Reject stands.
- `@dagrejs/dagre` MIT. Live 3.1.1 `dist/dagre.min.js` 48,956 B / 17,112 B gzip.

### What was corrected (was → now / evidence)

| Claim | Was | Now | Evidence |
|---|---|---|---|
| CSP already allows WASM | §3: `script-src 'self' 'wasm-unsafe-eval'` in the content-script world | **`wxt.config.ts` declares no CSP.** Chrome MV3 **default** for extension pages is `script-src 'self'; object-src 'self';` and **disables WASM**. `'wasm-unsafe-eval'` is opt-in, not default. Compiler would run in a **content-script** isolated world (not `extension_pages`); still no `eval`/`Function`. WASM-in-content-script on Chrome 116+ is unverified. | `wxt.config.ts`; https://developer.chrome.com/docs/extensions/reference/manifest/content-security-policy |
| Spec grammar already parses | §6.1 could be read as if `type=plot` already works | **Today it does not.** `parseDiagramOpen` is `/type\s*=\s*([a-z]+)/i`; non-mermaid → `'svg'`. Dotted names (`chem.smiles`) capture only `chem`. `isMalformedDiagram` requires `<svg`. Then `resolveDiagramSvg` cannot compile → `<pre>`. | `parser.ts` 260–264, 314–321; `types.ts` `DiagramType`; `resolve-diagram.ts`; `DiagramRenderer.tsx` |
| `expr-eval` is CSP-safe | §7.1 “tiny, CSP-safe” | Default `.evaluate()` is an interpreter (OK). `.toJSFunction` uses **`new Function`**. **CVE-2025-12735** on 2.0.2 (unmaintained 2019). **v1 = in-house Pratt parser.** Optional `expr-eval-fork@3.0.3` with allowlists, never `toJSFunction`. | `cdn.jsdelivr.net/npm/expr-eval@2.0.2/dist/bundle.js` (`toJSFunction`); CERT VU#263614 |
| elkjs license | EPL-2.0 | npm **`EPL-2.0 OR GPL-3.0-or-later`**. Dual includes GPL. Extra reject reason. Size still ~1.6 MB / 464 kB gzip. | registry.npmjs.org/elkjs/latest; jsDelivr `elk-worker.min.js` 1,595,334 B |
| SmilesDrawer size | 54 KB gzip | **2.4.1** `smiles-drawer.min.js` **197,128 B min / 59,345 B gzip (~58 kB)**. License MIT confirmed. | jsDelivr + local gzip |
| WaveDrom size | ~17 KB gzip | **3.6.2** `wavedrom.min.js` 40,027 B / **14,667 B gzip**; unpkg min 83,768 B / 18,019 B gzip. | jsDelivr + local gzip |
| dagre size | Bundlephobia v3.0.0 37.8 kB / 13 kB gzip | Keep class; live **3.1.1** min **48,956 B / 17,112 B gzip**. | jsDelivr + local gzip |
| kiwi size | ~10–15 KB | **0.4.4 BSD-3-Clause.** No published `kiwi.min.js` in the tarball (jsDelivr default path may 404). `solver.js` 32,209 B / 6,834 B gzip. Size class “small” stands; do not cite a missing min file. | jsDelivr package listing |
| OpenChemLib | ~1.1 MB | **9.25.0 BSD-3-Clause.** `openchemlib.js` 1,102,769 B **plus** `resources.json` 1,351,963 B (~2.4 MB useful). | jsDelivr |
| Phase 2 “Manhattan/ELK” | §15 said ELK | **Contradiction with §7.1.** Phase 2 is Manhattan + `@dagrejs/dagre` + in-house orthogonal stubs. Not elkjs. | this file §7.1 vs §15 |
| KaTeX overlay already print-ready | §8.2–8.3 as if Report accepts overlays | **Today Report and DiagramRenderer inject SVG strings only.** Overlay descriptors are a **later contract**. Print CSS *will* show MathML *if* overlay HTML is in the iframe. Print iframe does **not** load KaTeX CSS. | `Report.tsx` `ResolvedDiagram`; `pdf.ts` `printStyles`; `DiagramRenderer.tsx` |
| `presentSvg` is only a nudger | §1.4 table abbreviated | Also: theme, marker normalize, `prefixSvgIds` (**`Math.random()`** — byte-unstable), font compensation, clamp, LaTeX-in-`<text>` decode. Last mile stays; layout must not depend on random ids. | `svg-present.ts` `presentSvg` |

### What was added

- Parser-vs-spec implications (§21) — do not implement parser in this goal.
- Worked leftover specs: hybrid-π, Newman, McCabe, SFD/BMD, MO ladder (§23); plot §6.2 kept and deepened.
- Label-placer edge cases, numbering, step-sync, theme, sanitizer, failure modes, eval retarget (§22, §16 notes).
- Compact +button / protocol catalog still specified here, not pasted into `core-protocol.md` (§12.8, §28).
- Missing families across all subjects + adjacent visual STEM (stats, control, astronomy-as-physics, biochem, materials, biomed, aerospace, hydrology, …) as §9.13 with leftover/refuse methods §11.17–§11.22. No family left as “later.” “The model will sketch SVG” is not a catering method.
- Ranked library options with 2026-08-21 sizes/licenses (§24). `ladder` argued as a *candidate* sixth engine; the named five stay (§25).
- Contender architectures that **lose** the replacement bar (§26). DSS+SLK is not replaced.
- Taste / card-density rules (§22.8).

### What is still untrusted

- Exact gzip of Vega / JSXGraph core / `@hpcc-js/wasm-graphviz` / RDKit-JS (CDN HEAD timed out or not downloaded). Class (multi-MB or canvas) is enough to keep them out of v1.
- npm package name for tscircuit schematic-symbols (`@tscircuit/schematic-symbols` 404). GitHub repo is MIT; steal paths only after a named tarball is license-checked.
- Whether Chrome 116+ **content-script isolated world** can instantiate WASM without `wasm-unsafe-eval` in the extension manifest. Do not plan Typst/Graphviz/RDKit WASM until measured in this overlay.
- Whether `expr-eval-fork@3.0.3` is free of `new Function` on every path (prefer in-house anyway).
- Weave's *runtime* dependency on elkjs vs a dependency-free file (abstract says “single dependency-free file”; earlier pass said it uses elkjs). Steal the certificate idea either way.
- Model compliance with a spec protocol (token estimates in §2.5 are order-of-magnitude, not a measured Gemini run).
- labella.js unmaintained since 2017 — algorithm trusted, package optional.
- SmilesDrawer stereo fights on isomeric SMILES at card size — OCL remains the fallback after an `eval` audit, not v1 default.

### Recommendation stands

The replacement bar was **not** met. No contender beat DSS+SLK on all of: least AI tokens, no overwrite, clean numbering, human textbook look, MV3 no-server, no LLM in the compiler, vector PDF, leftover-family coverage, MIT-compatible deps, with several families where DSS+SLK fails and the contender succeeds. The previous recommendation remains.

---

## 0. Executive recommendation

Stop treating diagrams as a prompting problem. The model is a terrible layout engine and an expensive one. stemLM already has the right *envelope* (one ` ```stemlm ` capsule, `@diagram` … `@enddiagram`, a compiler in the extension with no LLM) and the wrong *payload* (inline SVG whose coordinates Gemini invented).

The new path:

1. The **+ button** still attaches `stemlm-protocol.txt` and still asks for one capsule.
2. Each visual step's `@diagram` body becomes a **typed compact spec** (function, netlist, SMILES, scene parts, table cells). The model names *what exists this step*. It never chooses pixels.
3. A **local compiler** in the extension expands the spec into a Scene IR (boxes, strokes, labels with anchors, numbering), runs a shared layout kernel (grid + linear constraints + 4-position label placer + leaders), themes, sanitizes, and emits SVG for the panel and the existing vector PDF path.
4. About three quarters of all STEM figures share five engines (`plot`, `scene`, `graph`, `table`, `netlist`). The remaining quarter are **named Family Compilers** (Newman, Fischer, chair, hybrid-π template, Smith chart, McCabe–Thiele staircase, Feynman, Minkowski, SFD/BMD, SmilesDrawer, WaveDrom, commutative diagrams, …). Each leftover family has an explicit catering method in §11. Coverage does not stop at 75%.

The motivating failure — a compiled kinematics graph with \(\alpha(t)=1.5t^{2}-2t\) sitting on the stroke — is the class this architecture exists to make impossible. The compiler samples the function, measures the equation, and parks the label in a collision-free slot. The model never sends `x="142" y="88"`.

---

## 1. Current stemLM diagram pipeline

### 1.1 What stemLM is

stemLM is a Manifest V3 browser extension that turns Gemini into a guided, step-by-step STEM study workspace beside the chat. It covers Physics, Chemistry, Math, Biology, CS, and Electrical / Mechanical / Civil / Chemical engineering, plus a General fallback. There is no server and no login. The study panel, KaTeX formulas, diagrams, and vector PDF all run in the browser.

The product promise that diagrams must satisfy: each step's figure reflects **the state at that step** (circuit after a source is killed, DP table after one cell fill, mechanism after one arrow, beam after one section cut). The figure must look like something a careful human would draw in a textbook, not like an LLM sketch.

### 1.2 The + button and `stemlm-protocol.txt`

Clicking the small stemLM button next to Gemini's send control does two things (`src/protocol/builder.ts`, `src/lib/file-inject.ts`):

1. Attaches a file named `stemlm-protocol.txt`. The file is the **core protocol** (`src/protocol/core-protocol.md`, or the ultra variant `core-protocol.ultra.md`) concatenated with **every subject playbook** (`src/protocol/playbooks.ts` → `getUniversalPlaybook()`). There is no subject picker. The model infers `@meta subject:` from the problem and applies that section.
2. Inserts a short **composer stub**, not a wall of instructions: follow the attached file; reply in one fenced `stemlm` block ending `@end`.

The attached file exists so the composer stays clean and so the model has the full grammar plus every playbook. A compact reminder is also pasted. Subject-specific diagram walls (`STEP_DIAGRAM_REQUIREMENT`, `CHEMISTRY_DIAGRAM_REQUIREMENT`, `PHYSICS_DIAGRAM_REQUIREMENT`, … in `builder.ts`) exist because Gemini otherwise skips figures or emits text-only SVG. Those walls currently teach **how to draw SVG**, which is the wrong lesson.

### 1.3 The capsule the model returns

The model is instructed to return **one** fenced code block tagged `stemlm`, nothing else. Grammar (`src/protocol/protocol.ts`, `core-protocol.md`):

```
@meta … @endmeta
@step … @diagram type=svg|mermaid … @enddiagram … @endstep
@solution … @end
```

JSON was **previously avoided on purpose**. `protocol.ts` states the reason: answers are full of LaTeX backslashes and inline SVG, both of which constantly break strict JSON. The closing `@end` also doubles as the streaming-complete signal for the capture loop.

`@diagram` is currently one of two payloads:

- `type=svg` — raw `<svg viewBox="0 0 W H">` of `line/path/circle/rect/polygon/polyline/text/g` plus `<defs><marker>`. Protocol demands prefer `0 0 300 180` (max ~360×220), ≥5 primitives + ≥3 labels (≥8 on schematics), `stroke-width 2`, `font-size 13–15`, labels offset ~10px, never on a line, axes with units. No `width/height/script/foreignObject/image/external refs`.
- `type=mermaid` — CS flow/sequence/state only; quoted node labels; no `(){}` `` ` `` in labels.

The protocol and every playbook tell the model to **draw**: circuits, FBDs, rays, Lewis/line-angle, MO ladders, SFD/BMD, PFDs, DP tables. The model is the layout engine.

### 1.4 Parser, quality auditor, resolver, sanitizer, presenter, renderer

No LLM runs after the capsule hits the page.

| Stage | File | Job |
|---|---|---|
| Capture | `src/content/controller.ts` | Stability-based scrape of the assistant message; complete capsule if `@end` present, else ~1.5 s of unchanged text |
| Parse | `src/protocol/parser.ts` | Tolerant line grammar; `parseDiagramOpen` is `/type\s*=\s*([a-z]+)/i` and maps anything other than `mermaid` to `'svg'` (`DiagramType` is only `'svg' \| 'mermaid'`). Dotted names (`chem.smiles`) capture only `chem`. `isMalformedDiagram` requires `<svg` or a mermaid header. **A `type=plot` spec is not compiled today** — it warns `malformed_diagram`, then `resolveDiagramSvg` fails graphics detection, then `DiagramRenderer` shows `<pre>`. That is a later parser change, not a current capability. |
| Quality | `src/protocol/diagram-quality.ts` | Visual-dense detection; coverage (≥40% of steps, ≥55% Electrical); completeness vs named components; viewBox aspect; **label collision** and **label-over-graphic** via AABB + distance-to-segment |
| Resolve | `src/lib/resolve-diagram.ts` | SVG path: normalize → sanitize → `presentSvg`. Mermaid path: lazy `import('mermaid')` (12 s timeout) → same finalize |
| Sanitize | `src/lib/sanitize.ts` | DOMPurify SVG profile; strips `script`, `on*`, remote href, `foreignObject`, `image`; strips `width/height` on the root |
| Present | `src/lib/svg-present.ts` | Theme strokes to light/dark; prefix ids; normalize markers; decode a handful of LaTeX macros in `<text>`; **nudge labels off wires**; spread overlapping labels 5 px; clamp to viewBox; scale fonts if the card shrinks the viewBox |
| Bounds | `src/lib/diagram-bounds.ts` | step 300×165, solution 340×185, print 480×275 |
| Render | `src/components/DiagramRenderer.tsx` | Injects sanitized SVG into the step card; on failure shows the raw source in a `<pre>` |
| PDF | `src/lib/pdf.ts` | Hidden iframe print; diagrams resolved as **vector SVG** at print profile; math as MathML; no html2canvas |

The compiler is already local and already has no LLM. That part of the original idea is correct and stays. What it compiles is the defect.

### 1.5 Why a compiler-without-LLM was the original idea

The original design (capsule as universal code, extension as compiler, beautiful display with no model in the renderer) is sound:

- Gemini is good at *naming* laws, components, and algebraic forms.
- Gemini is bad at *placing* them.
- A deterministic compiler can be tested, themed, and printed.
- The same compiled SVG serves the panel and the PDF.

The mistake was putting **coordinates** in the universal code. SVG is a display backend, not a figure language. Mermaid is a partial exception: the model emits topology, mermaid owns layout — which is why CS flowcharts look cleaner than EE schematics today.

---

## 2. Current failure: overwrite, numbering, viewBox, and AI resource cost

### 2.1 The motivating compiled graph

The attached screenshot (Gemini capsule compiled by today's pipeline) is a kinematics plot:

- Axes: \(\alpha\) (rad/s²) vs \(t\) (s), origin implicit, ticks 130 and 10.
- A blue curve from the origin to a point at (10, 130).
- A dashed drop from that point to both axes.
- The equation \(\alpha(t)=1.5t^{2}-2t\) is drawn **on top of the curve**.

A human would put the equation in a quiet corner (above-left of the peak, or in the upper-left of the plot frame), keep the dashed guides, and never let type sit on the stroke. The compiler did not prevent this because it was not given a function. It was given a path plus a `<text>` whose `(x,y)` Gemini chose.

This is the **root defect: model-chosen coordinates.** Label overwrite, labels on curves, messy numbering, cramped viewBox, and high token cost are all consequences of that one decision.

### 2.2 Why salvage-after-the-fact cannot fix it

`presentSvg()` already tries to be a mini layout engine:

- `nudgeLabelsAwayFromGraphics` walks `<text>` vs line/polyline/polygon/path **M/L segments**.
- `spreadOverlappingLabels` separates labels whose anchors are within 5 px.
- `clampLabelsToViewBox` pulls overflow back inside.

Three structural reasons this cannot meet the clean-output bar:

1. **Curves are invisible to the nudger.** `pathLineSegments` in both `svg-present.ts` and `diagram-quality.ts` only parses `M/L/m/l`. A kinematics graph is almost always a cubic/quadratic `C/Q/S` path. The equation sitting on that path is **not detected**. The screenshot is this case. Raising the prompt's "offset 10px" line does not help: the model still places the text, and the salvage never sees the stroke.
2. **Nudge has no semantics.** It does not know that a string matching `α(t)=…` is a curve label that belongs in a corner, that `130` is an ordinate that belongs at the tick, or that `t (s)` is an axis name that belongs beyond the arrowhead. A 6 px perpendicular hop can move a label off a wire onto another wire, or off a curve into a worse overlap.
3. **Salvage cannot invent missing geometry.** Hybrid-π fragments missing \(R_C\) and the collector, ray diagrams with \(F\) not at the focal length, right angles that are 73°, foci of ellipses in the wrong place — none of these are label-nudge bugs. They are "the model drew the object wrong." Completeness regexes in `diagram-quality.ts` (`HYBRID_PI_REQUIRED_LABELS`, `extractMentionedComponents`) can *flag* a missing `R_C`. They cannot draw it.

`diagram-quality.ts` already knows the failure class (`diagram_label_over_graphic`, `diagram_label_collision`, `diagram_bad_viewbox`, `diagram_missing_axes`, `diagram_incomplete`). The auditor is a linter on a drawing the model should not have been asked to make.

### 2.3 Messy numbering

Today numbering is whatever `<text>` Gemini emits:

- Circuit designators (`R1`, `R_C`) appear twice, or not at all, or on the wire.
- Atom numbers on a mechanism are random and collide with bond strokes.
- Peak numbers on an NMR sit on the trace.
- Stream numbers on a PFD float in space.
- Equation tags `(1)`, `(2)` in a figure do not match `@formula` order.

A compiler can own a numbering pass (see §8.4). A prompt cannot.

### 2.4 Cramped viewBox

The protocol *prefers* `0 0 300 180` so the step card (`DIAGRAM_BOUNDS.step` = 300×165) does not overflow. Models respond by packing 14 labels into 180 px of height, shrinking font-size below the requested 13–15, or overflowing the viewBox so `clampLabelsToViewBox` stacks them on the frame. Humans facing the same card would: drop a legend, use two stacked plots, or hide secondary labels. The compiler can make those choices. The model, told "≥3 labels" and "≥5 primitives," packs.

### 2.5 AI resource cost of raw SVG

Approximate token cost per figure (Gemini, one step):

| Payload | Typical tokens | What you pay for |
|---|---|---|
| Full SVG schematic (hybrid-π, markers, 12 `<text>`, viewBox, stroke attrs) | 1,500–4,000 | Coordinates, repeated style, marker XML |
| Full SVG plot (`d="M 12.4 88.1 L 13.1 87.6 …"`) | 400–1,200 | Sampled path the compiler could compute |
| Protocol SVG rules (every inject, `builder.ts` walls) | 400–900 extra instruction tokens | Teaching layout to a model that will still fail |
| Equivalent DSS spec (see §6 examples) | 40–120 | Names, values, topology, highlight |

Conservative ratio: **8–20× fewer diagram tokens**, plus the SVG-instruction walls in the attached protocol can shrink because the model is no longer a draftsman. Multiplied across 5–12 steps, this is the largest token win available in stemLM without touching `@body` quality.

AI image generation would be worse: image tokens or a second model, no step-sync, no theme, no vector PDF, no sanitizer, no guarantee the numbers match `@body`. It is rejected in §4.

### 2.6 Failure class catalog (what "worse and worse" looks like)

| Class | Example | Why SVG-from-model causes it |
|---|---|---|
| Label on curve | Screenshot \(\alpha(t)\) | Model places `<text>` at a "middle of the path" heuristic |
| Label on wire | \(I_1\) on a phasor shaft | Same |
| Label–label collision | \(R_C\) over \(V_{CC}\) | Packed viewBox, no collision graph |
| Missing symbol | hybrid-π without \(R_C\) | Model economizes strokes; audits catch some, cannot repair |
| Wrong geometry | lens with \(F\) not at \(f\); 45° light-cone at 38° | Coordinates hallucinated |
| Fake 3D | saddle looking like a bowl; washer with no hole | No projection compiler |
| Legend-only | "Symbols: R C L" as text list | Protocol asks for ≥3 labels; model satisfies with a key |
| Theme clash | black strokes on dark panel | Partially fixed by `presentSvg`; not a layout fix |
| Mermaid quote breakage | `A["v = u+at"]` vs `A[v = u+at]` | Already documented; keep mermaid only for CS flow |
| Inconsistent step-sync | vertex jumps every step on a graph | Layout re-randomized; compiler must seed by id |

---

## 3. Design constraints that any recommendation must obey

| Constraint | Implication |
|---|---|
| MV3 content-script overlay, Shadow DOM, MIT license, **no server** | Everything ships in the zip. No CircuiTikZ cloud. No Python schemdraw. No RDKit server. |
| CSP: **not declared in this repo** | `wxt.config.ts` has no `content_security_policy`. Chrome's documented MV3 **default** for extension pages is `script-src 'self'; object-src 'self';`, which **disables WebAssembly** (https://developer.chrome.com/docs/extensions/reference/manifest/content-security-policy, fetched 2026-08-21). `'wasm-unsafe-eval'` is an **opt-in** you may add (it is the documented *minimum*, not the default). The figure compiler would run in the **content-script overlay** (isolated world on gemini.google.com), which is not `extension_pages`; content scripts still cannot `eval` / `new Function`. WASM-in-content-script on Chrome 116+ is **unverified** — do not plan Typst/Graphviz/RDKit WASM as v1. Expression parsers must be recursive-descent (**in-house Pratt**; not `Function(fn)`; not unpatched `expr-eval@2.0.2` — see §7.1). |
| Vector PDF via print of HTML (`src/lib/pdf.ts`) | Primary figure output is **SVG** (plus HTML/KaTeX overlays). Canvas/WebGL (Chart.js, uPlot, 3Dmol, Plotly gl) rasterize or vanish. |
| `sanitize.ts` strips `foreignObject` and `image` | KaTeX HTML **inside** SVG is dead. Math-on-figure uses an HTML overlay *beside* the SVG (Khan Graphie pattern), or SVG `<text>` for short ids. Do not lift the `foreignObject` ban. |
| Panel bounds | step 300×165, solution 340×185, print 480×275. Compiler targets these, not 800×600 dashboards. |
| MIT | **No GPL.** CircuitJS1 is GPLv2 — cannot bundle. ChemDoodle Web SVG export is proprietary — cannot bundle. |
| Capsule delimiter grammar | Keep `@diagram` … `@enddiagram`. Do not make the *capsule* JSON. Inner specs are line-oriented `key: value` (see §6). |
| Step-sync | Spec describes state **after this move**. `highlight:` names what changed. Layout of unchanged ids must be stable across steps. |
| Least AI resource | Model emits topology/values, not paths. Protocol text teaches the spec, not SVG craft. |

---

## 4. Explicit rejection of AI images (and other dead ends)

### 4.1 AI image generation is not a solution

It is rejected for every subject and every leftover family.

- Resource cost is higher than SVG (image generation tokens or a second model).
- Output is raster: PDF would not be vector; theme (light/dark) would require a second generate; sanitizer cannot extract structure.
- Numbers, subscripts, and IEEE symbols will be wrong. Models draw "a circuit-like picture," not \(r_\pi\) with the correct pins.
- Step-sync is impossible: eight images of "the same circuit with \(R_C\) highlighted" will be eight different drawings.
- Overwrite and numbering are worse, not better.
- stemLM's no-server, no-login, Gemini-only path has no licensed image model in-extension.

Raster "screenshot a headless TeX box" is the same rejection: not vector-in-panel unless re-vectorized, and TeX does not run in MV3.

### 4.2 Other rejected majority paths

| Path | Why it dies |
|---|---|
| **Tighter SVG prompt rules** | The current protocol already specifies viewBox, font-size, 10 px offset, marker XML, "never on a line." The screenshot still happened. Criterion 4 fails if the model still places pixels. |
| **JSON capsule** | Already rejected in-tree: LaTeX and nested quotes break JSON. A figure spec that is itself JSON-inside-`@diagram` is allowed only as a last resort; the recommended inner grammar is line-oriented (same family as `@quickcheck` `q:`/`a:`). |
| **Full TeX / TikZ / CircuiTikZ in the extension** | No TeX engine in MV3 at acceptable size. Typst WASM is multi-megabyte plus fonts and is still a typesetter, not a STEM-figure compiler for 300×165 cards. |
| **Server-side TeX** | Contradicts no-server. Even if someone later added a server, criterion 4 still requires an extension compiler. |
| **CircuitJS / Falstad** | GPLv2 vs stemLM MIT. GWT blob. Coordinate-based UI, not a spec compiler. |
| **schemdraw / lcapy** | Python. |
| **Plotly / Chart.js / uPlot as the plot compiler** | Canvas or multi-MB. Wrong aesthetic (dashboard, not textbook). PDF raster. |
| **Mafs / JSXGraph as the majority DSL** | APIs are JS/React, not a model-emittable spec. Interactive chrome. |
| **Vega-Lite as majority** | Best declarative *chart* grammar; still JSON-fragile; weak at equation-on-plot, FBD, circuits, chemistry. Ranked alternative #3, not the recommendation. |
| **Penrose (CMU)** | Constraint optimization, WASM, MathJax, nondeterministic convergence, wrong latency for step cards. Steal the *idea* (constraints), not the runtime. |
| **Graphviz WASM as majority** | Excellent DAGs (~614 KB gzip). No plots, no circuits, no chem. Optional later for leftover graphs. |
| **RDKit-JS / Ketcher** | 8–26 MB WASM. Unshippable in an overlay. SmilesDrawer (54 KB gzip, MIT, SvgDrawer) is the chem structure compiler. |
| **Keep mermaid for everything** | Wrong glyph set for FBD, hybrid-π, Newman, spectra, SFD/BMD. Keep it for CS flow/sequence/state. |

---

## 5. Majority common scheme: Declarative Scene Spec + Shared Layout Kernel

A single scheme will not cover 100% of STEM figures. A single *kernel* can, if specialized families compile **into** it.

### 5.1 The split

**Majority (~75–85% of figures students actually see in stemLM subjects):** five engines that share one Scene IR and one layout kernel.

| Engine | `type=` | What the model emits | What the compiler does |
|---|---|---|---|
| **plot** | `plot` | Function(s) or data, domain, axis names/units, named points, equation label, peaks, shade | Sample (CSP-safe expr parser), axes/ticks, place eq **off** the curve, labella-style 1D peak packing |
| **scene** | `scene` | Named parts, forces, rays, supports, geometric relations (not pixels) | Template + kiwi constraints; FBD isolate-one-body; optics axis+F+2F; Mohr; Minkowski 45° cone |
| **graph** | `graph` (and keep `mermaid` for CS flow) | Nodes, edges, edge kinds (activate/inhibit/flow), ranks | mermaid (already in tree) + `@dagrejs/dagre` layered layout (MIT, 13 kB gzip) + in-house orthogonal stubs; SBGN-ish arrows; stable ids |
| **table** | `table` | Cells, headers, highlight, spans | Grid metrics, KaTeX in cells as HTML overlay or SVG text, pivot shading |
| **netlist** | `circuit` | Devices, connectivity, values, optional coarse grid slots, highlight | IEEE 315 glyphs, Manhattan route, VCC-top/GND-bottom, designators above/values below |

**Leftover (~15–25%):** Family Compilers that know a textbook stereotype (Newman projection, hybrid-π canvas, Smith chart, McCabe staircase, Feynman, chair, Fischer, WaveDrom, commutative-diagram grid, unit cell, …). Each leftover compiler **outputs Scene IR** (or SVG that then enters `presentSvg`) and **uses SLK for labels/theme/bounds**. None skip the no-overwrite contract. Catalog in §11.

**Second-pass (2026-08-21) — keep the five named.** `ladder` (MO/CFT/Jablonski/QM/nuclear) and `chem.smiles` are *volume-high leftovers*, not a sixth/seventh majority engine in this document. An implementer may promote `ladder` after measuring homework mix; until then the named five stay so the evolution is visible. Argument and counter-examples: §25.

### 5.2 Scene IR (the common language)

After a family compiler runs, everything is a scene:

```
Scene
  frame: target aspect, padding
  nodes[]: { id, kind, bbox, ports[], glyph }
  strokes[]: { id, kind: line|polyline|cubic|arc, points, semanticColor }
  labels[]: { id, text | katex, anchorId, slotHint: N|E|S|W|NE|…, protected: bool, numberKind? }
  highlights[]: ids
  numbers[]: { kind: eq|component|atom|peak|stream, id, n }
```

SVG is a **backend**. The quality auditor of the future checks "node `R_C` exists," not whether `<text>R_C</text>` appeared in model SVG.

### 5.3 Shared Layout Kernel (SLK) — always, no LLM

Pipeline after Scene IR exists:

1. **Frame.** Fit `DIAGRAM_BOUNDS[profile]`. Pad 8–12 user units. Expand viewBox rather than shrink fonts below 12.
2. **Grid.** Integer cells for circuit/scene; plot uses a data→pixel affine.
3. **Linear constraints (kiwi.js / Cassowary).** `label.gap ≥ 10`, `VCC.y < GND.y`, `in.x < out.x`, everything inside the frame.
4. **Label placer (the actual overwrite fix).**
   - Yoeli **4-position** (N/E/S/W or NE/NW/SE/SW, ranked) for point features.
   - Reject any candidate whose bbox is within `gap = max(6, 0.55·fontSize)` of a stroke. Stroke collection **must include cubics** (sample `C/Q/S` to polylines). Today's M/L-only collector is why the screenshot survived.
   - If no 4-pos works: **leader line** to the nearest free slot (straight, then orthogonal "po"); leaders may not cross.
   - 1D labels (axis ticks, NMR peaks, SFD abscissae): **labella.js** VPSC.
   - Last resort: 50-sweep simulated annealing (Christensen energy: label–label + label–anchor + label–stroke + leader-cross + off-viewBox). Deterministic seed from scene hash so step-sync does not jitter.
   - If still unsatisfiable: **fail the diagram** (show spec source in the existing fallback `<pre>`), do not emit an overlap. Clean failure beats a lying figure.
5. **Numbering pass.** See §8.4.
6. **Theme.** Semantic colors (`neutral|accent|muted|danger`) mapped by existing `themeSvgTree`. Families never emit `#000`.
7. **Markers.** One compiler-owned arrowhead. Stop asking the model for `<defs><marker>`.
8. **KaTeX overlay for real math.** Short ids (`R1`, `N`, `F`) stay SVG `<text>`. Real math (`$\alpha(t)=1.5t^{2}-2t$`) is an HTML/KaTeX overlay positioned from the label slot (panel and print iframe already load KaTeX). Not `foreignObject`.
9. **presentSvg + sanitize.** Last mile stays. Compiler SVG is still sanitized (XSS via label text, bugs). Timeout budget: reuse mermaid's 12 s.

### 5.4 Why this is the majority scheme and not five unrelated products

Plots, FBDs, graphs, tables, and circuits look different, but they share: a frame, strokes, labels that must not hit strokes, numbering, theme, bounds, PDF. Building five isolated libraries would re-implement collision five times and still miss cubics. Building one kernel means the screenshot-class bug is fixed **once**.

Human aesthetic is encoded in the kernel + glyph sets, not in Gemini:

- Horizontal labels, never rotated except 90° axis names.
- Signal left→right, high potential top, ground bottom.
- Axes: name + units + ticks; no chartjunk; no "Symbols:" legend.
- Direct labels on objects (curve name beside the curve, in a free slot), not a color key.
- Junction dots where wires join; hops where they cross; no four-way ambiguity.
- One highlight set per step (what changed).

---

## 6. Recommended spec: keep `@diagram`, change the payload

### 6.1 Envelope (do not replace)

Keep the capsule delimiter grammar. The later implementer extends `DiagramType` in `src/protocol/types.ts` and `parseDiagramOpen` in `parser.ts`.

**Second-pass (2026-08-21) — current vs planned (do not implement in this goal):**

- **Today:** `parseDiagramOpen` (`parser.ts` ~260) is `/type\s*=\s*([a-z]+)/i`. Only `mermaid` stays mermaid; every other capture, including `plot`, `scene`, `graph`, `table`, `circuit`, `chem`, collapses to `'svg'`. A dotted family `type=chem.smiles` captures **`chem` only** (the `.` ends `[a-z]+`). `isMalformedDiagram` then requires `<svg` in the body, so a line-oriented spec is warned `malformed_diagram` and still stored. `resolveDiagramSvg` treats it as SVG, sanitize may wrap leftover text in an empty `<svg>`, `svgMarkupHasGraphicShapes` is false, `DiagramRenderer` shows the spec in `<pre>`. Unknown types do **not** already compile.
- **Required later:** type token `[a-z][a-z0-9]*(?:[.-][a-z0-9]+)*` so `plot`, `chem.smiles`, `sfd-bmd` survive; **stop collapsing** unknown types to `'svg'`; `isMalformedDiagram` per family (schema, not `<svg>`); unknown/unsatisfiable still fail soft to the existing `<pre>` fallback *after* a real compile attempt, not because the type was erased.

```
@diagram type=<family>
key: value
key: value
@enddiagram
```

Inner grammar rules (concrete, not TBD):

- One `key: value` per line. Value is the rest of the line (so values may contain colons).
- Nested lists: a key with no value, then indented `- item` lines (two spaces). Parser already understands indentation-free blocks; the implementer adds a 2-space list rule **only inside `@diagram`**.
- Math stays `$…$` / `$$…$$`. No nested `@` markers (the capsule parser would confuse them).
- `highlight: id,id` names Scene ids.
- `caption:` optional, becomes `<figcaption>` as today.

**Do not** put JSON in the capsule. **Do not** put YAML as the capsule. A family that truly needs a matrix (ICE, DP) uses row lines (`I: 1, 3, 0`), not JSON arrays of arrays.

### 6.2 Worked rewrite of the screenshot (plot engine)

**Today (model SVG, ~400–800 tokens, label on curve).**

**Tomorrow:**

```
@diagram type=plot
fn: 1.5*t^2 - 2*t
var: t
domain: 0 10
xlabel: t (s)
ylabel: \alpha (rad/s^2)
point: 10, 130
point_label: 130
drop: both
eq: \alpha(t)=1.5t^{2}-2t
eq_slot: NE
@enddiagram
```

Compiler: parse expr with **in-house Pratt** (not `Function`; not unpatched expr-eval@2.0.2 — see §7.1); sample 80–200 points with extra samples near the right end **and** near |f'| spikes; draw axes with ticks at 0 and 10 / 0 and 130; dashed drop to (10,130); measure KaTeX of `eq`; 4-position around the curve bbox starting at NE; reject any slot within gap of the sampled polyline (**cubics must be sampled — M/L-only is the screenshot bug**); place **HTML/KaTeX overlay**, not SVG `<text>` and not `foreignObject`. Token cost ~50. Overwrite impossible unless the kernel is buggy — and then tests fail, not students.

**Second-pass deepen (same family, more keys the implementer will need):**

```
@diagram type=plot
fn: 1.5*t^2 - 2*t
var: t
domain: 0 10
samples: adaptive
xlabel: t (s)
ylabel: \alpha (rad/s^2)
point: 10, 130
point_label: 130
drop: both
eq: \alpha(t)=1.5t^{2}-2t
eq_slot: NE
highlight: point
@enddiagram
```

Extra plot keys (all compiler-owned layout): `fn2:` second series; `data:` x,y pairs when the model must not emit a closed form; `logx:` / `logy:` Bode-class; `shade:` a b under; `asymptote:` x=c or y=mx+k; `poles:` / `zeros:` for Bode/Nyquist/root-locus; `peaks:` ppm,int,mult for NMR (axis inverted); `eq_slot: auto` default. If `fn:` fails to parse → failed figure, not a guessed polyline. Two series: each `eq:` is 4-positioned independently; they may not share a slot. Card density: at 300×165 drop minor ticks, keep 2–4 major ticks, one equation, at most one highlight. Print 480×275 may restore minor ticks.

### 6.3 Circuit spec (netlist engine)

```
@diagram type=circuit
std: ieee
V1: n_in 0 DC 12
R1: n_in n_a 4k
R2: n_a 0 6k
RL: n_a 0 2k
probe: Va=n_a
highlight: R2
@enddiagram
```

Hybrid-π is **not** a free netlist. It is a leftover **template** so Gemini cannot omit \(R_C\) (see §11.8). The template still emits Scene IR.

### 6.4 Chemistry structure (Family Compiler → Scene IR)

```
@diagram type=chem.smiles
smiles: CC(=O)Oc1ccccc1C(=O)O
number_atoms: false
annotate: carbonyl=C2
@enddiagram
```

SmilesDrawer `SvgDrawer` owns 2D coordinates. SLK owns extra annotations.

### 6.5 Scene spec (FBD)

```
@diagram type=scene
kind: fbd
body: block
incline_deg: 30
force: mg down weight
force: N normal+
force: f_k up_incline
axes: x along_incline, y normal
highlight: T
@enddiagram
```

### 6.6 Table spec (ICE)

```
@diagram type=table
kind: ice
species: N2, H2, NH3
I: 1, 3, 0
C: -x, -3x, +2x
E: 1-x, 3-3x, 2x
highlight_row: C
@enddiagram
```

### 6.7 Graph spec

```
@diagram type=graph
rankdir: LR
node: A macromolecule hexokinase
node: B simplechem glucose
edge: B A consumption
edge: A C production
edge: ATP A catalysis
highlight: A
@enddiagram
```

### 6.8 Escape hatch

`@diagram type=svg` remains parseable so old capsules and eval corpora still render. The **protocol stops asking for it**. A repair/follow-up line: "convert this figure to a spec; do not emit SVG path coordinates." Raw SVG is not a catering method for leftover families.

`@diagram type=mermaid` remains for CS flow/sequence/state.

### 6.9 Completeness moves from SVG-text regex to spec membership

`extractMentionedComponents` today greps `@body` and then greps `<text>` in the SVG. After the switch, the auditor checks that every mentioned `R_C`, `r_π`, `g_m` exists as a **device or label id in the spec** (and therefore in Scene IR). Hybrid-π template *always* contains `RC`; a missing `RC:` key is `diagram_incomplete` **before draw**, or the template fills a default and warns.

---

## 7. Recommended compiler architecture (extension, no LLM)

```
capsule @diagram
    → parse family + spec (parser.ts)
    → family compiler (plot | scene | graph | table | netlist | leftover)
    → Scene IR
    → SLK (frame, grid, kiwi, label placer, numbering, theme, markers)
    → SVG string + optional KaTeX overlay descriptors
    → sanitizeSvg → presentSvg
    → DiagramRenderer (panel) and resolveDiagramSvg('print') (PDF)
```

Dispatch lives in `resolve-diagram.ts` beside the existing mermaid branch. Lazy `import()` per engine, same as mermaid, so a Math-only session does not load SmilesDrawer or dagre.

**No LLM in this pipeline.** If the spec is malformed: `slm-diagram--failed` + spec source. If compile throws or exceeds 12 s: same. Never a blank skeleton that looks like success.

### 7.1 Library matrix (what to add, what not)

| Piece | Choice | License | Size class | Notes |
|---|---|---|---|---|
| Expr parser | **in-house Pratt / recursive-descent (v1 default).** Optional `expr-eval-fork@3.0.3` (MIT) with function allowlists if the in-house parser slips | MIT | in-house: tiny; expr-eval@2.0.2 bundle 51 kB / 10.5 kB gzip (**do not ship 2.0.2**) | **Second-pass (2026-08-21):** `expr-eval@2.0.2` `.evaluate()` is an interpreter (no `Function` on that path) but `.toJSFunction` is `new Function` (CSP-hostile). **CVE-2025-12735** / CERT VU#263614: RCE via functions in the evaluation context. Unmaintained since 2019. Not mathjs (huge). Never `Function(fn)`. |
| Plot sampling | in-house | MIT | tiny | Adaptive + pole detection. Steal function-plot's *idea*, not the lib (eval/CSP). |
| Axes | in-house or d3-axis modular | ISC | tiny | |
| Constraints | `@lume/kiwi` | BSD-3-Clause (npm `@lume/kiwi@0.4.4`) | **Second-pass:** no `kiwi.min.js` in the published tarball (jsDelivr default path may 404). `dist/solver.js` 32,209 B / 6,834 B gzip; sources sum ~47 kB unminified. Size class remains “small.” Bundle ESM modules; do not cite a missing min file | Linear packing |
| 1D labels | labella.js **algorithm**; package optional | Apache-2.0 (`labella@1.1.4`) | `labella.min.js` 22,541 B / 6,795 B gzip | Peaks, number lines, SFD x. Package **unmaintained since 2017** — steal VPSC, do not depend on Twitter/labella remaining on npm |
| 2D labels | in-house 4-pos + leaders | MIT | tiny | Do not depend on unmaintained d3-labeler; copy the algorithm |
| Graph layout | mermaid (already lazy) + **`@dagrejs/dagre`** | MIT + MIT | mermaid already in the zip (`mermaid@11.15.0`; `mermaid.core.mjs` 48 kB loader, full `mermaid.min.js` 3.3 MB if pulled as one file). `@dagrejs/dagre@3.1.1` `dist/dagre.min.js` is **48,956 B min / 17,112 B gzip** (jsDelivr + local gzip 2026-08-21). Bundlephobia **v3.0.0** was 37.8 kB min / 13 kB gzip — same size class, older version. Layered DAGs, pedigrees, block diagrams, PFDs, SBGN-lite | Ports are weaker than ELK. In-house orthogonal stubs cover IEEE rails. Do **not** ship elkjs as the majority engine — see the size correction below |
| elkjs (rejected for v1) | do not add | **EPL-2.0 OR GPL-3.0-or-later** (npm `license` field, elkjs@0.12.0, 2026-08-21). Dual includes GPL — extra reject on top of size | **Re-measured 2026-08-21:** jsDelivr `lib/elk-worker.min.js` **1,595,334 B min / 464,174 B gzip**; `elk-worker.js` 4,788,969 B; npm unpacked **8,046,232 B**. Bundlephobia elkjs@0.10.0 415.6 kB gzip is the same class. That is not a 53 kB add. **Do not ship.** Leftover port-aware graphs (PFD, SBGN, analog nets) are catered by `@dagrejs/dagre` + in-house orthogonal stubs, stealing Sugiyama ideas from Weave/netlistsvg without the GWT worker | A later size-budgeted opt-in is only allowed after dagre+stubs fail a measured eval — it is not the catering method in this document. Even then, the **GPL-3.0-or-later** dual option must be legal-reviewed (prefer remaining on MIT dagre) |
| Circuit glyphs | in-repo IEEE 315 set (~30 symbols) | MIT (ours); paths may be borrowed from CC0/MIT sets | tiny | Steal paths from tscircuit schematic-symbols if license-clean; do not adopt tscircuit React stack |
| Molecules | **smiles-drawer** SvgDrawer | MIT (`smiles-drawer@2.4.1`) | **197,128 B min / 59,345 B gzip (~58 kB)** (jsDelivr + local gzip 2026-08-21). Previous “54 KB gzip” was slightly low | Default. `chroma-js` is a dependency. OpenChemLib 9.25.0 `openchemlib.js` **1,102,769 B** + `resources.json` **1,351,963 B** (~2.4 MB useful, BSD-3-Clause) only after `eval` audit, for stereo fights |
| Timing | WaveDrom | MIT (`wavedrom@3.6.2`) | `wavedrom.min.js` **40,027 B / 14,667 B gzip**; `wavedrom.unpkg.min.js` 83,768 B / 18,019 B gzip | Digital leftover. Previous “~17 KB gzip” matches the unpkg gzip class; cite the IIFE min (40 kB / 14.7 kB) when bundling |
| Math labels | KaTeX overlay (already in) | MIT | already | |
| Sanitize/theme/PDF | existing | — | — | Last mile unchanged |

**Do not add:** plotly, vega/vega-lite (majority), chart.js, uplot, mafs, jsxgraph (majority), cytoscape (canvas), rdkit-js, ketcher, circuitjs, @penrose/core, typst WASM, @hpcc-js/wasm-graphviz (v1), 3Dmol, ChemDoodle, **elkjs** (1.595 MB `elk-worker.min.js` / 464 kB gzip; npm license **EPL-2.0 OR GPL-3.0-or-later**; not v1), **jcampconverter** (npm v12.5.5 is **CC-BY-NC-SA-4.0**, incompatible with stemLM MIT), **expr-eval@2.0.2** (CVE-2025-12735 + `toJSFunction`/`new Function`), function-plot (eval deps), netlistsvg (pulls elkjs).

JSXGraph remains a **ranked alternative** for leftover Euclidean constructions if the in-house `scene` geom compiler proves too thin. It is not the majority DSL.

---

## 8. Compiler display contract (panel + vector PDF)

This is the contract a later implementer tests against. The model does not appear in it.

### 8.1 What the compiler guarantees

1. **No overwrite.** No label bbox within `max(6, 0.55·fontSize)` of a stroke, including sampled cubics. No two non-protected label bboxes overlap. Unsatisfiable → failed figure, not a lying one.
2. **Clean numbering.** Unique visible ids. Component designators in IEEE slots (id above symbol, value below). Peak numbers packed in 1D above ticks. Atom numbers from the chem compiler. Stream numbers on PFD arrows. Equation callouts in a figure use the same `(n)` as `@formula` order in the capsule.
3. **Human aesthetic.** Horizontal labels; IEEE/IEC glyphs as flagged; L→R signal; VCC top / GND bottom; axes with names+units+ticks on plots; no "Symbols:" legend; ≤6 value labels on a step card unless the family is a table; one highlight set.
4. **Bounds.** Compiled viewBox aspect fits step 300×165 / solution 340×185 / print 480×275 via existing `computeDisplaySize`. If the scene is too dense, the compiler splits (Bode mag/phase already stacked) or drops secondary labels, rather than shrinking below 12 px.
5. **Theme.** `data-stemlm-theme` light/dark using existing maps. Semantic strokes.
6. **Sanitize.** Always `sanitizeSvg` then `presentSvg`. No `foreignObject`, no `image`, no scripts, no remote href.
7. **Vector PDF.** Same SVG + KaTeX HTML overlays in the print iframe. No rasterization. Print profile 480×275, `PRINT_DIAGRAM_MM` 125×72 as CSS cap.
8. **Step-sync stability.** Nodes with the same id keep the same relative slot across steps; highlight restyles, it does not re-layout from noise.
9. **Degrade.** Compile throw / timeout / unsatisfiable labels → existing failed figure UI with spec source.

### 8.2 Panel

`DiagramRenderer` continues to inject SVG. Overlay labels are sibling HTML inside `figure.slm-diagram`, positioned in user units converted through the same display scale (`getDisplayScale` / `computeDisplaySize`). Shadow DOM already has KaTeX CSS for `@formula`.

**Second-pass (2026-08-21):** today `DiagramRenderer` has **no overlay sibling** — only `dangerouslySetInnerHTML` of the SVG string. The overlay contract is later work. Until it exists, equation labels must either be SVG `<text>` (lossy for `\alpha(t)=…`) or the screenshot-class bug is only half-fixed.

### 8.3 Vector PDF

`pdf.ts` already resolves diagrams at print profile and inlines SVG. Overlay descriptors must be resolved **before** `renderToStaticMarkup` of `Report`, as HTML next to the SVG, so print sees MathML/KaTeX the same way it sees step formulas. Do not snapshot canvas.

**Second-pass (2026-08-21):** `Report.tsx` `ResolvedDiagram` injects **SVG only**. `printStyles()` hides `.katex-html` and unclips `.katex-mathml` but **does not `@import` KaTeX CSS** — step formulas already work because `rehype-katex` emits MathML. Overlay HTML **will** print as native MathML *if* it is in the iframe. If overlays are omitted from `Report`, print loses `eq:` labels. That is an implementer checklist item, not a current capability.

### 8.4 Numbering systems (compiler-owned)

| Kind | Rule | Owner |
|---|---|---|
| Equation tags | `(1)…(n)` in `@formula` order; figure callouts reference those ids | Capsule numbering pass |
| Circuit designators | Model **names** `R1`; compiler **places** them. Missing id → next free `R{n}` | netlist compiler |
| Atom numbers | `number_atoms: true` or named `C1=carbonyl` | chem compiler (SmilesDrawer atom info) |
| Peak numbers | Spec lists ppm/cm⁻¹; compiler places 1,2,3 with labella | plot compiler |
| Stream numbers | Spec `stream 3:`; compiler boxes the number on the arrow | scene/PFD |
| Step-local vs global | Diagram callouts local; equation tags global; never reuse `(1)` for a different equation | parser + numbering |

### 8.5 Tests a later implementer must write (specified now, not implemented in this goal)

- Plot: `fn: 1.5*t^2 - 2*t` with `eq:` → compiled SVG+overlay has **zero** label-stroke hits on the sampled polyline (this is the screenshot regression).
- Hybrid-π template always contains nodes `rpi, gm, RE, RC, B, C, E` even if the spec omits `RC` (warn + draw, or reject — pick reject for completeness).
- FBD: labels not on force shafts; axes separate from the body.
- Sanitize: a spec whose label text contains `<script>` cannot XSS.
- Print profile still ≤ 480×275.

---

## 9. Subject × family inventory

Families, not lecture topics. Undergrad / masters / PhD. Every family names: typical textbook figure, spec the model emits, catering engine (majority or leftover Family Compiler).

AI images are not a catering path for any family.

---

### 9.1 Maths

| # | Family | Level | Textbook figure | Model emits | Catering |
|---|---|---|---|---|---|
| M1 | Number line | UG–M | Inequality rays, ε-N, nested intervals | `nline` min/max/marks/braces | **plot/scene** (1D) |
| M2 | Cartesian function graph | UG–PhD | Poly/rational/trig; intercepts; asymptotes | `plot` fn, domain, annotations | **plot** (screenshot class) |
| M3 | Polar / parametric / implicit | UG–M | Roses, cycloid, `F(x,y)=0` | `kind: polar\|param\|implicit` | **plot** (+ marching squares) |
| M4 | Graph transformations | UG | `a f(b(x-c))+d` stages | base + stages; **fixed window** | **plot** |
| M5 | Euclidean geometry | UG–M | SAS, cyclic quad, inversion | constructive points/segs/circles/angles | **scene**; leftover JSXGraph if constructions explode |
| M6 | Conics / loci | UG | Focus-directrix, ellipse foci | `conic:` params or implicit | **scene** + **plot** |
| M7 | Vectors / Argand / phasors | UG–M | Parallelogram sum; ×i | vecs + ops in data coords | **scene** |
| M8 | Calculus pictures | UG | Riemann, secant→tangent, ε-δ, MVT | `plot` + marks riemann/secant/edelta | **plot** |
| M9 | Area / washer / shell | UG | Region; 2D slice + axis of rotation | region + method | **plot** + **scene**; true 3D leftover traces only |
| M10 | Taylor / Fourier / series | UG–M | Partial sums overlay; radius disk | f, N list, remainder | **plot** + **scene** |
| M11 | Cobweb / Newton | UG–M | x=g(x) cobweb; Newton hops | method, f, x0, iters | **plot** (compiler iterates) |
| M12 | Multivariable traces / saddle | UG–M | z=f(x,y) as traces + contour | f, traces, plane | **plot** contour; **not** WebGL |
| M13 | Contours + gradient / Lagrange | UG–M | Level sets, ∇f, g=c | f, levels, constraint | **plot** + **scene** field |
| M14 | Integration regions / Jacobian | UG–M | D in xy; polar wedge; map of rectangle | inequalities or uv map | **scene** |
| M15 | Vector calculus | UG–M | Field + curve C; Green D; n̂ | F, curve, region | **scene** field + **plot** |
| M16 | Linear algebra geometry | UG–M | Image of unit square; eigenlines; SVD stages | matrix A, actOn | **scene** |
| M17 | Matrix as table / RREF / heatmap | UG–PhD | Pivot tableaux; \|aij\| | `table` cells + hl | **table** |
| M18 | ODE slope field / phase portrait | UG–PhD | y'=f hashes; nullclines; limit cycle | ode, ic, show | **plot** + **scene**; compiler RK4 for drawing only |
| M19 | Block / signal-flow | M–PhD | H(s) boxes, feedback | nodes, edges, ports | **graph** (dagre + in-house ports) |
| M20 | PDE domain / stencil / snapshot | M–PhD | Ω with BC; 5-point stencil; u(x,t) | domain, bc, stencil or grid | **scene** + **plot** |
| M21 | TNB / geodesic cartoons | M–PhD | γ with T,N,B; geodesic on sphere | gamma, t0 | leftover **scene isometric**; no three.js v1 |
| M22 | Real analysis extras | M–PhD | ε-tube; Cantor stages | plot/nline marks | **plot** |
| M23 | Complex contours / conformal | UG–PhD | C + poles; branch cut; grid map | poles, contour pieces, f | **scene** two-pane |
| M24 | Probability pdf/cdf/pmf | UG–M | Shaded P(a\<X\<b); QQ | dist + shade | **plot** (compiler samples analytic pdf) |
| M25 | Venn / Bayes tree / Markov | UG–M | Tree with edge probs | tree/graph/table | **graph** + **table** + **scene** (2–3 set Venn) |
| M26 | Graph theory | UG–PhD | Planar, flow, coloring, Dijkstra snapshot | V,E, highlight | **graph**; seed layout by id |
| M27 | Trees / DFA / CFG | UG–M | Recursion tree; automata | tree or Q,Σ,δ | **graph**; mermaid if ≤6 states |
| M28 | Hasse / Young tableaux | M–PhD | Cover graph; Ferrers | cover pairs or partition | **graph** + **table** |
| M29 | Numerical analysis | UG–PhD | Interpolant vs nodes; log-log error; mesh | nodes, method, hs | **plot** + **scene** |
| M30 | Topology cartoons | M–PhD | Quotient square; simplicial complex | identifications, simplices | leftover **scene** templates |
| M31 | Commutative diagrams / SS pages | M–PhD | tikz-cd squares; E₂ page | grid cells + arrows | leftover **cd** Family Compiler (grid, not Graphviz) |
| M32 | Dynkin / root systems | PhD | ADE diagrams; A₂ roots | kind dynkin / vectors | **graph** + **scene** |
| M33 | Boolean gates / proof trees | UG–M | Gate net; sequent tree | gates+wires or proofTree | **circuit** digital / **graph** |
| M34 | Recurrence unroll | UG | Recursion tree + a_n table | tree + table | **graph** + **table** |

Math majority: M1–M20, M22–M29, M32–M34. Leftover Family Compilers: M21 isometric, M30 identification templates, M31 `cd`. 4-set Venn, knots, Riemann surfaces, Julia sets: leftover templates or refuse (do not ask Gemini for SVG).

---

### 9.2 Physics

| # | Family | Level | Textbook figure | Model emits | Catering |
|---|---|---|---|---|---|
| P1 | Particle FBD | UG | Hibbeler incline; Atwood | body, forces, axes | **scene** `kind: fbd` |
| P2 | Rigid-body / torque FBD | UG–M | Lever arms, α curved arrow | forces, moments, lever_arms | **scene** fbd extension |
| P3 | Mechanism scene | UG | Pulley+incline *before* isolate | parts, cables | leftover **scene** templates (pulley, incline, pendulum) |
| P4 | Motion plot / trajectory | UG | x(t), projectile | fn or projectile params | **plot** |
| P5 | Phase portrait / V_eff | M–PhD | Pendulum separatrix; Kepler Veff | orbits or V(r)+E | **plot**; model may send samples |
| P6 | Stress element / Mohr | UG–M | Cauchy cube; Mohr circle | sigma, tau | leftover **scene** cube + **plot** Mohr |
| P7 | E/B/g field map | UG–M | Griffiths dipole; Gauss pillbox | sources, catalog, gauss | leftover **field catalog** (do not solve Laplace) |
| P8 | EM wave triad | UG–M | E,B,k mutually ⊥ | k,E,B, pol | **scene** |
| P9 | Waveguide mode + ω–β | M–PhD | TE₁₀ arrows; cutoff plot | mode catalog + dispersion | leftover **field** + **plot** |
| P10 | Lumped RLC | UG | Series RLC | netlist | **circuit** (shared with EE) |
| P11 | PV / TS processes | UG–M | Carnot/Otto; shaded W | states, path types | **plot** |
| P12 | Stat-mech distributions | UG–PhD | Maxwell; FD vs MB; Landau F(m) | distro or coefficients | **plot** |
| P13 | Wave snapshot / standing | UG | nodes, λ | n, boundary | **plot** |
| P14 | Interference I(θ) + slits | UG–M | Young geometry + intensity | slit-geo + pattern | **scene** ray + **plot** |
| P15 | Principal-ray optics | UG | Thin lens three rays | element, f, do, ho | leftover **ray-optics** (compiler computes di) |
| P16 | QM well + energy ladder | UG–M | ISW ψ_n on V(x) | V type, levels, show_psi | **plot** + leftover **ladder** |
| P17 | Orbital cartoon 2D | UG–M | p/d lobes, R_nl(r) | n,l,m, view | leftover **glyph** + **plot** radial; no 3Dmol |
| P18 | Stern–Gerlach | UG–M | sequential SG | stages | **scene** ray + **ladder** |
| P19 | Feynman diagrams | M–PhD | QED tree; β-decay W | incoming, vertices, edge types | leftover **feynman** (templates s/t/u then DAG) |
| P20 | Minkowski 1+1 | UG–PhD | ct, x, 45° cone, boosted axes | events, worldlines, v | leftover **minkowski** (compiler forces 45°) |
| P21 | Fluids CV / streamlines | UG–M | Venturi; u(y) | cv streams or catalog | **scene** + **plot** + field catalog |
| P22 | Bands + Brillouin zone | M–PhD | E(k) along Γ–K–M; 2D hex BZ | path, band samples, lattice | leftover **bz-poly** + **plot** |
| P23 | Nuclear decay scheme | UG–M | ⁶⁰Co levels; BE/A | levels, transitions | leftover **ladder** + **plot** |

Physics majority: P1,P2,P4,P5,P8,P10–P14,P18,P21 plots. Leftover Family Compilers: P3 templates, P6 cube, P7/P9 field catalogs, P15 ray-optics, P16/P23 ladder, P17 glyphs, P19 feynman, P20 minkowski, P22 bz. 3D orbital volumes and 3D FCC BZ: 2D cuts only.

---

### 9.3 Chemistry — organic

Chemistry is **not** one blob. Organic families:

| # | Family | Level | Textbook figure | Model emits | Catering |
|---|---|---|---|---|---|
| CO1 | Lewis electron-dot | UG | All atoms, dots, charges | lewis atoms+lp+bonds | leftover **lewis** (SMILES hides lone pairs) |
| CO2 | Kekulé / condensed | UG | Alternating doubles | SMILES + style | **chem.smiles** |
| CO3 | Line-angle skeletal | UG–PhD | ACS 1996 | SMILES | **chem.smiles** (SmilesDrawer) |
| CO4 | Wedge–dash | UG–M | Solid/hashed | isomeric SMILES | **chem.smiles** isomeric |
| CO5 | Newman projection | UG–M | Front circle, back Y, dihedral | axis, front/back substituents, deg | leftover **newman** (SMILES cannot choose this view) |
| CO6 | Sawhorse | UG | Oblique C–C | same as Newman, view sawhorse | leftover **newman** parser |
| CO7 | Fischer projection | UG–M | Crosses, D-sugar vertical | backbone + horiz pairs | leftover **fischer** |
| CO8 | Haworth | UG | Pyranose thick front | named sugar, anomer, D/L | leftover **haworth** templates |
| CO9 | Chair / boat | UG–M | Axial ⊥, equatorial // | subst list ax/eq up/down | leftover **chair** template |
| CO10 | R/S CIP overlay | UG–M | Priorities + badge | SMILES + annotate rs | **chem.smiles** + annotation |
| CO11 | E/Z | UG | Alkene bold + E/Z | isomeric SMILES | **chem.smiles** |
| CO12 | Curved-arrow mechanism | UG–PhD | Double-barbed pair arrows | rxn SMILES + arrow list | leftover **mechanism** (depict + Bezier arrows) |
| CO13 | Resonance | UG–M | Contributors + ↔ | SMILES list | **chem.smiles** ×N + custom ↔ |
| CO14 | Forward reaction scheme | UG–M | A →[reagents] B | reaction SMILES + conditions | **chem.smiles** + **scene** arrow |
| CO15 | Retrosynthesis map | M–PhD | Disconnections ⇒ synthons | target + SMARTS cuts | **graph** + **chem.smiles** |
| CO16 | Polymer SRU | UG–M | Brackets n | SRU SMILES + n | **chem.smiles** + brackets overlay |
| CO17 | Peptide line drawing | UG–M | Protected residues | SMILES or seq | **chem.smiles** |
| CO18 | Frost circle | UG–M | Inscribed polygon, electrons | n, charge, e | leftover **ladder** |
| CO19 | Conformational E(θ) | UG–M | Butane scan | theta, E arrays | **plot** |
| CO20 | SMARTS highlight | M–PhD | Substructure bold | mol SMILES + SMARTS | leftover until OCL; v1 color by atom index list |

Organic leftovers with dedicated compilers: Lewis, Newman, Sawhorse, Fischer, Haworth, chair, mechanism arrows. Structures: SmilesDrawer.

---

### 9.4 Chemistry — inorganic

| # | Family | Level | Textbook figure | Model emits | Catering |
|---|---|---|---|---|---|
| CI1 | VSEPR AXE | UG–M | SF₄ seesaw, LP lobes | ax, center, ligands, lp | leftover **vsepr** table |
| CI2 | Hypervalent Lewis | UG | Expanded octet | lewis + hypervalent | leftover **lewis** |
| CI3 | Coordination 2D | UG–M | Oh solid+hashed+in-plane | metal, geom, ligands | leftover **complex** templates + ligand SMILES |
| CI4 | fac/mer, cis/trans, Δ/Λ | UG–M | Side-by-side Oh | two complexes + isomer | leftover **complex** |
| CI5 | CFT / LF splitting | UG–PhD | t2g/eg, HS/LS | geom, d, electrons, Δ | leftover **ladder** (shared with MO) |
| CI6 | Complex MO qualitative | M–PhD | Figgis three-column | left/center/right levels | leftover **mo-ladder** |
| CI7 | Tanabe–Sugano schematic | M–PhD | Term vs Δ/B, vertical line | dⁿ, Δ/B | leftover **plot** schematic curves — **not** a scanned plate |
| CI8 | Unit cells | UG–M | FCC/NaCl isometric | named type + optional basis | leftover **cell** isometric |
| CI9 | Miller planes | UG–M | (hkl) on cube | hkl, lattice | leftover **cell** |
| CI10 | Polyhedra packing | M | Edge-sharing octahedra | unit, share | leftover **polyhedra** |
| CI11 | Born–Haber | UG–M | Closed Hess cycle | steps kJ | **graph** cycle (not mermaid — labels have `()`) |
| CI12 | d-orbital lobes 2D | UG–M | dxy, dz² cartoons | which orbitals | leftover **dorb** glyphs |
| CI13 | Wade clusters | M–PhD | closo/nido polyhedra | wade, vertices, SEP | leftover **cluster** nets |
| CI14 | Point-group overlay | M | C2v axes/planes | group + elements | **chem.smiles**/**vsepr** + overlay |
| CI15 | Jahn–Teller split | M–PhD | Oh → D4h | d, distort, splittings | leftover **ladder** |
| CI16 | Spectrochemical series | UG | I⁻ … CN⁻ strip | ligands, mark | **scene** / **table** |

---

### 9.5 Chemistry — physical (includes analytical / spectroscopy)

| # | Family | Level | Textbook figure | Model emits | Catering |
|---|---|---|---|---|---|
| CP1 | Diatomic MO diagram | UG–M | AO\|MO\|AO, σ/π, O₂ mixing | molecule, levels, connect | leftover **mo-ladder** |
| CP2 | Hückel π MO | UG–M | Butadiene ticks | n, cyclic, e | leftover **ladder** (tiny matrix) |
| CP3 | Reaction coordinate | UG–PhD | R, TS‡, I, P, ΔG‡ | x, E, labels, units | **plot** |
| CP4 | PES slice | M–PhD | 1D cut or contour | grid | **plot** contour |
| CP5 | Unary P–T phase | UG–M | Triple/critical | curves, points | **plot** |
| CP6 | Binary T–x / lever | UG–M | Eutectic, azeotrope | curves, T, x | **plot** |
| CP7 | ICE table | UG | I/C/E matrix | species, I,C,E | **table** |
| CP8 | Titration curve | UG–M | pH vs V, eq, half | C, V, pKa list | **plot** (Henderson sampler) |
| CP9 | ¹H/¹³C NMR | UG–PhD | δ right-to-left, sticks, tree | peak list ppm,int,mult,J | **plot** + leftover **splitting-tree** |
| CP10 | IR | UG–M | %T vs cm⁻¹ inverted | peak list | **plot** |
| CP11 | Mass spectrum | UG–M | sticks m/z | mz, I, labels | **plot** |
| CP12 | UV–Vis / Beer | UG | A vs λ or A vs c | traces | **plot** |
| CP13 | Electrochemical cell | UG–M | Beaker + bridge + notation | anode/cathode/E | leftover **cell** schematic |
| CP14 | Latimer / Frost | M–PhD | E° connectors; nE vs ox | E list / points | leftover **ladder** + **plot** |
| CP15 | Ellingham | M | ΔG vs T lines | ΔH, ΔS | **plot** |
| CP16 | van't Hoff / Arrhenius | UG–M | ln K vs 1/T | x,y, fit | **plot** |
| CP17 | Kinetic scheme | UG–M | A⇌I→P | nodes, k | **graph** |
| CP18 | vdW isotherms | M | Maxwell construction | a,b,T | **plot** |
| CP19 | Jablonski | UG–M | S0/S1/T1 arrows | levels, trans | leftover **ladder** |
| CP20 | PIB / HO / R(r) | UG–M | ψ_n, nodes | kind, n | **plot** |
| CP21 | Cyclic voltammetry | M–PhD | i vs E | Epa, Epc, ip | **plot** schematic |
| CP22 | Langmuir / BET | M | θ vs p | K, p | **plot** |

2D NMR (COSY) at 300×165 is leftover **plot** grid of peak pairs, not a Gemini raster. Vendor JCAMP files are **not** a model payload and are **not** parsed in-extension: `jcampconverter` on npm v12.x is **CC BY-NC-SA 4.0**, which is incompatible with stemLM's MIT license and with the same GPL-out rule that already forbids CircuitJS. The catering method is peak lists only (`f1, f2, intensity` or 1-D `ppm, int, mult, J`). Oversized FID/JCAMP dumps fail the spec (refuse, §11.16) rather than asking Gemini to sketch a raster spectrum and rather than bundling a non-MIT parser.

---

### 9.6 Biology

| # | Family | Level | Textbook figure | Model emits | Catering |
|---|---|---|---|---|---|
| B1 | Cell / organelle | UG | Nested compartments | parent, glyph, label | leftover **compartment pack** |
| B2 | Membrane transport | UG | Bilayer + pump/channel | proteins, particles, mech | leftover **membrane** template |
| B3 | Mitosis / meiosis | UG | PMAT strip | kind, phase, chromosomes | leftover **division** templates |
| B4 | Punnett square | UG | 2×2 / 4×4 | rows, cols, cells | **table** |
| B5 | Pedigree | UG–M | 3-gen AD/AR/X | people, mating, filled | **graph** layered (`@dagrejs/dagre`) |
| B6 | Pathway SBGN-lite | UG–PhD | Glycolysis, MAPK, lac | process/macromolecule nodes; pointed vs T-bar | **graph** + leftover SBGN glyphs |
| B7 | Phylogeny | UG–M | Newick rectangular | Newick or nodes+parent | leftover **newick** + **graph** (d3-hierarchy or dagre; not elkjs) |
| B8 | Gel | UG | Lanes + ladder | lanes, bands mw | leftover **gel** |
| B9 | Anatomy callout | UG | Heart/nephron silhouette | organ template + anchors | leftover **anatomy** path library (not photos) |
| B10 | Neuron / AP / synapse | UG–M | Labeled neuron; V(t) | kind, phases | leftover **neuron** + **plot** AP |
| B11 | Immuno | UG–M | Clonal selection; Ab Y | cells, MHC | **graph** / mermaid sequence + glyphs |
| B12 | Operon | UG | lac/trp bar | promoter, operator, occupancy | leftover **operon** |
| B13 | PCR cycle | UG | denature/anneal/extend | cycle, T, strands | leftover **pcr** |
| B14 | Hardy–Weinberg | UG–M | p² bars / parabola | p, q | **plot** |
| B15 | Food web | UG | Trophic DAG | nodes, edges | **graph** |

Biology leftover: gastrulation morphogenesis, histology, unique lab apparatus — parametric templates if named, else failed spec (not Gemini SVG art).

---

### 9.7 Computer Science

| # | Family | Level | Textbook figure | Model emits | Catering |
|---|---|---|---|---|---|
| S1 | Array / matrix tape | UG | Indexed cells, i/j | cells, highlight, ptrs | leftover **array** (table-like) |
| S2 | Linked list | UG | Boxes + next | nodes, head, tail | leftover **list** |
| S3 | Tree (BST/AVL/RBT) | UG–M | Reingold–Tilford | recursive children | **graph** tree |
| S4 | Heap dual view | UG | Array + complete tree | arr, type | **table** + **graph** |
| S5 | Hash table | UG | Buckets + chain/probe | m, buckets, key | leftover **hash** |
| S6 | Graph algorithms | UG–M | BFS/Dijkstra ≤20 V | V,E, dist, pred | **graph** |
| S7 | Automata | UG–M | DFA/NFA/PDA/TM | Q,Σ,δ,q0,F | **graph**; mermaid if tiny |
| S8 | DP table | UG–M | LCS/knapsack fill | dims, cells, i,j, pred | **table** |
| S9 | Recursion tree | UG–M | Mergesort costs | fn, args, cost | **graph** |
| S10 | Sequence diagram | UG–M | RPC, TCP handshake | mermaid source | **mermaid** (existing) |
| S11 | Gantt / OS schedule | UG | FCFS/RR bars | jobs, tNow | leftover **gantt** (not mermaid date-gantt) |
| S12 | Net stack | UG | OSI encapsulation | layers, headers | leftover **stack** |
| S13 | UML class / state | UG–M | 4–10 classes | name, fields, rel | **graph**; mermaid state |
| S14 | Complexity plot | UG | n vs n log n vs n² | fns, nMax | **plot** |
| S15 | Gate circuit | UG | Combinational ≤15 | gates, wires, values | **circuit** digital / dagre + in-house orthogonal |
| S16 | AST | UG–M | Expr tree | kind, children | **graph** |
| S17 | FSM | UG | Mealy/Moore | states, trans | **mermaid** or **graph** |

CS leftover: sparse CSR art, concurrent trees, multi-tape TM, SSA graphs (use S6).

---

### 9.8 Electrical Engineering (undergrad through masters/PhD)

High-school-only is insufficient. Required PhD/masters families are present: hybrid-π, op-amp, phasor, Bode-class, Nyquist, root locus, two-port, Smith, one-line, Ybus, PWM, timing, MOSFET π, transmission lines, PLL blocks.

| # | Family | Level | Textbook figure | Model emits | Catering |
|---|---|---|---|---|---|
| E1 | Lumped schematic DC/AC | UG | Nilsson mesh/node | SPICE-like netlist | **circuit** + in-house Manhattan / dagre orthogonal |
| E2 | **Hybrid-π / small-signal BJT** | UG–M | Sedra/Smith CE π | rpi, gm, RE, RC, ro, mode | leftover **hybridpi template** (not free ELK) |
| E3 | MOSFET π / T | UG–M | Sedra MOSFET π | gm, gmb, RD, RS, Cgs | leftover **mospi** (same canvas as E2) |
| E4 | Device I–V / Ebers–Moll | M–PhD | IC–VCE family, Q-point | device, kind, plot | leftover **devicemodel** + **plot** |
| E5 | **Op-amp feedback** | UG–M | Inverting/noninverting | topology, Rf, Rg, rails | leftover **opamp template** |
| E6 | **Phasor diagram** | UG | RLC phasors, projections | mag∠deg, show projections | leftover **phasor** (vector primitive; labels at projection feet) |
| E7 | **Bode mag+phase** | UG–PhD | Ogata/Nise/Sedra | poles, zeros, K, w sweep | **plot** Bode-class (log ω, asymptotes first) |
| E8 | Nyquist | M–PhD | unit circle, −1 | G(s) poles/zeros | **plot** Bode-class |
| E9 | Root locus | M–PhD | × poles ○ zeros | G(s), K range | **plot** Bode-class |
| E10 | Control blocks / PLL | M–PhD | Nise reduction; PD-LPF-VCO | nodes, blocks, edges | **graph** dagre + in-house ports; PLL leftover extras |
| E11 | Two-port | M | z/y/h/ABCD box | params, Zij | leftover **twoport** template |
| E12 | Smith chart | M–PhD | Pozar Γ-plane | z0, zL, path | leftover **smith** (analytic r/x arcs) |
| E13 | Transmission line bounce | M–PhD | Bewley lattice | Z0, td, zL, t | leftover **tline** lattice |
| E14 | Filter ladder + PZ | UG–M | LPF ladder; poles | ladder netlist + pz | **circuit** + **plot** |
| E15 | Power one-line | M–PhD | Glover buses, xfmr | buses, lines, gens | leftover **oneline** |
| E16 | Ybus figure | M | Matrix + bus graph | triplets | **table** KaTeX + **graph** |
| E17 | PWM / converter waves | UG–M | buck iL, SPWM | kind, D or m | leftover **pwm** piecewise **plot** |
| E18 | Logic timing | UG–M | Harris/Weste | WaveJSON | leftover **wavedrom** |
| E19 | FSM | UG | Mano | mermaid or states | **mermaid** |
| E20 | Digital netlist | UG–M | gates, mux, dff | Yosys-like JSON or netlist | **circuit** + dagre (netlistsvg *idea*, own glyphs; do not ship elkjs) |

Electrical majority: E1, E7–E9 (plot), E10, E14, E16 table/graph, E19. Leftover templates that **must ship** for the subject to be honest at masters level: E2 hybrid-π, E3 mosπ, E5 op-amp, E6 phasor, then E11–E13, E15, E17–E18, E4, E12 Smith.

---

### 9.9 Mechanical Engineering

| # | Family | Level | Textbook figure | Model emits | Catering |
|---|---|---|---|---|---|
| ME1 | FBD isolate | UG | One body, external only | body, forces, axes | **scene** fbd (shared physics) |
| ME2 | Mohr / stress square | UG–M | σx,σy,τxy | stresses | leftover **mohr** (shared civil) |
| ME3 | Shaft loads | UG | Gears/pulleys on shaft | L, supports, T, F | leftover **shaft** + optional V(x) **plot** |
| ME4 | Gear mesh schematic | UG–M | Pitch circles, 2–3 teeth | z1,z2, pressure angle | leftover **gear** (not true involute CAD) |
| ME5 | Cam–follower | UG | s(θ) + profile | profile, follower, s(θ) | leftover **cam** + **plot** |
| ME6 | Linkage | UG–M | Four-bar, slider-crank | joints, lengths, θ | leftover **linkage** (law of cosines) |
| ME7 | Thermo cycle P–V/T–s/h–s | UG–M | Otto/Rankine 4 points | coords, points, paths | **plot** |
| ME8 | Fluid CV | UG | Nozzle, ṁ in/out | cv, streams | **scene** |
| ME9 | Vibration modes | UG–M | M-K-C glyphs; mode shape | nDOF, shape | leftover **vib** + **plot** |
| ME10 | Heat fin / Rth network | UG–M | Fin + analog resistors | kind, nodes, Rth | leftover **fin** or **circuit** analog |
| ME11 | Mechanism FBD | UG | One link, inertia dashed | links, ω,α | **scene** fbd |

ME leftover: 3D FBDs, true involute, FEA color plots (refuse rasters).

---

### 9.10 Civil Engineering

| # | Family | Level | Textbook figure | Model emits | Catering |
|---|---|---|---|---|---|
| CE1 | Beam + supports + loads | UG | Pin/roller/fixed, UDL | L, supports, loads | leftover **beam** glyphs |
| CE2 | Truss | UG | Pratt/Warren, section cut | joints, members, cut | leftover **truss** (coords or topology) |
| CE3 | Frame | UG–M | Portal, joint moments | members, joints | leftover **frame** |
| CE4 | SFD/BMD | UG | Stacked load \| V \| M | piecewise V(x), M(x) | leftover **sfd-bmd** (aligned **plot** stack; sagging+) |
| CE5 | Influence line | UG–M | IL for Mc, Ra | response, IL pieces | leftover **sfd-bmd** sibling |
| CE6 | Mohr / Mohr–Coulomb | UG | Stress + envelope | σ, τ, φ, c | leftover **mohr** (shared ME) |
| CE7 | Retaining wall | UG–M | Rankine Pa at ⅓H | H, γ, φ, ka | leftover **wall** |
| CE8 | Soil profile | UG | Layers + WT | layers z,γ,φ | leftover **soil** |
| CE9 | Column buckling | UG | Euler dashed sine | ends, L, Pcr | leftover **column** |
| CE10 | RC section | UG–M | Whitney block + strain | b,h,d, bars, a | leftover **rc** |
| CE11 | Deflection curve | UG | Exaggerated v(x) | v(x) or EI v'' | **plot** + **scene** |

Civil SFD/BMD is **not** ME shaft SFD. Sign convention sagging+ is a compiler flag.

---

### 9.11 Chemical Engineering (process — distinct from chemistry)

| # | Family | Level | Textbook figure | Model emits | Catering |
|---|---|---|---|---|---|
| CH1 | PFD | UG–M | Mixer/flash/recycle | units, numbered streams | **graph** dagre + leftover ISA-ish glyphs |
| CH2 | P&ID-lite | M | One control loop | PFD + TIC/FIC bubbles | leftover extend PFD |
| CH3 | Stream control volume | UG | One box, numbered arrows | streams F, z | leftover **cv** (or **scene**) |
| CH4 | McCabe–Thiele | UG–M | y=x, eq, OL, staircase | α or eq data, zF, xD, R, q | leftover **mccabe** (**plot** + compiler staircase) |
| CH5 | T-xy / x-y | UG | Bubble/dew, lever | kind, curve, z | **plot** |
| CH6 | CSTR / PFR | UG–M | Tank/tube + Levenspiel | type, X, V | leftover **reactor** glyph + **plot** |
| CH7 | Heat exchanger | UG | Counterflow T-x | Th,Tc in/out | leftover **hx** |
| CH8 | Packed column | UG–M | Tower + XY | z, OL, eq | CH1 glyph + CH4-like **plot** |
| CH9 | Psychrometric schematic | M | DBT vs W, RH curves | DBT, W, process | leftover **psych** sampled curves — not a scanned ASHRAE chart |
| CH10 | RTD E(t) | M–PhD | Tracer curve | E(t) or model | **plot** |
| CH11 | Recycle/purge | UG–M | Ammonia loop | PFD subset + purge fraction | **graph** PFD |

Chemistry mechanisms stay in §9.3. ASPEN screenshots and vendor P&IDs are refused.

---

### 9.12 General

`General` is not a diagram family. Playbook already says: pick the most specific subject and adopt its conventions. Catering: classifier/model sets `@meta subject:` to one of the ten; diagrams use that subject's families. Mixed problems use the **dominant** subject's engine (a kinematics plot in a biomechanics problem is `plot`, not a new General engine).

**Second-pass adjacent routing (playbooks will actually hit these):**

| Adjacent topic | Route subject | Engine |
|---|---|---|
| Stats / data (boxplot, QQ, residual, ROC, ANOVA table) | Math (or General → Math) | **plot** + **table** |
| Control (Bode, Nyquist, locus, blocks, PID time) | Electrical | **plot** Bode-class + **graph** |
| Astronomy (HR, celestial sphere, Kepler) | Physics | **plot** + leftover **scene** sphere template |
| Biochem (pathways, MM kinetics, Ramachandran) | Chemistry or Biology by dominant verb | **plot** / **graph** / leftover rama |
| Materials (Fe–C, TTT, SN) | Mechanical or Chemistry | leftover **plot** schematic (not a scanned ASM plate) |
| Biomed (ECG, PV loop, compartment PK) | Biology / Physics | leftover piecewise **plot** + **graph** |
| Aerospace (airfoil, rocket staging) | Mechanical / Physics | leftover **airfoil** + **plot** |
| Earth/env (hydrograph, carbon cycle) | Civil / Biology / General | **plot** / leftover **cycle** |
| Info theory / crypto protocols | CS / Math | **graph** + mermaid sequence |
| Nuclear engineering six-factor | Physics | leftover **ladder** / **scene** |

No General-only engine. No “the model will sketch it.”

---

### 9.13 Second-pass families (2026-08-21)

Original §9.1–§9.12 tables stay. These rows close gaps the first pass left implicit. Every row has a catering method (majority engine, leftover Family Compiler with spec+job+method, or refuse). None are “later.” None are “Gemini SVG.”

#### Maths addenda

| # | Family | Level | Textbook figure | Model emits | Catering |
|---|---|---|---|---|---|
| M35 | Stats 1D/2D | UG–M | histogram, box+whisker, scatter+fit, residual, QQ | kind, data or dist + shade | **plot** (compiler bins/fits; model may send summaries not 10k points) |
| M36 | ROC / PR / confusion | UG–M | ROC curve; 2×2 counts | scores or cells | **plot** + **table** |
| M37 | Karnaugh map | UG | 2–4 variable K-map | vars, minterms, circles | leftover **kmap** (grid, not graph) |
| M38 | Generating functions / trellis | M | path counting trellis | stages, edges | **graph** |
| M39 | Category 2-cells | PhD | adjunction pasting | leftover **cd** or **refuse** if >2-cells at card size | leftover **cd**; 3-pasting **refuse** |
| M40 | Knot projections | M–PhD | Reidemeister | leftover **knot** template or **refuse** | leftover **knot** 3–7 crossings; more **refuse** |
| M41 | Measure / σ-algebra cartoons | M–PhD | nested sets | nline/scene marks | **plot** / **scene**; no 3D |
| M42 | Algebraic geometry cartoons | PhD | elliptic curve y²=x³+ax+b | fn implicit | **plot** implicit; schemes **refuse** |
| M43 | Control as math (shared E7–E10) | M | Bode/Nyquist/locus | poles, zeros, K | **plot** Bode-class (do not duplicate EE) |
| M44 | Information diagrams | UG–M | Huffman tree; Venn I(X;Y) | tree / 2–3 set | **graph** + **scene** Venn; 4-set **refuse** |

#### Physics addenda

| # | Family | Level | Textbook figure | Model emits | Catering |
|---|---|---|---|---|---|
| P24 | Penrose diagram | M–PhD | conformal GR cartoon | leftover **penrose** (null 45°, like Minkowski) | leftover **minkowski** sibling; full 4D **refuse** |
| P25 | Celestial sphere / RA–Dec | UG | sphere + equator | leftover **sphere** 2D template | leftover **scene** isometric; not 3Dmol |
| P26 | HR diagram | UG | log L vs T | points, loci | **plot** log-log |
| P27 | Airfoil / streamlines | UG–M | camber, Γ | leftover **airfoil** catalog | leftover **field catalog** (do not solve Euler) |
| P28 | Interferometer (Mach–Zehnder, Michelson) | UG–M | two-path | leftover **ray-optics** extra template | leftover **ray-optics** |
| P29 | Poincaré sphere / polarization | M | Stokes | leftover **poincare** 2D | leftover **scene**; 3D ball **refuse** |
| P30 | Compton / cloud chamber | UG | tracks | scene rays | **scene** |
| P31 | Ising lattice cartoon | M | 8×8 spins | grid, T | leftover **grid** (table-like); 128² **refuse** |
| P32 | Blackbody / Planck | UG | u(λ,T) | T list | **plot** |
| P33 | Hysteresis (B–H, ferro) | UG–M | loop | vertices | leftover **plot** piecewise |
| P34 | Twin-paradox Minkowski | UG | two worldlines | events, v | leftover **minkowski** (already P20) |
| P35 | Standard-model cartoon | UG | particle table | **table** | **table**; mural art **refuse** |
| P36 | Detector event display | PhD | CMS slice | **refuse** (copyrighted/complex) | **refuse** §11.16; 2D cartoon leftover **scene** if named |

#### Chemistry organic addenda

| # | Family | Level | Textbook figure | Model emits | Catering |
|---|---|---|---|---|---|
| CO21 | Protecting-group table | UG–M | PG vs conditions | **table** | **table** |
| CO22 | DNA/RNA nucleoside | UG | SMILES | SMILES | **chem.smiles** |
| CO23 | Conformational energy already CO19 | — | — | — | **plot** |
| CO24 | Retrosynthetic tree already CO15 | — | — | — | **graph** + SMILES |

#### Chemistry inorganic addenda

| # | Family | Level | Textbook figure | Model emits | Catering |
|---|---|---|---|---|---|
| CI17 | Pourbaix | M–PhD | E vs pH regions | lines, labels | leftover **plot** schematic (not a scanned atlas) |
| CI18 | Band metal/insulator | UG–M | filled bands | leftover **ladder** + **plot** | leftover **ladder** |
| CI19 | Ligand-sub mechanism | UG–M | assoc/dissoc | SMILES + arrows | leftover **mechanism** |
| CI20 | Magnetic dⁿ states | M | HS/LS already CI5 | — | leftover **ladder** |
| CI21 | Cluster bonding already CI13 | — | — | leftover **cluster** |
| CI22 | XPS/Auger schematic | M | survey sticks | peak list | **plot** |

#### Chemistry physical / analytical addenda

| # | Family | Level | Textbook figure | Model emits | Catering |
|---|---|---|---|---|---|
| CP23 | Chromatogram | UG–M | tR, area | peak list | **plot** |
| CP24 | DSC / TGA | M | heat flow vs T | traces | **plot** |
| CP25 | Raman | UG–M | shift sticks | peak list | **plot** (IR sibling) |
| CP26 | PXRD | UG–M | 2θ sticks | peak list | **plot**; 3D reciprocal **refuse** |
| CP27 | 2D NMR COSY | M–PhD | peak pairs | (f1,f2,I) list | leftover **plot** grid; JCAMP **refuse** |
| CP28 | Debye–Hückel / colligative | UG | γ vs I | fn | **plot** |
| CP29 | Partition / log P | UG | shake cartoon + numbers | leftover **scene** + **table** | leftover **cell** sibling |
| CP30 | Statistical mech already P12 | — | — | **plot** |
| CP31 | Cyclic voltammogram already CP21 | — | — | **plot** |
| CP32 | Adsorption already CP22 | — | — | **plot** |

#### Biology addenda

| # | Family | Level | Textbook figure | Model emits | Catering |
|---|---|---|---|---|---|
| B16 | Michaelis–Menten / LB | UG–M | v vs [S]; 1/v vs 1/[S] | Km, Vmax | **plot** |
| B17 | O₂–Hb dissociation | UG | sat vs pO2 | p50, nH | **plot** |
| B18 | Cardiac PV loop | UG–M | P vs V | points, cycle | leftover **plot** piecewise |
| B19 | ECG / AP waveform | UG | PQRST | leftover **ecg** piecewise | leftover **plot** template (not a scanned strip) |
| B20 | Restriction map | UG | linear/circular | sites, kb | leftover **restriction** |
| B21 | Sequence alignment | UG–M | colored columns | seqs, ≤4×40 | **table**; BAM pileup **refuse** |
| B22 | Ramachandran | UG–M | φ,ψ allowed | leftover **rama** schematic | leftover **plot** schematic (not a scanned Procheck) |
| B23 | Protein topology 2D | UG–M | barrels/sheets | leftover **topo** | leftover; ribbon 3D **refuse** |
| B24 | Western blot | UG | lanes + kDa | leftover **gel** sibling | leftover **gel** |
| B25 | Logistic / Lotka–Volterra | UG–M | N(t); phase | r,K or α | **plot** + **scene** phase |
| B26 | Survivorship | UG | log lx | type I/II/III | **plot** |
| B27 | CRISPR cartoon | UG | gRNA + Cas | leftover **crispr** template | leftover **scene** template |
| B28 | Viral cycle | UG | lytic/lysogenic | leftover **cycle** | leftover **cycle** (shared Krebs) |
| B29 | Krebs/Calvin cycle | UG | named cycle | leftover **cycle** | leftover **cycle** — mermaid fails on `( )` in labels |
| B30 | Compartment PK | M | gut→plasma | nodes, k | **graph** + **plot** C(t) |
| B31 | Karyotype | UG | 23 pairs | **refuse** at 300×165 or leftover strip | leftover **karyo** 3–4 chromosomes max; full 23 **refuse** |
| B32 | Histology / unique photos | — | — | **refuse** | **refuse** §11.16 |

#### CS addenda

| # | Family | Level | Textbook figure | Model emits | Catering |
|---|---|---|---|---|---|
| S18 | Karnaugh (shared M37) | UG | K-map | leftover **kmap** | leftover **kmap** |
| S19 | Pipeline / hazard | UG–M | 5-stage, stall | leftover **pipeline** | leftover **gantt** sibling |
| S20 | Memory hierarchy | UG | pyramid | leftover **stack** sibling | leftover **stack** |
| S21 | B-tree / B+ | UG–M | order-m snapshot | **graph** tree | **graph** |
| S22 | Skip list | UG | layers | leftover **skiplist** | leftover **list** sibling |
| S23 | Bloom filter | UG | bit array | leftover **array** | leftover **array** |
| S24 | Consistent-hash ring | UG–M | circle + vnodes | leftover **ring** | leftover **scene** |
| S25 | ER diagram | UG | entities | mermaid `erDiagram` **or** **graph** | mermaid already accepted by `isMalformedDiagram`; protocol still prefers CS flow — ER is allowed as mermaid leftover |
| S26 | Network topology | UG | LAN/WAN | **graph** | **graph** |
| S27 | Sorting trace | UG | array after swap | leftover **array** | leftover **array** |
| S28 | Page table / TLB | UG | rows | leftover **table** | **table** |
| S29 | Neural net | UG–M | 3-layer | **graph** | **graph**; 100-node **refuse** card |
| S30 | Attention heatmap | M | n×n | **table** | **table**; n>12 **refuse** |
| S31 | Huffman / arithmetic | UG | tree | **graph** | **graph** |
| S32 | Datapath cartoon | UG–M | ALU/reg/mem | leftover **datapath** | leftover **scene** template; full ISA mural **refuse** |

#### Electrical addenda (masters/PhD honesty)

| # | Family | Level | Textbook figure | Model emits | Catering |
|---|---|---|---|---|---|
| E21 | Transformer equivalent | UG–M | Steinmetz | leftover **xfmr** template | leftover **circuit** template (not free netlist) |
| E22 | Magnetic circuit | UG | reluctance | leftover **magcirc** | leftover **scene** |
| E23 | Antenna pattern | UG–M | polar | **plot** polar | **plot** |
| E24 | QAM constellation | UG–M | I/Q grid | leftover **constel** | leftover **plot** |
| E25 | Eye diagram | M | overlay bits | leftover **eye** | leftover **plot** schematic (not a scope photo) |
| E26 | Load line | UG | diode/BJT | **plot** + Q | **plot** |
| E27 | CMOS VTC / SRAM 6T | UG–M | Vout vs Vin; bitcell | leftover **cmos** + **plot** | leftover template + **plot** |
| E28 | Three-phase phasors | UG | 120° | leftover **phasor** | leftover **phasor** |
| E29 | Sequence networks | M | ±/0 | leftover **seqnet** | leftover **oneline** sibling |
| E30 | Motor equivalent | UG–M | induction T-model | leftover **motor** | leftover **circuit** template |
| E31 | Park/dq | M | axes | leftover **dq** | leftover **scene** |
| E32 | FFT / spectrum | UG–M | sticks | **plot** | **plot** |
| E33 | Harmonic bar | UG | THD | **plot** | **plot** |
| E34 | Power triangle | UG | P,Q,S | leftover **phasor** | leftover **phasor** |
| E35 | Protection zones | M | one-line + zones | leftover **oneline** | leftover **oneline** |
| E36 | IC layout / GDS | PhD | — | **refuse** | **refuse** |
| E37 | Mixer / IQ | M | block | **graph** | **graph** |
| E38 | ADC quantization | UG | stair | leftover **plot** piecewise | **plot** |

Electrical **must remain honest** about hybrid-π, op-amp, phasor, Bode-class (E2, E5, E6, E7). These addenda do not replace those leftovers.

#### Mechanical addenda

| # | Family | Level | Textbook figure | Model emits | Catering |
|---|---|---|---|---|---|
| ME12 | Fe–C schematic | UG–M | eutectoid | leftover **plot** schematic | leftover; scanned ASM **refuse** |
| ME13 | TTT / CCT | M | C-curves | leftover **ttt** schematic | leftover **plot** schematic |
| ME14 | S–N / fatigue | UG–M | log-log | **plot** | **plot** |
| ME15 | Creep | M | ε(t) | **plot** | **plot** |
| ME16 | Moody schematic | UG | f vs Re | leftover **moody** sampled | leftover **plot**; copyrighted chart **refuse** |
| ME17 | Pump / compressor map | M | η islands | leftover **plot** schematic | leftover; OEM map **refuse** |
| ME18 | Boundary layer | UG–M | u(y) | **plot** | **plot** + **scene** |
| ME19 | Airfoil (shared P27) | UG–M | — | leftover **airfoil** | leftover **field catalog** |
| ME20 | Robotics DH frames | M | 2–3 frames | leftover **dh** | leftover **scene**; 7-DOF mural **refuse** |
| ME21 | PID time response | UG | step | **plot** | **plot** (shared EE) |
| ME22 | Bearing / fits | UG | leftover **bearing** | leftover or **refuse** GD&T stack | leftover **bearing**; full GD&T **refuse** |
| ME23 | Welding symbol | UG | AWS arrow | leftover **weld** | leftover; dense WPS **refuse** |
| ME24 | Refrigeration P–h | UG–M | 4 points | **plot** | **plot** |
| ME25 | Combined cycle T–s | UG–M | overlay | **plot** | **plot** |
| ME26 | CNC toolpath | UG | — | leftover or **refuse** | leftover 2D path; 3-axis **refuse** |

#### Civil addenda

| # | Family | Level | Textbook figure | Model emits | Catering |
|---|---|---|---|---|---|
| CE12 | Hydrograph / UH | UG–M | Q(t) | **plot** | **plot** |
| CE13 | IDF schematic | UG | leftover **plot** | leftover **plot** schematic; agency sheet **refuse** |
| CE14 | Specific energy / jump | UG | E vs y | leftover **openchan** | leftover **plot** |
| CE15 | Pipe network | UG–M | loops | **graph** | **graph** |
| CE16 | Traffic q–k–v | UG–M | fundamental | **plot** | **plot** |
| CE17 | Highway cross-section | UG | leftover **xsect** | leftover **scene** |
| CE18 | HV alignment | UG | plan+profile | leftover **align** | leftover; GIS **refuse** |
| CE19 | Slope stability | UG–M | slice | leftover **slope** | leftover **scene** |
| CE20 | Pile group | UG | leftover **piles** | leftover **scene** |
| CE21 | P–M interaction | UG–M | curve | leftover **plot** | leftover **plot** |
| CE22 | Moment–curvature | M | φ vs M | **plot** | **plot** |
| CE23 | Steel connection | UG | leftover **conn** | leftover **scene**; AISC plate **refuse** |
| CE24 | Moment-distribution tableau | UG | **table** | **table** |

#### Chemical engineering addenda

| # | Family | Level | Textbook figure | Model emits | Catering |
|---|---|---|---|---|---|
| CH12 | Ponchon–Savarit | M | H–x,y + staircase | leftover **ponchon** | leftover **mccabe** sibling (compiler stairs) |
| CH13 | Residue-curve map | M–PhD | ternary arrows | leftover **rcm** | leftover **plot** schematic; 3D **refuse** |
| CH14 | Ternary LLE / Hunter–Nash | M | tie lines | leftover **ternary** | leftover **plot**; not a scanned Treybal |
| CH15 | Da / Thiele modulus | M | η vs φ | **plot** | **plot** |
| CH16 | Fluidization | UG–M | ΔP vs u | leftover **plot** + glyph | leftover **reactor** + **plot** |
| CH17 | Ergun / packed ΔP | UG | **plot** | **plot** |
| CH18 | Membrane module | M | leftover **membrane** | leftover **hx** sibling |
| CH19 | Flooding / McCabe-Thiele already CH4 | — | — | leftover **mccabe** |
| CH20 | Kremser / absorption | UG–M | leftover **plot** | leftover **mccabe**-like |
| CH21 | HAZOP worksheet | M | — | **refuse** | **refuse** (text table in `@body`) |
| CH22 | Plant layout / P&ID vendor | — | — | **refuse** | **refuse** §11.16 |

**Coverage rule:** if a future exam item is not in §9.1–§9.13, reuse the closest family or **refuse**. Do not invent Gemini SVG as a path.

---

## 10. Majority vs leftover mapping (coverage does not stop at 75%)

### 10.1 Majority scheme coverage

**Declarative Scene Spec + Shared Layout Kernel** with five engines covers, by family count:

| Subject | Family count | Majority engines | Leftover Family Compilers |
|---|---|---|---|
| Maths | 34 | 31 | 3 (isometric TNB, topology IDs, cd) |
| Physics | 23 | 12 | 11 (but several are small templates sharing ladder/field) |
| Chemistry organic | 20 | 10 (SMILES+plot+graph) | 10 (projections, Lewis, mechanism) |
| Chemistry inorganic | 16 | 2 (graph Born–Haber, table series) | 14 (templates/ladders/cells — still Scene IR) |
| Chemistry physical | 22 | 16 (plot/table/graph) | 6 (MO ladder, cell, Latimer, Jablonski, splitting tree) |
| Biology | 15 | 6 | 9 (templates) |
| CS | 17 | 12 | 5 (array, list, hash, gantt, stack) |
| Electrical | 20 | 8 | 12 (templates that are the subject's identity) |
| Mechanical | 11 | 4 | 7 |
| Civil | 11 | 1–2 | 9 (beam/SFD are the subject) |
| Chemical eng | 11 | 4 | 7 |
| General | 0 own | routes | routes |

Raw family counts are not usage weights. **Usage-weighted** (homework volume): plots, FBDs, netlists, SMILES, tables, simple graphs dominate. That is the 75%+. Civil SFD, EE hybrid-π, organic Newman/chair, ChemE McCabe are lower volume but **must have compilers** or stemLM is a high-school product in those tracks.

**Second-pass:** §9.13 adds stats, control-as-math, astronomy-as-physics, biochem, materials schematics, biomed waveforms, EE masters extras (constellation, eye, xfmr, sequence nets), civil hydro, ChemE Ponchon/ternary, etc. Those rows are mostly leftover templates, schematic-plot, or refuse. They do not change the majority-scheme name. They exist so coverage is not “the easy 75%.”

### 10.2 What "majority scheme" means in practice

If a figure can be described as "sample a function / place named parts with relations / lay out a graph / fill a grid / instantiate IEEE symbols on a net," it uses DSS+SLK directly.

If a figure has a **frozen textbook canvas** (Sedra hybrid-π, Fischer cross, McCabe staircase algorithm, Smith Γ-plane), a Family Compiler knows that canvas, fills parameters, and still calls SLK so labels cannot sit on strokes.

---

## 11. Remaining specialized catering (the leftover share)

Every leftover family has a method. None are "unsupported." None are "use SVG." None are "AI image."

### 11.1 Chemistry projections and Lewis (CO1, CO5–CO9, CI1–CI4, CI8–CI10, CI12–CI13)

**Method:** in-repo SVG templates with named slots. Newman: front circle + 120° spokes, back Y, dihedral rotation of the back substituents. Fischer: vertical chain, horizontal wedges-toward. Haworth: 5/6 templates, anomer up/down. Chair: 6-vertex parallel-line template, axial/equatorial slots. VSEPR: AXE lookup table (linear … pentagonal bipyramid). Complex Oh: three bond classes (in-plane, wedge, dash). Unit cell: isometric cube + motif points for fcc/bcc/pc/nacl/cscl/zns. d-orbital: 5 glyph paths. Wade: polyhedron nets.

Model emits **which slots are occupied**, not coordinates. SLK places group labels off bonds.

### 11.2 Chemistry mechanisms (CO12)

**Method:** SmilesDrawer/OCL depict each mapped species; a **Bezier arrow compiler** reads `from: lp:O@2` / `to: atom:C@1` and routes double-barbed (pair) or single-barbed (radical) arrows in the label layer, then SLK rejects arrows through atoms. Until OCL passes an `eval` audit, v1 uses SmilesDrawer + atom-index arrows.

### 11.3 Energy ladders / MO / CFT / Jablonski / Frost / nuclear / QM levels (CP1–2, CI5–7, CI15, CP14, CP19, P16, P23, CO18)

**Method:** one leftover **ladder compiler**. Vertical energy axis, rungs, occupancy arrows ↑↓, optional left/right AO columns, dashed barycenter, transition arrows (γ, abs, fluor). Shared across chemistry, physics, inorganic. Model emits level tuples `(id, E, occ, label)`. Compiler owns spacing so occupancy arrows do not collide (a common Gemini failure).

### 11.4 Spectra splitting trees (CP9)

**Method:** after the 1D NMR stick plot (majority `plot` + labella peak numbers), an optional tree under a designated peak: n+1 rule boxes. Compiler, not Gemini.

### 11.5 Electrochemical cell cartoon (CP13)

**Method:** leftover schematic: two beaker rects, salt bridge arc, electrode glyphs, e⁻ arrow, voltmeter, cell notation as KaTeX overlay. Not a molecule.

### 11.6 Field catalogs and ray-optics (P7, P9, P15, P14 geometry)

**Method:** qualitative catalogs (dipole, parallel-plate, wire, solenoid, TE₁₀ grid) as arrow fields — **do not** solve PDEs in the extension. Ray-optics: place axis at mid-height; object at \(x=-d_o\); compute \(d_i\) from the lens equation when \(f,d_o\) given; three principal rays with arrowheads; virtual dashed. Model must not send pixel F positions.

### 11.7 Minkowski, Feynman, Brillouin (P19, P20, P22)

**Method:** Minkowski compiler **forces** 45° null lines and `tan⁻¹v` boosted axes. Feynman: 4–5 templates (s/t/u, decay, Compton) then a small DAG with fermion=straight+arrow, photon=sine polyline, W=dashed; labels off strokes; time L→R frozen. BZ: regular hex/square, high-symmetry dots; 3D FCC as a labeled 2D cut only.

### 11.8 EE templates that are not free layout (E2, E3, E5, E6, E11, E12, E13, E15, E17, E18)

**hybrid-π:** frozen Sedra canvas (vin left, rπ B–E, diamond gm vbe C–E, RC up to VCC, RE to GND). Missing `RC` is a spec error. **op-amp:** frozen triangle, Rf north hop, Rg to source, GND drawn, +/− inside triangle. **phasor:** origin, Re/Im arrowheads, values at projection feet (playbook already specifies this). **Smith:** analytic constant-r/x arcs in the Γ-plane; labels **outside** the disk. **TL bounce:** orthogonal lattice. **one-line:** IEEE generator/xfmr/bus glyphs + dagre. **PWM:** piecewise plot. **timing:** WaveDrom.

Weave (2026, arXiv:2607.03835) is prior art for **netlist → layered layout → schematic** with a round-trip connectivity certificate. It happens to use elkjs; **do not ship elkjs**. The later implementer should steal the *idea* (Sugiyama layered assignment + orthogonal routes + verify connectivity) and implement it with `@dagrejs/dagre` plus in-house IEEE Manhattan stubs, not the LTspice `.asc` backend and not the 1.6 MB GWT worker. netlistsvg is prior art for digital skins + elkjs; analog `direction=DOWN` looks unlike textbooks — steal wiring, not the default analog skin and not the elkjs dependency.

### 11.9 Civil/Mechanical stereotyped canvases (CE1–CE11, ME2–ME6, ME9)

**Method:** 1D beam compiler (pin △, roller ○, fixed ☰, loads to scale, dimensions below). SFD/BMD: three stacked plots sharing x, jump/kink rules, this-segment bold. RC section: rect + rebar circles + Whitney + strain. Retaining wall / soil / column: section templates. Mohr: circle geometry from σ,τ. Linkage: numeric 2-bar intersection. Cam: profile template + stacked s-v-a plots.

### 11.10 ChemE McCabe, psych, reactor glyphs (CH4, CH6–CH9)

**Method:** McCabe compiler **draws the staircase** from α or eq data + R,q,zF,xD — the model must not draw the steps (they will be wrong). Psych: schematic sampled RH curves, not a copyrighted ASHRAE scan. CSTR/PFR/HX: ISA-ish glyphs + optional Levenspiel **plot**.

### 11.11 Biology templates (B1–B3, B8–B10, B12–B13)

**Method:** compartment packer; bilayer template; PMAT chromosome glyphs; gel lanes; organ silhouette path library (small, parametric); neuron tree; operon bar; PCR three-panel. Phylogeny: Newick parse + layered tidy tree via d3-hierarchy or `@dagrejs/dagre` (not elkjs). Anatomy is **templates**, not photos, not AI images.

### 11.12 CS small canvases (S1, S2, S5, S11, S12)

**Method:** equal-cell array tape; list boxes; hash bucket column; Gantt bars with preemption ticks; OSI stacked rects. Not mermaid (wrong metrics).

### 11.13 Commutative diagrams (M31)

**Method:** tikz-cd semantics on a **grid**: cells `[[A,B],[C,D]]`, arrows with `->`, `->>`, hook, dashed, label above. Fixed pitch, shortened arrows, KaTeX overlays. Graphviz aesthetics are wrong here. Custom, tiny.

### 11.14 Digital timing (E18)

**Method:** WaveDrom MIT, lazy import, WaveJSON subset. Gemini must not draw timing rectangles.

### 11.15 Molecules (CO2–CO4, CO10–CO11, CO13–CO17)

**Method:** SmilesDrawer SvgDrawer, MIT, **197 kB min / 58 kB gzip** (`smiles-drawer@2.4.1`, measured 2026-08-21; previous “54 KB gzip” was slightly low), no WASM. Light/dark themes exist. Isomeric SMILES for stereo. This is leftover-from-the-five-engines but **common** in chemistry volume — it is a Family Compiler that ships in phase 4 (see §15), not an afterthought.

### 11.16 Refuse rather than draw badly

The following are **explicitly catered by refusal + spec failure**, not by Gemini SVG and not by AI images: 3D orbital isosurfaces, 3D FCC Brillouin zones, FEA color plots, scanned Tanabe–Sugano plates, ASHRAE psychrometric copyrighted charts, vendor P&IDs, vendor JCAMP/FID blobs (no CC-BY-NC parser), histology photos, true involute gear CAD, Julia sets. If a problem needs one, the step has no diagram (or a 2D cut that a listed family can draw), and `@body` carries the reasoning.

**Second-pass refuse additions (same rule):** 4-set Venn, 3-pasting category diagrams, knot projections >7 crossings, schemes/stacks, CMS event displays, protein ribbons, full 23-pair karyotypes, n>12 attention heatmaps, 100-node nets, GDS/IC layout, OEM compressor maps, ASM Fe–C plates, agency IDF sheets, AISC connection plates, HAZOP worksheets, plant layouts, BAM pileups, 3D reciprocal space, Poincaré 3D balls, 7-DOF robot murals, dense GD&T stacks, scanned Moody/Procheck/Treybal plates. Refusal is a catering method. “The model will sketch SVG” is not.

### 11.17 Energy-adjacent and materials schematics (CI17, ME12–ME13, ME16–ME17, CP26)

**Method:** leftover **schematic-plot** Family Compiler: named curves sampled from closed-form or from a *short* vertex list the model emits (`vertices: x,y …`), never a scanned atlas. Pourbaix: E vs pH line segments + region labels parked by SLK **outside** polygons. Fe–C / TTT: template curves, labels `A1,A3,eutectoid` as ids. Moody: Colebrook evaluated in-house on a log grid (compiler), not a raster. OEM maps and ASM plates **refuse**.

### 11.18 Cycle, gel, ECG, restriction, topology (B8, B16–B32, Krebs)

**Method:** leftover **cycle** template (regular polygon + named nodes + curved arrows; mermaid is wrong because labels contain `()`). **gel** / Western: lanes as vertical sticks + MW ladder, labella on band labels. **ecg**: piecewise PQRST template (not a photo). **restriction**: linear bar or circle with site ticks. **rama**: allowed-region polygons from a tiny in-repo table (Ramachandran core + glycine), not Procheck. Protein **topo** 2D (up/down helices) only; ribbons refuse. **karyo** at most a handful of chromosomes.

### 11.19 CS canvases extra (S18–S32)

**Method:** leftover **kmap** gray-code grid with grouping ellipses as Scene IR strokes (SLK keeps labels off cells). **pipeline** is a Gantt sibling (stages × cycles, stall hatched). **skiplist** stacked list. **ring** circle with hash ticks. **datapath** frozen 5-box template (PC, imem, ALU, regs, dmem). ER: mermaid `erDiagram` already matches `isMalformedDiagram` headers — allowed as leftover mermaid, not as Gemini SVG.

### 11.20 EE templates extra (E21–E38)

**Method:** leftover **frozen canvases** like hybrid-π: Steinmetz xfmr, induction-machine T, 6T SRAM, CMOS inverter. **constel** / **eye**: plot-class leftovers with compiler-owned I/Q grid and overlay traces. **seqnet** / **oneline** share IEEE glyphs. **dq** two-axis overlay. Polar antenna = majority `plot` `kind: polar`. IC layout **refuse**.

### 11.21 Civil/ME/ChemE extras (CE12–CE24, ME18–ME26, CH12–CH22)

**Method:** **openchan** specific-energy curve + jump construction (compiler computes conjugate depths when y1, Fr given). **ponchon** and **ternary** are McCabe siblings: the model emits eq data + operating points; the **compiler draws the staircase / tie construction**. Residue-curve arrows from a tiny in-repo vector field catalog for named ternary systems (only), else refuse. Hydrograph/IDF/traffic = **plot**. Cross-section / slope / piles = section templates. HAZOP / vendor P&ID **refuse**.

### 11.22 Stats, astronomy, control-as-math (M35–M44, P25–P26)

**Method:** stats are majority **plot**/**table** (compiler bins; model sends n, mean, sd or a **short** list, not a CSV dump — oversized data **refuse**). Celestial sphere: leftover isometric template. HR: **plot** log. Control plots reuse EE Bode-class. Huffman **graph**.

---

## 12. +button / protocol instructions the model should receive

This section is the outcome text a later implementer pastes into `core-protocol.md` / playbooks / composer stub. It is specified here; **this goal does not edit those files**.

### 12.1 What stays about the + button

- Still attaches `stemlm-protocol.txt` (core + every playbook).
- Still inserts a short stub, never a protocol wall in the composer.
- Still one ` ```stemlm ` capsule ending `@end`.
- Still no subject picker; `@meta subject:` from the problem.
- Still `@body` required, KaTeX rules, step count 5–12, last step verification.

### 12.2 Composer stub (replace `COMPOSER_OUTPUT_LINE` / diagram reminders)

```
Follow the attached stemlm-protocol.txt exactly. Infer the subject from the problem and apply that playbook in the file.
Reply in ONE fenced stemlm block ending @end (@meta … 5-12 @step … @solution). No prose outside.
Diagrams: emit a complete SPEC of the state at this step (@diagram type=plot|scene|graph|table|circuit|chem.smiles|…); never SVG path coordinates or <svg> markup. The extension compiler will draw it.
```

### 12.3 Core protocol diagram block (replaces the svg: / mermaid: bullets)

Concrete instruction text for `core-protocol.md`:

```
@diagram = COMPLETE state at this step. Every component, force, bond, axis, node, species, or peak named in @body MUST appear as a named id in the spec. Never omit RC/rπ/gm on a hybrid-π; never omit axes on a graph; never emit <svg> or path d="…".
Max one @diagram per @step; close @body before @diagram.

Allowed types (compiler-owned layout — do NOT choose x,y pixels):
- plot: fn / data / poles / peaks; xlabel/ylabel with units; eq: for the curve name; point: ; domain:
- scene: kind=fbd|ray|field|geom; named parts and relations (incline_deg, forces, f, do)
- graph: nodes and edges; mermaid still allowed for CS flow/sequence/state only
- table: kind=ice|dp|punnett|matrix|stream; rows of cells
- circuit: SPICE-like netlist (id n1 n2 value); std=ieee; highlight:
- chem.smiles: SMILES / reaction SMILES; annotations, not coordinates
- templates (when the playbook says so): hybridpi, opamp, newman, fischer, chair, haworth, vsepr, mccabe, sfd, phasor, bode, smith, feynman, minkowski, lewis, mo, cft, cell, timing
- mermaid: CS flow/sequence/state only; quote every node label

FORBIDDEN: <svg>, viewBox, <text x= y=>, <path d=>, <defs><marker>, font-size, stroke-width, Mermaid for circuits/plots/chemistry, AI images, "Symbols:" legends.
If a figure is a function graph, emit fn: and eq: — the compiler will place the equation off the curve.
```

### 12.4 Playbook deltas (per subject, replacing SVG craft)

Keep PRINCIPLES. Replace SVG paragraphs with spec recipes:

- **Math:** `plot` after this move; `scene` for geometry/vectors; `table` for matrices/RREF; omit diagram on purely symbolic algebra.
- **Physics:** step 1 `scene` FBD or `plot` of the given graph; rays as `scene kind=ray` with f, do (not pixels); fields as catalog names.
- **Chemistry:** structures as `chem.smiles`; mechanisms as rxn SMILES + arrows; MO/CFT as `mo`/`cft` level tuples; spectra as peak lists; ICE as `table kind=ice`; Newman/Fischer/chair as those types — never SMILES-as-Newman.
- **Biology:** Punnett `table`; pedigree/pathway `graph`; HWE `plot`; cell/membrane/gel as named templates.
- **CS:** mermaid for flow/sequence/state; `table` for DP (highlight current cell); `graph` for trees/graphs; array/list types for DS traces.
- **Electrical:** `@diagram type=circuit` on nearly every step; step 1 full netlist **or** `type=hybridpi` / `type=opamp` template with **all** of rpi, gm, RE, RC, B,C,E; Bode as poles/zeros not a polyline; phasor as mag∠deg. ≥55% of steps still apply (now as specs).
- **Mechanical:** FBD `scene`; P–V `plot`; shaft/gear/cam templates.
- **Civil:** beam template then `sfd` piecewise; sagging positive.
- **Chemical eng:** PFD with numbered streams; McCabe as α,zF,xD,R,q — **do not** list staircase corners; compiler stairs.
- **General:** adopt the dominant subject's types.

### 12.5 Completeness language (keep, retarget)

Keep: every named component in `@body` must appear. Change: appear **in the spec as an id**, not as SVG `<text>`. Hybrid-π required keys: `rpi`, `gm`, `RE`, `RC`. Op-amp: `Rf`, `Rg`. Plots: `xlabel`, `ylabel` with units when the problem has units.

### 12.6 First-pass self-check (replace "every required SVG is complete")

```
Self-check: exactly one fence ending @end; every @step has worked @body; every visual step has a closed @diagram spec (not SVG) that names every object in @body.
```

### 12.7 Token effect on the attached file

Deleting viewBox/font-size/marker XML instructions and the long SVG walls in `builder.ts` **reduces** attachment size. Adding a compact type catalog (~1–2 KB) is cheaper than the current Electrical SVG wall alone. Ultra variant can include extra template examples, not extra coordinate rules.

### 12.8 Second-pass tighter catalog (still specified here; do not paste into playbooks in this goal)

The §12.3 block is correct. If the attached file must shrink further, replace SVG walls with this catalog and keep one worked example per engine (plot = §6.2). Do **not** add coordinate rules back.

```
DIAGRAMS: compiler draws. You name ids. Never <svg>, viewBox, path d=, text x= y=, markers.
type=plot     fn: | data: | poles: | peaks:  xlabel: ylabel: units  eq:  domain:
type=scene    kind=fbd|ray|geom|field  named parts, relations (incline_deg, f, do) — no pixels
type=graph    node: id label   edge: a b kind   (mermaid OK for CS flow/sequence/state only)
type=table    kind=ice|dp|punnett|matrix  row lines
type=circuit  SPICE-like  id n1 n2 value  std=ieee  highlight:
type=chem.smiles  smiles:  annotate:  (never Newman/Fischer/chair as SMILES)
TEMPLATES when the playbook names them (still no pixels):
hybridpi rpi,gm,RE,RC,B,C,E required
opamp Rf,Rg,+,−,GND required
newman | fischer | chair | haworth | lewis | vsepr
mo | cft | jablonski     level tuples (id,E,occ,label)
mccabe  α or eq data, zF, xD, R, q   — do NOT list staircase corners
sfd     piecewise V(x), M(x)  sagging+
phasor  mag∠deg
smith   z0, zL
feynman | minkowski | timing (WaveJSON)
FORBIDDEN: AI images, "Symbols:" legends, mermaid for circuits/plots/chem, JCAMP dumps.
Refuse (omit @diagram): 3D isosurfaces, FEA heatmaps, scanned copyrighted charts.
```

Token intent: one compact wall instead of ten SVG walls in `builder.ts`. Subject playbooks keep PRINCIPLES and add one line: “use the catalog; Electrical step 1 is `circuit` or `hybridpi`/`opamp` with required keys.”

---

## 13. Compile-to-beautiful-display contract (summary for implementers)

| Actor | Owns | Does not own |
|---|---|---|
| Model (Gemini) | Which objects exist this step; values; topology; highlight; subject | Coordinates, viewBox, fonts, markers, collision, theme, sampling, IEEE geometry |
| Family compiler | Glyphs, templates, sampling, netlist→graph, SMILES depiction, staircase, 45° cone | Theme, sanitizer, PDF |
| SLK | Frame, constraints, label slots, leaders, numbering, semantic colors, markers | Science content |
| `presentSvg` + sanitize | Theme maps, id prefix, display size, XSS | Layout |
| `DiagramRenderer` / PDF | Injection, print CSS | Drawing |

**Beautiful** means: a TA would not be embarrassed to put the figure on a midterm. Labels have a clear target. Numbers match `@body`. Circuits look like Nilsson/Sedra. Plots look like a carefully drawn exam figure (axes, units, eq in a corner). Mechanisms look like Klein/Clayden (skeletal + curved arrows), not a ball-and-stick snapshot.

---

## 14. Why JSON was avoided and how the spec still stays machine-parseable

Keep the historical reason: LaTeX `\` and nested quotes break JSON; SVG would have been worse. The new spec is **more** JSON-like in *information* (typed keys) but **line-oriented** in *syntax*, matching `@meta` and `@quickcheck`. A later implementer may accept JSON5 inside `@diagram` as a secondary parser if models emit it cleanly; the protocol should not require it.

Streaming: `@enddiagram` still closes the block; `@end` still completes the capsule. Capture loop unchanged.

---

## 15. Implementation phases (later-executable; not this goal)

**Phase 0 — types and parser.** Extend `DiagramType`. Parse new types as specs; keep `svg`/`mermaid`. `isMalformedDiagram` per family. Protocol examples switch to specs. Parser tests only.

**Phase 1 — SLK + plot compiler.** Highest ROI: the \(\alpha(t)\) bug is a plot bug. Expr parser; sample; axes; 4-position eq as KaTeX overlay; cubic stroke testing. Wire `resolve-diagram.ts`. Quality: `diagram_label_over_graphic` → 0 on plots.

**Phase 2 — circuit + hybrid-π + op-amp + phasor.** Netlist + IEEE glyphs + **in-house Manhattan / `@dagrejs/dagre` orthogonal stubs**. Frozen Sedra/op-amp canvases. Completeness vs spec ids.

**Second-pass (2026-08-21):** an earlier draft of this line said “Manhattan/ELK.” That contradicted §7.1 (elkjs rejected for v1, 1.6 MB worker, EPL-2.0 OR GPL-3.0-or-later). ELK is **not** a Phase 2 dependency. Optional later only after dagre+stubs fail a measured eval — and only after a legal review of the dual license.

**Phase 3 — scene templates.** FBD, ray-optics, beam/SFD-BMD, PFD, MO/CFT ladder, ICE/Punnett/DP tables.

**Phase 4 — chem.smiles + projections + mechanism arrows.** SmilesDrawer lazy. Newman/Fischer/chair/Haworth/VSEPR templates.

**Phase 5 — graph.** Keep mermaid; `@dagrejs/dagre` for pathways/PFDs/pedigrees/block diagrams. WaveDrom. McCabe staircase. Smith, Feynman, Minkowski. Do not add elkjs.

**Phase 6 — delete salvage prompt walls** once eval (external corpus, `docs/eval-rubric.md` items 5, 8, 9, 10) shows spec diagrams beating SVG. Keep `type=svg` as undocumented hatch.

Do not add WASM/Vega/Graphviz until a measured gap remains after phase 5.

### Dependencies to add by phase

- P1: optional `expr-eval`; optional `@lume/kiwi`
- P2: none if glyphs in-repo; optional `@dagrejs/dagre` if the in-house grid is not enough for free netlists
- P4: `smiles-drawer`
- P5: `@dagrejs/dagre` if not in P2; `wavedrom`; optional labella. **Not** elkjs. **Not** jcampconverter.

---

## 16. Quality audits after the switch

Retarget `diagram-quality.ts`:

- Coverage % still applies (visual problems still need figures on visual steps).
- Completeness: spec ids ⊇ mentioned components.
- `diagram_label_over_graphic` / `diagram_label_collision`: run on **compiled** SVG+overlay, including cubic sampling.
- `diagram_bad_viewbox`: compiler responsibility; fail compile if it cannot fit.
- `diagram_legend_only`: a spec with no series/nodes/devices fails schema.
- Hybrid-π / op-amp required keys: schema, not regex-over-SVG.

Eval rubric (`docs/eval-rubric.md`) dimensions 5–10 remain valid with "spec + compiled SVG" in place of "model SVG."

**Second-pass eval checks (specified now, not implemented):**

- Dim 5 coverage: visual steps have a **closed spec** of an allowed type (not empty, not `<svg>` unless hatch).
- Dim 6 completeness: spec ids ⊇ `@body` mentions; hybrid-π keys `rpi,gm,RE,RC` present **in the spec**; op-amp `Rf,Rg`.
- Dim 7: compiled SVG still sanitizes (no foreignObject/image/script).
- Dim 8: compiled overlay+SVG, **cubic-sampled** strokes, zero label–stroke hits on the screenshot regression (`fn: 1.5*t^2-2*t`).
- Dim 9–10: `computeDisplaySize` step ≤300×165, print ≤480×275.
- New: refuse families must **not** emit a lying figure; malformed spec → `<pre>` not a blank skeleton.
- New: step-sync — same device ids keep relative slots across two consecutive specs that only change `highlight:`.

---

## 17. Risks

| Risk | Mitigation |
|---|---|
| Gemini still emits SVG | Hatch remains; repair line "convert to spec"; protocol forbids `<svg>` |
| Spec malformed | Fail to source, same as mermaid |
| Overlay math in Shadow DOM + print | Share KaTeX CSS already used for formulas **in the panel**. Print iframe currently has no KaTeX CSS — emit `katex.renderToString` HTML so native MathML survives `printStyles()`. Extend `Report` with overlay descriptors |
| Completeness audits false-fail specs | Move audits to IR before shipping playbooks that stop emitting SVG |
| elkjs size / EPL-2.0 **OR GPL-3.0-or-later** | Do not ship. `elk-worker.min.js` is 1,595,334 B min / 464,174 B gzip (elkjs@0.12.0 jsDelivr + local gzip 2026-08-21). Use dagre MIT (3.1.1: 49 kB / 17 kB gzip) instead |
| expr-eval@2.0.2 RCE / `new Function` | In-house Pratt. Never `toJSFunction`. Optional expr-eval-fork@3.0.3 with allowlists |
| kiwi/annealing jitter | Seed from scene hash; cap 50 sweeps |
| Bundle size | Lazy import per family; SmilesDrawer 54 KB gz; no RDKit |
| GPL contamination | Never CircuitJS, never ChemDoodle |
| "Every topic" scope creep | Families above are the pass bar; new exam items reuse a family |

---

## 18. External sources consulted

**In-repo:** `README.md`; `src/protocol/{core-protocol.md,core-protocol.ultra.md,playbooks.ts,builder.ts,parser.ts,types.ts,diagram-quality.ts,protocol.ts}`; `src/lib/{resolve-diagram.ts,svg-present.ts,mermaid.ts,sanitize.ts,diagram-bounds.ts,pdf.ts,file-inject.ts}`; `src/components/DiagramRenderer.tsx`; `docs/eval-rubric.md`. Motivating artifact: compiled kinematics graph screenshot (label \(\alpha(t)=1.5t^{2}-2t\) on the stroke). Smoking gun in code: `pathLineSegments` only handles `M/L`.

**Layout / compilers:** `@dagrejs/dagre@3.1.1` (MIT, `dist/dagre.min.js` 48,956 B / 17,112 B gzip, jsDelivr+local gzip 2026-08-21; Bundlephobia v3.0.0 was 37.8 kB / 13 kB gzip); mermaid@11.15.0 in-tree (MIT; `mermaid.core.mjs` 48 kB loader); Weave (arXiv:2607.03835, 2026-07-04 — **paper exists**) as *algorithm* prior art (steal Sugiyama + round-trip connectivity; do not ship elkjs); netlistsvg MIT but depends on elkjs — steal wiring, not the dep; elkjs@0.12.0 **EPL-2.0 OR GPL-3.0-or-later**, `elk-worker.min.js` **1,595,334 B / 464,174 B gzip**, unpacked ~8 MB — rejected; CMU Penrose; `@lume/kiwi@0.4.4` BSD-3; labella@1.1.4 Apache-2.0 (unmaintained — steal VPSC); Yoeli 4-position; Christensen–Marks–Shieber; Khan Graphie. **Not** jcampconverter@12.5.5 CC-BY-NC-SA-4.0. **Not** expr-eval@2.0.2 (CVE-2025-12735).

**Plots:** function-plot (Mauricio Poppe; sampling idea; eval/CSP risk); Vega-Lite; JSXGraph (MIT/LGPL); Mafs; Plotly; Chart.js; uPlot; d3-contour; expr-eval.

**Circuits:** IEEE Std 315 / IEC 60617; CircuiTikZ (look, not runtime); schemdraw/lcapy (Python, out); CircuitJS (GPL, out); Circuit2TikZ (browser GUI, TeX export); tscircuit schematic-symbols (MIT glyph source); WaveDrom; control-systems Bode/Nyquist/rlocus as *data* not drawers.

**Chemistry:** SmilesDrawer `smiles-drawer@2.4.1` (MIT, SvgDrawer, JCIM 2017; **197 kB min / 58 kB gzip**); OpenChemLib JS `openchemlib@9.25.0` BSD-3-Clause (`openchemlib.js` 1.10 MB + `resources.json` 1.35 MB); Kekule.js (MIT, too big); RDKit.js (WASM, too big); Ketcher (no); ChemDoodle (GPL/proprietary, no); mhchem via KaTeX (already in).

**Biology / graphs:** Cytoscape.js SBGN stylesheet (canvas, too heavy as renderer; steal glyph ideas); phylotree.js / IcyTree (Newick); Pathway Commons SBGN.

**Other:** KaTeX SVG-output limitations (`foreignObject` vs overlay); MathJax SVG (optional later); @hpcc-js/wasm Graphviz (heavy); Typst WASM (heavy); chartjs-chart-smith (stale; custom Γ-plane instead).

---

## 19. Family counts (checklist)

| Subject | Named families | Majority engine | Leftover Family Compilers (each has §11 method) |
|---|---|---|---|
| Maths | 34 | plot, scene, graph, table | cd; topology IDs; isometric TNB |
| Physics | 23 | plot, scene, circuit | field catalog, ray-optics, ladder, feynman, minkowski, bz, orbital glyphs, stress cube, mechanism scene |
| Chemistry organic | 20 | chem.smiles, plot, graph | lewis, newman, sawhorse, fischer, haworth, chair, mechanism, frost |
| Chemistry inorganic | 16 | graph, table, ladder | vsepr, complex, cft/mo, TS schematic, unit cell, miller, polyhedra, dorb, cluster, JT |
| Chemistry physical | 22 | plot, table, graph | mo-ladder, echem cell, latimer/frost, jablonski, NMR tree |
| Biology | 15 | table, graph, plot | cell, membrane, division, gel, anatomy, neuron, operon, PCR, newick |
| Computer Science | 17 | mermaid, graph, table, plot, circuit | array, list, hash, gantt, net-stack |
| Electrical | 20 | circuit, plot, graph, mermaid | hybridpi, mospi, opamp, phasor, smith, tline, oneline, twoport, pwm, wavedrom, device I–V |
| Mechanical | 11 | scene, plot | mohr, shaft, gear, cam, linkage, vib, fin |
| Civil | 11 | plot | beam, truss, frame, sfd-bmd, IL, mohr, wall, soil, column, rc |
| Chemical eng | 11 | graph, plot | PFD glyphs, P&ID-lite, CV, mccabe, reactor, hx, packed, psych |
| General | (routes) | dominant subject | dominant subject |

**Majority scheme name:** Declarative Scene Spec (DSS) + stemLM Figure Compiler (SFC) + Shared Layout Kernel (SLK).

**Screenshot regression spec:** §6.2. Compiler contract: §8. Protocol/+button: §12. AI images: rejected in §4 and in every leftover method.

**Second-pass (2026-08-21):** original family counts above are unchanged (first-pass inventory). Additional families are in **§9.13** with leftover methods **§11.17–§11.22**. Every addendum has a catering method or an explicit refuse. The five engines stay named. Parser implications §21; operational holes §22; worked leftover specs §23; ranked libs §24; sixth-engine argument §25; contenders that lose §26.

---

## 20. One-page later-implementer brief

1. Do not ask Gemini for SVG coordinates again.
2. Keep `@diagram` … `@enddiagram` and `@end`.
3. Teach `type=plot|scene|graph|table|circuit|chem.smiles|templates…`.
4. Build SLK first (cubic-aware label placer + KaTeX overlay). Ship plot next. The screenshot is then impossible.
5. Build circuit + hybrid-π/op-amp/phasor/Bode so Electrical is masters-honest.
6. Build SmilesDrawer + Newman/Fischer/chair so organic is honest.
7. Build SFD/BMD + McCabe so Civil/ChemE are honest.
8. Every leftover family in §11 has a compiler or a refuse-to-draw rule. None fall back to "the model will sketch it."
9. Sanitize, theme, panel bounds, vector PDF stay.
10. No AI images. No TeX server. No GPL CircuitJS.

This is a compiler problem that was being treated as a prompt problem. Stop asking the model for coordinates. Keep `@diagram`. Compile.

---

## 21. Parser vs spec (later implementer; do not implement in this goal)

The inner grammar in §6 is the *plan*. The shipped parser is the *present*. Mixing them up is the first way this compiler dies in review.

### 21.1 What the shipped parser actually does

| Fact | Location |
|---|---|
| `DiagramType = 'svg' \| 'mermaid'` | `src/protocol/types.ts` |
| `parseDiagramOpen` `/type\s*=\s*([a-z]+)/i`; non-mermaid → `'svg'` | `parser.ts` ~260–264 (not exported) |
| Dotted / hyphenated families lose the suffix | `chem.smiles` → capture `chem`; `sfd-bmd` → capture `sfd` |
| `isMalformedDiagram` svg requires `<svg\b`; mermaid requires a header including `classDiagram` / `erDiagram` | `parser.ts` ~314–321 |
| Malformed diagrams are **still stored** on the step | `parser.ts` ~371–380 |
| `resolveDiagramSvg` has two branches: svg finalize vs mermaid | `resolve-diagram.ts` |
| Empty / no graphic shapes → `<pre>` | `DiagramRenderer.tsx` + `svgMarkupHasGraphicShapes` |

A capsule that already followed §6 (`type=plot` + `fn:`) is, **today**, a failed figure with the spec in a `<pre>`. That is acceptable during the SVG era. It is a **blocker** the day playbooks stop asking for SVG.

### 21.2 Required parser change (specified, not written)

1. Extend `DiagramType` with at least: `plot | scene | graph | table | circuit | mermaid | svg` plus leftover tokens (`hybridpi`, `opamp`, `newman`, `fischer`, `chair`, `haworth`, `lewis`, `vsepr`, `mo`, `cft`, `mccabe`, `sfd`, `phasor`, `smith`, `feynman`, `minkowski`, `timing`, `chem.smiles` or `chem-smiles`).
2. Type regex: `/type\s*=\s*([a-z][a-z0-9]*(?:[.-][a-z0-9]+)*)/i`. Prefer **dots** in the protocol (`chem.smiles`) *or* hyphens (`chem-smiles`) — pick one in the protocol and accept the other as an alias.
3. **Do not collapse** unknown types to `svg`. Keep the token. Unknown → resolve fail → `<pre>` with a warning `unknown_diagram_type`.
4. `isMalformedDiagram`:
   - `svg` / `mermaid`: keep current checks (hatch + CS).
   - spec families: require at least one `key: value` line and forbid a raw `<svg` unless type is `svg`.
   - templates: required keys (hybrid-π `rpi,gm,RE,RC`; op-amp `Rf,Rg`; McCabe `zF,xD,R` or `α`; Newman `axis` + substituents).
5. Nested lists: 2-space `- item` **only inside `@diagram`**. Do not teach nested `@` markers.
6. `caption:` optional key → `Diagram.caption` (type already has the field; parser ignores it today).
7. Math `$…$` in values is opaque text. Capsule parser must not split on `$`.
8. Tests: `type=plot` with §6.2 body is **not** `malformed_diagram`; `type=chem.smiles` preserves the family; `type=svg` hatch still works; `type=plot` without `fn:`/`data:`/`peaks:`/`poles:` is malformed.

### 21.3 Dispatch

`resolve-diagram.ts` grows a third branch beside svg and mermaid:

```
if type in SPEC_FAMILIES: compileSpec(diagram) → SVG + Overlay[] → sanitize → presentSvg
```

Lazy `import()` per engine (same as mermaid). Timeout budget 12 s (reuse `MERMAID_TIMEOUT_MS`). Compile throw / unsatisfiable labels / expr parse fail → empty SVG → existing `<pre>`.

`presentSvg` stays last mile (theme, markers, id prefix). Compiler SVG should already be collision-free; nudge is defense in depth. **Cubic sampling must live in SLK**, not in the M/L nudger — but upgrading `pathLineSegments` to sample `C/Q/S/A` is a cheap safety net even before SLK ships.

### 21.4 Quality auditor retarget

`extractMentionedComponents` greps `@body` then greps `<text>`. After switch: spec ids ⊇ mentions. Hybrid-π template fills or **rejects** missing `RC` *before draw* (pick reject — §8.5). Do not keep SVG-text regex as the source of truth once playbooks stop emitting SVG.

---

## 22. Operational holes a later implementer would curse

### 22.1 Overlay descriptors (panel + print)

```
Overlay = { id, kind: 'katex' | 'text', source: string, x, y, anchor: 'start'|'middle'|'end', baseline: 'hanging'|'middle'|'alphabetic' }
```

- Coordinates in **viewBox user units**. Convert with `getDisplayScale(viewBox, profile)` to CSS px.
- Panel: sibling nodes inside `figure.slm-diagram`, not inside the SVG. KaTeX CSS already in Shadow DOM.
- Print: `Report` must accept `diagramSvg` **and** `diagramOverlays` (or a combined HTML snippet). `katex.renderToString(source, { output: 'htmlAndMathml', throwOnError: false })`. Print CSS already hides `.katex-html` and shows MathML. **Do not** put KaTeX HTML inside SVG (`foreignObject` is stripped).
- XSS: overlay `source` is math-only (charset `$\\{}^_^()[].,0-9a-zA-Z` plus a whitelist of commands). Never `innerHTML` of a model string that is not KaTeX-rendered.
- If overlay pipeline is not ready, plot `eq:` may degrade to SVG `<text>` **only** for ASCII-ish ids (`R1`, `N`). The screenshot equation **must not** be SVG `<text>` — it is the whole point of overlays.

### 22.2 Label placer edge cases

Gap: `max(6, 0.55·fontSize)` as already in the nudge code (`svg-present.ts`).

| Case | Rule |
|---|---|
| Screenshot cubic | Sample `fn` to polyline (≥80 pts, extra near |f'|). 4-pos around **curve bbox**, start `eq_slot` else NE. Reject any candidate whose bbox is within gap of **any** sampled segment. Leader only if all 4 fail. |
| Two series | Independent 4-pos; if both want NE, second takes NW then SE. Never stack. |
| NMR inverted axis | Peaks are 1D labels on the **top** of the plot; labella VPSC; ppm numbers **above** ticks, not on the stick. |
| Phasor | Value at **projection foot**, current id at **arrowhead offset**, never on the shaft (playbook already). Protected: axis names. |
| FBD | Force labels at 4-pos relative to **arrow midpoint**, reject shaft. Body name off the glyph. Axes labels beyond arrowheads. |
| Circuit designator | IEEE: id **above** symbol, value **below**. Protected pair — placer may shift both, not one. |
| Newman | Substituent labels along spoke **outward**, min 8 px from circle. Back (Y) labels slightly smaller. Dihedral arc label in a free wedge. |
| Hybrid-π | Frozen canvas already leaves N/E/S/W slots; placer may only use those slots. Do not “optimize” `r_π` onto the diamond. |
| McCabe staircase | Stage numbers **inside** horizontal treads if they fit; else leader to the right of y=x. Never on the eq curve. |
| SFD/BMD | Ordinate labels 1D-packed on each plot; x-axis labels shared, not repeated three times. |
| Dense card | If unsatisfiable after 50 seeded sweeps: **fail the figure**. Do not shrink below 12 px. Do not rotate labels except 90° axis names. |
| Leader crossings | Straight first, then orthogonal “po”. Leaders may not cross each other or strokes. Max 3 leaders per figure at step size. |
| Tick numbers | `protected: true`. Placer does not move ticks to dodge a curve — the curve is data. |
| KaTeX bbox vs SVG text | Measure overlay with a hidden KaTeX render (or a cached width table for common eqs). Do not assume `text.length * 7`. |

Stroke collection for collision **must** include: line, polyline, polygon, rect edges, circle/ellipse sampled, path **C/Q/S/A/M/L**. Today's collector is the screenshot bug.

### 22.3 Numbering

Keep §8.4. Extra rules:

- Circuit: model **names** `R1`; compiler never renames a provided id. Missing id → `R{n}` next free, and a warning (completeness).
- Equations in a figure that cite `@formula` use the same `(n)`.
- Atom numbers only if `number_atoms: true` or named annotations.
- Stream numbers boxed on the arrow, not floating.
- Peak numbers 1…k in spec order, not in model-chosen `(x,y)`.
- Never reuse `(1)` for a different equation in the same capsule.

### 22.4 Step-sync stability

- Scene ids are stable keys. Layout of unchanged ids is a function of **the set of ids + template**, not of `highlight:`.
- Highlight restyles stroke (`semanticColor: accent`) and may add a halo. It does **not** re-seed annealing.
- Seed = hash(family + sorted ids + template name), **not** `Math.random()`.
- `presentSvg` `prefixSvgIds` uses `Math.random()` today — that is **last-mile uniqueness** for marker refs, not layout. Snapshot tests must ignore prefixed ids.
- Mermaid: keep mermaid's own layout; do not re-flow for highlight. If mermaid jitters, switch that figure to `type=graph` + dagre with `rankdir` + node ids.

### 22.5 Theme

- Compiler emits **semantic** strokes: `neutral | accent | muted | danger | guide` (dashed). Never `#000`.
- `presentSvg` `themeSvgTree` remains defense in depth for hatch SVG and for any hex that leaks.
- Dark panel: schematic fills already have `themeSchematicFill`. Family glyphs should use `fill="currentColor"` or semantic classes `slm-glyph-fill`.
- Print profile is **always light** (`pdf.ts` resolves `'light'`). Overlays must not assume dark CSS variables.

### 22.6 Sanitizer

Always `sanitizeSvg` then `presentSvg`, including compiler output (XSS via a label, bugs). Keep `foreignObject`/`image`/`script` forbidden. Mermaid path may `preserveInlineStyles`. Compiler path should not need inline `style` — use attributes + classes.

Label text: escape `<` `&` in SVG `<text>`. KaTeX overlay: render API, not innerHTML of raw model.

### 22.7 Failure modes (clean failure beats a lying figure)

| Failure | UI |
|---|---|
| Unknown type / malformed spec | existing `slm-diagram--failed` + spec source |
| Expr parse fail / pole in domain without `poles:` | same |
| SMILES parse fail | same + first error token |
| Unsatisfiable labels | same — **do not emit overlap** |
| Timeout 12 s | same |
| Missing hybrid-π required keys | reject spec (preferred) or template-fill + warning — **pick reject** |
| Refuse family | no `@diagram`; `@body` carries reasoning. If the model still emits a spec, compiler fails with `refused_family` |
| Hatch `type=svg` with no graphics | same `<pre>` as today |

Never a skeleton that looks like success.

### 22.8 Taste / what to hide on a 300×165 card

A TA would not be embarrassed. That means **less ink**, not more:

- Axes: name, units, 2–4 ticks. No minor grid. No chartjunk. No “Symbols:” legend. Direct labels.
- Circuits: ≤6 value labels on a step card; rest in `@body`. Junction dots; hops on crosses; VCC top / GND bottom; L→R signal.
- One highlight set. Secondary traces muted.
- Print 480×275 may restore a legend of ≤4 items or minor ticks.
- If the scene needs two stacked plots (Bode mag/phase, SFD/BMD), **split the viewBox**, do not shrink fonts.
- Horizontal labels. 90° axis names only.

---

## 23. Worked leftover specs (implementer-facing)

§6.2 (plot, screenshot class) remains the majority worked example. These are the leftovers the first pass named but did not fully spec.

### 23.1 Hybrid-π (E2) — frozen Sedra canvas

```
@diagram type=hybridpi
rpi: 1.2k
gm: 50m
RE: 270
RC: 2.2k
ro: 50k
vin: n_b
supply: VCC
gnd: 0
highlight: RC
@enddiagram
```

**Compiler job:** instantiate the frozen canvas: `vin` left, `r_π` B–E, diamond `g_m v_be` C–E, `R_C` up to VCC, `R_E` to GND, optional `r_o` C–E. Nodes `B,C,E` always exist. Missing `RC:` is a **spec error** (do not draw a fragment). SLK may only place labels in reserved slots (id above, value below). Completeness: ids `rpi, gm, RE, RC, B, C, E`. Token cost ~40. Gemini cannot omit the collector.

MOSFET π (`type=mospi`) shares the canvas with `gm, gmb, RD, RS, Cgs`.

### 23.2 Newman (CO5)

```
@diagram type=newman
axis: C2-C3
deg: 60
front: H, CH3, H
back: H, H, Br
highlight: Br
@enddiagram
```

**Compiler job:** front circle + 120° spokes; back Y rotated by `deg`; substituents from the spec in clockwise order starting from the top spoke. Sawhorse is `view: sawhorse` on the same parser. SMILES cannot choose this view — that is why it is leftover. SLK: labels outward along spokes. Dihedral arc optional.

### 23.3 McCabe–Thiele (CH4)

```
@diagram type=mccabe
alpha: 2.5
zF: 0.4
xD: 0.95
xB: 0.05
R: 1.5
q: 1
highlight: feed
@enddiagram
```

**Compiler job:** unit square; y=x; eq curve from α (or from `eq:` x,y list); q-line; OL from xD,R; **compiler draws the staircase** until xB. Model must **not** list corners (they will be wrong). Stage numbers packed. Axes x,y mole frac. Token cost ~30. Ponchon (`type=ponchon`) is the sibling: H–x,y + the same staircase rule.

### 23.4 SFD/BMD (CE4)

```
@diagram type=sfd
L: 8
sign: sagging+
supports: pin@0, roller@8
loads: 10kN@2, UDL 4kN/m 3-7
V: 0 8.5; 2 8.5; 2 -1.5; 7 -1.5; 7 -9.5; 8 -9.5
M: 0 0; 2 17; 7 9.5; 8 0
section: 2
highlight: V
@enddiagram
```

**Compiler job:** three stacked plots sharing x (load | V | M) **or** beam glyph + V + M if the card is print-sized. Jump/kink rules from beam theory as a linter (optional v1). This-segment bold via `section:`. Positive sagging is a compiler flag (`sign:`), not Gemini's habit. Civil SFD is **not** ME shaft SFD. Labels: ordinates 1D-packed; never on the polyline.

If the model omits `V:`/`M:` but supplies `loads:` + `supports:`, a later phase **may** compute V(x), M(x) in-house. v1 may require piecewise `V:`/`M:` and still **draw** them — the model is not the layout engine.

### 23.5 MO ladder (CP1 / CI6)

```
@diagram type=mo
molecule: O2
mix: true
left: 2s -32 2; 2p -15.8 4
right: 2s -32 2; 2p -15.8 4
center: s2s -36 2; s2s* -28 2; s2p -18 2; p2p -16 4; p2p* -12 4; s2p* -10 0
electrons: 16
highlight: p2p*
@enddiagram
```

**Compiler job:** three columns (AO | MO | AO), energy up, dashed barycenter, occupancy arrows ↑↓ that **do not collide** (the common Gemini failure). Mixing (`mix: true`) swaps σ2p / π2p order. Shared with CFT (`type=cft`), Jablonski, nuclear decay, Frost circle ticks. Model emits **tuples**, not y-pixels.

---

## 24. Ranked libraries (re-verified 2026-08-21)

Majority path is **not** swapped on a blog post. These are options with current license + size.

| Rank | Piece | Choice | License | Measured size | Use |
|---|---|---|---|---|---|
| 1 | Graph layout | `@dagrejs/dagre@3.1.1` | MIT | 48,956 B / 17 kB gzip | Layered DAGs. v1. |
| 1 | Molecules | `smiles-drawer@2.4.1` SvgDrawer | MIT | 197 kB / 58 kB gzip | Phase 4. |
| 1 | Timing | `wavedrom@3.6.2` | MIT | 40 kB / 15 kB gzip | E18 leftover. |
| 2 | Constraints | `@lume/kiwi@0.4.4` ESM | BSD-3 | solver.js 32 kB / 6.8 kB gzip (no published min) | Optional SLK. |
| 2 | 1D pack | labella **algorithm** | Apache-2.0 | 22.5 kB / 6.8 kB if shipped | Optional; unmaintained 2017. |
| 2 | Expr | **in-house Pratt** | MIT (ours) | tiny | v1 default. |
| 3 | Expr fallback | `expr-eval-fork@3.0.3` | MIT | not re-gzipped | Allowlists; never `toJSFunction`. |
| 3 | Trees | `d3-hierarchy` | ISC | tiny class | Newick tidy. |
| 3 | Contours | `d3-contour` | ISC | tiny class | Implicit/level sets. |
| 3 | Euclidean leftover | JSXGraph (MIT fork of dual MIT/LGPL) | MIT OR LGPL-3.0-or-later | core size UNTRUSTED this pass; unpacked 78 MB docs | Only if in-house `scene` geom is too thin. Not majority. |
| 3 | Charts (not majority) | Vega-Lite 6.4.3 | BSD-3 | needs Vega peer; unpacked 5.8 MB | Weak at FBD/circuits/chem. |
| 4 | Stereo leftover | OpenChemLib 9.25.0 | BSD-3 | 1.10 MB JS + 1.35 MB resources | After eval audit. |
| reject | elkjs 0.12.0 | EPL-2.0 **OR GPL-3.0-or-later** | 1.595 MB / 464 kB gzip | v1 no. |
| reject | jcampconverter 12.5.5 | CC-BY-NC-SA-4.0 | tiny | Spectra = peak lists. |
| reject | expr-eval 2.0.2 | MIT but CVE-2025-12735 + `new Function` | 51 kB / 10.5 kB | no. |
| reject | function-plot 1.25.4 | MIT | eval deps | steal sampling only. |
| reject | netlistsvg 1.0.2 | MIT | pulls elkjs | steal skins only. |
| reject | CircuitJS, ChemDoodle, RDKit-JS, Ketcher, Plotly, Chart.js, uPlot, Mafs, Cytoscape, Penrose, Typst WASM, 3Dmol | GPL / proprietary / multi-MB / canvas | — | unchanged. |

**tscircuit schematic-symbols:** GitHub MIT; npm name `@tscircuit/schematic-symbols` **404** this pass. Steal paths only after a named tarball is license-checked. Do not adopt the React stack.

**Weave** (arXiv:2607.03835, 2026-07-04): verified netlist→schematic + connectivity certificate. Steal the *certificate* (reparse compiled schematic → netlist, diff). Do not ship their backend.

---

## 25. Stressing the five engines (keep them named)

The five majority engines stay: `plot`, `scene`, `graph`, `table`, `netlist` (`type=circuit`).

They are the **wrong abstraction** for frozen textbook canvases. That is why leftovers exist — not because the five failed as a majority scheme.

| Figure | Why not plot/scene/graph/table/netlist | Catering |
|---|---|---|
| Screenshot kinematics | **is** plot — this is the majority win | `plot` |
| FBD | **is** scene | `scene` |
| DP table / ICE | **is** table | `table` |
| Pedigree / PFD | **is** graph | `graph` + dagre |
| Mesh circuit | **is** netlist | `circuit` |
| Hybrid-π | Free netlist omits `R_C` (today's EE failure). Frozen canvas required | leftover **hybridpi** |
| Newman | SMILES cannot choose the view | leftover **newman** |
| McCabe staircase | Model-drawn stairs are wrong | leftover **mccabe** |
| SFD/BMD | Three aligned plots + jump rules + sagging+ | leftover **sfd** |
| MO ladder | Occupancy arrows collide unless a ladder compiler owns spacing | leftover **mo** |
| Smith | Analytic r/x arcs, labels **outside** the disk | leftover **smith** |
| Feynman | Edge types (fermion/photon/W) + templates s/t/u | leftover **feynman** |
| Chair / Fischer / Haworth | Frozen stereograms | leftover templates |
| WaveDrom | Timing bricks | leftover **timing** |
| Commutative diagrams | Grid + harpoons, not Sugiyama | leftover **cd** |
| Pourbaix / Fe–C / Moody | Schematic curves, not scans | leftover schematic-plot or **refuse** |

**Candidate sixth engine: `ladder`.** Used by MO, CFT, Jablonski, QM wells, nuclear decay, Frost, Latimer. Volume is real. **Do not rename the five** in this document. If a later implementer promotes `ladder`, keep this section so the evolution is visible. `chem.smiles` is the other volume-high leftover — still a Family Compiler, not a sixth majority engine.

---

## 26. Alternative considered and why it loses

DSS+SLK remains the primary recommendation. None of the following met the replacement bar (least AI tokens **and** no overwrite **and** clean numbering **and** human textbook look **and** MV3 no-server **and** no LLM in the compiler **and** vector PDF **and** leftover coverage **and** MIT-compatible deps, with several families where DSS+SLK fails and the contender succeeds).

### 26.1 Contender A — Vega-Lite majority + mermaid + SmilesDrawer

**Idea:** plots are Vega-Lite JSON; CS is mermaid; molecules are SMILES; everything else is leftover anyway.

**Where it looks strong:** M2, M24, CP8–CP12, E7–E9, B14.

**Where it loses (concrete families, specs the Vega path cannot honor at card size without becoming DSS anyway):**

1. **Hybrid-π** — Vega has no IEEE glyphs, no frozen Sedra canvas, no `RC` completeness. Spec in §23.1 has no Vega encoding.
2. **Newman** — not a chart. Spec in §23.2.
3. **FBD** — not a chart; constraint layout. Spec §6.5.
4. **McCabe staircase** — Vega can scatter eq data; it will not *construct* the stairs. Spec §23.3.
5. **SFD/BMD sign convention + stacked jumps** — Vega stacked charts fight 300×165 and do not know sagging+. Spec §23.4.

Also: Vega-Lite is JSON-fragile (the reason the *capsule* is not JSON), needs Vega (multi-hundred-kB+), and dashboard aesthetic. **Does not replace DSS+SLK.**

### 26.2 Contender B — keep model SVG + cubic-aware salvage

**Idea:** upgrade `pathLineSegments` to sample C/Q/S and keep prompting for coordinates.

**Where it looks strong:** cheapest compiler.

**Where it loses:** salvage still cannot invent missing `R_C`, cannot force 45° Minkowski, cannot draw a McCabe staircase from α, cannot number IEEE slots, cannot step-sync. The screenshot might get a 6 px hop onto a worse overlap. Token cost stays 8–20×. **Fails least-AI-tokens, completeness, numbering, leftover honesty.** Cubic sampling is a *safety net*, not a majority architecture.

### 26.3 Contender C — Typst/TikZ WASM or CircuiTikZ server

**Idea:** the gold look.

**Where it loses:** WASM not default-allowed (`wxt.config.ts` has no CSP; Chrome default disables WASM on extension pages). Multi-megabyte fonts. Server violates no-server. Latency vs step cards. **Fails MV3 no-server / size / CSP.** Steal CircuiTikZ *look*, not the runtime.

### 26.4 Contender D — JSON Scene IR as the capsule payload

**Idea:** typed JSON inside `@diagram`.

**Where it loses:** the in-tree reason for avoiding JSON still applies (LaTeX `\` in `eq:`). A JSON-inside-diagram *parser of last resort* is already allowed in §14. Making JSON the protocol **increases** Gemini breakage without beating line-oriented DSS on any leftover family. **Does not replace.**

No contender is promoted. The previous recommendation is **not** archived because it was not replaced.

---

## 27. Protocol/+button second-pass (compact, still not pasted into product files)

Keep §12.1–§12.7. The tighter catalog is §12.8.

Composer stub (replace diagram reminders only):

```
Follow the attached stemlm-protocol.txt. Infer @meta subject. One fenced stemlm block ending @end.
Diagrams: SPEC of this step's state (@diagram type=plot|scene|graph|table|circuit|chem.smiles|templates). Never SVG coordinates or <svg>.
```

Repair line if Gemini still emits SVG: “convert each figure to a spec; do not emit path coordinates.” Hatch `type=svg` remains parseable.

---

## 28. Implementer checklist (non-goals of *this* research pass, required of the later build)

1. Parser: §21.2 — type regex, no collapse, family `isMalformedDiagram`.
2. SLK: cubic stroke sampler + 4-pos + leaders + seeded annealing + fail-closed.
3. Plot engine first (screenshot regression test in §8.5).
4. Overlay descriptors in `DiagramRenderer` **and** `Report` / `pdf.ts`.
5. Circuit + hybrid-π/op-amp/phasor (Electrical honesty) **without elkjs**.
6. SmilesDrawer + Newman/Fischer/chair.
7. SFD/BMD + McCabe.
8. Retarget `diagram-quality.ts` to spec ids; eval dims 5–10.
9. Delete SVG prompt walls only after eval shows specs winning.
10. Never: AI images, JSON capsule, LLM-in-compiler, CircuitJS, jcampconverter, elkjs v1, expr-eval@2.0.2, `Function()`, `foreignObject`.

DSS+SLK is still the majority scheme. Coverage does not stop at 75%. The leftover catalog plus §9.13 plus refuse is the rest.
