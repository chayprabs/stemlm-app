import { emInductionLoop, physicsGraph } from '../physics-svg';
import type { PhysicsQuestionDef } from './types';

export const Q16: PhysicsQuestionDef = {
  id: 'q16',
  number: 16,
  topic: 'Electromagnetic Induction and Magnetic Damping',
  question:
    'Physics magnetic field and kinetic energy: a rectangular loop (height l=0.20 m, resistance R=0.50 Ω) moves with velocity v=5.0 m/s into a uniform magnetic field B=0.80 T (into page). Using Faraday-Lenz law, find induced emf and loop direction, then compute the magnetic retarding force and verify conservation of energy. Finally, for a solenoid (N=200, radius 2.0 cm, length 0.40 m) carrying the same I, find its self-inductance L and stored magnetic field energy.',
  steps: [
    {
      title: 'Motional emf and Lenz-law direction',
      formula: '$$\\varepsilon = B\\ell v = (0.80)(0.20)(5.0)=0.80\\,\\text{V}$$',
      body: 'As the loop enters the magnetic field, flux into the page increases, so by Lenz law the induced field is out of the page. Therefore current is counterclockwise, and the induced emf is $\\varepsilon=0.80\\,\\text{V}$.',
      diagram: emInductionLoop(),
    },
    {
      title: 'Induced current and magnetic retarding force',
      formula:
        '$$I=\\frac{\\varepsilon}{R}=\\frac{0.80}{0.50}=1.60\\,\\text{A},\\quad F=B\\ell I=(0.80)(0.20)(1.60)=0.256\\,\\text{N}$$',
      body: 'The loop current is $I=1.60\\,\\text{A}$. The horizontal magnetic force on the leading side is $F=0.256\\,\\text{N}$ opposite motion, so it is a retarding force. Power check: $Fv=(0.256)(5.0)=1.28\\,\\text{W}$ and $I^2R=(1.60)^2(0.50)=1.28\\,\\text{W}$.',
      diagram: physicsGraph({
        curves: [{ d: 'M 40 130 L 260 40', label: 'F \\propto v', labelPos: [190, 45] }],
        xLabel: 'v',
        yLabel: 'F',
      }),
    },
    {
      title: 'Solenoid inductance from geometry',
      formula:
        '$$L=\\mu_0\\frac{N^2A}{\\ell_s}=(4\\pi\\times10^{-7})\\frac{(200)^2\\,\\pi(0.020)^2}{0.40}=1.58\\times10^{-4}\\,\\text{H}$$',
      body: 'Using $A=\\pi r^2=\\pi(0.020)^2=1.26\\times10^{-3}\\,\\text{m}^2$, the inductance is $L=1.58\\times10^{-4}\\,\\text{H}=0.158\\,\\text{mH}$.',
    },
    {
      title: 'Magnetic energy stored in the solenoid',
      formula: '$$U=\\tfrac12 LI^2=\\tfrac12(1.58\\times10^{-4})(1.60)^2=2.02\\times10^{-4}\\,\\text{J}$$',
      body: 'With the same current $I=1.60\\,\\text{A}$, the inductor stores $U=2.02\\times10^{-4}\\,\\text{J}$. This is magnetic potential energy associated with the field in the solenoid.',
      takeaway:
        'Induction converts mechanical work against magnetic force into electrical dissipation/storage while enforcing Lenz-law opposition.',
    },
  ],
  solution:
    '**EMF:** $\\varepsilon=B\\ell v=0.80\\,\\text{V}$. **Direction:** counterclockwise (to oppose increasing into-page flux). **Current:** $I=\\varepsilon/R=1.60\\,\\text{A}$. **Retarding force:** $F=B\\ell I=0.256\\,\\text{N}$ opposite motion. **Solenoid inductance:** $L=1.58\\times10^{-4}\\,\\text{H}$. **Stored energy:** $U=\\tfrac12LI^2=2.02\\times10^{-4}\\,\\text{J}$.',
  verifiedPatterns: [
    '\\varepsilon = B\\ell v',
    '0.80\\,\\text{V}',
    '1.60\\,\\text{A}',
    '0.256\\,\\text{N}',
    '1.58\\times10^{-4}\\,\\text{H}',
    '2.02\\times10^{-4}\\,\\text{J}',
  ],
  minDiagramSteps: 2,
};
