import { arrheniusPlot, chemGraph, haberProcessFlow, langmuirIsotherm } from '../chem-svg';
import type { ChemistryQuestionDef } from './types';

export const Q45: ChemistryQuestionDef = {
  id: 'q45',
  number: 45,
  topic: 'Environmental and Industrial Chemistry: Ozone, Catalytic Converters, Contact Process',
  question:
    'Environmental and industrial chemistry: (a) Quantify ozone formation and catalytic destruction cycles. (b) Analyze catalytic converter performance for CO, NOx, and hydrocarbons. (c) Perform equilibrium and rate calculations for the Contact process (SO2 to SO3).',
  steps: [
    {
      title: 'Chapman ozone-cycle steady-state estimate',
      formula: '$$[O_3] \\approx \\frac{k_1[O_2][M]}{k_2[O]}$$',
      body: 'Take $k_1[O_2][M]=4.0\\times10^8\\,\\text{cm}^{-3}\\text{s}^{-1}$ and $k_2[O]=2.0\\times10^2\\,\\text{s}^{-1}$. Then $[O_3]=4.0\\times10^8/2.0\\times10^2=2.0\\times10^6\\,\\text{cm}^{-3}$. This simple ratio shows how ozone abundance rises when atomic oxygen production is strong and depletion is slower.',
      diagram: chemGraph({
        xLabel: 'altitude',
        yLabel: '[O3]',
        curves: [
          { d: 'M 50 130 C 100 125 145 70 180 60 C 210 58 235 80 255 110', stroke: '#1d4ed8', label: 'stratospheric ozone', labelPos: [170, 52] },
        ],
      }),
    },
    {
      title: 'Catalytic ozone depletion by chlorine radicals',
      formula: '$$\\text{net: }O_3 + O \\rightarrow 2O_2$$',
      body: 'If one Cl radical completes $1.0\\times10^4$ catalytic cycles before sequestration, and each cycle destroys one O3 molecule, then one Cl atom removes $10{,}000$ ozone molecules. For a local concentration of $2.0\\times10^3\\,\\text{Cl cm}^{-3}$, potential ozone loss is $2.0\\times10^7\\,\\text{O3 cm}^{-3}$.',
      diagram: chemGraph({
        xLabel: 'cycle count',
        yLabel: 'ozone molecules destroyed',
        curves: [
          { d: 'M 50 130 L 250 45', stroke: '#dc2626', label: 'Cl catalytic chain', labelPos: [160, 55] },
        ],
      }),
    },
    {
      title: 'Catalytic converter stoichiometry and conversion efficiency',
      formula:
        '$$\\eta=\\frac{n_{in}-n_{out}}{n_{in}}\\times100\\%$$',
      body: 'Suppose exhaust contains $n_{in}(CO)=120\\,\\text{mmol min}^{-1}$ and outlet has $n_{out}(CO)=12\\,\\text{mmol min}^{-1}$. The conversion efficiency is $\\eta=(120-12)/120\\times100=90\\%$. Similar oxidation and reduction channels convert hydrocarbons to CO2/H2O and reduce NOx to N2.',
      diagram: chemGraph({
        xLabel: 'pollutant stream',
        yLabel: 'conversion %',
        points: [
          { x: 95, y: 70, label: 'CO 90%', fill: '#16a34a' },
          { x: 160, y: 78, label: 'HC 84%', fill: '#1d4ed8' },
          { x: 225, y: 82, label: 'NOx 80%', fill: '#dc2626' },
        ],
      }),
    },
    {
      title: 'Contact process equilibrium conversion',
      formula:
        '$$K_p=\\frac{(P_{SO_3})^2}{(P_{SO_2})^2P_{O_2}}$$',
      body: 'Assume equilibrium partial pressures $P_{SO_3}=0.70\\,\\text{bar}$, $P_{SO_2}=0.20\\,\\text{bar}$, and $P_{O_2}=0.10\\,\\text{bar}$. Then $K_p=(0.70^2)/(0.20^2\\times0.10)=0.49/0.004=122.5$. A large $K_p$ confirms strong thermodynamic drive toward SO3 under optimized reactor conditions.',
      diagram: haberProcessFlow(),
    },
    {
      title: 'V2O5 catalyst rate enhancement in SO2 oxidation',
      formula: '$$\\frac{k_2}{k_1}=\\exp\\!\\left[-\\frac{E_{a,2}-E_{a,1}}{RT}\\right]$$',
      body: 'If uncatalyzed activation energy is $E_{a,1}=120\\,\\text{kJ mol}^{-1}$ and V2O5-catalyzed value is $E_{a,2}=75\\,\\text{kJ mol}^{-1}$ at $T=700\\,\\text{K}$, then $k_2/k_1=\\exp[(120000-75000)/(8.314\\times700)]$. The exponent is $7.73$, so rate enhancement is about $2.3\\times10^3$.',
      diagram: arrheniusPlot(),
    },
    {
      title: 'Surface adsorption contribution to pollution control',
      formula: '$$\\theta=\\frac{KP}{1+KP}$$',
      body: 'The **Langmuir** isotherm gives coverage $\\theta=KP/(1+KP)$. For sulfur dioxide with $K=2.5\\,\\text{bar}^{-1}$ and $P=0.40\\,\\text{bar}$, $\\theta=(2.5\\times0.40)/(1+2.5\\times0.40)=1.0/2.0=0.50$. Half-monolayer coverage sustains catalytic turnover while limiting sulfate blocking.',
      diagram: langmuirIsotherm(),
      takeaway:
        'Ozone chemistry, catalytic converters, and the Contact process are all governed by the same triad of kinetics, equilibrium, and catalytic surface chemistry.',
    },
  ],
  solution:
    '**(a)** Ozone concentration comes from competition between Chapman formation and catalytic destruction cycles. **(b)** Three-way catalytic converters reduce CO, hydrocarbons, and NOx with high but finite conversion efficiency. **(c)** In the Contact process, favorable equilibrium and V2O5-catalyzed kinetics together enable efficient SO3 production for sulfuric acid manufacture.',
  verifiedPatterns: [
    'ozone',
    'catalytic converter',
    'NOx',
    'Contact process',
    'SO3',
    'V2O5',
    'Chapman',
    'Langmuir',
  ],
  minDiagramSteps: 5,
};
