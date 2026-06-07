import { physicsGraph, springMass } from '../physics-svg';
import type { PhysicsQuestionDef } from './types';

export const Q09: PhysicsQuestionDef = {
  id: 'q09',
  number: 9,
  topic: 'Coupled Oscillators Normal Modes',
  question:
    'Physics simple harmonic coupled oscillators: two masses m on springs k (wall-m1-spring-m2-wall) with coupling kc. (a) Equations of motion. (b) Normal mode frequencies ω1, ω2. (c) Physical description of modes. (d) General solution for beating.',
  steps: [
    {
      title: 'Draw the coupled spring system',
      body: 'Masses $m_1$ and $m_2$ each connect to walls via springs $k$ and to each other via coupling spring $k_c$.',
      diagram: springMass({ label: 'm1-m2' }),
    },
    {
      title: 'Write coupled equations of motion',
      formula:
        '$$m\\ddot{x}_1=-kx_1-k_c(x_1-x_2),\\quad m\\ddot{x}_2=-kx_2-k_c(x_2-x_1)$$',
      body: 'In matrix form with $k_c=k$: $\\ddot{\\mathbf{x}}=-(k/m)\\begin{pmatrix}2&-1\\\\-1&2\\end{pmatrix}\\mathbf{x}$ for equal wall springs and coupling.',
    },
    {
      title: 'Find normal mode frequencies',
      formula:
        '$$\\omega_1=\\sqrt{\\frac{k}{m}},\\quad \\omega_2=\\sqrt{\\frac{k+2k_c}{m}}$$',
      body: 'Symmetric mode ($x_1=x_2$): only outer springs stretch — $\\omega_1=\\sqrt{k/m}$. Antisymmetric ($x_1=-x_2$): coupling active — $\\omega_2=\\sqrt{(k+2k_c)/m}$. With $k=50$, $m=0.5$: $\\omega_1=10$, $\\omega_2=14.1\\,\\text{rad/s}$ if $k_c=k$.',
    },
    {
      title: 'Describe normal modes physically',
      body: 'Mode 1: masses move in phase (same direction) — coupling spring unstretched. Mode 2: masses move out of phase — coupling spring stretches/compresses maximally.',
      diagram: physicsGraph({
        annotations:
          '<text x="60" y="50" font-size="11">mode 1: x1=x2 (in phase)</text><text x="60" y="75" font-size="11">mode 2: x1=-x2 (out of phase)</text>',
      }),
    },
    {
      title: 'Beating from general initial conditions',
      formula:
        '$$x_1(t)=A\\cos\\omega_1 t,\\quad x_2(t)=A\\cos\\omega_1 t\\cdot\\text{(symmetric IC)}\\Rightarrow \\text{beat frequency }|\\omega_2-\\omega_1|$$',
      body: 'With $x_1(0)=A$, $x_2(0)=0$: energy transfers between masses. Beat period $T_b=2\\pi/|\\omega_2-\\omega_1|=1.57\\,\\text{s}$ when $\\omega_2-\\omega_1=4\\,\\text{rad/s}$.',
      takeaway: 'Coupling splits degeneracy; superposition of modes produces beats.',
    },
  ],
  solution:
    '**(a)** $m\\ddot{x}_1=-kx_1-k_c(x_1-x_2)$, same for $x_2$. **(b)** $\\omega_1=\\sqrt{k/m}$, $\\omega_2=\\sqrt{(k+2k_c)/m}$. **(c)** In-phase and out-of-phase modes. **(d)** Beats at $|\\omega_2-\\omega_1|$ when modes are superposed.',
  verifiedPatterns: ['\\omega_1=\\sqrt', '\\omega_2=\\sqrt', 'beat'],
  minDiagramSteps: 2,
};
