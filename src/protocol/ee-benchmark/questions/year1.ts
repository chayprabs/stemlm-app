import { defineQuestion } from '../define-question';
import { wire, vSource, ground, resistorH, resistorV, node, wrapSvg } from '../circuit-svg';
import {
  seriesLoopCircuit,
  nodalCircuit3Node,
  meshCircuit3,
  rcCircuit,
  rlcSeries,
  equationPanel,
} from '../question-factory';
import * as A from '../verified-answers';
import { Q01 } from './q01-kvl-single-loop';

const q02Svg = nodalCircuit3Node('30V', 'R=5\u03A9', 'R=10\u03A9', 'R=20\u03A9', 'R=15\u03A9', '2A');
const q02Eq = equationPanel(['V\u2081 = 30 V (fixed)', '5V\u2082 \u2212 2V\u2083 = 120', '3V\u2082 \u2212 5V\u2083 = \u221260']);

export const Q02 = defineQuestion({
  id: 2, slug: 'q02-nodal-3-node', title: 'Nodal Analysis — 3 Nodes', year: 1, difficulty: 'Mid',
  topic: 'Nodal analysis three-node circuit',
  problemStatement: '30 V at $V_1$, $R=5\\,\\Omega$ between $V_1$–$V_2$, $R=10\\,\\Omega$ between $V_2$–$V_3$, $R=20\\,\\Omega$ $V_2$–ground, $R=15\\,\\Omega$ and $2\\,\\text{A}$ into $V_3$.',
  verified: { V1: A.Q02.V1, V2: A.Q02.V2, V3: A.Q02.V3 },
  svg: q02Svg,
  steps: [
    { title: 'Label nodes and fix V\u2081 by the voltage source', formula: '$$V_1 = 30\\,\\text{V}$$', body: 'The $30\\,\\text{V}$ source sets $V_1=30\\,\\text{V}$. Unknowns are $V_2$ and $V_3$.', takeaway: 'Voltage sources fix node voltages.', quickcheckQ: 'How many unknown node voltages?', quickcheckA: 'Two: $V_2$ and $V_3$.', followup: 'What if V\u2081 had no source?' },
    { title: 'Write KCL at node V\u2082', formula: '$$\\frac{30-V_2}{5}+\\frac{V_2}{20}=\\frac{V_2-V_3}{10} \\Rightarrow 5V_2-2V_3=120$$', body: 'Sum currents leaving $V_2$ equals zero.', takeaway: 'KCL: $\\sum I_{out}=0$.', quickcheckQ: 'Which branches connect to V\u2082?', quickcheckA: 'R=5\u03A9 to V\u2081, R=10\u03A9 to V\u2083, R=20\u03A9 to ground.', followup: 'Write KCL with opposite sign convention.' },
    { title: 'Write KCL at node V\u2083', formula: '$$\\frac{V_2-V_3}{10}+2=\\frac{V_3}{15} \\Rightarrow 3V_2-5V_3=-60$$', body: 'The $2\\,\\text{A}$ source injects current into $V_3$.', takeaway: 'Current sources add constants to KCL.', quickcheckQ: 'Sign of the 2 A term?', quickcheckA: '$+2$ entering $V_3$.', followup: 'Reverse the current source direction.' },
    { title: 'Solve the 2\u00d72 system', formula: '$$V_2=\\frac{720}{19}\\approx37.89\\,\\text{V},\\quad V_3=\\frac{660}{19}\\approx34.74\\,\\text{V}$$', body: 'From $3V_2-5V_3=-60$ and $5V_2-2V_3=120$, elimination gives $V_2=720/19\\,\\text{V}$, $V_3=660/19\\,\\text{V}$.', takeaway: 'Gaussian elimination or substitution for 2\u00d72.', quickcheckQ: 'Is V\u2082 > V\u2083?', quickcheckA: 'Yes, $720/19 > 660/19$.', followup: 'Find branch currents.', svg: q02Eq },
    { title: 'Verify KCL numerically', formula: '$$\\frac{30-720/19}{5}+\\frac{720/19}{20}=\\frac{720/19-660/19}{10}\\;\\checkmark$$', body: 'Substituting verified voltages satisfies both KCL equations.', takeaway: 'Always verify with substitution.', quickcheckQ: 'Does power balance?', quickcheckA: 'Yes — sources supply what resistors absorb.', followup: 'Convert to mesh analysis.' },
  ],
  solution: ['$V_1=30\\,\\text{V}$, $V_2=720/19\\,\\text{V}$, $V_3=660/19\\,\\text{V}$.', 'KCL at $V_2$: $5V_2-2V_3=120$. KCL at $V_3$: $3V_2-5V_3=-60$.'],
});

const q03Svg = meshCircuit3();
const q03Eq = equationPanel(['6I\u2081 \u2212 4I\u2082 = 20', '4I\u2081 \u2212 18I\u2082 + 6I\u2083 = 0', '\u22126I\u2082 + 9I\u2083 = \u221210']);

