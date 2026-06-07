import { chemGraph, energyProfile, haberProcessFlow, solubilityCurves } from '../chem-svg';
import type { ChemistryQuestionDef } from './types';

export const Q13: ChemistryQuestionDef = {
  id: 'q13',
  number: 13,
  topic: 'Chemical Equilibrium',
  question:
    'Chemical equilibrium in inorganic and organic chemistry: (a) Analyze Haber process equilibrium constant and pressure effects. (b) Quantify Fischer esterification equilibrium and mechanism for carboxylic acid plus alcohol. (c) Interpret solubility curves and common-ion equilibrium using Ksp.',
  steps: [
    {
      title: 'Haber process reaction quotient and equilibrium direction',
      formula: '$$K_p=\\frac{(P_{\\mathrm{NH_3}})^2}{P_{\\mathrm{N_2}}(P_{\\mathrm{H_2}})^3}$$',
      body: 'For $\\mathrm{N_2+3H_2\\rightleftharpoons2NH_3}$, use $P_{\\mathrm{NH_3}}=40\\,\\text{atm}$, $P_{\\mathrm{N_2}}=30\\,\\text{atm}$, and $P_{\\mathrm{H_2}}=90\\,\\text{atm}$. Then $Q_p=40^2/[30(90)^3]=1600/(2.187\\times10^7)=7.32\\times10^{-5}$. If $K_p=2.0\\times10^{-4}$ at this temperature, then $Q_p<K_p$ so the Haber process shifts forward to form more ammonia.',
      diagram: haberProcessFlow(),
    },
    {
      title: 'Pressure effect on Haber equilibrium conversion',
      formula: '$$y_{\\mathrm{NH_3}}=\\frac{2\\xi}{4-2\\xi}$$',
      body: 'Start with stoichiometric feed $1\\,\\text{mol}\\,\\mathrm{N_2}$ and $3\\,\\text{mol}\\,\\mathrm{H_2}$, where $\\xi$ is extent of reaction. At $200\\,\\text{atm}$, if $\\xi=0.45$, then $y_{\\mathrm{NH_3}}=0.90/(4-0.90)=0.90/3.10=0.290$. At higher pressure, if $\\xi=0.60$, then $y_{\\mathrm{NH_3}}=1.20/(4-1.20)=1.20/2.80=0.429$, confirming Le Chatelier favoring fewer gas moles.',
      diagram: chemGraph({
        xLabel: 'pressure (atm)',
        yLabel: 'NH3 mole fraction',
        curves: [
          {
            d: 'M 55 125 C 105 110 155 88 245 62',
            stroke: '#1d4ed8',
            label: 'equilibrium yNH3',
            labelPos: [170, 80],
          },
        ],
        points: [
          { x: 105, y: 108, label: '200 atm, 0.290', fill: '#1d4ed8' },
          { x: 180, y: 82, label: 'higher P, 0.429', fill: '#dc2626' },
        ],
      }),
    },
    {
      title: 'Fischer esterification equilibrium constant',
      formula:
        '$$K_c=\\frac{[\\mathrm{CH_3COOC_2H_5}][\\mathrm{H_2O}]}{[\\mathrm{CH_3COOH}][\\mathrm{C_2H_5OH}]}$$',
      body: 'At equilibrium for acetic acid plus ethanol, take $[\\mathrm{ester}]=0.60\\,\\text{M}$, $[\\mathrm{H_2O}]=0.60\\,\\text{M}$, $[\\mathrm{CH_3COOH}]=0.40\\,\\text{M}$, and $[\\mathrm{C_2H_5OH}]=0.40\\,\\text{M}$. Then $K_c=(0.60\\times0.60)/(0.40\\times0.40)=0.36/0.16=2.25$. The value above 1 means ethyl acetate plus water are modestly favored at these conditions.',
      diagram: energyProfile({
        title: 'Fischer esterification: protonated carbonyl pathway',
        hasIntermediate: true,
      }),
    },
    {
      title: 'Acid-catalyzed esterification mechanism rate estimate',
      formula: '$$\\text{rate}=k[\\mathrm{CH_3COOH}][\\mathrm{C_2H_5OH}]$$',
      body: 'In the mechanism, protonation activates the carbonyl, nucleophilic alcohol attack forms a tetrahedral intermediate, then water leaves. With $k=1.8\\times10^{-3}\\,\\text{M}^{-1}\\text{s}^{-1}$, $[\\mathrm{CH_3COOH}]=1.20\\,\\text{M}$, and $[\\mathrm{C_2H_5OH}]=2.00\\,\\text{M}$, the initial rate is $1.8\\times10^{-3}\\times1.20\\times2.00=4.32\\times10^{-3}\\,\\text{M s}^{-1}$.',
      diagram: energyProfile({
        title: 'Esterification mechanism: addition-elimination sequence',
        hasIntermediate: true,
      }),
    },
    {
      title: 'Solubility curve interpretation for crystallization yield',
      formula: '$$m_{\\text{crystal}}=(S_{\\text{hot}}-S_{\\text{cold}})\\times\\frac{m_{\\text{water}}}{100}$$',
      body: 'Using a KNO3 solubility curve, take $S_{80}=170\\,\\text{g per 100 g water}$ and $S_{30}=45\\,\\text{g per 100 g water}$. For $m_{\\text{water}}=200\\,\\text{g}$, the mass crystallized on cooling is $(170-45)\\times(200/100)=125\\times2=250\\,\\text{g}$. The steep positive slope explains strong temperature sensitivity.',
      diagram: solubilityCurves(),
    },
    {
      title: 'Common-ion effect using solubility product Ksp',
      formula: '$$K_{sp}=[\\mathrm{Ba^{2+}}][\\mathrm{SO_4^{2-}}]$$',
      body: 'For $\\mathrm{BaSO_4}$, take $K_{sp}=1.1\\times10^{-10}$. In a solution with $[\\mathrm{SO_4^{2-}}]=0.020\\,\\text{M}$, saturated barium is $[\\mathrm{Ba^{2+}}]_{sat}=K_{sp}/[\\mathrm{SO_4^{2-}}]=(1.1\\times10^{-10})/0.020=5.5\\times10^{-9}\\,\\text{M}$. If mixed ion product is $Q=1.0\\times10^{-4}\\times0.020=2.0\\times10^{-6}$, then $Q\\gg K_{sp}$ and precipitation is immediate.',
      diagram: chemGraph({
        xLabel: 'ion product Q',
        yLabel: 'relative scale',
        points: [
          { x: 95, y: 120, label: 'Ksp = 1.1e-10', fill: '#1d4ed8' },
          { x: 220, y: 70, label: 'Q = 2.0e-6', fill: '#dc2626' },
        ],
        annotations:
          '<line x1="95" y1="120" x2="220" y2="70" stroke="#333" stroke-dasharray="4 3"/>' +
          '<text x="125" y="94" font-size="9">Q > Ksp -> precipitate</text>',
      }),
      takeaway:
        'Equilibrium constants unify gas-phase synthesis, esterification yield, and precipitation control through the same Q versus K comparison.',
    },
  ],
  solution:
    'Haber equilibrium analysis gives $Q_p=7.32\\times10^{-5}$ versus $K_p=2.0\\times10^{-4}$, so ammonia formation is favored and higher pressure increases conversion. For Fischer esterification of acetic acid with ethanol, the given concentrations give $K_c=2.25$ and a mechanism rate of $4.32\\times10^{-3}\\,\\text{M s}^{-1}$ under the stated conditions. Solubility-curve cooling from $80^\\circ\\text{C}$ to $30^\\circ\\text{C}$ gives $250\\,\\text{g}$ KNO3 crystallized per $200\\,\\text{g}$ water, while common-ion calculations with $K_{sp}=1.1\\times10^{-10}$ show $Q\\gg K_{sp}$ and precipitation of BaSO4.',
  verifiedPatterns: [
    'Haber process',
    'Q_p',
    'K_p=2.0\\times10^{-4}',
    'Fischer esterification',
    'acetic acid',
    'ethyl acetate',
    'solubility curve',
    'K_{sp}',
    'BaSO4',
  ],
  minDiagramSteps: 5,
};
