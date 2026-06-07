import { wrapPhysicsSvg } from '../physics-svg';
import type { PhysicsQuestionDef } from './types';

export const Q48: PhysicsQuestionDef = {
  id: 'q48',
  number: 48,
  topic: 'Lorenz System and Chaotic Dynamics',
  question:
    'Physics nonlinear wave and energy-flow dynamics: for the Lorenz equations with sigma=10, rho=28, beta=8/3 and initial state (x,y,z)=(1,1,1), compute initial derivatives, fixed points, phase-space contraction, and predict error growth from a Lyapunov exponent.',
  steps: [
    {
      title: 'Evaluate derivatives at the initial state',
      formula:
        '$$\\dot x=\\sigma(y-x),\\quad \\dot y=x(\\rho-z)-y,\\quad \\dot z=xy-\\beta z$$',
      body: 'At $(1,1,1)$ with $(\\sigma,\\rho,\\beta)=(10,28,8/3)$: $\\dot x=10(1-1)=0$, $\\dot y=1(28-1)-1=26$, and $\\dot z=1\\cdot1-(8/3)=-1.67$.',
      diagram: wrapPhysicsSvg(
        '<line x1="35" y1="145" x2="270" y2="145" stroke="#333" stroke-width="2"/>' +
          '<line x1="35" y1="145" x2="35" y2="25" stroke="#333" stroke-width="2"/>' +
          '<path d="M 60 135 C 40 90 80 70 110 95 C 140 120 120 145 95 130 C 70 115 85 85 120 78 C 165 70 205 95 215 130 C 220 145 250 130 248 95 C 246 60 210 52 185 75 C 165 95 175 125 205 120" fill="none" stroke="#1d4ed8" stroke-width="2.2"/>' +
          '<text x="155" y="40" font-size="11">Lorenz attractor projection</text>',
      ),
    },
    {
      title: 'Compute equilibrium points',
      formula:
        '$$P_0=(0,0,0),\\qquad P_\\pm=\\left(\\pm\\sqrt{\\beta(\\rho-1)},\\pm\\sqrt{\\beta(\\rho-1)},\\rho-1\\right)$$',
      body: 'Here $\\beta(\\rho-1)=(8/3)\\times27=72$, so $\\sqrt{72}=8.49$. Therefore $P_+=(8.49,8.49,27)$ and $P_-=(-8.49,-8.49,27)$.',
    },
    {
      title: 'Find phase-space volume contraction rate',
      formula: '$$\\nabla\\cdot\\mathbf f=\\frac{\\partial\\dot x}{\\partial x}+\\frac{\\partial\\dot y}{\\partial y}+\\frac{\\partial\\dot z}{\\partial z}=-\\sigma-1-\\beta$$',
      body: 'Substituting numbers gives $\\nabla\\cdot\\mathbf f=-10-1-8/3=-13.67\\,\\text{s}^{-1}$. Since this is negative, phase-space volumes shrink exponentially as $V(t)=V_0e^{-13.67t}$.',
      diagram: wrapPhysicsSvg(
        '<rect x="70" y="45" width="80" height="60" fill="#bfdbfe" stroke="#1d4ed8" stroke-width="2"/>' +
          '<rect x="185" y="70" width="40" height="30" fill="#93c5fd" stroke="#1d4ed8" stroke-width="2"/>' +
          '<line x1="150" y1="75" x2="185" y2="85" stroke="#dc2626" stroke-width="2"/><polygon points="185,85 176,80 177,90" fill="#dc2626"/>' +
          '<text x="80" y="40" font-size="11">V0</text><text x="193" y="66" font-size="11">V(t)</text>' +
          '<text x="95" y="130" font-size="11">contraction = exp(-13.67 t)</text>',
      ),
    },
    {
      title: 'Estimate predictability horizon from Lyapunov growth',
      formula: '$$\\delta(t)=\\delta_0e^{\\lambda_1 t},\\qquad t_2=\\frac{\\ln2}{\\lambda_1}$$',
      body: 'Using a typical largest Lyapunov exponent $\\lambda_1\\approx0.90\\,\\text{s}^{-1}$ gives doubling time $t_2=\\ln2/0.90=0.77\\,\\text{s}$. A $1\\%$ initial uncertainty grows to $10\\%$ in $t=\\ln(10)/0.90=2.56\\,\\text{s}$.',
      takeaway:
        'Lorenz dynamics are deterministic yet chaotic: trajectories diverge exponentially while total phase-space volume contracts.',
    },
  ],
  solution:
    'For $(\\sigma,\\rho,\\beta)=(10,28,8/3)$ at $(1,1,1)$: $(\\dot x,\\dot y,\\dot z)=(0,26,-1.67)$. Equilibria are $P_0=(0,0,0)$ and $P_\\pm=(\\pm8.49,\\pm8.49,27)$. Divergence is $\\nabla\\cdot\\mathbf f=-13.67\\,\\text{s}^{-1}$, indicating dissipative contraction. With $\\lambda_1\\approx0.90\\,\\text{s}^{-1}$, uncertainty doubles in $0.77\\,\\text{s}$.',
  verifiedPatterns: ['(\\dot x,\\dot y,\\dot z)=(0,26,-1.67)', 'P_+=(8.49,8.49,27)', 'P_-=(-8.49,-8.49,27)', '\\nabla\\cdot\\mathbf f=-13.67', '0.77\\,\\text{s}'],
  minDiagramSteps: 2,
};
