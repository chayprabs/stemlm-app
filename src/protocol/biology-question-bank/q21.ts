import { populationGrowth, wrapBioSvg } from '../biology-svg';
import type { BiologyQuestionDef } from './types';

export const Q21: BiologyQuestionDef = {
  id: 'q21',
  number: 21,
  topic: 'Population Growth Models and Regulation',
  question:
    'In population ecology, compare the exponential growth equation and logistic growth equation, interpret growth curves, classify scenarios with r>0, r=0, and r<0, and distinguish density-dependent from density-independent factors.',
  steps: [
    {
      title: 'Set up exponential and logistic growth equations',
      formula:
        '$$\\frac{dN}{dt}=rN\\;\\text{(exponential)},\\qquad \\frac{dN}{dt}=rN\\left(1-\\frac{N}{K}\\right)\\;\\text{(logistic)}$$',
      body: 'N is population size, r is per-capita growth rate, and K is carrying capacity. Example at N=200, r=0.10, K=500: exponential dN/dt = 0.10x200 = 20, while logistic dN/dt = 0.10x200x(1-200/500) = 12. Exponential growth assumes unlimited resources, while logistic growth includes resource limitation via (1-N/K).',
      diagram: wrapBioSvg(
        '<rect x="16" y="26" width="268" height="122" fill="#f8fafc" stroke="#334155"/>' +
          '<line x1="16" y1="56" x2="284" y2="56" stroke="#334155"/>' +
          '<line x1="150" y1="26" x2="150" y2="148" stroke="#334155"/>' +
          '<text x="84" y="46" font-size="11" text-anchor="middle">exponential</text>' +
          '<text x="216" y="46" font-size="11" text-anchor="middle">logistic</text>' +
          '<text x="24" y="80" font-size="9">dN/dt = rN</text>' +
          '<text x="24" y="98" font-size="9">unlimited resources</text>' +
          '<text x="24" y="116" font-size="9">J-shaped curve</text>' +
          '<text x="158" y="80" font-size="9">dN/dt = rN(1-N/K)</text>' +
          '<text x="158" y="98" font-size="9">resource limitation</text>' +
          '<text x="158" y="116" font-size="9">S-shaped curve, approaches K</text>',
      ),
    },
    {
      title: 'Compute an exponential prediction from initial size',
      formula:
        '$$N_t=N_0e^{rt}$$\n$$N_0=120,\\;r=0.25\\,\\text{yr}^{-1},\\;t=8\\,\\text{yr}\\Rightarrow N_t=120e^{0.25\\times 8}=120e^2$$',
      body: 'Numerically, N_t = 120e^2 = 120x7.389 = 886.7, so N_t about 887 individuals under ideal exponential conditions.',
    },
    {
      title: 'Compute a logistic prediction and compare with K',
      formula:
        '$$N_t=\\frac{K}{1+\\left(\\frac{K-N_0}{N_0}\\right)e^{-rt}}$$\n$$K=1000,\\;N_0=120,\\;r=0.25,\\;t=8$$',
      body: 'Substitute values: (K-N0)/N0 = (1000-120)/120 = 7.333 and e^(-rt) = e^(-2) = 0.135. Denominator = 1 + 7.333x0.135 = 1.99, so N_t = 1000/1.99 = 502.5 about 503, much lower than exponential because density effects slow growth.',
      diagram: populationGrowth(),
    },
    {
      title: 'Interpret r>0, r=0, and r<0 from birth and death rates',
      formula:
        '$$r=b-d$$\n$$b=0.34,\\;d=0.20\\Rightarrow r=+0.14;\\quad b=0.22,\\;d=0.22\\Rightarrow r=0;\\quad b=0.18,\\;d=0.27\\Rightarrow r=-0.09$$',
      body: 'If r=+0.14 the population increases, if r=0 it is approximately stable, and if r=-0.09 it declines. The sign of r directly predicts long-term trajectory when other parameters are fixed.',
    },
    {
      title: 'Separate density-dependent and density-independent controls',
      body: 'Density-dependent factors intensify as N increases (competition, disease transmission, predation), whereas density-independent factors act regardless of N (drought, wildfire, frost). Both can act simultaneously, but only density-dependent feedback produces the classic leveling near K.',
      diagram: wrapBioSvg(
        '<rect x="14" y="24" width="272" height="126" fill="#f8fafc" stroke="#334155"/>' +
          '<line x1="150" y1="24" x2="150" y2="150" stroke="#334155"/>' +
          '<line x1="14" y1="52" x2="286" y2="52" stroke="#334155"/>' +
          '<text x="82" y="44" font-size="10" text-anchor="middle">density-dependent</text>' +
          '<text x="218" y="44" font-size="10" text-anchor="middle">density-independent</text>' +
          '<text x="22" y="74" font-size="9">competition for food</text>' +
          '<text x="22" y="94" font-size="9">infectious disease spread</text>' +
          '<text x="22" y="114" font-size="9">predation pressure</text>' +
          '<text x="22" y="134" font-size="9">waste accumulation</text>' +
          '<text x="158" y="74" font-size="9">heat wave</text>' +
          '<text x="158" y="94" font-size="9">flood or storm event</text>' +
          '<text x="158" y="114" font-size="9">seasonal frost</text>' +
          '<text x="158" y="134" font-size="9">volcanic ash input</text>',
      ),
    },
    {
      title: 'Write an exam-ready comparison statement',
      body: 'Use exponential growth when resources are effectively unlimited and logistic growth when carrying capacity constrains growth. Always report the sign of r and identify whether the main limiting factor is density-dependent or density-independent.',
      takeaway:
        'High-yield pairing: dN/dt=rN (J-curve) versus dN/dt=rN(1-N/K) (S-curve approaching K).',
    },
  ],
  solution:
    'Exponential growth follows dN/dt=rN and predicts N_t=N_0e^{rt} under unlimited resources. Logistic growth follows dN/dt=rN(1-N/K), so growth slows as N approaches K. Example calculations: with N0=120, r=0.25, t=8, exponential gives N about 887, while logistic with K=1000 gives N about 503. The sign of r determines trajectory: r>0 increase, r=0 stability, r<0 decline. Density-dependent factors include competition and disease; density-independent factors include weather extremes and natural disasters.',
  verifiedPatterns: ['dN/dt', 'rN', 'rN(1-N/K)', 'carrying capacity', 'r>0', 'density-dependent'],
  minDiagramSteps: 3,
};
