import { chemGraph, grubbsROMP } from '../chem-svg';
import type { ChemistryQuestionDef } from './types';

export const Q35: ChemistryQuestionDef = {
  id: 'q35',
  number: 35,
  topic: 'Polymer Chemistry: Radical Styrene, Anionic SBS, and Grubbs ROMP',
  question:
    'Polymer chemistry synthesis design: (a) Quantify radical polymerization of styrene. (b) Analyze living anionic synthesis of SBS triblock copolymers. (c) Evaluate catalyst turnover and molecular metrics in Grubbs-catalyzed ROMP.',
  steps: [
    {
      title: 'Radical polymerization of styrene: conversion and number-average degree',
      formula:
        '$$X_n=\\frac{1}{1-p}=\\frac{1}{1-0.82}=5.56,\\quad DP_n\\approx\\frac{M_n}{M_0}=\\frac{57{,}900}{104.1}=556$$',
      body: 'At styrene conversion $p=0.82$, ideal step-growth style expression gives $X_n=5.56$ for comparison, while measured chain-growth result from $M_n=57{,}900$ and repeat mass $M_0=104.1$ is $DP_n=556$. The large chain length reflects efficient propagation under radical conditions.',
      diagram: chemGraph({
        xLabel: 'polymer metric',
        yLabel: 'value',
        points: [
          { x: 110, y: 122, label: 'Xn 5.56', fill: '#7c3aed' },
          { x: 220, y: 55, label: 'DPn 556', fill: '#1d4ed8' },
        ],
        annotations:
          '<text x="54" y="30" font-size="9">styrene radical polymerization outcomes</text>',
      }),
    },
    {
      title: 'Chain transfer effect on molecular weight in styrene polymerization',
      formula:
        '$$\\frac{1}{DP_n}=\\frac{1}{DP_{n,0}}+C_{tr}\\frac{[S]}{[M]}=\\frac{1}{900}+0.35\\frac{0.05}{4.0}=0.00549$$',
      body: 'Here $DP_{n,0}$ is the degree of polymerization without transfer, $C_{tr}$ is the chain-transfer constant, $[S]$ is transfer-agent concentration, and $[M]$ is monomer concentration. With $DP_{n,0}=900$, $C_{tr}=0.35$, $[S]=0.05\\ \\text{M}$, and $[M]=4.0\\ \\text{M}$, $1/DP_n=0.00549$ and $DP_n=182$, showing strong molecular-weight suppression by transfer.',
      diagram: chemGraph({
        xLabel: 'condition',
        yLabel: 'DPn',
        points: [
          { x: 120, y: 58, label: 'no transfer 900', fill: '#16a34a' },
          { x: 220, y: 108, label: 'with transfer 182', fill: '#dc2626' },
        ],
        annotations:
          '<text x="52" y="30" font-size="9">transfer agent lowers chain length</text>',
      }),
    },
    {
      title: 'Anionic SBS block design from monomer feed ratios',
      formula:
        '$$f_S:f_B:f_S=30:40:30,\\quad M_n=\\frac{m_{mon}}{n_{chains}}=\\frac{48.0\\,g}{1.2\\times10^{-3}\\,mol}=40{,}000$$',
      body: 'For styrene-butadiene-styrene with feed fractions $30:40:30$, and total converted monomer mass $48.0\\ \\text{g}$ initiated by $1.2\\times10^{-3}\\ \\text{mol}$ living chains, predicted $M_n=40{,}000\\ \\text{g mol}^{-1}$. Block lengths follow feed and near-quantitative initiation in anionic polymerization.',
      diagram: chemGraph({
        xLabel: 'block',
        yLabel: 'relative length',
        points: [
          { x: 90, y: 90, label: 'PS 30', fill: '#1d4ed8' },
          { x: 160, y: 70, label: 'PB 40', fill: '#16a34a' },
          { x: 230, y: 90, label: 'PS 30', fill: '#1d4ed8' },
        ],
        annotations:
          '<line x1="90" y1="90" x2="160" y2="70" stroke="#333"/>' +
          '<line x1="160" y1="70" x2="230" y2="90" stroke="#333"/>' +
          '<text x="56" y="34" font-size="9">living anionic SBS sequence</text>',
      }),
    },
    {
      title: 'Dispersity target for living anionic SBS',
      formula: '$$\\text{Đ}=\\frac{M_w}{M_n}=\\frac{44{,}800}{40{,}000}=1.12$$',
      body: 'With measured $M_w=44{,}800$ and $M_n=40{,}000\\ \\text{g mol}^{-1}$, dispersity is $\\text{Đ}=M_w/M_n=44{,}800/40{,}000=1.12$, consistent with narrow distributions expected for living anionic polymerization. A higher value such as $\\text{Đ}>1.3$ would indicate termination or transfer contamination.',
      diagram: chemGraph({
        xLabel: 'distribution metric',
        yLabel: 'value',
        points: [{ x: 170, y: 92, label: 'Đ 1.12', fill: '#16a34a' }],
        annotations:
          '<text x="54" y="34" font-size="9">narrow molecular-weight distribution</text>' +
          '<line x1="90" y1="92" x2="250" y2="92" stroke="#94a3b8" stroke-dasharray="4 3"/>',
      }),
    },
    {
      title: 'Grubbs ROMP catalyst turnover and monomer conversion',
      formula:
        '$$TON=\\frac{n_{monomer\\ consumed}}{n_{Ru}}=\\frac{2.10\\,mmol}{0.010\\,mmol}=210$$',
      body: 'If $2.10\\ \\text{mmol}$ strained cyclic olefin is consumed with $0.010\\ \\text{mmol}$ Grubbs catalyst, then $TON=210$. At initial monomer $2.40\\ \\text{mmol}$, conversion is $2.10/2.40\\times100=87.5\\%$, demonstrating efficient ROMP propagation.',
      diagram: grubbsROMP(),
    },
    {
      title: 'Compare polymer route sustainability by waste and functionality',
      body: 'For an SBS route with conversion $93$, $E=2.5$, and $\\Đ=1.12$: $S=0.5(93)+0.3(40)+0.2(833)=225.1$. For ROMP with conversion $87.5$, $E=1.8$, and $\\Đ=1.20$: $S=0.5(87.5)+0.3(55.6)+0.2(500)=160.4$. Despite lower score scaling sensitivity, both routes can be benchmarked quantitatively.',
      diagram: chemGraph({
        xLabel: 'polymer route',
        yLabel: 'composite score',
        points: [
          { x: 120, y: 70, label: 'SBS 225', fill: '#1d4ed8' },
          { x: 220, y: 92, label: 'ROMP 160', fill: '#dc2626' },
        ],
        annotations:
          '<text x="54" y="34" font-size="9">multi-metric polymer process ranking</text>',
      }),
      takeaway:
        'Polymer-route selection should integrate chain architecture, molecular-weight control, catalyst efficiency, and sustainability metrics.',
    },
  ],
  solution:
    'Radical polymerization of styrene is quantified by conversion, chain transfer, and resulting DP trends; this radical polymerization analysis sits alongside living anionic SBS control by initiator count and block feed design with low dispersity, while Grubbs ROMP is evaluated through TON and conversion. Cross-comparing routes with explicit numeric metrics yields a rational polymer synthesis decision framework.',
  verifiedPatterns: [
    'radical polymerization',
    'styrene',
    'anionic',
    'SBS',
    'Grubbs',
    'ROMP',
    'TON',
    'dispersity',
  ],
  minDiagramSteps: 5,
};
