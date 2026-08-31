# Figure Loop backlog

Rule of Four: backlog-per-topic stayed flat at 1.00 through iterations 1–3, so the loop raised the
threshold from three to four distinct topics. An L-VOCAB or L-PRIMITIVE capability is built only
after four distinct topics raise the same general need. Items below are evidence, not implementation
approval.

## BL-085 — semantic message-arrow legend vocabulary

- Layer: L-VOCAB
- Raised by: 2 distinct topics — CS / UML Sequence (iteration 138); Electrical / Counters
  (iteration 139)
- Missing object: semantic declarations for table-level arrow annotations that draw solid or
  dashed lines, filled or open arrowheads, explicit direction, and semantic colour either in
  notation-legend rows or between sequence rows; the current matrix DSL can only place prose in
  cells and cannot express these direct visual marks.
- General capability candidate: reusable table annotation vocabulary for line styles, arrowheads,
  directions, colours, and directly rendered message or signal marks applicable to CS / UML
  Sequence, Electrical / Counters, electrical signal legends, graph-edge notation, and other
  comparison or state tables whose rows combine semantic line marks with labels. This is a
  capability for other topics, not a stored message, arrow, direction, colour, or image.
- Rule status: deferred until four distinct topics raise the same capability; do not build yet.

## BL-084 — borderless ragged execution-trace table vocabulary

- Layer: L-VOCAB
- Raised by: 1 distinct topic — CS / Automata States (iteration 137)
- Missing object: semantic declarations for a borderless alignment-only trace with named row
  labels, ragged row lengths, and a fractional row offset that places each input symbol between
  consecutive state entries; the current matrix DSL requires rectangular `headers` and repeated
  `row` records and has no offset or border-style vocabulary.
- General capability candidate: reusable execution-trace, ragged-row, fractional-offset, and
  borderless-alignment vocabulary applicable to CS / Automata States, CS / Scheduling Charts,
  sequence/data tables, and other stepwise process tables with different row lengths, labels,
  offsets, and conventions. This is a capability for other topics, not a stored DFA question,
  string, state sequence, value, or image.
- Rule status: deferred until four distinct topics raise the same capability; do not build yet.

## BL-083 — plural multi-row table shorthand representation

- Layer: L-PRIMITIVE
- Raised by: 1 distinct topic — Math / Sequences and Series (iteration 130 final)
- Missing object: a generalized table capability that preserves separate row records and their
  column relationships when a `rows:` declaration contains multiple delimited rows; the current
  plural shorthand can flatten the entire list into cells and emit a duplicate or misleading
  panel instead of a faithful matrix.
- General capability candidate: reusable parsing and rendering for explicit multi-row shorthand
  across sequence tables, comparison/data tables, matrices, and dynamic-programming tables with
  different headers, row counts, delimiters, and values. This is a capability for other topics,
  not a stored sequence, row, value, or image.
- Rule status: deferred until four distinct topics raise the same capability; do not build yet.

## BL-080 — conic-section and degenerate-conic construction vocabulary

- Layer: L-VOCAB
- Raised by: 1 distinct topic — Math / Quadratic Loci (iteration 123 final)
- Missing object: semantic declarations for a double cone, axis and arrowheads, an intersecting
  plane, a degenerate point or pair of lines, and α/β angle markings; generic point, segment,
  relation, and dimension records cannot describe the conic-section construction faithfully.
- General capability candidate: reusable conic-section vocabulary for cones, planes, axes,
  degeneracies, section curves, focus/directrix features, and angle annotations applicable to
  Math / Conic Sections, Math / Coordinate Geometry, Physics / Optics and projection geometry,
  and other analytic-geometry figures with different orientations, parameters, and labels. This
  is a capability for other topics, not a stored quadratic-locus question, conic, angle, or image.
- Rule status: deferred until four distinct topics raise the same capability; do not build yet.

## BL-081 — curved thermodynamic process paths and P–V frame conventions

- Layer: L-PRIMITIVE
- Raised by: 1 distinct topic — Physics / Thermodynamic Cycles (iteration 124 final)
- Missing object: convention-bearing pressure–volume axes and non-rectilinear process paths,
  including a curved C–D leg and its connected cycle traversal; the existing generic state/path
  primitives draw a rectangular loop and cannot expose the supplied cycle geometry faithfully.
- General capability candidate: reusable P–V/T–S frame conventions, curved or piecewise process
  trajectories, direction-bearing cycle paths, and process-leg annotations applicable to Carnot,
  Otto, Diesel, Brayton, refrigeration, gas-law, phase-change, and other thermodynamic-cycle
  figures with different states, curves, orientations, and values. This is a capability for other
  topics, not a stored thermodynamic-cycle question, path, value, or image.
- Rule status: deferred until four distinct topics raise the same capability; do not build yet.

## BL-082 — digital logic-gate and truth-table notation vocabulary

- Layer: L-VOCAB
- Raised by: 2 distinct topics — CS / Truth Tables and Logic Circuits (iteration 125 final);
  Electrical / Digital Logic (iteration 140)
- Missing object: semantic declarations for triangular AND/OR/NOT gate bodies, inversion bubbles,
  input/output terminals, intermediate Boolean signals, aligned truth-table rows, and Karnaugh
  map grids with variable axes, minterm cells, and grouping loops; generic graph boxes and edges
  cannot describe the supplied logic notation faithfully.
- General capability candidate: reusable typed logic-gate symbols, inversion and polarity marks,
  signal terminals, Boolean-expression links, truth-table layouts, Karnaugh-map grids, and group
  annotations applicable to digital logic, Boolean algebra, combinational and sequential circuits,
  CPU/ALU blocks, PLC diagrams, and other computing figures with different gates, variables,
  expressions, rows, maps, and outputs. This is a capability for other topics, not a stored
  NOT-gate question, Boolean expression, row, map, value, or image.
- Rule status: deferred until four distinct topics raise the same capability; do not build yet.

## BL-079 — unit-circle tangent and secant construction primitives

- Layer: L-PRIMITIVE
- Raised by: 1 distinct topic — Math / Limits Graphs (iteration 122)
- Missing object: a unit circle with center and named points, an angle wedge, tangent and secant
  lines, a radius, a perpendicular foot, and connected inequality annotations; a generic function
  plot with markers cannot depict the trigonometric limit construction.
- General capability candidate: reusable circle-center, arc/angle, tangent, secant, radius,
  perpendicular-foot, and inequality-annotation primitives applicable to Math / Trigonometric
  Inequalities, Math / Circle Geometry, Physics / Circular Motion, Physics / Ray Optics, and other
  calculus or geometry figures with different angles, curves, labels, and values. This is a
  capability for other topics, not a stored unit-circle question, angle, inequality, or image.
- Rule status: deferred until four distinct topics raise the same capability; do not build yet.

## BL-078 — framed portrait and caption primitives

- Layer: L-PRIMITIVE
- Raised by: 1 distinct topic — Math / Differential Equations (iteration 121)
- Missing object: a recognizable framed historical-person portrait with a caption beneath it; generic
  nodes, links, and labels cannot depict a portrait chapter-opener faithfully.
- General capability candidate: reusable portrait or specimen image panels, ornamental frames, and
  caption placements applicable to Mathematics / History of Mathematics, Physics / Scientists,
  Chemistry / Historical Notes, Biology / Taxonomy, and other chapter-opening figures with different
  people, specimens, labels, and dates. This is a capability for other topics, not a stored Poincare
  portrait, name, date, or image.
- Rule status: deferred until four distinct topics raise the same capability; do not build yet.

## BL-076 — entity-relationship notation primitives

- Layer: L-PRIMITIVE
- Raised by: 1 distinct topic — CS / ER Diagrams (iteration 119)
- Missing object: entity rectangles with attribute compartments and key marks, relationship
  diamonds, cardinality labels, recursive or ternary connectors, and relationship-attribute
  geometry; generic graph boxes and edges cannot depict ER notation faithfully.
- General capability candidate: reusable entity, attribute, relationship, cardinality, recursive,
  ternary, and relationship-attribute notation applicable to CS / Normalization, database schema
  design, relational modeling, and knowledge-representation diagrams with different entities,
  attributes, constraints, labels, and values. This is a capability for other topics, not a stored
  ER question, schema, value, or image.
- Rule status: deferred until four distinct topics raise the same capability; do not build yet.

## BL-077 — synchro-servo angle-transfer vocabulary

- Layer: L-VOCAB
- Raised by: 1 distinct topic — Electrical / Control Block Diagrams (iteration 120)
- Missing object: semantic declarations for synchro transmitter and receiver, stator/rotor angle
  coupling, mechanical shaft and lever transfer, null/error indication, and a directional receiver
  dial; generic control-system blocks cannot express the electromechanical construction.
- General capability candidate: reusable synchro/servo signal-transfer vocabulary for transmitter,
  receiver, shaft, angular displacement, null detector, and indicator relations applicable to
  Electrical / Servo Mechanisms, Electrical / Instrumentation, Electrical / Synchronous Machines,
  Physics / Measurement and Errors, and other electromechanical control figures with different
  angles, labels, and values. This is a capability for other topics, not a stored synchro question,
  device, angle, or image.
- Rule status: deferred until four distinct topics raise the same capability; do not build yet.

## BL-073 — qualitative diagnostic-test apparatus primitives

- Layer: L-PRIMITIVE
- Raised by: 1 distinct topic — Chemistry / Qualitative Analysis (iteration 115)
- Missing object: recognizable test-tube or vessel sequences, reagent additions, sample and extract
  states, precipitate or color observations, and confirmatory-test branches; generic apparatus
  boxes and unlabeled reaction arrows do not depict the supplied nitrogen Prussian-blue test.
