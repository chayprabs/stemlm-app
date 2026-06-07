import { chemGraph, moEnergyDiagram, vseprMolecule, irSpectrum } from '../chem-svg';
import type { ChemistryQuestionDef } from './types';

export const Q18: ChemistryQuestionDef = {
  id: 'q18',
  number: 18,
  topic: 'p-Block Chemistry (Groups 15-17)',
  question:
    'p-block chemistry for Groups 15-17: (a) Compare oxoacid structures, acid strength, and resonance. (b) Use molecular orbital analysis for O2, O2+, O2-, and O2^2-. (c) Analyze interhalogen bonding and VSEPR geometry for ClF, ClF3, ClF5, and IF7.',
  steps: [
    {
      title: 'Oxoacid acidity trend from pKa values',
      formula: '$$K_a=10^{-\\mathrm{p}K_a}$$',
      body: 'For HNO3 with $\\mathrm{p}K_a=-1.4$, $K_a=10^{1.4}=25.1$. For HNO2 with $\\mathrm{p}K_a=3.3$, $K_a=10^{-3.3}=5.0\\times10^{-4}$. The ratio is $25.1/(5.0\\times10^{-4})=5.0\\times10^4$, showing that additional terminal oxygen and stronger resonance stabilization greatly increase acidity.',
      diagram: chemGraph({
        xLabel: 'oxoacid',
        yLabel: 'relative acidity',
        points: [
          { x: 90, y: 130, label: 'HNO2', fill: '#1d4ed8' },
          { x: 170, y: 110, label: 'HNO3', fill: '#16a34a' },
          { x: 250, y: 75, label: 'HClO4', fill: '#dc2626' },
        ],
        annotations:
          '<text x="75" y="26" font-size="10" font-weight="bold">Higher central oxidation state => stronger oxoacid</text>',
      }),
    },
    {
      title: 'Structural markers in oxoacids using IR frequencies',
      formula: '$$\\Delta\\tilde\\nu=\\tilde\\nu(\\mathrm{double\\ bond})-\\tilde\\nu(\\mathrm{single\\ bond})$$',
      body: 'If a representative N=O stretch appears near $1650\\,\\text{cm}^{-1}$ while N-O appears near $1250\\,\\text{cm}^{-1}$, then $\\Delta\\tilde\\nu=1650-1250=400\\,\\text{cm}^{-1}$. A larger separation is consistent with stronger terminal multiple-bond character in highly oxidized oxoacids.',
      diagram: irSpectrum({
        title: 'Oxoacid structural bands',
        peaks: [
          { x: 120, label: '1650 N=O' },
          { x: 185, label: '1250 N-O' },
          { x: 230, label: '1100 Cl-O' },
        ],
      }),
    },
    {
      title: 'MO bond orders for O2 and O2+',
      formula: '$$\\mathrm{BO}=\\frac{N_b-N_a}{2}$$',
      body: 'The bond order is found from $\\mathrm{BO}=(N_b-N_a)/2$. For O2, $\\mathrm{BO}=(10-6)/2=2.0$ with two unpaired electrons, so O2 is paramagnetic. Removing one electron gives O2+ with $\\mathrm{BO}=(10-5)/2=2.5$, one unpaired electron, and a shorter bond.',
      diagram: moEnergyDiagram({
        species: 'O2',
        bondOrder: 2,
        paramagnetic: true,
      }),
    },
    {
      title: 'MO bond orders for O2- and O2^2-',
      formula: '$$\\mathrm{BO}_{\\mathrm{O_2^-}}=1.5,\\quad \\mathrm{BO}_{\\mathrm{O_2^{2-}}}=1.0$$',
      body: 'Adding one electron to O2 gives superoxide O2- with $\\mathrm{BO}=(10-7)/2=1.5$ and one unpaired electron, so it remains paramagnetic. Adding two electrons gives peroxide O2^2- with $\\mathrm{BO}=(10-8)/2=1.0$ and all electrons paired, so O2^2- is diamagnetic.',
      diagram: moEnergyDiagram({
        species: 'O2^2-',
        bondOrder: 1,
        paramagnetic: false,
      }),
    },
    {
      title: 'Interhalogen geometries from steric number',
      formula: '$$\\mathrm{SN}=\\frac{V+M}{2}$$',
      body: 'For interhalogen molecules, $V$ is valence electrons on the central atom and $M$ is the count of monovalent ligands. For ClF, $\\mathrm{SN}=(7+1)/2=4$ (AX1E3, linear). For ClF3, $\\mathrm{SN}=(7+3)/2=5$ (AX3E2, T-shaped). For ClF5, $\\mathrm{SN}=(7+5)/2=6$ (AX5E, square pyramidal). For IF7, $\\mathrm{SN}=(7+7)/2=7$ (AX7, pentagonal bipyramidal).',
      diagram: vseprMolecule({
        name: 'Interhalogens: ClF / ClF3 / ClF5 / IF7',
        geometry: 'linear, T-shaped, square pyramidal, pentagonal bipyramidal',
        angle: '180°, ~87-90°, ~90°, 72° and 90°',
      }),
    },
    {
      title: 'Interhalogen stoichiometry and oxidation-state checks',
      formula: '$$\\mathrm{Cl_2}+3\\mathrm{F_2}\\rightarrow2\\mathrm{ClF_3}$$',
      body: 'From the balanced equation, $n(\\mathrm{F_2})=3.00\\,\\text{mol}$ is needed per $1.00\\,\\text{mol}$ Cl2 and $n(\\mathrm{ClF_3})=2.00\\,\\text{mol}$ is formed. Oxidation-state checks give $\\mathrm{OS}(\\mathrm{Cl})=+1$ in ClF, $+3$ in ClF3, and $+5$ in ClF5, while $\\mathrm{OS}(\\mathrm{I})=+7$ in IF7.',
      diagram: chemGraph({
        xLabel: 'species',
        yLabel: 'central oxidation state',
        points: [
          { x: 85, y: 122, label: 'ClF: +1', fill: '#1d4ed8' },
          { x: 145, y: 102, label: 'ClF3: +3', fill: '#16a34a' },
          { x: 205, y: 82, label: 'ClF5: +5', fill: '#dc2626' },
          { x: 260, y: 62, label: 'IF7: +7', fill: '#7c3aed' },
        ],
        annotations:
          '<text x="72" y="28" font-size="10">higher oxidation state with more F ligands</text>',
      }),
      takeaway:
        'Across Groups 15-17, structure and electron count control acidity, magnetism, and geometry: oxoacid resonance, O2-species MO occupancy, and hypervalent interhalogen bonding follow consistent rules.',
    },
  ],
  solution:
    '**(a)** Oxoacid strength increases with central-atom oxidation state and resonance stabilization of the conjugate base. **(b)** Molecular orbital treatment gives clear bond order and magnetic trends: O2 (2.0, paramagnetic), O2+ (2.5, paramagnetic), O2- (1.5, paramagnetic), and O2^2- (1.0, diamagnetic). **(c)** Interhalogen compounds follow VSEPR predictions: ClF linear, ClF3 T-shaped, ClF5 square pyramidal, and IF7 pentagonal bipyramidal, with oxidation state increasing as fluorination increases.',
  verifiedPatterns: [
    'oxoacid',
    'HNO3',
    'O2+',
    'O2-',
    'O2^2-',
    'bond order',
    'paramagnetic',
    'interhalogen',
    'ClF3',
    'ClF5',
    'IF7',
  ],
  minDiagramSteps: 5,
};
