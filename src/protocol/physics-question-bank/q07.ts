import { physicsGraph, springMass } from '../physics-svg';
import type { PhysicsQuestionDef } from './types';

export const Q07: PhysicsQuestionDef = {
  id: 'q07',
  number: 7,
  topic: 'Damped Harmonic Oscillator',
  question:
    'Physics simple harmonic motion: mass m=0.5 kg on spring k=50 N/m with damping force Fd=-bẋ, b=2 N·s/m. (a) Equation of motion; classify damping. (b) ω0, γ, ωd. (c) x(t) for x(0)=0.1 m, ẋ(0)=0. (d) Time to 1/e amplitude; quality factor Q.',
  steps: [
    {
      title: 'Write the equation of motion',
      formula: '$$m\\ddot{x}+b\\dot{x}+kx=0$$',
      body: 'With $m=0.5\\,\\text{kg}$, $k=50\\,\\text{N/m}$, $b=2\\,\\text{N·s/m}$: $0.5\\ddot{x}+2\\dot{x}+50x=0$, or $\\ddot{x}+4\\dot{x}+100x=0$. Discriminant $16-400<0$ — underdamped oscillation.',
      diagram: springMass({ label: 'm=0.5kg', damped: true }),
    },
    {
      title: 'Classify damping and compute frequencies',
      formula:
        '$$\\omega_0=\\sqrt{k/m}=10\\,\\text{rad/s},\\ \\gamma=\\frac{b}{2m}=2\\,\\text{s}^{-1},\\ \\omega_d=\\sqrt{\\omega_0^2-\\gamma^2}=\\sqrt{96}=9.80\\,\\text{rad/s}$$',
      body: 'Since $\\gamma=2<\\omega_0=10$, we have $\\omega_d=\\sqrt{100-4}=9.80\\,\\text{rad/s}$ — underdamped with decaying oscillations.',
    },
    {
      title: 'Solve with initial conditions',
      formula:
        '$$x(t)=Ae^{-\\gamma t}\\cos(\\omega_d t+\\phi),\\quad A=0.1\\,\\text{m},\\ \\phi=0$$',
      body: 'With $x(0)=0.1\\,\\text{m}$ and $\\dot{x}(0)=0$: $x(t)=0.1\\,e^{-2t}\\cos(9.80\\,t)$ m. Envelope decays as $0.1\\,e^{-2t}$.',
      diagram: physicsGraph({
        curves: [
          { d: 'M 40 90 Q 80 50 120 90 T 200 90 T 280 90', label: 'x(t)', labelPos: [220, 75] },
          { d: 'M 40 50 L 280 130', stroke: '#dc2626', label: 'envelope', labelPos: [200, 125] },
        ],
        xLabel: 't (s)',
        yLabel: 'x (m)',
      }),
    },
    {
      title: 'Decay time and quality factor',
      formula:
        '$$t_{1/e}=\\frac{1}{\\gamma}=0.5\\,\\text{s},\\quad Q=\\frac{\\omega_0}{2\\gamma}=\\frac{10}{4}=2.5$$',
      body: 'Amplitude drops to $0.1/e\\approx0.037\\,\\text{m}$ at $t=0.5\\,\\text{s}$. Low $Q=2.5$ means heavily damped oscillations.',
      takeaway: 'Underdamped: oscillate with exponential envelope; $Q$ measures sharpness of resonance.',
    },
  ],
  solution:
    '**(a)** $m\\ddot{x}+b\\dot{x}+kx=0$ — underdamped. **(b)** $\\omega_0=10\\,\\text{rad/s}$, $\\gamma=2\\,\\text{s}^{-1}$, $\\omega_d=9.80\\,\\text{rad/s}$. **(c)** $x(t)=0.1\\,e^{-2t}\\cos(9.80\\,t)$ m. **(d)** $t_{1/e}=0.5\\,\\text{s}$, $Q=2.5$.',
  verifiedPatterns: ['\\omega_0=10', '9.80', 'Q=2.5', '0.5\\,\\text{s}'],
  minDiagramSteps: 2,
};
