import { axesGraph, numberLine, wrapMathSvg } from '../math-svg';
import type { MathQuestionDef } from './types';

export const Q45: MathQuestionDef = {
  id: 'q45',
  number: 45,
  topic: 'Fourier series of x and Parseval identity',
  question:
    'Find the Fourier series of $f(x)=x$ on $[-\\pi,\\pi]$, and then use Parseval\'s identity to prove that $$\\sum_{n=1}^{\\infty}\\frac{1}{n^2}=\\frac{\\pi^2}{6}.$$',
  steps: [
    {
      title: 'Use odd symmetry to simplify the Fourier coefficients',
      formula:
        '$$f(-x)=-f(x)\\Rightarrow a_0=0,\\qquad a_n=0\\text{ for all }n\\ge 1$$',
      body: 'The graph of $f(x)=x$ is symmetric through the origin, so cosine terms vanish. For instance, $f(1)=1$ and $f(-1)=-1$, which is exactly the odd symmetry that forces the even cosine coefficients to be $0$.',
      diagram: axesGraph({
        curves: [
          {
            d: 'M 50 130 L 240 40',
            stroke: '#2563eb',
            label: 'y=x',
            labelPos: [210, 54],
          },
        ],
        points: [
          { x: 50, y: 130, label: '(-π,-π)', fill: '#333' },
          { x: 240, y: 40, label: '(π,π)', fill: '#333' },
        ],
        xLabel: 'x',
        yLabel: 'y',
      }),
    },
    {
      title: 'Set up the sine coefficient b_n',
      formula:
        '$$b_n=\\frac{1}{\\pi}\\int_{-\\pi}^{\\pi}x\\sin(nx)\\,dx=\\frac{2}{\\pi}\\int_0^{\\pi}x\\sin(nx)\\,dx$$',
      body: '$b_n$ is the $n$th sine coefficient in the Fourier series. Because $x\\sin(nx)$ is even, the integral doubles over $[0,\\pi]$. For $n=1$, we get $b_1=\\frac{2}{\\pi}\\int_0^{\\pi}x\\sin x\\,dx$, which already suggests integration by parts.',
      diagram: wrapMathSvg(
        [
          '<line x1="40" y1="140" x2="280" y2="140" stroke="#333" stroke-width="2"/>',
          '<line x1="40" y1="140" x2="40" y2="20" stroke="#333" stroke-width="2"/>',
          '<path d="M 50 130 L 240 40" fill="none" stroke="#1d4ed8" stroke-width="2.5"/>',
          '<rect x="145" y="40" width="95" height="100" fill="#dbeafe" opacity="0.6"/>',
          '<text x="188" y="34" font-size="12" text-anchor="middle">double 0 to π</text>',
        ].join(''),
      ),
    },
    {
      title: 'Integrate by parts to obtain the exact coefficient',
      formula:
        '$$b_n=\\frac{2}{\\pi}\\left[-\\frac{x\\cos(nx)}{n}+\\frac{\\sin(nx)}{n^2}\\right]_0^{\\pi}=\\frac{2(-1)^{n+1}}{n}$$',
      body: 'At $x=\\pi$, the sine term is $0$ and the cosine term is $\\cos(n\\pi)=(-1)^n$. Therefore $$b_n=\\frac{2(-1)^{n+1}}{n}.$$ This gives $b_1=2$, $b_2=-1$, and $b_3=2/3$, matching the alternating pattern exactly.',
      diagram: numberLine(
        [
          { pos: 1, label: 'b1=2', color: '#dc2626' },
          { pos: 2, label: 'b2=-1', color: '#2563eb' },
          { pos: 3, label: 'b3=2/3', color: '#16a34a' },
          { pos: 4, label: 'b4=-1/2', color: '#7c3aed' },
        ],
        [1, 4],
      ),
    },
    {
      title: 'Write the Fourier sine series',
      formula:
        '$$x=2\\sum_{n=1}^{\\infty}\\frac{(-1)^{n+1}}{n}\\sin(nx),\\qquad -\\pi<x<\\pi$$',
      body: 'The series starts as $x=2\\sin x-\\sin 2x+\\frac{2}{3}\\sin 3x-\\frac12\\sin 4x+\\cdots$. At $x=\\pi/2$, the first three nonzero terms give $2-\\frac{2}{3}+\\frac{2}{5}=1.7333$, which is already close to the exact value $\\pi/2=1.5708$.',
      diagram: axesGraph({
        curves: [
          {
            d: 'M 45 126 L 95 108 L 145 82 L 195 60 L 245 52',
            stroke: '#2563eb',
            label: 'partial sum',
            labelPos: [186, 76],
          },
          {
            d: 'M 45 130 L 245 40',
            stroke: '#16a34a',
            label: 'x',
            labelPos: [228, 44],
          },
        ],
        xLabel: 'x',
        yLabel: 'series',
      }),
    },
    {
      title: 'Apply Parseval identity to f(x)=x',
      formula:
        '$$\\frac{1}{\\pi}\\int_{-\\pi}^{\\pi}x^2\\,dx=\\sum_{n=1}^{\\infty}b_n^2$$',
      body: '$b_n$ is the $n$th sine coefficient, so Parseval compares the energy in $x$ with the series $\\sum b_n^2$. The left-hand side is $\\frac{1}{\\pi}\\cdot 2\\int_0^{\\pi}x^2\\,dx=\\frac{1}{\\pi}\\cdot 2\\cdot \\frac{\\pi^3}{3}=\\frac{2\\pi^2}{3}\\approx 6.5797$. Since $b_n=2(-1)^{n+1}/n$, the right-hand side becomes $\\sum 4/n^2$.',
      diagram: wrapMathSvg(
        [
          '<rect x="56" y="38" width="188" height="88" fill="#f8fafc" stroke="#64748b"/>',
          '<text x="150" y="62" font-size="13" text-anchor="middle">(1/π)∫ x² dx = Σ b_n²</text>',
          '<text x="150" y="86" font-size="13" text-anchor="middle">2π²/3 = 4Σ 1/n²</text>',
          '<text x="150" y="110" font-size="12" text-anchor="middle">match energy in space and coefficients</text>',
        ].join(''),
      ),
    },
    {
      title: 'Solve for the Basel sum',
      formula:
        '$$\\frac{2\\pi^2}{3}=4\\sum_{n=1}^{\\infty}\\frac{1}{n^2}\\Rightarrow \\sum_{n=1}^{\\infty}\\frac{1}{n^2}=\\frac{\\pi^2}{6}$$',
      body: 'Dividing both sides by $4$ gives the classic result. Numerically, $\\pi^2/6=1.644934$, while the first four terms $1+1/4+1/9+1/16=1.423611$ already move toward that value.',
      takeaway:
        'For the odd function $x$ on $[-\\pi,\\pi]$, the sine coefficients are explicit enough that Parseval turns directly into the Basel identity.',
    },
  ],
  solution:
    'Since $f(x)=x$ is odd on $[-\\pi,\\pi]$, its cosine coefficients vanish: $$a_0=0,\\qquad a_n=0.$$ The sine coefficients satisfy $$b_n=\\frac{2(-1)^{n+1}}{n}.$$ Therefore the Fourier series is $$x=2\\sum_{n=1}^{\\infty}\\frac{(-1)^{n+1}}{n}\\sin(nx),\qquad -\\pi<x<\\pi.$$ Parseval gives $$\\frac{1}{\\pi}\\int_{-\\pi}^{\\pi}x^2\\,dx=\\sum_{n=1}^{\\infty}b_n^2.$$ The left side is $$\\frac{1}{\\pi}\\cdot 2\\int_0^{\\pi}x^2\\,dx=\\frac{2\\pi^2}{3},$$ while the right side is $$\\sum_{n=1}^{\\infty}\\frac{4}{n^2}=4\\sum_{n=1}^{\\infty}\\frac{1}{n^2}.$$ Hence $$4\\sum_{n=1}^{\\infty}\\frac{1}{n^2}=\\frac{2\\pi^2}{3}\\Rightarrow \\sum_{n=1}^{\\infty}\\frac{1}{n^2}=\\frac{\\pi^2}{6}.$$',
  verifiedPatterns: [
    '\\frac{2(-1)^{n+1}}{n}',
    'x=2\\sum',
    'Parseval',
    '\\frac{2\\pi^2}{3}',
    '\\frac{\\pi^2}{6}',
  ],
  minDiagramSteps: 5,
};
