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
  'a: Three — A (source+), B (between R1 and the parallel pair), and C (return to source−).',
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
  'q: What is 10 Ω in parallel with 10 Ω?',
  'a: $R_\\parallel=\\frac{10\\times10}{10+10}=5\\,\\Omega$ — because both resistors share nodes B and C.',
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
  'q: What is $R_1$ plus $R_\\parallel$ in series?',
  'a: $R_{\\text{total}}=4+5=9\\,\\Omega$ — because $R_1$ is in series with the reduced parallel branch.',
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
  'q: With $V=12\\,\\text{V}$ and $R_{\\text{total}}=9\\,\\Omega$, what is $I$?',
  'a: $I=\\frac{V}{R_{\\text{total}}}=\\frac{12}{9}=\\frac{4}{3}\\,\\text{A}$ — by Ohm\'s law.',
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
  'q: If $V_{R_1}=\\frac{16}{3}\\,\\text{V}$ across $4\\,\\Omega$ with $I=\\frac{4}{3}\\,\\text{A}$, what is $V_{\\parallel}$?',
  'a: $V_{\\parallel}=IR_\\parallel=\\frac{4}{3}\\times5=\\frac{20}{3}\\,\\text{V}$ — because the parallel branch shares the same current.',
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

// ═══════════════════════════════════════════════════════════════════════════════
// Node-Voltage / Mesh Analysis: 3-node multi-source circuit
//
// Problem: V1=12V with R1=6Ω to node N1, R2=3Ω from N1 to N2, I-source 2A
//          into N2, R3=4Ω from N2 to ground. Find V_N1 and V_N2.
//
// KCL at N1: (12−V_N1)/6 = (V_N1−V_N2)/3  →  3·V_N1 − 2·V_N2 = 12
// KCL at N2: (V_N1−V_N2)/3 + 2 = V_N2/4   →  4·V_N1 − 7·V_N2 = −24
// Solution:  V_N1 = 132/13 ≈ 10.154 V,  V_N2 = 120/13 ≈ 9.231 V
// ═══════════════════════════════════════════════════════════════════════════════

// ── SVG building blocks (node-voltage diagrams) ─────────────────────────────

const NV_ARROW_DEFS = [
  '<defs>',
  '<marker id="arr" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto" markerUnits="userSpaceOnUse">',
  '<polygon points="0,0 8,3 0,6" fill="#333"/>',
  '</marker>',
  '<marker id="arr-r" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto" markerUnits="userSpaceOnUse">',
  '<polygon points="0,0 8,3 0,6" fill="#d32f2f"/>',
  '</marker>',
  '</defs>',
].join('');

const NV_GROUND_SYMBOL = [
  '<g id="gnd" transform="translate(200,195)">',
  '<line x1="-10" y1="0" x2="10" y2="0" stroke="#333" stroke-width="2"/>',
  '<line x1="-6" y1="5" x2="6" y2="5" stroke="#333" stroke-width="1.5"/>',
  '<line x1="-3" y1="10" x2="3" y2="10" stroke="#333" stroke-width="1"/>',
  '</g>',
  '<text x="216" y="205" font-size="10" fill="#888">GND</text>',
].join('');

const NV_V1_SOURCE = [
  '<line x1="40" y1="190" x2="40" y2="135" stroke="#333" stroke-width="2"/>',
  '<circle cx="40" cy="110" r="18" fill="none" stroke="#333" stroke-width="2"/>',
  '<text x="40" y="114" font-size="10" text-anchor="middle">V1</text>',
  '<text x="12" y="114" font-size="9" fill="#1565c0">12V</text>',
  '<text x="34" y="95" font-size="10">+</text>',
  '<text x="34" y="132" font-size="10">\u2212</text>',
  '<line x1="40" y1="92" x2="40" y2="30" stroke="#333" stroke-width="2"/>',
].join('');

const NV_R1_BOX = [
  '<line x1="40" y1="30" x2="80" y2="30" stroke="#333" stroke-width="2"/>',
  '<rect x="80" y="18" width="50" height="24" fill="none" stroke="#333" stroke-width="2"/>',
  '<text x="105" y="34" font-size="10" text-anchor="middle">R1=6\u03A9</text>',
  '<line x1="130" y1="30" x2="170" y2="30" stroke="#333" stroke-width="2"/>',
].join('');

const NV_NODE_N1 = [
  '<circle cx="170" cy="30" r="5" fill="#1565c0"/>',
  '<text x="170" y="18" font-size="12" font-weight="bold" text-anchor="middle" fill="#1565c0">N1</text>',
].join('');

