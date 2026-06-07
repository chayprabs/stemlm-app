import { numberLine, wrapMathSvg } from '../math-svg';
import type { MathQuestionDef } from './types';

export const Q20: MathQuestionDef = {
  id: 'q20',
  number: 20,
  topic: 'Residue theorem for real integrals',
  question:
    'Evaluate by residues $$\\int_{-\\infty}^{\\infty}\\frac{x^2}{(x^2+1)(x^2+4)}\\,dx$$ and $$\\int_0^{2\\pi}\\frac{d\\theta}{2+\\cos\\theta}.$$',
  steps: [
    {
      title: 'Split the rational integrand into simple quadratic pieces',
      formula:
        '$$\\frac{x^2}{(x^2+1)(x^2+4)}=-\\frac{1}{3(x^2+1)}+\\frac{4}{3(x^2+4)}$$',
      body: 'Checking at $x=1$ gives the left side $1/(2\\cdot5)=1/10$. The right side is $-1/6+4/15=(-5+8)/30=1/10$, so the decomposition is correct.',
      diagram: numberLine(
        [
          { pos: -2, label: '-2i / -2', color: '#dc2626' },
          { pos: -1, label: '-i / -1', color: '#1d4ed8' },
          { pos: 1, label: 'i / 1', color: '#1d4ed8' },
          { pos: 2, label: '2i / 2', color: '#dc2626' },
        ],
        [-2.5, 2.5],
      ),
    },
    {
      title: 'Sum the residues in the upper half-plane for the first integral',
      formula:
        '$$\\operatorname*{Res}_{z=i}\\frac{z^2}{(z^2+1)(z^2+4)}=\\frac{i}{6},\\qquad \\operatorname*{Res}_{z=2i}\\frac{z^2}{(z^2+1)(z^2+4)}=-\\frac{i}{3}$$\n$$\\int_{-\\infty}^{\\infty}\\frac{x^2}{(x^2+1)(x^2+4)}\\,dx=2\\pi i\\left(\\frac{i}{6}-\\frac{i}{3}\\right)=\\frac{\\pi}{3}$$',
      body: 'The residue sum is $i/6-i/3=-i/6$. Multiplying by $2\\pi i$ gives $2\\pi i(-i/6)=2\\pi/6=\\pi/3\\approx1.047$.',
      diagram: wrapMathSvg(
        [
          '<path d="M 34 126 L 266 126" fill="none" stroke="#333" stroke-width="2"/>',
          '<path d="M 34 126 A 116 116 0 0 1 266 126" fill="none" stroke="#1d4ed8" stroke-width="2"/>',
          '<circle cx="150" cy="68" r="4" fill="#1d4ed8"/>',
          '<circle cx="150" cy="40" r="4" fill="#dc2626"/>',
          '<text x="160" y="64" font-size="12">i</text>',
          '<text x="160" y="36" font-size="12">2i</text>',
        ].join(''),
      ),
    },
    {
      title: 'Convert the trigonometric integral to a unit-circle contour',
      formula:
        '$$z=e^{i\\theta},\\qquad \\cos\\theta=\\frac12\\left(z+\\frac1z\\right),\\qquad d\\theta=\\frac{dz}{iz}$$\n$$\\int_0^{2\\pi}\\frac{d\\theta}{2+\\cos\\theta}=\\oint_{|z|=1}\\frac{2}{i(z^2+4z+1)}\\,dz$$',
      body: 'The denominator becomes $2+\\frac12(z+z^{-1})=(z^2+4z+1)/(2z)$, and the extra $z$ cancels with $d\\theta=dz/(iz)$. At $z=-1$, the contour integrand is $2/(i(1-4+1))=-1/i=i/1$, confirming the transformed expression is finite on the unit circle.',
      diagram: wrapMathSvg(
        [
          '<circle cx="150" cy="90" r="58" fill="none" stroke="#16a34a" stroke-width="2"/>',
          '<line x1="34" y1="90" x2="266" y2="90" stroke="#333" stroke-width="2"/>',
          '<line x1="150" y1="154" x2="150" y2="26" stroke="#333" stroke-width="2"/>',
          '<text x="214" y="38" font-size="12">|z|=1</text>',
          '<text x="188" y="112" font-size="12">z=e^(i theta)</text>',
        ].join(''),
      ),
    },
    {
      title: 'Locate the pole inside the unit disk',
      formula:
        '$$z^2+4z+1=0\\qquad\\Rightarrow\\qquad z=-2\\pm\\sqrt3$$',
      body: 'Numerically, $-2+\\sqrt3\\approx-0.268$, so that pole lies inside $|z|=1$. The other root is $-2-\\sqrt3\\approx-3.732$, which lies outside the unit circle.',
      diagram: numberLine(
        [
          { pos: -3.732, label: '-2-sqrt3', color: '#dc2626' },
          { pos: -0.268, label: '-2+sqrt3', color: '#16a34a' },
          { pos: 1, label: '|z|=1 edge', color: '#333' },
        ],
        [-4, 1.2],
      ),
    },
    {
      title: 'Compute the residue for the trigonometric integral',
      formula:
        '$$\\operatorname*{Res}_{z=-2+\\sqrt3}\\frac{2}{i(z^2+4z+1)}=\\frac{2}{i(2z+4)}\\Bigg|_{z=-2+\\sqrt3}=\\frac{1}{i\\sqrt3}$$\n$$\\int_0^{2\\pi}\\frac{d\\theta}{2+\\cos\\theta}=2\\pi i\\cdot\\frac{1}{i\\sqrt3}=\\frac{2\\pi}{\\sqrt3}$$',
      body: 'Since $2z+4=2(-2+\\sqrt3)+4=2\\sqrt3$, the residue is $2/(i\\cdot2\\sqrt3)=1/(i\\sqrt3)$. Therefore the integral equals $2\\pi/\\sqrt3\\approx3.628$.',
      diagram: wrapMathSvg(
        [
          '<rect x="44" y="54" width="212" height="72" rx="8" fill="#fef3c7" stroke="#d97706" stroke-width="2"/>',
          '<text x="150" y="84" font-size="18" text-anchor="middle">2 pi / sqrt(3)</text>',
          '<text x="150" y="106" font-size="12" text-anchor="middle">unit-circle residue value</text>',
        ].join(''),
      ),
      takeaway: 'Residues convert both improper real integrals and trigonometric integrals into simple pole calculations in the complex plane.',
    },
  ],
  solution:
    'For the first integral, the integrand has upper-half-plane poles at $$z=i\\quad\\text{and}\\quad z=2i.$$ Their residues are $$\\operatorname*{Res}_{z=i}\\frac{z^2}{(z^2+1)(z^2+4)}=\\frac{i}{6},\\qquad \\operatorname*{Res}_{z=2i}\\frac{z^2}{(z^2+1)(z^2+4)}=-\\frac{i}{3}.$$ Hence $$\\int_{-\\infty}^{\\infty}\\frac{x^2}{(x^2+1)(x^2+4)}\\,dx=2\\pi i\\left(\\frac{i}{6}-\\frac{i}{3}\\right)=\\frac{\\pi}{3}.$$ For the second integral, let $$z=e^{i\\theta}.$$ Then $$\\int_0^{2\\pi}\\frac{d\\theta}{2+\\cos\\theta}=\\oint_{|z|=1}\\frac{2}{i(z^2+4z+1)}\\,dz.$$ The poles are at $$z=-2\\pm\\sqrt3,$$ and only $$z_0=-2+\\sqrt3$$ lies inside $$|z|=1.$$ Its residue is $$\\frac{2}{i(2z_0+4)}=\\frac{1}{i\\sqrt3},$$ so $$\\int_0^{2\\pi}\\frac{d\\theta}{2+\\cos\\theta}=2\\pi i\\cdot\\frac{1}{i\\sqrt3}=\\frac{2\\pi}{\\sqrt3}.$$',
  verifiedPatterns: ['\\frac{\\pi}{3}', '\\frac{2\\pi}{\\sqrt3}', '-2+\\sqrt3', '\\frac{i}{6}', '-\\frac{i}{3}'],
  minDiagramSteps: 5,
};
