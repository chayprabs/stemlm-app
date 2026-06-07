import { wrapPhysicsSvg } from '../physics-svg';
import type { PhysicsQuestionDef } from './types';

const plateDiagram = wrapPhysicsSvg(
  '<rect x="80" y="50" width="140" height="80" fill="#dbeafe" stroke="#333" stroke-width="2"/>' +
    '<text x="145" y="95" font-size="12" text-anchor="middle">CM</text>' +
    '<text x="60" y="145" font-size="11">width a (x)</text>' +
    '<text x="200" y="40" font-size="11">height b (y)</text>' +
    '<circle cx="80" cy="130" r="4" fill="#dc2626"/><text x="55" y="125" font-size="10">corner</text>',
);

export const Q06: PhysicsQuestionDef = {
  id: 'q06',
  number: 6,
  topic: 'Rigid Body Moment of Inertia Tensor',
  question:
    'Physics angular momentum: uniform thin rectangular plate mass M, width a along x, height b along y. (a) Ixx, Iyy, Izz about CM. (b) Izz about corner via parallel axis. (c) Torque τẑ; angular acceleration about corner. (d) Full inertia tensor; is it diagonal?',
  steps: [
    {
      title: 'Set up the plate geometry',
      body: 'A uniform thin plate has mass $M$, width $a$ along $x$, height $b$ along $y$, thickness negligible. Surface density $\\sigma=M/(ab)$.',
      diagram: plateDiagram,
    },
    {
      title: 'Compute principal moments about CM',
      formula:
        '$$I_{xx}=\\frac{Mb^2}{12},\\quad I_{yy}=\\frac{Ma^2}{12},\\quad I_{zz}=I_{xx}+I_{yy}=\\frac{M(a^2+b^2)}{12}$$',
      body: 'For $a=0.6\\,\\text{m}$, $b=0.4\\,\\text{m}$, $M=2\\,\\text{kg}$: $I_{xx}=0.0267\\,\\text{kg·m}^2$, $I_{yy}=0.0600\\,\\text{kg·m}^2$, $I_{zz}=0.0867\\,\\text{kg·m}^2$.',
    },
    {
      title: 'Parallel axis theorem for corner',
      formula:
        '$$I_{zz}^{\\text{corner}}=I_{zz}^{\\text{CM}}+Md^2,\\quad d^2=\\frac{a^2+b^2}{4}\\Rightarrow I_{zz}^{\\text{corner}}=\\frac{M(a^2+b^2)}{3}$$',
      body: 'Distance from CM to corner is $\\sqrt{a^2+b^2}/2$. For $a=0.6$, $b=0.4$, $M=2$: $I_{zz}^{\\text{corner}}=0.173\\,\\text{kg·m}^2$.',
    },
    {
      title: 'Angular acceleration from applied torque',
      formula: '$$\\boldsymbol{\\tau}=\\tau\\hat{z}=I\\boldsymbol{\\alpha}\\Rightarrow \\alpha_z=\\frac{\\tau}{I_{zz}^{\\text{corner}}}$$',
      body: 'With $\\tau=0.5\\,\\text{N·m}$ and $I_{zz}^{\\text{corner}}=0.173\\,\\text{kg·m}^2$: $\\alpha=2.89\\,\\text{rad/s}^2$ about the corner.',
    },
    {
      title: 'Write the inertia tensor about CM',
      formula:
        '$$\\mathbf{I}=\\begin{pmatrix}Mb^2/12&0&0\\\\0&Ma^2/12&0\\\\0&0&M(a^2+b^2)/12\\end{pmatrix}$$',
      body: 'The tensor is diagonal because the plate symmetry axes align with $x,y,z$ — products of inertia $I_{xy}=I_{xz}=I_{yz}=0$ when origin is at CM and axes along symmetry.',
      takeaway: 'Parallel axis theorem shifts inertia; symmetry determines whether the tensor is diagonal.',
    },
  ],
  solution:
    '**(a)** $I_{xx}=Mb^2/12$, $I_{yy}=Ma^2/12$, $I_{zz}=M(a^2+b^2)/12$. **(b)** $I_{zz}^{\\text{corner}}=M(a^2+b^2)/3$. **(c)** $\\alpha=\\tau/I_{zz}^{\\text{corner}}$. **(d)** Diagonal tensor — symmetry axes coincide with coordinate axes.',
  verifiedPatterns: ['\\frac{Mb^2}{12}', '\\frac{M(a^2+b^2)}{3}', 'diagonal'],
  minDiagramSteps: 1,
};
