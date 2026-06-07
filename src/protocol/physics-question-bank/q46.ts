import { wrapPhysicsSvg } from '../physics-svg';
import type { PhysicsQuestionDef } from './types';

export const Q46: PhysicsQuestionDef = {
  id: 'q46',
  number: 46,
  topic: 'Path Integral for a Free Particle',
  question:
    'Physics quantum path integral for a free electron wave: derive the propagator K(xb,t;xa,0), then evaluate magnitude and phase for xa=0, xb=1.0 nm, t=1.0 fs, and compare with the classical-action contribution.',
  steps: [
    {
      title: 'Write free-particle propagator from path integral',
      formula:
        '$$K(x_b,t;x_a,0)=\\sqrt{\\frac{m}{2\\pi i\\hbar t}}\\exp\\!\\left[\\frac{i m(x_b-x_a)^2}{2\\hbar t}\\right]$$',
      body: 'For an electron, $m=9.11\\times10^{-31}\\,\\text{kg}$. With $\\Delta x=x_b-x_a=1.0\\times10^{-9}\\,\\text{m}$ and $t=1.0\\times10^{-15}\\,\\text{s}$, the phase argument scale is finite and strongly oscillatory.',
      diagram: wrapPhysicsSvg(
        '<line x1="40" y1="140" x2="270" y2="140" stroke="#333" stroke-width="2"/>' +
          '<line x1="60" y1="130" x2="245" y2="45" stroke="#1d4ed8" stroke-width="2"/>' +
          '<path d="M 60 130 Q 110 35 170 90 Q 210 125 245 45" fill="none" stroke="#dc2626" stroke-width="2" stroke-dasharray="4 3"/>' +
          '<text x="50" y="125" font-size="11">xa=0</text>' +
          '<text x="236" y="42" font-size="11">xb=1.0 nm</text>' +
          '<text x="105" y="30" font-size="11">many quantum paths</text>',
      ),
    },
    {
      title: 'Evaluate amplitude magnitude',
      formula: '$$|K|=\\sqrt{\\frac{m}{2\\pi\\hbar t}}$$',
      body: 'Substituting values gives $|K|=\\sqrt{\\frac{9.11\\times10^{-31}}{2\\pi(1.055\\times10^{-34})(1.0\\times10^{-15})}}=1.17\\times10^9\\,\\text{m}^{-1}$. The propagator has dimensions of inverse length in 1D.',
    },
    {
      title: 'Compute quantum phase from classical action',
      formula:
        '$$\\phi=\\frac{m\\Delta x^2}{2\\hbar t}=\\frac{(9.11\\times10^{-31})(1.0\\times10^{-9})^2}{2(1.055\\times10^{-34})(1.0\\times10^{-15})}=4.32$$',
      body: 'The classical action is $S_{cl}=m\\Delta x^2/(2t)=4.56\\times10^{-34}\\,\\text{J·s}$ and $S_{cl}/\\hbar=4.32$. Thus $K=|K|e^{i4.32}$ with phase angle $4.32\\,\\text{rad}$.',
      diagram: wrapPhysicsSvg(
        '<circle cx="150" cy="90" r="55" fill="none" stroke="#334155" stroke-width="2"/>' +
          '<line x1="150" y1="90" x2="130" y2="39" stroke="#16a34a" stroke-width="2.5"/>' +
          '<circle cx="130" cy="39" r="4" fill="#16a34a"/>' +
          '<text x="133" y="38" font-size="11">phi=4.32 rad</text>' +
          '<text x="124" y="153" font-size="11">complex phase plane</text>',
      ),
    },
    {
      title: 'Relate to effective velocity scale',
      formula: '$$v_{cl}=\\frac{\\Delta x}{t}=\\frac{1.0\\times10^{-9}}{1.0\\times10^{-15}}=1.0\\times10^6\\,\\text{m/s}$$',
      body: 'This gives kinetic energy $E=\\tfrac12mv_{cl}^2=0.5(9.11\\times10^{-31})(1.0\\times10^6)^2=4.56\\times10^{-19}\\,\\text{J}=2.85\\,\\text{eV}$, consistent with a strongly quantum free-particle wave packet.',
      takeaway:
        'The free-particle path integral has a closed form: Gaussian amplitude and phase set by the classical action over \\hbar.',
    },
  ],
  solution:
    'For a free electron with $\\Delta x=1.0\\,\\text{nm}$ and $t=1.0\\,\\text{fs}$, the propagator is $K=\\sqrt{m/(2\\pi i\\hbar t)}\\exp[i m\\Delta x^2/(2\\hbar t)]$. Numerically, $|K|=1.17\\times10^9\\,\\text{m}^{-1}$ and phase $\\phi=4.32\\,\\text{rad}$ (with $S_{cl}=4.56\\times10^{-34}\\,\\text{J·s}$).',
  verifiedPatterns: ['|K|=1.17\\times10^9\\,\\text{m}^{-1}', '\\phi=4.32', 'S_{cl}=4.56\\times10^{-34}\\,\\text{J·s}', '1.0\\times10^6\\,\\text{m/s}'],
  minDiagramSteps: 2,
};
