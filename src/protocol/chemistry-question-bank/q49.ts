import { arrheniusPlot, chemGraph, energyProfile } from '../chem-svg';
import type { ChemistryQuestionDef } from './types';

export const Q49: ChemistryQuestionDef = {
  id: 'q49',
  number: 49,
  topic: 'Reaction Engineering: PFR vs CSTR, Conversion-Temperature, and RTD',
  question:
    'Reaction engineering: (a) Compare PFR and CSTR sizing for a first-order reaction. (b) Analyze conversion-temperature behavior for an exothermic system. (c) Interpret RTD curves and calculate mean residence metrics.',
  steps: [
    {
      title: 'Design equations for first-order PFR and CSTR',
      formula:
        '$$V_{PFR}=\\frac{F_{A0}}{k}\\ln\\!\\left(\\frac{1}{1-X}\\right),\\quad V_{CSTR}=\\frac{F_{A0}X}{k(1-X)}$$',
      body: 'For $F_{A0}=2.0\\,\\text{mol min}^{-1}$, $k=0.25\\,\\text{min}^{-1}$, and target conversion $X=0.80$: PFR volume is $V_{PFR}=(2.0/0.25)\\ln(1/0.20)=8\\times1.609=12.9\\,\\text{L}$. CSTR volume is $V_{CSTR}=2.0\\times0.80/[0.25\\times0.20]=32.0\\,\\text{L}$. Thus PFR is much smaller for the same conversion.',
      diagram: chemGraph({
        xLabel: 'conversion X',
        yLabel: 'required volume',
        curves: [
          { d: 'M 50 125 C 95 118 140 102 185 86 C 220 74 240 62 255 52', stroke: '#1d4ed8', label: 'PFR', labelPos: [220, 48] },
          { d: 'M 50 125 C 100 120 140 110 175 95 C 210 80 235 60 255 32', stroke: '#dc2626', label: 'CSTR', labelPos: [216, 27] },
        ],
      }),
    },
    {
      title: 'Space time and outlet concentration',
      formula:
        '$$\\tau=\\frac{V}{\\dot V_0},\\quad X=1-\\frac{C_A}{C_{A0}}$$',
      body: 'With volumetric flow $\\dot V_0=4.0\\,\\text{L min}^{-1}$ and PFR volume $12.9\\,\\text{L}$, residence time is $\\tau=12.9/4.0=3.23\\,\\text{min}$. If feed concentration is $C_{A0}=1.5\\,\\text{mol L}^{-1}$ and conversion is $X=0.80$, outlet concentration is $C_A=C_{A0}(1-X)=1.5\\times0.20=0.30\\,\\text{mol L}^{-1}$.',
      diagram: chemGraph({
        xLabel: 'reactor type',
        yLabel: 'tau',
        points: [
          { x: 110, y: 78, label: 'PFR 3.23 min', fill: '#1d4ed8' },
          { x: 210, y: 58, label: 'CSTR 8.00 min', fill: '#dc2626' },
        ],
      }),
    },
    {
      title: 'Conversion-temperature intersection for exothermic CSTR',
      formula:
        '$$Q_{gen}=(-\\Delta H_r)F_{A0}X,\\quad Q_{rem}=UA(T-T_c)$$',
      body: 'Take $-\\Delta H_r=80\\,\\text{kJ mol}^{-1}$, $F_{A0}=2.0\\,\\text{mol min}^{-1}$, and $X=0.65$, then heat generation is $Q_{gen}=80\\times2.0\\times0.65=104\\,\\text{kJ min}^{-1}$. If $UA=2.5\\,\\text{kJ min}^{-1}\\text{K}^{-1}$ and coolant is $T_c=320\\,\\text{K}$, matching $Q_{gen}$ requires $T=320+104/2.5=362\\,\\text{K}$.',
      diagram: chemGraph({
        xLabel: 'T',
        yLabel: 'heat rate',
        curves: [
          { d: 'M 50 125 C 95 120 140 95 180 62 C 210 40 235 30 255 24', stroke: '#dc2626', label: 'Qgen', labelPos: [210, 20] },
          { d: 'M 50 135 L 255 30', stroke: '#1d4ed8', label: 'Qrem', labelPos: [155, 64] },
        ],
      }),
    },
    {
      title: 'Temperature sensitivity of rate constant',
      formula:
        '$$\\ln\\!\\left(\\frac{k_2}{k_1}\\right)=\\frac{E_a}{R}\\left(\\frac{1}{T_1}-\\frac{1}{T_2}\\right)$$',
      body: 'For $E_a=65\\,\\text{kJ mol}^{-1}$, $T_1=340\\,\\text{K}$, and $T_2=370\\,\\text{K}$, exponent is $(65000/8.314)(1/340-1/370)=1.86$. Therefore $k_2/k_1=e^{1.86}=6.42$, so a moderate temperature rise can increase reaction rate by more than six times.',
      diagram: arrheniusPlot(),
    },
    {
      title: 'RTD functions for ideal PFR and ideal CSTR',
      formula:
        '$$E_{PFR}(t)=\\delta(t-\\tau),\\quad E_{CSTR}(t)=\\frac{1}{\\tau}e^{-t/\\tau}$$',
      body: 'For an ideal CSTR with $\\tau=5.0\\,\\text{min}$, exit-age value at $t=5$ min is $E(5)=0.2e^{-1}=0.0736\\,\\text{min}^{-1}$. At $t=10$ min, $E(10)=0.2e^{-2}=0.0271\\,\\text{min}^{-1}$. In contrast, ideal PFR gives a narrow impulse at exactly $t=\\tau$.',
      diagram: chemGraph({
        xLabel: 'time t',
        yLabel: 'E(t)',
        curves: [
          { d: 'M 60 130 L 130 130 L 130 45 L 132 130 L 250 130', stroke: '#1d4ed8', label: 'PFR', labelPos: [118, 40] },
          { d: 'M 60 60 C 90 72 120 90 150 105 C 190 120 220 126 250 130', stroke: '#dc2626', label: 'CSTR', labelPos: [165, 98] },
        ],
      }),
    },
    {
      title: 'Tanks-in-series model from RTD variance',
      formula:
        '$$N=\\frac{\\tau^2}{\\sigma_t^2}$$',
      body: 'If measured mean residence time is $\\tau=6.0\\,\\text{min}$ and variance is $\\sigma_t^2=9.0\\,\\text{min}^2$, then $N=6.0^2/9.0=36/9=4$. The reactor behaves like four equal CSTRs in series, which is intermediate between ideal CSTR and ideal PFR behavior.',
      diagram: energyProfile({
        title: 'RTD broadening vs ideal flow',
      }),
      takeaway:
        'PFR/CSTR sizing, thermal coupling, and RTD analysis are complementary tools for reactor design and diagnosis in reaction engineering.',
    },
  ],
  solution:
    '**(a)** For first-order conversion targets, PFR generally needs less volume than CSTR. **(b)** Exothermic reactors require simultaneous material and energy balances, often with multiple temperature-conversion intersections. **(c)** RTD curves reveal non-ideal flow and can be reduced to equivalent tanks-in-series models for design use.',
  verifiedPatterns: [
    'PFR',
    'CSTR',
    'conversion',
    'temperature',
    'RTD',
    'residence time',
    'Arrhenius',
    'tanks-in-series',
  ],
  minDiagramSteps: 5,
};
