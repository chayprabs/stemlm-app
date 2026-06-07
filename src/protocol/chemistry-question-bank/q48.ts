import { chemGraph, langmuirIsotherm } from '../chem-svg';
import type { ChemistryQuestionDef } from './types';

export const Q48: ChemistryQuestionDef = {
  id: 'q48',
  number: 48,
  topic: 'Colloid Science: Electrical Double Layer, CMC, and DLVO',
  question:
    'Colloid science: (a) Quantify electrical double-layer thickness and zeta potential effects. (b) Determine surfactant CMC from experimental trends. (c) Apply DLVO theory to predict aggregation stability.',
  steps: [
    {
      title: 'Electrical double layer and Debye length',
      formula:
        '$$\\kappa^{-1}(\\text{nm})\\approx\\frac{0.304}{\\sqrt{I(\\text{M})}}$$',
      body: 'For ionic strength $I=0.010\\,\\text{M}$, Debye length is $\\kappa^{-1}=0.304/\\sqrt{0.010}=0.304/0.100=3.04\\,\\text{nm}$. If salt rises to $0.10\\,\\text{M}$, $\\kappa^{-1}=0.304/0.316=0.96\\,\\text{nm}$, so screening compresses the electrical double layer strongly.',
      diagram: chemGraph({
        xLabel: 'distance from surface',
        yLabel: 'psi(x)',
        curves: [
          { d: 'M 50 45 C 95 70 140 92 190 108 C 220 116 240 121 255 125', stroke: '#1d4ed8', label: 'low ionic strength', labelPos: [155, 92] },
          { d: 'M 50 45 C 90 88 125 112 170 124 C 205 130 230 132 255 133', stroke: '#dc2626', label: 'high ionic strength', labelPos: [135, 118] },
        ],
      }),
    },
    {
      title: 'Electrophoretic mobility and zeta potential',
      formula:
        '$$\\mu_e=\\frac{\\varepsilon\\zeta}{\\eta}$$',
      body: 'Electrophoretic mobility is $\\mu_e=\\varepsilon\\zeta/\\eta$, where $\\varepsilon$ is permittivity, $\\zeta$ is zeta potential, and $\\eta$ is viscosity. With $\\varepsilon=6.95\\times10^{-10}\\,\\text{C V}^{-1}\\text{m}^{-1}$, $\\eta=1.00\\times10^{-3}\\,\\text{Pa s}$, and $\\mu_e=-3.0\\times10^{-8}\\,\\text{m}^2\\text{V}^{-1}\\text{s}^{-1}$, $\\zeta=\\mu_e\\eta/\\varepsilon=-0.043\\,\\text{V}$ or $-43\\,\\text{mV}$.',
      diagram: chemGraph({
        xLabel: 'zeta potential',
        yLabel: 'stability',
        curves: [
          { d: 'M 50 125 C 100 90 140 65 180 52 C 215 42 238 38 255 35', stroke: '#16a34a', label: '|zeta| increases stability', labelPos: [120, 46] },
        ],
      }),
    },
    {
      title: 'Determining surfactant CMC from conductivity break',
      formula:
        '$$\\text{CMC from slope-change in }\\kappa\\text{ vs }C$$',
      body: 'Suppose conductivity slope is $110\\,\\mu\\text{S mM}^{-1}$ below CMC and $38\\,\\mu\\text{S mM}^{-1}$ above CMC, with intersection at $C=8.2\\,\\text{mM}$. Then the surfactant CMC is $8.2\\,\\text{mM}$, indicating onset of micellization where added molecules mostly populate micelles.',
      diagram: chemGraph({
        xLabel: 'surfactant concentration',
        yLabel: 'conductivity',
        curves: [
          { d: 'M 50 125 L 160 70', stroke: '#1d4ed8', label: 'monomer region', labelPos: [72, 92] },
          { d: 'M 160 70 L 255 52', stroke: '#dc2626', label: 'micellar region', labelPos: [185, 60] },
        ],
        points: [{ x: 160, y: 70, label: 'CMC 8.2 mM', fill: '#16a34a' }],
      }),
    },
    {
      title: 'Langmuir surface coverage for surfactant adsorption',
      formula:
        '$$\\theta=\\frac{KC}{1+KC}$$',
      body: 'The **Langmuir** adsorption model gives $\\theta=KC/(1+KC)$. With $K=1.8\\,\\text{mM}^{-1}$ and $C=2.0\\,\\text{mM}$, $KC=3.6$ and coverage is $\\theta=3.6/(1+3.6)=0.783$, so the interface is about $78\\%$ covered prior to full monolayer saturation.',
      diagram: langmuirIsotherm(),
    },
    {
      title: 'DLVO interaction barrier and colloid stability',
      formula:
        '$$V_T(h)=V_R(h)+V_A(h)$$',
      body: 'At separation $h=2.0\\,\\text{nm}$, suppose electrostatic repulsion is $V_R=+22\\,k_B T$ and van der Waals attraction is $V_A=-8\\,k_B T$. Then net potential is $V_T=22-8=14\\,k_B T$. Since the barrier exceeds roughly $10\\,k_B T$, the dispersion is kinetically stable against rapid coagulation.',
      diagram: chemGraph({
        xLabel: 'separation h',
        yLabel: 'interaction energy',
        curves: [
          { d: 'M 50 40 C 95 60 135 90 180 122 L 250 132', stroke: '#dc2626', label: 'V_A', labelPos: [225, 126] },
          { d: 'M 50 130 C 90 105 120 82 150 72 C 180 68 210 82 250 110', stroke: '#1d4ed8', label: 'V_R', labelPos: [110, 74] },
          { d: 'M 50 120 C 90 92 125 70 155 64 C 185 62 215 73 250 98', stroke: '#16a34a', label: 'V_T', labelPos: [190, 66] },
        ],
      }),
    },
    {
      title: 'Critical coagulation concentration from Schulze-Hardy trend',
      formula:
        '$$\\text{CCC} \\propto z^{-6}$$',
      body: 'If monovalent counterion CCC is $80\\,\\text{mM}$, then for divalent ions CCC scales as $80\\times(1/2)^6=80/64=1.25\\,\\text{mM}$. This strong valence dependence explains why Ca2+ often coagulates negatively charged colloids far more efficiently than Na+.',
      diagram: chemGraph({
        xLabel: 'counterion valence z',
        yLabel: 'CCC',
        points: [
          { x: 100, y: 55, label: 'z=1, 80 mM', fill: '#1d4ed8' },
          { x: 170, y: 95, label: 'z=2, 1.25 mM', fill: '#dc2626' },
          { x: 240, y: 120, label: 'z=3, very low', fill: '#16a34a' },
        ],
      }),
      takeaway:
        'Electrical double-layer screening, CMC behavior, and DLVO barriers jointly determine whether a colloidal system remains dispersed or coagulates.',
    },
  ],
  solution:
    '**(a)** Double-layer thickness shrinks with ionic strength and directly affects electrostatic stabilization. **(b)** CMC is identified by a slope break in property-concentration plots and marks micelle formation. **(c)** DLVO theory combines repulsive and attractive energies; when the net barrier is high, colloids remain kinetically stable.',
  verifiedPatterns: [
    'electrical double layer',
    'Debye length',
    'zeta potential',
    'CMC',
    'micelle',
    'DLVO',
    'Langmuir',
    'coagulation',
  ],
  minDiagramSteps: 5,
};
