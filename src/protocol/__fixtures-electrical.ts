/**
 * Electrical circuit accuracy fixture: Series-Parallel Resistor Network (KVL/KCL).
 *
 * Problem: 12 V source, R1 = 4 Ω in series with parallel combo (R2 = 10 Ω ‖ R3 = 10 Ω).
 * Verified answer: R_parallel = 5 Ω, R_total = 9 Ω, I_R1 = 12 / 9 = 4/3 ≈ 1.333 A.
 *
 * Six progressive steps with SVG circuit diagrams showing reduction from full
 * network down to a single equivalent, then back-verification via KVL.
 */

// ── SVG building blocks (reused across steps) ──────────────────────────────────

const ARROW_MARKER_DEF = [
  '<defs>',
  '<marker id="arw" markerWidth="6" markerHeight="4" refX="6" refY="2" orient="auto">',
  '<polygon points="0,0 6,2 0,4" fill="black"/>',
  '</marker>',
  '</defs>',
].join('');

const V_SOURCE = [
  '<line x1="30" y1="190" x2="30" y2="135" stroke="black" stroke-width="2"/>',
  '<circle cx="30" cy="110" r="20" fill="none" stroke="black" stroke-width="2"/>',
  '<text x="30" y="114" font-size="11" text-anchor="middle">12V</text>',
  '<text x="18" y="92" font-size="12">+</text>',
  '<text x="22" y="135" font-size="12">\u2212</text>',
  '<line x1="30" y1="85" x2="30" y2="30" stroke="black" stroke-width="2"/>',
].join('');

const R1_ZIGZAG = [
  '<line x1="30" y1="30" x2="75" y2="30" stroke="black" stroke-width="2"/>',
  '<polyline points="75,30 87,14 102,46 117,14 132,46 147,14 157,30" fill="none" stroke="black" stroke-width="2"/>',
  '<line x1="157" y1="30" x2="200" y2="30" stroke="black" stroke-width="2"/>',
  '<text x="116" y="10" font-size="12" text-anchor="middle">R1=4\u03A9</text>',
].join('');

const R2_BRANCH = [
  '<line x1="200" y1="70" x2="225" y2="70" stroke="black" stroke-width="2"/>',
  '<polyline points="225,70 237,55 252,85 267,55 282,85 297,55 307,70" fill="none" stroke="black" stroke-width="2"/>',
  '<line x1="307" y1="70" x2="360" y2="70" stroke="black" stroke-width="2"/>',
  '<text x="266" y="50" font-size="12" text-anchor="middle">R2=10\u03A9</text>',
].join('');

const R3_BRANCH = [
  '<line x1="200" y1="150" x2="225" y2="150" stroke="black" stroke-width="2"/>',
  '<polyline points="225,150 237,135 252,165 267,135 282,165 297,135 307,150" fill="none" stroke="black" stroke-width="2"/>',
  '<line x1="307" y1="150" x2="360" y2="150" stroke="black" stroke-width="2"/>',
  '<text x="266" y="178" font-size="12" text-anchor="middle">R3=10\u03A9</text>',
].join('');

const SPLIT_JOIN_WIRES = [
  '<line x1="200" y1="30" x2="200" y2="150" stroke="black" stroke-width="2"/>',
  '<line x1="360" y1="70" x2="360" y2="150" stroke="black" stroke-width="2"/>',
].join('');

const BOTTOM_RETURN = [
  '<line x1="360" y1="150" x2="360" y2="190" stroke="black" stroke-width="2"/>',
  '<line x1="360" y1="190" x2="30" y2="190" stroke="black" stroke-width="2"/>',
].join('');

const NODE_LABELS = [
  '<circle cx="200" cy="30" r="3" fill="black"/>',
  '<circle cx="360" cy="110" r="3" fill="black"/>',
  '<text x="200" y="22" font-size="11" text-anchor="middle" fill="blue">B</text>',
  '<text x="372" y="114" font-size="11" fill="blue">C</text>',
  '<text x="18" y="22" font-size="11" fill="blue">A</text>',
].join('');

// ── Per-step SVGs ──────────────────────────────────────────────────────────────

const SVG_1_FULL_CIRCUIT = [
  '<svg viewBox="0 0 400 220">',
  ARROW_MARKER_DEF,
  R1_ZIGZAG,
  SPLIT_JOIN_WIRES,
  R2_BRANCH,
  R3_BRANCH,
  BOTTOM_RETURN,
  V_SOURCE,
  NODE_LABELS,
  '<line x1="45" y1="30" x2="65" y2="30" stroke="red" stroke-width="1.5" marker-end="url(#arw)"/>',
  '<text x="55" y="22" font-size="10" fill="red">I</text>',
  '</svg>',
].join('\n');

