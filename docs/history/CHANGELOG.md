# Figure Lab change log

- `artifacts/figlab/loop/{backlog.md,queue.json,STATE.md,TRENDS.md,topics/140*.md,140-compile.lab.ts}`:
  recorded Electrical / Digital Logic at queue position 140. The fresh protocol-only generator
  emitted an XOR/XNOR truth matrix; exact compile and sharp rasterization passed, but the
  independent scorer returned `wrong` because the indexed source is a gate network plus a
  Karnaugh-map construction. The deepest classification was L-VOCAB; existing BL-082 was raised
  to two distinct topics and remains deferred under Rule of Four. The next queue position is 141.

- `artifacts/figlab/loop/{backlog.md,queue.json,STATE.md,TRENDS.md,topics/139*.md,139-compile.lab.ts}`:
  recorded Electrical / Counters at queue position 139. The fresh protocol-only generator emitted
  a nine-row 3-bit count matrix; exact compile and sharp rasterization passed, but the independent
  scorer returned `wrong` because the indexed source is a sixteen-row borderless four-bit listing
  with seven red inter-row toggle arrows. The deepest classification was L-VOCAB; BL-085 was
  raised to two distinct topics and remains deferred under Rule of Four. The next queue position
  is 140.

- `artifacts/figlab/loop/{backlog.md,queue.json,STATE.md,TRENDS.md,topics/138*.md,138-compile.lab.ts}`:
  recorded CS / UML Sequence at queue position 138. The fresh protocol-only generator emitted a
  four-column message comparison matrix; exact compile and sharp rasterization passed, but the
  independent scorer returned `wrong` because the indexed source is a three-row UML notation
  legend with actual solid/dashed arrows and arrowheads. The deepest classification was L-VOCAB;
  BL-085 was added and deferred under Rule of Four. The next queue position is 139.

- `artifacts/figlab/loop/{backlog.md,queue.json,STATE.md,TRENDS.md,topics/137*.md,137-compile.lab.ts}`:
  recorded CS / Automata States at queue position 137. The fresh protocol-only generator
  emitted a rectangular six-position DFA matrix; exact compile and sharp rasterization passed,
  but the independent scorer, rerun with the corrected corpus path and three real topic images,
  returned `wrong` because the source is a single borderless Input/State/Output trace with ragged
  rows and a half-column offset. The deepest classification was L-VOCAB; BL-084 was added and
  deferred under Rule of Four. The next queue position is 138.

- `artifacts/figlab/loop/{queue.json,STATE.md,TRENDS.md,topics/136*.md,136-compile.lab.ts}`:
  recorded Math / Relations and Mappings at queue position 136. The fresh protocol-only
  generator emitted a relation matrix; the exact compile and sharp rasterization passed, and the
  independent scorer returned `faithful` with all nine defect axes false. The exact spec is frozen
  in `src/lib/figure/l3-table.test.ts`; no backlog item was added. The next queue position is 137.

- `artifacts/figlab/loop/{queue.json,STATE.md,TRENDS.md,topics/135*.md,135-compile.lab.ts}`:
  recorded Math / Inverse Trigonometric Geometry at queue position 135. The fresh protocol-only
  generator emitted a four-row matrix of the given legs and inverse-tangent angle results; the
  exact compile and sharp rasterization passed, and the independent scorer returned `faithful`
  with all nine defect axes false. The exact spec is frozen in `src/lib/figure/l3-table.test.ts`;
  no backlog item was added. The next queue position is 136.

- `artifacts/figlab/loop/{queue.json,STATE.md,TRENDS.md,topics/134*.md,134-compile.lab.ts}`:
  recorded CS / Scheduling Charts at queue position 134. The fresh protocol-only generator
  emitted a non-preemptive SJF results matrix; the exact compile and sharp rasterization passed,
  and the independent scorer returned `faithful` with all nine defect axes false. The exact spec
  is frozen in `src/lib/figure/l3-table.test.ts`; no backlog item was added. The next queue
  position is 135.