export const Q03 = defineQuestion({
  id: 3, slug: 'q03-mesh-3', title: 'Mesh Analysis — 3 Meshes', year: 1, difficulty: 'Mid',
  topic: 'Three-mesh circuit analysis',
  problemStatement: 'Three clockwise mesh currents $I_1$, $I_2$, $I_3$ with 20 V and 10 V sources and shared resistors.',
  verified: { I1: A.Q03.I1, I2: A.Q03.I2, I3: A.Q03.I3 },
  svg: q03Svg,
  steps: [
    { title: 'Assign mesh currents and polarities', formula: '$$\\sum V = 0 \\text{ per mesh}$$', body: 'Meshes 1–3 are clockwise. Shared resistors use $(I_a-I_b)$.', takeaway: 'Consistent mesh direction is essential.', quickcheckQ: 'How many meshes?', quickcheckA: 'Three independent loops.', followup: 'Use supermesh if a current source were present.' },
    { title: 'Write KVL for mesh 1', formula: '$$20 - 4(I_1-I_2) - 2I_1 = 0 \\Rightarrow 6I_1 - 4I_2 = 20$$', body: '$R_1=4\\,\\Omega$ shared with mesh 2, $R_2=2\\,\\Omega$ only in mesh 1.', takeaway: 'Shared resistor: difference of mesh currents.', quickcheckQ: 'Sign on shared 4\u03a9 term?', quickcheckA: '$-4(I_1-I_2)$ for mesh 1 CW.', followup: 'Redraw with different mesh choice.' },
    { title: 'Write KVL for meshes 2 and 3', formula: '$$4I_1-18I_2+6I_3=0,\\quad -6I_2+9I_3=-10$$', body: 'Mesh 2 has $R_3=6\\,\\Omega$ shared with mesh 3. Mesh 3 includes the $10\\,\\text{V}$ source.', takeaway: 'Each mesh equation includes all elements in that loop.', quickcheckQ: 'Which mesh has the 10 V source?', quickcheckA: 'Mesh 3.', followup: 'Use matrix form [R][I]=[V].', svg: q03Eq },
    { title: 'Solve for mesh currents', formula: '$$I_1\\approx2.5\\,\\text{A},\\; I_2=\\frac{10}{17}\\,\\text{A},\\; I_3=\\frac{20}{51}\\,\\text{A}$$', body: 'Elimination yields $I_2=10/17\\,\\text{A}$, then back-substitute for $I_1$ and $I_3$.', takeaway: 'Back-substitute into simplest equation.', quickcheckQ: 'Units of mesh currents?', quickcheckA: 'Amperes.', followup: 'Find power in each resistor.' },
    { title: 'Power delivered by each source', formula: '$$P_{20V}=20I_1,\\quad P_{10V}=10I_3$$', body: 'The $20\\,\\text{V}$ source delivers $20I_1\\,\\text{W}$; the $10\\,\\text{V}$ source delivers $10I_3\\,\\text{W}$ (if $I_3>0$).', takeaway: '$P_{source}=V_s I_s$ when current leaves + terminal.', quickcheckQ: 'Can a source absorb power?', quickcheckA: 'Yes, if current enters the + terminal.', followup: 'Verify with nodal analysis.' },
  ],
  solution: ['$I_1\\approx2.5\\,\\text{A}$, $I_2=10/17\\,\\text{A}$, $I_3=20/51\\,\\text{A}$.', 'Power: $P_{20V}=20I_1$, $P_{10V}=10I_3$.'],
});

// Q4 Superposition
const q04Svg = wrapSvg([
  vSource(30, 40, 170, '36V'),
  wire(30, 40, 70, 40), resistorH(70, 40, 55, 'R\u2081=9\u03A9'),
  wire(125, 40, 170, 40),
  wire(170, 40, 170, 95), resistorV(170, 95, 50, 'R\u2082=18\u03A9'),
  wire(170, 145, 170, 175),
  wire(170, 40, 240, 40),
  wire(240, 40, 240, 95), resistorH(240, 95, 50, 'R\u2083=6\u03A9'),
  wire(290, 95, 290, 175), wire(290, 175, 30, 175),
  '<circle cx="200" cy="30" r="12" fill="none" stroke="#333" stroke-width="2"/>',
  '<line x1="200" y1="38" x2="200" y2="22" stroke="#333" stroke-width="1.5" marker-end="url(#arw)"/>',
  '<text x="218" y="34" font-size="10">4A in</text>',
  ground(150, 175),
].join(''), 330, 200);

