import { compressibilityFactor, maxwellBoltzmann, phaseDiagramWaterCo2 } from '../chem-svg';
import type { ChemistryQuestionDef } from './types';

export const Q05: ChemistryQuestionDef = {
  id: 'q05',
  number: 5,
  topic: 'Phase Behavior and Real Gas Models',
  question:
    'Phase diagrams and gas-distribution thermodynamics: (a) Interpret an overlaid water and CO2 phase diagram (triple point, critical point, and 1 atm paths). (b) Use Maxwell-Boltzmann distributions to compare most probable, mean, and rms speeds at different temperatures. (c) Analyze compressibility factor Z vs pressure to diagnose attractive and repulsive intermolecular regimes.',
  steps: [
    {
      title: 'Water and CO2 phase boundaries on one P-T map',
      formula: '$$Z_{\\text{phase rule}} = C - P + 2$$',
      body: 'At a triple point for a one-component system, $C=1$ and $P=3$, so degrees of freedom are $F=1-3+2=0$ (invariant). For water at 1 atm and 25 C, the state is liquid; for CO2 at 1 atm and -78.5 C, sublimation occurs because pressure is below CO2 triple-point pressure (about 5.1 atm).',
      diagram: phaseDiagramWaterCo2(),
    },
    {
      title: 'Why the water solid-liquid line has negative slope',
      formula: '$$\\frac{dP}{dT} = \\frac{\\Delta H_{fus}}{T\\,\\Delta V_{fus}}$$',
      body: 'For water melting near $T=273$ K, take $\\Delta H_{fus}=6.01\\times10^3$ J mol$^{-1}$ and $\\Delta V_{fus}=-1.6\\times10^{-6}$ m$^3$ mol$^{-1}$. Then $dP/dT=(6.01\\times10^3)/(273\\times-1.6\\times10^{-6})=-1.38\\times10^7$ Pa K$^{-1}$, negative because ice has larger molar volume than liquid water. CO2 has $\\Delta V_{fus}>0$, so its solid-liquid slope is positive.',
      diagram: phaseDiagramWaterCo2(),
      takeaway: 'Negative fusion-line slope is a signature anomaly of water density behavior.',
    },
    {
      title: 'Maxwell-Boltzmann characteristic speeds for N2',
      formula:
        '$$u_{mp}=\\sqrt{\\frac{2RT}{M}},\\quad \\bar{u}=\\sqrt{\\frac{8RT}{\\pi M}},\\quad u_{rms}=\\sqrt{\\frac{3RT}{M}}$$',
      body: 'Using $M=0.0280$ kg mol$^{-1}$ and $R=8.314$: at $T=300$ K, $u_{mp}=\\sqrt{(2\\times8.314\\times300)/0.0280}=422$ m s$^{-1}$, $\\bar{u}=476$ m s$^{-1}$, and $u_{rms}=517$ m s$^{-1}$. At $T=600$ K, each speed scales by $\\sqrt{600/300}=1.414$, so $u_{mp}=422\\times1.414=597$ m s$^{-1}$ and the curve shifts right and broadens.',
      diagram: maxwellBoltzmann(),
    },
    {
      title: 'High-energy tail fraction and reaction-rate impact',
      formula: '$$f(E\\ge E_a)\\propto e^{-E_a/(RT)}$$',
      body: 'With activation energy $E_a=50{,}000$ J mol$^{-1}$, at $T_1=300$ K exponent is $-E_a/(RT_1)=-50000/(8.314\\times300)=-20.05$, so factor is $e^{-20.05}=1.96\\times10^{-9}$. At $T_2=600$ K exponent is $-50000/(8.314\\times600)=-10.02$, giving $e^{-10.02}=4.45\\times10^{-5}$. Ratio is $(4.45\\times10^{-5})/(1.96\\times10^{-9})=2.27\\times10^4$, showing why rate rises steeply with temperature.',
      diagram: maxwellBoltzmann(),
    },
    {
      title: 'Compressibility factor Z versus pressure',
      formula: '$$Z = \\frac{PV}{nRT}$$',
      body: 'Example at 300 K for 1.00 mol: if $P=50.0$ bar and measured $V=0.420$ L, then $Z=(50.0\\times0.420)/(1.00\\times0.08314\\times300)=0.842<1$ so attractions dominate. At higher pressure, say $P=200$ bar and $V=0.160$ L, $Z=(200\\times0.160)/(0.08314\\times300)=1.28>1$, indicating short-range repulsion/excluded volume effects.',
      diagram: compressibilityFactor(),
    },
  ],
  solution:
    'The overlaid phase diagram shows water and CO2 differ strongly: water has a negative slope on the solid-liquid boundary and CO2 does not form a liquid at 1 atm. Maxwell-Boltzmann analysis gives u_mp < u_bar < u_rms and all increase as sqrt(T), while the high-energy tail fraction scales exponentially via exp(-Ea/RT). Real-gas behavior is captured by Z=PV/nRT: Z<1 signals attractive interactions and Z>1 signals repulsive/excluded-volume dominance at high pressure.',
  verifiedPatterns: [
    'triple point',
    'negative slope',
    'Maxwell-Boltzmann',
    'u_mp',
    'exp(-Ea/RT)',
    'Z=PV/nRT',
    'Z<1',
    'Z>1',
  ],
  minDiagramSteps: 5,
};