- `artifacts/figlab/loop/{queue.json,STATE.md,TRENDS.md,topics/133*.md,133-compile.lab.ts}`:
  recorded Math / Binomial Patterns at queue position 133. The first DP table render was
  numerically correct but fragmented into one-column panels, so the independent scorer returned
  `wrong`, deepest L-LAYOUT. A generalized coherent uniform-matrix layout repair was implemented
  and its focused regression failed before the fix and passed after. The rerender was scored
  `faithful` with all nine defect axes false; the exact spec is frozen in
  `src/lib/figure/l3-table.test.ts`. The capability helps wide truth tables, coefficient grids,
  state-transition tables, and DP matrices. No backlog item was added. The next queue position is
  134.

- `artifacts/figlab/loop/{queue.json,STATE.md,TRENDS.md,topics/132*.md,132*-compile.lab.ts}`:
  recorded Electrical / Flip Flops at queue position 132. The first protocol-only generator used
  an undocumented table kind and syntax, so the exact compile failed closed and the separate
  scorer returned `not-representable`; this was classified L-PROTOCOL. A compact generalized
  matrix/DP protocol clarification was added, helping sequence, data, comparison, and DP tables.
  The fresh rerun compiled and rasterized a four-row D-flip-flop next-state table, and the
  independent scorer returned `faithful` with all nine defect axes false. The exact spec is frozen
  in `src/lib/figure/l3-table.test.ts`; no backlog item was added. The next queue position is 133.

- `artifacts/figlab/loop/{queue.json,STATE.md,TRENDS.md,topics/131*.md,131-compile.lab.ts}`:
  recorded Biology / Biotechnology Workflows at queue position 131. The fresh protocol-only
  generator emitted a seven-row PCR workflow matrix with stage, temperature, duration or cycle
  count, and molecular purpose. The exact Figure Lab compile and sharp rasterization passed; the
  independent scorer returned `faithful` with all nine defect axes false. The exact spec is frozen
  in `src/lib/figure/l3-table.test.ts`; no backlog item was added. The next queue position is 132.

- `artifacts/figlab/loop/{backlog.md,queue.json,STATE.md,TRENDS.md,topics/130*.md,130-compile.lab.ts}`:
  recorded Math / Sequences and Series at queue position 130. The fresh protocol-only generator
  emitted a plural `rows:` shorthand for a five-row progression table; the exact Figure Lab
  render flattened those records and produced a duplicate panel. The independent scorer returned
  `wrong`, deepest `L-PRIMITIVE`. BL-083 records generalized plural multi-row table shorthand for
  sequence, data, comparison, matrix, and DP tables and remains deferred at one Rule-of-Four
  raise; no topic-specific primitive was built. The next queue position is 131.

- `artifacts/figlab/loop/{queue.json,STATE.md,TRENDS.md,topics/129*.md,129-compile.lab.ts}`:
  recorded CS / Truth Tables at queue position 129. The fresh protocol-only generator emitted a
  seven-column contrapositive truth table; the exact Figure Lab compile and sharp rasterization
  passed. The independent scorer compared it with the implication and contrapositive references
  and returned `faithful` with all defect axes false. The exact spec is frozen in
  `src/lib/figure/l3-table.test.ts`; no backlog item was added. The next queue position is 130.

- `artifacts/figlab/loop/{queue.json,STATE.md,TRENDS.md,topics/128*.md,128-compile.lab.ts}`:
  recorded Biology / Digestion and Absorption at queue position 128. The exact verbose
  five-column table initially failed closed for readable height. Independent scorer reruns exposed
  and rejected dense wrapping, disconnected tiles, and boundary overflow; generalized table-lane
  repairs now derive one coherent measured matrix, preserve row/column adjacency, keep labels
  inside cells, and retain compact leading-key grids. The final independent scorer returned
  `faithful` against the three exact references, and the exact spec is frozen in
  `src/lib/figure/l3-table.test.ts`. No backlog item was added; the next queue position is 129.