const SVG_2_PARALLEL_HIGHLIGHT = [
  '<svg viewBox="0 0 400 220">',
  ARROW_MARKER_DEF,
  R1_ZIGZAG,
  SPLIT_JOIN_WIRES,
  R2_BRANCH,
  R3_BRANCH,
  BOTTOM_RETURN,
  V_SOURCE,
  NODE_LABELS,
  '<rect x="192" y="42" width="176" height="126" rx="6" ry="6" fill="none" stroke="orange" stroke-width="2" stroke-dasharray="6,3"/>',
  '<text x="280" y="200" font-size="11" text-anchor="middle" fill="orange">R2 \u2225 R3</text>',
  '</svg>',
].join('\n');

const SVG_3_PARALLEL_REDUCED = [
  '<svg viewBox="0 0 340 160">',
  '<line x1="30" y1="30" x2="75" y2="30" stroke="black" stroke-width="2"/>',
  '<polyline points="75,30 87,14 102,46 117,14 132,46 147,14 157,30" fill="none" stroke="black" stroke-width="2"/>',
  '<line x1="157" y1="30" x2="190" y2="30" stroke="black" stroke-width="2"/>',
  '<text x="116" y="10" font-size="12" text-anchor="middle">R1=4\u03A9</text>',
  '<polyline points="190,30 200,14 215,46 230,14 245,46 260,14 270,30" fill="none" stroke="#e67700" stroke-width="2"/>',
  '<line x1="270" y1="30" x2="310" y2="30" stroke="black" stroke-width="2"/>',
  '<text x="230" y="10" font-size="12" text-anchor="middle" fill="#e67700">R\u2225=5\u03A9</text>',
  '<line x1="310" y1="30" x2="310" y2="130" stroke="black" stroke-width="2"/>',
  '<line x1="310" y1="130" x2="30" y2="130" stroke="black" stroke-width="2"/>',
  '<line x1="30" y1="130" x2="30" y2="95" stroke="black" stroke-width="2"/>',
  '<circle cx="30" cy="75" r="16" fill="none" stroke="black" stroke-width="2"/>',
  '<text x="30" y="79" font-size="10" text-anchor="middle">12V</text>',
  '<line x1="30" y1="55" x2="30" y2="30" stroke="black" stroke-width="2"/>',
  '</svg>',
].join('\n');

const SVG_4_SERIES_TOTAL = [
  '<svg viewBox="0 0 280 140">',
  '<line x1="30" y1="30" x2="70" y2="30" stroke="black" stroke-width="2"/>',
  '<polyline points="70,30 82,14 97,46 112,14 127,46 142,14 157,46 170,30" fill="none" stroke="black" stroke-width="2"/>',
  '<line x1="170" y1="30" x2="250" y2="30" stroke="black" stroke-width="2"/>',
  '<text x="120" y="10" font-size="12" text-anchor="middle">R_total=9\u03A9</text>',
  '<line x1="250" y1="30" x2="250" y2="110" stroke="black" stroke-width="2"/>',
  '<line x1="250" y1="110" x2="30" y2="110" stroke="black" stroke-width="2"/>',
  '<line x1="30" y1="110" x2="30" y2="80" stroke="black" stroke-width="2"/>',
  '<circle cx="30" cy="60" r="16" fill="none" stroke="black" stroke-width="2"/>',
  '<text x="30" y="64" font-size="10" text-anchor="middle">12V</text>',
  '<line x1="30" y1="40" x2="30" y2="30" stroke="black" stroke-width="2"/>',
  '</svg>',
].join('\n');

const SVG_5_CURRENT_FLOW = [
  '<svg viewBox="0 0 280 140">',
  '<defs><marker id="arw" markerWidth="6" markerHeight="4" refX="6" refY="2" orient="auto"><polygon points="0,0 6,2 0,4" fill="black"/></marker></defs>',
  '<line x1="30" y1="30" x2="70" y2="30" stroke="black" stroke-width="2"/>',
  '<polyline points="70,30 82,14 97,46 112,14 127,46 142,14 157,46 170,30" fill="none" stroke="black" stroke-width="2"/>',
  '<line x1="170" y1="30" x2="250" y2="30" stroke="black" stroke-width="2"/>',
  '<text x="120" y="10" font-size="12" text-anchor="middle">R_total=9\u03A9</text>',
  '<line x1="250" y1="30" x2="250" y2="110" stroke="black" stroke-width="2"/>',
  '<line x1="250" y1="110" x2="30" y2="110" stroke="black" stroke-width="2"/>',
  '<line x1="30" y1="110" x2="30" y2="80" stroke="black" stroke-width="2"/>',
  '<circle cx="30" cy="60" r="16" fill="none" stroke="black" stroke-width="2"/>',
  '<text x="30" y="64" font-size="10" text-anchor="middle">12V</text>',
  '<line x1="30" y1="40" x2="30" y2="30" stroke="black" stroke-width="2"/>',
  '<line x1="42" y1="30" x2="62" y2="30" stroke="red" stroke-width="1.5" marker-end="url(#arw)"/>',
  '<text x="140" y="64" font-size="13" text-anchor="middle" fill="red">I = 4/3 A</text>',
  '</svg>',
].join('\n');