const NV_R2_BOX = [
  '<line x1="175" y1="30" x2="210" y2="30" stroke="#333" stroke-width="2"/>',
  '<rect x="210" y="18" width="50" height="24" fill="none" stroke="#333" stroke-width="2"/>',
  '<text x="235" y="34" font-size="10" text-anchor="middle">R2=3\u03A9</text>',
  '<line x1="260" y1="30" x2="300" y2="30" stroke="#333" stroke-width="2"/>',
].join('');

const NV_NODE_N2 = [
  '<circle cx="300" cy="30" r="5" fill="#d32f2f"/>',
  '<text x="300" y="18" font-size="12" font-weight="bold" text-anchor="middle" fill="#d32f2f">N2</text>',
].join('');

const NV_R3_BRANCH = [
  '<line x1="300" y1="35" x2="300" y2="70" stroke="#333" stroke-width="2"/>',
  '<rect x="285" y="70" width="30" height="50" fill="none" stroke="#333" stroke-width="2"/>',
  '<text x="325" y="98" font-size="10">R3=4\u03A9</text>',
  '<line x1="300" y1="120" x2="300" y2="190" stroke="#333" stroke-width="2"/>',
].join('');

const NV_ISRC = [
  '<line x1="370" y1="190" x2="370" y2="124" stroke="#333" stroke-width="2"/>',
  '<circle cx="370" cy="108" r="16" fill="none" stroke="#333" stroke-width="2"/>',
  '<line x1="370" y1="120" x2="370" y2="96" stroke="#333" stroke-width="1.5" marker-end="url(#arr)"/>',
  '<line x1="370" y1="92" x2="370" y2="30" stroke="#333" stroke-width="2"/>',
  '<line x1="370" y1="30" x2="305" y2="30" stroke="#333" stroke-width="2"/>',
  '<text x="390" y="112" font-size="10">2A</text>',
].join('');

const NV_GROUND_RAIL = '<line x1="40" y1="190" x2="370" y2="190" stroke="#333" stroke-width="2"/>';

// Step 1: full circuit with current arrows and node voltage labels
const NV_SVG_1_CIRCUIT = [
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 220">',
  NV_ARROW_DEFS,
  '<g id="circuit">',
  NV_V1_SOURCE,
  NV_R1_BOX,
  NV_NODE_N1,
  NV_R2_BOX,
  NV_NODE_N2,
  NV_R3_BRANCH,
  NV_ISRC,
  NV_GROUND_RAIL,
  NV_GROUND_SYMBOL,
  '</g>',
  '<g id="current-arrows">',
  '<line x1="55" y1="24" x2="75" y2="24" stroke="#d32f2f" stroke-width="1.5" marker-end="url(#arr-r)"/>',
  '<text x="65" y="18" font-size="9" text-anchor="middle" fill="#d32f2f">I\u2081</text>',
  '<line x1="185" y1="24" x2="205" y2="24" stroke="#d32f2f" stroke-width="1.5" marker-end="url(#arr-r)"/>',
  '<text x="195" y="18" font-size="9" text-anchor="middle" fill="#d32f2f">I\u2082</text>',
  '<line x1="294" y1="50" x2="294" y2="68" stroke="#d32f2f" stroke-width="1.5" marker-end="url(#arr-r)"/>',
  '<text x="278" y="62" font-size="9" text-anchor="end" fill="#d32f2f">I\u2083</text>',
  '</g>',
  '<g id="voltage-labels">',
  '<text x="170" y="55" font-size="10" text-anchor="middle" fill="#1565c0">V\u2081</text>',
  '<text x="300" y="55" font-size="10" text-anchor="middle" fill="#d32f2f">V\u2082</text>',
  '</g>',
  '</svg>',
].join('\n');

// Step 2: KCL at N1 — highlight incoming/outgoing currents
const NV_SVG_2_KCL_N1 = [
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 140">',
  NV_ARROW_DEFS,
  '<circle cx="160" cy="70" r="24" fill="none" stroke="#1565c0" stroke-width="2.5" stroke-dasharray="6,3"/>',
  '<circle cx="160" cy="70" r="5" fill="#1565c0"/>',
  '<text x="160" y="50" font-size="14" font-weight="bold" text-anchor="middle" fill="#1565c0">N1</text>',
  '<line x1="30" y1="70" x2="130" y2="70" stroke="#333" stroke-width="2" marker-end="url(#arr)"/>',
  '<text x="80" y="62" font-size="11" text-anchor="middle">(12\u2212V\u2081)/6</text>',
  '<line x1="190" y1="70" x2="290" y2="70" stroke="#333" stroke-width="2" marker-end="url(#arr)"/>',
  '<text x="240" y="62" font-size="11" text-anchor="middle">(V\u2081\u2212V\u2082)/3</text>',
  '</svg>',
].join('\n');

