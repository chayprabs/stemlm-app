import { physicsGraph } from '../physics-svg';
import type { PhysicsQuestionDef } from './types';

export const Q05: PhysicsQuestionDef = {
  id: 'q05',
  number: 5,
  topic: 'Lagrangian Mechanics Double Pendulum',
  question:
    'Double pendulum: m1 on rod l1, m2 on rod l2; angles θ1, θ2 from vertical. (a) Kinetic and potential energies (exact). (b) Lagrangian L=T-V. (c) Euler-Lagrange equations. (d) Small oscillations; normal mode frequencies for m1=m2=m, l1=l2=l.',
  steps: [
    {
      title: 'Write coordinates and kinetic energy',
      formula:
        '$$T=\\tfrac{1}{2}m_1 l_1^2\\dot\\theta_1^2+\\tfrac{1}{2}m_2\\left[l_1^2\\dot\\theta_1^2+l_2^2\\dot\\theta_2^2+2l_1l_2\\dot\\theta_1\\dot\\theta_2\\cos(\\theta_1-\\theta_2)\\right]$$',
      body: 'Positions: $x_1=l_1\\sin\\theta_1$, $y_1=-l_1\\cos\\theta_1$; $x_2=l_1\\sin\\theta_1+l_2\\sin\\theta_2$, etc. With $m_1=m_2=1\\,\\text{kg}$, $l_1=l_2=1\\,\\text{m}$, $T$ couples both angles.',
      diagram: physicsGraph({
        annotations:
          '<line x1="150" y1="30" x2="120" y2="90" stroke="#333" stroke-width="2"/><line x1="120" y1="90" x2="90" y2="140" stroke="#333" stroke-width="2"/><circle cx="120" cy="90" r="6" fill="#dbeafe"/><circle cx="90" cy="140" r="6" fill="#fef3c7"/><text x="125" y="85" font-size="11">m1</text><text x="75" y="155" font-size="11">m2</text><text x="155" y="60" font-size="10">θ1</text><text x="100" y="120" font-size="10">θ2</text>',
      }),
    },
    {
      title: 'Write gravitational potential energy',
      formula:
        '$$V=-m_1 g l_1\\cos\\theta_1-m_2 g(l_1\\cos\\theta_1+l_2\\cos\\theta_2)$$',
      body: 'Taking the pivot as $y=0$, $V=m_1 g l_1(1-\\cos\\theta_1)+m_2 g(l_1(1-\\cos\\theta_1)+l_2(1-\\cos\\theta_2))$ plus constants. With $g=9.8\\,\\text{m/s}^2$, $V$ depends on both angles.',
    },
    {
      title: 'Form the Lagrangian and Euler-Lagrange equations',
      formula: '$$\\mathcal{L}=T-V,\\quad \\frac{d}{dt}\\frac{\\partial\\mathcal{L}}{\\partial\\dot\\theta_i}-\\frac{\\partial\\mathcal{L}}{\\partial\\theta_i}=0$$',
      body: 'Two coupled nonlinear ODEs in $\\theta_1(t)$ and $\\theta_2(t)$ follow from $\\mathcal{L}$. With $g=9.8\\,\\text{m/s}^2$, the equations couple $\\ddot\\theta_1$ and $\\ddot\\theta_2$ through $\\sin(\\theta_1-\\theta_2)$ terms.',
    },
    {
      title: 'Linearize for small oscillations (equal masses and lengths)',
      formula:
        '$$\\omega_\\pm^2=\\frac{g}{l}(2\\pm\\sqrt{2})\\Rightarrow \\omega_+=\\sqrt{\\frac{g}{l}(2+\\sqrt{2})},\\ \\omega_-=\\sqrt{\\frac{g}{l}(2-\\sqrt{2})}$$',
      body: 'For $m_1=m_2=m$, $l_1=l_2=l$, small angles give two normal modes. With $l=1\\,\\text{m}$: $\\omega_+=4.76\\,\\text{rad/s}$, $\\omega_-=1.85\\,\\text{rad/s}$.',
      takeaway: 'Coupled pendulums have in-phase and out-of-phase normal modes with different frequencies.',
    },
  ],
  solution:
    '**(a)** $T$ and $V$ as above (exact). **(b)** $\\mathcal{L}=T-V$. **(c)** Two EL equations for $\\theta_1,\\theta_2$. **(d)** $\\omega_\\pm^2=(g/l)(2\\pm\\sqrt{2})$ for $m_1=m_2=m$, $l_1=l_2=l$.',
  verifiedPatterns: ['2+\\sqrt{2}', '2-\\sqrt{2}', '\\mathcal{L}=T-V'],
  minDiagramSteps: 1,
};