- General capability candidate: reusable qualitative-test vessels, reagent/sample roles, staged
  additions, observable color or precipitate outcomes, and confirmatory branches applicable to
  Chemistry / Solutions, Chemistry / Redox Cells, Biology / Enzyme Activity, and other diagnostic
  laboratory figures with different substances, observations, and values. This is a capability for
  other topics, not a stored nitrogen test, reagent, value, or image.
- Rule status: deferred until four distinct topics raise the same capability; do not build yet.

## BL-074 — cylindrical gas-vessel and piston-load primitives

- Layer: L-PRIMITIVE
- Raised by: 1 distinct topic — Physics / Kinetic Theory (iteration 116)
- Missing object: a recognizable rounded or cylindrical vessel, granular gas-region fill, and an
  explicit weighted piston/load construction; a generic rectangular container with point particles
  does not expose that textbook kinetic-theory apparatus.
- General capability candidate: reusable vessel silhouettes, bounded gas-region fills, piston loads,
  and pressure-contact annotations applicable to Gas Laws, Thermodynamic Cycles, Vapour Pressure,
  Molecular Collisions, and other pressure-vessel figures with different dimensions, states, and
  values. This is a capability for other topics, not a stored Kinetic Theory question, value, or image.
- Rule status: deferred until four distinct topics raise the same capability; do not build yet.

## BL-075 — phase-equilibrium flask and manometer primitives

- Layer: L-PRIMITIVE
- Raised by: 1 distinct topic — Chemistry / Vapour Pressure (iteration 116)
- Missing object: a liquid reservoir and flask neck connected to a U-tube manometer or pressure
  indication across staged evaporation and condensation states; generic boxes, particles, and arrows
  do not expose the dynamic-equilibrium apparatus.
- General capability candidate: reusable phase-reservoir, flask, vapor-space, manometer, and staged
  equilibrium-state primitives applicable to Solutions, Gas Laws, Boiling and Phase Diagrams,
  Qualitative Analysis, and other laboratory equilibrium figures with different substances, pressures,
  temperatures, and observations. This is a capability for other topics, not a stored Vapour Pressure
  question, value, or image.
- Rule status: deferred until four distinct topics raise the same capability; do not build yet.

## BL-072 — signed stock-flow balance primitives

- Layer: L-PRIMITIVE
- Raised by: 1 distinct topic — Biology / Population Growth Curves (iteration 113)
- Missing object: a recognizable central stock with distinct signed inflow and outflow arrows,
  plus/minus annotations, and separated source/sink nodes; generic unlabeled relation boxes do not
  depict the supplied population-density balance construction.
- General capability candidate: reusable stock-and-flow blocks, signed arrowheads, source/sink
  balance marks, and causal feedback connectors applicable to Ecosystem Energy Flow, Biogeochemical
  Cycles, Chemical Reaction Networks, and electrical/process balance figures with different stocks,
  flows, signs, labels, and values. This is a capability for other topics, not a stored population
  question, value, or image.
- Rule status: deferred until four distinct topics raise the same capability; do not build yet.

## BL-071 — seed-embryo and meristem morphology primitives

- Layer: L-PRIMITIVE
- Raised by: 1 distinct topic — Biology / Plant Growth and Development (iteration 112)
- Missing object: recognizable dicot seed-embryo morphology with nested cotyledon and axis outlines,
  radicle/plumule structures, and numbered anatomical callouts; generic labeled rectangles and
  routed relations do not depict the supplied botanical structure.
- General capability candidate: reusable seed-embryo, meristem, cotyledon, root-tip, and plant
  developmental-section glyphs with inspectable nesting and label callouts applicable to Plant
  Tissues, Plant Life Cycles, Photosynthesis in Higher Plants, and other plant-development figures
  with different organs, stages, labels, and arrangements. This is a capability for other topics,
  not a stored Plant Growth and Development question, embryo, or image.
- Rule status: deferred until four distinct topics raise the same capability; do not build yet.

## BL-068 — cardiovascular anatomy and vessel-morphology primitives

- Layer: L-PRIMITIVE
- Raised by: 1 distinct topic — Biology / Body Fluids and Circulation (iteration 107)
- Missing object: a recognizable anatomical heart silhouette with red muscular chambers and septum,
  blue vena cava and pulmonary vessels, realistic chamber/vessel geometry, internal flow, and
  anatomical label callouts; generic apparatus boxes and routed relations cannot depict the supplied
  heart illustration.
- General capability candidate: reusable organ silhouettes, chamber and vessel morphology,
  red/blue fluid conventions, internal flow paths, and anatomical label callouts applicable to
  Animal Tissues, Muscle Contraction, Breathing and Exchange of Gases, and Excretory Products and
  Their Elimination when showing different organs, tubes, chambers, and labeled transport paths.
  This is a capability for other topics, not a stored Body Fluids and Circulation question, heart,
  value, or image.
- Rule status: deferred until four distinct topics raise the same capability; do not build yet.

## BL-070 — plant water-culture apparatus vocabulary

- Layer: L-VOCAB
- Raised by: 1 distinct topic — Biology / Mineral Nutrition (iteration 111)
- Missing object: a water-culture setup with a recognizable plant or twig, container/pot, nutrient
  solution, root system, feeding funnel, and aerating tube; a root-ion transport network cannot
  express the apparatus construction or its physical connections.
- General capability candidate: reusable plant-culture apparatus vocabulary for containers,
  nutrient media, roots, aeration/feeding tubes, and plant tissue connections applicable to Plant
  Tissues, Photosynthesis in Higher Plants, and Plant Growth and Development with different plants,
  media, labels, and experimental arrangements. This is a capability for other topics, not a stored
  Mineral Nutrition experiment, plant, or image.
- Rule status: deferred until four distinct topics raise the same capability; do not build yet.

## BL-069 — renal-corpuscle and nephron microanatomy primitives

- Layer: L-PRIMITIVE
- Raised by: 1 distinct topic — Biology / Excretory Products and Their Elimination (iteration 109)
- Missing object: a recognizable renal corpuscle cross-section with afferent and efferent
  arterioles, Bowman’s capsule, a red glomerular capillary tuft, and anatomical label callouts;
  generic boxes and routed relations cannot depict the supplied nephron anatomy.
- General capability candidate: reusable nephron and microvascular cross-sections, capsule and
  tubular morphology, capillary-tuft glyphs, vessel entry/exit, and anatomical callouts applicable
  to Animal Tissues, Breathing and Exchange of Gases, Body Fluids and Circulation, and other
  organ-level biology figures with different structures, labels, and transport paths. This is a
  capability for other topics, not a stored Excretory Products question, organ, value, or image.
- Rule status: deferred until four distinct topics raise the same capability; do not build yet.

## BL-067 — Venn and sample-space partition primitives

- Layer: L-PRIMITIVE
- Raised by: 1 distinct topic — Math / Probability Trees (iteration 106)
- Missing object: a framed sample space with overlapping set boundaries, complement and
  intersection labels, curved partition regions, and semantic shading for event regions; generic
  scene boxes and routed relations cannot depict the Venn proof or total-probability partition in
  the supplied references.
- General capability candidate: reusable sample-space frames, overlapping and nested set-region
  boundaries, event/complement/intersection labels, region shading, and partition annotations for
  set-theory, conditional-probability, Bayes, and total-probability figures with different event
  names, partitions, and probabilities. This is a capability for other topics, not a stored
  Probability Trees question, event set, value, or image.
- Rule status: deferred until four distinct topics raise the same capability; do not build yet.

## BL-066 — magnetic-core coupled-winding and polarity-dot primitives

- Layer: L-PRIMITIVE
- Raised by: 1 distinct topic — Electrical / Transformers (iteration 104)
- Missing object: recognizable ferromagnetic core, coupled primary and secondary coils, AC source
  and load terminals, induced-voltage/current paths, winding turns, and dot-convention polarity
  marks; generic apparatus boxes and relation lines do not depict transformer construction or
  magnetic coupling.
- General capability candidate: reusable magnetic-core, coupled-winding, source/load, induction,
  turns-ratio, and polarity-dot glyphs applicable to Electromagnetic Induction, Induction Machines,
  and DC Machines when showing coupled coils, induced quantities, winding orientation, or magnetic
  conversion with different core shapes, turns, terminals, labels, and values. This is a capability
  for other topics, not a stored Transformers question, winding, value, or image.
- Rule status: deferred until four distinct topics raise the same capability; do not build yet.

## BL-065 — linked-list node, pointer, and operation-state primitives

- Layer: L-PRIMITIVE
- Raised by: 1 distinct topic — CS / Data Structures (iteration 103)
- Missing object: recognizable singly and doubly linked-list nodes with data and pointer fields,
  head/tail markers, directed next/previous links, and operation-state transitions for insertion,
  deletion, queue, and stack surgery; fixed array cells do not depict pointer-based topology.
- General capability candidate: reusable node-and-pointer layouts, head/tail annotations, link
  rewiring, and operation-state snapshots applicable to Graph Traversals, Minimum Spanning Trees,
  Parse Trees, and Recurrence Trees when showing adjacency structures, mutable links, or traversal
  state with different node inventories, operations, and labels. This is a capability for other
  topics, not a stored Data Structures question, node set, operation sequence, or image.
- Rule status: deferred until four distinct topics raise the same capability; do not build yet.

## BL-064 — neural-system hierarchy and sensory-organ morphology primitives

- Layer: L-PRIMITIVE
- Raised by: 1 distinct topic — Biology / Neural Control and Coordination (iteration 101)
- Missing object: recognizable human-neural-system hierarchy branches, brain-region nodes,
  spinal and autonomic divisions, and labeled sensory-organ cross-sections with semantic
  pathways; generic boxes, relation lines, and triangular markers do not depict the referenced
  neural-system and eye structures.
