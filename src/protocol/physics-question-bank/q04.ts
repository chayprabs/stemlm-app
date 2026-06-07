import { physicsGraph } from '../physics-svg';
import type { PhysicsQuestionDef } from './types';

export const Q04: PhysicsQuestionDef = {
  id: 'q04',
  number: 4,
  topic: 'Central Force Orbits',
  question:
    'A particle of mass m moves under central force F(r)=-k/r². (a) Show L=mr²θ̇ is conserved. (b) Derive orbit equation with u=1/r. (c) Solve r(θ) and identify conic; eccentricity conditions. (d) Period for circular orbit r₀; verify Kepler third law.',
  steps: [
    {
      title: 'Show angular momentum is conserved',
      formula: '$$\\tau=\\mathbf{r}\\times\\mathbf{F}=0\\Rightarrow \\frac{dL}{dt}=0,\\quad L=mr^2\\dot\\theta$$',
      body: 'For a central force $\\mathbf{F}(r)\\hat{r}$, torque vanishes because $\\mathbf{r}\\parallel\\mathbf{F}$. Thus $L=mr^2\\dot\\theta=\\text{const}$; with $m=1\\,\\text{kg}$, $L$ is fixed by initial conditions.',
      diagram: physicsGraph({
        curves: [{ d: 'M 60 120 Q 150 40 250 100', label: 'orbit', labelPos: [150, 35] }],
        annotations: '<text x="230" y="115" font-size="11">focus</text>',
      }),
    },
    {
      title: 'Substitute u=1/r into the radial equation',
      formula: '$$\\frac{d^2u}{d\\theta^2}+u=\\frac{mk}{L^2}$$',
      body: 'Using $u=1/r$ and eliminating time via $L=mr^2\\dot\\theta$, the Binet equation gives a harmonic oscillator in $u(\\theta)$ with constant driving $mk/L^2$.',
    },
    {
      title: 'Solve for r(θ) and classify the conic',
      formula:
        '$$r(\\theta)=\\frac{L^2/mk}{1+e\\cos\\theta},\\quad e=\\sqrt{1+\\frac{2EL^2}{mk^2}}$$',
      body: 'Ellipse: $0\\le e<1$; parabola: $e=1$; hyperbola: $e>1$. For $e=0$, $r=L^2/(mk)=\\text{const}$ — a circle.',
    },
    {
      title: 'Orbital period for a circular orbit',
      formula:
        '$$T=\\frac{2\\pi r_0}{v}=2\\pi\\sqrt{\\frac{m r_0^3}{k}}\\Rightarrow T^2=\\frac{4\\pi^2 m}{k}\\,r_0^3$$',
      body: 'Centripetal balance: $mv^2/r_0=k/r_0^2$. With $r_0=1\\,\\text{AU}$ and appropriate $k$, $T=1\\,\\text{yr}$ — Kepler third law $T^2\\propto r_0^3$.',
      takeaway: 'Inverse-square forces produce conic orbits; closed orbits require $e<1$.',
    },
  ],
  solution:
    '**(a)** Central force $\\Rightarrow$ zero torque $\\Rightarrow$ $L=mr^2\\dot\\theta$ conserved. **(b)** $u\'\'+u=mk/L^2$. **(c)** $r=L^2/(mk(1+e\\cos\\theta))$; ellipse ($e<1$), parabola ($e=1$), hyperbola ($e>1$). **(d)** $T=2\\pi\\sqrt{mr_0^3/k}$, so $T^2\\propto r_0^3$.',
  verifiedPatterns: ['\\frac{d^2u}{d\\theta^2}+u', 'T^2', 'r_0^3', 'e<1'],
  minDiagramSteps: 1,
};
