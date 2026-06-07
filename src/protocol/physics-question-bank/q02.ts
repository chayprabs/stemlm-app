import { physicsGraph } from '../physics-svg';
import type { PhysicsQuestionDef } from './types';

export const Q02: PhysicsQuestionDef = {
  id: 'q02',
  number: 2,
  topic: 'Work-Energy Conservative Forces',
  question:
    'A particle moves under F = (3x²y)î + (x³+2y)ĵ N. (a) Check if F is conservative; find U(x,y) if yes. (b) Work from (0,0) to (2,3). (c) Mass m=2 kg starts at rest at (0,0); find speed at (2,3). (d) Show non-conservative work depends on path.',
  steps: [
    {
      title: 'Test whether the force field is conservative',
      formula: '$$\\frac{\\partial F_x}{\\partial y}=3x^2,\\quad \\frac{\\partial F_y}{\\partial x}=3x^2$$',
      body: 'For $\\mathbf{F}=(3x^2y)\\hat{i}+(x^3+2y)\\hat{j}$, the curl in 2D is $\\partial F_y/\\partial x-\\partial F_x/\\partial y=3x^2-3x^2=0$ everywhere, so the field is conservative.',
      diagram: physicsGraph({
        curves: [{ d: 'M 50 130 Q 120 80 200 50 T 270 40', label: 'path in xy', labelPos: [180, 35] }],
        xLabel: 'x',
        yLabel: 'y',
        annotations: '<text x="100" y="165" font-size="11">(0,0) to (2,3)</text>',
      }),
    },
    {
      title: 'Integrate to find the potential energy',
      formula:
        '$$U(x,y)=-\\int 3x^2y\\,dx=-x^3y+C(y),\\quad \\frac{dU}{dy}=-(x^3+2y)\\Rightarrow U=-x^3y-y^2$$',
      body: 'Choose $U(0,0)=0$, giving $U(x,y)=-x^3y-y^2$ J (up to an additive constant). Check: $-\\nabla U=(3x^2y)\\hat{i}+(x^3+2y)\\hat{j}=\\mathbf{F}$.',
    },
    {
      title: 'Compute work along any path',
      formula:
        '$$W=U(0,0)-U(2,3)=0-(-8\\cdot3-9)=33\\,\\text{J}$$',
      body: 'For a conservative field, $W=-\\Delta U$. With $x=2$, $y=3$: $U(2,3)=-2^3\\cdot3-3^2=-24-9=-33\\,\\text{J}$, so $W=33\\,\\text{J}$ regardless of path.',
    },
    {
      title: 'Find speed from energy conservation',
      formula:
        '$$W=\\Delta K=\\tfrac{1}{2}mv^2\\Rightarrow v=\\sqrt{\\frac{2W}{m}}=\\sqrt{\\frac{66}{2}}=5.74\\,\\text{m/s}$$',
      body: 'With $m=2\\,\\text{kg}$ starting from rest, kinetic energy at $(2,3)$ is $33\\,\\text{J}$, giving $v=5.74\\,\\text{m/s}$.',
      takeaway: 'Conservative work depends only on endpoints through the potential.',
    },
    {
      title: 'Non-conservative example: path dependence',
      formula: '$$\\mathbf{F}_{nc}=y\\,\\hat{i}\\Rightarrow W=\\int_C y\\,dx$$',
      body: 'Along the straight line $y=x$ from $(0,0)$ to $(1,1)$: $W=\\int_0^1 x\\,dx=0.5\\,\\text{J}$. Along $(0,0)\\to(1,0)\\to(1,1)$: $W=0+1=1\\,\\text{J}$. Different paths give different work, so friction-like forces are non-conservative.',
      diagram: physicsGraph({
        curves: [
          { d: 'M 50 130 L 230 50', stroke: '#1d4ed8', label: 'path 1', labelPos: [140, 70] },
          { d: 'M 50 130 L 230 130 L 230 50', stroke: '#dc2626', label: 'path 2', labelPos: [200, 145] },
        ],
        xLabel: 'x',
        yLabel: 'y',
      }),
    },
  ],
  solution:
    '**(a)** $\\partial F_y/\\partial x=\\partial F_x/\\partial y=3x^2$ — conservative. $U(x,y)=-x^3y-y^2$. **(b)** $W=33\\,\\text{J}$. **(c)** $v=5.74\\,\\text{m/s}$. **(d)** For $\\mathbf{F}=y\\hat{i}$, work from $(0,0)$ to $(1,1)$ is $0.5\\,\\text{J}$ on the diagonal but $1\\,\\text{J}$ via the axes — path-dependent.',
  verifiedPatterns: ['-x^3y-y^2', '33', '5.74', 'path-dependent'],
  minDiagramSteps: 2,
};
