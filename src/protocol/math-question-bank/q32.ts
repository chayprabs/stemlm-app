import { axesGraph, wrapMathSvg } from '../math-svg';
import type { MathQuestionDef } from './types';

export const Q32: MathQuestionDef = {
  id: 'q32',
  number: 32,
  topic: 'First-order PDE by characteristics',
  question:
    'Solve the first-order PDE $$u_x+2xu_y=0$$ with initial condition $$u(0,y)=e^{-y^2}$$ using the method of characteristics.',
  steps: [
    {
      title: 'Read the initial curve and the transport field',
      formula: '$$u_x+2xu_y=0$$',
      body: 'The data are prescribed on the line $x=0$, and the PDE says that $u$ is transported by the vector field $(1,2x)$. Because the $x$-component is $1$, each characteristic crosses the initial line exactly once. At $(x,y)=(1,2)$ the slope is $dy/dx=2$.',
      diagram: axesGraph({
        annotations: [
          '<line x1="40" y1="20" x2="40" y2="140" stroke="#dc2626" stroke-width="3"/>',
          '<text x="52" y="34" font-size="12" fill="#dc2626">x = 0</text>',
          '<line x1="120" y1="100" x2="164" y2="56" stroke="#2563eb" stroke-width="2.5"/>',
          '<polygon points="164,56 155,59 160,67" fill="#2563eb"/>',
          '<text x="170" y="58" font-size="12" fill="#2563eb">(1, 2x)</text>',
        ].join(''),
        xLabel: 'x',
        yLabel: 'y',
      }),
    },
    {
      title: 'Write the characteristic system',
      formula:
        '$$\\frac{dx}{ds}=1,\\qquad \\frac{dy}{ds}=2x,\\qquad \\frac{du}{ds}=u_x\\frac{dx}{ds}+u_y\\frac{dy}{ds}=u_x+2xu_y=0$$',
      body: 'Along a characteristic curve, the total derivative of $u$ is zero, so $u$ stays constant on each characteristic. For example, at $x=1$ we have $dy/ds=2x=2$ and $du/ds=0$, so the curve rises while the value of $u$ does not change.',
      diagram: wrapMathSvg(
        [
          '<line x1="40" y1="20" x2="40" y2="150" stroke="#dc2626" stroke-width="3"/>',
          '<path d="M 40 126 Q 80 118 120 94 Q 160 54 200 20" fill="none" stroke="#1d4ed8" stroke-width="2.5"/>',
          '<path d="M 40 96 Q 80 94 120 74 Q 160 38 190 20" fill="none" stroke="#16a34a" stroke-width="2.5"/>',
          '<path d="M 40 66 Q 80 70 120 58 Q 160 28 180 20" fill="none" stroke="#7c3aed" stroke-width="2.5"/>',
          '<text x="48" y="34" font-size="12" fill="#dc2626">initial line</text>',
          '<text x="154" y="60" font-size="12" fill="#1d4ed8">u = const</text>',
        ].join(''),
      ),
    },
    {
      title: 'Integrate the characteristic ODEs',
      formula: '$$\\frac{dy}{dx}=\\frac{dy/ds}{dx/ds}=2x\\quad\\Longrightarrow\\quad y=x^2+C\\quad\\Longrightarrow\\quad y-x^2=C$$',
      body: 'Since $dx/ds=1$, we may use $x$ itself as the curve parameter. Integrating $dy/dx=2x$ gives the invariant $C=y-x^2$. For example, the point $(1,2)$ lies on the curve with $C=2-1=1$.',
      diagram: wrapMathSvg(
        [
          '<line x1="40" y1="20" x2="40" y2="150" stroke="#dc2626" stroke-width="3"/>',
          '<path d="M 40 136 Q 84 132 128 112 Q 172 76 214 24" fill="none" stroke="#1d4ed8" stroke-width="2.5"/>',
          '<path d="M 40 102 Q 84 102 128 86 Q 172 54 204 20" fill="none" stroke="#16a34a" stroke-width="2.5"/>',
          '<path d="M 40 68 Q 84 72 126 60 Q 166 30 190 20" fill="none" stroke="#7c3aed" stroke-width="2.5"/>',
          '<text x="206" y="30" font-size="12" fill="#1d4ed8">C = 1</text>',
          '<text x="192" y="24" font-size="12" fill="#16a34a">C = 0</text>',
          '<text x="176" y="38" font-size="12" fill="#7c3aed">C = -1</text>',
        ].join(''),
      ),
    },
    {
      title: 'Trace each characteristic back to the initial line',
      formula: '$$x=0\\quad\\Longrightarrow\\quad C=y_0\\quad\\Longrightarrow\\quad y_0=y-x^2$$',
      body: 'A characteristic reaching $(x,y)$ meets the initial line at $(0,y_0)$ with the same invariant. Therefore the initial label attached to that characteristic is $y_0=y-x^2$. At $(1,2)$ this gives $y_0=1$.',
      diagram: wrapMathSvg(
        [
          '<line x1="40" y1="20" x2="40" y2="150" stroke="#dc2626" stroke-width="3"/>',
          '<path d="M 40 114 Q 84 112 128 92 Q 172 56 214 20" fill="none" stroke="#1d4ed8" stroke-width="2.5"/>',
          '<circle cx="40" cy="114" r="4" fill="#dc2626"/>',
          '<circle cx="132" cy="92" r="4" fill="#1d4ed8"/>',
          '<line x1="132" y1="92" x2="40" y2="114" stroke="#64748b" stroke-dasharray="5 4" stroke-width="1.5"/>',
          '<text x="50" y="108" font-size="12">(0, y_0)</text>',
          '<text x="140" y="88" font-size="12">(x, y)</text>',
          '<text x="72" y="128" font-size="12">y_0 = y - x^2</text>',
        ].join(''),
      ),
    },
    {
      title: 'Insert the initial data into the invariant',
      formula: '$$u(x,y)=u(0,y_0)=e^{-y_0^2}=e^{-(y-x^2)^2}$$',
      body: 'Because $u$ is constant on a characteristic, we evaluate the given initial condition at the foot point $y_0=y-x^2$. For the sample point $(1,2)$ we get $u(1,2)=e^{-(2-1)^2}=e^{-1}$.',
      diagram: axesGraph({
        points: [{ x: 132, y: 92, label: 'u(1,2)=e^{-1}', fill: '#16a34a' }],
        annotations: [
          '<line x1="40" y1="20" x2="40" y2="140" stroke="#dc2626" stroke-width="3"/>',
          '<path d="M 40 114 Q 84 112 128 92 Q 172 56 214 20" fill="none" stroke="#1d4ed8" stroke-width="2.5"/>',
          '<text x="146" y="112" font-size="12">y - x^2 = 1</text>',
        ].join(''),
        xLabel: 'x',
        yLabel: 'y',
      }),
    },
    {
      title: 'Verify the formula directly',
      formula:
        '$$u(x,y)=e^{-(y-x^2)^2},\\qquad u_x=4x(y-x^2)e^{-(y-x^2)^2},\\qquad u_y=-2(y-x^2)e^{-(y-x^2)^2}$$\n$$u_x+2xu_y=4x(y-x^2)e^{-(y-x^2)^2}-4x(y-x^2)e^{-(y-x^2)^2}=0$$',
      body: 'The explicit derivatives cancel exactly, and at $x=0$ the formula gives $u(0,y)=e^{-y^2}$, so both the PDE and the initial condition are satisfied.',
      takeaway: 'For a transport equation, identify the invariant of the characteristic curves and rewrite the initial data in terms of that invariant.',
    },
  ],
  solution:
    'The characteristic equations are $$\\frac{dx}{ds}=1,\\qquad \\frac{dy}{ds}=2x,\\qquad \\frac{du}{ds}=0.$$ Hence $$\\frac{dy}{dx}=2x,$$ so integrating gives $$y-x^2=C.$$ A characteristic through $(x,y)$ meets the initial line $x=0$ at $(0,y_0)$ with $$y_0=C=y-x^2.$$ Since $u$ is constant along characteristics and $$u(0,y_0)=e^{-y_0^2},$$ the solution is $$u(x,y)=e^{-(y-x^2)^2}.$$ Direct differentiation gives $$u_x+2xu_y=0,$$ and setting $x=0$ recovers $$u(0,y)=e^{-y^2}.$$',
  verifiedPatterns: ['y-x^2=C', 'u(x,y)=e^{-(y-x^2)^2}', 'u_x+2xu_y=0', 'u(0,y)=e^{-y^2}', 'e^{-1}'],
  minDiagramSteps: 5,
};
