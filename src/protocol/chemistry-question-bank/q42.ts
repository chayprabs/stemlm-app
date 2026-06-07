import { chemGraph, cyclicVoltammogram, electrochemicalSeries } from '../chem-svg';
import type { ChemistryQuestionDef } from './types';

export const Q42: ChemistryQuestionDef = {
  id: 'q42',
  number: 42,
  topic: 'Electroanalytical Chemistry: CV, Randles-Sevcik, and Nyquist Analysis',
  question:
    'Electroanalytical chemistry: (a) Distinguish reversible and irreversible cyclic voltammograms. (b) Use Randles-Sevcik to compute peak current. (c) Interpret Nyquist plots to obtain solution and charge-transfer resistances and comment on diffusion control.',
  steps: [
    {
      title: 'Reversible cyclic voltammetry criteria',
      formula: '$$\\Delta E_p \\approx \\frac{59}{n}\\,\\text{mV at 298 K}$$',
      body: 'For a one-electron reversible redox couple, the theoretical separation is $\\Delta E_p=59/1=59\\,\\text{mV}$. If an experiment gives $E_{pa}=0.312\\,\\text{V}$ and $E_{pc}=0.254\\,\\text{V}$, then $\\Delta E_p=0.058\\,\\text{V}=58\\,\\text{mV}$, very close to reversible behavior with nearly matched anodic and cathodic peak currents.',
      diagram: cyclicVoltammogram(),
    },
    {
      title: 'Randles-Sevcik peak current for reversible diffusion control',
      formula:
        '$$i_p = 2.69\\times10^5\\,n^{3/2} A C D^{1/2} \\nu^{1/2}$$',
      body: 'Using $n=1$, electrode area $A=0.070\\,\\text{cm}^2$, concentration $C=1.0\\times10^{-6}\\,\\text{mol cm}^{-3}$, diffusion coefficient $D=7.0\\times10^{-6}\\,\\text{cm}^2\\text{s}^{-1}$, and scan rate $\\nu=0.10\\,\\text{V s}^{-1}$: $D^{1/2}=2.65\\times10^{-3}$ and $\\nu^{1/2}=0.316$. Therefore $i_p=2.69\\times10^5\\times1\\times0.070\\times1.0\\times10^{-6}\\times2.65\\times10^{-3}\\times0.316=1.58\\times10^{-5}\\,\\text{A}$ or $15.8\\,\\mu\\text{A}$.',
      diagram: chemGraph({
        xLabel: 'nu^1/2',
        yLabel: 'i_p',
        curves: [
          { d: 'M 50 125 L 250 55', stroke: '#1d4ed8', label: 'Randles-Sevcik linearity', labelPos: [145, 63] },
        ],
      }),
    },
    {
      title: 'Irreversible CV peak shift with scan rate',
      formula:
        '$$E_p = E^0 + \\frac{0.0565}{\\alpha n}\\log\\!\\left(\\frac{RTk^0}{\\alpha nF}\\right) + \\frac{0.0565}{\\alpha n}\\log \\nu$$',
      body: 'Take $\\alpha=0.50$ and $n=1$, so slope of $E_p$ versus $\\log\\nu$ is $0.0565/(0.50)=0.113\\,\\text{V per decade}$. Increasing scan rate from $0.10$ to $1.0\\,\\text{V s}^{-1}$ raises $\\log\\nu$ by 1 decade, so expected anodic peak shift is about $+113\\,\\text{mV}$, a hallmark of irreversible kinetics.',
      diagram: cyclicVoltammogram(),
    },
    {
      title: 'Nyquist semicircle gives Rs and Rct',
      formula: '$$Z(\\omega)=R_s+\\frac{R_{ct}}{1+j\\omega R_{ct}C_{dl}}$$',
      body: 'On a Nyquist plot, suppose the high-frequency intercept is $12\\,\\Omega$ and low-frequency semicircle intercept is $68\\,\\Omega$. Then solution resistance is $R_s=12\\,\\Omega$ and charge-transfer resistance is $R_{ct}=68-12=56\\,\\Omega$. The semicircle diameter directly gives $R_{ct}$.',
      diagram: chemGraph({
        xLabel: "Z' (ohm)",
        yLabel: "-Z'' (ohm)",
        curves: [
          {
            d: 'M 60 120 C 90 75 130 55 170 75 C 210 95 240 120 260 130',
            stroke: '#dc2626',
            label: 'Nyquist arc',
            labelPos: [155, 66],
          },
        ],
        points: [
          { x: 60, y: 120, label: 'Rs', fill: '#1d4ed8' },
          { x: 240, y: 120, label: 'Rs+Rct', fill: '#1d4ed8' },
        ],
      }),
    },
    {
      title: 'Warburg diffusion tail and diffusion coefficient estimate',
      formula:
        '$$i_p \\propto D^{1/2},\\quad D=\\left(\\frac{i_p}{2.69\\times10^5 n^{3/2}AC\\nu^{1/2}}\\right)^2$$',
      body: 'If a measured peak current is $i_p=12.0\\,\\mu\\text{A}=1.20\\times10^{-5}\\,\\text{A}$ with $n=1$, $A=0.070\\,\\text{cm}^2$, $C=1.0\\times10^{-6}\\,\\text{mol cm}^{-3}$, and $\\nu=0.10\\,\\text{V s}^{-1}$, then denominator before $D^{1/2}$ is $5.95\\times10^{-3}$. So $D^{1/2}=1.20\\times10^{-5}/5.95\\times10^{-3}=2.02\\times10^{-3}$ and $D=4.1\\times10^{-6}\\,\\text{cm}^2\\text{s}^{-1}$.',
      diagram: chemGraph({
        xLabel: "Z' (ohm)",
        yLabel: "-Z'' (ohm)",
        curves: [
          { d: 'M 60 120 C 95 78 130 60 170 76 C 205 92 230 112 242 120', stroke: '#dc2626', label: 'charge transfer', labelPos: [130, 58] },
          { d: 'M 242 120 L 275 88', stroke: '#1d4ed8', label: 'Warburg tail', labelPos: [250, 84] },
        ],
      }),
    },
    {
      title: 'Consistency with formal potential and electron transfer',
      formula: '$$E_{1/2}=\\frac{E_{pa}+E_{pc}}{2}$$',
      body: 'Using $E_{pa}=0.312\\,\\text{V}$ and $E_{pc}=0.254\\,\\text{V}$ gives $E_{1/2}=(0.312+0.254)/2=0.283\\,\\text{V}$. Comparing this formal potential to a known electrochemical series value helps validate the assigned redox couple and confirms whether the CV response is chemically reasonable.',
      diagram: electrochemicalSeries(),
      takeaway:
        'Reversible CV follows the 59/n mV rule and Randles-Sevcik scaling, while irreversible systems show peak shifts and often larger Nyquist arcs from slower charge transfer.',
    },
  ],
  solution:
    '**(a)** Reversible cyclic voltammograms show near-theoretical $\\Delta E_p$ and balanced peaks, whereas irreversible systems shift with scan rate and broaden. **(b)** Randles-Sevcik links $i_p$ to $n$, $A$, $C$, $D$, and $\\nu^{1/2}$ for diffusion-controlled responses. **(c)** Nyquist intercepts give $R_s$ and $R_{ct}$, while a 45-degree tail indicates Warburg diffusion. **(d)** Combining CV and EIS yields both kinetic and transport parameters.',
  verifiedPatterns: [
    'cyclic voltammogram',
    'reversible',
    'irreversible',
    'Randles-Sevcik',
    'Nyquist',
    'R_{ct}',
    'Warburg',
    'E_1/2',
  ],
  minDiagramSteps: 5,
};