- General capability candidate: reusable neural-anatomy hierarchy, brain/spinal/autonomic
  division, sensory-organ morphology, neuron-pathway, and synapse glyphs applicable to Animal
  Tissues, Chemical Coordination and Integration, and Locomotion and Movement when depicting
  nervous tissue, neuroendocrine control, or motor/sensory pathways with different structures,
  labels, and relationships. This is a capability for other topics, not a stored neural-system
  question, organ, value, or image.
- Rule status: deferred until four distinct topics raise the same capability; do not build yet.

## BL-063 — thematic world-map, region-fill, and legend primitives

- Layer: L-PRIMITIVE
- Raised by: 1 distinct topic — Biology / Biodiversity Patterns (iteration 98)
- Missing object: recognizable world-map coastlines and continents, spatial region fills for
  richness or hotspots, latitude or regional boundaries, callout labels, and categorical or
  quantitative map legends; generic nodes, rails, and dotted boxes do not depict geographic
  biodiversity patterns.
- General capability candidate: reusable thematic-map projections, region masks, color ramps,
  hotspot overlays, callouts, and legends applicable to Ecosystem Energy Flow and Pyramids, Food
  Webs, and Mineral Nutrition when comparing habitats, distributions, or spatial ecological data
  with different regions, variables, labels, and values. This is a capability for other topics, not
  a stored Biodiversity Patterns map, region, value, or image.
- Rule status: deferred until four distinct topics raise the same capability; do not build yet.

## BL-062 — kinematic graph axes and piecewise-trajectory primitives

- Layer: L-PRIMITIVE
- Raised by: 1 distinct topic — Physics / Motion Graphs (iteration 96)
- Missing object: recognizable position–time and velocity–position axes, labeled origin and units,
  piecewise linear motion segments, rest intervals, direction-changing slopes, bouncing displacement
  curves, and graph-specific markers such as $v_0$ and $x_0$; generic boxes and relation lines do not
  depict a kinematic graph or its slope conventions.
- General capability candidate: reusable kinematic plot frames, piecewise and curved trajectory
  curves, slope/direction markers, and motion-state annotations applicable to Circular Motion,
  Projectile Motion, and Simple Harmonic Motion with different variables, intervals, labels, and
  values. This is a capability for other topics, not a stored Motion Graphs question, curve, value,
  or image.
- Rule status: deferred until four distinct topics raise the same capability; do not build yet.

## BL-001 — semantic apparatus component glyphs and interaction marks

- Layer: L-PRIMITIVE
- Raised by: 4 distinct topics — Physics / Electromagnetic Induction (iteration 1); Physics / Fluid Pressure and Flow (iteration 13); Physics / Elastic Properties (iteration 29); Civil / Structural Loads (iteration 47)
- Missing object: a physical apparatus composition with recognizable components, supports, loads,
  deformed members, and directed interaction marks; generic rectangles and a straight line are not
  faithful substitutes.
- General capability candidate: reusable schematic glyphs for named physical apparatus components,
  support/load relationships, and constrained or deformed members, applicable to other
  apparatus/optics/fluid/electrical/mechanics topics rather than one image. The induction topic
  adds magnet/coil motion and current marks, while the fluid topic adds variable-width vessel
  geometry and streamline/flow marks to this same capability.
- Rule status: Rule of Four reached; generalized L1 capability built and rerun across all four
  raising topics. The reruns remain wrong because their references still require additional
  topic-specific vocabulary or morphology, but the primary missing apparatus capability is covered
  here. Do not split those residuals into new items until four distinct topics raise the same
  residual capability.

## BL-007 — oriented body/contact glyphs for inclined systems

- Layer: L-PRIMITIVE
- Raised by: 4 distinct topics — Physics / Friction (iteration 7); Physics / Friction and Equilibrium (iteration 14); Physics / Rotational Dynamics (iteration 33); Physics / Banked Roads (iteration 71)
- Missing object: a rigid-body glyph whose footprint/contact edge follows an inclined surface and
  whose force anchors remain attached to that oriented body; a horizontal rectangle intersecting a
  slope is geometrically misleading.
- General capability candidate: reusable orientation-aware body/support glyphs, applicable to
  inclined-plane mechanics, geometric constructions, apparatus layouts, and spatial engineering
  figures outside this topic. The equilibrium topic reinforces the need for a body footprint that
  rests on the plane rather than intersecting it.
- Rule status: Rule of Four reached; generalized L1 capability built and rerun across all four
  raising topics. All four reruns compile and rasterize with oriented bodies, contact edges, and
  attached force anchors. Their blind visual scores remain wrong because the source figures also
  require topic-specific topology, apparatus, and morphology outside this capability; do not split
  those residuals into a new item until four distinct topics raise the same residual capability.

## BL-041 — inheritance-cross and phenotype-outcome primitives

- Layer: L-PRIMITIVE
- Raised by: 2 distinct topics — Biology / Mendelian Crosses (iteration 60); Biology / Inheritance
  Patterns and Pedigrees (iteration 86)
- Missing object: recognizable male, female, unspecified, affected, and carrier symbols; mating
  and parent–offspring connectors; gamete branches, generation transitions, genotype/phenotype
  outcomes, and chromosome-set or sex-determination marks; a clean genotype grid or empty node
  rail omits the biological cross setup, pedigree conventions, and outcomes.
- General capability candidate: reusable inheritance-cross, pedigree-symbol, gamete, generation,
  phenotype, chromosome-set, and outcome primitives applicable to monohybrid and dihybrid crosses,
  test crosses, incomplete or codominant inheritance, sex-linked and chromosomal sex-determination
  figures, pedigree-to-cross explanations, and breeding diagrams with different traits, alleles,
  organisms, chromosome systems, and ratios. This helps other genetics topics rather than storing
  a Mendelian pea figure.
- Rule status: deferred until four distinct topics raise the same capability; do not build yet.

## BL-059 — periodic-table block and trend-arrow primitives

- Layer: L-PRIMITIVE
- Raised by: 1 distinct topic — Chemistry / Periodic Trends (iteration 92)
- Missing object: recognizable long-form periodic-table cells with group and period structure,
  s/p/d/f block classification, element populations, lanthanoid and actinoid insets, and directed
  trend arrows for atomic radius, ionization energy, electron-gain enthalpy, electronegativity,
  and metallic or nonmetallic character; generic boxes and wires do not depict these conventions.
- General capability candidate: reusable periodic-table block layouts, element-cell annotations,
  block-family coloring, inset series, and directional trend-arrow primitives, applicable to Atomic
  Orbitals, Molecular Orbital Diagrams, and Qualitative Analysis when showing element families,
  orbital blocks, or periodic-property comparisons with different elements, labels, and trends.
  This is a capability for other topics, not a stored Periodic Trends question, element, value, or image.
- Rule status: deferred until four distinct topics raise the same capability; do not build yet.

## BL-060 — circuit-symbol, filter, and dynamic-response primitives

- Layer: L-PRIMITIVE
- Raised by: 2 distinct topics — Electrical / Filters (iteration 94); Electrical / Transient RLC
  (iteration 105)
- Missing object: recognizable voltage-source, resistor, switch, capacitor, inductor, load, ground,
  and output-node circuit symbols with component values and designators; frequency-response axes
  and curves; transient exponential-response plots; equivalent-source topology; and stored-energy,
  dissipation, and heat-flow arrows. Generic boxes and routed lines omit or misrepresent both the
  RC filter construction and the RLC discharge/Thevenin constructions.
- General capability candidate: reusable canonical circuit-component symbols and topology, including
  source, switch, zigzag resistor, coil, parallel plates, load, ground, and output-node marks, plus
  frequency and transient response plots, cutoff or time markers, component-value annotations,
  equivalent-source labels, and energy/heat-flow arrows. This helps Electrical / Capacitors,
  Current Electricity Circuits, AC Power, ADC DAC, Communication Blocks, Electromagnetic Induction,
  Induction Machines, and DC Machines with different components, networks, transients, frequencies,
  and values. This is a capability for other topics, not a stored Filters or Transient RLC question,
  circuit, value, or image.
- Rule status: deferred until four distinct topics raise the same capability; do not build yet.

## BL-061 — measurement-instrument and uncertainty-annotation primitives

- Layer: L-PRIMITIVE
- Raised by: 1 distinct topic — Physics / Measurement and Errors (iteration 95)
- Missing object: recognizable measuring-instrument and measured-object geometry, scale or reading
  marks, repeated-observation annotations, mean/error bands, and uncertainty labels; a generic box
  joined to a line does not depict the measurement setup or the reported uncertainty.
- General capability candidate: reusable instrument jaws or probes, calibrated scales, measured
  objects, reading markers, repeated-measurement summaries, and uncertainty/error annotations,
  applicable to Optical Instruments and Fluid Statics and Bernoulli when showing apparatus readings,
  scales, dimensions, or uncertainty with different instruments, objects, and values. This is a
  capability for other topics, not a stored Measurement and Errors question, value, or image.
- Rule status: deferred until four distinct topics raise the same capability; do not build yet.

## BL-052 — three-phase source, phase-angle, and star-connection vocabulary

- Layer: L-VOCAB
- Raised by: 1 distinct topic — Electrical / Three Phase Circuits (iteration 81)
- Missing object: semantic declarations for three alternator windings or phase sources, rotating
  field/magnet direction, phase sequence and 120-degree separation, line conductors, polarity and
  phase-angle marks, and a three- or four-wire star/Y junction with a neutral; a generic route kind
  is not an accepted Scene vocabulary and cannot express the referenced alternator or connection.
- General capability candidate: reusable three-phase source, phasor/phase-sequence, winding,
  conductor, star/delta junction, neutral, polarity, and balanced-load vocabulary, applicable to
  alternators, AC power systems, transformers, induction and synchronous machines, phasor diagrams,
  and other electrical network figures with different phase counts, connections, values, and labels.
  This is a capability for other topics, not a stored Three Phase Circuits question, value, or image.
