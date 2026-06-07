import { axesGraph, matrixDisplay, numberLine } from '../math-svg';
import type { MathQuestionDef } from './types';

export const Q34: MathQuestionDef = {
  id: 'q34',
  number: 34,
  topic: 'Gaussian quadrature on [-1, 1]',
  question:
    'Use Gauss-Legendre quadrature to approximate $$\\int_{-1}^1 e^{x^2}\\,dx$$ with the 2-point and 3-point rules, and compare the results.',
  steps: [
    {
      title: 'Identify the integrand and the standard interval',
      formula: '$$I=\\int_{-1}^1 e^{x^2}\\,dx$$',
      body: 'The interval is already the Gauss-Legendre interval $[-1,1]$, so no change of variables is needed. At $x=0$, $e^{x^2}=e^0=1$, while at $x=1$, $e^{x^2}=e\\approx 2.718$, so the integrand is even and larger near the endpoints.',
      diagram: axesGraph({
        curves: [
          {
            d: 'M 40 38 Q 90 84 140 110 Q 190 84 240 38',
            label: 'y = e^{x^2}',
            labelPos: [188, 32],
          },
        ],
        points: [{ x: 140, y: 110, label: 'x = 0', fill: '#16a34a' }],
        xLabel: 'x',
        yLabel: 'y',
      }),
    },
    {
      title: 'Apply the 2-point Gauss-Legendre rule',
      formula:
        '$$I\\approx f\\!\\left(-\\frac{1}{\\sqrt3}\\right)+f\\!\\left(\\frac{1}{\\sqrt3}\\right)=2e^{1/3}\\approx 2.791225$$',
      body: 'The 2-point rule uses nodes $x=\\pm 1/\\sqrt3$ with weights $1$ and $1$. Because $f(x)=e^{x^2}$ is even, both function values are the same, so the rule collapses to $2e^{1/3}$.',
      diagram: numberLine(
        [
          { pos: -0.577, label: '-1/sqrt3', color: '#dc2626' },
          { pos: 0.577, label: '1/sqrt3', color: '#dc2626' },
        ],
        [-1, 1],
      ),
    },
    {
      title: 'Apply the 3-point Gauss-Legendre rule',
      formula:
        '$$I\\approx \\frac{5}{9}f\\!\\left(-\\sqrt{\\frac35}\\right)+\\frac{8}{9}f(0)+\\frac{5}{9}f\\!\\left(\\sqrt{\\frac35}\\right)$$\n$$=\\frac89+\\frac{10}{9}e^{3/5}\\approx 2.913465$$',
      body: 'The 3-point nodes are $x=0$ and $x=\\pm\\sqrt{3/5}$ with weights $8/9, 5/9, 5/9$. Again symmetry reduces the arithmetic: the two outer evaluations are equal, so only one exponential value needs to be computed.',
      diagram: numberLine(
        [
          { pos: -0.775, label: '-sqrt(3/5)', color: '#2563eb' },
          { pos: 0, label: '0', color: '#16a34a' },
          { pos: 0.775, label: 'sqrt(3/5)', color: '#2563eb' },
        ],
        [-1, 1],
      ),
    },
    {
      title: 'Use a reference value for comparison',
      formula: '$$I=\\sqrt\\pi\\,\\operatorname{erfi}(1)\\approx 2.925303$$',
      body: 'Although $\\int e^{x^2}\\,dx$ is not elementary, the definite integral can be evaluated numerically as $I=2.925303$. This lets us measure the actual quadrature errors.',
      diagram: matrixDisplay(
        [
          ['method', 'value'],
          ['exact reference', '2.925303'],
          ['2-point', '2.791225'],
          ['3-point', '2.913465'],
        ],
        'Reference and approximations',
      ),
    },
    {
      title: 'Compare the errors',
      formula:
        '$$|I-Q_2|\\approx |2.925303-2.791225|=0.134078$$\n$$|I-Q_3|\\approx |2.925303-2.913465|=0.011838$$',
      body: 'The ratio $0.134078/0.011838\\approx 11.3$ shows that the 3-point rule is far more accurate. This matches the fact that the 3-point rule is exact through degree $5$, while the 2-point rule is exact only through degree $3$.',
      diagram: matrixDisplay(
        [
          ['rule', 'approximation', 'absolute error'],
          ['2-point', '2.791225', '0.134078'],
          ['3-point', '2.913465', '0.011838'],
        ],
        'Error comparison',
      ),
    },
    {
      title: 'State the better approximation',
      formula: '$$Q_2=2e^{1/3}\\approx 2.791225,\\qquad Q_3=\\frac89+\\frac{10}{9}e^{3/5}\\approx 2.913465$$',
      body: 'Both rules underestimate the integral, and the errors are $|2.925303-2.913465|=0.011838$ and $|2.925303-2.791225|=0.134078$. So the 3-point Gaussian quadrature is clearly superior on $[-1,1]$.',
      takeaway: 'More Gauss points place sample evaluations where they best capture the curvature of the integrand, dramatically improving accuracy.',
    },
  ],
  solution:
    'For $$I=\\int_{-1}^1 e^{x^2}\\,dx,$$ the 2-point Gauss-Legendre rule uses nodes $$\\pm\\frac{1}{\\sqrt3}$$ and weights $1,1$, so $$Q_2=f\\!\\left(-\\frac{1}{\\sqrt3}\\right)+f\\!\\left(\\frac{1}{\\sqrt3}\\right)=2e^{1/3}\\approx 2.791225.$$ The 3-point rule uses nodes $$0,\\ \\pm\\sqrt{\\frac35}$$ with weights $$\\frac89,\\ \\frac59,\\ \\frac59,$$ giving $$Q_3=\\frac89+\\frac{10}{9}e^{3/5}\\approx 2.913465.$$ A high-accuracy reference value is $$I\\approx 2.925303,$$ so the absolute errors are approximately $$0.134078$$ for the 2-point rule and $$0.011838$$ for the 3-point rule. Thus the 3-point Gaussian quadrature is much more accurate.',
  verifiedPatterns: ['2e^{1/3}', '2.791225', '\\frac89+\\frac{10}{9}e^{3/5}', '2.913465', '2.925303'],
  minDiagramSteps: 5,
};
