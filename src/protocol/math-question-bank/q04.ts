import { axesGraph, matrixDisplay, numberLine } from '../math-svg';
import type { MathQuestionDef } from './types';

export const Q04: MathQuestionDef = {
  id: 'q04',
  number: 4,
  topic: 'Taylor series and remainder estimates',
  question:
    'Find the Maclaurin polynomial for ln(1+x) through x^5, use it to approximate ln(1.2), and bound the error with a Lagrange remainder estimate. Show that a 5-term truncation gives error less than 10^-4.',
  steps: [
    {
      title: 'Place x = 0.2 inside the convergence interval',
      formula: '$$\\ln(1+x)=\\sum_{n=1}^{\\infty}(-1)^{n+1}\\frac{x^n}{n}, \\qquad |x|<1$$',
      body: 'We evaluate at x = 0.2, and 0.2 < 1, so the Maclaurin series converges. Numerically, 1 + x = 1.2 and the target value is ln(1.2).',
      diagram: numberLine(
        [
          { pos: -1, label: '-1', color: '#333' },
          { pos: 0.2, label: 'x = 0.2', color: '#dc2626' },
          { pos: 1, label: '1', color: '#333' },
        ],
        [-1.2, 1.2],
      ),
    },
    {
      title: 'Write the Taylor polynomial through x^5',
      formula:
        '$$\\ln(1+x)=x-\\frac{x^2}{2}+\\frac{x^3}{3}-\\frac{x^4}{4}+\\frac{x^5}{5}+R_5(x)$$',
      body: 'The signs alternate and the powers increase by 1 each time. At x = 0.2, the first few terms already shrink fast because 0.2^2 = 0.04, 0.2^3 = 0.008, and 0.2^5 = 0.00032.',
      diagram: axesGraph({
        curves: [
          {
            d: 'M 40 135 C 90 110 135 88 175 70 C 210 56 240 44 265 36',
            stroke: '#1d4ed8',
            label: 'y = ln(1+x)',
            labelPos: [188, 50],
          },
        ],
        points: [{ x: 84, y: 121, label: 'x = 0.2', fill: '#dc2626' }],
        xLabel: 'x',
        yLabel: 'y',
      }),
    },
    {
      title: 'Evaluate the five displayed terms at x = 0.2',
      formula:
        '$$0.2-\\frac{0.2^2}{2}+\\frac{0.2^3}{3}-\\frac{0.2^4}{4}+\\frac{0.2^5}{5}=0.2-0.02+0.002667-0.0004+0.000064$$',
      body: 'Term by term we get 0.2^2/2 = 0.04/2 = 0.02, 0.2^3/3 = 0.008/3 = 0.002667, 0.2^4/4 = 0.0016/4 = 0.0004, and 0.2^5/5 = 0.00032/5 = 0.000064.',
      diagram: matrixDisplay(
        [
          ['term', 'value'],
          ['x', '0.2'],
          ['-x^2/2', '-0.02'],
          ['x^3/3', '0.002667'],
          ['-x^4/4', '-0.0004'],
          ['x^5/5', '0.000064'],
        ],
        'Numerical Taylor terms at x = 0.2',
      ),
    },
    {
      title: 'Add the terms to approximate ln(1.2)',
      formula:
        '$$\\ln(1.2) \\approx 0.2-0.02+0.002667-0.0004+0.000064 = 0.182331$$',
      body: 'Adding in order gives 0.2 - 0.02 = 0.18, then 0.18 + 0.002667 = 0.182667, then 0.182667 - 0.0004 = 0.182267, and finally 0.182267 + 0.000064 = 0.182331. So ln(1.2) approx 0.1823.',
      diagram: axesGraph({
        curves: [
          {
            d: 'M 40 136 C 88 113 130 91 170 73 C 205 58 238 46 264 38',
            stroke: '#1d4ed8',
          },
          {
            d: 'M 40 136 C 92 112 135 90 172 72 C 206 58 238 46 262 38',
            stroke: '#16a34a',
            label: 'P_5(x)',
            labelPos: [214, 62],
          },
        ],
        points: [{ x: 84, y: 121, label: '0.1823', fill: '#dc2626' }],
        xLabel: 'x',
        yLabel: 'y',
      }),
    },
    {
      title: 'Bound the remainder with the Lagrange formula',
      formula:
        '$$R_5(x)=\\frac{f^{(6)}(\\xi)}{6!}x^6, \\qquad f^{(6)}(x)=\\frac{-120}{(1+x)^6}$$',
      body: 'For 0 <= x <= 0.2, we have |f^(6)(x)| <= 120. Therefore |R_5(0.2)| <= 120(0.2)^6/720 = (0.2)^6/6 = 0.000064/6 = 0.000010667, about 1.07 x 10^-5.',
      diagram: numberLine(
        [
          { pos: 0, label: '0', color: '#333' },
          { pos: 0.2, label: '0.2', color: '#dc2626' },
        ],
        [0, 0.25],
      ),
    },
    {
      title: 'Conclude the approximation and tolerance claim',
      formula:
        '$$|R_5(0.2)| \\le 1.07\\times 10^{-5} < 10^{-4}$$',
      body: 'The five-term truncation through x^5 is accurate enough because 0.000010667 is smaller than 0.0001 by almost a factor of 10. Thus the approximation 0.182331 is safely within the requested tolerance.',
      takeaway: 'For alternating Taylor series at a small x, the polynomial gives both a good approximation and a clean error estimate.',
    },
  ],
  solution:
    'Using the Maclaurin expansion, ln(1+x) = x - x^2/2 + x^3/3 - x^4/4 + x^5/5 + R_5(x). At x = 0.2 this gives ln(1.2) approx 0.182331, so ln(1.2) approx 0.1823. Since f^(6)(x) = -120/(1+x)^6, the Lagrange remainder satisfies |R_5(0.2)| <= 120(0.2)^6/720 = 1.07 x 10^-5 < 10^-4. Therefore the 5-term truncation meets the error target.',
  verifiedPatterns: ['0.1823', 'x - x^2/2 + x^3/3 - x^4/4 + x^5/5', '1.07 x 10^-5', '10^-4', '5-term truncation'],
  minDiagramSteps: 5,
};
