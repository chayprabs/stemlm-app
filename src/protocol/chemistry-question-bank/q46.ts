import { chemGraph, pnJunction, uvVisCurves, energyProfile } from '../chem-svg';
import type { ChemistryQuestionDef } from './types';

export const Q46: ChemistryQuestionDef = {
  id: 'q46',
  number: 46,
  topic: 'Photovoltaics: p-n Junction Solar Cells and Perovskite MAPbI3',
  question:
    'Photovoltaics: (a) Derive key performance relations for a p-n junction solar cell. (b) Compute efficiency from Voc, Jsc, and fill factor. (c) Explain why perovskite MAPbI3 is effective and perform simple optical/electronic calculations.',
  steps: [
    {
      title: 'Built-in potential of the p-n junction',
      formula:
        '$$V_{bi}=\\frac{k_B T}{q}\\ln\\!\\left(\\frac{N_A N_D}{n_i^2}\\right)$$',
      body: 'At $T=300\\,\\text{K}$, $k_B T/q=0.0259\\,\\text{V}$. For $N_A=1.0\\times10^{17}\\,\\text{cm}^{-3}$, $N_D=5.0\\times10^{16}\\,\\text{cm}^{-3}$, and $n_i=1.0\\times10^{10}\\,\\text{cm}^{-3}$, the logarithm term is $\\ln[(5.0\\times10^{33})/(1.0\\times10^{20})]=\\ln(5.0\\times10^{13})=31.54$. Thus $V_{bi}=0.0259\\times31.54=0.82\\,\\text{V}$.',
      diagram: pnJunction(),
    },
    {
      title: 'Illuminated diode equation and open-circuit voltage',
      formula:
        '$$I=I_{ph}-I_0\\left[\\exp\\!\\left(\\frac{qV}{nk_B T}\\right)-1\\right],\\quad V_{oc}=\\frac{nk_B T}{q}\\ln\\!\\left(\\frac{I_{ph}}{I_0}+1\\right)$$',
      body: 'With $n=1.2$, $I_{ph}=22\\,\\text{mA}$, and $I_0=2.0\\times10^{-9}\\,\\text{A}$, ratio is $I_{ph}/I_0=1.1\\times10^7$. Then $V_{oc}=1.2\\times0.0259\\times\\ln(1.1\\times10^7+1)=0.0311\\times16.21=0.50\\,\\text{V}$.',
      diagram: chemGraph({
        xLabel: 'V',
        yLabel: 'I',
        curves: [
          { d: 'M 50 45 C 90 48 130 55 170 75 C 210 95 235 120 255 130', stroke: '#dc2626', label: 'dark diode', labelPos: [180, 68] },
          { d: 'M 50 120 C 100 118 150 108 190 88 C 225 70 245 52 260 38', stroke: '#1d4ed8', label: 'illuminated IV', labelPos: [160, 102] },
        ],
      }),
    },
    {
      title: 'Power-conversion efficiency from Voc, Jsc, and fill factor',
      formula:
        '$$\\eta=\\frac{V_{oc}J_{sc}FF}{P_{in}}$$',
      body: 'For $V_{oc}=1.08\\,\\text{V}$, $J_{sc}=22.5\\,\\text{mA cm}^{-2}=0.0225\\,\\text{A cm}^{-2}$, $FF=0.80$, and $P_{in}=0.100\\,\\text{W cm}^{-2}$, output density is $1.08\\times0.0225\\times0.80=0.0194\\,\\text{W cm}^{-2}$. Efficiency is $0.0194/0.100=0.194$, or $19.4\\%$.',
      diagram: chemGraph({
        xLabel: 'V',
        yLabel: 'J',
        curves: [
          { d: 'M 55 35 L 55 118 L 240 118', stroke: '#16a34a', label: 'ideal rectangle', labelPos: [120, 32] },
          { d: 'M 55 52 C 110 55 150 72 185 92 C 210 106 225 114 240 118', stroke: '#1d4ed8', label: 'real JV', labelPos: [155, 86] },
        ],
        annotations: '<text x="65" y="145" font-size="9">FF = area(real)/area(rectangle)</text>',
      }),
    },
    {
      title: 'Perovskite MAPbI3 band gap from absorption edge',
      formula: '$$E_g(\\text{eV})\\approx\\frac{1240}{\\lambda_{edge}(\\text{nm})}$$',
      body: 'If MAPbI3 has absorption edge near $\\lambda_{edge}=780\\,\\text{nm}$, then $E_g=1240/780=1.59\\,\\text{eV}$. This band gap is close to the single-junction optimum and explains strong solar-spectrum utilization.',
      diagram: uvVisCurves(),
    },
    {
      title: 'Carrier collection versus diffusion length',
      formula:
        '$$\\eta_{col}=1-\\exp\\!\\left(-\\frac{L_D}{d}\\right)$$',
      body: 'With diffusion length $L_D=0.90\\,\\mu\\text{m}$ and absorber thickness $d=0.50\\,\\mu\\text{m}$, ratio is $L_D/d=1.8$. Then $\\eta_{col}=1-e^{-1.8}=1-0.165=0.835$, so about $83.5\\%$ of generated carriers are collected before recombination.',
      diagram: chemGraph({
        xLabel: 'thickness d',
        yLabel: 'collection',
        curves: [
          { d: 'M 50 125 C 90 95 130 75 180 62 C 220 55 240 52 255 50', stroke: '#1d4ed8', label: 'higher L_D gives higher collection', labelPos: [120, 56] },
        ],
      }),
    },
    {
      title: 'Moisture degradation kinetics in MAPbI3 devices',
      formula:
        '$$t_{1/2}=\\frac{0.693}{k}$$',
      body: 'If humidity-induced decomposition follows first-order loss with $k=0.023\\,\\text{h}^{-1}$, then half-life is $t_{1/2}=0.693/0.023=30.1\\,\\text{h}$. Encapsulation that lowers $k$ by a factor of 5 would increase half-life to about $151\\,\\text{h}$.',
      diagram: energyProfile({
        title: 'stability barrier engineering in perovskites',
      }),
      takeaway:
        'A photovoltaic device couples p-n junction electrostatics with absorber physics; MAPbI3 provides favorable band gap and transport but needs stability engineering.',
    },
  ],
  solution:
    '**(a)** The silicon **solar cell** p-n junction sets $V_{bi}$ and the diode-like illuminated IV response. **(b)** Device efficiency follows from $V_{oc}$ (open-circuit voltage), $J_{sc}$ (short-circuit current density), and fill factor under known irradiance. **(c)** The **perovskite** MAPbI3 absorber combines near-optimal band gap, strong absorption, and long diffusion lengths, but degradation kinetics must be controlled for durable high performance.',
  verifiedPatterns: [
    'p-n junction',
    'solar cell',
    'V_{oc}',
    'J_{sc}',
    'fill factor',
    'MAPbI3',
    'perovskite',
    'band gap',
  ],
  minDiagramSteps: 5,
};