const SVG_6_KVL_CHECK = [
  '<svg viewBox="0 0 400 220">',
  '<defs><marker id="arw" markerWidth="6" markerHeight="4" refX="6" refY="2" orient="auto"><polygon points="0,0 6,2 0,4" fill="black"/></marker></defs>',
  R1_ZIGZAG,
  SPLIT_JOIN_WIRES,
  R2_BRANCH,
  R3_BRANCH,
  BOTTOM_RETURN,
  V_SOURCE,
  '<text x="116" y="60" font-size="11" text-anchor="middle" fill="green">V_R1=16/3 V</text>',
  '<text x="310" y="114" font-size="11" text-anchor="middle" fill="green">V_par=20/3 V</text>',
  '<line x1="45" y1="30" x2="65" y2="30" stroke="red" stroke-width="1.5" marker-end="url(#arw)"/>',
  '<text x="55" y="22" font-size="10" fill="red">4/3 A</text>',
  '</svg>',
].join('\n');

// ── Capsule fixture ────────────────────────────────────────────────────────────

export const SERIES_PARALLEL_CIRCUIT = [
  '```stemlm',
  '@meta',
  'version: 1',
  'subject: Electrical',
  'topic: Series-parallel resistor current',
  '@endmeta',

  // ── Step 1 ──
  '@step',
  'title: Label nodes and assign reference directions',
  '@formula',
  '$$V = IR$$',
  '@endformula',
  '@body',
  'The source is $V = 12\\,\\text{V}$. Resistor $R_1 = 4\\,\\Omega$ is in series with the parallel pair $R_2 = 10\\,\\Omega \\| R_3 = 10\\,\\Omega$. Label nodes A, B, C and choose current direction clockwise.',
  '@endbody',
  '@diagram type=svg',
  SVG_1_FULL_CIRCUIT,
  '@enddiagram',
  '@takeaway',
  'Always label nodes and choose a current direction before writing equations.',
  '@endtakeaway',
  '@quickcheck',
  'q: How many distinct nodes does this circuit have?',
  'a: Three: A, B, and C.',
  '@endquickcheck',
  '@followup',
  'What changes if R2 and R3 are connected in series instead of parallel?',
  '@endfollowup',
  '@endstep',

  // ── Step 2 ──
  '@step',
  'title: Identify the parallel sub-network',
  '@formula',
  '$$R_{\\parallel} = \\frac{R_2 \\cdot R_3}{R_2 + R_3}$$',
  '@endformula',
  '@body',
  'Resistors $R_2$ and $R_3$ share nodes B and C, so they are connected in parallel. We will reduce them to a single equivalent $R_{\\parallel}$.',
  '@endbody',
  '@diagram type=svg',
  SVG_2_PARALLEL_HIGHLIGHT,
  '@enddiagram',
  '@takeaway',
  'Components sharing both terminals are in parallel.',
  '@endtakeaway',
  '@quickcheck',
  'q: What defines a parallel connection?',
  'a: Both ends of the components connect to the same pair of nodes.',
  '@endquickcheck',
  '@followup',
  'Derive the general parallel formula for N resistors.',
  '@endfollowup',
  '@endstep',

  // ── Step 3 ──
  '@step',
  'title: Compute the parallel equivalent resistance',
  '@formula',
  '$$R_{\\parallel} = \\frac{10 \\times 10}{10 + 10} = \\frac{100}{20} = 5\\,\\Omega$$',
  '@endformula',
  '@body',
  'Substitute $R_2 = 10\\,\\Omega$ and $R_3 = 10\\,\\Omega$ into the product-over-sum formula to get $R_{\\parallel} = 5\\,\\Omega$.',
  '@endbody',
  '@diagram type=svg',
  SVG_3_PARALLEL_REDUCED,
  '@enddiagram',
  '@takeaway',
  'Two equal resistors in parallel give half the individual resistance.',
  '@endtakeaway',
  '@quickcheck',
  'q: What is 6 ohm in parallel with 6 ohm?',
  'a: 3 ohm.',
  '@endquickcheck',
  '@followup',
  'What if R2 were 15 ohm and R3 were 10 ohm instead?',
  '@endfollowup',
  '@endstep',

  // ── Step 4 ──
  '@step',
  'title: Reduce to a single-loop series circuit',
  '@formula',
  '$$R_{\\text{total}} = R_1 + R_{\\parallel} = 4 + 5 = 9\\,\\Omega$$',
  '@endformula',
  '@body',
  'Replace the parallel combination with $R_{\\parallel} = 5\\,\\Omega$. Now $R_1$ and $R_{\\parallel}$ are in series, giving $R_{\\text{total}} = 9\\,\\Omega$.',
  '@endbody',
  '@diagram type=svg',
  SVG_4_SERIES_TOTAL,
  '@enddiagram',
  '@takeaway',
  'Series resistances add directly.',
  '@endtakeaway',
  '@quickcheck',
  'q: What is 3 ohm plus 7 ohm in series?',
  'a: 10 ohm.',
  '@endquickcheck',
  '@followup',
  'How would you handle three series-parallel stages?',
  '@endfollowup',
  '@endstep',

  // ── Step 5 ──
  '@step',
  'title: Apply Ohm\'s law for the total current',
  '@formula',
  '$$I_{R_1} = \\frac{V}{R_{\\text{total}}} = \\frac{12}{9} = \\frac{4}{3} \\approx 1.333\\,\\text{A}$$',
  '@endformula',
  '@body',
  'The entire source current flows through $R_1$ because it is the series element. Dividing gives $I_{R_1} = \\frac{4}{3}\\,\\text{A}$.',
  '@endbody',
  '@diagram type=svg',
  SVG_5_CURRENT_FLOW,
  '@enddiagram',
  '@takeaway',
  'In a series-parallel network the series element carries the full source current.',
  '@endtakeaway',
  '@quickcheck',
  'q: If V = 24 V and R_total = 8 ohm, what is I?',
  'a: 3 A.',
  '@endquickcheck',
  '@followup',
  'Now find the individual currents through R2 and R3 using the current divider.',
  '@endfollowup',
  '@endstep',

  // ── Step 6 ──
  '@step',
  'title: Verify using Kirchhoff\'s voltage law',
  '@formula',
  '$$V_{R_1} + V_{\\parallel} = \\frac{4}{3}(4) + \\frac{4}{3}(5) = \\frac{16}{3} + \\frac{20}{3} = 12\\,\\text{V}\\;\\checkmark$$',
  '@endformula',
  '@body',
  'The drop across $R_1$ is $V_{R_1} = \\frac{16}{3}\\,\\text{V}$ and across the parallel network is $V_{\\parallel} = \\frac{20}{3}\\,\\text{V}$. Their sum equals $12\\,\\text{V}$, confirming KVL.',
  '@endbody',
  '@diagram type=svg',
  SVG_6_KVL_CHECK,
  '@enddiagram',
  '@takeaway',
  'KVL: the sum of voltage drops around a closed loop equals the source voltage.',
  '@endtakeaway',
  '@quickcheck',
  'q: If V_source = 10 V and V_R1 = 4 V, what is V_R2?',
  'a: 6 V.',
  '@endquickcheck',
  '@followup',
  'Verify KCL at node B: does the current entering equal the sum leaving through R2 and R3?',
  '@endfollowup',
  '@endstep',

  // ── Solution ──
  '@solution',
  'The current through $R_1$ is $\\frac{4}{3}\\,\\text{A} \\approx 1.333\\,\\text{A}$.',
  'The parallel combination $R_2 \\| R_3 = \\frac{10 \\times 10}{10+10} = 5\\,\\Omega$ reduces the network to $R_{\\text{total}} = 4 + 5 = 9\\,\\Omega$.',
  'By Ohm\'s law, $I = \\frac{12}{9} = \\frac{4}{3}\\,\\text{A}$.',
  'Voltage drops: $V_{R_1} = \\frac{16}{3}\\,\\text{V}$, $V_{\\parallel} = \\frac{20}{3}\\,\\text{V}$; sum = $12\\,\\text{V}$ (KVL verified).',
  '@diagram type=mermaid',
  'graph TD; A["V = 12 V"] --> B["R1 = 4 Ohm"] --> C["R_par = 5 Ohm"] --> D["I = 4/3 A"]',
  '@enddiagram',
  '@endsolution',
  '@end',
  '```',
].join('\n');

// ── Verified constants for test assertions ─────────────────────────────────────

export const VERIFIED = {
  R2: 10,
  R3: 10,
  R_parallel: 5,
  R1: 4,
  R_total: 9,
  V_source: 12,
  I_R1: 4 / 3,
  I_R1_fraction: '4/3',
  V_R1: 16 / 3,
  V_parallel: 20 / 3,
  stepCount: 6,
} as const;
