import { chemGraph } from '../chem-svg';
import type { ChemistryQuestionDef } from './types';

export const Q31: ChemistryQuestionDef = {
  id: 'q31',
  number: 31,
  topic: 'Retrosynthesis: Prostaglandin, Ibuprofen, and Hajos-Parrish Ketone',
  question:
    'Advanced organic chemistry retrosynthesis and reaction design: (a) Propose a convergent retrosynthesis for a prostaglandin molecule using strategic disconnections and reagent logic. (b) Analyze key catalyst and green-metric data in industrial ibuprofen synthesis. (c) Explain how the Hajos-Parrish ketone enables stereocontrolled cyclization in synthesis planning.',
  steps: [
    {
      title: 'Primary prostaglandin disconnection into side chain and cyclopentane core',
      formula: '$$N_{\\text{target}}=20=12+8=N_{\\text{core}}+N_{\\text{side}}$$',
      body: 'For a prostaglandin-like C20 target, a convergent split gives a C12 cyclopentane core plus a C8 omega-side chain: $N_{\\text{target}}=20$, $N_{\\text{core}}=12$, $N_{\\text{side}}=8$, and $12+8=20$. This disconnection reduces linear sequence length compared with a full C20 linear build.',
      diagram: chemGraph({
        xLabel: 'retrosynthetic direction',
        yLabel: 'fragment complexity',
        annotations:
          '<rect x="40" y="45" width="90" height="26" fill="#dbeafe" stroke="#1d4ed8"/>' +
          '<text x="46" y="61" font-size="9">PG target (C20)</text>' +
          '<line x1="130" y1="58" x2="170" y2="58" stroke="#333" stroke-width="2"/>' +
          '<rect x="172" y="32" width="95" height="24" fill="#bbf7d0" stroke="#16a34a"/>' +
          '<text x="176" y="47" font-size="8">Core synthon C12</text>' +
          '<rect x="172" y="66" width="95" height="24" fill="#fecaca" stroke="#dc2626"/>' +
          '<text x="176" y="81" font-size="8">Side chain synthon C8</text>' +
          '<text x="40" y="110" font-size="9">Convergent union: C12 + C8</text>',
      }),
    },
    {
      title: 'Corey-lactone style branch analysis for prostaglandin planning',
      formula: '$$Y_{\\text{overall}}=0.82\\times0.76\\times0.88=0.548\\approx54.8\\%$$',
      body: 'In a Corey-lactone branch plan, if the three key operations are run at $82\\%$, $76\\%$, and $88\\%$, then the branch efficiency is $Y_{\\text{overall}}=0.82\\times0.76\\times0.88=0.548$, so about $54.8\\%$ material reaches the coupled advanced intermediate. This justifies prioritizing the $76\\%$ step for optimization.',
      diagram: chemGraph({
        xLabel: 'branch sequence',
        yLabel: 'fraction remaining',
        points: [
          { x: 80, y: 70, label: '0.82', fill: '#1d4ed8' },
          { x: 140, y: 95, label: '0.62', fill: '#16a34a' },
          { x: 210, y: 110, label: '0.55', fill: '#dc2626' },
        ],
        annotations:
          '<line x1="80" y1="70" x2="140" y2="95" stroke="#333"/>' +
          '<line x1="140" y1="95" x2="210" y2="110" stroke="#333"/>' +
          '<text x="70" y="42" font-size="9">Corey-lactone branch efficiency</text>',
      }),
    },
    {
      title: 'Ibuprofen synthesis atom economy and mass intensity',
      formula:
        '$$AE=\\frac{M_{\\text{ibuprofen}}}{\\sum M_{\\text{reactants}}}\\times100=\\frac{206.3}{254.3}\\times100=81.1\\%$$',
      body: 'Using a simplified feed set totaling $254.3\\ \\text{g mol}^{-1}$ to make ibuprofen ($206.3\\ \\text{g mol}^{-1}$), the atom economy is $AE=206.3/254.3\\times100=81.1\\%$. If isolated yield is $92\\%$, process mass intensity is $PMI=1/(0.811\\times0.92)=1.34$, which is strong for a large-scale API process.',
      diagram: chemGraph({
        xLabel: 'green metric',
        yLabel: 'value',
        points: [
          { x: 110, y: 85, label: 'AE 81.1%', fill: '#16a34a' },
          { x: 220, y: 105, label: 'PMI 1.34', fill: '#1d4ed8' },
        ],
        annotations:
          '<text x="55" y="38" font-size="9">Industrial ibuprofen (BHC-style)</text>' +
          '<line x1="110" y1="85" x2="220" y2="105" stroke="#64748b" stroke-dasharray="4 3"/>',
      }),
    },
    {
      title: 'Rate-selective acylation step in ibuprofen precursor assembly',
      formula:
        '$$\\frac{k_{para}}{k_{ortho}}=\\exp\\!\\left(-\\frac{\\Delta\\Delta G^{\\ddagger}}{RT}\\right)=\\exp\\!\\left(\\frac{4200}{8.314\\times298}\\right)=5.45$$',
      body: 'For a selectivity gap of $\\Delta\\Delta G^{\\ddagger}=-4.2\\ \\text{kJ mol}^{-1}$ favoring para substitution, $k_{para}/k_{ortho}=\\exp(4200/(8.314\\times298))=5.45$. Expected para fraction is $5.45/(1+5.45)=0.845$, so about $84.5\\%$ para product before purification.',
      diagram: chemGraph({
        xLabel: 'isomer channel',
        yLabel: 'relative rate',
        points: [
          { x: 120, y: 55, label: 'para 5.45', fill: '#16a34a' },
          { x: 220, y: 120, label: 'ortho 1.00', fill: '#dc2626' },
        ],
        annotations:
          '<text x="56" y="30" font-size="9">Electrophilic acylation selectivity</text>',
      }),
    },
    {
      title: 'Hajos-Parrish ketone: enamine-catalyzed intramolecular aldol control',
      formula:
        '$$ee=\\frac{|R-S|}{R+S}\\times100=\\frac{|91-9|}{100}\\times100=82\\%$$',
      body: 'A proline-mediated Hajos-Parrish enamine cyclization giving a $91:9$ enantiomeric ratio corresponds to $ee=|91-9|/100\\times100=82\\%$. This high enantiocontrol seeds downstream stereocenters without resolving racemate later in the route.',
      diagram: chemGraph({
        xLabel: 'stereochemical outcome',
        yLabel: 'percent',
        points: [
          { x: 110, y: 50, label: 'major 91', fill: '#1d4ed8' },
          { x: 210, y: 125, label: 'minor 9', fill: '#dc2626' },
        ],
        annotations:
          '<text x="60" y="26" font-size="9">Hajos-Parrish ketone stereocontrol</text>' +
          '<text x="60" y="150" font-size="9">Proline enamine transition state bias</text>',
      }),
    },
    {
      title: 'Retrosynthetic route comparison by step economy and E-factor',
      formula:
        '$$E\\text{-factor}=\\frac{m_{\\text{waste}}}{m_{\\text{product}}}=\\frac{3.6\\,\\text{kg}}{1.2\\,\\text{kg}}=3.0$$',
      body: 'If Route A generates $3.6\\ \\text{kg}$ waste per $1.2\\ \\text{kg}$ product, then $E$-factor is $3.0$. A redesigned convergent route giving $2.4\\ \\text{kg}$ waste for the same output gives $E=2.0$, a $[(3.0-2.0)/3.0]\\times100=33.3\\%$ waste reduction.',
      diagram: chemGraph({
        xLabel: 'route',
        yLabel: 'E-factor',
        points: [
          { x: 120, y: 70, label: 'Route A: 3.0', fill: '#dc2626' },
          { x: 220, y: 95, label: 'Route B: 2.0', fill: '#16a34a' },
        ],
        annotations:
          '<text x="60" y="35" font-size="9">Convergent redesign lowers waste</text>',
      }),
      takeaway:
        'Retrosynthesis quality is measured not only by disconnections but also by quantitative selectivity, ee, and green metrics.',
    },
  ],
  solution:
    'A robust retrosynthesis splits prostaglandin targets into convergent fragments, tracks branch yields numerically, and prioritizes selectivity bottlenecks. Industrial ibuprofen planning benefits from atom-economy and PMI analysis, while the Hajos-Parrish ketone step provides early asymmetric induction (high ee) that simplifies downstream stereocontrol. Final route choice should combine step economy and E-factor improvements.',
  verifiedPatterns: [
    'prostaglandin',
    'Corey-lactone',
    'ibuprofen',
    'atom economy',
    'Hajos-Parrish',
    'enamine',
    'ee',
    'E-factor',
  ],
  minDiagramSteps: 5,
};