- `artifacts/figlab/loop/{queue.json,STATE.md,TRENDS.md,topics/127*.md,127-compile.lab.ts}`:
  recorded Math / Distributions at queue position 127. The fresh protocol-only generator emitted
  a binomial PMF matrix table; the exact Figure Lab compile and sharp rasterization passed. An
  independent scorer compared the clean two-column table with the dual-distribution graph and two
  probability-table references and returned `faithful` with all defect axes false. The exact spec
  is frozen in `src/lib/figure/l3-table.test.ts`; no backlog item was added because the generalized
  table capability already covers distribution tables. The next queue position is 128.

- `artifacts/figlab/loop/{backlog.md,queue.json,STATE.md,TRENDS.md,topics/126*.md,126-protocol-rerun4-compile.lab.ts}`:
  recorded CS / Normalization at queue position 126. The protocol-only generator initially emitted
  a graph and failed closed; successive independent reruns established generalized text/table,
  transformation-state, and one-delimiter guidance. Generalized table wrapping, capacity, and
  column alignment then made the three input/intermediate/final matrix states compile and render;
  singular pipe-delimited rows now fail closed while legacy plural `rows:` compatibility remains.
  The independent scorer returned `faithful` against the lossy-decomposition, lossless-join, and
  design-goals references. The exact spec is frozen in `src/lib/figure/l3-table.test.ts`. No
  backlog item was added; the next queue position is 127. The protocol rules help compiler,
  algorithm, state-machine, process, matrix, DP, comparison-table, truth-table, and dense
  structured-data topics.

- `artifacts/figlab/loop/{backlog.md,queue.json,STATE.md,TRENDS.md,topics/125*.md,125-compile.lab.ts}`:
  recorded CS / Truth Tables and Logic Circuits at queue position 125. The fresh protocol-only
  generator emitted a generic multi-gate graph on the fixed table route, which compiled and
  rasterized. The independent scorer compared it with the exact `01-not-gate-symbol-truth-table.png`
  reference and three related logic-circuit images and returned `wrong`: the reference is a single
  triangular NOT gate with inversion bubble and a two-row truth table, not an A/B/C multi-gate graph.
  The deepest layer was L-VOCAB; BL-082 records generalized digital logic-gate and truth-table
  notation for computing topics and remains deferred under Rule of Four. No source fix or faithful
  test was added. The next queue position is 126.

- `artifacts/figlab/loop/{backlog.md,queue.json,STATE.md,TRENDS.md,topics/124*.md,124-compile.lab.ts}`:
  recorded Physics / Thermodynamic Cycles at queue position 124. The fresh protocol-only
  generator emitted a rectangular P–V cycle, which compiled and rasterized. The independent
  scorer compared it with the exact `07-thermodynamics.png` reference and three related Physics
  images and returned `wrong`: the candidate omitted the source P/V axes and curved C–D process,
  drew C–D as a vertical segment, and added unsupported isochoric-cooling and unit claims. The
  deepest layer was L-PRIMITIVE; BL-081 records generalized curved thermodynamic process paths
  and P–V frame conventions for multiple cycle families and remains deferred under Rule of Four.
  No source fix or faithful test was added. The next queue position is 125.

- `artifacts/figlab/loop/{backlog.md,queue.json,STATE.md,TRENDS.md,topics/123*.md,123-compile.lab.ts}`:
  recorded Math / Quadratic Loci at queue position 123. The fresh protocol-only generator emitted
  a focus/directrix scene, which compiled and rasterized. The independent scorer compared it with
  the exact `01-degenerated-point-conic.png` reference and two related Quadratic Loci images and
  returned `wrong`: the reference requires a double cone, vertical axis and arrowheads,
  intersecting plane, degenerate point, and α/β angle markings, not focus/directrix points and
  segments. The deepest layer was L-VOCAB; BL-080 records generalized conic-section and
  degenerate-conic vocabulary for analytic-geometry, optics, and projection topics and remains
  deferred under Rule of Four. No source fix or faithful test was added. All required verification
  gates passed; the next queue position is 124.

