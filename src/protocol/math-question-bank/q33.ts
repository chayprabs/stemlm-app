import { axesGraph, matrixDisplay, numberLine, wrapMathSvg } from '../math-svg';
import type { MathQuestionDef } from './types';

export const Q33: MathQuestionDef = {
  id: 'q33',
  number: 33,
  topic: 'Newton-Raphson versus bisection',
  question:
    'In numerical analysis, compare the Newton-Raphson method and the bisection method for finding the real root of the cubic polynomial $$x^3-2x-5=0.$$ Use bisection on the interval $[2,3]$ and Newton-Raphson with initial guess $x_0=2$.',
  steps: [
    {
      title: 'Bracket the root for bisection',
      formula: '$$f(x)=x^3-2x-5,\\qquad f(2)=-1,\\qquad f(3)=16$$',
      body: 'The endpoint values are $f(2)=-1$ and $f(3)=16$, so the signs differ on $[2,3]$. This same sign change gives the starting bracket for the bisection method.',
      diagram: numberLine(
        [
          { pos: 2, label: '2 : -1', color: '#dc2626' },
          { pos: 2.5, label: 'mid', color: '#64748b' },
          { pos: 3, label: '3 : 16', color: '#16a34a' },
        ],
        [2, 3],
      ),
    },
    {
      title: 'Carry out four bisection iterations',
      formula:
        '$$m_1=2.5,\\ f(m_1)=5.625>0;\\quad m_2=2.25,\\ f(m_2)=1.890625>0;\\quad m_3=2.125,\\ f(m_3)=0.345703>0;\\quad m_4=2.0625,\\ f(m_4)=-0.351318<0$$',
      body: 'Each midpoint keeps the half-interval where the sign changes. After four steps the bracket is $[2.0625,2.125]$, so the bisection estimate is the midpoint $2.09375$ with error at most $(3-2)/2^4=0.0625$ from the initial bracket and at most $0.03125$ from the final midpoint.',
      diagram: matrixDisplay(
        [
          ['step', 'interval', 'midpoint'],
          ['1', '[2, 3]', '2.5'],
          ['2', '[2, 2.5]', '2.25'],
          ['3', '[2, 2.25]', '2.125'],
          ['4', '[2, 2.125]', '2.0625'],
        ],
        'Bisection history',
      ),
    },
    {
      title: 'Set up Newton-Raphson and compute the first iterate',
      formula: '$$x_{n+1}=x_n-\\frac{f(x_n)}{f\'(x_n)},\\qquad f\'(x)=3x^2-2$$\n$$x_1=2-\\frac{-1}{10}=2.1$$',
      body: 'Newton-Raphson uses the tangent line at the current iterate. Starting from $x_0=2$, the slope is $f\'(2)=10$, so the tangent-line correction moves immediately to $x_1=2.1$.',
      diagram: axesGraph({
        curves: [
          {
            d: 'M 50 132 C 86 128 110 118 132 100 C 154 78 172 52 196 24',
            label: 'y = x^3 - 2x - 5',
            labelPos: [164, 30],
          },
          {
            d: 'M 70 140 L 190 20',
            stroke: '#dc2626',
            label: 'tangent at x0 = 2',
            labelPos: [116, 44],
          },
        ],
        points: [{ x: 100, y: 110, label: 'x0 = 2', fill: '#dc2626' }],
        xLabel: 'x',
        yLabel: 'f(x)',
      }),
    },
    {
      title: 'Compute the next Newton iterates',
      formula:
        '$$x_2=2.1-\\frac{2.1^3-2(2.1)-5}{3(2.1)^2-2}=2.1-\\frac{0.061}{11.23}\\approx 2.094569$$\n$$x_3\\approx 2.094551$$',
      body: 'Numerically, $x_2=2.094569$ and $x_3=2.094551$, so the correction shrinks from $2.1-2=0.1$ to $2.094569-2.094551=0.000018$. That tiny change shows the expected rapid local convergence.',
      diagram: matrixDisplay(
        [
          ['n', 'x_n'],
          ['0', '2.000000'],
          ['1', '2.100000'],
          ['2', '2.094569'],
          ['3', '2.094551'],
        ],
        'Newton iterates',
      ),
    },
    {
      title: 'Compare the two methods after similar effort',
      formula:
        '$$x_{\\text{bisect}}\\approx 2.09375,\\qquad x_{\\text{Newton}}\\approx 2.094551,\\qquad \\text{root}\\approx 2.094551$$',
      body: 'The gap is $2.094551-2.09375=0.000801$, so Newton is already much closer after similar effort. Bisection is slower but guaranteed once a sign-changing bracket is known; Newton is faster near the root but depends on a good initial guess.',
      diagram: wrapMathSvg(
        [
          '<line x1="30" y1="96" x2="270" y2="96" stroke="#333" stroke-width="2"/>',
          '<line x1="184" y1="82" x2="184" y2="110" stroke="#16a34a" stroke-width="3"/>',
          '<line x1="179" y1="86" x2="179" y2="106" stroke="#dc2626" stroke-width="3"/>',
          '<line x1="184" y1="60" x2="188" y2="74" stroke="#2563eb" stroke-width="3"/>',
          '<text x="184" y="74" font-size="12" text-anchor="middle" fill="#16a34a">2.094551 root</text>',
          '<text x="179" y="122" font-size="12" text-anchor="middle" fill="#dc2626">2.09375 bisection</text>',
          '<text x="205" y="52" font-size="12" fill="#2563eb">Newton nearly coincides</text>',
        ].join(''),
      ),
    },
    {
      title: 'State the practical conclusion',
      formula: '$$x\\approx 2.094551$$',
      body: 'For this cubic, both methods converge to the same real root, and the final estimate is $x=2.094551$ to six decimals. Bisection remains valuable because the sign-change bracket makes its convergence robust.',
      takeaway: 'Bisection trades speed for certainty; Newton-Raphson trades certainty for much faster local convergence.',
    },
  ],
  solution:
    'With $$f(x)=x^3-2x-5,$$ we have $$f(2)=-1<0$$ and $$f(3)=16>0,$$ so a root lies in $[2,3]$. Four bisection steps give midpoints $$2.5,\\ 2.25,\\ 2.125,\\ 2.0625,$$ leaving the final bracket $$[2.0625,2.125],$$ so the bisection estimate is $$x\\approx 2.09375.$$ For Newton-Raphson, $$f\'(x)=3x^2-2$$ and $$x_{n+1}=x_n-\\frac{f(x_n)}{f\'(x_n)}.$$ Starting from $$x_0=2,$$ we get $$x_1=2.1,$$ $$x_2\\approx 2.094569,$$ and $$x_3\\approx 2.094551.$$ Therefore the real root is $$x\\approx 2.094551,$$ and Newton-Raphson is much faster here than bisection, although bisection is the more robust method once a sign-changing interval is known.',
  verifiedPatterns: ['2.09375', 'x_1=2.1', 'x_2\\approx 2.094569', 'x_3\\approx 2.094551', 'x\\approx 2.094551'],
  minDiagramSteps: 5,
};