- Rule status: deferred until four distinct topics raise the same capability; do not build yet.

## BL-056 — work-energy and reaction-coordinate landscape primitives

- Layer: L-PRIMITIVE
- Raised by: 3 distinct topics — Physics / Work-Energy Diagrams (iteration 85); Chemistry /
  Reaction Coordinate (iteration 93); Chemistry / Gibbs Energy (iteration 102)
- Missing object: recognizable bodies and supports, motion or interaction marks, signed work and
-  energy-transfer arrows, potential-energy landscapes, reaction-coordinate axes and profiles,
  transition states, activation-energy and reaction-energy gaps, catalyst alternate pathways,
  spring or pendulum energy constructions, and collision or state-transition geometry; generic
  connected boxes or diagonal segments invent unrelated topology and do not expose these
  energy-state constructions.
- General capability candidate: reusable energy-state, work-transfer, potential-landscape,
  reaction-coordinate axis/profile, transition-state, activation-gap, catalyst alternate-path,
  spring/oscillator, pendulum, collision-energy, and state-transition primitives applicable to
  mechanics work-energy diagrams, potential-energy curves, spring and pendulum energy exchanges,
  collision-energy schematics, thermochemistry and Gibbs-energy reaction-coordinate diagrams,
  and field-potential landscapes with different bodies, states, energies, and labels. This is a capability for other topics, not a stored
  Work-Energy, Reaction Coordinate, or Gibbs Energy question, value, or image.
- Other topics helped: Chemistry / Thermochemistry and Physics /
  Thermodynamic Cycles when showing energy axes, state levels, barriers, or profile paths with
  different reactions, states, and values.
- Rule status: deferred until four distinct topics raise the same capability; do not build yet.

## BL-042 — musculoskeletal and contractile-tissue morphology primitives

- Layer: L-PRIMITIVE
- Raised by: 2 distinct topics — Biology / Muscle Contraction (iteration 61); Biology / Locomotion
  and Movement (iteration 100)
- Missing object: recognizable muscle-fiber cross-sections and sarcomere constructions with actin
  and myosin filaments, Z and M lines, striations, I/A/H bands, relaxed-versus-contracted geometry,
  bones, joints, cartilage or patella, tendon attachments, antagonistic muscle groups, and joint-
  angle or movement marks; generic boxes and connectors misrepresent the source structure.
- General capability candidate: reusable musculoskeletal, contractile-tissue, filament, line/band,
  joint, tendon, and contraction-state morphology applicable to muscle histology, cardiac or smooth-
  muscle comparisons, Animal Tissues, Cell Ultrastructure, joint-action, and locomotion figures with
  different labels, organisms, arrangements, and states. This helps other tissue, skeletal, and
  cellular-structure topics rather than storing a single knee or muscle figure.
- Rule status: deferred until four distinct topics raise the same capability; do not build yet.

## BL-057 — cellular-respiration pathway and organelle primitives

- Layer: L-PRIMITIVE
- Raised by: 1 distinct topic — Biology / Respiration in Plants (iteration 87)
- Missing object: recognizable glucose and pyruvate pathway states, cytosol and mitochondrial
  compartments, Krebs-cycle and electron-transport stages, electron carriers, proton-gradient
  and ATP-synthase marks, oxygen terminal acceptance, and carbon-dioxide/water products; the
  current scene engine rejects the pathway's `gradient` token and cannot draw these biological
  constructions as generic vector nodes.
- General capability candidate: reusable cellular-respiration, compartment, metabolite-flow,
  electron-carrier, proton-gradient, ATP-synthase, gas-exchange, and energy-yield primitives
  applicable to glycolysis, Krebs-cycle, fermentation, photosynthesis, chloroplast and
  mitochondrion pathways, electron-transport diagrams, and metabolic maps with different
  organisms, substrates, products, stages, and labels. This is a capability for other topics,
  not a stored Respiration in Plants question, value, or image.
- Rule status: deferred until four distinct topics raise the same capability; do not build yet.

## BL-040 — gene-regulation apparatus and state primitives

- Layer: L-PRIMITIVE
- Raised by: 1 distinct topic — Biology / Lac Operon (iteration 59)
- Missing object: recognizable DNA regulatory architecture with promoter, operator, gene blocks,
  RNA polymerase, repressor or activator, inducer/corepressor, directional transcription marks,
  and contrasted regulatory states; the current operon engine emits only a sparse promoter/operator
  rail and cannot depict the controlling actors or state-dependent interactions.
- General capability candidate: reusable gene-regulation apparatus, actor, interaction, and state
  primitives applicable to lac and trp operons, arabinose and other inducible/repressible systems,
  enhancer/silencer regulation, prokaryotic-versus-eukaryotic expression, and transcriptional
  feedback diagrams with different genes, regulators, signals, and conditions. This helps other
  molecular-regulation topics rather than storing a lac-specific figure.
- Rule status: deferred until four distinct topics raise the same capability; do not build yet.

## BL-006 — curved trajectory with radial/tangential vectors

- Layer: L-PRIMITIVE
- Raised by: 2 distinct topics — Physics / Circular Motion (iteration 6); Physics / Vector
  Resolution (iteration 19)
- Missing object: curved-path geometry with marked centers/points and semantically directed
  tangent, radial, and component vectors; generic points, segments, or relation lines do not assert
  circular or projectile trajectory geometry.
- General capability candidate: reusable trajectory geometry with radial/tangent/component vector
  annotations, applicable to orbital motion, projectile motion, ray/curved-path kinematics,
  rotating systems, and field-line constructions outside these topics.
- Rule status: deferred until four distinct topics raise the same capability; do not build yet.

## BL-005 — organic structure feature vocabulary

- Layer: L-VOCAB
- Raised by: 3 distinct topics — Chemistry / Organic Nomenclature (iteration 5); Chemistry / Amines
  (iteration 43); Chemistry / Alcohols Phenols Ethers (iteration 89)
- Missing object: structured vocabulary for amine, alcohol, phenol, ether, and other functional-group,
  aromatic-ring/substituent, cation/anion, charge, hydrogen-bond, resonance, and carboxylate features
  that make an organic structure semantically inspectable rather than merely a generic atom/bond graph.
- General capability candidate: reusable organic feature roles, atom/bond annotations, substituent,
  conjugate-base, charge, hydrogen-bond, resonance, and functional-group annotations for nomenclature,
  reaction, stereochemistry, functional-group, and heteroatom-centered structure figures across topics.
- Rule status: deferred until four distinct topics raise the same capability; do not build yet.

## BL-004 — semantic chemical bond/atom annotations

- Layer: L-VOCAB
- Raised by: 1 distinct topic — Chemistry / Hydrocarbons (iteration 4)
- Missing object: a structured annotation for a named bond feature such as a double bond, so the
  compiler can mark the bond itself rather than rendering a raw `double_bond=C2=C3` label detached
  from the chemistry.
- General capability candidate: reusable atom/bond feature annotations for unsaturation,
  functional groups, stereochemistry, and reaction sites across organic-structure topics.
- Rule status: deferred until four distinct topics raise the same capability; do not build yet.

## BL-003 — lattice/solid structure glyphs with domain geometry

- Layer: L-PRIMITIVE
- Raised by: 1 distinct topic — Chemistry / Crystal Lattices (iteration 3)
- Missing object: a unit-cell or crystal-lattice construction with spatial corner/face/body-center
  positions and the 3-D perspective/occupancy relationships that make lattice-point counting
  checkable; generic labelled boxes do not encode the lattice.
- General capability candidate: reusable periodic-cell and solid-structure geometry, applicable to
  other crystal, molecular-shape, materials, and spatial-geometry topics outside this topic.
- Rule status: deferred until four distinct topics raise the same capability; do not build yet.

## BL-002 — orthogonal vector-triad semantics for scene geometry

- Layer: L-PRIMITIVE
- Raised by: 2 distinct topics — Physics / Electromagnetic Waves (iteration 2); Physics / Relative Velocity (iteration 56)
- Missing object: a recognizable three-direction electromagnetic-wave construction showing E,
  B, and propagation as mutually perpendicular directed vectors, with the associated right-angle
  marks; generic point labels and relation lines do not encode that assertion.
- General capability candidate: a reusable orthogonal vector/axis triad with directed arrows and
  angle annotations, applicable to vector geometry, field directions, ray diagrams, and force
  constructions outside this topic.
- Rule status: deferred until four distinct topics raise the same capability; do not build yet.

## BL-008 — epithelial morphology primitives

- Layer: L-PRIMITIVE
- Raised by: 1 distinct topic — Biology / Animal Tissues (iteration 8)
- Missing object: reusable epithelial morphology panels with recognizable cell boundaries, nuclei,
  lumens, cilia, and goblet cells; a clean text table does not depict those biological structures.
- General capability candidate: reusable tissue/cell microstructure glyphs and labeled morphology
  panels, applicable to membrane transport, histology, cell biology, and other biological structure
  topics rather than one tissue image.
- Rule status: deferred until four distinct topics raise the same capability; do not build yet.

## BL-009 — membrane transport-protein and ion-gradient primitives

- Layer: L-PRIMITIVE
- Raised by: 2 distinct topics — Biology / Membrane Transport (iteration 9); Biology / Transport in
  Plants (iteration 88)
- Missing object: a membrane-spanning transport-protein or semipermeable-boundary depiction with
  labeled ion, solute, and water species, unequal compartments, directional crossings, stoichiometry,
  and an energy/ATP cue; a generic state-cycle or box map cannot faithfully represent pump, channel,
  osmosis, and water-potential transport comparisons.
- General capability candidate: reusable membrane-bound transporter/channel, semipermeable-boundary,
  compartment, solute/water-distribution, directed-particle-flow, and energy-annotation glyphs,
  applicable to diffusion, osmosis, signaling, water-potential transport, and other membrane or
  compartment-transport topics outside this one pump.
