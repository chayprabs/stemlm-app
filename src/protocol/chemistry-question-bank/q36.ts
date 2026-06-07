import { chemGraph } from '../chem-svg';
import type { ChemistryQuestionDef } from './types';

export const Q36: ChemistryQuestionDef = {
  id: 'q36',
  number: 36,
  topic: 'Medicinal Chemistry: Aspirin, Penicillin, and Lipinski Analysis',
  question:
    'Medicinal organic chemistry quantitative analysis: (a) Evaluate aspirin synthesis as a chemical reaction and COX inhibition data. (b) Analyze penicillin acylation mechanism, catalyst-like enzyme behavior, and resistance effects. (c) Use Lipinski criteria in a radar-style scoring framework for lead assessment.',
  steps: [
    {
      title: 'Aspirin synthesis stoichiometry and isolated yield',
      formula:
        '$$Y=\\frac{n_{aspirin}}{n_{SA}}\\times100=\\frac{8.1\\,mmol}{10.0\\,mmol}\\times100=81.0\\%$$',
      body: 'From $10.0\\ \\text{mmol}$ salicylic acid and excess acetic anhydride, isolated aspirin at $8.1\\ \\text{mmol}$ gives $81.0\\%$ yield. If aspirin molar mass is $180.16\\ \\text{g mol}^{-1}$, product mass is $8.1\\times10^{-3}\\times180.16=1.46\\ \\text{g}$.',
      diagram: chemGraph({
        xLabel: 'species',
        yLabel: 'mmol',
        points: [
          { x: 120, y: 72, label: 'SA 10.0', fill: '#1d4ed8' },
          { x: 220, y: 86, label: 'aspirin 8.1', fill: '#16a34a' },
        ],
        annotations:
          '<text x="55" y="30" font-size="9">acetylation of salicylic acid</text>',
      }),
    },
    {
      title: 'Aspirin inhibition estimate for COX active-site acetylation',
      formula:
        '$$\\%I=\\frac{[I]}{[I]+IC_{50}}\\times100=\\frac{5.0}{5.0+1.2}\\times100=80.6\\%$$',
      body: 'At aspirin concentration $[I]=5.0\\ \\mu\\text{M}$ and $IC_{50}=1.2\\ \\mu\\text{M}$ for COX-1, predicted inhibition is $80.6\\%$. Raising dose to $10\\ \\mu\\text{M}$ gives $10/(10+1.2)\\times100=89.3\\%$, showing diminishing-return occupancy behavior.',
      diagram: chemGraph({
        xLabel: '[aspirin] (uM)',
        yLabel: 'COX inhibition %',
        curves: [
          { d: 'M 50 130 C 90 95 130 75 180 62 C 220 52 245 48 260 46', stroke: '#dc2626', label: 'COX response', labelPos: [188, 58] },
        ],
        points: [
          { x: 140, y: 70, label: '5 -> 80.6%', fill: '#1d4ed8' },
          { x: 200, y: 58, label: '10 -> 89.3%', fill: '#16a34a' },
        ],
      }),
    },
    {
      title: 'Aspirin hydrolysis stability in plasma',
      formula:
        '$$t_{1/2}=\\frac{0.693}{k}=\\frac{0.693}{2.4\\times10^{-4}}=2.89\\times10^3\\,s=48.2\\,min$$',
      body: 'With first-order hydrolysis constant $k=2.4\\times10^{-4}\\ \\text{s}^{-1}$, aspirin half-life is $48.2\\ \\text{min}$. After $2$ hours, fraction remaining is $e^{-kt}=e^{-2.4\\times10^{-4}\\times7200}=0.178$, so only $17.8\\%$ parent drug remains.',
      diagram: chemGraph({
        xLabel: 'time (min)',
        yLabel: 'fraction aspirin',
        curves: [
          { d: 'M 50 55 C 110 78 170 103 250 130', stroke: '#1d4ed8', label: 'hydrolysis decay', labelPos: [175, 96] },
        ],
        annotations: '<text x="55" y="34" font-size="9">first-order deacetylation to salicylate</text>',
      }),
    },
    {
      title: 'Penicillin acyl-enzyme formation and catalytic suppression',
      formula:
        '$$\\text{inactivation factor}=\\frac{(k_{cat}/K_M)_{native}}{(k_{cat}/K_M)_{acylated}}=\\frac{1.8\\times10^6}{7.5\\times10^2}=2.4\\times10^3$$',
      body: 'If transpeptidase native efficiency is $1.8\\times10^6\\ \\text{M}^{-1}\\text{s}^{-1}$ and penicillin-acylated residual is $7.5\\times10^2\\ \\text{M}^{-1}\\text{s}^{-1}$, catalytic function drops by factor $2.4\\times10^3$. This quantifies beta-lactam mechanism-based inhibition.',
      diagram: chemGraph({
        xLabel: 'enzyme state',
        yLabel: 'kcat/KM',
        points: [
          { x: 120, y: 50, label: 'native 1.8e6', fill: '#16a34a' },
          { x: 220, y: 130, label: 'acylated 7.5e2', fill: '#dc2626' },
        ],
        annotations:
          '<text x="55" y="30" font-size="9">penicillin beta-lactam acyl-enzyme</text>',
      }),
    },
    {
      title: 'Beta-lactamase resistance pressure and inhibitor rescue',
      formula:
        '$$\\text{rescue}=\\frac{MIC_{drug\\ alone}}{MIC_{drug+inhibitor}}=\\frac{64}{4}=16$$',
      body: 'If penicillin MIC against resistant strain is $64\\ \\mu\\text{g mL}^{-1}$ alone and $4\\ \\mu\\text{g mL}^{-1}$ with beta-lactamase inhibitor, then $\\text{rescue}=64/4=16$. This indicates inhibitor-mediated restoration of practical antibacterial potency.',
      diagram: chemGraph({
        xLabel: 'treatment',
        yLabel: 'MIC',
        points: [
          { x: 120, y: 62, label: 'drug alone 64', fill: '#dc2626' },
          { x: 220, y: 110, label: 'with inhibitor 4', fill: '#16a34a' },
        ],
        annotations:
          '<text x="55" y="32" font-size="9">beta-lactamase suppression lowers required dose</text>',
      }),
    },
    {
      title: 'Lipinski radar-style penalty score for oral-likeness',
      formula:
        '$$P=\\sum w_i\\,|x_i-x_{ref}|=|3.1-3|+|430-500|/100+|7-5|+|95-140|/50=3.7$$',
      body: 'For a candidate with logP $3.1$, MW $430$, HBD $2$, HBA $7$, and TPSA $95$, compared with references (3, 500, 2, 5, 140), weighted deviation score is $P=0.1+0.7+2+0.9=3.7$. Lower $P$ indicates better oral-likeness in this simplified Lipinski radar metric.',
      diagram: chemGraph({
        xLabel: 'property axis',
        yLabel: 'normalized deviation',
        points: [
          { x: 90, y: 110, label: 'logP 0.1', fill: '#1d4ed8' },
          { x: 135, y: 95, label: 'MW 0.7', fill: '#16a34a' },
          { x: 180, y: 75, label: 'HBA 2.0', fill: '#dc2626' },
          { x: 225, y: 90, label: 'TPSA 0.9', fill: '#7c3aed' },
        ],
        annotations:
          '<text x="55" y="32" font-size="9">Lipinski radar proxy score</text>',
      }),
      takeaway:
        'Medicinal chemistry decisions improve when synthesis, target inhibition, resistance liabilities, and oral-likeness metrics are quantified together.',
    },
  ],
  solution:
    'Aspirin analysis combines synthetic yield, COX inhibition estimates, and hydrolytic stability. Penicillin efficacy is captured by acyl-enzyme catalytic suppression and beta-lactamase rescue factors. Lipinski-style radar scoring then provides a compact multiparameter view for selecting balanced medicinal chemistry candidates with improved oral-likeness.',
  verifiedPatterns: [
    'aspirin',
    'COX',
    'penicillin',
    'beta-lactam',
    'beta-lactamase',
    'Lipinski',
    'MIC',
    'oral-likeness',
  ],
  minDiagramSteps: 5,
};