- `artifacts/figlab/loop/{backlog.md,queue.json,STATE.md,TRENDS.md,topics/122*.md,122-compile.lab.ts}`:
  recorded Math / Limits Graphs at queue position 122. The fresh protocol-only generator emitted
  a removable-discontinuity plot using `type=plot` on the fixed `scene` route, and it compiled and
  rasterized. The independent scorer compared it with the exact
  `06-unit-circle-sinx-less-than-x-less-tanx.png` reference and two related corpus images and
  returned `wrong`: the candidate omitted the unit circle, center and named points, angle, tangent,
  secant, radius, perpendicular foot, and inequality construction. The deepest layer was
  L-PRIMITIVE; BL-079 records generalized unit-circle/tangent/secant/radius primitives for other
  calculus and geometry topics and remains deferred under Rule of Four. No source fix or faithful
  test was added. All required verification gates passed; the next queue position is 123.

- `artifacts/figlab/loop/{backlog.md,queue.json,STATE.md,TRENDS.md,topics/121*.md,121-compile.lab.ts}`:
  recorded Math / Differential Equations at queue position 121. The fresh protocol-only generator
  emitted direction-field and solution-curve geometry scenes, which compiled and rasterized. The
  independent scorer compared the combined render with the exact
  `01-poincare-portrait-chapter-opener.png` reference and two related corpus images and returned
  `wrong`: the reference is a framed Henri Poincare portrait with caption, not a node-link figure.
  The deepest layer was L-PRIMITIVE; BL-078 records generalized framed portrait/image-panel/caption
  capability for chapter-opening topics and remains deferred under Rule of Four. No source fix or
  faithful test was added. All required verification gates passed; the next queue position is 122.

- `artifacts/figlab/loop/{backlog.md,queue.json,STATE.md,TRENDS.md,topics/120*.md,120-compile.lab.ts}`:
  recorded Electrical / Control Block Diagrams at queue position 120. The fresh protocol-only
  generator emitted a generic closed-loop control network, which compiled and rasterized. The
  independent scorer compared it with the exact `03-synchro-remote-position-indication.png`
  reference and two related corpus images and returned `wrong`: the candidate omitted the
  mechanical transmitter, shaft/lever, synchro coupling, receiver, and compass-style directional
  dial. The deepest layer was L-VOCAB; BL-077 records generalized synchro/servo angle-transfer
  vocabulary for electromechanical control topics and remains deferred under Rule of Four. No
  source fix or faithful test was added. All required verification gates passed; the next queue
  position is 121.

- `artifacts/figlab/loop/{backlog.md,queue.json,STATE.md,TRENDS.md,topics/119*.md,119-compile.lab.ts}`:
  recorded CS / ER Diagrams at queue position 119. The fresh protocol-only generator emitted
  eight generic graph candidates for entities, attributes, relationships, cardinalities, and
  recursive prerequisites, but all failed compilation: the first had overlapping nodes and the
  rest had labels that did not fit their geometry. The independent scorer therefore returned
  `not-representable` against the exact ER notation reference and two related images. The deepest
  layer was L-PRIMITIVE; BL-076 records generalized entity/attribute/relationship notation for
  database and knowledge-representation topics and remains deferred under Rule of Four. No source
  fix or faithful test was added. All required verification gates passed; the next queue position
  is 120.

- `artifacts/figlab/loop/{backlog.md,queue.json,STATE.md,TRENDS.md,topics/118*.md,118-compile.lab.ts}`:
  recorded CS / Deadlocks at queue position 118. The fresh protocol-only generator emitted a
  waits-for graph for two mutexes and two processes, which compiled and rasterized. The separate
  independent scorer compared it with the exact `02-simple-deadlock-code.png` reference and two
  related corpus images and returned `wrong`: the reference is two-thread mutex-lock code with a
  caption, not a graph. The deepest layer was L-PROTOCOL because code-as-text should remain in
  the capsule and trigger WHEN NOT TO DRAW. No backlog item, source fix, or faithful test was
  justified. All required verification gates passed; the next queue position is 119.

