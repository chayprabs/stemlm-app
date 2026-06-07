import { axesGraph, numberLine, wrapMathSvg } from '../math-svg';
import type { MathQuestionDef } from './types';

export const Q43: MathQuestionDef = {
  id: 'q43',
  number: 43,
  topic: 'Uniform convergence, completeness, and Arzela-Ascoli',
  question:
    'For $f_n(x)=x^n$ on $[0,1]$, determine the pointwise limit and decide whether the convergence is uniform. Explain how the completeness of $C[0,1]$ fits into that conclusion. Then analyze $g_n(x)=\\sin(nx)/n$ on $[0,1]$ and use Arzela-Ascoli to explain why that family converges uniformly to $0$.',
  steps: [
    {
      title: 'Compute the pointwise limit of x^n on [0,1]',
      formula:
        '$$f_n(x)=x^n\\to f(x)=\\begin{cases}0,&0\\le x<1,\\\\1,&x=1.\\end{cases}$$',
      body: 'If $0\\le x<1$, repeated multiplication drives $x^n$ to $0$: for example $0.9^{10}=0.3487$ and $0.9^{50}=0.00515$. At the endpoint $x=1$, every term is $1^n=1$, so the pointwise limit keeps the value $1$ there.',
      diagram: axesGraph({
        curves: [
          {
            d: 'M 40 40 L 90 60 L 140 82 L 190 106 L 240 132',
            stroke: '#2563eb',
            label: 'n=1',
            labelPos: [228, 128],
          },
          {
            d: 'M 40 40 Q 95 48 145 76 T 240 138',
            stroke: '#16a34a',
            label: 'n=2',
            labelPos: [218, 118],
          },
          {
            d: 'M 40 40 Q 120 42 175 70 T 240 139',
            stroke: '#dc2626',
            label: 'n=5',
            labelPos: [206, 96],
          },
        ],
        points: [{ x: 240, y: 40, label: '(1,1)', fill: '#333' }],
        xLabel: 'x',
        yLabel: 'x^n',
      }),
    },
    {
      title: 'Notice that the limit function is not continuous at x = 1',
      formula:
        '$$f(x)=0\\text{ for }x<1,\\qquad f(1)=1$$',
      body: 'The limiting function stays at height $0$ on the whole half-open interval $[0,1)$ and then jumps to height $1$ at the endpoint. Numerically, the left-hand values remain near $0$ while the point $x=1$ keeps the fixed value $1$.',
      diagram: wrapMathSvg(
        [
          '<line x1="40" y1="120" x2="240" y2="120" stroke="#1d4ed8" stroke-width="2.5"/>',
          '<circle cx="240" cy="120" r="4" fill="#fff" stroke="#1d4ed8" stroke-width="2"/>',
          '<circle cx="240" cy="40" r="4" fill="#dc2626"/>',
          '<line x1="40" y1="140" x2="280" y2="140" stroke="#333" stroke-width="2"/>',
          '<line x1="40" y1="140" x2="40" y2="20" stroke="#333" stroke-width="2"/>',
          '<text x="275" y="156" font-size="13">x</text>',
          '<text x="22" y="28" font-size="13">f</text>',
          '<text x="170" y="112" font-size="12">0 on [0,1)</text>',
          '<text x="248" y="44" font-size="12">1 at x=1</text>',
        ].join(''),
      ),
    },
    {
      title: 'Show the convergence is not uniform',
      formula:
        '$$\\sup_{x\\in[0,1]}|x^n-f(x)|=1\\quad\\text{for every }n$$',
      body: 'For $x<1$ the difference is $x^n$, whose supremum is still $1$ because values can be taken arbitrarily close to $1$. For instance, with $n=10$ and $x=(0.99)^{1/10}\\approx 0.9990$, we get $x^{10}=0.99$, so the error can be made as close to $1$ as we like. Therefore the convergence is not uniform.',
      diagram: numberLine(
        [
          { pos: 0.95, label: 'x<1', color: '#2563eb' },
          { pos: 1, label: 'x=1', color: '#dc2626' },
        ],
        [0.9, 1],
      ),
    },
    {
      title: 'Use completeness of C[0,1] to reinforce the conclusion',
      formula:
        '$$C[0,1]\\text{ is complete in }\\|\\cdot\\|_\\infty$$',
      body: 'The key functional-analytic fact is that C[0,1] is complete in the sup norm. If $f_n=x^n$ converged uniformly, then it would converge in $\\|\\cdot\\|_\\infty$ to some element of $C[0,1]$. But the pointwise limit above is not continuous at $1$, so it cannot lie in $C[0,1]$. That contradiction shows again that the sequence is not uniform.',
      diagram: wrapMathSvg(
        [
          '<rect x="48" y="42" width="86" height="54" fill="#eff6ff" stroke="#2563eb"/>',
          '<rect x="168" y="42" width="86" height="54" fill="#fef2f2" stroke="#dc2626"/>',
          '<text x="91" y="64" font-size="12" text-anchor="middle">C[0,1]</text>',
          '<text x="91" y="82" font-size="12" text-anchor="middle">complete</text>',
          '<text x="211" y="64" font-size="12" text-anchor="middle">pointwise limit</text>',
          '<text x="211" y="82" font-size="12" text-anchor="middle">not continuous</text>',
          '<line x1="134" y1="69" x2="168" y2="69" stroke="#333" stroke-width="2"/>',
          '<text x="151" y="60" font-size="12" text-anchor="middle">cannot lie in</text>',
        ].join(''),
      ),
    },
    {
      title: 'Bound and control g_n(x) = sin(nx)/n',
      formula:
        '$$|g_n(x)|=\\left|\\frac{\\sin(nx)}{n}\\right|\\le \\frac{1}{n},\\qquad |g_n\'(x)|=|\\cos(nx)|\\le 1$$',
      body: 'The amplitude decays like $1/n$: for $n=10$, the graph stays between $-0.1$ and $0.1$. Also the derivative bound $|g_n\'(x)|\\le 1$ means the whole family is equicontinuous, because the mean-value theorem gives $|g_n(x)-g_n(y)|\\le |x-y|$.',
      diagram: axesGraph({
        curves: [
          {
            d: 'M 40 90 C 60 70 80 110 100 90 C 120 70 140 110 160 90 C 180 70 200 110 220 90 C 235 78 248 102 260 90',
            stroke: '#2563eb',
            label: 'sin(nx)/n',
            labelPos: [188, 62],
          },
          {
            d: 'M 40 70 L 260 70',
            stroke: '#16a34a',
            label: '1/n',
            labelPos: [232, 64],
          },
          {
            d: 'M 40 110 L 260 110',
            stroke: '#16a34a',
            label: '-1/n',
            labelPos: [226, 126],
          },
        ],
        xLabel: 'x',
        yLabel: 'g_n',
      }),
    },
    {
      title: 'Apply Arzela-Ascoli and identify the only possible limit',
      formula:
        '$$\\sup_{x\\in[0,1]}\\left|\\frac{\\sin(nx)}{n}\\right|\\le \\frac{1}{n}\\xrightarrow[n\\to\\infty]{}0$$',
      body: 'Arzela-Ascoli applies because the family is uniformly bounded and equicontinuous on the compact interval $[0,1]$. The sup bound even gives a direct estimate: for $n=20$, every value has size at most $1/20=0.05$. So the family converges uniformly to 0, and its only cluster point is the zero function.',
      takeaway:
        'Pointwise convergence can fail to be uniform when the limit leaves $C[0,1]$, while Arzela-Ascoli plus a sup bound quickly yields uniform convergence for $\\sin(nx)/n$.',
    },
  ],
  solution:
    'For $f_n(x)=x^n$ on $[0,1]$, the pointwise limit is $$f(x)=0\\text{ for }0\\le x<1,\\qquad f(1)=1.$$ This limit is not continuous at $1$, so the convergence cannot be uniform. Indeed $$\\sup_{x\\in[0,1]}|x^n-f(x)|=1$$ for every $n$, so the sequence is not uniform. This agrees with the fact that C[0,1] is complete in the sup norm: a uniform limit of continuous functions would still lie in $C[0,1]$, but the pointwise limit does not. For $$g_n(x)=\\frac{\\sin(nx)}{n},$$ we have $$\\sup_{x\\in[0,1]}|g_n(x)|\\le \\frac{1}{n}\\to 0,$$ and also $|g_n\'(x)|=|\\cos(nx)|\\le 1$, so the family is equicontinuous. By Arzela-Ascoli the family is relatively compact, and since the sup norm already forces the only cluster point to be $0$, the sequence converges uniformly to 0.',
  verifiedPatterns: [
    'not uniform',
    '\\sup',
    'C[0,1] is complete',
    '\\frac{\\sin(nx)}{n}',
    'uniformly to 0',
    'Arzela-Ascoli',
  ],
  minDiagramSteps: 5,
};
