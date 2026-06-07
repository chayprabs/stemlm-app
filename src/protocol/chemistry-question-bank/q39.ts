import { chemGraph, jablonskiDiagram } from '../chem-svg';
import type { ChemistryQuestionDef } from './types';

export const Q39: ChemistryQuestionDef = {
  id: 'q39',
  number: 39,
  topic: 'Photochemistry: Jablonski Analysis, [2+2] Cycloaddition, and Norrish Reactions',
  question:
    'Photochemistry problem set: (a) Interpret Jablonski-state kinetics quantitatively. (b) Analyze photochemical [2+2] cycloaddition efficiency. (c) Compare Norrish Type I and Norrish Type II pathways using quantum yields and product ratios.',
  steps: [
    {
      title: 'Jablonski diagram rate constants and fluorescence quantum yield',
      formula:
        '$$\\Phi_F=\\frac{k_F}{k_F+k_{IC}+k_{ISC}}=\\frac{1.2\\times10^8}{1.2\\times10^8+0.7\\times10^8+0.1\\times10^8}=0.60$$',
      body: 'With $k_F=1.2\\times10^8\\ \\text{s}^{-1}$, $k_{IC}=0.7\\times10^8\\ \\text{s}^{-1}$, and $k_{ISC}=0.1\\times10^8\\ \\text{s}^{-1}$, fluorescence quantum yield is $\\Phi_F=0.60$. Thus $60\\%$ of excited singlets emit, while $40\\%$ deactivate non-radiatively or via intersystem crossing.',
      diagram: jablonskiDiagram(),
    },
    {
      title: 'Excited-state lifetime from summed decay rates',
      formula:
        '$$\\tau=\\frac{1}{k_F+k_{IC}+k_{ISC}}=\\frac{1}{2.0\\times10^8}=5.0\\times10^{-9}\\,s$$',
      body: 'Using total deactivation rate $2.0\\times10^8\\ \\text{s}^{-1}$ gives excited-state lifetime $\\tau=5.0\\ \\text{ns}$. If phosphorescence channel adds $0.05\\times10^8\\ \\text{s}^{-1}$, lifetime shortens to $1/(2.05\\times10^8)=4.88\\ \\text{ns}$.',
      diagram: chemGraph({
        xLabel: 'channel count',
        yLabel: 'lifetime (ns)',
        points: [
          { x: 120, y: 90, label: '3 channels 5.00', fill: '#1d4ed8' },
          { x: 220, y: 94, label: '4 channels 4.88', fill: '#dc2626' },
        ],
        annotations:
          '<text x="56" y="34" font-size="9">lifetime contracts as total rate increases</text>',
      }),
    },
    {
      title: 'Photochemical [2+2] cycloaddition conversion and quantum efficiency',
      formula:
        '$$\\Phi_{[2+2]}=\\frac{n_{product}}{n_{photon}}=\\frac{0.42\\,mmol}{0.80\\,mmol}=0.525$$',
      body: 'If irradiation delivers effective $0.80\\ \\text{mmol}$ photon equivalents and gives $0.42\\ \\text{mmol}$ cyclobutane product, then $\\Phi_{[2+2]}=0.525$. Starting from $0.60\\ \\text{mmol}$ alkene pair, conversion is $0.42/0.60\\times100=70.0\\%$.',
      diagram: chemGraph({
        xLabel: 'photochemical metric',
        yLabel: 'value',
        points: [
          { x: 120, y: 88, label: 'Phi 0.525', fill: '#1d4ed8' },
          { x: 220, y: 80, label: 'conversion 70%', fill: '#16a34a' },
        ],
        annotations:
          '<text x="56" y="34" font-size="9">suprafacial [2+2] under UV excitation</text>',
      }),
    },
    {
      title: 'Norrish Type I alpha-cleavage channel quantification',
      formula:
        '$$\\Phi_I=\\frac{N_I}{N_{abs}}=\\frac{2.8\\times10^{15}}{5.0\\times10^{15}}=0.56$$',
      body: 'For a ketone absorbing $5.0\\times10^{15}$ photons and generating $2.8\\times10^{15}$ Type I radical events, $\\Phi_I=0.56$. If recombination suppresses product capture to $65\\%$, observed product quantum yield is $0.56\\times0.65=0.364$.',
      diagram: chemGraph({
        xLabel: 'Type I stage',
        yLabel: 'fraction',
        points: [
          { x: 120, y: 82, label: 'primary 0.56', fill: '#dc2626' },
          { x: 220, y: 100, label: 'captured 0.364', fill: '#7c3aed' },
        ],
        annotations:
          '<text x="56" y="34" font-size="9">Norrish Type I alpha-cleavage radicals</text>',
      }),
    },
    {
      title: 'Norrish Type II gamma-H abstraction and product partition',
      formula:
        '$$R_{II/I}=\\frac{\\Phi_{II}}{\\Phi_I}=\\frac{0.42}{0.56}=0.75,\\quad \\%II=\\frac{0.42}{0.42+0.56}\\times100=42.9\\%$$',
      body: 'With Norrish Type II quantum yield $\\Phi_{II}=0.42$ and Type I $\\Phi_I=0.56$, channel ratio is $R_{II/I}=0.75$ and Type II share is $42.9\\%$. This indicates substantial gamma-hydrogen abstraction but Type I remains dominant under these conditions.',
      diagram: chemGraph({
        xLabel: 'Norrish pathway',
        yLabel: 'quantum yield',
        points: [
          { x: 120, y: 82, label: 'Type I 0.56', fill: '#dc2626' },
          { x: 220, y: 94, label: 'Type II 0.42', fill: '#16a34a' },
        ],
        annotations:
          '<text x="56" y="34" font-size="9">competition between alpha-cleavage and gamma-H shift</text>',
      }),
    },
    {
      title: 'Wavelength optimization for photoselective control',
      formula:
        '$$\\text{selectivity factor}=\\frac{(II/I)_{365}}{(II/I)_{300}}=\\frac{1.10}{0.62}=1.77$$',
      body: 'If $II/I$ is $0.62$ at $300\\ \\text{nm}$ and $1.10$ at $365\\ \\text{nm}$, then $\\text{selectivity factor}=1.10/0.62=1.77$. Switching to longer wavelength thus enhances Type II preference by $77\\%$ relative to shorter-wavelength irradiation.',
      diagram: chemGraph({
        xLabel: 'wavelength (nm)',
        yLabel: 'II/I ratio',
        points: [
          { x: 120, y: 106, label: '300 -> 0.62', fill: '#1d4ed8' },
          { x: 220, y: 82, label: '365 -> 1.10', fill: '#16a34a' },
        ],
        annotations:
          '<line x1="120" y1="106" x2="220" y2="82" stroke="#333"/>' +
          '<text x="56" y="34" font-size="9">spectral tuning controls pathway</text>',
      }),
      takeaway:
        'Photochemical design requires coupling state-kinetic analysis with quantum yields, wavelength dependence, and competing Norrish channels.',
    },
  ],
  solution:
    'Jablonski analysis provides quantitative fluorescence yield and lifetime estimates, [2+2] cycloaddition performance is evaluated through conversion and quantum efficiency, and Norrish Type I/II competition is resolved by channel quantum yields and wavelength tuning. Together these calculations enable predictive photochemical process control.',
  verifiedPatterns: [
    'Jablonski',
    '[2+2]',
    'photochemical',
    'Norrish Type I',
    'Norrish Type II',
    'quantum yield',
    'lifetime',
    'intersystem crossing',
  ],
  minDiagramSteps: 5,
};