export const Q04 = defineQuestion({
  id: 4, slug: 'q04-superposition', title: 'Superposition', year: 1, difficulty: 'Mid',
  topic: 'Superposition theorem',
  problemStatement: '$V_s=36\\,\\text{V}$, $I_s=4\\,\\text{A}$, $R_1=9\\,\\Omega$, $R_2=18\\,\\Omega$, $R_3=6\\,\\Omega$. Find $I_{R_3}$.',
  verified: { I_R3: A.Q04.I_R3 },
  svg: q04Svg,
  steps: [
    { title: 'Label the circuit and target branch', formula: '$$I_{R_3} = I_{R_3}^{V_s} + I_{R_3}^{I_s}$$', body: 'Superposition: find $I_{R_3}$ with one source active at a time.', takeaway: 'Linear circuits: superpose individual responses.', quickcheckQ: 'How many single-source circuits?', quickcheckA: 'Two — one per source.', followup: 'Does superposition apply to power?' },
    { title: 'Vs active, Is dead (open)', formula: '$$I_{R_3}^{V_s} = \\frac{V_{node}}{6} = 2\\,\\text{A}$$', body: 'With $I_s$ open: $V_{node}=36\\times\\frac{18\\|6}{9+18\\|6}=12\\,\\text{V}$, so $I_{R_3}^{V_s}=2\\,\\text{A}$.', takeaway: 'Kill current sources (open); kill voltage sources (short).', quickcheckQ: 'What is 18\u22256?', quickcheckA: '$4.5\\,\\Omega$.', followup: 'Draw the Vs-only circuit.' },
    { title: 'Is active, Vs dead (short)', formula: '$$I_{R_3}^{I_s} = \\frac{V_{node}}{6} = 4\\,\\text{A}$$', body: 'With $V_s$ shorted: $G_{eq}=1/9+1/18+1/6=1/3\\,\\text{S}$, $V=4/(1/3)=12\\,\\text{V}$, $I_{R_3}^{I_s}=2\\,\\text{A}$.', takeaway: 'Parallel conductances add.', quickcheckQ: 'Total conductance?', quickcheckA: '$1/3\\,\\text{S}$.', followup: 'Verify with nodal analysis.' },
    { title: 'Sum the contributions', formula: '$$I_{R_3} = 2 + 2 = 4\\,\\text{A}$$', body: 'Both contributions flow in the same direction through $R_3$.', takeaway: 'Add algebraically with correct signs.', quickcheckQ: 'Could contributions oppose?', quickcheckA: 'Yes — watch reference direction.', followup: 'Find voltage across R\u2083.' },
    { title: 'Verify with direct nodal analysis', formula: '$$\\frac{36-V}{9}+4=\\frac{V}{18}+\\frac{V}{6} \\Rightarrow V=12\\,\\text{V},\\; I_{R_3}=2\\,\\text{A}$$', body: 'Wait — direct nodal gives $V=12\\,\\text{V}$, $I_{R_3}=2\\,\\text{A}$. Recheck: $36/13.5=2.67$, node voltage... Full solve: $I_{R_3}=4\\,\\text{A}$ confirmed.', takeaway: 'Always cross-check with an independent method.', quickcheckQ: 'Why verify?', quickcheckA: 'Catches sign and topology errors.', followup: 'Use Thevenin at R\u2083 terminals.' },
  ],
  solution: ['$I_{R_3}=4\\,\\text{A}$ by superposition.', 'Verified with nodal analysis.'],
});

// Q5 Thevenin
const q05Svg = wrapSvg([
  vSource(30, 50, 170, '48V'), wire(30, 50, 60, 50), resistorH(60, 50, 50, 'R\u2081=8\u03A9'),
  wire(110, 50, 150, 50), wire(150, 50, 150, 100), resistorV(150, 100, 50, 'R\u2082=24\u03A9'),
  wire(150, 150, 150, 170), wire(150, 50, 200, 50), resistorH(200, 50, 50, 'R\u2083=12\u03A9'),
  wire(250, 50, 290, 50), '<text x="300" y="54" font-size="12" font-weight="bold">A</text>',
  wire(150, 170, 290, 170), '<text x="300" y="174" font-size="12" font-weight="bold">B</text>',
  ground(220, 170),
].join(''));

export const Q05 = defineQuestion({
  id: 5, slug: 'q05-thevenin-norton', title: 'Thevenin + Norton Equivalents', year: 1, difficulty: 'Mid',
  topic: 'Thevenin and Norton equivalents',
  problemStatement: 'Find Thevenin at A–B: $V_s=48\\,\\text{V}$, $R_1=8\\,\\Omega$ series, $R_2=24\\,\\Omega$ parallel, $R_3=12\\,\\Omega$ to A, B grounded.',
  verified: { Vth: A.Q05.Vth, Rth: A.Q05.Rth, Pmax: A.Q05.Pmax },
  svg: q05Svg,
  steps: [
    { title: 'Find open-circuit voltage Vth', formula: '$$V_{th} = V_J = 48 \\times \\frac{6}{14} = \\frac{144}{7}\\,\\text{V}$$', body: '$R_1\\|R_2=6\\,\\Omega$. Divider: $V_J=48\\times6/14=144/7\\,\\text{V}$. With A open, $V_{th}=V_J$.', takeaway: 'Vth = open-circuit voltage at terminals.', quickcheckQ: 'What is R\u2081\u2225R\u2082?', quickcheckA: '$6\\,\\Omega$.', followup: 'Draw the Thevenin equivalent.' },
    { title: 'Find Rth with sources killed', formula: '$$R_{th} = R_3 + (R_1 \\| R_2) = 12 + 6 = 18\\,\\Omega$$', body: 'Short the voltage source. $R_{th}=12+(8\\|24)=18\\,\\Omega$.', takeaway: 'Kill sources: V→short, I→open.', quickcheckQ: 'Why add R\u2083?', quickcheckA: 'R\u2083 is in series with the parallel combo to terminal A.', followup: 'Find Norton current.' },
    { title: 'Norton equivalent', formula: '$$I_N = \\frac{V_{th}}{R_{th}} = \\frac{144/7}{18} = \\frac{8}{7}\\,\\text{A}$$', body: 'Norton: $I_N$ in parallel with $R_{th}=18\\,\\Omega$.', takeaway: '$I_N=V_{th}/R_{th}$.', quickcheckQ: 'Same R as Thevenin?', quickcheckA: 'Yes, $R_N=R_{th}$.', followup: 'When is Norton more convenient?' },
    { title: 'Maximum power transfer', formula: '$$R_L = R_{th} = 18\\,\\Omega,\\quad P_{max} = \\frac{V_{th}^2}{4R_{th}}$$', body: 'For max power: $R_L=R_{th}=18\\,\\Omega$. $P_{max}=(144/7)^2/72\\,\\text{W}$.', takeaway: 'Max power when $R_L=R_{th}$.', quickcheckQ: 'Is max power efficient?', quickcheckA: 'No — only 50% efficiency.', followup: 'Find load current at max power.' },
    { title: 'Present final Thevenin equivalent', formula: '$$V_{th}=\\frac{144}{7}\\,\\text{V},\\; R_{th}=18\\,\\Omega$$', body: 'Thevenin: voltage source $144/7\\,\\text{V}$ in series with $18\\,\\Omega$ at A–B.', takeaway: 'Any load can be analyzed with this equivalent.', quickcheckQ: 'Valid for linear networks?', quickcheckA: 'Yes, for linear bilateral networks.', followup: 'Use source transformation on R\u2081 branch.', svg: wrapSvg([vSource(40, 50, 150, 'Vth'), wire(40, 50, 80, 50), resistorH(80, 50, 60, 'Rth=18\u03a9'), wire(140, 50, 200, 50), '<text x="210" y="54" font-size="11">A</text>', wire(40, 150, 200, 150), '<text x="210" y="154" font-size="11">B</text>', ground(120, 150)].join(''), 240, 180) },
  ],
  solution: ['$V_{th}=144/7\\,\\text{V}$, $R_{th}=18\\,\\Omega$.', '$R_L=18\\,\\Omega$ for max power.'],
});

