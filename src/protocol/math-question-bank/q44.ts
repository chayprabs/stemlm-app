import { axesGraph, numberLine } from '../math-svg';
import type { MathQuestionDef } from './types';

export const Q44: MathQuestionDef = {
  id: 'q44',
  number: 44,
  topic: 'Pointwise limit, non-uniform convergence, and exchanging integral and limit',
  question:
    'Let $f_n(x)=\\frac{nx}{1+n^2x^2}$ on $[0,1]$. Find the pointwise limit, show that the convergence is not uniform, compute $\\int_0^1 f_n(x)\\,dx$, and justify whether the limit may be exchanged with the integral.',
  steps: [
    {
      title: 'Compute the pointwise limit',
      formula:
        '$$f_n(x)=\\frac{nx}{1+n^2x^2}\\to 0\\quad\\text{for each fixed }x\\in[0,1]$$',
      body: '$f_n(x)$ is the $n$th function in the sequence. At $x=0$ we always have $f_n(0)=0$. For a positive point such as $x=0.5$, $$f_{10}(0.5)=\\frac{5}{26}=0.1923,\\qquad f_{100}(0.5)=\\frac{50}{2501}=0.0200,$$ so the values move toward $0$.',
      diagram: axesGraph({
        curves: [
          {
            d: 'M 40 140 Q 80 94 120 92 T 200 116 T 260 130',
            stroke: '#2563eb',
            label: 'n=1',
            labelPos: [210, 112],
          },
          {
            d: 'M 40 140 Q 58 70 84 64 T 130 88 T 260 138',
            stroke: '#16a34a',
            label: 'n=5',
            labelPos: [120, 60],
          },
          {
            d: 'M 40 140 Q 46 56 56 50 T 90 78 T 260 139',
            stroke: '#dc2626',
            label: 'n=20',
            labelPos: [80, 46],
          },
        ],
        xLabel: 'x',
        yLabel: 'f_n',
      }),
    },
    {
      title: 'Evaluate the sequence at the moving point x = 1/n',
      formula:
        '$$f_n\\!\\left(\\frac{1}{n}\\right)=\\frac{n(1/n)}{1+n^2(1/n)^2}=\\frac{1}{2}$$',
      body: '$f_n$ is the $n$th graph in the sequence. The point $x=1/n$ moves toward $0$ as $n$ grows, but the function value there stays fixed. For $n=10$, the location is $x=0.1$ and $$f_{10}(0.1)=\\frac{1}{2}=0.5.$$ So the graphs keep a visible peak of height $1/2$.',
      diagram: numberLine(
        [
          { pos: 0, label: '0', color: '#333' },
          { pos: 0.1, label: '1/n', color: '#dc2626' },
          { pos: 1, label: '1', color: '#333' },
        ],
        [0, 1],
      ),
    },
    {
      title: 'Use the peak to show the convergence is not uniform',
      formula:
        '$$\\sup_{x\\in[0,1]} f_n(x)=\\frac{1}{2}\\quad\\text{for every }n$$',
      body: '$\\sup_{x\\in[0,1]} f_n(x)$ is the largest height of the $n$th graph. Since the value $1/2$ occurs at $x=1/n$, the sup norm never drops below $1/2$. For $n=10$, the maximizing point is still $x=0.1$ and the height is still $0.5$, so the convergence is not uniform.',
      diagram: axesGraph({
        curves: [
          {
            d: 'M 40 140 Q 65 64 90 80 T 260 138',
            stroke: '#dc2626',
            label: 'peak = 1/2',
            labelPos: [106, 58],
          },
        ],
        points: [{ x: 90, y: 80, label: '(1/n,1/2)', fill: '#dc2626' }],
        xLabel: 'x',
        yLabel: 'f_n',
      }),
    },
    {
      title: 'Compute the integral exactly',
      formula:
        '$$\\int_0^1 \\frac{nx}{1+n^2x^2}\\,dx=\\frac{\\ln(1+n^2)}{2n}$$',
      body: 'Use $u=nx$, so $dx=du/n$. Then $$\\int_0^1 \\frac{nx}{1+n^2x^2}\\,dx=\\frac{1}{n}\\int_0^n \\frac{u}{1+u^2}\\,du=\\frac{\\ln(1+n^2)}{2n}.$$ For $n=10$ this is $\\ln(101)/20=0.2308$, and for $n=100$ it is $\\ln(10001)/200=0.0461$.',
      diagram: axesGraph({
        curves: [
          {
            d: 'M 40 140 Q 78 82 118 78 T 200 114 T 260 132',
            stroke: '#1d4ed8',
            label: 'integrand',
            labelPos: [174, 74],
          },
        ],
        annotations: '<text x="160" y="56" font-size="12">integral = ln(1+n^2)/(2n)</text>',
        xLabel: 'x',
        yLabel: 'f_n',
      }),
    },
    {
      title: 'Exchange limit and integral by domination',
      formula:
        '$$0\\le f_n(x)=\\frac{nx}{1+n^2x^2}\\le \\frac{1}{2}\\quad\\text{on }[0,1]$$',
      body: '$f_n(x)$ is the $n$th integrand in the sequence. The inequality follows from $1+n^2x^2\\ge 2nx$, so the whole sequence is bounded by the integrable constant $1/2$. As a numeric check, with $n=10$ and $x=0.3$ we get $$f_{10}(0.3)=\\frac{3}{10}=0.3\\le 0.5.$$ Because the pointwise limit is $0$, dominated convergence applies.',
      takeaway:
        'The pointwise limit is 0 and the convergence is not uniform, but dominated convergence still lets us pass the limit through the integral.',
    },
  ],
  solution:
    'For each fixed $x\\in[0,1]$, $$f_n(x)=\\frac{nx}{1+n^2x^2}\\to 0,$$ so the pointwise limit is 0. The convergence is not uniform because $$f_n\\!\\left(\\frac{1}{n}\\right)=\\frac{1}{2},$$ hence $$\\sup_{x\\in[0,1]} f_n(x)=\\frac{1}{2}$$ for every $n$. The integral is $$\\int_0^1 \\frac{nx}{1+n^2x^2}\\,dx=\\frac{\\ln(1+n^2)}{2n}\\to 0.$$ Also $$0\\le f_n(x)\\le \\frac12$$ on $[0,1]$, so dominated convergence applies. Therefore $$\\lim_{n\\to\\infty}\\int_0^1 f_n(x)\\,dx=\\int_0^1 \\lim_{n\\to\\infty}f_n(x)\\,dx=0.$$',
  verifiedPatterns: [
    'pointwise limit is 0',
    'not uniform',
    '\\frac12',
    '\\frac{\\ln(1+n^2)}{2n}',
    'dominated convergence',
  ],
  minDiagramSteps: 4,
};