// Step 3: KCL at N2 — highlight incoming/outgoing currents
const NV_SVG_3_KCL_N2 = [
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 180">',
  NV_ARROW_DEFS,
  '<circle cx="160" cy="60" r="24" fill="none" stroke="#d32f2f" stroke-width="2.5" stroke-dasharray="6,3"/>',
  '<circle cx="160" cy="60" r="5" fill="#d32f2f"/>',
  '<text x="160" y="40" font-size="14" font-weight="bold" text-anchor="middle" fill="#d32f2f">N2</text>',
  '<line x1="30" y1="60" x2="130" y2="60" stroke="#333" stroke-width="2" marker-end="url(#arr)"/>',
  '<text x="80" y="52" font-size="11" text-anchor="middle">(V\u2081\u2212V\u2082)/3</text>',
  '<line x1="160" y1="130" x2="160" y2="90" stroke="#333" stroke-width="2" marker-end="url(#arr)"/>',
  '<text x="180" y="120" font-size="11">2A</text>',
  '<line x1="160" y1="84" x2="160" y2="160" stroke="#999" stroke-width="1" stroke-dasharray="4,2"/>',
  '<line x1="190" y1="60" x2="290" y2="60" stroke="#333" stroke-width="2" marker-end="url(#arr)"/>',
  '<text x="245" y="52" font-size="11" text-anchor="middle">V\u2082/4</text>',
  '</svg>',
].join('\n');

// Step 4: system of equations (minimal diagram)
const NV_SVG_4_SYSTEM = [
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 100">',
  '<rect x="10" y="10" width="280" height="80" rx="8" fill="none" stroke="#333" stroke-width="1.5"/>',
  '<text x="150" y="38" font-size="12" text-anchor="middle">3V\u2081 \u2212 2V\u2082 = 12</text>',
  '<text x="150" y="68" font-size="12" text-anchor="middle">4V\u2081 \u2212 7V\u2082 = \u221224</text>',
  '</svg>',
].join('\n');

// Step 5: circuit with solved voltages labeled
const NV_SVG_5_SOLVED = [
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 220">',
  NV_ARROW_DEFS,
  '<g id="circuit">',
  NV_V1_SOURCE,
  NV_R1_BOX,
  NV_NODE_N1,
  NV_R2_BOX,
  NV_NODE_N2,
  NV_R3_BRANCH,
  NV_ISRC,
  NV_GROUND_RAIL,
  NV_GROUND_SYMBOL,
  '</g>',
  '<g id="solved-voltages">',
  '<text x="170" y="55" font-size="11" text-anchor="middle" font-weight="bold" fill="#1565c0">132/13 V</text>',
  '<text x="300" y="55" font-size="11" text-anchor="middle" font-weight="bold" fill="#d32f2f">120/13 V</text>',
  '</g>',
  '<g id="branch-currents">',
  '<line x1="55" y1="24" x2="75" y2="24" stroke="#d32f2f" stroke-width="1.5" marker-end="url(#arr-r)"/>',
  '<text x="65" y="18" font-size="9" text-anchor="middle" fill="#d32f2f">4/13 A</text>',
  '<line x1="185" y1="24" x2="205" y2="24" stroke="#d32f2f" stroke-width="1.5" marker-end="url(#arr-r)"/>',
  '<text x="195" y="18" font-size="9" text-anchor="middle" fill="#d32f2f">4/13 A</text>',
  '<line x1="294" y1="50" x2="294" y2="68" stroke="#d32f2f" stroke-width="1.5" marker-end="url(#arr-r)"/>',
  '<text x="278" y="62" font-size="9" text-anchor="end" fill="#d32f2f">30/13 A</text>',
  '<text x="354" y="82" font-size="9" text-anchor="middle" fill="#d32f2f">2 A up</text>',
  '</g>',
  '</svg>',
].join('\n');

