import { axesGraph, matrixDisplay, numberLine, wrapMathSvg } from '../math-svg';
import type { MathQuestionDef } from './types';

export const Q48: MathQuestionDef = {
  id: 'q48',
  number: 48,
  topic: 'Laplace transforms, inverse transforms, and an integro-differential equation',
  question:
    'Compute (a) $\\mathcal L\\{t^2e^{-3t}\\sin(2t)\\}$, (b) $\\mathcal L^{-1}\\left\\{\\dfrac{3s+7}{(s^2+2s+5)(s+1)}\\right\\}$, and (c) solve the integro-differential equation $$y\'(t)+\\int_0^t y(\\tau)\\,d\\tau=1,\\qquad y(0)=0.$$',
  steps: [
    {
      title: 'Start from the shifted sine transform',
      formula:
        '$$\\mathcal L\\{e^{-3t}\\sin(2t)\\}=\\frac{2}{(s+3)^2+4}$$',
      body: 'The basic transform is $\\mathcal L\\{\\sin(2t)\\}=2/(s^2+4)$, and multiplying by $e^{-3t}$ shifts $s$ to $s+3$. At $s=1$, this gives $2/(4^2+4)=2/20=0.1$.',
      diagram: numberLine(
        [
          { pos: 0, label: 's', color: '#333' },
          { pos: 3, label: 's+3', color: '#dc2626' },
        ],
        [0, 4],
      ),
    },
    {
      title: 'Use the t^2 differentiation rule',
      formula:
        '$$\\mathcal L\\{t^2f(t)\\}=\\frac{d^2}{ds^2}F(s),\\qquad F(s)=\\frac{2}{(s+3)^2+4}$$\n$$\\mathcal L\\{t^2e^{-3t}\\sin(2t)\\}=\\frac{4\\bigl(3(s+3)^2-4\\bigr)}{\\bigl((s+3)^2+4\\bigr)^3}$$',
      body: 'Because the sign is $(-1)^2=+1$, we differentiate twice. Writing $u=s+3$, the second derivative becomes $4(3u^2-4)/(u^2+4)^3$. At $s=1$, this evaluates to $4(3\\cdot 16-4)/20^3=176/8000=0.022$.',
      diagram: axesGraph({
        curves: [
          {
            d: 'M 40 118 Q 90 104 140 82 T 240 46',
            stroke: '#2563eb',
            label: 'transformed rational function',
            labelPos: [148, 70],
          },
        ],
        xLabel: 's',
        yLabel: 'L',
      }),
    },
    {
      title: 'Decompose the inverse-transform rational function',
      formula:
        '$$\\frac{3s+7}{(s^2+2s+5)(s+1)}=\\frac{1}{s+1}-\\frac{s+1}{(s+1)^2+4}+\\frac{3}{(s+1)^2+4}$$',
      body: 'Set $u=s+1$, so the expression becomes $(3u+4)/(u(u^2+4))$. Solving $$\\frac{3u+4}{u(u^2+4)}=\\frac{A}{u}+\\frac{Bu+C}{u^2+4}$$ gives $A=1$, $B=-1$, and $C=3$.',
      diagram: matrixDisplay(
        [
          ['A', '1'],
          ['B', '-1'],
          ['C', '3'],
        ],
        'Partial-fraction coefficients',
      ),
    },
    {
      title: 'Invert the transformed pieces term by term',
      formula:
        '$$\\mathcal L^{-1}\\left\\{\\frac{1}{s+1}\\right\\}=e^{-t},\\qquad \\mathcal L^{-1}\\left\\{\\frac{s+1}{(s+1)^2+4}\\right\\}=e^{-t}\\cos(2t)$$\n$$\\mathcal L^{-1}\\left\\{\\frac{3}{(s+1)^2+4}\\right\\}=\\frac{3}{2}e^{-t}\\sin(2t)$$\n$$f(t)=e^{-t}-e^{-t}\\cos(2t)+\\frac{3}{2}e^{-t}\\sin(2t)$$',
      body: 'The shift by $s+1$ produces the common damping factor $e^{-t}$. At $t=1$, the value is $$e^{-1}\\bigl(1-\\cos 2+\\tfrac32\\sin 2\\bigr)\\approx 1.0227,$$ and at $t=0$ the expression is $1-1+0=0$, which matches the transform decomposition.',
      diagram: axesGraph({
        curves: [
          {
            d: 'M 40 106 C 72 48 104 78 136 92 C 168 102 200 70 232 84 C 248 92 256 104 262 112',
            stroke: '#dc2626',
            label: 'e^{-t}(1-cos2t+3sin2t/2)',
            labelPos: [150, 54],
          },
        ],
        xLabel: 't',
        yLabel: 'f(t)',
      }),
    },
    {
      title: 'Transform the integro-differential equation',
      formula:
        '$$\\mathcal L\\{y\'(t)\\}=sY(s)-y(0)=sY(s),\\qquad \\mathcal L\\left\\{\\int_0^t y(\\tau)\\,d\\tau\\right\\}=\\frac{Y(s)}{s}$$\n$$sY(s)+\\frac{Y(s)}{s}=\\frac{1}{s}$$',
      body: 'The initial condition is $y(0)=0$, so no extra constant appears in the derivative transform. Multiplying the transformed equation by $s$ gives $(s^2+1)Y(s)=1$, a simple algebraic equation for $Y(s)$.',
      diagram: wrapMathSvg(
        [
          '<rect x="44" y="58" width="72" height="40" fill="#eff6ff" stroke="#2563eb"/>',
          '<rect x="140" y="58" width="72" height="40" fill="#fef3c7" stroke="#ca8a04"/>',
          '<rect x="236" y="58" width="28" height="40" fill="#fee2e2" stroke="#dc2626"/>',
          '<text x="80" y="82" font-size="12" text-anchor="middle">sY(s)</text>',
          '<text x="176" y="82" font-size="12" text-anchor="middle">Y(s)/s</text>',
          '<text x="250" y="82" font-size="12" text-anchor="middle">1/s</text>',
          '<line x1="116" y1="78" x2="140" y2="78" stroke="#333" stroke-width="2"/>',
          '<text x="128" y="72" font-size="12" text-anchor="middle">+</text>',
          '<line x1="212" y1="78" x2="236" y2="78" stroke="#333" stroke-width="2"/>',
          '<text x="224" y="72" font-size="12" text-anchor="middle">=</text>',
        ].join(''),
      ),
    },
    {
      title: 'Invert Y(s) to solve the equation',
      formula:
        '$$Y(s)=\\frac{1}{s^2+1}\\Rightarrow y(t)=\\sin t$$',
      body: 'The final transform is standard. At $t=\\pi/2$, the solution gives $y(\\pi/2)=1$, and differentiating plus integrating confirms $$y\'(t)+\\int_0^t y(\\tau)\\,d\\tau=\\cos t+(1-\\cos t)=1.$$',
      takeaway:
        'Laplace transforms turn differential and integral operators into algebra, so all three parts reduce to rational functions in $s$.',
    },
  ],
  solution:
    'For part (a), start with $$\\mathcal L\\{e^{-3t}\\sin(2t)\\}=\\frac{2}{(s+3)^2+4}.$$ Using $$\\mathcal L\\{t^2f(t)\\}=\\frac{d^2}{ds^2}F(s),$$ we obtain $$\\mathcal L\\{t^2e^{-3t}\\sin(2t)\\}=\\frac{4\\bigl(3(s+3)^2-4\\bigr)}{\\bigl((s+3)^2+4\\bigr)^3}.$$ For part (b), write $$\\frac{3s+7}{(s^2+2s+5)(s+1)}=\\frac{1}{s+1}-\\frac{s+1}{(s+1)^2+4}+\\frac{3}{(s+1)^2+4},$$ so $$\\mathcal L^{-1}=e^{-t}-e^{-t}\\cos(2t)+\\frac{3}{2}e^{-t}\\sin(2t).$$ For part (c), transforming $$y\'(t)+\\int_0^t y(\\tau)\\,d\\tau=1,\\qquad y(0)=0,$$ gives $$sY(s)+\\frac{Y(s)}{s}=\\frac{1}{s},$$ hence $$(s^2+1)Y(s)=1,$$ so $$Y(s)=\\frac{1}{s^2+1}$$ and therefore $$y(t)=\\sin t.$$',
  verifiedPatterns: [
    '4\\bigl(3(s+3)^2-4\\bigr)',
    'e^{-t}-e^{-t}\\cos(2t)+\\frac{3}{2}e^{-t}\\sin(2t)',
    'Y(s)=\\frac{1}{s^2+1}',
    'y(t)=\\sin t',
  ],
  minDiagramSteps: 5,
};