- Rule status: deferred until four distinct topics raise the same capability; do not build yet.

## BL-010 — nucleic-acid strand, primer, and synthesis geometry

- Layer: L-PRIMITIVE
- Raised by: 4 distinct topics — Biology / PCR (iteration 10); Biology / Replication Fork
  (iteration 22); Biology / Transcription (iteration 23); Biology / Translation and Gene Expression
  (iteration 24)
- Missing object: a nucleic-acid strand construction with template/product pairing, synthesis
  direction, continuous or discontinuous fragments, fork/bubble structure, and connecting enzyme
  events; empty stage cards or generic structure boxes cannot depict the mechanism.
- General capability candidate: reusable DNA/RNA strand, primer, fork, fragment, transcription-bubble,
  nascent-product, and synthesis-direction glyphs, applicable to restriction mapping, sequencing,
  DNA extraction, gel workflows, isotope-label experiments, translation, and other molecular
  biology topics outside these examples.
- Rule status: built in the L1 molecular scene lane after the fourth raise; focused and full tests
  pass, but the four blocked-topic reruns remain wrong because residual protocol and vocabulary gaps
  are separate capabilities.

## BL-017 — molecular substructure and biochemical-event vocabulary

- Layer: L-VOCAB
- Raised by: 1 distinct topic — Biology / Transcription (iteration 24 final process rerun)
- Missing object: semantic declarations for promoter regions, sigma factors, and sequence-level
  transcription relationships; generic strand rails and actor labels do not make those claims
  inspectable.
- General capability candidate: reusable molecular substructure vocabulary and event annotations for
  regulatory regions and enzyme-mediated sequence transformations, applicable to replication, PCR,
  sequencing, restriction mapping, translation, transcription, and other molecular-biology topics
  with different names and structures.
- Rule status: deferred until four distinct topics raise the same capability; do not build yet.

## BL-018 — domain-specific molecular glyphs and pairing geometry

- Layer: L-PRIMITIVE
- Raised by: 3 distinct topics — Biology / Translation and Gene Expression (iteration 24 final
  process rerun); Biology / DNA Structure (iteration 37); Biology / Mutation Disorders (iteration 40)
- Missing object: recognizable DNA-helix/transcription machinery, tRNA adapter and codon–anticodon
  pairing, biochemical charging geometry, and mutation/repair sequence features; generic rails, boxes,
  and ovals misstate those objects and relationships.
- General capability candidate: reusable domain-specific molecular glyphs and pairing/event geometry
  for nucleic-acid structure, adapters, enzyme active sites, and sequence transformations, applicable
  to PCR, replication, transcription, translation, sequencing, restriction mapping, and other
  molecular-biology figures with different names and structures.
- Rule status: deferred until four distinct topics raise the same capability; do not build yet. This
  capability also helps mutation, repair, sequencing, restriction mapping, and other molecular-
  biology figures with different names and structures.

## BL-019 — solution-apparatus and colligative-property vocabulary

- Layer: L-VOCAB
- Raised by: 1 distinct topic — Chemistry / Solutions (iteration 25)
- Missing object: semantic declarations for solution-specific vessels, solvent/solute compartments,
  osmotic pressure and vapor-pressure interfaces, and colligative-property comparisons; generic
  stock-bottle and valve boxes do not express the chemistry shown by the source figures.
- General capability candidate: reusable solution-apparatus and concentration/pressure relationship
  vocabulary applicable to osmosis, vapor pressure, colligative properties, membrane transport,
  phase equilibrium, and other solution or laboratory figures with different substances and values.
- Rule status: deferred until four distinct topics raise the same capability; do not build yet.

## BL-020 — stereochemical bond-depth and configuration primitives

- Layer: L-PRIMITIVE
- Raised by: 2 distinct topics — Chemistry / Stereochemistry (iteration 26); Chemistry / Haloalkanes and Haloarenes (iteration 63)
- Missing object: recognizable tetrahedral stereocentres with wedge/dash bond depth, mirror or
  symmetry relationships, and configuration annotations; a planar atom graph with literal `@`/`@@`
  text does not show the three-dimensional relationship.
- General capability candidate: reusable stereochemical bond-depth, mirror-pair, configuration, and
  stereospecific reaction geometry primitives, applicable to enantiomers, diastereomers,
  conformational analysis, substitution mechanisms, and other organic-structure figures with
  different molecules, reaction partners, and labels.
- Rule status: deferred until four distinct topics raise the same capability; do not build yet.

## BL-021 — memory-translation structure vocabulary

- Layer: L-VOCAB
- Raised by: 1 distinct topic — CS / Memory Paging (iteration 27)
- Missing object: structured declarations for virtual-address bit fields, page/frame cell stacks,
  page-table contents and location, and the cross-reference from a virtual page to its physical
  frame; generic CPU-to-memory boxes do not expose those relationships.
- General capability candidate: reusable address-translation, indexed-memory, bit-field, and
  lookup-table vocabulary applicable to TLBs, caches, segmentation, multi-level page walks,
  virtual-memory protection, and other memory-hierarchy figures with different widths and values.
- Rule status: deferred until four distinct topics raise the same capability; do not build yet.

## BL-011 — orbital-shape and filling-order primitives

- Layer: L-PRIMITIVE
- Raised by: 2 distinct topics — Chemistry / Atomic Orbitals (iteration 11); Chemistry / Molecular
  Orbital Diagrams (iteration 65)
- Missing object: recognizable s-, p-, and d-orbital shape drawings and the orbital-filling-order
  construction; an energy ladder alone cannot depict the lobes or diagonal filling convention.
- General capability candidate: reusable orbital-shape, phase/sign, energy-ladder,
  atomic-to-molecular connection, electron-filling, and molecular-orbital occupancy glyphs,
  applicable to atomic orbitals, molecular orbitals, crystal-field splitting, spectroscopy, and
  other chemistry structure topics outside this nitrogen example.
- Rule status: deferred until four distinct topics raise the same capability; do not build yet.

## BL-012 — reachable scene geometry vocabulary

- Layer: L-VOCAB
- Raised by: 4 distinct topics — Math / Vector Geometry (iteration 12); Physics / Gravitation and Orbital Motion (iteration 16); Math / Line and Plane (iteration 28); Physics / Electric Potential and Equipotential Surfaces (iteration 30)
- Missing object: a valid scene-geometry declaration path that admits the engine’s point, segment,
  relation, angle, and dimension keys through the family gate; otherwise projection figures fail
  before the geometry engine can render them.
- General capability candidate: reusable catalog/protocol vocabulary for coordinate geometry,
  projections, vector constructions, ray diagrams, and force/angle figures outside this topic. The
  orbital topic adds trajectory, focus, and swept-area constructions to the same reachable geometry
  path.
- Rule status: built at the Rule-of-Four threshold in iteration 30; the catalog reachability,
  segment-normal relation, and coordinate-to-frame layout capability were tested and every blocked
  geometry topic was rerun.
- Other topics helped: Vector Geometry, Gravitation and Orbital Motion, Line and Plane, ray and
  force/angle constructions, and future coordinate-geometry figures with arbitrary numeric ranges.

## BL-022 — electrostatic contour and radial-field vocabulary

- Layer: L-VOCAB
- Raised by: 3 distinct topics — Physics / Electric Potential and Equipotential Surfaces (iteration 30); Physics / Electrostatic Field Lines (iteration 31); Physics / Capacitors (iteration 51)
- Missing object: semantic declarations for point charges, equipotential contour/surface families,
  radial electric-field arrows, and their normality/decreasing-potential relationship; generic
  points, segments, and perpendicular markers substitute a different construction.
- General capability candidate: reusable electrostatic charge, contour/surface, radial-field, and
  field-potential relationship vocabulary applicable to Electric Potential, Electrostatic Field
  Lines, Gauss Law Applications, Capacitors, dipoles, and other field/flux topics with different
  charges, geometries, and values.
- Rule status: deferred until four distinct topics raise the same capability; do not build yet.
- Other topics helped: Electrostatic Field Lines, Gauss Law Applications, Capacitors, Magnetism and
  Matter, and dipole/field-potential figures outside this topic.

## BL-034 — layered-dielectric capacitor vocabulary

- Layer: L-VOCAB
- Raised by: 1 distinct topic — Physics / Capacitors (iteration 51)
- Missing object: semantic declarations for capacitor plates containing stacked dielectric layers,
  layer thicknesses, dielectric constants, and their series relationship; generic source/resistor/
  capacitor boxes do not expose the material interfaces or quantitative labels.
- General capability candidate: reusable layered-dielectric, plate-interface, material-parameter,
  and series-capacitance vocabulary, applicable to composite capacitors, electrostatic boundary
  conditions, insulating stacks, field-energy comparisons, and capacitor networks with different
  materials, thicknesses, and values.
- Rule status: deferred until four distinct topics raise the same capability; do not build yet.

## BL-023 — magnetic field-topology and orientation vocabulary

- Layer: L-VOCAB
- Raised by: 2 distinct topics — Physics / Magnetism and Matter (iteration 32); Physics / Galvanometer Conversion (iteration 52)
- Missing object: semantic declarations for magnetic sources and closed field-line families,
  pole/end labels, finite-solenoid observation geometry, magnetic-needle orientation sets, and
  uniform-field context; a generic solenoid body with axial arrows does not assert those relationships.
- General capability candidate: reusable magnetic source, closed-field-line, pole/needle-orientation,
  and uniform-field context vocabulary applicable to Electromagnetic Induction, Magnetic Field of
  Current, solenoid/needle figures, and other magnetic-field topics with different geometries and values.
