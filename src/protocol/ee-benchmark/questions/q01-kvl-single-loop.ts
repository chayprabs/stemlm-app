import { seriesLoopCircuit } from '../circuit-svg';
import type { EEQuestionDef } from '../types';

const I = 2;
const V_R1 = 8;
const V_R2 = 12;
const V_R3 = 4;

const svgFull = seriesLoopCircuit('24V', [
  { label: 'R\u2081=4\u03A9' },
  { label: 'R\u2082=6\u03A9' },
  { label: 'R\u2083=2\u03A9' },
]);

const svgSolved = seriesLoopCircuit('24V', [
  { label: 'R\u2081=4\u03A9', vDrop: '8 V' },
  { label: 'R\u2082=6\u03A9', vDrop: '12 V' },
  { label: 'R\u2083=2\u03A9', vDrop: '4 V' },
]);

export const Q01: EEQuestionDef = {
  id: 1,
  slug: 'q01-kvl-single-loop',
  title: 'KVL Single Loop',
  year: 1,
  difficulty: 'Easy',
  topic: 'KVL single-loop series circuit',
  problemStatement:
    'A series circuit has $V_s = 24$ V, $R_1 = 4\\,\\Omega$, $R_2 = 6\\,\\Omega$, $R_3 = 2\\,\\Omega$. Find the current and voltage drop across each resistor. Verify KVL.',
  verified: {
    Vs: 24,
    R1: 4,
    R2: 6,
    R3: 2,
    Rtotal: 12,
    I: 2,
    V_R1: V_R1,
    V_R2: V_R2,
    V_R3: V_R3,
    stepCount: 5,
  },
  steps: [
    {
      title: 'Label the series loop and assign current direction',
      formula: '$$\\sum V = 0 \\quad\\text{(KVL around closed loop)}$$',
      body: 'All three resistors are in series with the $24\\,\\text{V}$ source. Choose clockwise current $I$ through $R_1$, $R_2$, and $R_3$.',
      takeaway: 'In a single-loop circuit one current flows through every element.',
      quickcheckQ: 'How many independent currents exist in a single loop?',
      quickcheckA: 'Exactly one, because series elements share the same branch current $I$.',
      followup: 'What changes if one resistor is replaced by a short circuit?',
      svg: svgFull,
    },
    {
      title: 'Find total series resistance',
      formula: '$$R_{\\text{total}} = R_1 + R_2 + R_3 = 4 + 6 + 2 = 12\\,\\Omega$$',
      body: 'Series resistances add directly: $R_{\\text{total}} = 12\\,\\Omega$.',
      takeaway: 'Series: $R_{\\text{eq}} = \\sum R_i$.',
      quickcheckQ: 'What is $4 + 6 + 2$?',
      quickcheckA: '$12\\,\\Omega$, because series resistances sum.',
      followup: 'How would a fourth $3\\,\\Omega$ resistor change $R_{\\text{total}}$?',
      svg: svgFull,
    },
    {
      title: 'Apply Ohm\u2019s law for loop current',
      formula: '$$I = \\frac{V_s}{R_{\\text{total}}} = \\frac{24}{12} = 2\\,\\text{A}$$',
      body: 'The source drives $2\\,\\text{A}$ through the entire loop.',
      takeaway: 'Single-loop current: $I = V_s / R_{\\text{total}}$.',
      quickcheckQ: 'With $V_s=24\\,\\text{V}$ and $R_{\\text{total}}=12\\,\\Omega$, what is $I$?',
      quickcheckA: '$I = 24/12 = 2\\,\\text{A}$ by Ohm\u2019s law.',
      followup: 'Find power dissipated in each resistor.',
      svg: svgFull,
    },
    {
      title: 'Compute voltage drop across each resistor',
      formula:
        '$$V_{R_1} = IR_1 = 8\\,\\text{V},\\quad V_{R_2} = 12\\,\\text{V},\\quad V_{R_3} = 4\\,\\text{V}$$',
      body: 'Using $V = IR$: $V_{R_1}=2\\times4=8\\,\\text{V}$, $V_{R_2}=2\\times6=12\\,\\text{V}$, $V_{R_3}=2\\times2=4\\,\\text{V}$.',
      takeaway: 'Voltage drop: $V_i = I R_i$ for each series element.',
      quickcheckQ: 'What is $V_{R_2}$ with $I=2\\,\\text{A}$ and $R_2=6\\,\\Omega$?',
      quickcheckA: '$V_{R_2} = 2 \\times 6 = 12\\,\\text{V}$.',
      followup: 'Which resistor dissipates the most power?',
      svg: svgSolved,
    },
    {
      title: 'Verify Kirchhoff\u2019s voltage law',
      formula: '$$V_{R_1} + V_{R_2} + V_{R_3} = 8 + 12 + 4 = 24\\,\\text{V} = V_s\\;\\checkmark$$',
      body: 'The sum of drops equals the source voltage, confirming KVL.',
      takeaway: 'KVL: algebraic sum of voltages around a loop is zero.',
      quickcheckQ: 'Do the drops sum to the source?',
      quickcheckA: 'Yes: $8+12+4=24\\,\\text{V}=V_s$.',
      followup: 'Repeat using a counter-clockwise KVL sign convention.',
      svg: svgSolved,
    },
  ],
  solution: [
    'Single-loop series circuit: $I = V_s / (R_1+R_2+R_3) = 24/12 = 2\\,\\text{A}$.',
    'Voltage drops: $V_{R_1}=8\\,\\text{V}$, $V_{R_2}=12\\,\\text{V}$, $V_{R_3}=4\\,\\text{V}$.',
    'KVL check: $8+12+4=24\\,\\text{V}$.',
  ],
  solutionSvg: svgSolved,
};