- `artifacts/figlab/loop/{backlog.md,queue.json,STATE.md,TRENDS.md,topics/117*.md,117-compile.lab.ts}`:
  recorded CS / Compiler Pipelines at queue position 117. The fresh protocol-only generator
  produced fourteen pipeline-state diagrams for the worked compiler expression; all compiled
  and rasterized. The independent scorer compared the combined render with the exact
  `04-code-generation-strategy.png` slide and two related corpus references and returned `wrong`:
  the candidate repeated tiny pipeline boxes instead of the slide title and code-generation
  bullet content. The deepest layer was L-PROTOCOL because this text-heavy reference should have
  triggered the existing WHEN NOT TO DRAW rule. No backlog item, source fix, or faithful test was
  justified. All required verification gates passed; the next queue position is 118.

- `artifacts/figlab/loop/{backlog.md,queue.json,STATE.md,TRENDS.md,topics/116*.md,116-bl036-reruns-compile.lab.ts}`:
  recorded Chemistry / Vapour Pressure at queue position 116. The initial and post-build
  protocol-only generators and the independent rubric scorers were separate fresh
  `gpt-5.6-luna` high-reasoning tasks. BL-036 reached Rule Four after Kinetic Theory,
  Thermochemistry, Gas Laws, and Vapour Pressure, so the generalized L1 scene engine gained
  fail-closed gas-state and thermodynamic-graph vocabulary plus its permanent
  `src/lib/figure/l1-thermodynamic.test.ts` regression. The four blocked-topic reruns all
  compiled and rasterized, but independent scoring remained `wrong`: Kinetic Theory raised
  BL-074 for cylindrical vessel/piston-load primitives, while Vapour Pressure raised BL-075 for
  flask/manometer phase-equilibrium primitives. Thermochemistry was L-LAYOUT and Gas Laws was
  L-PROTOCOL; no special-case fix was made and no faithful spec was frozen. The final measured
  state is 1 faithful, 98 wrong, 45 deferred, and 75 backlog items under Rule of Four. All
  required verification gates passed.

- `artifacts/figlab/loop/{backlog.md,queue.json,STATE.md,TRENDS.md,topics/115*.md,115-compile.lab.ts}`:
  recorded Chemistry / Qualitative Analysis. The protocol-only generator produced a valid generic
  silver-nitrate halide test, but the independent scorer returned `wrong` against the nitrogen
  Prussian-blue corpus reference because the candidate omitted that reaction’s reagent and
  observation sequence. New BL-073 records reusable qualitative diagnostic-test apparatus
  primitives for other chemistry and biology laboratory topics; it remains deferred under Rule of
  Four. All required verification gates passed.

- `artifacts/figlab/loop/{backlog.md,queue.json,STATE.md,TRENDS.md,topics/114*.md,114-compile.lab.ts}`:
  recorded Chemistry / Gas Laws. The exact protocol-only generator first emitted a generic piston
  apparatus; a general source-class/plot-schema protocol repair led the fresh reruns to a liquid-
  vapor apparatus and then a plotted data curve, but the independent scorer still returned `wrong`
  because the render was a cluttered malformed single-curve drawing with raw identifiers, missing
  source axes and liquid curves, incorrect geometry, and clipped edge ink. A general shared-layout
  repair added bounded local placement and leader-crossing checks for crowded anchored labels; this
  helps data plots, geometry diagrams, and apparatus callouts. The residual was classified
  L-VOCAB and raised existing BL-036 to three distinct topics; it remains deferred under Rule of
  Four. All required verification gates passed.

