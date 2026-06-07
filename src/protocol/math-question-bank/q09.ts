import { axesGraph, numberLine, wrapMathSvg } from '../math-svg';
import type { MathQuestionDef } from './types';

export const Q09: MathQuestionDef = {
  id: 'q09',
  number: 9,
  topic: 'Gram-Schmidt and Legendre polynomials',
  question:
    'Apply Gram-Schmidt to the basis $\\{1,x,x^2\\}$ in $P_2$ with inner product $$\\langle f,g\\rangle=\\int_{-1}^1 f(x)g(x)\\,dx.$$ Produce an orthogonal (or orthonormal) basis, project $x^3$ onto $\\operatorname{span}\\{1,x,x^2\\}$, and explain the connection with Legendre polynomials.',
  steps: [
    {
      title: 'Record the inner product on the symmetric interval',
      body: 'All integrals are over $[-1,1]$, so odd powers integrate to $0$ and even powers use $\\int_{-1}^1 x^{2k}\\,dx=2/(2k+1)$. For example, $\\int_{-1}^1 x\\,dx=0$ and $\\int_{-1}^1 x^2\\,dx=2/3$.',
      diagram: numberLine(
        [
          { pos: -1, label: '-1', color: '#dc2626' },
          { pos: 0, label: '0', color: '#333' },
          { pos: 1, label: '1', color: '#1d4ed8' },
        ],
        [-1, 1],
      ),
    },
    {
      title: 'Start Gram-Schmidt with the constant polynomial',
      formula: '$$u_1=1,\\qquad \\lVert u_1\\rVert^2=\\langle 1,1\\rangle=\\int_{-1}^1 1\\,dx=2$$',
      body: 'The first vector is unchanged. Its squared norm is $2=1\\cdot(1-(-1))$, so the normalized first vector would be $e_1=1/\\sqrt2$.',
      diagram: axesGraph({
        curves: [
          {
            d: 'M 40 70 L 260 70',
            stroke: '#1d4ed8',
            label: 'u1 = 1',
            labelPos: [210, 62],
          },
        ],
        xLabel: 'x',
        yLabel: 'y',
      }),
    },
    {
      title: 'The second vector stays x because it is already orthogonal to 1',
      formula: '$$u_2=x-\\frac{\\langle x,1\\rangle}{\\langle 1,1\\rangle}1=x-\\frac{0}{2}=x,\\qquad \\lVert u_2\\rVert^2=\\int_{-1}^1 x^2\\,dx=\\frac23$$',
      body: 'Since $x$ is odd, $\\langle x,1\\rangle=\\int_{-1}^1 x\\,dx=0$. That leaves $u_2=x$, and its squared norm is $2/3$, so the normalized vector is $e_2=\\sqrt{3/2}\\,x$.',
      diagram: axesGraph({
        curves: [
          {
            d: 'M 40 140 L 150 80 L 260 20',
            stroke: '#dc2626',
            label: 'u2 = x',
            labelPos: [208, 30],
          },
        ],
        xLabel: 'x',
        yLabel: 'y',
      }),
    },
    {
      title: 'Subtract the projection from x^2 to get the third orthogonal vector',
      formula:
        '$$u_3=x^2-\\frac{\\langle x^2,1\\rangle}{\\langle 1,1\\rangle}1-\\frac{\\langle x^2,x\\rangle}{\\langle x,x\\rangle}x=x^2-\\frac{2/3}{2}=x^2-\\frac13$$\n$$\\lVert u_3\\rVert^2=\\int_{-1}^1\\left(x^2-\\frac13\\right)^2dx=\\frac{8}{45}$$',
      body: 'The mixed term vanishes because $\\langle x^2,x\\rangle=\\int_{-1}^1 x^3\\,dx=0$. The remaining projection coefficient is $(2/3)/2=1/3$, so $u_3=x^2-1/3$, and expanding the square gives $2/5-2/9=8/45$ for its norm squared.',
      diagram: axesGraph({
        curves: [
          {
            d: 'M 40 120 Q 95 78 150 60 Q 205 78 260 120',
            stroke: '#64748b',
            label: 'x^2',
            labelPos: [228, 114],
          },
          {
            d: 'M 40 100 Q 95 58 150 40 Q 205 58 260 100',
            stroke: '#16a34a',
            label: 'x^2 - 1/3',
            labelPos: [190, 34],
          },
        ],
        xLabel: 'x',
        yLabel: 'y',
      }),
    },
    {
      title: 'Write an orthonormal basis',
      formula:
        '$$e_1=\\frac{1}{\\sqrt2},\\qquad e_2=\\sqrt{\\frac32}\\,x,\\qquad e_3=\\sqrt{\\frac{45}{8}}\\left(x^2-\\frac13\\right)$$',
      body: 'Each normalization constant comes from the previous squared norms: $1/\\sqrt2$ from $2$, $\\sqrt{3/2}$ from $2/3$, and $\\sqrt{45/8}$ from $8/45$. Checking one value, $\\lVert e_3\\rVert^2=(45/8)\\cdot(8/45)=1$.',
      diagram: wrapMathSvg(
        [
          '<rect x="20" y="38" width="76" height="96" fill="#dbeafe" stroke="#1d4ed8"/>',
          '<rect x="112" y="38" width="76" height="96" fill="#fee2e2" stroke="#dc2626"/>',
          '<rect x="204" y="38" width="76" height="96" fill="#dcfce7" stroke="#16a34a"/>',
          '<text x="58" y="84" font-size="16" text-anchor="middle">e1</text>',
          '<text x="150" y="84" font-size="16" text-anchor="middle">e2</text>',
          '<text x="242" y="84" font-size="16" text-anchor="middle">e3</text>',
          '<text x="58" y="106" font-size="12" text-anchor="middle">constant</text>',
          '<text x="150" y="106" font-size="12" text-anchor="middle">odd</text>',
          '<text x="242" y="106" font-size="12" text-anchor="middle">even</text>',
        ].join(''),
      ),
    },
    {
      title: 'Project x^3 onto the span of {1, x, x^2}',
      formula:
        '$$\\operatorname{proj}_{P_2}(x^3)=\\frac{\\langle x^3,u_1\\rangle}{\\langle u_1,u_1\\rangle}u_1+\\frac{\\langle x^3,u_2\\rangle}{\\langle u_2,u_2\\rangle}u_2+\\frac{\\langle x^3,u_3\\rangle}{\\langle u_3,u_3\\rangle}u_3$$\n$$=0+\\frac{2/5}{2/3}x+0=\\frac35x$$',
      body: 'The first coefficient is $\\langle x^3,1\\rangle=\\int_{-1}^1 x^3\\,dx=0$. The second is $(2/5)/(2/3)=3/5$, because $\\langle x^3,x\\rangle=\\int_{-1}^1 x^4\\,dx=2/5$. The third vanishes since $x^3(x^2-1/3)$ is odd, so the projection is $(3/5)x$.',
      diagram: wrapMathSvg(
        [
          '<line x1="38" y1="96" x2="150" y2="96" stroke="#333" stroke-width="2"/>',
          '<polygon points="150,96 141,91 141,101" fill="#333"/>',
          '<text x="28" y="88" font-size="12">x^3</text>',
          '<text x="214" y="88" font-size="12" text-anchor="middle">(3/5)x</text>',
          '<text x="214" y="112" font-size="12" text-anchor="middle">projection onto P2</text>',
          '<circle cx="38" cy="96" r="4" fill="#dc2626"/>',
          '<circle cx="150" cy="96" r="4" fill="#1d4ed8"/>',
        ].join(''),
      ),
    },
    {
      title: 'Connect the result to Legendre polynomials',
      formula:
        '$$P_1(x)=x,\\qquad P_2(x)=\\frac{3x^2-1}{2},\\qquad P_3(x)=\\frac{5x^3-3x}{2}$$\n$$x^2-\\frac13=\\frac23P_2(x),\\qquad x^3=\\frac25P_3(x)+\\frac35P_1(x)$$',
      body: 'The Gram-Schmidt output matches the Legendre family up to scaling: $u_2=P_1$ and $u_3=(2/3)P_2$. Also $x^3=(2/5)P_3+(3/5)P_1$, so projecting onto degrees $\\le 2$ keeps only the $P_1$ part and gives $(3/5)x$.',
      takeaway: 'Gram-Schmidt on monomials over $[-1,1]$ produces the Legendre polynomials up to normalization.',
    },
  ],
  solution:
    'Gram-Schmidt gives an orthogonal basis $$u_1=1,\\qquad u_2=x,\\qquad u_3=x^2-\\frac13.$$ Their squared norms are $$\\lVert u_1\\rVert^2=2,\\qquad \\lVert u_2\\rVert^2=\\frac23,\\qquad \\lVert u_3\\rVert^2=\\frac{8}{45},$$ so an orthonormal basis is $$e_1=\\frac{1}{\\sqrt2},\\qquad e_2=\\sqrt{\\frac32}\\,x,\\qquad e_3=\\sqrt{\\frac{45}{8}}\\left(x^2-\\frac13\\right).$$ The projection of $x^3$ onto $P_2=\\operatorname{span}\\{1,x,x^2\\}$ is $$\\operatorname{proj}_{P_2}(x^3)=\\frac35x.$$ This agrees with the Legendre expansion $$x^3=\\frac25P_3(x)+\\frac35P_1(x),$$ while $$x^2-\\frac13=\\frac23P_2(x).$$',
  verifiedPatterns: ['x^2-\\frac13', '\\frac35x', 'P_3(x)', '\\frac23P_2(x)', '\\frac{8}{45}'],
  minDiagramSteps: 4,
};
