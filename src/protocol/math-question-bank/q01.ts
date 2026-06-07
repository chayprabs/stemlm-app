import { axesGraph, numberLine } from '../math-svg';
import type { MathQuestionDef } from './types';

export const Q01: MathQuestionDef = {
  id: 'q01',
  number: 1,
  topic: 'Limits and L Hopital',
  question:
    'Evaluate (a) lim_{x→0} (e^x-1-x-x²/2)/x³, (b) lim_{x→∞} x²ln(1+1/x)-x, (c) lim_{x→0+} x^x. For (c), explain why direct substitution fails.',
  steps: [
    {
      title: 'Restate the three limits to evaluate',
      body: 'We need (a) a $0/0$ limit at $x=0$, (b) an $\\infty-\\infty$ form as $x\\to\\infty$, and (c) the indeterminate power $0^0$ as $x\\to 0^+$.',
      diagram: numberLine(
        [
          { pos: 0, label: '0 (a,c)', color: '#dc2626' },
          { pos: 0.5, label: 'interior', color: '#333' },
          { pos: 1, label: '∞ (b)', color: '#1d4ed8' },
        ],
        [0, 1],
      ),
    },
    {
      title: 'Expand e^x to fifth order for part (a)',
      formula: '$$e^x = 1 + x + \\frac{x^2}{2} + \\frac{x^3}{6} + \\frac{x^4}{24} + O(x^5)$$',
      body: '$e^x$ is the Maclaurin series about $0$. With $x=0.1$: $e^{0.1} \\approx 1 + 0.1 + 0.005 + 0.000167 = 1.10517$, matching the cubic term $1/6 \\cdot 0.001 = 0.000167$.',
      diagram: axesGraph({
        curves: [
          {
            d: 'M 40 140 Q 80 100 120 80 T 200 50 T 280 30',
            label: 'y = e^x',
            labelPos: [220, 40],
          },
        ],
        points: [{ x: 40, y: 140, label: '(0,1)' }],
        annotations: '<text x="150" y="170" font-size="12" text-anchor="middle">Taylor about x=0</text>',
      }),
    },
    {
      title: 'Subtract and divide the numerator for (a)',
      formula:
        '$$\\frac{e^x-1-x-x^2/2}{x^3} = \\frac{1}{6} + \\frac{x}{24} + O(x^2) \\xrightarrow[x\\to 0]{} \\frac{1}{6}$$',
      body: 'After cancellation, the leading term is $x^3/6$. With $x=0.1$: $\\frac{e^{0.1}-1-0.1-0.005}{0.001} = \\frac{0.000167}{0.001} = 0.1667 \\approx 1/6$.',
      diagram: axesGraph({
        curves: [
          {
            d: 'M 50 120 L 90 110 L 130 105 L 170 103 L 210 102 L 250 101',
            stroke: '#16a34a',
            label: '→ 1/6',
            labelPos: [200, 95],
          },
        ],
        points: [{ x: 40, y: 103, label: '1/6', fill: '#16a34a' }],
        xLabel: 'x',
        yLabel: 'ratio',
      }),
    },
    {
      title: 'Substitute t = 1/x for part (b)',
      formula: '$$x^2\\ln\\!\\left(1+\\frac{1}{x}\\right)-x = \\frac{\\ln(1+t)-t}{t^2},\\quad t=\\frac{1}{x}\\to 0^+$$',
      body: 'As $x\\to\\infty$, set $t=1/x\\to 0^+$. With $x=10$: $t=0.1$ and $100\\ln(1.1)-10 = -0.476 \\approx -0.5$.',
      diagram: axesGraph({
        curves: [
          {
            d: 'M 40 130 C 100 125 160 110 220 90 T 280 70',
            label: 'x → ∞',
            labelPos: [230, 65],
          },
        ],
        annotations: '<text x="120" y="50" font-size="12">t = 1/x → 0</text>',
      }),
    },
    {
      title: 'Taylor expand ln(1+t) for part (b)',
      formula:
        '$$\\ln(1+t)=t-\\frac{t^2}{2}+\\frac{t^3}{3}+O(t^4)\\Rightarrow \\frac{\\ln(1+t)-t}{t^2}=-\\frac{1}{2}+\\frac{t}{3}+O(t^2)$$',
      body: 'The linear terms cancel. With $t=0.1$: $\\frac{\\ln(1.1)-0.1}{0.01} = \\frac{-0.00496}{0.01} = -0.496 \\approx -1/2$.',
      diagram: axesGraph({
        curves: [
          {
            d: 'M 50 100 L 100 105 L 150 108 L 200 109 L 250 109.5',
            stroke: '#dc2626',
            label: '→ -1/2',
            labelPos: [200, 100],
          },
        ],
        points: [{ x: 40, y: 109.5, label: '-1/2', fill: '#dc2626' }],
        xLabel: 't',
        yLabel: 'ratio',
      }),
    },
    {
      title: 'Rewrite x^x as an exponential for (c)',
      formula: '$$x^x = e^{x\\ln x}$$',
      body: 'For $x>0$, $a^b=e^{b\\ln a}$. With $x=0.1$: $0.1^{0.1} = e^{0.1\\ln 0.1} = e^{-0.230} \\approx 0.794$.',
      diagram: axesGraph({
        curves: [
          {
            d: 'M 45 135 C 70 120 90 100 110 85 C 130 75 150 72 170 75 C 190 80 210 95 230 110',
            label: 'y = x^x',
            labelPos: [200, 105],
          },
        ],
        points: [{ x: 45, y: 135, label: '→ 1', fill: '#16a34a' }],
      }),
    },
    {
      title: 'Evaluate the exponential limit for (c)',
      formula: '$$\\lim_{x\\to 0^+} x\\ln x = 0 \\quad\\Rightarrow\\quad \\lim_{x\\to 0^+} x^x = e^0 = 1$$',
      body: 'Since $x\\ln x\\to 0$, the limit $= e^0 = 1$. With $x=0.01$: $0.01^{0.01} \\approx 0.955 \\to 1$. Direct substitution gives $0^0$, an indeterminate form.',
      takeaway: 'Indeterminate forms need structure (series, logarithms, or L\'Hôpital) — not blind substitution.',
    },
  ],
  solution:
    '**(a)** $\\displaystyle\\lim_{x\\to 0}\\frac{e^x-1-x-x^2/2}{x^3}=\\frac{1}{6}$ by the Taylor series of $e^x$. **(b)** With $t=1/x$, $\\displaystyle\\lim_{x\\to\\infty}\\bigl[x^2\\ln(1+1/x)-x\\bigr]=-\\frac{1}{2}$. **(c)** $x^x=e^{x\\ln x}\\to e^0=1$; direct substitution fails because $0^0$ is indeterminate (the base and exponent both approach $0$ independently).',
  verifiedPatterns: ['\\frac{1}{6}', '-\\frac{1}{2}', '0^0', 'e^0 = 1', 'indeterminate'],
  minDiagramSteps: 5,
};
