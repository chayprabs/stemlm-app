import { arrheniusPlot, chemGraph, jablonskiDiagram, michaelisMenten } from '../chem-svg';
import type { ChemistryQuestionDef } from './types';

export const Q11: ChemistryQuestionDef = {
  id: 'q11',
  number: 11,
  topic: 'Chemical Kinetics',
  question:
    'Chemical reaction kinetics in physical chemistry: (a) Analyze N2O5 molecule decomposition concentration-time and first-order linear plots. (b) Use a Jablonski mechanism to discuss photophysical pathways and quantum yield. (c) Extract activation energy from an Arrhenius plot for a catalyzed reaction. (d) Apply Michaelis-Menten and Lineweaver-Burk kinetics to enzyme-catalyzed rates.',
  steps: [
    {
      title: 'N2O5 decomposition graph and first-order rate constant',
      formula: '$$\\ln\\!\\left(\\frac{[\\mathrm{N_2O_5}]_t}{[\\mathrm{N_2O_5}]_0}\\right)=-kt$$',
      body: 'For first-order decomposition of $\\mathrm{N_2O_5}$, $k$ is the rate constant and $t$ is time. Using $[\\mathrm{N_2O_5}]_0=0.100\\,\\text{M}$ and $[\\mathrm{N_2O_5}]_{300\\,\\text{s}}=0.047\\,\\text{M}$, $k=-\\ln(0.047/0.100)/300=2.52\\times10^{-3}\\,\\text{s}^{-1}$. The curved concentration-time plot therefore corresponds to exponential decay.',
      diagram: chemGraph({
        xLabel: 't (s)',
        yLabel: '[N2O5] (M)',
        curves: [
          {
            d: 'M 50 40 C 90 60 130 82 170 100 C 205 115 235 124 255 130',
            stroke: '#1d4ed8',
            label: 'first-order decay',
            labelPos: [170, 94],
          },
        ],
        points: [
          { x: 60, y: 45, label: '0.100 M', fill: '#1d4ed8' },
          { x: 170, y: 100, label: '0.047 M at 300 s', fill: '#dc2626' },
        ],
      }),
    },
    {
      title: 'Linearized kinetic plot and half-life check',
      formula: '$$t_{1/2}=\\frac{0.693}{k}$$',
      body: 'With $k=2.52\\times10^{-3}\\,\\text{s}^{-1}$ from the integrated plot, the half-life is $t_{1/2}=0.693/(2.52\\times10^{-3})=275\\,\\text{s}$. On a $\\ln[\\mathrm{N_2O_5}]$ versus $t$ graph, the slope is $-k=-2.52\\times10^{-3}\\,\\text{s}^{-1}$, and the intercept equals $\\ln[\\mathrm{N_2O_5}]_0=\\ln(0.100)=-2.303$.',
      diagram: chemGraph({
        xLabel: 't (s)',
        yLabel: 'ln[N2O5]',
        curves: [
          {
            d: 'M 50 40 L 250 130',
            stroke: '#dc2626',
            label: 'slope = -k',
            labelPos: [170, 78],
          },
        ],
        points: [
          { x: 60, y: 45, label: 'ln(0.100)', fill: '#dc2626' },
          { x: 170, y: 96, label: 't=300 s', fill: '#1d4ed8' },
        ],
      }),
    },
    {
      title: 'Jablonski mechanism and photochemical quantum yield',
      formula: '$$\\Phi=\\frac{\\text{molecules reacted}}{\\text{photons absorbed}}$$',
      body: 'In the Jablonski framework, absorption promotes $S_0\\to S_1$ (or $S_2$), then fluorescence, internal conversion, or intersystem crossing compete. If the experiment absorbs $2.4\\times10^{20}$ photons each second and gives $6.0\\times10^{19}$ molecules reacted each second, then $\\Phi=(6.0\\times10^{19})/(2.4\\times10^{20})=0.25$. So one chemical event occurs for one in four absorbed photons.',
      diagram: jablonskiDiagram(),
    },
    {
      title: 'Arrhenius plot to obtain activation energy',
      formula: '$$\\ln\\!\\left(\\frac{k_2}{k_1}\\right)=-\\frac{E_a}{R}\\left(\\frac{1}{T_2}-\\frac{1}{T_1}\\right)$$',
      body: 'Here $E_a$ is activation energy and $R=8.314\\,\\text{J mol}^{-1}\\text{K}^{-1}$. With $k_1=1.20\\times10^{-3}\\,\\text{s}^{-1}$ at $T_1=298\\,\\text{K}$ and $k_2=4.80\\times10^{-3}\\,\\text{s}^{-1}$ at $T_2=318\\,\\text{K}$, $\\ln(k_2/k_1)=\\ln 4=1.386$. Substitution gives $E_a=-(8.314)(1.386)/(1/318-1/298)=5.46\\times10^4\\,\\text{J mol}^{-1}=54.6\\,\\text{kJ mol}^{-1}$.',
      diagram: arrheniusPlot(),
    },
    {
      title: 'Michaelis-Menten rate estimate at finite substrate concentration',
      formula: '$$v_0=\\frac{V_{\\max}[S]}{K_m+[S]}$$',
      body: 'For an enzyme step, $V_{\\max}$ is maximum velocity and $K_m$ is the Michaelis constant. Using $V_{\\max}=120\\,\\mu\\text{mol min}^{-1}$, $K_m=0.40\\,\\text{mM}$, and $[S]=1.00\\,\\text{mM}$, the initial rate is $v_0=120(1.00)/(0.40+1.00)=85.7\\,\\mu\\text{mol min}^{-1}$. Since $[S]>K_m$, the velocity is above half-maximal but still below $V_{\\max}$.',
      diagram: michaelisMenten(),
    },
    {
      title: 'Lineweaver-Burk comparison for competitive inhibition',
      formula: '$$\\frac{1}{v_0}=\\frac{\\alpha K_m}{V_{\\max}}\\frac{1}{[S]}+\\frac{1}{V_{\\max}}$$',
      body: 'For competitive inhibition, $\\alpha>1$ increases apparent $K_m$ while $V_{\\max}$ is unchanged. With $\\alpha=2.0$, $K_m=0.40\\,\\text{mM}$, and $V_{\\max}=120\\,\\mu\\text{mol min}^{-1}$, the slope changes from $K_m/V_{\\max}=0.40/120=3.33\\times10^{-3}$ to $\\alpha K_m/V_{\\max}=0.80/120=6.67\\times10^{-3}$. At $[S]=1.00\\,\\text{mM}$, the inhibited rate is $v_0=120(1.00)/(0.80+1.00)=66.7\\,\\mu\\text{mol min}^{-1}$.',
      diagram: chemGraph({
        xLabel: '1/[S] (mM^-1)',
        yLabel: '1/v0 (min umol^-1)',
        curves: [
          {
            d: 'M 50 120 L 245 70',
            stroke: '#1d4ed8',
            label: 'no inhibitor',
            labelPos: [170, 82],
          },
          {
            d: 'M 50 130 L 245 70',
            stroke: '#dc2626',
            label: 'competitive inhibitor',
            labelPos: [150, 110],
          },
        ],
        annotations:
          '<text x="165" y="62" font-size="9">same y-intercept = 1/Vmax</text>',
      }),
      takeaway:
        'N2O5 decomposition follows first-order kinetics, Arrhenius analysis yields Ea, and enzyme rates reveal mechanism through Michaelis-Menten and Lineweaver-Burk behavior.',
    },
  ],
  solution:
    'For N2O5 decomposition, integrated first-order analysis gives $k=2.52\\times10^{-3}\\,\\text{s}^{-1}$ and $t_{1/2}=275\\,\\text{s}$. The Jablonski mechanism organizes radiative and non-radiative pathways, with the given data giving quantum yield $\\Phi=0.25$. Arrhenius treatment of two temperatures gives $E_a=54.6\\,\\text{kJ mol}^{-1}$. Enzyme kinetics with Michaelis-Menten gives $v_0=85.7\\,\\mu\\text{mol min}^{-1}$ at $[S]=1.00\\,\\text{mM}$, while competitive inhibition increases Lineweaver-Burk slope and lowers the rate to $66.7\\,\\mu\\text{mol min}^{-1}$.',
  verifiedPatterns: [
    'N2O5',
    'first-order',
    'Jablonski',
    'quantum yield',
    'Arrhenius',
    '54.6',
    'Michaelis-Menten',
    'Lineweaver-Burk',
    'competitive inhibition',
  ],
  minDiagramSteps: 5,
};