- Rule status: deferred until four distinct topics raise the same capability; do not build yet.
- Other topics helped: Electromagnetic Induction, Magnetic Field of Current, solenoid/needle figures,
  and magnetic-field constructions outside this topic.

## BL-035 — moving-coil instrument and magnetic-torque vocabulary

- Layer: L-VOCAB
- Raised by: 1 distinct topic — Physics / Galvanometer Conversion (iteration 52)
- Missing object: semantic declarations for current-carrying coils, permanent-magnet pole pieces,
  magnetic-field vectors, force/torque pairs, rotation axes, pivots, brushes, pointers, and
  moving-coil instrument construction; generic source/box/arrows do not expose those relationships.
- General capability candidate: reusable electromagnetic-instrument and magnetic-torque vocabulary
  for coil, pole, field, force, moment, axis, and instrument-part relations, applicable to motors,
  ammeters, voltmeters, galvanometers, electrodynamometers, torque-on-loop problems, and magnetic
  actuators with different geometries and values.
- Rule status: deferred until four distinct topics raise the same capability; do not build yet.

## BL-036 — gas-state, particle-boundary, and thermodynamic-graph vocabulary

- Layer: L-VOCAB
- Raised by: 4 distinct topics — Physics / Kinetic Theory (iteration 53); Chemistry / Thermochemistry
  (iteration 66); Chemistry / Gas Laws (iteration 114); Chemistry / Vapour Pressure (iteration 116)
- Missing object: semantic declarations for labeled gas containers and walls, molecular collision
  states, piston-cylinder systems, gas-law state graphs, and charged or constrained boundaries;
  generic boxes, triangles, and arrows do not expose the kinetic-theory constructions.
- General capability candidate: reusable gas-state, particle-boundary, piston, thermodynamic-graph,
  axis/state-point, and cycle-path vocabulary with topology-bearing relations, applicable to kinetic
  theory, ideal-gas laws, thermodynamic processes, molecular collisions, pressure-volume/temperature
  plots, and statistical-mechanics figures with different states, labels, and values.
- Rule status: BUILT at Rule Four in iteration 116. The generalized L1 scene engine now supports
  fail-closed gas containers, boundaries, particles, pistons, state labels, thermodynamic axes,
  state points, directed paths, and closed cycles; the shared catalog admission gate and protocol
  schema were updated, and all four blocked topics were rerun. The reruns remained wrong against
  their corpus references, so no faithful spec was frozen and no residual special case was built.

## BL-037 — magnetic-source trajectory and field-family primitives

- Layer: L-PRIMITIVE
- Raised by: 1 distinct topic — Physics / Magnetic Field of Current (iteration 54)
- Missing object: reusable geometry for a magnetic source and its defining field construction,
  including moving-charge trajectories, current loops, solenoids, coaxial loops, and related
  multi-trajectory field relationships; concentric orbital rings and a central disk are not faithful
  substitutes.
- General capability candidate: source-aware magnetic trajectory, loop, solenoid, and field-family
  primitives applicable to Electromagnetic Induction, Magnetism and Matter, Galvanometer Conversion,
  motors, magnetic actuators, and field/flux figures with different geometries and values.
- Rule status: deferred until four distinct topics raise the same capability; do not build yet.

## BL-013 — Gaussian field-line and flux-surface primitives

- Layer: L-PRIMITIVE
- Raised by: 1 distinct topic — Physics / Gauss Law Applications (iteration 15)
- Missing object: a Gaussian surface integrated with radial/paired electric-field lines and a flux
  area-vector or inclined-surface construction; a bare generic sphere does not show the field-flux
  relationship.
- General capability candidate: reusable enclosed-charge, field-line, surface-normal, and flux
  geometry primitives, applicable to dipoles, wires, capacitors, and other field/flux topics outside
  this single-charge example.
- Rule status: deferred until four distinct topics raise the same capability; do not build yet.

## BL-014 — mirror and reflected-ray primitives

- Layer: L-PRIMITIVE
- Raised by: 3 distinct topics — Physics / Lens-Mirror Diagrams (iteration 17); Physics / Optical Instruments (iteration 18); Physics / Ray Optics (iteration 55)
- Missing object: a mirror surface with reflected/virtual rays, focal points, and sign-convention
  cases; the legacy ray renderer only provides a minimal convex-lens construction.
- General capability candidate: reusable lens/mirror optical surfaces, principal rays, image cases,
  and sign-convention annotations, applicable to optical instruments, refraction, prisms, optical
  fibres, and ray-geometry topics outside this mirror corpus. The optical-instrument topic adds
  water-air interfaces, total internal reflection, prism turns, and successive fibre reflections
  to the same general optical-surface/ray capability.
- Rule status: deferred until four distinct topics raise the same capability; do not build yet.

## BL-015 — ecosystem energy-flow and trophic-cycle primitives

- Layer: L-PRIMITIVE
- Raised by: 2 distinct topics — Biology / Ecosystem Energy Flow and Pyramids (iteration 20);
  Biology / Biogeochemical Cycles (iteration 35)
- Missing object: recognizable producer, consumer, decomposer, detritus, heat-loss, trophic-level,
  and nutrient-cycle glyphs connected by directed energy and matter-flow arrows; generic graph
  boxes do not depict the ecological structures or the upright trophic organization.
- General capability candidate: reusable ecological flow and trophic-cycle primitives, applicable
  to food webs, biogeochemical cycles, plant nutrient transport, population interactions, and
  other ecosystem-process figures outside this topic.
- Rule status: deferred until four distinct topics raise the same capability; do not build yet.

## BL-016 — reproductive-cell and early-embryo morphology primitives

- Layer: L-PRIMITIVE
- Raised by: 3 distinct topics — Biology / Fertilisation and Implantation (iteration 21); Biology /
  Mitosis and Meiosis (iteration 39); Biology / Gametogenesis (iteration 99)
- Missing object: recognizable ovum, corona-radiata, sperm head/acrosome/nucleus, neck, middle piece,
  mitochondria, tail, sperm-contact geometry, acrosomal reaction and polyspermy-block events, and
  sequential cleavage-to-blastula cell structures; generic graph boxes do not depict the cellular
  mechanisms or reproductive and developmental morphology.
- General capability candidate: reusable gamete morphology, reproductive-cell, fertilisation-event,
  and early-embryo morphology primitives, applicable to gametogenesis, embryology, mitosis/meiosis,
  reproductive biology, and other cell-development figures with different cell parts, stages,
  labels, and values. This helps other reproductive and developmental topics beyond one sperm
  question or image.
- Rule status: deferred until four distinct topics raise the same capability; do not build yet.

## BL-024 — whole-cell compartment and organelle morphology primitives

- Layer: L-PRIMITIVE
- Raised by: 2 distinct topics — Biology / Cell Ultrastructure (iteration 36); Biology /
  Photosynthesis in Higher Plants (iteration 78)
- Missing object: recognizable whole-cell and organelle silhouettes and envelopes with spatially
  placed organelles, internal membrane systems, nested compartments, cell-type distinctions, and
  label-to-object relations; generic rectangles and crossing connector lines do not depict cell
  ultrastructure or compartment-specific processes.
- General capability candidate: reusable whole-cell, organelle, envelope, and compartment glyphs
  with inspectable biological adjacency, applicable to Animal Tissues, Membrane Transport, plant and
  animal cell comparisons, cell biology, cellular respiration, photosynthesis, and other cell-
  structure/process figures with different cell types and organelle sets.
- Rule status: deferred until four distinct topics raise the same capability; do not build yet.

## BL-025 — floral organ, whorl, and aestivation morphology primitives

- Layer: L-PRIMITIVE
- Raised by: 1 distinct topic — Biology / Floral Structure (iteration 38)
- Missing object: recognizable flower-organ silhouettes and attachment geometry for receptacle,
  calyx/sepals, corolla/petals, androecium, gynoecium, ovary position, and aestivation; generic
  rectangles and connectors do not depict botanical morphology.
- General capability candidate: reusable floral-organ, whorl, ovary-position, and petal-arrangement
  primitives, applicable to Plant Life Cycles, Plant Tissues, Transport in Plants, Plant Growth and
  Development, pollination/reproduction, and other plant-structure figures with different organs,
  species, and arrangements.
- Rule status: deferred until four distinct topics raise the same capability; do not build yet.

## BL-026 — bryophyte alternation-of-generations and reproductive-cycle morphology primitives

- Layer: L-PRIMITIVE
- Raised by: 1 distinct topic — Biology / Plant Life Cycles (iteration 41)
- Missing object: recognizable thalli, rhizoids, antheridia, archegonia, sporophytes, setae,
  capsules or spore cases, spores, and protonemata with the alternation between gametophyte and
  sporophyte generations; generic rectangles and connectors substitute unrelated seed-plant stages.
- General capability candidate: reusable non-seed-plant reproductive-cycle and alternation-of-
  generations glyphs, applicable to fungal and algal life cycles, seed-plant generation diagrams,
  gametogenesis, plant reproduction, and other organism life-cycle figures with different stages
  and structures.
- Rule status: deferred until four distinct topics raise the same capability; do not build yet.

## BL-027 — plant tissue histology and organ cross-section morphology primitives

- Layer: L-PRIMITIVE
- Raised by: 2 distinct topics — Biology / Plant Tissues (iteration 42); Biology / Stomatal Apparatus (iteration 62)
- Missing object: recognizable stomatal pores with paired guard and subsidiary cells, vascular-
  bundle organization with xylem/phloem/cambium, and dicot/monocot root cross-sections with
  epidermis, cortex, endodermis, pericycle, xylem, phloem, and pith; generic rectangles and
  connectors do not depict plant histology or tissue adjacency.
- General capability candidate: reusable plant tissue, organ-section, cell-layer, vascular-bundle,
  and stomatal morphology with inspectable adjacency, applicable to leaf/stem/root anatomy,
  transport in plants, photosynthetic tissue, stomatal regulation, plant histology, and other
  plant-structure figures with different tissues, organs, and arrangements.