// Step 6: power balance verification
const NV_SVG_6_POWER = [
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 160">',
  NV_ARROW_DEFS,
  '<g id="power-table">',
  '<rect x="10" y="10" width="340" height="140" rx="6" fill="none" stroke="#333" stroke-width="1.5"/>',
  '<line x1="10" y1="40" x2="350" y2="40" stroke="#333" stroke-width="1"/>',
  '<line x1="130" y1="10" x2="130" y2="150" stroke="#333" stroke-width="1"/>',
  '<text x="70" y="30" font-size="11" text-anchor="middle" font-weight="bold">Element</text>',
  '<text x="240" y="30" font-size="11" text-anchor="middle" font-weight="bold">Power</text>',
  '<text x="70" y="60" font-size="10" text-anchor="middle">V1 (source)</text>',
  '<text x="240" y="60" font-size="10" text-anchor="middle">12 \u00d7 4/13 = 48/13 W</text>',
  '<text x="70" y="82" font-size="10" text-anchor="middle">I-source</text>',
  '<text x="240" y="82" font-size="10" text-anchor="middle">2 \u00d7 120/13 = 240/13 W</text>',
  '<text x="70" y="104" font-size="10" text-anchor="middle">R1 + R2 + R3</text>',
  '<text x="240" y="104" font-size="10" text-anchor="middle">\u2211P_abs = 288/13 W</text>',
  '<text x="180" y="138" font-size="11" text-anchor="middle" fill="green">\u2211P_gen = \u2211P_abs \u2713</text>',
  '</g>',
  '</svg>',
].join('\n');

// ── Node-voltage capsule fixture ────────────────────────────────────────────

