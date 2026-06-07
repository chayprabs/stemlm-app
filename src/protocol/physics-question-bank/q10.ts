import { standingWave } from '../physics-svg';
import type { PhysicsQuestionDef } from './types';

export const Q10: PhysicsQuestionDef = {
  id: 'q10',
  number: 10,
  topic: 'Wave Equation Standing Waves',
  question:
    'String L=1 m, μ=0.01 kg/m, tension T=100 N. (a) Wave speed v and fundamental f1. (b) Standing wave solution. (c) y(x,0)=0.02 sin(πx)-0.01 sin(3πx), ẏ(x,0)=0; find y(x,t). (d) Energy in each mode; fraction in fundamental.',
  steps: [
    {
      title: 'Compute wave speed and fundamental frequency',
      formula:
        '$$v=\\sqrt{\\frac{T}{\\mu}}=\\sqrt{\\frac{100}{0.01}}=100\\,\\text{m/s},\\quad f_1=\\frac{v}{2L}=50\\,\\text{Hz}$$',
      body: 'Linear density $\\mu=0.01\\,\\text{kg/m}$ and tension $T=100\\,\\text{N}$ give $v=100\\,\\text{m/s}$. Fundamental wavelength $\\lambda_1=2L=2\\,\\text{m}$, so $f_1=50\\,\\text{Hz}$.',
      diagram: standingWave(1, 'n=1 fundamental'),
    },
    {
      title: 'Write the general standing wave',
      formula:
        '$$y(x,t)=\\sum_n A_n\\sin\\!\\left(\\frac{n\\pi x}{L}\\right)\\cos(\\omega_n t+\\phi_n),\\quad \\omega_n=\\frac{n\\pi v}{L}$$',
      body: 'Fixed ends at $x=0$ and $x=L$ require $\\sin(n\\pi x/L)$ modes. For $L=1\\,\\text{m}$, $\\omega_1=100\\pi\\,\\text{rad/s}$, $\\omega_3=300\\pi\\,\\text{rad/s}$.',
    },
    {
      title: 'Match initial conditions',
      formula:
        '$$y(x,t)=0.02\\sin(\\pi x)\\cos(100\\pi t)-0.01\\sin(3\\pi x)\\cos(300\\pi t)$$',
      body: 'Initial displacement matches $n=1$ amplitude $0.02\\,\\text{m}$ and $n=3$ amplitude $0.01\\,\\text{m}$ with zero initial velocity ($\\phi_n=0$).',
      diagram: standingWave(3, 'n=3 harmonic'),
    },
    {
      title: 'Energy partition among modes',
      formula:
        '$$E_n\\propto A_n^2 n^2,\\quad \\frac{E_1}{E_{\\text{tot}}}=\\frac{0.02^2\\cdot1^2}{0.02^2+0.01^2\\cdot9}=\\frac{0.0004}{0.0013}=0.31$$',
      body: 'About $31\\%$ of total energy is in the fundamental ($n=1$); the $n=3$ mode carries $69\\%$ despite smaller amplitude because energy scales as $A_n^2 n^2$.',
      takeaway: 'Higher harmonics store more energy per unit amplitude due to the $n^2$ factor.',
    },
  ],
  solution:
    '**(a)** $v=100\\,\\text{m/s}$, $f_1=50\\,\\text{Hz}$. **(b)** $y=\\sum A_n\\sin(n\\pi x/L)\\cos(\\omega_n t+\\phi_n)$. **(c)** $y=0.02\\sin(\\pi x)\\cos(100\\pi t)-0.01\\sin(3\\pi x)\\cos(300\\pi t)$. **(d)** $E_1/E_{\\text{tot}}\\approx31\\%$.',
  verifiedPatterns: ['v=100', 'f_1=50', '0.31', '100\\pi'],
  minDiagramSteps: 2,
};
