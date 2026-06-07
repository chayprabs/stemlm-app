import { axesGraph, numberLine } from '../math-svg';
import type { MathQuestionDef } from './types';

export const Q02: MathQuestionDef = {
  id: 'q02',
  number: 2,
  topic: 'Continuity and differentiability at a point',
  question:
    'Let f(x)=x^2\\sin(1/x) for x \\neq 0 and f(0)=0. Show (a) f is continuous at 0, (b) f\'(0)=0, and (c) f\' is not continuous at 0, so f is not C^1.',
  steps: [
    {
      title: 'Restate the piecewise definition near x = 0',
      body: 'For x close to 0, the oscillation comes from sin(1/x) while the factor x^2 shrinks fast. At x = 0.1, f(0.1) = 0.1^2 sin(10) = 0.01(-0.544) = -0.00544, already much smaller than 0.1.',
      diagram: numberLine(
        [
          { pos: -0.2, label: '-0.2', color: '#333' },
          { pos: 0, label: '0', color: '#dc2626' },
          { pos: 0.2, label: '0.2', color: '#333' },
        ],
        [-0.25, 0.25],
      ),
    },
    {
      title: 'Use the squeeze theorem for continuity',
      formula:
        '$$-x^2 \\le x^2\\sin(1/x) \\le x^2 \\quad\\Rightarrow\\quad \\lim_{x\\to 0} x^2\\sin(1/x)=0$$',
      body: 'Because -1 <= sin(1/x) <= 1, multiplying by x^2 >= 0 gives the bounds. With x = 0.1, we get -0.01 <= f(0.1) = -0.00544 <= 0.01, and both side bounds go to 0.',
      diagram: axesGraph({
        curves: [
          {
            d: 'M 40 70 Q 90 85 140 105 T 240 135',
            stroke: '#16a34a',
            label: 'y = x^2',
            labelPos: [220, 70],
          },
          {
            d: 'M 40 150 Q 90 135 140 115 T 240 85',
            stroke: '#16a34a',
            label: 'y = -x^2',
            labelPos: [210, 155],
          },
          {
            d: 'M 40 110 C 70 75 90 145 110 95 C 130 60 150 145 170 105 C 190 70 210 140 240 108',
            stroke: '#1d4ed8',
            label: 'x^2 sin(1/x)',
            labelPos: [180, 48],
          },
        ],
        points: [{ x: 40, y: 110, label: '(0,0)', fill: '#dc2626' }],
        xLabel: 'x',
        yLabel: 'y',
      }),
    },
    {
      title: 'Form the derivative at 0 from the definition',
      formula:
        '$$f\'(0)=\\lim_{h\\to 0}\\frac{f(h)-f(0)}{h}=\\lim_{h\\to 0}\\frac{h^2\\sin(1/h)}{h}=\\lim_{h\\to 0} h\\sin(1/h)$$',
      body: 'The quotient simplifies by one power of h. With h = 0.1, h sin(1/h) = 0.1 sin(10) = 0.1(-0.544) = -0.0544, and the extra factor h again damps the oscillation.',
      diagram: numberLine(
        [
          { pos: -0.15, label: 'h<0', color: '#1d4ed8' },
          { pos: 0, label: 'h->0', color: '#dc2626' },
          { pos: 0.15, label: 'h>0', color: '#1d4ed8' },
        ],
        [-0.2, 0.2],
      ),
    },
    {
      title: 'Squeeze the difference quotient to compute f\'(0)',
      formula:
        '$$-|h| \\le h\\sin(1/h) \\le |h| \\quad\\Rightarrow\\quad \\lim_{h\\to 0} h\\sin(1/h)=0$$',
      body: 'Since |sin(1/h)| <= 1, we have |h sin(1/h)| <= |h|. At h = 0.01, |h sin(1/h)| <= 0.01, so the limit is 0 and f\'(0)=0.',
      diagram: axesGraph({
        curves: [
          {
            d: 'M 40 75 L 240 145',
            stroke: '#16a34a',
            label: 'y = |h|',
            labelPos: [210, 84],
          },
          {
            d: 'M 40 145 L 240 75',
            stroke: '#16a34a',
            label: 'y = -|h|',
            labelPos: [205, 156],
          },
          {
            d: 'M 40 110 C 70 92 92 132 118 100 C 145 73 167 140 192 108 C 214 84 228 118 240 110',
            stroke: '#1d4ed8',
            label: 'h sin(1/h)',
            labelPos: [160, 58],
          },
        ],
        points: [{ x: 40, y: 110, label: '0', fill: '#dc2626' }],
        xLabel: 'h',
        yLabel: 'quotient',
      }),
    },
    {
      title: 'Differentiate for x not equal to 0',
      formula:
        '$$f\'(x)=\\frac{d}{dx}\\left[x^2\\sin(1/x)\\right]=2x\\sin(1/x)-\\cos(1/x), \\quad x \\neq 0$$',
      body: 'Use the product rule and the chain rule: d/dx[sin(1/x)] = cos(1/x)(-1/x^2). At x = 0.1, f\'(0.1) = 2(0.1)sin(10) - cos(10) = 0.2(-0.544) - (-0.839) = -0.109 + 0.839 = 0.730.',
      diagram: axesGraph({
        curves: [
          {
            d: 'M 42 120 C 80 45 100 155 125 70 C 150 20 175 158 205 75 C 225 38 245 145 258 92',
            stroke: '#dc2626',
            label: 'f\'(x)',
            labelPos: [220, 38],
          },
        ],
        annotations:
          '<text x="148" y="166" font-size="12" text-anchor="middle">oscillation persists near 0</text>',
        xLabel: 'x',
        yLabel: 'f\'',
      }),
    },
    {
      title: 'Show f\' does not approach a single value at 0',
      formula:
        '$$x_n=\\frac{1}{2\\pi n} \\Rightarrow f\'(x_n)\\to -1, \\qquad y_n=\\frac{1}{(2n+1)\\pi} \\Rightarrow f\'(y_n)\\to 1$$',
      body: 'Along x_n, cos(1/x_n) = cos(2pi n) = 1, so f\'(x_n) = 2x_n sin(2pi n) - 1 = 0 - 1 = -1. Along y_n, cos(1/y_n) = cos((2n+1)pi) = -1, so f\'(y_n) = 0 - (-1) = 1. Two different limit values mean f\' is not continuous at 0, so f is not C^1.',
      takeaway: 'A vanishing prefactor x^2 is enough for continuity and for f\'(0), but not enough to make the derivative itself continuous.',
    },
  ],
  solution:
    'For continuity, |f(x)| = |x^2 sin(1/x)| <= x^2, so f is continuous at 0. For the derivative at 0, f\'(0) = lim_{h->0} h sin(1/h) = 0 by the same squeeze idea. For x != 0, f\'(x) = 2x\\sin(1/x)-\\cos(1/x). Along x_n = 1/(2pi n), f\'(x_n) -> -1, while along y_n = 1/((2n+1)pi), f\'(y_n) -> 1, so f\' is not continuous at 0 and f is not C^1.',
  verifiedPatterns: ['continuous at 0', "f'(0) = 0", '2x\\sin(1/x)-\\cos(1/x)', 'not continuous at 0', 'not C^1'],
  minDiagramSteps: 4,
};
