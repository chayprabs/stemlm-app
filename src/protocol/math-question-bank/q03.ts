import { axesGraph, contourSketch, matrixDisplay } from '../math-svg';
import type { MathQuestionDef } from './types';

export const Q03: MathQuestionDef = {
  id: 'q03',
  number: 3,
  topic: 'Partial derivatives, gradients, and critical points',
  question:
    'Let f(x,y)=x^3y-xy^3. Compute the partial derivatives, the gradient at (1,1), the directional derivative in the unit direction u=(3,-4)/5, and find and classify the critical points.',
  steps: [
    {
      title: 'Factor the function to see its symmetry',
      formula: '$$f(x,y)=x^3y-xy^3=xy(x^2-y^2)$$',
      body: 'The factorization shows odd symmetry in x and y. For example, f(1,1/2) = 1^3(1/2) - 1(1/2)^3 = 0.5 - 0.125 = 0.375, while f(1,2) = 2 - 8 = -6, so the sign changes across different rays.',
      diagram: contourSketch([
        'M 70 120 C 95 85 125 70 160 62',
        'M 78 145 C 112 126 142 114 175 108',
        'M 62 90 C 88 110 110 128 130 150',
        'M 110 52 C 138 76 166 98 196 118',
      ]),
    },
    {
      title: 'Differentiate with respect to x and y',
      formula:
        '$$f_x=3x^2y-y^3, \\qquad f_y=x^3-3xy^2$$',
      body: 'At (1,1), f_x(1,1) = 3(1)^2(1) - 1^3 = 3 - 1 = 2 and f_y(1,1) = 1^3 - 3(1)(1)^2 = 1 - 3 = -2.',
      diagram: matrixDisplay(
        [
          ['entry', 'formula', 'value at (1,1)'],
          ['f_x', '3x^2y-y^3', '2'],
          ['f_y', 'x^3-3xy^2', '-2'],
        ],
        'First partial derivatives',
        [
          [1, 2],
          [2, 2],
        ],
      ),
    },
    {
      title: 'Form the gradient and take the directional derivative',
      formula:
        '$$\\nabla f(1,1)=(2,-2), \\qquad D_{\\mathbf u}f(1,1)=\\nabla f(1,1)\\cdot \\frac{(3,-4)}{5}=\\frac{14}{5}$$',
      body: 'Compute the dot product directly: (2,-2) . (3/5,-4/5) = 2(3/5) + (-2)(-4/5) = 6/5 + 8/5 = 14/5 = 2.8.',
      diagram: contourSketch(
        [
          'M 75 125 C 100 92 128 73 160 66',
          'M 86 145 C 114 126 142 116 172 110',
          'M 66 92 C 88 114 108 132 124 150',
        ],
        { x1: 140, y1: 90, x2: 190, y2: 60, label: 'grad at (1,1)' },
      ),
    },
    {
      title: 'Solve the critical point equations',
      formula:
        '$$3x^2y-y^3=y(3x^2-y^2)=0, \\qquad x^3-3xy^2=x(x^2-3y^2)=0$$',
      body: 'If x = 0, then the first equation becomes -y^3 = 0 so y = 0. If y = 0, then the second equation becomes x^3 = 0 so x = 0. If x and y are both nonzero, then y^2 = 3x^2 and x^2 = 3y^2, which combine to x^2 = 9x^2, hence x = 0, a contradiction. So the only critical point is (0,0).',
      diagram: matrixDisplay(
        [
          ['case', 'equation', 'result'],
          ['x=0', '-y^3=0', 'y=0'],
          ['y=0', 'x^3=0', 'x=0'],
          ['x,y!=0', 'y^2=3x^2 and x^2=3y^2', 'impossible'],
        ],
        'Critical point search',
      ),
    },
    {
      title: 'Check the Hessian at the origin',
      formula:
        '$$H_f(x,y)=\\begin{pmatrix} 6xy & 3x^2-3y^2 \\\\ 3x^2-3y^2 & -6xy \\end{pmatrix}, \\qquad H_f(0,0)=\\begin{pmatrix} 0 & 0 \\\\ 0 & 0 \\end{pmatrix}$$',
      body: 'The second-derivative test is inconclusive because the Hessian determinant at (0,0) is 0(0) - 0^2 = 0. So we classify the point by checking signs of f along nearby curves instead.',
      diagram: matrixDisplay(
        [
          ['6xy', '3x^2-3y^2'],
          ['3x^2-3y^2', '-6xy'],
        ],
        'Hessian matrix',
        [
          [0, 0],
          [0, 1],
          [1, 0],
          [1, 1],
        ],
      ),
    },
    {
      title: 'Use two rays through the origin to classify the critical point',
      formula:
        '$$f(t,t/2)=\\frac{3}{8}t^4>0, \\qquad f(t,2t)=-6t^4<0 \\quad (t \\neq 0)$$',
      body: 'Substituting y = t/2 gives t^3(t/2) - t(t/2)^3 = t^4(1/2 - 1/8) = 3t^4/8 > 0. Substituting y = 2t gives t^3(2t) - t(2t)^3 = 2t^4 - 8t^4 = -6t^4 < 0. Since f takes both signs arbitrarily close to (0,0), the origin is a saddle point.',
      diagram: axesGraph({
        curves: [
          {
            d: 'M 40 140 L 240 40',
            stroke: '#16a34a',
            label: 'y = x/2',
            labelPos: [214, 52],
          },
          {
            d: 'M 40 40 L 140 140',
            stroke: '#dc2626',
            label: 'y = 2x',
            labelPos: [112, 42],
          },
        ],
        points: [{ x: 40, y: 140, label: '(0,0)', fill: '#111827' }],
        annotations:
          '<text x="205" y="94" font-size="12" fill="#16a34a">f > 0</text><text x="146" y="118" font-size="12" fill="#dc2626">f < 0</text>',
      }),
      takeaway: 'The correct directional derivative is 14/5, and the only critical point is (0,0), which is a saddle.',
    },
  ],
  solution:
    'The partial derivatives are f_x = 3x^2y-y^3 and f_y = x^3-3xy^2. Therefore grad f(1,1) = (2,-2). With u = (3,-4)/5, the directional derivative is 2(3/5) + (-2)(-4/5) = 14/5. Solving f_x = f_y = 0 shows the only critical point is (0,0). The Hessian there is the zero matrix, so the second-derivative test is inconclusive, but f(t,t/2) = 3t^4/8 > 0 and f(t,2t) = -6t^4 < 0, hence (0,0) is a saddle.',
  verifiedPatterns: ['3x^2y-y^3', 'x^3-3xy^2', '(2,-2)', '14/5', 'only critical point is (0,0)', 'saddle'],
  minDiagramSteps: 5,
};