- Rule status: deferred until four distinct topics raise the same capability; do not build yet.

## BL-028 — chemical-equilibrium equation, quotient, and state-table vocabulary

- Layer: L-VOCAB
- Raised by: 2 distinct topics — Chemistry / Chemical Equilibrium (iteration 44); Chemistry / Ionic
  Equilibrium (iteration 64)
- Missing object: structured equilibrium-reaction and reaction-quotient expressions, with linked
  initial/change/equilibrium states and worked numerical annotations; a bare ICE grid cannot show
  the equation, quotient direction, or explanatory calculation context required by equilibrium
  figures.
- General capability candidate: reusable equilibrium equation, quotient, state-change,
  calculation-context, and chemically annotated species vocabulary, applicable to acid-base,
  solubility, complex-ion, phase, Le Chatelier, and other equilibrium figures with different
  reactions, species, and values.
- Rule status: deferred until four distinct topics raise the same capability; do not build yet.

## BL-029 — VSEPR molecular geometry and lone-pair distortion primitives

- Layer: L-PRIMITIVE
- Raised by: 1 distinct topic — Chemistry / Molecular Shapes (iteration 45)
- Missing object: faithful trigonal-pyramidal, bent, and other lone-pair-distorted molecular
  geometries with visible central atoms, bonds, lone-pair domains, bond angles, and geometry labels;
  the current VSEPR engine rejects common geometry names before rendering and its limited shapes
  cannot depict the reference conventions.
- General capability candidate: reusable electron-domain, molecular-shape, lone-pair, angle, and
  hybridization geometry primitives, applicable to VSEPR overviews, molecular-shape comparisons,
  coordination geometry, polarity figures, and other chemistry structure topics with different
  central atoms, ligands, and domain counts.
- Rule status: deferred until four distinct topics raise the same capability; do not build yet.

## BL-030 — seepage-net and flownet hydraulic geometry primitives

- Layer: L-PRIMITIVE
- Raised by: 1 distinct topic — Civil / Seepage Nets (iteration 46)
- Missing object: faithful embankment and soil-domain boundaries with phreatic lines, flow lines,
  equipotential lines, curvilinear-square cells, relief wells, drainage blankets, and exit-gradient
  annotations; the current `seqnet` alias routes to a generic one-line network and rejects the
  seepage payload before rendering.
- General capability candidate: reusable flownet, phreatic-surface, drainage-control, hydraulic-
  head, and exit-gradient geometry primitives, applicable to earth dams, retaining-wall drainage,
  groundwater flow, filters, seepage-control systems, and other geotechnical flow figures with
  different soil domains, boundaries, and hydraulic conditions.
- Rule status: deferred until four distinct topics raise the same capability; do not build yet.

## BL-031 — graph traversal and representation-state vocabulary

- Layer: L-VOCAB
- Raised by: 1 distinct topic — CS / Graph Traversals (iteration 48)
- Missing object: semantic graph declarations for a complete vertex inventory and directed edge
  set together with adjacency-matrix/list views, traversal visit or enqueue order, and tree versus
  non-tree edge roles; generic repeated node/link sketches do not expose those representation and
  algorithm-state claims.
- General capability candidate: reusable graph-representation and traversal-state vocabulary for
  vertex/edge identity, ordered adjacency, matrix/list projections, BFS/DFS discovery and finish
  state, and derived traversal structures across graph-algorithm figures with different sizes,
  labels, directions, and edge sets. This also helps dependency DAGs, network reachability,
  shortest-path trees, spanning-tree figures, and graph data-structure comparisons outside this
  topic.
- Rule status: deferred until four distinct topics raise the same capability; do not build yet.

## BL-032 — mathematical construction and dimension vocabulary

- Layer: L-VOCAB
- Raised by: 2 distinct topics — Math / Maxima and Minima (iteration 49); Civil / Surveying Geometry (iteration 67)
- Missing object: semantic declarations for multi-point geometric constructions, connected
  boundaries, perpendicular/right-angle markers, dimension annotations, and nested or perspective
  solids; generic labelled points and segments do not expose the defining construction in either
  optimization or traverse/offset figures.
- General capability candidate: reusable mathematical-figure vocabulary and composition grammar for
  labeled construction points, topology-bearing segments and boundaries, orthogonality, offsets,
  dimensions, and nested planar/spatial solids, applicable to coordinate geometry, mensuration,
  optimization, surveying, mechanics, optics, and other construction figures with different values,
  layouts, and object names.
- Rule status: deferred until four distinct topics raise the same capability; do not build yet.

## BL-033 — fluid-statics vessel, column, and pressure vocabulary

- Layer: L-VOCAB
- Raised by: 1 distinct topic — Mechanical / Fluid Statics and Bernoulli (iteration 50)
- Missing object: semantic declarations for communicating vessels and free surfaces, fluid-element
  pressure/force vectors, liquid columns and reservoirs, and pressure/height measurement annotations;
  generic pipe sections and taps do not expose the fluid-statics constructions in the references.
- General capability candidate: reusable fluid-statics vocabulary and relations for vessels, free
  surfaces, pressure forces, columns, reservoirs, and measurements, applicable to hydrostatic
  pressure, Pascal-law, barometer, buoyancy, manometer, hydrostatic-paradox, and Bernoulli figures
  with different fluids, geometries, and values.
- Rule status: deferred until four distinct topics raise the same capability; do not build yet.

## BL-038 — two-source interference, screen, and lobe-distribution primitives

- Layer: L-PRIMITIVE
- Raised by: 1 distinct topic — Physics / Wave Optics (iteration 57)
- Missing object: recognizable coherent sources or slits, propagation toward a screen, a centered
  observation coordinate, and the broad constructive/destructive lobe distribution used by
  interference and diffraction figures; a generic sampled function omits the source-to-screen
  topology and can invent a dense oscillation unlike the reference convention.
- General capability candidate: reusable source/aperture, wavefront, screen, observation-axis,
  interference-envelope, and lobe/phase primitives, applicable to Young double-slit, thin-film
  interference, diffraction, polarization, wavefront, and other wave-optics figures with different
  apertures, wavelengths, geometries, and measured quantities. This is a capability for other
  topics, not a stored Wave Optics question or value.
- Rule status: deferred until four distinct topics raise the same capability; do not build yet.

## BL-039 — endocrine-axis hormone-flow and negative-feedback vocabulary

- Layer: L-VOCAB
- Raised by: 1 distinct topic — Biology / Chemical Coordination and Integration (iteration 58)
- Missing object: semantic declarations for endocrine glands and hormones, ordered trophic
  stimulation, target-tissue action, and signed positive/negative feedback paths; generic boxes,
  arrows, and labels cannot distinguish the controlled axis or the regulatory direction.
- General capability candidate: reusable endocrine-axis, hormone-secretion, target-response, and
  feedback-loop vocabulary, applicable to hypothalamic-pituitary axes, thyroid and adrenal control,
  insulin/glucagon regulation, calcium balance, reproductive axes, osmoregulation, and other
  physiological control diagrams with different hormones, organs, and feedback directions. This is
  a capability for other topics, not a stored gland, hormone, or question.
- Rule status: deferred until four distinct topics raise the same capability; do not build yet.

## BL-044 — rotating-machine cross-section and winding primitives

- Layer: L-PRIMITIVE
- Raised by: 2 distinct topics — Electrical / Induction Machines (iteration 69); Electrical /
  DC Machines (iteration 80)
- Missing object: recognizable stator/yoke and rotor cross-sections, poles, air gap, slotted or
  distributed windings, shaft, commutator/brush assembly, and machine-specific spatial
  relationships; generic apparatus boxes and flow arrows do not depict the machine construction
  or electromechanical topology in the references.
- General capability candidate: reusable rotating-electrical-machine geometry for stator/rotor
  bodies, slots, distributed phase windings, air gaps, shafts, and field or torque relationships,
  applicable to DC, induction, and synchronous motors, generators, alternators, and winding-layout
  figures with different phase counts, pole arrangements, labels, and values.
- Rule status: deferred until four distinct topics raise the same capability; do not build yet.

## BL-043 — scheduling timeline and job-interval vocabulary

- Layer: L-VOCAB
- Raised by: 1 distinct topic — CS / Process States (iteration 68)
- Missing object: semantic declarations for a shared ticked time axis, ordered jobs with arrival and
  duration, contiguous execution intervals, split preempted/resumed job identity, and arrival or
  scheduling annotations; generic graph nodes and edges do not expose FIFO/STCF Gantt structure.
- General capability candidate: reusable scheduling-timeline vocabulary for job intervals, arrivals,
  preemption, resume segments, queue order, and derived completion or turnaround annotations,
  applicable to CPU scheduling, real-time task timelines, project schedules, network traces, and
  parallel-work span figures with different jobs, policies, values, and labels.
- Rule status: deferred until four distinct topics raise the same capability; do not build yet.

## BL-045 — semiconductor-device geometry and circuit-symbol primitives

- Layer: L-PRIMITIVE
- Raised by: 2 distinct topics — Electrical / JFET (iteration 70); Physics / Semiconductor Diodes (iteration 73)
- Missing object: recognizable N/P semiconductor regions, source/drain/channel contacts, gate
  junction and depletion regions, charge signs, bias batteries and wiring, current direction, and
  field-effect device symbols; generic boxes, wedges, and flow arrows misrepresent the device.
- General capability candidate: reusable semiconductor-device cross-sections, junction/depletion
  morphology, terminal and bias-circuit glyphs, charge/current marks, and device-symbol conventions
  applicable to MOSFET and other field-effect devices, diode and bipolar schematics, semiconductor
  bias figures, and electronics circuit/device diagrams with different polarities, terminals,
  geometries, and values. This helps MOSFET, diode, BJT, and semiconductor-bias topics beyond one
  JFET question or image.
