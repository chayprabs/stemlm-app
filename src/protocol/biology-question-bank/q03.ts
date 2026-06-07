import {
  enzymeEnergyDiagram,
  inhibitorComparisonDiagram,
  michaelisMentenDiagram,
} from '../biology-svg';
import type { BiologyQuestionDef } from './types';

export const Q03: BiologyQuestionDef = {
  id: 'q03',
  number: 3,
  topic: 'Enzyme Kinetics, Inhibition, and Delta G',
  question:
    'Using enzyme kinetic principles, interpret a reaction coordinate diagram, apply Michaelis-Menten kinetics, compare inhibition types, and compute Gibbs free energy changes.',
  steps: [
    {
      title: 'Interpret activation energy from reaction coordinate',
      body: 'Enzymes lower activation energy (Ea) by stabilizing the transition state but do not change the reactant-product free energy difference. Therefore rates change, while equilibrium position (K_eq) is unchanged.',
      diagram: enzymeEnergyDiagram(),
    },
    {
      title: 'Use Michaelis-Menten equation at defined substrate concentration',
      formula:
        '$$v=\\frac{V_{max}[S]}{K_m+[S]}$$\n$$V_{max}=120\\,\\mu\\text{mol min}^{-1},\\;K_m=2\\,\\text{mM},\\;[S]=2\\,\\text{mM}\\Rightarrow v=\\frac{120\\times 2}{2+2}=60$$',
      body: 'At [S]=Km, velocity is exactly half-maximal (v=Vmax/2). Numerical substitution gives 60 umol min^-1 from Vmax=120 and Km=2 mM.',
      diagram: michaelisMentenDiagram(),
    },
    {
      title: 'Estimate kinetic order behavior from concentration limits',
      formula:
        '$$[S]\\ll K_m\\Rightarrow v\\approx\\frac{V_{max}}{K_m}[S]\\;(\\text{first order});\\quad [S]\\gg K_m\\Rightarrow v\\approx V_{max}\\;(\\text{zero order})$$',
      body: 'With Km=2 mM and Vmax=120: at [S]=0.2 mM, v about (120/2)*0.2=12; at [S]=20 mM, v about 120. This shows linear dependence at low [S] and saturation at high [S].',
    },
    {
      title: 'Compare competitive vs noncompetitive inhibition',
      formula:
        '$$\\text{Competitive: }K_m\\uparrow,\\;V_{max}\\text{ unchanged};\\quad \\text{Noncompetitive: }V_{max}\\downarrow,\\;K_m\\text{ often unchanged}$$',
      body: 'Example: if a competitive inhibitor doubles apparent Km from 2 to 4 mM, then at [S]=2 mM velocity drops from 60 to (120*2)/(4+2)=40. If a noncompetitive inhibitor halves Vmax to 60, then at [S]=2 mM velocity is (60*2)/(2+2)=30.',
      diagram: inhibitorComparisonDiagram(),
    },
    {
      title: 'Compute Gibbs free energy under nonstandard conditions',
      formula:
        '$$\\Delta G=\\Delta G^\\circ\\!\\!\\!\\!\\prime+RT\\ln Q$$\n$$\\Delta G^\\circ\\!\\!\\!\\!\\prime=-30.5\\,\\text{kJ/mol},\\;R=8.314\\times10^{-3},\\;T=298\\,\\text{K},\\;Q=0.1$$',
      body: 'RT ln Q = (0.008314)(298)ln(0.1) = -5.7 kJ/mol (approx). So Delta G about -30.5-5.7 = -36.2 kJ/mol, meaning the forward direction is even more favorable than at standard transformed conditions.',
    },
    {
      title: 'Connect kinetics and thermodynamics correctly',
      body: 'Catalysts accelerate both forward and reverse rates similarly by lowering Ea, so they change how fast equilibrium is reached, not Delta G or K_eq. Kinetics answers speed, thermodynamics answers direction and extent.',
      takeaway:
        'Remember two independent lenses: Michaelis-Menten for rate and Delta G for spontaneity under given concentrations.',
    },
  ],
  solution:
    'Enzymes reduce activation energy but do not alter overall Delta G or equilibrium constant. Michaelis-Menten gives v = Vmax[S]/(Km+[S]); with Vmax=120 and Km=2 mM, v at [S]=2 mM is 60 umol min^-1. Competitive inhibition increases apparent Km (Vmax unchanged), while noncompetitive inhibition decreases Vmax. Thermodynamically, Delta G = Delta G0\' + RT ln Q; with Delta G0\'=-30.5 kJ/mol, T=298 K, and Q=0.1, Delta G about -36.2 kJ/mol.',
  verifiedPatterns: ['60', 'competitive', 'noncompetitive', '-36.2', 'Vmax', 'Km'],
  minDiagramSteps: 3,
};
