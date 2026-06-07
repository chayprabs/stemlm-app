import { axesGraph, numberLine, wrapMathSvg } from '../math-svg';
import type { MathQuestionDef } from './types';

export const Q31: MathQuestionDef = {
  id: 'q31',
  number: 31,
  topic: 'Heat equation on the line and the error-function profile',
  question:
    'Solve the heat equation $$u_t=ku_{xx},\\qquad -\\infty<x<\\infty,\\ t>0,$$ with initial data $$u(x,0)=\\begin{cases}1,&|x|<1,\\\\0,&|x|>1.\\end{cases}$$ Express the solution using the heat kernel and simplify it to an error-function formula.',
  steps: [
    {
      title: 'Write the initial data and the heat kernel',
      formula:
        '$$G(x,t)=\\frac{1}{\\sqrt{4\\pi kt}}e^{-x^2/(4kt)},\\qquad u(x,t)=(G(\\cdot,t)*u_0)(x)$$',
      body: 'The initial profile is a box of height $1$ on $(-1,1)$. For a numerical check, with $k=1$ and $t=1$ the kernel at the origin is $$G(0,1)=\\frac{1}{\\sqrt{4\\pi}}\\approx 0.282,$$ which shows the Gaussian averaging weight is positive and normalized.',
      diagram: wrapMathSvg(
        [
          '<rect x="88" y="52" width="124" height="62" fill="#dbeafe" stroke="#1d4ed8" stroke-width="2"/>',
          '<line x1="36" y1="114" x2="264" y2="114" stroke="#333" stroke-width="2"/>',
          '<text x="88" y="132" font-size="12" text-anchor="middle">-1</text>',
          '<text x="212" y="132" font-size="12" text-anchor="middle">1</text>',
          '<text x="150" y="42" font-size="13" text-anchor="middle">u(x,0) = 1 on |x| &lt; 1</text>',
        ].join(''),
      ),
    },
    {
      title: 'Convolve the kernel with the indicator of [-1, 1]',
      formula:
        '$$u(x,t)=\\int_{-1}^{1}\\frac{1}{\\sqrt{4\\pi kt}}\\exp\\!\\left(-\\frac{(x-\\xi)^2}{4kt}\\right)d\\xi$$',
      body: 'Because $u_0(\\xi)=1$ on $[-1,1]$ and $0$ elsewhere, the convolution integral only runs from $-1$ to $1$. At $x=0$, $k=1$, and $t=1$, this becomes $$u(0,1)=\\int_{-1}^{1}\\frac{1}{\\sqrt{4\\pi}}e^{-\\xi^2/4}\\,d\\xi,$$ a symmetric Gaussian average of the initial hot interval.',
      diagram: axesGraph({
        curves: [
          {
            d: 'M 40 138 C 80 134 110 94 150 36 C 190 94 220 134 260 138',
            stroke: '#1d4ed8',
            label: 'heat kernel centered at x',
            labelPos: [196, 50],
          },
        ],
        xLabel: 'xi',
        yLabel: 'weight',
      }),
    },
    {
      title: 'Substitute to convert the Gaussian integral into erf',
      formula:
        '$$s=\\frac{x-\\xi}{2\\sqrt{kt}}\\quad\\Longrightarrow\\quad u(x,t)=\\frac12\\left[\\operatorname{erf}\\!\\left(\\frac{x+1}{2\\sqrt{kt}}\\right)-\\operatorname{erf}\\!\\left(\\frac{x-1}{2\\sqrt{kt}}\\right)\\right]$$',
      body: 'The change of variables turns the Gaussian integral into the standard error function. At $x=0$ with $k=t=1$, the formula gives $$u(0,1)=\\frac12\\bigl[\\operatorname{erf}(1/2)-\\operatorname{erf}(-1/2)\\bigr]=\\operatorname{erf}(1/2)\\approx 0.5205.$$',
      diagram: axesGraph({
        curves: [
          {
            d: 'M 40 132 C 82 128 96 72 120 58 C 136 48 164 48 180 58 C 204 72 218 128 260 132',
            stroke: '#16a34a',
            label: 'smoothed profile',
            labelPos: [192, 52],
          },
        ],
        xLabel: 'x',
        yLabel: 'u(x,t)',
      }),
    },
    {
      title: 'Check the initial-time limit at points inside and outside the hot interval',
      formula:
        '$$\\lim_{t\\to 0^+}u(x,t)=\\begin{cases}1,&|x|<1,\\\\0,&|x|>1,\\end{cases}$$',
      body: 'If $|x|<1$, then $(x+1)/(2\\sqrt{kt})\\to +\\infty$ and $(x-1)/(2\\sqrt{kt})\\to -\\infty$, so the bracket becomes $1-(-1)=2$ and the limit is $1$. For example, at $x=0$ and $k=1$, taking $t=0.01$ gives arguments $5$ and $-5$, so $u(0,0.01)\\approx \\frac12(1-(-1))=1$. If $x=2$, both arguments go to $+\\infty$, so the limit is $0$.',
      diagram: numberLine(
        [
          { pos: -1, label: '-1', color: '#2563eb' },
          { pos: 0, label: 'inside -> 1', color: '#dc2626' },
          { pos: 1, label: '1', color: '#2563eb' },
          { pos: 2, label: 'outside -> 0', color: '#16a34a' },
        ],
        [-1.5, 2.5],
      ),
    },
    {
      title: 'Note the symmetry and interface smoothing',
      formula:
        '$$u(-x,t)=u(x,t),\\qquad u(1,1)=\\frac12\\bigl[\\operatorname{erf}(1)-\\operatorname{erf}(0)\\bigr]=\\frac12\\operatorname{erf}(1)\\approx 0.421$$',
      body: 'The initial box is even, and the heat kernel is also even, so the solution remains symmetric. With $k=1$ and $t=1$, the boundary point value is $$u(1,1)=\\frac12\\bigl[\\operatorname{erf}(1)-\\operatorname{erf}(0)\\bigr]=\\frac12\\operatorname{erf}(1)\\approx 0.421,$$ which shows how diffusion smooths the jump at $x=1$.',
      diagram: wrapMathSvg(
        [
          '<path d="M 40 132 C 72 130 96 88 120 70 C 136 58 164 58 180 70 C 204 88 228 130 260 132" fill="none" stroke="#1d4ed8" stroke-width="2.5"/>',
          '<line x1="150" y1="40" x2="150" y2="136" stroke="#94a3b8" stroke-width="1.5" stroke-dasharray="4 4"/>',
          '<text x="150" y="28" font-size="13" text-anchor="middle">even solution</text>',
          '<text x="176" y="84" font-size="12">u(1,1) approx 0.421</text>',
        ].join(''),
      ),
    },
    {
      title: 'State the closed-form solution',
      body: 'The Gaussian heat kernel spreads the unit box into a smooth profile whose edges are controlled by error functions. The formula automatically preserves even symmetry and tends back to the discontinuous initial profile as $t\\to 0^+$.',
      takeaway: 'For step-like initial data on the real line, the heat equation smooths jumps into error-function transition layers.',
    },
  ],
  solution:
    'Using the heat kernel $$G(x,t)=\\frac{1}{\\sqrt{4\\pi kt}}e^{-x^2/(4kt)},$$ the solution is the convolution $$u(x,t)=\\int_{-1}^{1}\\frac{1}{\\sqrt{4\\pi kt}}\\exp\\!\\left(-\\frac{(x-\\xi)^2}{4kt}\\right)d\\xi.$$ With the substitution $$s=\\frac{x-\\xi}{2\\sqrt{kt}},$$ this simplifies to $$u(x,t)=\\frac12\\left[\\operatorname{erf}\\!\\left(\\frac{x+1}{2\\sqrt{kt}}\\right)-\\operatorname{erf}\\!\\left(\\frac{x-1}{2\\sqrt{kt}}\\right)\\right].$$ This is even in $x$, and as $t\\to 0^+$ it approaches $1$ for $|x|<1$ and $0$ for $|x|>1$.',
  verifiedPatterns: [
    '\\operatorname{erf}',
    '\\frac12\\left[\\operatorname{erf}\\!\\left(\\frac{x+1}{2\\sqrt{kt}}\\right)-\\operatorname{erf}\\!\\left(\\frac{x-1}{2\\sqrt{kt}}\\right)\\right]',
    '|x|<1',
    '|x|>1',
    'u(-x,t)=u(x,t)',
  ],
  minDiagramSteps: 5,
};