- Rule status: deferred until four distinct topics raise the same capability; do not build yet.

## BL-046 — projectile trajectory and launch/target scene vocabulary

- Layer: L-VOCAB
- Raised by: 1 distinct topic — Physics / Projectile Motion (iteration 72)
- Missing object: semantic declarations for launcher and target ground apparatus, curved ballistic
  trajectories, launch/apex/landing points, x/y axes, velocity vectors and components, and related
  trajectory dimensions; generic point/segment geometry rendered an unrelated rail-like network.
- General capability candidate: reusable trajectory and vector-component vocabulary for projectile,
  circular-motion, relative-velocity, and other mechanics figures with different bodies, paths,
  directions, values, and labels. This helps multiple trajectory topics beyond one projectile
  question or image.
- Rule status: deferred until four distinct topics raise the same capability; do not build yet.

## BL-047 — progressive-wave, pulse, and standing-mode primitives

- Layer: L-PRIMITIVE
- Raised by: 2 distinct topics — Physics / Standing Waves (iteration 74); Physics / Wave Motion
  (iteration 97)
- Missing object: recognizable smooth or pulsed wave profiles, medium and particle displacement,
  propagation arrows, spring or string boundaries, longitudinal compression/rarefaction structure,
  fixed-end nodes, antinodes, equilibrium positions, phase/time slices, and mode-aware wave
  geometry; generic point labels, boxes, and straight segments do not depict these conventions.
- General capability candidate: reusable progressive-wave, pulse, longitudinal-density, periodic-
  wave, node/antinode, equilibrium, phase, and mode primitives applicable to progressive and
  standing sound waves, organ-pipe and sonometer figures, electromagnetic-wave sketches, and
  interference or oscillation diagrams with different wavelengths, harmonics, amplitudes, phases,
  boundaries, and values. This helps other wave topics beyond one Wave Motion question or image.
- Rule status: deferred until four distinct topics raise the same capability; do not build yet.

## BL-048 — thermal-deformation apparatus and expansion-joint primitives

- Layer: L-PRIMITIVE
- Raised by: 1 distinct topic — Physics / Thermal Expansion (iteration 75)
- Missing object: recognizable fixed and free supports, distinct cold and heated rod states,
  heat-source cue, bimetallic or structural expansion geometry, and a clear expansion-joint gap;
  generic apparatus boxes and disconnected labels do not show the thermal-deformation convention.
- General capability candidate: reusable thermal-deformation and constrained-member primitives for
  bimetallic strips, rods, rails, bridges, thermal-stress setups, and temperature-scale or expansion
  comparisons with different materials, constraints, temperature changes, geometries, and values.
  This helps other thermal-mechanics topics beyond one Thermal Expansion question or reference
  image.
- Rule status: deferred until four distinct topics raise the same capability; do not build yet.

## BL-049 — immune-system host, pathogen, and lymphoid morphology primitives

- Layer: L-PRIMITIVE
- Raised by: 1 distinct topic — Biology / Immune Response (iteration 76)
- Missing object: recognizable host/pathogen stage forms, antigen-presenting and infected-cell
  morphology, antibody heavy/light chains with binding sites, lymph nodes, thymus, lymphatic vessels,
  and their topology; uniform empty boxes and generic arrows misrepresent these biological objects.
- General capability candidate: reusable immune-response and lymphoid morphology primitives for
  pathogen life cycles, innate/adaptive-response pathways, antibody and antigen figures, lymphatic
  anatomy, vaccination and immune-memory diagrams, and host–pathogen comparisons with different
  organisms, cell types, molecules, stages, and relationships. This helps other immunology and
  infectious-disease topics beyond one Immune Response question or reference image.
- Rule status: deferred until four distinct topics raise the same capability; do not build yet.

## BL-050 — reproductive-cycle phase-track and gonadal/uterine morphology primitives

- Layer: L-PRIMITIVE
- Raised by: 1 distinct topic — Biology / Menstrual Cycle (iteration 77)
- Missing object: aligned ovarian and uterine phase tracks, a shared time axis, hormone-level curves,
  phase bands, and recognizable follicle, corpus-luteum, and uterine-stage morphology; generic cycle
  boxes and rails cannot depict the reference timeline and structures faithfully.
- General capability candidate: reusable reproductive-cycle timelines and gonadal, uterine, and
  hormone-track primitives, applicable to ovarian and uterine cycles, fertilisation and implantation
  timelines, reproductive endocrinology, gametogenesis, and other physiology figures with different
  phases, hormones, organs, stages, curves, and values. This is a capability for other topics, not
  a stored Menstrual Cycle question, value, or image.
- Rule status: deferred until four distinct topics raise the same capability; do not build yet.

## BL-051 — electrochemical-cell and redox-flow primitives

- Layer: L-PRIMITIVE
- Raised by: 2 distinct topics — Chemistry / Redox Cells (iteration 79); Chemistry / Electrochemical
  Series (iteration 91)
- Missing object: recognizable half-cell vessels, oxidation and reduction electrodes, electrolyte
  solutions, salt bridge, external circuit, directed electron flow, compensating ion migration,
  labeled electrode terminals, and linked half-reaction or potential-series annotations; generic
  boxes and wires do not depict an electrochemical cell or its redox chemistry faithfully.
- General capability candidate: reusable electrochemical-cell vessel, electrode, electrolyte,
  salt-bridge, electron/ion-flow, electrode-terminal, half-reaction, and potential-series
  annotation primitives, applicable to galvanic and electrolytic cells, batteries, corrosion,
  electrolysis, redox titration, electrode-potential series, and standard-cell calculations with
  different species, reactions, concentrations, and values. This is a capability for other
  topics, not a stored Redox Cells or Electrochemical Series question, molecule, value, or image.
- Rule status: deferred until four distinct topics raise the same capability; do not build yet.

## BL-053 — transmission-line cable and propagating-wave vocabulary

- Layer: L-VOCAB
- Raised by: 1 distinct topic — Electrical / Transmission Lines (iteration 82)
- Missing object: semantic declarations for coaxial inner conductor, insulation, outer shield and
  jacket, distributed line sections, source/load terminations, incident and reflected waves, their
  propagation directions, time progression, and standing-wave superposition; the unsupported
  `kind: line` cannot express these transmission-line objects in the current Scene vocabulary.
- General capability candidate: reusable transmission-line cross-section, distributed-section,
  source/load, wave-direction, reflection, and standing-wave vocabulary, applicable to coaxial and
  two-wire cables, impedance matching, wave propagation, reflections, antennas, RF networks, and
  other electromagnetic-wave figures with different media, impedances, termination conditions,
  phase values, and labels. This is a capability for other topics, not a stored Transmission Lines
  question, value, or image.
- Rule status: deferred until four distinct topics raise the same capability; do not build yet.

## BL-054 — phasor-vector and phase-angle vocabulary

- Layer: L-VOCAB
- Raised by: 1 distinct topic — Physics / AC Phasors (iteration 83)
- Missing object: semantic declarations for directed voltage or current phasors, component
  vectors, reference axes, perpendicular relationships, rms magnitudes, phase angles, and
  right-triangle or vector-sum annotations; the unsupported `kind: line` cannot express the
  phasor diagram in the current Scene vocabulary.
- General capability candidate: reusable phasor-vector, component, reference-axis, phase-angle,
  and rms-label vocabulary, applicable to AC circuit analysis, impedance and admittance triangles,
  power-factor diagrams, three-phase systems, signal processing, and wave-interference figures
  with different vector values, phases, conventions, and labels. This is a capability for other
  topics, not a stored AC Phasors question, value, or image.
- Rule status: deferred until four distinct topics raise the same capability; do not build yet.

## BL-055 — nuclear-transformation and emitted-radiation primitives

- Layer: L-PRIMITIVE
- Raised by: 1 distinct topic — Physics / Nuclear Decay (iteration 84)
- Missing object: recognizable parent and daughter nuclide glyphs, an explicit decay transition,
  emitted-particle or radiation branch, decay-mode annotation, and sequential decay-chain links;
  generic empty apparatus boxes and undirected connectors do not expose the nuclear transformation.
- General capability candidate: reusable nuclear-transformation primitives for parent/daughter
  nuclides, emitted particles or radiation, decay-mode labels, and linked decay chains, applicable
  to alpha and beta decay, gamma emission, fission, fusion, nuclear reactions, isotope schemes,
  and particle-interaction figures with different nuclides, modes, energies, and labels. This is a
  capability for other topics, not a stored isotope, decay value, or image.
- Rule status: deferred until four distinct topics raise the same capability; do not build yet.

## BL-058 — biomolecular secondary-structure and nucleotide vocabulary

- Layer: L-VOCAB
- Raised by: 1 distinct topic — Chemistry / Biomolecules (iteration 90)
- Missing object: semantic declarations for amino-acid and peptide-link structure, alpha-helix
  ribbons and hydrogen bonds, beta-pleated-sheet strands and hydrogen-bond networks, and
  nucleoside/nucleotide sugar-ring, base, and phosphate constructions; generic scene parts and
  arrows cannot express these biomolecular objects or their structural relationships.
- General capability candidate: reusable biomolecular secondary-structure and nucleotide
  substructure vocabulary for peptide bonds, alpha helices, beta sheets, nucleosides, nucleotides,
  and related macromolecular annotations, applicable to Protein Structure, DNA/RNA Structure,
  Translation and Gene Expression, polymers, and other biomolecule figures with different
  sequences, residues, folds, bases, and labels. This is a capability for other topics, not a
  stored Biomolecules question, molecule, value, or image.
- Rule status: deferred until four distinct topics raise the same capability; do not build yet.
