import { axesGraph, matrixDisplay, wrapMathSvg } from '../math-svg';
import type { MathQuestionDef } from './types';

export const Q47: MathQuestionDef = {
  id: 'q47',
  number: 47,
  topic: 'Constrained minimization with two linear constraints',
  question:
    'Minimize $$x^2+y^2+z^2$$ subject to the constraints $$x+2y+3z=6\\qquad\\text{and}\\qquad x+y=2.$$ Find the minimizing point and the minimum value.',
  steps: [
    {
      title: 'Reduce the feasible set to a single line',
      formula:
        '$$x+y=2\\Rightarrow x=2-y,\\qquad x+2y+3z=6\\Rightarrow y+3z=4$$\n$$y=4-3z,\\qquad x=3z-2$$',
      body: 'Solving the two linear constraints leaves one free parameter. If $z=1$, then $y=4-3=1$ and $x=3-2=1$, so the point $(1,1,1)$ lies on the intersection line and satisfies both constraints exactly.',
      diagram: wrapMathSvg(
        [
          '<polygon points="70,118 178,56 246,82 138,144" fill="#dbeafe" opacity="0.7" stroke="#2563eb"/>',
          '<polygon points="84,52 204,72 214,146 94,126" fill="#fee2e2" opacity="0.7" stroke="#dc2626"/>',
          '<line x1="126" y1="116" x2="190" y2="80" stroke="#16a34a" stroke-width="3"/>',
          '<text x="52" y="34" font-size="12">x+2y+3z=6</text>',
          '<text x="198" y="154" font-size="12">x+y=2</text>',
          '<text x="194" y="74" font-size="12">intersection line</text>',
        ].join(''),
      ),
    },
    {
      title: 'Substitute into the objective',
      formula:
        '$$F(z)=(3z-2)^2+(4-3z)^2+z^2=19z^2-36z+20$$',
      body: 'This one-variable quadratic records the squared distance to the origin along the feasible line. At $z=1$ it gives $$F(1)=19-36+20=3,$$ which matches the direct computation $1^2+1^2+1^2=3$.',
      diagram: axesGraph({
        curves: [
          {
            d: 'M 40 136 Q 100 80 160 58 T 260 118',
            stroke: '#2563eb',
            label: 'F(z)=19z²-36z+20',
            labelPos: [142, 50],
          },
        ],
        xLabel: 'z',
        yLabel: 'F',
      }),
    },
    {
      title: 'Differentiate the quadratic to find the minimizing z',
      formula:
        '$$F\'(z)=38z-36=0\\Rightarrow z=\\frac{36}{38}=\\frac{18}{19}$$',
      body: 'The quadratic opens upward because the coefficient $19$ is positive, so its critical point is the global minimum. Numerically, $36/38=0.94737$, which is the exact value $18/19$.',
      diagram: axesGraph({
        curves: [
          {
            d: 'M 40 136 Q 100 80 160 58 T 260 118',
            stroke: '#2563eb',
          },
        ],
        points: [{ x: 160, y: 58, label: 'z=18/19', fill: '#dc2626' }],
        xLabel: 'z',
        yLabel: 'F',
      }),
    },
    {
      title: 'Recover x and y from the constraints',
      formula:
        '$$x=3z-2=\\frac{54}{19}-\\frac{38}{19}=\\frac{16}{19},\\qquad y=4-3z=\\frac{76}{19}-\\frac{54}{19}=\\frac{22}{19}$$',
      body: 'Substituting $z=18/19$ gives the minimizing point $$\\left(\\frac{16}{19},\\frac{22}{19},\\frac{18}{19}\\right).$$ A quick check shows $16/19+22/19=38/19=2$ and $16/19+44/19+54/19=114/19=6$, so both constraints are satisfied.',
      diagram: matrixDisplay(
        [
          ['x', '16/19'],
          ['y', '22/19'],
          ['z', '18/19'],
        ],
        'Minimizing coordinates',
      ),
    },
    {
      title: 'Evaluate the minimum value',
      formula:
        '$$\\left(\\frac{16}{19}\\right)^2+\\left(\\frac{22}{19}\\right)^2+\\left(\\frac{18}{19}\\right)^2=\\frac{256+484+324}{361}=\\frac{1064}{361}=\\frac{56}{19}$$',
      body: 'Adding the squared numerators gives $256+484+324=1064$, and dividing by $361=19^2$ simplifies to $56/19\\approx 2.94737$. That is smaller than the trial value $3$ found at the feasible point $(1,1,1)$.',
      takeaway:
        'After eliminating the linear constraints, the problem becomes a one-variable quadratic minimization with the exact answer $$\\left(\\frac{16}{19},\\frac{22}{19},\\frac{18}{19}\\right).$$',
    },
  ],
  solution:
    'Use the constraints to eliminate two variables: $$x+y=2\\Rightarrow x=2-y,$$ and substituting into $$x+2y+3z=6$$ gives $$y+3z=4,$$ so $$y=4-3z,\\qquad x=3z-2.$$ The objective becomes $$F(z)=(3z-2)^2+(4-3z)^2+z^2=19z^2-36z+20.$$ Differentiating gives $$F\'(z)=38z-36,$$ so the minimum occurs at $$z=\\frac{18}{19}.$$ Then $$x=3z-2=\\frac{16}{19},\\qquad y=4-3z=\\frac{22}{19}.$$ Therefore the minimizing point is $$\\left(\\frac{16}{19},\\frac{22}{19},\\frac{18}{19}\\right),$$ and the minimum value is $$\\left(\\frac{16}{19}\\right)^2+\\left(\\frac{22}{19}\\right)^2+\\left(\\frac{18}{19}\\right)^2=\\frac{56}{19}.$$',
  verifiedPatterns: [
    '19z^2-36z+20',
    '\\left(\\frac{16}{19},\\frac{22}{19},\\frac{18}{19}\\right)',
    '\\frac{56}{19}',
    'minimum value',
  ],
  minDiagramSteps: 4,
};