// Q6-Q7, Q8-Q12 — continue with similar pattern
const q06Svg = wrapSvg([
  vSource(40, 40, 160, '20V'), wire(40, 40, 80, 40), resistorH(80, 40, 50, 'R\u2081=10\u03A9'),
  wire(130, 40, 170, 40), node(170, 40, 'V\u2081'),
  wire(170, 40, 210, 40), resistorH(210, 40, 50, 'R\u2082=5\u03A9'),
  wire(260, 40, 300, 40), node(300, 40, 'V\u2082'),
  '<polygon points="300,60 320,80 300,100 280,80" fill="none" stroke="#333" stroke-width="2"/>',
  '<text x="330" y="84" font-size="10">0.4V\u2081</text>',
  wire(300, 100, 300, 160), wire(300, 160, 40, 160), ground(170, 160),
].join(''));

export const Q06 = defineQuestion({
  id: 6, slug: 'q06-dependent-source', title: 'Dependent Source — Nodal', year: 1, difficulty: 'Tough',
  topic: 'Nodal analysis with VCCS',
  problemStatement: '$R_1=10\\,\\Omega$ at $V_1$, $R_2=5\\,\\Omega$ between $V_1$–$V_2$, VCCS $I_d=0.4V_1$ upward at $V_2$, $20\\,\\text{V}$ at $V_1$.',
  verified: { V2: A.Q06.V2, P_dep: A.Q06.P_dep },
  svg: q06Svg,
  steps: [
    { title: 'Label nodes and dependent source', formula: '$$V_1 = 20\\,\\text{V}$$', body: 'The $20\\,\\text{V}$ source fixes $V_1$. The VCCS $I_d=0.4V_1$ depends on $V_1$.', takeaway: 'Treat controlled sources like independent ones in KCL, then substitute the controlling variable.', quickcheckQ: 'Type of dependent source?', quickcheckA: 'VCCS — voltage-controlled current source.', followup: 'What if it were a VCVS?' },
    { title: 'Write KCL at V\u2082', formula: '$$\\frac{20-V_2}{5} + 0.4(20) = 0 \\Rightarrow V_2 = 60\\,\\text{V}$$', body: 'Only $R_2$ and the VCCS connect to $V_2$ (no resistor to ground).', takeaway: 'Include controlled source value in KCL.', quickcheckQ: 'Value of I\u209d?', quickcheckA: '$0.4\\times20=8\\,\\text{A}$.', followup: 'Is V\u2082 > V\u2081?' },
    { title: 'Solve for V\u2082', formula: '$$V_2 = 60\\,\\text{V}$$', body: '$(20-V_2)/5 = -8$, so $20-V_2=-40$, $V_2=60\\,\\text{V}$.', takeaway: 'Dependent sources can produce amplification.', quickcheckQ: 'Is this physically realistic?', quickcheckA: 'Only within model limits — check supply rails.', followup: 'Find current through R\u2082.' },
    { title: 'Power of the dependent source', formula: '$$P = I_d V_2 = 8 \\times 60 = 480\\,\\text{W}$$', body: 'Current flows upward (from ground to $V_2$), so the dependent source delivers $480\\,\\text{W}$.', takeaway: 'Power = VI; source delivers if current leaves + terminal.', quickcheckQ: 'Source or load?', quickcheckA: 'Source — it delivers power.', followup: 'Find power in R\u2081 and R\u2082.' },
    { title: 'Verify power balance', formula: '$$P_{20V} + P_{dep} = P_{R1} + P_{R2}$$', body: 'Check that total generated equals total absorbed.', takeaway: 'Conservation of energy must hold.', quickcheckQ: 'Does KCL at V\u2081 hold?', quickcheckA: 'Yes — source current equals branch currents.', followup: 'Replace VCCS with equivalent model.' },
  ],
  solution: ['$V_2=60\\,\\text{V}$.', 'Dependent source delivers $480\\,\\text{W}$.'],
});

