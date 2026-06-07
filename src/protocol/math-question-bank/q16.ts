import { axesGraph, wrapMathSvg } from '../math-svg';
import type { MathQuestionDef } from './types';

export const Q16: MathQuestionDef = {
  id: 'q16',
  number: 16,
  topic: 'Laplace transforms with a rectangular pulse',
  question:
    'Solve $$y\'\'+4y=g(t),\\qquad y(0)=0,\\qquad y\'(0)=0,$$ by Laplace transforms when $$g(t)=1\\text{ for }0\\le t<\\pi,\\qquad g(t)=0\\text{ for }t\\ge\\pi.$$',
  steps: [
    {
      title: 'Rewrite the forcing as a Heaviside pulse',
      formula:
        '$$g(t)=1-u(t-\\pi)$$',
      body: 'At $t=\\pi/2$, the step has not turned off yet, so $g(\\pi/2)=1-0=1$. At $t=3\\pi/2$, the pulse is off, so $g(3\\pi/2)=1-1=0$.',
      diagram: wrapMathSvg(
        [
          '<line x1="32" y1="126" x2="270" y2="126" stroke="#333" stroke-width="2"/>',
          '<line x1="52" y1="146" x2="52" y2="34" stroke="#333" stroke-width="2"/>',
          '<path d="M 52 54 L 178 54 L 178 126 L 260 126" fill="none" stroke="#1d4ed8" stroke-width="2.5"/>',
          '<text x="88" y="46" font-size="12">g(t)=1</text>',
          '<text x="182" y="142" font-size="12">t=pi</text>',
          '<text x="214" y="118" font-size="12">g(t)=0</text>',
        ].join(''),
      ),
    },
    {
      title: 'Take Laplace transforms',
      formula:
        '$$\\mathcal{L}\\{g(t)\\}=\\frac{1-e^{-\\pi s}}{s}$$\n$$s^2Y(s)+4Y(s)=\\frac{1-e^{-\\pi s}}{s}$$',
      body: 'Because the initial conditions are zero, there are no extra $sy(0)$ or $y\'(0)$ terms. At $s=1$, $\\mathcal{L}\\{g\\}(1)=1-e^{-\\pi}\\approx0.9568$.',
      diagram: wrapMathSvg(
        [
          '<rect x="34" y="54" width="92" height="68" fill="#dbeafe" stroke="#1d4ed8"/>',
          '<rect x="174" y="54" width="92" height="68" fill="#dcfce7" stroke="#16a34a"/>',
          '<line x1="126" y1="88" x2="174" y2="88" stroke="#333" stroke-width="2"/>',
          '<polygon points="174,88 165,83 165,93" fill="#333"/>',
          '<text x="80" y="84" font-size="12" text-anchor="middle">g(t)</text>',
          '<text x="80" y="102" font-size="12" text-anchor="middle">1-u(t-pi)</text>',
          '<text x="220" y="84" font-size="12" text-anchor="middle">G(s)</text>',
          '<text x="220" y="102" font-size="12" text-anchor="middle">(1-e^(-pi s))/s</text>',
        ].join(''),
      ),
    },
    {
      title: 'Solve algebraically for Y(s)',
      formula:
        '$$Y(s)=\\frac{1-e^{-\\pi s}}{s(s^2+4)}$$',
      body: 'For $s=1$, this gives $Y(1)=0.9568/(1\\cdot5)\\approx0.1914$. The transform is the pulse transform multiplied by the transfer function $1/(s^2+4)$.',
      diagram: axesGraph({
        curves: [
          {
            d: 'M 40 126 C 88 108 134 88 176 72 S 232 54 258 46',
            stroke: '#7c3aed',
            label: 'Y(s)',
            labelPos: [220, 42],
          },
        ],
        xLabel: 's',
        yLabel: 'Y',
      }),
    },
    {
      title: 'Invert the basic kernel and apply the shift',
      formula:
        '$$\\frac{1}{s(s^2+4)}=\\frac{1}{4s}-\\frac{s}{4(s^2+4)}$$\n$$\\mathcal{L}^{-1}\\!\\left\\{\\frac{1}{s(s^2+4)}\\right\\}=\\frac14\\bigl(1-\\cos 2t\\bigr)$$\n$$y(t)=\\frac14\\bigl(1-\\cos 2t\\bigr)-u(t-\\pi)\\frac14\\bigl(1-\\cos 2(t-\\pi)\\bigr)$$',
      body: 'The partial fraction check works at $s=2$: $1/(2\\cdot8)=1/16$, while $1/(4\\cdot2)-2/(4\\cdot8)=1/8-1/16=1/16$. At $t=\\pi/2$, the first term gives $\\frac14(1-\\cos\\pi)=1/2$.',
      diagram: wrapMathSvg(
        [
          '<text x="150" y="38" font-size="14" text-anchor="middle">inverse transform kernel</text>',
          '<path d="M 40 124 C 76 124 98 86 126 62 S 178 40 210 76 S 244 124 260 124" fill="none" stroke="#1d4ed8" stroke-width="2.5"/>',
          '<text x="208" y="66" font-size="12">1/4(1-cos 2t)</text>',
        ].join(''),
      ),
    },
    {
      title: 'Simplify to the final piecewise solution',
      formula:
        '$$\\cos 2(t-\\pi)=\\cos 2t$$\n$$y(t)=\\begin{cases}\\dfrac14(1-\\cos 2t),&0\\le t<\\pi,\\\\[6pt]0,&t\\ge\\pi.\\end{cases}$$',
      body: 'At $t=\\pi$, the left piece gives $\\frac14(1-\\cos 2\\pi)=0$, so the motion returns exactly to rest when the forcing turns off. At $t=3\\pi/2$, the second piece gives $y=0$.',
      diagram: axesGraph({
        curves: [
          {
            d: 'M 40 126 C 76 126 100 88 132 62 S 184 38 216 62 S 246 126 258 126',
            stroke: '#16a34a',
            label: 'response on [0,pi]',
            labelPos: [194, 34],
          },
          {
            d: 'M 258 126 L 280 126',
            stroke: '#dc2626',
            label: '0 afterward',
            labelPos: [242, 142],
          },
        ],
        xLabel: 't',
        yLabel: 'y',
      }),
      takeaway: 'A rectangular pulse becomes a difference of step responses, and here the pulse length equals one natural period, so the oscillator returns to rest at $t=\\pi$.',
    },
  ],
  solution:
    'Write the forcing as $$g(t)=1-u(t-\\pi).$$ With zero initial data, Laplace transforms give $$\\mathcal{L}\\{g\\}=\\frac{1-e^{-\\pi s}}{s},\\qquad (s^2+4)Y(s)=\\frac{1-e^{-\\pi s}}{s},$$ hence $$Y(s)=\\frac{1-e^{-\\pi s}}{s(s^2+4)}.$$ Since $$\\frac{1}{s(s^2+4)}=\\frac{1}{4s}-\\frac{s}{4(s^2+4)},$$ we have $$\\mathcal{L}^{-1}\\!\\left\\{\\frac{1}{s(s^2+4)}\\right\\}=\\frac14(1-\\cos 2t).$$ Therefore $$y(t)=\\frac14(1-\\cos 2t)-u(t-\\pi)\\frac14(1-\\cos 2(t-\\pi)).$$ Because $$\\cos 2(t-\\pi)=\\cos 2t,$$ this simplifies to $$y(t)=\\begin{cases}\\dfrac14(1-\\cos 2t),&0\\le t<\\pi,\\\\[6pt]0,&t\\ge\\pi.\\end{cases}$$',
  verifiedPatterns: ['1-u(t-\\pi)', '\\frac{1-e^{-\\pi s}}{s(s^2+4)}', '\\frac14(1-\\cos 2t)', '0,&t\\ge\\pi'],
  minDiagramSteps: 5,
};
