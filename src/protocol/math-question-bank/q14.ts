import { axesGraph, numberLine, wrapMathSvg } from '../math-svg';
import type { MathQuestionDef } from './types';

export const Q14: MathQuestionDef = {
  id: 'q14',
  number: 14,
  topic: 'Bessel equation of order 1/2 and Frobenius series',
  question:
    'Solve $$x^2y\'\'+xy\'+\\left(x^2-\\frac14\\right)y=0$$ by the Frobenius method. Identify the equation as a Bessel equation of order $1/2$, derive the two series solutions, and connect them to $J_{1/2}(x)$ and $J_{-1/2}(x)$.',
  steps: [
    {
      title: 'Recognize the Bessel form and identify the order',
      formula:
        '$$x^2y\'\'+xy\'+(x^2-\\nu^2)y=0$$\n$$\\nu^2=\\frac14\\qquad\\Rightarrow\\qquad \\nu=\\frac12$$',
      body: 'Comparing coefficients shows that the constant subtracted from $x^2$ is $1/4$. Since $(1/2)^2=1/4$, this is the Bessel equation of order $\\nu=1/2$.',
      diagram: numberLine(
        [
          { pos: -0.5, label: '-1/2', color: '#dc2626' },
          { pos: 0.5, label: '1/2', color: '#16a34a' },
        ],
        [-1, 1],
      ),
    },
    {
      title: 'Insert a Frobenius series and form the indicial equation',
      formula:
        '$$y=\\sum_{n=0}^{\\infty}a_nx^{n+r}$$\n$$\\bigl(r^2-\\tfrac14\\bigr)a_0=0\\qquad\\Rightarrow\\qquad r^2-\\frac14=0$$\n$$r=\\frac12\\quad\\text{or}\\quad r=-\\frac12$$',
      body: 'The indicial roots are checked directly: $(1/2)^2-1/4=0$ and $(-1/2)^2-1/4=0$. Those two exponents generate the two independent Frobenius branches.',
      diagram: wrapMathSvg(
        [
          '<rect x="34" y="48" width="98" height="84" fill="#dcfce7" stroke="#16a34a"/>',
          '<rect x="168" y="48" width="98" height="84" fill="#fee2e2" stroke="#dc2626"/>',
          '<text x="83" y="84" font-size="18" text-anchor="middle">r=1/2</text>',
          '<text x="217" y="84" font-size="18" text-anchor="middle">r=-1/2</text>',
          '<text x="150" y="28" font-size="12" text-anchor="middle">indicial roots</text>',
        ].join(''),
      ),
    },
    {
      title: 'Find the recurrence for the r = 1/2 branch',
      formula:
        '$$a_n=-\\frac{a_{n-2}}{n(n+1)},\\qquad a_1=0\\qquad (r=\\tfrac12)$$\n$$y_1=x^{1/2}\\left(1-\\frac{x^2}{6}+\\frac{x^4}{120}-\\cdots\\right)$$',
      body: 'Taking $a_0=1$ gives $a_2=-1/6$ and $a_4=1/120$. At $x=1$, the truncated series gives $1-1/6+1/120=0.8417$, which already matches $\\sin 1\\approx0.8415$ very closely.',
      diagram: axesGraph({
        curves: [
          {
            d: 'M 44 122 C 86 110 126 92 166 72 S 226 44 258 30',
            stroke: '#1d4ed8',
            label: 'x^(1/2) series',
            labelPos: [196, 26],
          },
        ],
        xLabel: 'x',
        yLabel: 'y',
      }),
    },
    {
      title: 'Find the recurrence for the r = -1/2 branch',
      formula:
        '$$a_n=-\\frac{a_{n-2}}{n(n-1)},\\qquad a_1=0\\qquad (r=-\\tfrac12)$$\n$$y_2=x^{-1/2}\\left(1-\\frac{x^2}{2}+\\frac{x^4}{24}-\\cdots\\right)$$',
      body: 'Again taking $a_0=1$ gives $a_2=-1/2$ and $a_4=1/24$. At $x=1$, the first three terms give $1-1/2+1/24=0.5417$, close to $\\cos 1\\approx0.5403$.',
      diagram: axesGraph({
        curves: [
          {
            d: 'M 44 32 C 72 48 104 70 142 90 S 216 118 258 132',
            stroke: '#dc2626',
            label: 'x^(-1/2) series',
            labelPos: [188, 142],
          },
        ],
        xLabel: 'x',
        yLabel: 'y',
      }),
    },
    {
      title: 'Match the series with the half-order Bessel functions',
      formula:
        '$$J_{1/2}(x)=\\sqrt{\\frac{2}{\\pi x}}\\sin x,\\qquad J_{-1/2}(x)=\\sqrt{\\frac{2}{\\pi x}}\\cos x$$',
      body: 'At $x=1$, the common prefactor is $\\sqrt{2/\\pi}\\approx0.798$. Therefore $J_{1/2}(1)\\approx0.798\\cdot0.8415=0.671$ and $J_{-1/2}(1)\\approx0.798\\cdot0.5403=0.431$.',
      diagram: wrapMathSvg(
        [
          '<line x1="48" y1="124" x2="112" y2="60" stroke="#1d4ed8" stroke-width="2.5"/>',
          '<line x1="48" y1="124" x2="112" y2="124" stroke="#dc2626" stroke-width="2.5"/>',
          '<text x="122" y="58" font-size="12">sin branch</text>',
          '<text x="122" y="128" font-size="12">cos branch</text>',
          '<text x="58" y="146" font-size="12">same x^(-1/2) prefactor</text>',
        ].join(''),
      ),
    },
    {
      title: 'State the full solution',
      formula:
        '$$y(x)=C_1J_{1/2}(x)+C_2J_{-1/2}(x)$$\n$$=C_1\\sqrt{\\frac{2}{\\pi x}}\\sin x+C_2\\sqrt{\\frac{2}{\\pi x}}\\cos x$$',
      body: 'For example, if $C_1=1$ and $C_2=0$, then at $x=1$ we get $y(1)=J_{1/2}(1)\\approx0.671$. If $C_1=0$ and $C_2=1$, then $y(1)=J_{-1/2}(1)\\approx0.431$.',
      diagram: wrapMathSvg(
        [
          '<rect x="36" y="48" width="228" height="80" rx="8" fill="#f8fafc" stroke="#334155" stroke-width="2"/>',
          '<text x="150" y="80" font-size="16" text-anchor="middle">C1 J_(1/2)(x) + C2 J_(-1/2)(x)</text>',
          '<text x="150" y="104" font-size="12" text-anchor="middle">two Frobenius branches combined</text>',
        ].join(''),
      ),
      takeaway: 'For half-integer order, the Bessel functions reduce to elementary sine and cosine with a universal $x^{-1/2}$ prefactor.',
    },
  ],
  solution:
    'The equation is the Bessel equation $$x^2y\'\'+xy\'+(x^2-\\nu^2)y=0$$ with $$\\nu=\\frac12.$$ A Frobenius trial $$y=\\sum_{n=0}^{\\infty}a_nx^{n+r}$$ gives the indicial equation $$r^2-\\frac14=0,$$ so $$r=\\pm\\frac12.$$ For $$r=\\frac12$$ the recurrence is $$a_n=-\\frac{a_{n-2}}{n(n+1)},$$ giving $$x^{1/2}\\left(1-\\frac{x^2}{6}+\\frac{x^4}{120}-\\cdots\\right).$$ For $$r=-\\frac12$$ the recurrence is $$a_n=-\\frac{a_{n-2}}{n(n-1)},$$ giving $$x^{-1/2}\\left(1-\\frac{x^2}{2}+\\frac{x^4}{24}-\\cdots\\right).$$ These are the standard half-order Bessel functions $$J_{1/2}(x)=\\sqrt{\\frac{2}{\\pi x}}\\sin x,\\qquad J_{-1/2}(x)=\\sqrt{\\frac{2}{\\pi x}}\\cos x,$$ so the general solution is $$y(x)=C_1J_{1/2}(x)+C_2J_{-1/2}(x).$$',
  verifiedPatterns: ['r=\\pm\\frac12', 'J_{1/2}(x)', 'J_{-1/2}(x)', '\\sqrt{\\frac{2}{\\pi x}}\\sin x', '\\sqrt{\\frac{2}{\\pi x}}\\cos x'],
  minDiagramSteps: 5,
};