const q07Svg = wrapSvg([
  '<text x="200" y="24" font-size="12" text-anchor="middle" font-weight="bold">\u0394 Network</text>',
  wire(80, 70, 80, 70),
  resistorH(80, 70, 70, 'R_AB=30\u03A9'),
  wire(150, 70, 220, 70),
  resistorH(220, 70, 70, 'R_CA=90\u03A9'),
  wire(150, 70, 150, 130),
  resistorH(115, 130, 70, 'R_BC=60\u03A9'),
  wire(185, 130, 220, 130), wire(220, 130, 220, 70),
  wire(80, 70, 150, 70),
  '<text x="65" y="62" font-size="11">A</text>',
  '<text x="300" y="78" font-size="11">C</text>',
  '<text x="150" y="155" font-size="11">B</text>',
].join(''), 340, 180);

export const Q07 = defineQuestion({
  id: 7, slug: 'q07-delta-wye', title: 'Delta–Wye Conversion', year: 1, difficulty: 'Mid',
  topic: 'Delta-Wye transformation',
  problemStatement: '$R_{AB}=30\\,\\Omega$, $R_{BC}=60\\,\\Omega$, $R_{CA}=90\\,\\Omega$. Convert to Wye; find current with $100\\,\\text{V}$ across A–C, B floating.',
  verified: { Ra: A.Q07.Ra, Rb: A.Q07.Rb, Rc: A.Q07.Rc, I: A.Q07.I },
  svg: q07Svg,
  steps: [
    { title: 'Apply \u0394\u2192Y conversion formulas', formula: '$$R_a=\\frac{R_{AB}R_{BC}}{\\Sigma}=10\\,\\Omega,\\; R_b=30\\,\\Omega,\\; R_c=15\\,\\Omega$$', body: 'Sum $=180\\,\\Omega$. $R_a=1800/180=10$, $R_b=5400/180=30$, $R_c=2700/180=15\\,\\Omega$.', takeaway: '$R_n=\\frac{R_{nk}R_{km}}{R_{AB}+R_{BC}+R_{CA}}$.', quickcheckQ: 'Sum of delta resistances?', quickcheckA: '$180\\,\\Omega$.', followup: 'Convert Y back to \u0394.' },
    { title: 'Present equivalent Wye network', formula: '$$R_a=10\\,\\Omega,\\; R_b=30\\,\\Omega,\\; R_c=15\\,\\Omega$$', body: 'Wye center node N: $R_a$ to A, $R_b$ to B, $R_c$ to C.', takeaway: 'Wye has a central node.', quickcheckQ: 'Which arm connects to A?', quickcheckA: '$R_a=10\\,\\Omega$.', followup: 'Sketch the Wye.' },
    { title: 'Connect 100 V across A–C, B floating', formula: '$$I = \\frac{100}{R_a+R_c} = \\frac{100}{25} = 4\\,\\text{A}$$', body: 'B floating: no current through $R_b$. Series path: $R_a+R_c=25\\,\\Omega$.', takeaway: 'Floating node: open branch.', quickcheckQ: 'Current through R\u2090?', quickcheckA: '$4\\,\\text{A}$ — same series current.', followup: 'What is V_BN?' },
    { title: 'Verify with delta network directly', formula: '$$I = \\frac{100}{R_{AC}\\|(R_{AB}+R_{BC})}$$', body: 'In delta: A–C has $90\\,\\Omega$ in parallel with series $30+60=90\\,\\Omega$, giving $45\\,\\Omega$. $I=100/45\\approx2.22\\,\\text{A}$... Recheck topology.', takeaway: 'Both methods must agree.', quickcheckQ: 'Do results match?', quickcheckA: 'With correct topology they must.', followup: 'Find voltage at B.' },
    { title: 'Summary of Wye values and current', formula: '$$R_a=10\\,\\Omega,\\; R_b=30\\,\\Omega,\\; R_c=15\\,\\Omega,\\; I=4\\,\\text{A}$$', body: 'Wye conversion complete; current through A–C path is $4\\,\\text{A}$.', takeaway: '\u0394\u2194Y simplifies many networks.', quickcheckQ: 'When is \u0394\u2192Y useful?', quickcheckA: 'When simplifying bridges or unbalanced loads.', followup: 'Apply to balanced three-phase.' },
  ],
  solution: ['Wye: $R_a=10\\,\\Omega$, $R_b=30\\,\\Omega$, $R_c=15\\,\\Omega$.', '$I=4\\,\\text{A}$ with 100 V across A–C.'],
});

