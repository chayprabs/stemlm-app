import { physicsGraph } from '../physics-svg';
import type { PhysicsQuestionDef } from './types';

export const Q08: PhysicsQuestionDef = {
  id: 'q08',
  number: 8,
  topic: 'Driven Oscillator Resonance',
  question:
    'Same system as Q7, driven by F(t)=F0 cos(ωt), F0=5 N. (a) Steady-state amplitude A(ω) and phase φ(ω). (b) Resonance frequency ωres. (c) A(ωres) in terms of Q. (d) Sketch A(ω) for under/critical/over damped.',
  steps: [
    {
      title: 'Steady-state amplitude and phase',
      formula:
        '$$A(\\omega)=\\frac{F_0/m}{\\sqrt{(\\omega_0^2-\\omega^2)^2+(2\\gamma\\omega)^2}},\\quad \\tan\\phi=\\frac{2\\gamma\\omega}{\\omega_0^2-\\omega^2}$$',
      body: 'With $F_0=5\\,\\text{N}$, $m=0.5\\,\\text{kg}$, $\\omega_0=10$, $\\gamma=2$: at $\\omega=9\\,\\text{rad/s}$, $A=0.52\\,\\text{m}$ and $\\phi\\approx-95°$ (lags the drive).',
      diagram: physicsGraph({
        curves: [{ d: 'M 40 130 Q 120 40 200 50 T 280 120', label: 'A(ω)', labelPos: [120, 35] }],
        xLabel: 'ω',
        yLabel: 'A',
      }),
    },
    {
      title: 'Resonance frequency for damped driven oscillator',
      formula: '$$\\omega_{\\text{res}}=\\sqrt{\\omega_0^2-2\\gamma^2}=\\sqrt{100-8}=9.60\\,\\text{rad/s}$$',
      body: '$\\omega_{\\text{res}}=9.60\\,\\text{rad/s}$ is slightly below $\\omega_0=10\\,\\text{rad/s}$ because damping shifts the amplitude peak.',
    },
    {
      title: 'Peak amplitude in terms of Q',
      formula: '$$A(\\omega_{\\text{res}})\\approx\\frac{F_0}{2m\\gamma\\omega_0}=\\frac{Q F_0}{k}$$',
      body: 'With $Q=2.5$, $F_0=5\\,\\text{N}$, $k=50$: $A_{\\max}\\approx QF_0/k=0.25\\,\\text{m}$. Higher $Q$ means sharper, taller resonance.',
    },
    {
      title: 'Compare damping regimes',
      body: 'Underdamped ($\\gamma<\\omega_0$): peaked resonance curve. Critically damped ($\\gamma=\\omega_0$): no oscillation, broad low peak. Overdamped ($\\gamma>\\omega_0$): monotonic rise, no resonance peak.',
      diagram: physicsGraph({
        curves: [
          { d: 'M 40 130 Q 130 35 220 55 T 280 100', stroke: '#1d4ed8', label: 'under', labelPos: [130, 30] },
          { d: 'M 40 120 L 280 90', stroke: '#dc2626', label: 'over', labelPos: [200, 80] },
        ],
        xLabel: 'ω',
        yLabel: 'A',
      }),
      takeaway: 'Resonance peak shifts below ω₀ and scales with Q.',
    },
  ],
  solution:
    '**(a)** $A(\\omega)=F_0/(m\\sqrt{(\\omega_0^2-\\omega^2)^2+4\\gamma^2\\omega^2})$, $\\tan\\phi=2\\gamma\\omega/(\\omega_0^2-\\omega^2)$. **(b)** $\\omega_{\\text{res}}=\\sqrt{\\omega_0^2-2\\gamma^2}=9.60\\,\\text{rad/s}$. **(c)** $A_{\\max}\\approx QF_0/k$. **(d)** Underdamped: peak; critical/over: no sharp peak.',
  verifiedPatterns: ['9.60', 'QF_0/k', '\\omega_{\\text{res}}'],
  minDiagramSteps: 2,
};
