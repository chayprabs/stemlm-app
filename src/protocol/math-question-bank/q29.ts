import { axesGraph, numberLine, wrapMathSvg } from '../math-svg';
import type { MathQuestionDef } from './types';

export const Q29: MathQuestionDef = {
  id: 'q29',
  number: 29,
  topic: "Wave equation with Gaussian initial data and D'Alembert's formula",
  question:
    "Solve the one-dimensional wave equation $$u_{tt}=c^2u_{xx},\\qquad -\\infty<x<\\infty,$$ with initial conditions $$u(x,0)=e^{-x^2},\\qquad u_t(x,0)=0.$$ Use D'Alembert's formula and simplify the answer.",
  steps: [
    {
      title: 'Sketch the initial Gaussian pulse',
      body: 'The initial displacement is the even function $f(x)=e^{-x^2}$, centered at $x=0$ with height $1$. For example, $f(0)=1$ and $f(1)=e^{-1}\\approx 0.368$, so the pulse is already much smaller one unit away from the center.',
      diagram: axesGraph({
        curves: [
          {
            d: 'M 40 136 C 82 132 112 94 150 38 C 188 94 218 132 260 136',
            stroke: '#1d4ed8',
            label: 'e^{-x^2}',
            labelPos: [190, 52],
          },
        ],
        points: [{ x: 150, y: 38, label: '(0,1)', fill: '#dc2626' }],
        xLabel: 'x',
        yLabel: 'u(x,0)',
      }),
    },
    {
      title: "Write D'Alembert's formula for general initial data",
      formula:
        '$$u(x,t)=\\frac12\\bigl[f(x-ct)+f(x+ct)\\bigr]+\\frac{1}{2c}\\int_{x-ct}^{x+ct} g(s)\\,ds$$',
      body: 'Here $f(x)=u(x,0)$ and $g(x)=u_t(x,0)$. In this problem $g(x)=0$, so the integral term vanishes. As a check, if $c=1$, $x=0$, and $t=1$, the remaining formula predicts $$u(0,1)=\\frac12\\bigl[f(-1)+f(1)\\bigr]=\\frac12(e^{-1}+e^{-1})=e^{-1}\\approx 0.368.$$',
      diagram: wrapMathSvg(
        [
          '<line x1="36" y1="126" x2="118" y2="48" stroke="#1d4ed8" stroke-width="2.5"/>',
          '<polygon points="118,48 110,52 116,60" fill="#1d4ed8"/>',
          '<line x1="36" y1="126" x2="118" y2="126" stroke="#16a34a" stroke-width="2.5"/>',
          '<polygon points="118,126 109,122 109,130" fill="#16a34a"/>',
          '<text x="126" y="48" font-size="12">right-moving f(x-ct)</text>',
          '<text x="126" y="126" font-size="12">left-moving f(x+ct)</text>',
        ].join(''),
      ),
    },
    {
      title: 'Substitute the Gaussian and the zero initial velocity',
      formula:
        '$$u(x,t)=\\frac12\\left(e^{-(x-ct)^2}+e^{-(x+ct)^2}\\right)$$',
      body: 'Since $g=0$, the solution is just the average of two translated copies of the initial Gaussian. For $c=1$, $x=1$, and $t=1$, this gives $$u(1,1)=\\frac12\\bigl(e^{0}+e^{-4}\\bigr)=\\frac12(1+0.0183)\\approx 0.509.$$',
      diagram: axesGraph({
        curves: [
          {
            d: 'M 40 138 C 72 136 94 112 118 70 C 136 42 150 36 164 70 C 184 112 206 136 232 138',
            stroke: '#dc2626',
            label: 'left packet',
            labelPos: [86, 54],
          },
          {
            d: 'M 68 138 C 94 136 116 112 136 70 C 150 42 166 36 186 70 C 210 112 232 136 260 138',
            stroke: '#16a34a',
            label: 'right packet',
            labelPos: [216, 54],
          },
        ],
        xLabel: 'x',
        yLabel: 'u',
      }),
    },
    {
      title: 'Verify the initial conditions directly',
      formula:
        '$$u(x,0)=\\frac12\\left(e^{-x^2}+e^{-x^2}\\right)=e^{-x^2},\\qquad u_t(x,0)=0$$',
      body: 'At $t=0$ the two traveling Gaussians coincide and add to the original profile. Differentiating in time brings down opposite factors from $(x-ct)^2$ and $(x+ct)^2$, so they cancel at $t=0$. For instance, at $x=0$ we get $u(0,0)=1$ and $u_t(0,0)=0$.',
      diagram: wrapMathSvg(
        [
          '<path d="M 40 136 C 82 132 112 94 150 38 C 188 94 218 132 260 136" fill="none" stroke="#1d4ed8" stroke-width="2.5"/>',
          '<path d="M 40 136 C 82 132 112 94 150 38 C 188 94 218 132 260 136" fill="none" stroke="#16a34a" stroke-width="1.5" stroke-dasharray="5 4"/>',
          '<text x="150" y="24" font-size="13" text-anchor="middle">at t = 0 the two halves overlap</text>',
        ].join(''),
      ),
    },
    {
      title: 'Track the pulse centers as they move with speed c',
      formula:
        '$$\\text{centers at }x=\\pm ct$$',
      body: 'The right-moving Gaussian is centered at $x=ct$ and the left-moving Gaussian at $x=-ct$. If $c=2$ and $t=3$, then the centers are at $x=\\pm 6$, so the original pulse has split into two equal pulses moving apart at speed $2$.',
      diagram: numberLine(
        [
          { pos: -6, label: '-ct', color: '#dc2626' },
          { pos: 0, label: 'origin', color: '#333' },
          { pos: 6, label: '+ct', color: '#16a34a' },
        ],
        [-7, 7],
      ),
    },
    {
      title: 'State the final closed form',
      body: 'Because the initial velocity is zero, D\'Alembert\'s formula produces an equal-weight average of a left-moving and a right-moving copy of the initial Gaussian. The solution remains even in $x$ for all time because the initial data are even.',
      takeaway: 'Zero initial velocity splits the initial displacement into two identical traveling waves moving in opposite directions.',
    },
  ],
  solution:
    "D'Alembert's formula gives $$u(x,t)=\\frac12\\bigl[f(x-ct)+f(x+ct)\\bigr]+\\frac{1}{2c}\\int_{x-ct}^{x+ct} g(s)\\,ds.$$ Here $$f(x)=e^{-x^2},\\qquad g(x)=0,$$ so the integral term disappears. Therefore $$u(x,t)=\\frac12\\left(e^{-(x-ct)^2}+e^{-(x+ct)^2}\\right).$$ At $t=0$ this becomes $$u(x,0)=e^{-x^2},$$ and differentiating shows $$u_t(x,0)=0,$$ so the formula satisfies both initial conditions.",
  verifiedPatterns: [
    '\\frac12\\left(e^{-(x-ct)^2}+e^{-(x+ct)^2}\\right)',
    'u_t(x,0)=0',
    'x-ct',
    'x+ct',
    "D'Alembert",
  ],
  minDiagramSteps: 5,
};