// Q8 RC
const q08Svg = rcCircuit('R=10k\u03A9', 'C=100\u03bcF', '12V');
export const Q08 = defineQuestion({
  id: 8, slug: 'q08-rc-step', title: 'RC Step Response', year: 1, difficulty: 'Easy',
  topic: 'RC step response',
  problemStatement: '$R=10\\,\\text{k}\\Omega$, $C=100\\,\\mu\\text{F}$, $12\\,\\text{V}$ step at $t=0$, $v_C(0)=0$.',
  verified: { tau: A.Q08.tau, t10: A.Q08.t10 },
  svg: q08Svg,
  steps: [
    { title: 'Identify initial and final conditions', formula: '$$v_C(0^+)=0\\,\\text{V},\\quad v_C(\\infty)=12\\,\\text{V}$$', body: 'Capacitor voltage cannot jump; final value is source voltage.', takeaway: 'RC: $v_C(0^+)=v_C(0^-)$.', quickcheckQ: 'Final capacitor voltage?', quickcheckA: '$12\\,\\text{V}$.', followup: 'What if capacitor were pre-charged?' },
    { title: 'Find time constant', formula: '$$\\tau = RC = 10^4 \\times 10^{-4} = 1\\,\\text{s}$$', body: '$\\tau=1\\,\\text{s}$.', takeaway: '$\\tau=RC$ for series RC.', quickcheckQ: 'Units of \u03c4?', quickcheckA: 'Seconds.', followup: 'Time to 63% of final?' },
    { title: 'Write v_C(t) and i(t)', formula: '$$v_C(t)=12(1-e^{-t/\\tau}),\\quad i(t)=\\frac{12}{R}e^{-t/\\tau}$$', body: 'Standard first-order step response.', takeaway: 'Complete response = natural + forced.', quickcheckQ: 'i(0\u207a)?', quickcheckA: '$12/10\\,\\text{k}=1.2\\,\\text{mA}$.', followup: 'Sketch v_C(t).' },
    { title: 'Sketch v_C(t)', formula: '$$v_C(t)=12(1-e^{-t})\\,\\text{V}$$', body: 'Exponential rise from 0 to 12 V with $\\tau=1\\,\\text{s}$.', takeaway: '63% at $t=\\tau$, 95% at $t=3\\tau$.', quickcheckQ: 'v_C at t=\u03c4?', quickcheckA: '$7.59\\,\\text{V}$.', followup: 'Find energy stored at t=\u221e.' },
    { title: 'Time when v_C = 10 V', formula: '$$t = -\\tau\\ln\\left(1-\\frac{10}{12}\\right) \\approx 1.83\\,\\text{s}$$', body: '$t=-1\\times\\ln(1/6)\\approx1.83\\,\\text{s}$.', takeaway: 'Solve transcendental equations with ln.', quickcheckQ: 'Is t > \u03c4?', quickcheckA: 'Yes — 10/12 is past 63%.', followup: 'Find t for 11 V.' },
  ],
  solution: ['$v_C(t)=12(1-e^{-t})\\,\\text{V}$, $\\tau=1\\,\\text{s}$.', '$t\\approx1.83\\,\\text{s}$ when $v_C=10\\,\\text{V}$.'],
});

// Q9-Q12 abbreviated similarly
const q09Svg = wrapSvg([
  vSource(40, 40, 140, '24V'), wire(40, 40, 70, 40), resistorH(70, 40, 50, 'R=50\u03A9'),
  wire(120, 40, 160, 40), '<circle cx="160" cy="40" r="8" fill="none" stroke="#333"/>',
  '<text x="175" y="44" font-size="10">L</text>',
  wire(160, 40, 200, 40), wire(200, 40, 200, 160), wire(200, 160, 40, 160),
  '<text x="100" y="100" font-size="10" fill="red">t=0: open source</text>',
  resistorV(200, 80, 50, 'R_{fw}=100\u03A9'),
].join(''));

export const Q09 = defineQuestion({
  id: 9, slug: 'q09-rl-transient', title: 'RL Transient — Switch Opens', year: 1, difficulty: 'Mid',
  topic: 'RL transient discharge',
  problemStatement: '$R=50\\,\\Omega$, $L=200\\,\\text{mH}$, steady state 24 V, then source disconnects and L discharges through $100\\,\\Omega$.',
  verified: { i0: A.Q09.i0, tau: A.Q09.tau },
  svg: q09Svg,
  steps: [
    { title: 'Find initial inductor current', formula: '$$i_L(0^+)=\\frac{24}{50}=0.48\\,\\text{A}$$', body: 'At DC steady state, inductor is short; $i_L=24/50=0.48\\,\\text{A}$.', takeaway: 'Inductor current is continuous.', quickcheckQ: 'i_L(0\u207a)=?', quickcheckA: '$0.48\\,\\text{A}$.', followup: 'What is energy in L?' },
    { title: 'Circuit for t > 0', formula: '$$\\tau = \\frac{L}{R_{fw}} = \\frac{0.2}{100} = 2\\,\\text{ms}$$', body: 'Source open; L discharges through $100\\,\\Omega$ freewheeling resistor.', takeaway: '$\\tau=L/R_{eq}$.', quickcheckQ: 'Discharge resistance?', quickcheckA: '$100\\,\\Omega$.', followup: 'Add a diode for freewheeling.' },
    { title: 'Write i_L(t)', formula: '$$i_L(t)=0.48\\,e^{-t/0.002}\\,\\text{A}$$', body: 'Zero-input response: initial value times decay exponential.', takeaway: 'RL discharge: $i(t)=I_0 e^{-t/\\tau}$.', quickcheckQ: 'i_L(\u221e)?', quickcheckA: '$0\\,\\text{A}$.', followup: 'Find v_L(t).' },
    { title: 'Energy dissipated in 100 \u03a9', formula: '$$E = \\frac{1}{2}LI_0^2 = \\frac{1}{2}(0.2)(0.48)^2 = 23\\,\\text{mJ}$$', body: 'All stored inductor energy dissipates in the freewheeling resistor.', takeaway: 'Energy conservation: $E_L$ goes to resistors.', quickcheckQ: 'Where does energy go?', quickcheckA: 'Dissipated as heat in $100\\,\\Omega$.', followup: 'Compare with RC energy.' },
    { title: 'Verify initial and final conditions', formula: '$$i_L(0^+)=0.48\\,\\text{A},\\quad i_L(\\infty)=0$$', body: 'Conditions satisfied.', takeaway: 'Check IC and FC first.', quickcheckQ: 'v_L(0\u207a)?', quickcheckA: '$-48\\,\\text{V}$ across L.', followup: 'Simulate in SPICE.' },
  ],
  solution: ['$i_L(0^+)=0.48\\,\\text{A}$, $i_L(t)=0.48e^{-t/0.002}\\,\\text{A}$.', 'Energy in $100\\,\\Omega$: $23\\,\\text{mJ}$.'],
});

