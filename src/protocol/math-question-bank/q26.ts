import { axesGraph, numberLine, wrapMathSvg } from '../math-svg';
import type { MathQuestionDef } from './types';

export const Q26: MathQuestionDef = {
  id: 'q26',
  number: 26,
  topic: 'Gamma MGF, moments, and sums of independent Gamma variables',
  question:
    'Let $X\\sim \\operatorname{Gamma}(\\alpha,\\lambda)$ in the shape-rate convention, so $$f_X(x)=\\frac{\\lambda^\\alpha}{\\Gamma(\\alpha)}x^{\\alpha-1}e^{-\\lambda x},\\qquad x>0.$$ Find the moment generating function, use it to compute $E[X]$ and $\\operatorname{Var}(X)$, and show that the sum of independent Gamma variables with the same rate is again Gamma.',
  steps: [
    {
      title: 'Write the Gamma density and note the parameter roles',
      formula:
        '$$f_X(x)=\\frac{\\lambda^\\alpha}{\\Gamma(\\alpha)}x^{\\alpha-1}e^{-\\lambda x},\\qquad x>0$$',
      body: 'Here $\\alpha$ is the shape and $\\lambda$ is the rate. For a concrete check, if $\\alpha=3$ and $\\lambda=2$, then $$f_X(1)=\\frac{2^3}{\\Gamma(3)}1^{2}e^{-2}=\\frac{8}{2}e^{-2}=4e^{-2}\\approx 0.541,$$ so the formula gives a positive density value as expected.',
      diagram: axesGraph({
        curves: [
          {
            d: 'M 40 138 C 72 130 104 92 132 58 C 154 34 184 36 214 68 C 238 92 254 114 268 128',
            stroke: '#1d4ed8',
            label: 'Gamma density',
            labelPos: [202, 48],
          },
        ],
        xLabel: 'x',
        yLabel: 'f_X',
      }),
    },
    {
      title: 'Integrate e^{tX} against the density to get the MGF',
      formula:
        '$$M_X(t)=E[e^{tX}]=\\int_0^\\infty e^{tx}\\frac{\\lambda^\\alpha}{\\Gamma(\\alpha)}x^{\\alpha-1}e^{-\\lambda x}\\,dx=\\left(\\frac{\\lambda}{\\lambda-t}\\right)^\\alpha,\\qquad t<\\lambda$$',
      body: 'Combining the exponentials gives $e^{-(\\lambda-t)x}$, so the integral becomes a Gamma integral with rate $\\lambda-t$. For example, with $\\alpha=2$, $\\lambda=3$, and $t=1$, the formula gives $$M_X(1)=\\left(\\frac{3}{3-1}\\right)^2=\\left(\\frac32\\right)^2=2.25.$$',
      diagram: numberLine(
        [
          { pos: 0, label: 't = 0', color: '#333' },
          { pos: 1, label: 'sample t', color: '#dc2626' },
          { pos: 3, label: 'lambda', color: '#2563eb' },
        ],
        [-0.5, 3.5],
      ),
    },
    {
      title: 'Differentiate the MGF to obtain the mean',
      formula:
        '$$M_X^{\\prime}(t)=\\alpha\\lambda^\\alpha(\\lambda-t)^{-\\alpha-1}\\quad\\Longrightarrow\\quad E[X]=M_X^{\\prime}(0)=\\frac{\\alpha}{\\lambda}$$',
      body: 'Evaluating at $t=0$ leaves $\\alpha\\lambda^\\alpha\\lambda^{-\\alpha-1}=\\alpha/\\lambda$. With the numerical example $\\alpha=4$ and $\\lambda=2$, this gives $$E[X]=\\frac{4}{2}=2.$$',
      diagram: numberLine(
        [
          { pos: 0, label: '0', color: '#333' },
          { pos: 2, label: 'alpha/lambda = 2', color: '#dc2626' },
          { pos: 4, label: 'right tail', color: '#16a34a' },
        ],
        [0, 4.5],
      ),
    },
    {
      title: 'Use the second derivative for the variance',
      formula:
        '$$M_X^{\\prime\\prime}(0)=\\frac{\\alpha(\\alpha+1)}{\\lambda^2},\\qquad \\operatorname{Var}(X)=M_X^{\\prime\\prime}(0)-\\bigl(M_X^{\\prime}(0)\\bigr)^2=\\frac{\\alpha}{\\lambda^2}$$',
      body: 'Substituting the mean into the variance identity gives $$\\frac{\\alpha(\\alpha+1)}{\\lambda^2}-\\frac{\\alpha^2}{\\lambda^2}=\\frac{\\alpha}{\\lambda^2}.$$ For $\\alpha=4$ and $\\lambda=2$, the variance is $$\\frac{4}{2^2}=1.$$',
      diagram: wrapMathSvg(
        [
          '<rect x="40" y="42" width="86" height="86" fill="#dbeafe" stroke="#1d4ed8"/>',
          '<rect x="174" y="66" width="86" height="62" fill="#dcfce7" stroke="#16a34a"/>',
          '<text x="83" y="84" font-size="15" text-anchor="middle">mean</text>',
          '<text x="83" y="106" font-size="12" text-anchor="middle">alpha/lambda</text>',
          '<text x="217" y="84" font-size="15" text-anchor="middle">variance</text>',
          '<text x="217" y="106" font-size="12" text-anchor="middle">alpha/lambda^2</text>',
        ].join(''),
      ),
    },
    {
      title: 'Multiply MGFs to analyze a sum with common rate',
      formula:
        '$$X\\sim \\Gamma(\\alpha,\\lambda),\\ Y\\sim \\Gamma(\\beta,\\lambda),\\ X\\perp Y$$\n$$M_{X+Y}(t)=M_X(t)M_Y(t)=\\left(\\frac{\\lambda}{\\lambda-t}\\right)^\\alpha\\left(\\frac{\\lambda}{\\lambda-t}\\right)^\\beta=\\left(\\frac{\\lambda}{\\lambda-t}\\right)^{\\alpha+\\beta}$$',
      body: 'Independence turns the MGF of the sum into a product. For a numerical check, if $\\alpha=2$, $\\beta=3$, $\\lambda=5$, and $t=1$, then $$M_{X+Y}(1)=\\left(\\frac{5}{4}\\right)^5\\approx 3.052,$$ exactly the same as multiplying $\\left(\\frac54\\right)^2$ and $\\left(\\frac54\\right)^3$.',
      diagram: wrapMathSvg(
        [
          '<rect x="28" y="54" width="74" height="62" fill="#dbeafe" stroke="#1d4ed8"/>',
          '<rect x="118" y="54" width="74" height="62" fill="#dcfce7" stroke="#16a34a"/>',
          '<rect x="208" y="42" width="74" height="74" fill="#fee2e2" stroke="#dc2626"/>',
          '<text x="65" y="88" font-size="14" text-anchor="middle">Gamma a</text>',
          '<text x="155" y="88" font-size="14" text-anchor="middle">Gamma b</text>',
          '<text x="245" y="88" font-size="14" text-anchor="middle">Gamma a+b</text>',
          '<text x="110" y="88" font-size="16" text-anchor="middle">+</text>',
          '<text x="200" y="88" font-size="16" text-anchor="middle">=</text>',
        ].join(''),
      ),
    },
    {
      title: 'Read off the distribution of the sum',
      formula:
        '$$X+Y\\sim \\Gamma(\\alpha+\\beta,\\lambda)$$',
      body: 'The product MGF has the exact Gamma form with shape $\\alpha+\\beta$ and the same rate $\\lambda$. In the sample case above, $$X+Y\\sim \\Gamma(5,5),$$ so the mean is $(2+3)/5=1$ and the variance is $(2+3)/25=0.2$.',
      takeaway: 'MGFs package normalization, moments, and convolution into one compact tool for the Gamma family.',
    },
  ],
  solution:
    'For $$X\\sim \\Gamma(\\alpha,\\lambda),\\qquad f_X(x)=\\frac{\\lambda^\\alpha}{\\Gamma(\\alpha)}x^{\\alpha-1}e^{-\\lambda x},$$ the moment generating function is $$M_X(t)=E[e^{tX}]=\\left(\\frac{\\lambda}{\\lambda-t}\\right)^\\alpha,\\qquad t<\\lambda.$$ Differentiating gives $$E[X]=M_X^{\\prime}(0)=\\frac{\\alpha}{\\lambda},$$ and $$\\operatorname{Var}(X)=M_X^{\\prime\\prime}(0)-\\bigl(M_X^{\\prime}(0)\\bigr)^2=\\frac{\\alpha}{\\lambda^2}.$$ If $$X\\sim \\Gamma(\\alpha,\\lambda),\\qquad Y\\sim \\Gamma(\\beta,\\lambda),\\qquad X\\perp Y,$$ then $$M_{X+Y}(t)=M_X(t)M_Y(t)=\\left(\\frac{\\lambda}{\\lambda-t}\\right)^{\\alpha+\\beta},$$ so $$X+Y\\sim \\Gamma(\\alpha+\\beta,\\lambda).$$',
  verifiedPatterns: [
    '\\left(\\frac{\\lambda}{\\lambda-t}\\right)^\\alpha',
    '\\frac{\\alpha}{\\lambda}',
    '\\frac{\\alpha}{\\lambda^2}',
    'Gamma(\\alpha+\\beta,\\lambda)',
    't<\\lambda',
  ],
  minDiagramSteps: 5,
};