export const NODE_VOLTAGE_CIRCUIT = [
  '```stemlm',
  '@meta',
  'version: 1',
  'subject: Electrical',
  'topic: 3-node node-voltage analysis with current source',
  '@endmeta',

  // Step 1
  '@step',
  'title: Label nodes and assign reference ground',
  '@formula',
  '$$\\text{KCL: }\\sum I_{\\text{in}} = \\sum I_{\\text{out}}$$',
  '@endformula',
  '@body',
  'A $12\\,\\text{V}$ source feeds through $R_1 = 6\\,\\Omega$ to node $N_1$. Resistor $R_2 = 3\\,\\Omega$ connects $N_1$ to $N_2$. A $2\\,\\text{A}$ current source injects into $N_2$, and $R_3 = 4\\,\\Omega$ connects $N_2$ to ground.',
  '@endbody',
  '@diagram type=svg',
  NV_SVG_1_CIRCUIT,
  '@enddiagram',
  '@takeaway',
  'Choose a reference (ground) node, then label each remaining node with an unknown voltage.',
  '@endtakeaway',
  '@quickcheck',
  'q: How many independent node-voltage equations do we need for two unknown nodes?',
  'a: Two — one KCL equation per unknown node.',
  '@endquickcheck',
  '@followup',
  'What if a third resistor were added between N1 and ground?',
  '@endfollowup',
  '@endstep',

  // Step 2
  '@step',
  'title: Write KCL at node N1',
  '@formula',
  '$$\\frac{12 - V_1}{6} = \\frac{V_1 - V_2}{3} \\quad\\Rightarrow\\quad 3V_1 - 2V_2 = 12$$',
  '@endformula',
  '@body',
  'Current into $N_1$ through $R_1$ equals current out through $R_2$. Multiply through by $6$ and collect terms.',
  '@endbody',
  '@diagram type=svg',
  NV_SVG_2_KCL_N1,
  '@enddiagram',
  '@takeaway',
  'Node-voltage KCL: express each branch current as a voltage difference divided by resistance.',
  '@endtakeaway',
  '@quickcheck',
  'q: Why does the 12V source appear as (12 \u2212 V1)/6?',
  "a: Because the current through R1 is the potential difference across it divided by R1.",
  '@endquickcheck',
  '@followup',
  'What if R1 were replaced by a short circuit?',
  '@endfollowup',
  '@endstep',

  // Step 3
  '@step',
  'title: Write KCL at node N2',
  '@formula',
  '$$\\frac{V_1 - V_2}{3} + 2 = \\frac{V_2}{4} \\quad\\Rightarrow\\quad 4V_1 - 7V_2 = -24$$',
  '@endformula',
  '@body',
  'Current into $N_2$ arrives from $R_2$ and the $2\\,\\text{A}$ source. Current out leaves through $R_3$ to ground. Multiply by $12$ and rearrange.',
  '@endbody',
  '@diagram type=svg',
  NV_SVG_3_KCL_N2,
  '@enddiagram',
  '@takeaway',
  'A current source adds a known constant to one side of the KCL equation.',
  '@endtakeaway',
  '@quickcheck',
  'q: Does the current source voltage appear in the KCL equation?',
  'a: No — a current source contributes a known current, not a voltage term.',
  '@endquickcheck',
  '@followup',
  'What if the current source were reversed (2A out of N2)?',
  '@endfollowup',
  '@endstep',

  // Step 4
  '@step',
  'title: Solve the 2\u00d72 system for V_N2',
  '@formula',
  '$$V_2 = \\frac{120}{13} \\approx 9.231\\,\\text{V}$$',
  '@endformula',
  '@body',
  'From equation (1): $V_1 = (12 + 2V_2)/3$. Substitute into equation (2): $4(12+2V_2)/3 - 7V_2 = -24$. Simplify: $13V_2 = 120$.',
  '@endbody',
  '@diagram type=svg',
  NV_SVG_4_SYSTEM,
  '@enddiagram',
  '@takeaway',
  'Substitution or Cramer\u2019s rule both work for 2\u00d72 systems; pick whichever is cleaner.',
  '@endtakeaway',
  '@quickcheck',
  'q: What method would you use for a 3\u00d73 node-voltage system?',
  'a: Gaussian elimination or matrix methods (Cramer\u2019s rule becomes tedious for n > 2).',
  '@endquickcheck',
  '@followup',
  'Set up the conductance matrix G and solve GV = I directly.',
  '@endfollowup',
  '@endstep',

  // Step 5
  '@step',
  'title: Back-substitute to find V_N1',
  '@formula',
  '$$V_1 = \\frac{12 + 2 \\cdot \\frac{120}{13}}{3} = \\frac{132}{13} \\approx 10.154\\,\\text{V}$$',
  '@endformula',
  '@body',
  'Plug $V_2 = 120/13$ back into $V_1 = (12 + 2V_2)/3$ to obtain $V_1 = 132/13\\,\\text{V}$.',
  '@endbody',
  '@diagram type=svg',
  NV_SVG_5_SOLVED,
  '@enddiagram',
  '@takeaway',
  'Always back-substitute into the original (unsimplified) equation to avoid propagating algebra errors.',
  '@endtakeaway',
  '@quickcheck',
  'q: Is V_N1 > V_N2 consistent with current flowing from N1 to N2?',
  'a: Yes — current flows from higher to lower potential through a resistor.',
  '@endquickcheck',
  '@followup',
  'Compute the branch currents I1, I2, I3 from the node voltages.',
  '@endfollowup',
  '@endstep',

  // Step 6
  '@step',
  'title: Verify with power balance',
  '@formula',
  '$$P_{\\text{gen}} = 12 \\cdot \\frac{4}{13} + 2 \\cdot \\frac{120}{13} = \\frac{288}{13}\\,\\text{W} = \\sum P_{\\text{abs}}\\;\\checkmark$$',
  '@endformula',
  '@body',
  'Power generated by $V_1$: $12 \\times 4/13 = 48/13\\,\\text{W}$. Power by the current source: $2 \\times 120/13 = 240/13\\,\\text{W}$. Total $= 288/13 \\approx 22.15\\,\\text{W}$.',
  '@endbody',
  '@diagram type=svg',
  NV_SVG_6_POWER,
  '@enddiagram',
  '@takeaway',
  'Power balance: total generated power must equal total absorbed power (conservation of energy).',
  '@endtakeaway',
  '@quickcheck',
  'q: Does a current source always generate power?',
  'a: Not always — it generates power when current flows from \u2212 to + inside the source.',
  '@endquickcheck',
  '@followup',
  'Convert the voltage source + R1 branch to a Norton equivalent and re-solve.',
  '@endfollowup',
  '@endstep',

  // Solution
  '@solution',
  'Node-voltage analysis of the 3-node circuit with $V_1 = 12\\,\\text{V}$, $R_1 = 6\\,\\Omega$, $R_2 = 3\\,\\Omega$, $R_3 = 4\\,\\Omega$, $I_s = 2\\,\\text{A}$:',
  '$$V_{N1} = \\frac{132}{13} \\approx 10.154\\,\\text{V}, \\qquad V_{N2} = \\frac{120}{13} \\approx 9.231\\,\\text{V}$$',
  'Branch currents: $I_1 = I_2 = 4/13\\,\\text{A}$, $I_3 = 30/13\\,\\text{A}$.',
  'Power balance: $\\sum P_{\\text{gen}} = 288/13 = \\sum P_{\\text{abs}}$.',
  '@diagram type=svg',
  NV_SVG_5_SOLVED,
  '@enddiagram',
  '@endsolution',
  '@end',
  '```',
].join('\n');

// ── Verified constants for node-voltage fixture ─────────────────────────────

export const NV_VERIFIED = {
  V_source: 12,
  R1: 6,
  R2: 3,
  R3: 4,
  I_source: 2,
  V_N1: 132 / 13,
  V_N2: 120 / 13,
  I_R1: 4 / 13,
  I_R2: 4 / 13,
  I_R3: 30 / 13,
  P_V1: (12 * 4) / 13,
  P_Isrc: (2 * 120) / 13,
  P_total: 288 / 13,
  stepCount: 6,
} as const;