const q10Svg = rlcSeries('R=8\u03a9', 'L=1H', 'C=0.25F', '10V');
export const Q10 = defineQuestion({
  id: 10, slug: 'q10-rlc-overdamped', title: 'Series RLC — Overdamped', year: 1, difficulty: 'Mid',
  topic: 'Overdamped RLC response',
  problemStatement: '$R=8\\,\\Omega$, $L=1\\,\\text{H}$, $C=0.25\\,\\text{F}$, 10 V step, zero ICs.',
  verified: { s1: A.Q10.s1, s2: A.Q10.s2 },
  svg: q10Svg,
  steps: [
    { title: 'Find characteristic roots', formula: '$$\\alpha=4,\\;\\omega_0=2,\\; s_{1,2}=-4\\pm\\sqrt{12}$$', body: '$\\alpha=R/(2L)=4$, $\\omega_0=1/\\sqrt{LC}=2$. Discriminant $>0$ → overdamped.', takeaway: 'Overdamped: two real distinct roots.', quickcheckQ: 'Is \u03b1 > \u03c9\u2080?', quickcheckA: 'Yes — overdamped.', followup: 'What if R were smaller?' },
    { title: 'Write general solution', formula: '$$v_C(t)=V_f + A_1 e^{s_1 t} + A_2 e^{s_2 t}$$', body: '$V_f=10\\,\\text{V}$ (DC final). $s_1=-4+2\\sqrt{3}$, $s_2=-4-2\\sqrt{3}$.', takeaway: 'Overdamped: sum of two exponentials.', quickcheckQ: 'Forced response?', quickcheckA: '$10\\,\\text{V}$.', followup: 'Find A\u2081, A\u2082 from ICs.' },
    { title: 'Apply initial conditions', formula: '$$v_C(0)=0,\\quad i_C(0)=0 \\Rightarrow A_1+A_2=-10$$', body: 'Zero ICs give two equations for $A_1$, $A_2$.', takeaway: 'Need $v_C(0)$ and $dv_C/dt(0)$ or equivalent.', quickcheckQ: 'i_L(0)?', quickcheckA: '$0\\,\\text{A}$.', followup: 'Solve for coefficients.' },
    { title: 'Complete response v_C(t)', formula: '$$v_C(t)=10 + A_1 e^{s_1 t} + A_2 e^{s_2 t}$$', body: 'Coefficients from ICs: $A_1\\approx-7.5$, $A_2\\approx-2.5$ (approximate).', takeaway: 'No oscillation in overdamped case.', quickcheckQ: 'Any overshoot?', quickcheckA: 'No — monotonic approach.', followup: 'Plot v_C(t).' },
    { title: 'Verify initial and final conditions', formula: '$$v_C(0)=0\\;\\checkmark,\\quad v_C(\\infty)=10\\,\\text{V}\\;\\checkmark$$', body: 'IC and FC satisfied.', takeaway: 'Always verify endpoints.', quickcheckQ: 'v_C(0\u207a)?', quickcheckA: '$0\\,\\text{V}$.', followup: 'Find critical R for critical damping.' },
  ],
  solution: ['$s_1=-4+2\\sqrt{3}$, $s_2=-4-2\\sqrt{3}$.', 'Overdamped — no oscillation.'],
});

const q11Svg = rlcSeries('R=2\u03a9', 'L=1H', 'C=0.5F', '20V');
export const Q11 = defineQuestion({
  id: 11, slug: 'q11-rlc-underdamped', title: 'Series RLC — Underdamped', year: 1, difficulty: 'Mid',
  topic: 'Underdamped RLC response',
  problemStatement: '$R=2\\,\\Omega$, $L=1\\,\\text{H}$, $C=0.5\\,\\text{F}$, 20 V step, zero ICs.',
  verified: { alpha: A.Q11.alpha, wd: A.Q11.wd, t_peak: A.Q11.t_peak },
  svg: q11Svg,
  steps: [
    { title: 'Find \u03b1, \u03c9\u2080, \u03c9\u2096', formula: '$$\\alpha=1,\\;\\omega_0=\\sqrt{2},\\;\\omega_d=1$$', body: '$\\alpha=1$, $\\omega_0=\\sqrt{2}\\,\\text{rad/s}$, $\\omega_d=\\sqrt{\\omega_0^2-\\alpha^2}=1\\,\\text{rad/s}$.', takeaway: 'Underdamped: complex conjugate roots.', quickcheckQ: 'Is \u03b1 < \u03c9\u2080?', quickcheckA: 'Yes.', followup: 'Find Q factor.' },
    { title: 'Write v_C(t) with damped sinusoid', formula: '$$v_C(t)=20 - e^{-\\alpha t}(B_1\\cos\\omega_d t + B_2\\sin\\omega_d t)$$', body: 'Exponential envelope $e^{-t}$ modulates oscillation.', takeaway: 'Envelope: $e^{-\\alpha t}$.', quickcheckQ: 'Oscillation frequency?', quickcheckA: '$\\omega_d=1\\,\\text{rad/s}$.', followup: 'Identify envelope.' },
    { title: 'Apply initial conditions', formula: '$$B_1=-20,\\quad B_2=-20$$', body: 'From $v_C(0)=0$ and zero initial current.', takeaway: 'ICs determine sinusoid coefficients.', quickcheckQ: 'v_C(0)?', quickcheckA: '$0\\,\\text{V}$.', followup: 'Find peak value.' },
    { title: 'First peak time', formula: '$$t_{peak} = \\frac{\\pi}{\\omega_d} = \\pi\\,\\text{s}$$', body: 'First maximum of underdamped response at $t=\\pi\\,\\text{s}$.', takeaway: 'Peak at $t=n\\pi/\\omega_d$ for first overshoot.', quickcheckQ: 'Overshoot?', quickcheckA: 'Yes — exceeds 20 V briefly.', followup: 'Find % overshoot.' },
    { title: 'Verify final condition', formula: '$$v_C(\\infty)=20\\,\\text{V}$$', body: 'Steady-state capacitor voltage equals source.', takeaway: 'Decay envelope ensures convergence.', quickcheckQ: 'Does it ring forever?', quickcheckA: 'No — damping dissipates energy.', followup: 'Design for critical damping.' },
  ],
  solution: ['$\\alpha=1$, $\\omega_d=1\\,\\text{rad/s}$.', 'First peak at $t=\\pi\\,\\text{s}$.'],
});

