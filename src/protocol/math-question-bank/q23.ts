import { axesGraph, numberLine, wrapMathSvg } from '../math-svg';
import type { MathQuestionDef } from './types';

export const Q23: MathQuestionDef = {
  id: 'q23',
  number: 23,
  topic: 'Probability density normalization and Gamma moments',
  question:
    'A continuous random variable has density $$f(x)=cx^2e^{-x},\\qquad x\\ge 0,$$ and $f(x)=0$ for $x<0$. Find the normalizing constant $c$, compute $E[X]$ and $\\operatorname{Var}(X)$, and identify the distribution as a Gamma law.',
  steps: [
    {
      title: 'Record the support and the basic shape of the density',
      body: 'The factor $x^2$ forces the density to start at $0$ when $x=0$, and the factor $e^{-x}$ makes it decay for large $x$. For example, at $x=1$ the unnormalized shape is $1^2e^{-1}\\approx 0.368$, while at $x=4$ it is $16e^{-4}\\approx 0.293$, so the graph rises first and then falls.',
      diagram: axesGraph({
        curves: [
          {
            d: 'M 40 138 C 70 128 96 102 124 70 C 150 42 184 46 218 78 C 238 96 256 116 270 130',
            stroke: '#1d4ed8',
            label: 'x^2 e^-x',
            labelPos: [214, 52],
          },
        ],
        xLabel: 'x',
        yLabel: 'shape',
      }),
    },
    {
      title: 'Normalize the density to determine c',
      formula:
        '$$1=\\int_0^\\infty cx^2e^{-x}\\,dx=c\\,\\Gamma(3)=c\\cdot 2!$$\n$$c=\\frac12$$',
      body: 'Using the Gamma integral $\\Gamma(3)=2!=2$, the total area becomes $1=2c$. Solving gives $c=\\frac12=0.5$. With that value, the density at $x=2$ is $$f(2)=\\frac12\\cdot 2^2e^{-2}=2e^{-2}\\approx 0.271,$$ which is a plausible positive PDF height.',
      diagram: wrapMathSvg(
        [
          '<path d="M 34 132 C 64 126 96 96 128 58 C 154 32 186 38 216 68 C 238 90 254 112 266 126" fill="none" stroke="#1d4ed8" stroke-width="2.5"/>',
          '<path d="M 34 132 C 64 126 96 96 128 58 C 154 32 186 38 216 68 C 238 90 254 112 266 126 L 266 132 L 34 132 Z" fill="#dbeafe" opacity="0.8"/>',
          '<line x1="34" y1="132" x2="270" y2="132" stroke="#333" stroke-width="2"/>',
          '<text x="150" y="28" font-size="13" text-anchor="middle">area = 1 after c = 1/2</text>',
        ].join(''),
      ),
    },
    {
      title: 'Compute the mean from the next Gamma integral',
      formula:
        '$$E[X]=\\int_0^\\infty x f(x)\\,dx=\\frac12\\int_0^\\infty x^3e^{-x}\\,dx=\\frac12\\Gamma(4)=\\frac12\\cdot 3!=3$$',
      body: 'The factorial value is $3!=6$, so the prefactor $\\frac12$ turns it into $3$. This puts the mean at $x=3$, and that matches the visual location of the density peak near $x=2$ with a right tail beyond it.',
      diagram: numberLine(
        [
          { pos: 0, label: '0', color: '#333' },
          { pos: 2, label: 'mode 2', color: '#16a34a' },
          { pos: 3, label: 'E[X]=3', color: '#dc2626' },
          { pos: 6, label: 'tail', color: '#2563eb' },
        ],
        [0, 6.5],
      ),
    },
    {
      title: 'Compute the second moment',
      formula:
        '$$E[X^2]=\\int_0^\\infty x^2 f(x)\\,dx=\\frac12\\int_0^\\infty x^4e^{-x}\\,dx=\\frac12\\Gamma(5)=\\frac12\\cdot 4!=12$$',
      body: 'Since $4!=24$, multiplying by $\\frac12$ gives $E[X^2]=12$. A quick consistency check is that $12>E[X]^2=9$, which must happen because the variance cannot be negative.',
      diagram: wrapMathSvg(
        [
          '<rect x="34" y="48" width="90" height="76" fill="#dbeafe" stroke="#1d4ed8"/>',
          '<rect x="176" y="34" width="90" height="90" fill="#dcfce7" stroke="#16a34a"/>',
          '<text x="79" y="86" font-size="15" text-anchor="middle">E[X]</text>',
          '<text x="79" y="108" font-size="12" text-anchor="middle">3</text>',
          '<text x="221" y="86" font-size="15" text-anchor="middle">E[X^2]</text>',
          '<text x="221" y="108" font-size="12" text-anchor="middle">12</text>',
        ].join(''),
      ),
    },
    {
      title: 'Subtract the square of the mean to get the variance',
      formula:
        '$$\\operatorname{Var}(X)=E[X^2]-\\bigl(E[X]\\bigr)^2=12-3^2=12-9=3$$',
      body: 'The arithmetic is direct: $3^2=9$, so the spread is $12-9=3$. The standard deviation is therefore $\\sqrt3\\approx 1.732$, which is a sensible scale compared with the mean value $3$.',
      diagram: axesGraph({
        curves: [
          {
            d: 'M 60 126 Q 112 74 162 126',
            stroke: '#dc2626',
            label: 'spread about mean',
            labelPos: [150, 64],
          },
        ],
        points: [{ x: 112, y: 86, label: '3', fill: '#16a34a' }],
        xLabel: 'x',
        yLabel: 'density',
      }),
    },
    {
      title: 'Identify the distribution as Gamma(3,1)',
      formula:
        '$$f(x)=\\frac{x^{3-1}e^{-x}}{\\Gamma(3)}=\\frac{x^2e^{-x}}{2},\\qquad x\\ge 0$$',
      body: 'The Gamma density with shape $k=3$ and rate $\\lambda=1$ is $\\frac{\\lambda^k}{\\Gamma(k)}x^{k-1}e^{-\\lambda x}$. Setting $k=3$ and $\\lambda=1$ gives $$\\frac{1^3}{\\Gamma(3)}x^2e^{-x}=\\frac{x^2e^{-x}}{2},$$ exactly the normalized density we found.',
      takeaway: 'Recognizing the Gamma form makes the moments immediate: shape $3$ and rate $1$ give mean $3$ and variance $3$.',
    },
  ],
  solution:
    'Normalization gives $$1=\\int_0^\\infty cx^2e^{-x}\\,dx=c\\,\\Gamma(3)=2c,$$ so $$c=\\frac12.$$ Then $$E[X]=\\frac12\\int_0^\\infty x^3e^{-x}\\,dx=\\frac12\\Gamma(4)=\\frac12\\cdot 3!=3,$$ and $$E[X^2]=\\frac12\\int_0^\\infty x^4e^{-x}\\,dx=\\frac12\\Gamma(5)=\\frac12\\cdot 4!=12.$$ Therefore $$\\operatorname{Var}(X)=E[X^2]-\\bigl(E[X]\\bigr)^2=12-9=3.$$ Thus $E[X]=3$ and $\\operatorname{Var}(X)=3$. Since $$f(x)=\\frac{x^{3-1}e^{-x}}{\\Gamma(3)}$$ for $x\\ge 0$, the distribution is $$X\\sim \\operatorname{Gamma}(3,1)$$ in the shape-rate convention.',
  verifiedPatterns: ['c=\\frac12', 'E[X]=3', 'Var}(X)=3', 'Gamma}(3,1)', '\\Gamma(3)'],
  minDiagramSteps: 4,
};