- `artifacts/figlab/loop/{backlog.md,queue.json,STATE.md,TRENDS.md,topics/113*.md,113-compile.lab.ts}`:
  recorded Biology / Population Growth Curves. The exact protocol-only generator first emitted a
  sampled logistic polyline; a general causal-curve protocol repair led the fresh rerun to a
  six-part population balance, but the independent scorer still returned `wrong` because generic
  boxes omitted the signed inflow/outflow actors and stock-flow construction. New BL-072 records
  reusable signed stock-flow balance primitives for other ecology, process, and circuit topics; it
  remains deferred under Rule of Four. All required verification gates passed.

- `artifacts/figlab/loop/{backlog.md,queue.json,STATE.md,TRENDS.md,topics/112*.md,112-compile.lab.ts}`:
  recorded Biology / Plant Growth and Development. The exact protocol-only generator first emitted
  a phototropism flowchart; a general topic-only protocol repair led the fresh rerun to a canonical
  root-tip structure, but the independent scorer still returned `wrong` because generic boxes
  substituted for the corpus seed-embryo drawing. New BL-071 records reusable seed-embryo,
  meristem, cotyledon, root-tip, and developmental-section morphology for other plant topics; it
  remains deferred under Rule of Four. All required verification gates passed.

- `artifacts/figlab/loop/{backlog.md,queue.json,STATE.md,TRENDS.md,topics/111*.md,111-compile.lab.ts}`:
  recorded Biology / Mineral Nutrition. The exact protocol-only generator compiled and rasterized
  a generic root-ion transport network, but the independent scorer returned `wrong`: the exact
  corpus reference requires a water-culture apparatus with a plant, pot, nutrient solution, roots,
  feeding funnel, and aerating tube. New BL-070 records reusable plant-culture apparatus vocabulary
  for other plant topics. It remains deferred under Rule of Four.

- `artifacts/figlab/loop/{backlog.md,queue.json,STATE.md,TRENDS.md,topics/110*.md,110-compile.lab.ts}`:
  recorded Biology / Food Webs. The exact protocol-only generator compiled and rasterized a
  generic food-web network, but the independent scorer returned `wrong`: the exact Silver Springs
  reference requires a quantified vertical energy-flow model with trophic-level bars, productivity
  values, heat and decomposer paths, and a legend. Two general L-PROTOCOL repairs and fresh
  generator/scorer reruns still rendered generic scene boxes and rails, with no material fidelity
  improvement. No backlog item was created; the ecology guidance helps Ecosystem Energy Flow and
  Pyramids, Mineral Nutrition, and Biogeochemical Cycles.

- `artifacts/figlab/loop/{backlog.md,queue.json,STATE.md,TRENDS.md,topics/109*.md,109-compile.lab.ts}`:
  recorded Biology / Excretory Products and Their Elimination. The exact protocol-only generator
  compiled and rasterized three generic nephron pipelines, but the independent scorer returned
  `wrong`: the exact corpus image requires a renal-corpuscle cross-section with afferent/efferent
  arterioles, Bowman’s capsule, and a glomerular capillary tuft. New BL-069 records reusable
  nephron and microvascular anatomy primitives for other biology anatomy topics. It remains
  deferred under Rule of Four.

- `artifacts/figlab/loop/{backlog.md,queue.json,STATE.md,TRENDS.md,topics/108*.md,108-compile.lab.ts}`:
  recorded Biology / Breathing and Exchange of Gases. A general copyrighted/text-only-source guard
  was added to `src/protocol/registries.ts`; the fresh protocol rerun still scored `wrong` with no
  material fidelity improvement.

- `artifacts/figlab/loop/{backlog.md,queue.json,STATE.md,TRENDS.md,topics/107*.md,107-compile.lab.ts}`:
  recorded Biology / Body Fluids and Circulation. The generic circulation network scored `wrong`
  against the realistic anatomical-heart reference; BL-068 records reusable cardiovascular anatomy
  and vessel-morphology capabilities and remains deferred under Rule of Four.

Historical iteration gates and detailed verification evidence remain in
`artifacts/figlab/loop/STATE.md` and `artifacts/figlab/loop/TRENDS.md`.
