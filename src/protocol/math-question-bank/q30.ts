import { wrapMathSvg } from '../math-svg';
import type { MathQuestionDef } from './types';

export const Q30: MathQuestionDef = {
  id: 'q30',
  number: 30,
  topic: 'Laplace equation on a disk from Fourier boundary data',
  question:
    'Solve Laplace\'s equation in the disk $0\\le r<a$ with boundary condition $$u(a,\\theta)=1+3\\cos\\theta-2\\sin 2\\theta.$$ Give the harmonic function $u(r,\\theta)$ that is regular at the center.',
  steps: [
    {
      title: 'Write the regular harmonic Fourier expansion in polar coordinates',
      formula:
        '$$u(r,\\theta)=A_0+\\sum_{n=1}^\\infty \\left(\\frac{r}{a}\\right)^n\\bigl(A_n\\cos n\\theta+B_n\\sin n\\theta\\bigr)$$',
      body: 'Regularity at $r=0$ removes the singular radial terms $r^{-n}$. As a quick check, when $r=0$ every term with $n\\ge 1$ vanishes, so the center value is just $u(0,\\theta)=A_0$.',
      diagram: wrapMathSvg(
        [
          '<circle cx="150" cy="90" r="56" fill="#eff6ff" stroke="#1d4ed8" stroke-width="2"/>',
          '<circle cx="150" cy="90" r="4" fill="#dc2626"/>',
          '<line x1="150" y1="90" x2="206" y2="90" stroke="#333" stroke-width="2"/>',
          '<text x="180" y="82" font-size="12">r</text>',
          '<text x="150" y="28" font-size="13" text-anchor="middle">regular at the center</text>',
          '<text x="214" y="94" font-size="12">a</text>',
        ].join(''),
      ),
    },
    {
      title: 'Match the boundary coefficients term by term',
      formula:
        '$$u(a,\\theta)=A_0+A_1\\cos\\theta+B_2\\sin 2\\theta$$\n$$A_0=1,\\qquad A_1=3,\\qquad B_2=-2,$$',
      body: 'There is no $\\cos 2\\theta$ term and no $\\sin\\theta$ term on the boundary, so all other Fourier coefficients are zero. For instance, at $\\theta=0$ the boundary value is $$u(a,0)=1+3(1)-2(0)=4,$$ which agrees with the truncated Fourier data.',
      diagram: wrapMathSvg(
        [
          '<circle cx="150" cy="90" r="56" fill="none" stroke="#1d4ed8" stroke-width="2"/>',
          '<text x="150" y="22" font-size="13" text-anchor="middle">boundary data on r = a</text>',
          '<text x="150" y="40" font-size="12" text-anchor="middle">1 + 3 cos theta - 2 sin 2 theta</text>',
          '<text x="210" y="90" font-size="12">theta = 0 -> 4</text>',
          '<text x="150" y="154" font-size="12" text-anchor="middle">only n = 0, 1, 2 appear</text>',
        ].join(''),
      ),
    },
    {
      title: 'Insert the radial factors for the surviving modes',
      formula:
        '$$u(r,\\theta)=1+3\\left(\\frac{r}{a}\\right)\\cos\\theta-2\\left(\\frac{r}{a}\\right)^2\\sin 2\\theta$$',
      body: 'Each Fourier mode on the boundary picks up the regular radial factor $(r/a)^n$ inside the disk. Setting $r=a$ reproduces $$u(a,\\theta)=1+3\\cos\\theta-2\\sin 2\\theta,$$ exactly as required.',
      diagram: wrapMathSvg(
        [
          '<circle cx="150" cy="90" r="56" fill="#eff6ff" stroke="#1d4ed8" stroke-width="2"/>',
          '<circle cx="150" cy="90" r="28" fill="none" stroke="#16a34a" stroke-width="2"/>',
          '<text x="150" y="22" font-size="13" text-anchor="middle">radial decay of Fourier modes</text>',
          '<text x="204" y="90" font-size="12">r = a</text>',
          '<text x="176" y="90" font-size="12">r = a/2</text>',
        ].join(''),
      ),
    },
    {
      title: 'Evaluate the harmonic solution at a sample interior point',
      formula:
        '$$u\\left(\\frac a2,\\frac\\pi4\\right)=1+3\\left(\\frac12\\right)\\cos\\frac\\pi4-2\\left(\\frac12\\right)^2\\sin\\frac\\pi2$$\n$$=1+\\frac{3}{2\\sqrt2}-\\frac12\\approx 1.561$$',
      body: 'The trigonometric values are $\\cos(\\pi/4)=\\sqrt2/2\\approx 0.707$ and $\\sin(\\pi/2)=1$. Numerically this gives $$1+1.5(0.707)-0.5\\approx 1+1.061-0.5=1.561.$$',
      diagram: wrapMathSvg(
        [
          '<circle cx="150" cy="90" r="56" fill="#eff6ff" stroke="#1d4ed8" stroke-width="2"/>',
          '<line x1="150" y1="90" x2="178" y2="62" stroke="#dc2626" stroke-width="2.5"/>',
          '<circle cx="178" cy="62" r="4" fill="#dc2626"/>',
          '<text x="194" y="58" font-size="12">r = a/2</text>',
          '<text x="194" y="74" font-size="12">theta = pi/4</text>',
          '<text x="150" y="154" font-size="12" text-anchor="middle">u approx 1.561</text>',
        ].join(''),
      ),
    },
    {
      title: 'Check the center value and harmonicity mode by mode',
      formula:
        '$$u(0,\\theta)=1,\\qquad \\Delta\\bigl(r^n\\cos n\\theta\\bigr)=0,\\qquad \\Delta\\bigl(r^n\\sin n\\theta\\bigr)=0$$',
      body: 'At the center the nonconstant modes disappear because $(r/a)$ and $(r/a)^2$ become $0$, leaving only $1$. The $n=1$ and $n=2$ polar harmonics are standard Laplace solutions, so the whole linear combination is harmonic throughout the disk.',
      diagram: wrapMathSvg(
        [
          '<rect x="30" y="48" width="74" height="84" fill="#dbeafe" stroke="#1d4ed8"/>',
          '<rect x="114" y="48" width="74" height="84" fill="#dcfce7" stroke="#16a34a"/>',
          '<rect x="198" y="48" width="74" height="84" fill="#fee2e2" stroke="#dc2626"/>',
          '<text x="67" y="88" font-size="14" text-anchor="middle">constant</text>',
          '<text x="151" y="88" font-size="14" text-anchor="middle">cos theta</text>',
          '<text x="235" y="88" font-size="14" text-anchor="middle">sin 2 theta</text>',
        ].join(''),
      ),
    },
    {
      title: 'State the final disk solution',
      body: 'The boundary data contain only the constant mode, the first cosine mode, and the second sine mode, so the interior harmonic function contains exactly those three regular polar harmonics and nothing else.',
      takeaway: 'On a disk, Laplace problems with Fourier boundary data are solved by attaching the factor $(r/a)^n$ to each boundary mode.',
    },
  ],
  solution:
    'The regular harmonic expansion in the disk is $$u(r,\\theta)=A_0+\\sum_{n=1}^\\infty \\left(\\frac{r}{a}\\right)^n\\bigl(A_n\\cos n\\theta+B_n\\sin n\\theta\\bigr).$$ Matching the boundary condition $$u(a,\\theta)=1+3\\cos\\theta-2\\sin 2\\theta$$ gives $$A_0=1,\\qquad A_1=3,\\qquad B_2=-2,$$ and all other coefficients equal to $0$. Therefore $$u(r,\\theta)=1+3\\left(\\frac{r}{a}\\right)\\cos\\theta-2\\left(\\frac{r}{a}\\right)^2\\sin 2\\theta.$$ This function is harmonic on $0\\le r<a$, regular at $r=0$, and matches the prescribed boundary data at $r=a$.',
  verifiedPatterns: [
    '1+3\\left(\\frac{r}{a}\\right)\\cos\\theta-2\\left(\\frac{r}{a}\\right)^2\\sin 2\\theta',
    'A_0=1',
    'A_1=3',
    'B_2=-2',
    'u(0,\\theta)=1',
  ],
  minDiagramSteps: 5,
};
