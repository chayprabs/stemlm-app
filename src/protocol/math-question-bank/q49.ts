import { axesGraph, numberLine, wrapMathSvg } from '../math-svg';
import type { MathQuestionDef } from './types';

export const Q49: MathQuestionDef = {
  id: 'q49',
  number: 49,
  topic: 'Steepest descent asymptotics and Stirling approximation',
  question:
    'In asymptotic analysis, use the steepest-descent/Laplace method on the integral $$n!=\\Gamma(n+1)=\\int_0^{\\infty} t^n e^{-t}\\,dt$$ to derive Stirling\'s approximation. Identify the dominant saddle, carry out the quadratic expansion, and obtain the leading asymptotic formula for $n!$.',
  steps: [
    {
      title: 'Rescale the Gamma integral into exponential form',
      formula:
        '$$n!=\\int_0^{\\infty} t^n e^{-t}\\,dt=n^{n+1}\\int_0^{\\infty} e^{n(\\ln x-x)}\\,dx,\\qquad t=nx$$',
      body: 'After the change of variables $t=nx$, the factor $dt=n\\,dx$ produces the prefactor $n^{n+1}$. For $n=10$, this front factor is $10^{11}$, while the exponential term $e^{10(\\ln x-x)}$ is sharply peaked near one special point.',
      diagram: axesGraph({
        curves: [
          {
            d: 'M 40 138 Q 80 90 120 62 T 180 54 T 260 126',
            stroke: '#2563eb',
            label: 'e^{n(ln x - x)}',
            labelPos: [164, 48],
          },
        ],
        xLabel: 'x',
        yLabel: 'integrand',
      }),
    },
    {
      title: 'Locate the dominant saddle point',
      formula:
        '$$\\phi(x)=\\ln x-x,\\qquad \\phi\'(x)=\\frac{1}{x}-1,\\qquad \\phi\'(1)=0,\\qquad \\phi\'\'(1)=-1$$',
      body: 'The steepest contribution comes from the stationary point of $\\phi$. Setting $1/x-1=0$ gives $x=1$, and the negative second derivative $\\phi\'\'(1)=-1$ shows this point is a local maximum. Also $\\phi(1)=\\ln 1-1=-1$.',
      diagram: numberLine(
        [
          { pos: 0.4, label: 'rise', color: '#16a34a' },
          { pos: 1, label: 'x=1 saddle', color: '#dc2626' },
          { pos: 1.6, label: 'fall', color: '#2563eb' },
        ],
        [0.3, 1.7],
      ),
    },
    {
      title: 'Expand the phase quadratically near x = 1',
      formula:
        '$$\\phi(x)=\\phi(1)+\\frac{\\phi\'\'(1)}{2}(x-1)^2+O((x-1)^3)=-1-\\frac{(x-1)^2}{2}+O((x-1)^3)$$',
      body: 'This is the steepest-descent step: near the saddle, the logarithmic phase looks Gaussian. At $x=1.1$, the exact value is $\\ln(1.1)-1.1=-1.00469$, while the quadratic approximation gives $-1-(0.1)^2/2=-1.005$, already very close.',
      diagram: axesGraph({
        curves: [
          {
            d: 'M 60 120 Q 120 60 180 120',
            stroke: '#dc2626',
            label: 'quadratic peak',
            labelPos: [118, 56],
          },
        ],
        xLabel: 'x-1',
        yLabel: 'phase',
      }),
    },
    {
      title: 'Approximate the integral by a Gaussian',
      formula:
        '$$n!\\sim n^{n+1}e^{-n}\\int_{-\\infty}^{\\infty} e^{-\\frac{n}{2}(x-1)^2}\\,dx=n^{n+1}e^{-n}\\sqrt{\\frac{2\\pi}{n}}=\\sqrt{2\\pi n}\\left(\\frac{n}{e}\\right)^n$$',
      body: 'Replacing the peak by its Gaussian model produces the standard normal integral. For $n=10$, Stirling gives $$\\sqrt{20\\pi}\\left(\\frac{10}{e}\\right)^{10}\\approx 3598695.6,$$ close to the exact value $10!=3628800$.',
      diagram: wrapMathSvg(
        [
          '<path d="M 40 130 Q 95 52 150 40 Q 205 52 260 130" fill="#dbeafe" stroke="#1d4ed8" stroke-width="2"/>',
          '<line x1="150" y1="40" x2="150" y2="140" stroke="#64748b" stroke-dasharray="5 5"/>',
          '<text x="150" y="30" font-size="12" text-anchor="middle">Gaussian near x=1</text>',
          '<text x="158" y="96" font-size="12">width ~ 1/√n</text>',
        ].join(''),
      ),
    },
    {
      title: 'State Stirling approximation and compare numerically',
      formula:
        '$$n!\\sim \\sqrt{2\\pi n}\\left(\\frac{n}{e}\\right)^n$$',
      body: 'For $n=10$, the relative error is $$\\frac{|3628800-3598695.6|}{3628800}\\approx 0.00830,$$ or about $0.83\\%$. The approximation improves as $n$ grows because the saddle-point neighborhood contributes an ever larger fraction of the integral.',
      takeaway:
        'Steepest descent turns the factorial integral into a local Gaussian problem at the saddle $x=1$, yielding Stirling\'s leading asymptotic formula.',
    },
  ],
  solution:
    'Starting from $$n!=\\Gamma(n+1)=\\int_0^{\\infty} t^n e^{-t}\\,dt,$$ set $t=nx$ to get $$n!=n^{n+1}\\int_0^{\\infty} e^{n\\phi(x)}\\,dx,\\qquad \\phi(x)=\\ln x-x.$$ The stationary point satisfies $$\\phi\'(x)=\\frac{1}{x}-1=0\\Rightarrow x=1,$$ and $$\\phi\'\'(1)=-1<0,$$ so $x=1$ is the dominant saddle. Expanding around that point gives $$\\phi(x)=-1-\\frac{(x-1)^2}{2}+O((x-1)^3).$$ Therefore $$e^{n\\phi(x)}\\approx e^{-n}e^{-\\frac{n}{2}(x-1)^2},$$ and the integral is asymptotic to a Gaussian: $$n!\\sim n^{n+1}e^{-n}\\int_{-\\infty}^{\\infty} e^{-\\frac{n}{2}(x-1)^2}\\,dx=n^{n+1}e^{-n}\\sqrt{\\frac{2\\pi}{n}}.$$ Hence $$n!\\sim \\sqrt{2\\pi n}\\left(\\frac{n}{e}\\right)^n,$$ which is Stirling\'s approximation.',
  verifiedPatterns: [
    '\\phi\'\'(1)=-1',
    'x=1',
    '\\sqrt{2\\pi n}',
    '\\left(\\frac{n}{e}\\right)^n',
    'Stirling',
  ],
  minDiagramSteps: 4,
};