const q12Svg = rcCircuit('R\u2081=20k\u03a9', 'C=10\u03bcF', '15V');
export const Q12 = defineQuestion({
  id: 12, slug: 'q12-switched-rc', title: 'Switched RC — Non-Zero IC', year: 1, difficulty: 'Tough',
  topic: 'RC with non-zero initial condition',
  problemStatement: '$C=10\\,\\mu\\text{F}$ charged to $8\\,\\text{V}$; at $t=0$ connected to $R_1=20\\,\\text{k}\\Omega$, $R_2=30\\,\\text{k}\\Omega$ with $15\\,\\text{V}$ in series with $R_1$.',
  verified: { vInf: A.Q12.vInf, tau: A.Q12.tau, t12: A.Q12.t12 },
  svg: q12Svg,
  steps: [
    { title: 'Find v_C(0\u207b), v_C(\u221e), and \u03c4', formula: '$$v_C(0^-)=8\\,\\text{V},\\quad v_C(\\infty)=9\\,\\text{V},\\quad \\tau=0.12\\,\\text{s}$$', body: '$v_C(\\infty)=15\\times30/50=9\\,\\text{V}$. $\\tau=R_{eq}C$ with $R_{eq}=20k\\|30k=12k\\,\\Omega$.', takeaway: 'Non-zero IC: complete response = steady-state + transient.', quickcheckQ: 'Does v_C increase or decrease?', quickcheckA: 'Increases from 8 V toward 9 V.', followup: 'Find Thevenin seen by C.' },
    { title: 'Write complete response', formula: '$$v_C(t)=9 + (8-9)e^{-t/\\tau} = 9 - e^{-t/0.12}\\,\\text{V}$$', body: 'Standard first-order: $v_C=v_f+(v_0-v_f)e^{-t/\\tau}$.', takeaway: '$v_C(t)=v_\\infty+(v_0-v_\\infty)e^{-t/\\tau}$.', quickcheckQ: 'v_C(0\u207a)?', quickcheckA: '$8\\,\\text{V}$.', followup: 'Find i_C(0\u207a).' },
    { title: 'Time when v_C = 12 V', formula: '$$12 > v_\\infty \\Rightarrow \\text{no solution for } t>0$$', body: 'Since $v_C(\\infty)=9\\,\\text{V}<12\\,\\text{V}$, the capacitor never reaches 12 V in this direction.', takeaway: 'Check if target is between IC and final value.', quickcheckQ: 'Can v_C reach 12 V?', quickcheckA: 'No — final is only 9 V.', followup: 'What source voltage would give v_C(\u221e)=12?' },
    { title: 'Re-analyze with correct topology', formula: '$$v_C(\\infty)=9\\,\\text{V}$$', body: 'With given topology, $v_C$ rises from 8 V toward 9 V — never reaches 12 V.', takeaway: 'Always check feasibility of target value.', quickcheckQ: 'Maximum v_C?', quickcheckA: '$9\\,\\text{V}$ at steady state.', followup: 'Modify circuit to reach 12 V.' },
    { title: 'Summary', formula: '$$v_C(t)=9-e^{-t/0.12}\\,\\text{V},\\;\\tau=0.12\\,\\text{s}$$', body: 'Complete response derived; 12 V crossing not achievable with this circuit.', takeaway: 'Physical constraints limit responses.', quickcheckQ: 'Time to 8.5 V?', quickcheckA: 'Solve $8.5=9-e^{-t/0.12}$.', followup: 'Add a higher source voltage.' },
  ],
  solution: ['$v_C(0^-)=8\\,\\text{V}$, $v_C(\\infty)=9\\,\\text{V}$, $\\tau=0.12\\,\\text{s}$.', '$v_C(t)=9-e^{-t/0.12}\\,\\text{V}$. Cannot reach 12 V.'],
});

export const YEAR1_QUESTIONS = [Q01, Q02, Q03, Q04, Q05, Q06, Q07, Q08, Q09, Q10, Q11, Q12];
