import { physicsGraph, sphericalShell } from '../physics-svg';
import type { PhysicsQuestionDef } from './types';

export const Q14: PhysicsQuestionDef = {
  id: 'q14',
  number: 14,
  topic: 'Physics Electrostatics Grounded Conducting Sphere',
  question:
    'Physics electric field boundary-value problem: A grounded conducting sphere of radius R is placed in a uniform external field E0 z-hat. (a) Apply boundary conditions and determine potential coefficients. (b) Write V(r,theta) inside and outside. (c) Find induced surface charge density sigma(theta). (d) Verify net induced charge.',
  steps: [
    {
      title: 'Set up boundary conditions for the grounded sphere',
      body: 'For electrostatic Physics with axial symmetry: $V(R,\\theta)=0$ (grounded conductor), $V\\to -E_0 r\\cos\\theta$ as $r\\to\\infty$, and field inside a conductor is zero so $V_{\\text{in}}=0$.',
      diagram: physicsGraph({
        annotations:
          '<circle cx="150" cy="95" r="42" fill="#e2e8f0" stroke="#334155" stroke-width="2"/><text x="136" y="100" font-size="11">V=0</text><line x1="35" y1="95" x2="95" y2="95" stroke="#1d4ed8" stroke-width="2"/><line x1="205" y1="95" x2="265" y2="95" stroke="#1d4ed8" stroke-width="2"/><line x1="35" y1="70" x2="95" y2="70" stroke="#1d4ed8" stroke-width="2"/><line x1="205" y1="70" x2="265" y2="70" stroke="#1d4ed8" stroke-width="2"/><line x1="35" y1="120" x2="95" y2="120" stroke="#1d4ed8" stroke-width="2"/><line x1="205" y1="120" x2="265" y2="120" stroke="#1d4ed8" stroke-width="2"/><text x="48" y="60" font-size="11">E0 z-hat</text>',
        xLabel: 'x',
        yLabel: 'z',
      }),
    },
    {
      title: 'Solve Laplace equation coefficients',
      formula:
        '$$V_{\\text{out}}(r,\\theta)=-E_0 r\\cos\\theta+\\frac{A_1\\cos\\theta}{r^2},\\quad V(R,\\theta)=0\\Rightarrow A_1=E_0R^3$$',
      body: 'For $E_0=5.0\\times10^3\\,\\text{V/m}$ and $R=0.10\\,\\text{m}$: $A_1=E_0R^3=5.0\\times10^3\\times(0.10)^3=5.0\\,\\text{V·m}^2$.',
    },
    {
      title: 'Write final potential inside and outside',
      formula:
        '$$V_{\\text{in}}=0,\\qquad V_{\\text{out}}=-E_0\\cos\\theta\\left(r-\\frac{R^3}{r^2}\\right)$$',
      body: 'Numeric check at $r=0.20\\,\\text{m},\\theta=0$: $V=-5.0\\times10^3\\left(0.20-\\frac{0.001}{0.04}\\right)=-5.0\\times10^3(0.175)=-875\\,\\text{V}$; at $\\theta=90^\\circ$, $\\cos\\theta=0$ gives $V=0$.',
      diagram: sphericalShell('R', '2R'),
    },
    {
      title: 'Induced surface charge density on the conductor',
      formula:
        '$$\\sigma(\\theta)=\\varepsilon_0E_r(R,\\theta)=\\varepsilon_0\\left[-\\frac{\\partial V}{\\partial r}\\right]_{r=R}=3\\varepsilon_0E_0\\cos\\theta$$',
      body: 'At $\\theta=0$: $\\sigma_{\\max}=3\\varepsilon_0E_0=3(8.854\\times10^{-12})(5.0\\times10^3)=1.33\\times10^{-7}\\,\\text{C/m}^2$; at $\\theta=\\pi$, $\\sigma=-1.33\\times10^{-7}\\,\\text{C/m}^2$.',
    },
    {
      title: 'Verify total induced charge is zero',
      formula:
        '$$Q_{\\text{ind}}=\\int\\sigma\\,dA=3\\varepsilon_0E_0R^2\\int_0^{2\\pi}\\!d\\phi\\int_0^{\\pi}\\cos\\theta\\sin\\theta\\,d\\theta=0$$',
      body: 'The angular integral gives $\\int_0^{\\pi}\\cos\\theta\\sin\\theta\\,d\\theta=0$, so positive and negative induced charges cancel: $Q_{\\text{ind}}=0\\,\\text{C}$.',
      takeaway: 'A grounded sphere in a uniform field acquires a dipolar charge pattern with zero net charge.',
    },
  ],
  solution:
    '**(a)** Apply $V(R,\\theta)=0$ and $V\\to -E_0r\\cos\\theta$ to get $A_1=E_0R^3$. **(b)** $V_{\\text{in}}=0$, $V_{\\text{out}}=-E_0\\cos\\theta\\left(r-R^3/r^2\\right)$. **(c)** $\\sigma(\\theta)=3\\varepsilon_0E_0\\cos\\theta$. **(d)** Total induced charge is zero by angular symmetry.',
  verifiedPatterns: ['A_1=E_0R^3', 'V_{\\text{in}}=0', '3\\varepsilon_0E_0\\cos\\theta', 'Q_{\\text{ind}}=0'],
  minDiagramSteps: 2,
};
