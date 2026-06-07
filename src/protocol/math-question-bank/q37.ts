import { axesGraph, matrixDisplay } from '../math-svg';
import type { MathQuestionDef } from './types';

export const Q37: MathQuestionDef = {
  id: 'q37',
  number: 37,
  topic: 'Newton divided differences',
  question:
    'Using the data points $$(0,1),\\ (1,3),\\ (2,7),\\ (3,13),$$ construct the Newton divided-difference interpolating polynomial and simplify it. Show that it equals $$f(x)=x^2+x+1.$$',
  steps: [
    {
      title: 'Tabulate the given interpolation data',
      formula: '$$x_0=0,\\ f(x_0)=1;\\quad x_1=1,\\ f(x_1)=3;\\quad x_2=2,\\ f(x_2)=7;\\quad x_3=3,\\ f(x_3)=13$$',
      body: 'We start with four equally spaced data points, and the outputs jump by $3-1=2$, $7-3=4$, and $13-7=6$. Because those jumps are not constant, the data are not linear.',
      diagram: matrixDisplay(
        [
          ['x', 'f(x)'],
          ['0', '1'],
          ['1', '3'],
          ['2', '7'],
          ['3', '13'],
        ],
        'Interpolation data',
      ),
    },
    {
      title: 'Compute the first divided differences',
      formula:
        '$$f[0,1]=\\frac{3-1}{1-0}=2,\\qquad f[1,2]=\\frac{7-3}{2-1}=4,\\qquad f[2,3]=\\frac{13-7}{3-2}=6$$',
      body: 'The secant slopes are $f[0,1]=2$, $f[1,2]=4$, and $f[2,3]=6$, so they are not constant. That rules out a linear interpolating polynomial.',
      diagram: matrixDisplay(
        [
          ['interval', 'first divided difference'],
          ['[0,1]', '2'],
          ['[1,2]', '4'],
          ['[2,3]', '6'],
        ],
        'First divided differences',
      ),
    },
    {
      title: 'Compute the second and third divided differences',
      formula:
        '$$f[0,1,2]=\\frac{4-2}{2-0}=1,\\qquad f[1,2,3]=\\frac{6-4}{3-1}=1,\\qquad f[0,1,2,3]=\\frac{1-1}{3-0}=0$$',
      body: 'Now the second divided differences satisfy $1=1$, and the next one is $0$. That is exactly the pattern of a quadratic polynomial.',
      diagram: matrixDisplay(
        [
          ['order', 'entries'],
          ['second', '1, 1'],
          ['third', '0'],
        ],
        'Higher divided differences',
      ),
    },
    {
      title: 'Write the Newton form of the interpolant',
      formula:
        '$$P(x)=f[x_0]+f[x_0,x_1](x-x_0)+f[x_0,x_1,x_2](x-x_0)(x-x_1)+f[x_0,x_1,x_2,x_3](x-x_0)(x-x_1)(x-x_2)$$\n$$P(x)=1+2(x-0)+1(x-0)(x-1)+0(x-0)(x-1)(x-2)$$',
      body: 'Substituting the coefficients gives $P(x)=1+2(x-0)+1(x-0)(x-1)+0(\cdots)$. Because the last coefficient is $0$, the cubic term disappears immediately.',
      diagram: matrixDisplay(
        [
          ['coefficient', 'value'],
          ['f[x0]', '1'],
          ['f[x0,x1]', '2'],
          ['f[x0,x1,x2]', '1'],
          ['f[x0,x1,x2,x3]', '0'],
        ],
        'Newton coefficients',
      ),
    },
    {
      title: 'Expand and simplify the polynomial',
      formula:
        '$$P(x)=1+2x+x(x-1)=1+2x+x^2-x=x^2+x+1$$',
      body: 'The simplified polynomial is exactly $x^2+x+1$. Checking at $x=3$ gives $9+3+1=13$, which matches the final data point and confirms the fit.',
      diagram: axesGraph({
        curves: [
          {
            d: 'M 40 128 Q 90 108 140 82 Q 190 50 240 20',
            label: 'y = x^2 + x + 1',
            labelPos: [174, 26],
          },
        ],
        points: [
          { x: 40, y: 128, label: '(0,1)', fill: '#dc2626' },
          { x: 107, y: 110, label: '(1,3)', fill: '#2563eb' },
          { x: 173, y: 74, label: '(2,7)', fill: '#16a34a' },
          { x: 240, y: 20, label: '(3,13)', fill: '#7c3aed' },
        ],
        xLabel: 'x',
        yLabel: 'y',
      }),
    },
    {
      title: 'Interpret the result',
      formula: '$$P(x)=x^2+x+1$$',
      body: 'Because $f[0,1,2,3]=0$, the data came from a polynomial of degree at most $2$. The interpolant is exactly $P(x)=x^2+x+1$.',
      takeaway: 'Newton divided differences build the interpolant coefficient by coefficient, and the first zero higher-order difference reveals the true polynomial degree.',
    },
  ],
  solution:
    'The divided differences are $$f[0,1]=2,\\qquad f[1,2]=4,\\qquad f[2,3]=6,$$ then $$f[0,1,2]=1,\\qquad f[1,2,3]=1,$$ and finally $$f[0,1,2,3]=0.$$ Therefore the Newton interpolating polynomial is $$P(x)=1+2(x-0)+1(x-0)(x-1)+0(x-0)(x-1)(x-2).$$ Simplifying gives $$P(x)=1+2x+x(x-1)=x^2+x+1.$$ Hence the interpolant is exactly $$f(x)=x^2+x+1.$$',
  verifiedPatterns: ['f[0,1]=2', 'f[0,1,2]=1', 'f[0,1,2,3]=0', 'x^2+x+1'],
  minDiagramSteps: 5,
};
