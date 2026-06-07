import { wrapMathSvg } from '../math-svg';
import type { MathQuestionDef } from './types';

export const Q19: MathQuestionDef = {
  id: 'q19',
  number: 19,
  topic: 'Cauchy integral formula and contour evaluation',
  question:
    'Evaluate $$\\oint_{|z|=2}\\frac{e^z}{z^2(z-1)}\\,dz$$ and discuss $$\\oint_{|z-i|=2}\\frac{\\cos z}{(z^2+1)^2}\\,dz.$$ For the second integral, first determine where the poles lie relative to the contour.',
  steps: [
    {
      title: 'Decompose the first integrand into standard Cauchy terms',
      formula:
        '$$\\frac{1}{z^2(z-1)}=-\\frac1z-\\frac1{z^2}+\\frac1{z-1}$$\n$$\\frac{e^z}{z^2(z-1)}=-\\frac{e^z}{z}-\\frac{e^z}{z^2}+\\frac{e^z}{z-1}$$',
      body: 'At $z=2$, the left side is $1/(4\\cdot1)=1/4$, while the right side is $-1/2-1/4+1=1/4$. So the partial fraction split is correct and each term is ready for Cauchy\'s formula.',
      diagram: wrapMathSvg(
        [
          '<circle cx="150" cy="90" r="58" fill="none" stroke="#1d4ed8" stroke-width="2"/>',
          '<line x1="36" y1="90" x2="264" y2="90" stroke="#333" stroke-width="2"/>',
          '<line x1="150" y1="154" x2="150" y2="26" stroke="#333" stroke-width="2"/>',
          '<circle cx="150" cy="90" r="4" fill="#dc2626"/>',
          '<circle cx="179" cy="90" r="4" fill="#16a34a"/>',
          '<text x="158" y="80" font-size="12">0</text>',
          '<text x="188" y="80" font-size="12">1</text>',
          '<text x="218" y="38" font-size="12">|z|=2</text>',
        ].join(''),
      ),
    },
    {
      title: 'Evaluate the first contour integral',
      formula:
        '$$\\oint_{|z|=2}\\frac{e^z}{z^2(z-1)}\\,dz=2\\pi i\\bigl(-e^0-e^{\\prime}(0)+e^1\\bigr)=2\\pi i(e-2)$$',
      body: 'The three contributions are $-2\\pi i$ from the $1/z$ term, another $-2\\pi i$ from the $1/z^2$ term because $e^{\\prime}(0)=1$, and $2\\pi i e$ from the pole at $z=1$. Numerically, $e-2\\approx0.7183$, so the integral is about $4.513i$.',
      diagram: wrapMathSvg(
        [
          '<rect x="40" y="50" width="220" height="78" rx="8" fill="#f8fafc" stroke="#334155" stroke-width="2"/>',
          '<text x="150" y="84" font-size="18" text-anchor="middle">2 pi i (e - 2)</text>',
          '<text x="150" y="108" font-size="12" text-anchor="middle">sum of the enclosed Cauchy terms</text>',
        ].join(''),
      ),
    },
    {
      title: 'Inspect the second contour before integrating',
      formula:
        '$$\\frac{\\cos z}{(z^2+1)^2}=\\frac{\\cos z}{(z-i)^2(z+i)^2}$$\n$$|(-i)-i|=2$$',
      body: 'The circle is centered at $i$ with radius $2$. Since the distance from $i$ to $-i$ is exactly $2$, the pole at $z=-i$ lies on the contour. So, as written, this is not a standard contour integral unless one deforms the path or takes a principal value.',
      diagram: wrapMathSvg(
        [
          '<circle cx="170" cy="70" r="60" fill="none" stroke="#1d4ed8" stroke-width="2"/>',
          '<line x1="50" y1="110" x2="270" y2="110" stroke="#333" stroke-width="2"/>',
          '<line x1="110" y1="160" x2="110" y2="20" stroke="#333" stroke-width="2"/>',
          '<circle cx="170" cy="70" r="4" fill="#16a34a"/>',
          '<circle cx="170" cy="130" r="4" fill="#dc2626"/>',
          '<text x="178" y="64" font-size="12">i</text>',
          '<text x="182" y="144" font-size="12">-i on contour</text>',
        ].join(''),
      ),
    },
    {
      title: 'Deform slightly inward so that only the double pole at i remains inside',
      formula:
        '$$\\phi(z)=\\frac{\\cos z}{(z+i)^2},\\qquad \\oint\\frac{\\cos z}{(z^2+1)^2}\\,dz=\\oint\\frac{\\phi(z)}{(z-i)^2}\\,dz=2\\pi i\\,\\phi^{\\prime}(i)$$\n$$\\phi^{\\prime}(z)=-\\frac{\\sin z}{(z+i)^2}-\\frac{2\\cos z}{(z+i)^3}$$',
      body: 'At $z=i$, we have $(z+i)=2i$, $\\sin i=i\\sinh1$, and $\\cos i=\\cosh1$. Therefore $$\\phi^{\\prime}(i)=\\frac{i\\sinh1}{4}-\\frac{i\\cosh1}{4}=-\\frac{i}{4e},$$ since $\\sinh1-\\cosh1=-e^{-1}$.',
      diagram: wrapMathSvg(
        [
          '<circle cx="150" cy="90" r="54" fill="none" stroke="#16a34a" stroke-width="2"/>',
          '<circle cx="150" cy="90" r="4" fill="#dc2626"/>',
          '<text x="160" y="84" font-size="12">i only</text>',
          '<text x="150" y="28" font-size="12" text-anchor="middle">deformed contour</text>',
        ].join(''),
      ),
    },
    {
      title: 'Finish the second evaluation',
      formula:
        '$$2\\pi i\\,\\phi^{\\prime}(i)=2\\pi i\\left(-\\frac{i}{4e}\\right)=\\frac{\\pi}{2e}$$',
      body: 'Numerically, $\\pi/(2e)\\approx3.1416/(5.436)=0.578$. So the intended Cauchy-formula value, after deforming the contour away from the boundary pole at $-i$, is $\\pi/(2e)$.',
      diagram: wrapMathSvg(
        [
          '<rect x="48" y="54" width="204" height="72" rx="8" fill="#fef3c7" stroke="#d97706" stroke-width="2"/>',
          '<text x="150" y="84" font-size="18" text-anchor="middle">pi / (2e)</text>',
          '<text x="150" y="106" font-size="12" text-anchor="middle">value for the deformed contour</text>',
        ].join(''),
      ),
      takeaway: 'Always check whether the contour encloses a pole, misses it, or passes directly through it before applying Cauchy\'s formula.',
    },
  ],
  solution:
    'For the first contour, use $$\\frac{1}{z^2(z-1)}=-\\frac1z-\\frac1{z^2}+\\frac1{z-1}.$$ Then $$\\oint_{|z|=2}\\frac{e^z}{z^2(z-1)}\\,dz=-2\\pi ie^0-2\\pi ie^{\\prime}(0)+2\\pi ie^1=2\\pi i(e-2).$$ For the second contour, $$\\frac{\\cos z}{(z^2+1)^2}=\\frac{\\cos z}{(z-i)^2(z+i)^2},$$ and $$|(-i)-i|=2,$$ so the contour $|z-i|=2$ passes through the pole at $z=-i$. After a slight inward deformation that encloses only the double pole at $z=i$, set $$\\phi(z)=\\frac{\\cos z}{(z+i)^2}.$$ The generalized Cauchy formula gives $$\\oint\\frac{\\phi(z)}{(z-i)^2}\\,dz=2\\pi i\\,\\phi^{\\prime}(i),$$ where $$\\phi^{\\prime}(i)=-\\frac{i}{4e}.$$ Hence the deformed-contour value is $$\\frac{\\pi}{2e}.$$',
  verifiedPatterns: [
    '2\\pi i(e-2)',
    '|(-i)-i|=2',
    'passes through the pole at $z=-i$',
    '\\frac{\\pi}{2e}',
    '\\phi^{\\prime}(i)=-\\frac{i}{4e}',
  ],
  minDiagramSteps: 5,
};
