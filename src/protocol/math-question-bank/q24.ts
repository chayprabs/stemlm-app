import { axesGraph, shadedRegion, wrapMathSvg } from '../math-svg';
import type { MathQuestionDef } from './types';

export const Q24: MathQuestionDef = {
  id: 'q24',
  number: 24,
  topic: 'Joint densities, marginals, covariance, and a triangular probability',
  question:
    'Let $X$ and $Y$ have joint density $$f(x,y)=6xy^2,\\qquad 0<x<1,\\ 0<y<1,$$ and $f(x,y)=0$ otherwise. Find the marginal densities of $X$ and $Y$, compute $\\operatorname{Cov}(X,Y)$, and evaluate $P(X+Y<1)$.',
  steps: [
    {
      title: 'Confirm the joint density is normalized on the unit square',
      formula:
        '$$\\int_0^1\\!\\int_0^1 6xy^2\\,dy\\,dx=6\\left(\\int_0^1 x\\,dx\\right)\\left(\\int_0^1 y^2\\,dy\\right)=6\\cdot\\frac12\\cdot\\frac13=1$$',
      body: 'The density separates into an $x$ part and a $y$ part, so the double integral is easy. Numerically it becomes $6\\times 0.5\\times 0.333\\ldots=1$, confirming that $f$ is a valid PDF on the square $0<x<1$, $0<y<1$.',
      diagram: shadedRegion(
        ['M 40 140 L 260 140 L 260 20 L 40 20 Z'],
        ['0 < x < 1, 0 < y < 1'],
      ),
    },
    {
      title: 'Integrate out y to get the marginal of X',
      formula:
        '$$f_X(x)=\\int_0^1 6xy^2\\,dy=6x\\left[\\frac{y^3}{3}\\right]_0^1=2x,\\qquad 0<x<1$$',
      body: 'At a sample point $x=0.5$, the marginal value is $f_X(0.5)=2(0.5)=1$. The line $2x$ increases from $0$ to $2$ across the interval, so larger $x$ values are weighted more heavily than smaller ones.',
      diagram: axesGraph({
        curves: [
          {
            d: 'M 40 140 L 260 30',
            stroke: '#1d4ed8',
            label: 'f_X(x)=2x',
            labelPos: [184, 40],
          },
        ],
        points: [{ x: 150, y: 85, label: '(0.5,1)', fill: '#dc2626' }],
        xLabel: 'x',
        yLabel: 'f_X',
      }),
    },
    {
      title: 'Integrate out x to get the marginal of Y',
      formula:
        '$$f_Y(y)=\\int_0^1 6xy^2\\,dx=6y^2\\left[\\frac{x^2}{2}\\right]_0^1=3y^2,\\qquad 0<y<1$$',
      body: 'At $y=0.5$ this gives $f_Y(0.5)=3(0.5)^2=0.75$. Since the marginal is quadratic, it rises more sharply near $y=1$ than near $y=0$, reflecting the extra $y^2$ weight in the joint density.',
      diagram: axesGraph({
        curves: [
          {
            d: 'M 40 140 Q 110 128 180 92 T 260 30',
            stroke: '#16a34a',
            label: 'f_Y(y)=3y^2',
            labelPos: [186, 44],
          },
        ],
        points: [{ x: 150, y: 99, label: '(0.5,0.75)', fill: '#dc2626' }],
        xLabel: 'y',
        yLabel: 'f_Y',
      }),
    },
    {
      title: 'Compute the first moments and the mixed moment',
      formula:
        '$$E[X]=\\int_0^1 x\\,f_X(x)\\,dx=\\int_0^1 2x^2\\,dx=\\frac23,\\qquad E[Y]=\\int_0^1 y\\,f_Y(y)\\,dy=\\int_0^1 3y^3\\,dy=\\frac34$$\n$$E[XY]=\\int_0^1\\!\\int_0^1 xy\\cdot 6xy^2\\,dy\\,dx=6\\left(\\int_0^1 x^2\\,dx\\right)\\left(\\int_0^1 y^3\\,dy\\right)=6\\cdot\\frac13\\cdot\\frac14=\\frac12$$',
      body: 'The separate moment integrals give $E[X]=2/3\\approx 0.667$ and $E[Y]=3/4=0.75$. For the mixed moment, the product again factors, and the numeric check is $6\\times(1/3)\\times(1/4)=1/2$.',
      diagram: wrapMathSvg(
        [
          '<rect x="26" y="42" width="72" height="86" fill="#dbeafe" stroke="#1d4ed8"/>',
          '<rect x="114" y="30" width="72" height="98" fill="#dcfce7" stroke="#16a34a"/>',
          '<rect x="202" y="54" width="72" height="74" fill="#fee2e2" stroke="#dc2626"/>',
          '<text x="62" y="82" font-size="14" text-anchor="middle">E[X]</text>',
          '<text x="62" y="104" font-size="12" text-anchor="middle">2/3</text>',
          '<text x="150" y="82" font-size="14" text-anchor="middle">E[Y]</text>',
          '<text x="150" y="104" font-size="12" text-anchor="middle">3/4</text>',
          '<text x="238" y="82" font-size="14" text-anchor="middle">E[XY]</text>',
          '<text x="238" y="104" font-size="12" text-anchor="middle">1/2</text>',
        ].join(''),
      ),
    },
    {
      title: 'Use the moment identity for covariance',
      formula:
        '$$\\operatorname{Cov}(X,Y)=E[XY]-E[X]E[Y]=\\frac12-\\frac23\\cdot\\frac34=\\frac12-\\frac12=0$$',
      body: 'Multiplying the two means gives $$E[X]E[Y]=\\frac23\\cdot\\frac34=\\frac{6}{12}=\\frac12.$$ Since this equals $E[XY]$, the covariance is exactly $0$, even though the joint density does not factor into independent support restrictions beyond the square.',
      diagram: wrapMathSvg(
        [
          '<line x1="48" y1="90" x2="252" y2="90" stroke="#333" stroke-width="2"/>',
          '<circle cx="96" cy="90" r="6" fill="#1d4ed8"/>',
          '<circle cx="204" cy="90" r="6" fill="#16a34a"/>',
          '<text x="96" y="72" font-size="12" text-anchor="middle">E[XY]=1/2</text>',
          '<text x="204" y="72" font-size="12" text-anchor="middle">E[X]E[Y]=1/2</text>',
          '<text x="150" y="118" font-size="13" text-anchor="middle">difference = 0</text>',
        ].join(''),
      ),
    },
    {
      title: 'Integrate over the triangle x + y < 1',
      formula:
        '$$P(X+Y<1)=\\int_0^1\\!\\int_0^{1-y} 6xy^2\\,dx\\,dy=\\int_0^1 3y^2(1-y)^2\\,dy=\\frac1{10}$$',
      body: 'After the inner integral, $$\\int_0^{1-y} 6xy^2\\,dx=3y^2(1-y)^2.$$ Expanding gives $3(y^2-2y^3+y^4)$, so the total is $$3\\left(\\frac13-2\\cdot\\frac14+\\frac15\\right)=3\\left(\\frac{10-15+6}{30}\\right)=\\frac{3}{30}=\\frac1{10}.$$',
      takeaway: 'Marginals and covariance come from full-square integrals, while event probabilities use the geometry of the event region inside the support.',
    },
  ],
  solution:
    'The marginals are $$f_X(x)=\\int_0^1 6xy^2\\,dy=2x,\\qquad 0<x<1,$$ and $$f_Y(y)=\\int_0^1 6xy^2\\,dx=3y^2,\\qquad 0<y<1.$$ Therefore $$E[X]=\\int_0^1 2x^2\\,dx=\\frac23,\\qquad E[Y]=\\int_0^1 3y^3\\,dy=\\frac34.$$ Also $$E[XY]=\\int_0^1\\!\\int_0^1 6x^2y^3\\,dy\\,dx=\\frac12,$$ so $$\\operatorname{Cov}(X,Y)=E[XY]-E[X]E[Y]=\\frac12-\\frac23\\cdot\\frac34=0.$$ Hence $f_X(x)=2x$, $f_Y(y)=3y^2$, and $\\operatorname{Cov}(X,Y)=0$. Finally, over the triangle $x+y<1$, $$P(X+Y<1)=\\int_0^1\\!\\int_0^{1-y} 6xy^2\\,dx\\,dy=\\frac1{10}.$$',
  verifiedPatterns: ['f_X(x)=2x', 'f_Y(y)=3y^2', 'Cov}(X,Y)=0', '\\frac1{10}', 'E[XY]'],
  minDiagramSteps: 5,
};
