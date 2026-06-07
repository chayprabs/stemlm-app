import { chemGraph, dnaBasePairs } from '../chem-svg';
import type { ChemistryQuestionDef } from './types';

export const Q40: ChemistryQuestionDef = {
  id: 'q40',
  number: 40,
  topic: 'Supramolecular Chemistry: Crown Ethers, Cryptands, Fujita Cages, and DNA H-Bonds',
  question:
    'Supramolecular chemistry analysis: (a) Quantify ion binding by crown ethers and cryptands. (b) Evaluate stoichiometry and stability in Fujita self-assembled cages. (c) Use hydrogen-bond energetics to analyze DNA base pairing and host-guest cooperativity.',
  steps: [
    {
      title: 'Crown ether selectivity from binding free energies',
      formula:
        '$$\\Delta\\Delta G=\\Delta G_{K}-\\Delta G_{Na}=-27.5-(-23.0)=-4.5\\,kJ\\,mol^{-1}$$',
      body: 'For 18-crown-6, if $\\Delta G_{bind}(K^+)=-27.5$ and $\\Delta G_{bind}(Na^+)=-23.0\\ \\text{kJ mol}^{-1}$, then $\\Delta\\Delta G=-4.5\\ \\text{kJ mol}^{-1}$ favoring potassium. Selectivity ratio is $K_K/K_{Na}=\\exp(4500/(8.314\\times298))=6.14$.',
      diagram: chemGraph({
        xLabel: 'guest ion',
        yLabel: 'DeltaG bind',
        points: [
          { x: 120, y: 78, label: 'K+ -27.5', fill: '#16a34a' },
          { x: 220, y: 96, label: 'Na+ -23.0', fill: '#1d4ed8' },
        ],
        annotations:
          '<text x="54" y="30" font-size="9">18-crown-6 cavity-size matching</text>',
      }),
    },
    {
      title: 'Cryptand encapsulation and affinity enhancement factor',
      formula:
        '$$EF=\\frac{K_{cryptand}}{K_{crown}}=\\frac{3.2\\times10^6}{5.8\\times10^4}=55.2$$',
      body: 'If a cryptand binds potassium with $K=3.2\\times10^6\\ \\text{M}^{-1}$ and analogous crown ether gives $5.8\\times10^4\\ \\text{M}^{-1}$, enhancement factor is $EF=55.2$. Stronger preorganization and three-dimensional encapsulation explain this large affinity gain.',
      diagram: chemGraph({
        xLabel: 'host class',
        yLabel: 'binding constant K',
        points: [
          { x: 120, y: 104, label: 'crown 5.8e4', fill: '#1d4ed8' },
          { x: 220, y: 62, label: 'cryptand 3.2e6', fill: '#dc2626' },
        ],
        annotations:
          '<text x="56" y="34" font-size="9">cryptand enclosure amplifies binding</text>',
      }),
    },
    {
      title: 'Fujita cage stoichiometry and assembly yield',
      formula:
        '$$6M+4L\\rightarrow M_6L_4,\\quad Y=\\frac{0.42}{0.50}\\times100=84.0\\%$$',
      body: 'A Fujita cage forms by $6:4$ metal-to-ligand stoichiometry and gives M6L4 architecture. From theoretical $0.50\\ \\text{mmol}$ cage and isolated $0.42\\ \\text{mmol}$, assembly yield is $Y=84.0\\%$. Such high self-assembly efficiency reflects thermodynamic error-correction.',
      diagram: chemGraph({
        xLabel: 'assembly component',
        yLabel: 'equivalents',
        points: [
          { x: 90, y: 70, label: 'M 6', fill: '#1d4ed8' },
          { x: 160, y: 90, label: 'L 4', fill: '#16a34a' },
          { x: 240, y: 82, label: 'cage 1', fill: '#dc2626' },
        ],
        annotations:
          '<line x1="92" y1="70" x2="238" y2="82" stroke="#333"/>' +
          '<line x1="162" y1="90" x2="238" y2="82" stroke="#333"/>' +
          '<text x="56" y="34" font-size="9">Fujita M6L4 self-assembly</text>',
      }),
    },
    {
      title: 'Host-guest occupancy from association constant',
      formula:
        '$$\\theta=\\frac{K[G]}{1+K[G]}=\\frac{(2.5\\times10^5)(1.5\\times10^{-5})}{1+(2.5\\times10^5)(1.5\\times10^{-5})}=0.789$$',
      body: 'With host-guest constant $K=2.5\\times10^5\\ \\text{M}^{-1}$ and guest concentration $1.5\\times10^{-5}\\ \\text{M}$, occupancy is $\\theta=0.789$. Therefore occupancy percentage is $\\%\\,filled=78.9\\%$.',
      diagram: chemGraph({
        xLabel: '[G] effective',
        yLabel: 'occupancy theta',
        curves: [
          { d: 'M 50 130 C 95 95 150 70 250 56', stroke: '#7c3aed', label: 'Langmuir-like host filling', labelPos: [150, 63] },
        ],
        points: [{ x: 180, y: 70, label: 'theta 0.789', fill: '#7c3aed' }],
      }),
    },
    {
      title: 'DNA hydrogen-bond energetics for base pairing',
      formula:
        '$$\\Delta G_{GC}=3(-7.2)=-21.6,\\quad \\Delta G_{AT}=2(-7.2)=-14.4\\ \\text{kJ mol}^{-1}$$',
      body: 'Approximating each hydrogen bond contribution as $-7.2\\ \\text{kJ mol}^{-1}$ gives $\\Delta G_{GC}=-21.6$ and $\\Delta G_{AT}=-14.4\\ \\text{kJ mol}^{-1}$. For DNA base pairing, the difference is $\\Delta\\Delta G=-7.2\\ \\text{kJ mol}^{-1}$, explaining stronger stabilization of GC-rich duplex segments.',
      diagram: dnaBasePairs(),
    },
    {
      title: 'Cooperativity estimate from melting-temperature shift',
      formula:
        '$$\\Delta T_m=T_{m,bound}-T_{m,free}=71.5-66.0=5.5^\\circ C,\\quad C_{coop}=\\frac{5.5}{66.0}=0.083$$',
      body: 'If a supramolecular binder raises duplex melting point from $66.0^\\circ\\text{C}$ to $71.5^\\circ\\text{C}$, then $\\Delta T_m=5.5^\\circ\\text{C}$. A normalized cooperativity index $C_{coop}=0.083$ indicates meaningful stabilization by multivalent host-guest and hydrogen-bond interactions.',
      diagram: chemGraph({
        xLabel: 'DNA state',
        yLabel: 'Tm (degC)',
        points: [
          { x: 120, y: 100, label: 'free 66.0', fill: '#1d4ed8' },
          { x: 220, y: 86, label: 'bound 71.5', fill: '#16a34a' },
        ],
        annotations:
          '<text x="56" y="34" font-size="9">supramolecular binding stabilizes duplex</text>',
      }),
      takeaway:
        'Supramolecular chemistry becomes predictive when binding constants, assembly stoichiometry, and hydrogen-bond energetics are treated quantitatively.',
    },
  ],
  solution:
    'Crown ethers and cryptands are differentiated by measurable free-energy and affinity gains, Fujita cage assemblies are validated by M6L4 stoichiometric and occupancy calculations, and DNA recognition is interpreted through hydrogen-bond energetics and base pairing melting-temperature shifts. These combined calculations form a quantitative supramolecular design toolkit.',
  verifiedPatterns: [
    'crown ether',
    'cryptand',
    'Fujita cage',
    'M6L4',
    'DNA',
    'hydrogen-bond',
    'base pairing',
    'occupancy',
  ],
  minDiagramSteps: 5,
};
