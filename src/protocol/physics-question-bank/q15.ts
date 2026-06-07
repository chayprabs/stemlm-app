import { emInductionLoop, physicsGraph } from '../physics-svg';
import type { PhysicsQuestionDef } from './types';

export const Q15: PhysicsQuestionDef = {
  id: 'q15',
  number: 15,
  topic: 'Physics Magnetic Field Magnetostatics',
  question:
    'Physics magnetic field and force: (a) Find B at the center of a circular wire loop of radius R with steady charge flow I. (b) Find B inside and outside a long solenoid coil (turn density n). (c) Find B in a toroidal coil (N turns) as a function of radius r.',
  steps: [
    {
      title: 'Biot-Savart field at center of a circular loop',
      formula:
        '$$B_{\\text{center}}=\\frac{\\mu_0 I}{2R},\\qquad \\mu_0=4\\pi\\times10^{-7}\\,\\text{T·m/A}$$',
      body: 'For $I=5.0\\,\\text{A}$ and $R=0.080\\,\\text{m}$: $B=\\frac{(4\\pi\\times10^{-7})(5.0)}{2(0.080)}=3.93\\times10^{-5}\\,\\text{T}$ at the center along the loop axis.',
      diagram: physicsGraph({
        annotations:
          '<circle cx="150" cy="95" r="42" fill="none" stroke="#334155" stroke-width="2"/><text x="132" y="98" font-size="11">I loop</text><line x1="150" y1="95" x2="150" y2="45" stroke="#dc2626" stroke-width="2"/><text x="158" y="48" font-size="11" fill="#dc2626">B</text>',
        xLabel: 'x',
        yLabel: 'z',
      }),
    },
    {
      title: 'Long solenoid field from Ampere law',
      formula:
        '$$B_{\\text{inside}}\\approx\\mu_0 n I,\\qquad B_{\\text{outside}}\\approx0$$',
      body: 'With $n=1200\\,\\text{m}^{-1}$ and $I=2.0\\,\\text{A}$: $B_{\\text{inside}}=(4\\pi\\times10^{-7})(1200)(2.0)=3.02\\times10^{-3}\\,\\text{T}$, while outside is approximately $0\\,\\text{T}$ for an ideal long solenoid.',
      diagram: emInductionLoop(),
    },
    {
      title: 'Toroid field in different radial regions',
      formula:
        '$$B(r)=\\begin{cases}0,&r<a\\\\[1mm]\\dfrac{\\mu_0NI}{2\\pi r},&a<r<b\\\\[2mm]0,&r>b\\end{cases}$$',
      body: 'For $N=600$, $I=1.5\\,\\text{A}$, and $r=0.12\\,\\text{m}$ in the core: $B=\\frac{(4\\pi\\times10^{-7})(600)(1.5)}{2\\pi(0.12)}=1.50\\times10^{-3}\\,\\text{T}$.',
      diagram: physicsGraph({
        annotations:
          '<circle cx="150" cy="95" r="48" fill="none" stroke="#1d4ed8" stroke-width="2"/><circle cx="150" cy="95" r="25" fill="none" stroke="#1d4ed8" stroke-width="2"/><text x="205" y="98" font-size="11">a&lt;r&lt;b</text><text x="72" y="58" font-size="11">B~1/r</text>',
        xLabel: 'radial region',
        yLabel: 'B',
      }),
    },
    {
      title: 'Compare Physics scaling laws',
      formula:
        '$$B_{\\text{loop}}\\propto\\frac{I}{R},\\quad B_{\\text{solenoid}}\\propto nI,\\quad B_{\\text{toroid}}\\propto\\frac{NI}{r}$$',
      body: 'Using the computed numbers: $B_{\\text{loop}}=3.93\\times10^{-5}\\,\\text{T}$, $B_{\\text{solenoid}}=3.02\\times10^{-3}\\,\\text{T}$, $B_{\\text{toroid}}(0.12)=1.50\\times10^{-3}\\,\\text{T}$; geometry strongly controls magnetic field strength.',
      takeaway: 'Biot-Savart handles finite current elements, while Ampere law gives compact results for high-symmetry current distributions.',
    },
  ],
  solution:
    '**(a)** Circular loop center: $B=\\mu_0I/(2R)$, giving $B=3.93\\times10^{-5}\\,\\text{T}$ for $I=5\\,\\text{A}$, $R=0.08\\,\\text{m}$. **(b)** Long solenoid: $B_{\\text{inside}}\\approx\\mu_0nI=3.02\\times10^{-3}\\,\\text{T}$ and $B_{\\text{outside}}\\approx0$. **(c)** Toroid: $B=\\mu_0NI/(2\\pi r)$ for $a<r<b$, otherwise approximately zero.',
  verifiedPatterns: ['\\mu_0I/(2R)', '3.93\\times10^{-5}', '3.02\\times10^{-3}', '\\mu_0NI/(2\\pi r)'],
  minDiagramSteps: 3,
};
