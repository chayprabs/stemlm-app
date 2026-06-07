import { wrapPhysicsSvg } from '../physics-svg';
import type { PhysicsQuestionDef } from './types';

export const Q45: PhysicsQuestionDef = {
  id: 'q45',
  number: 45,
  topic: 'Principal Values of a 2D Stress Tensor',
  question:
    'Physics continuum momentum-flux tensor analysis with crystal force and energy density: for the symmetric tensor [[120,30],[30,80]] MPa, compute principal values, principal-axis angle, and invariant-based equivalent intensity.',
  steps: [
    {
      title: 'Write tensor and characteristic equation',
      formula:
        '$$\\boldsymbol\\sigma=\\begin{bmatrix}120&30\\\\30&80\\end{bmatrix}\\,\\text{MPa},\\qquad \\det(\\boldsymbol\\sigma-\\lambda I)=0$$',
      body: 'The trace is $I_1=120+80=200\\,\\text{MPa}$ and determinant is $I_2=120\\times80-30\\times30=8700\\,\\text{MPa}^2$. The eigenvalue equation is $\\lambda^2-200\\lambda+8700=0$.',
      diagram: wrapPhysicsSvg(
        '<rect x="90" y="50" width="120" height="80" fill="#f8fafc" stroke="#334155" stroke-width="2"/>' +
          '<line x1="150" y1="50" x2="150" y2="130" stroke="#334155" stroke-width="1.5"/>' +
          '<line x1="90" y1="90" x2="210" y2="90" stroke="#334155" stroke-width="1.5"/>' +
          '<text x="113" y="78" font-size="12">120</text><text x="170" y="78" font-size="12">30</text>' +
          '<text x="116" y="118" font-size="12">30</text><text x="172" y="118" font-size="12">80</text>' +
          '<text x="88" y="33" font-size="11">sigma tensor (MPa)</text>',
      ),
    },
    {
      title: 'Compute principal values from invariants',
      formula:
        '$$\\lambda_{1,2}=\\frac{\\sigma_x+\\sigma_y}{2}\\pm\\sqrt{\\left(\\frac{\\sigma_x-\\sigma_y}{2}\\right)^2+\\tau_{xy}^2}=100\\pm\\sqrt{20^2+30^2}$$',
      body: 'The radical is $\\sqrt{1300}=36.06\\,\\text{MPa}$. Therefore principal values are $\\lambda_1=100+36.06=136.06\\,\\text{MPa}$ and $\\lambda_2=100-36.06=63.94\\,\\text{MPa}$.',
    },
    {
      title: 'Find principal-axis rotation angle',
      formula: '$$\\tan(2\\theta_p)=\\frac{2\\tau_{xy}}{\\sigma_x-\\sigma_y}=\\frac{60}{40}=1.5$$',
      body: 'Hence $2\\theta_p=\\tan^{-1}(1.5)=56.31^\\circ$, so $\\theta_p=28.15^\\circ$. Rotating the tensor by $28.15^\\circ$ diagonalizes it to $\\operatorname{diag}(136.06,63.94)$ MPa.',
      diagram: wrapPhysicsSvg(
        '<line x1="55" y1="140" x2="145" y2="50" stroke="#1d4ed8" stroke-width="2.5"/>' +
          '<line x1="145" y1="50" x2="245" y2="150" stroke="#1d4ed8" stroke-width="2.5"/>' +
          '<line x1="55" y1="140" x2="245" y2="150" stroke="#1d4ed8" stroke-width="2.5"/>' +
          '<circle cx="145" cy="100" r="40" fill="none" stroke="#dc2626" stroke-width="2"/>' +
          '<line x1="145" y1="100" x2="180" y2="82" stroke="#16a34a" stroke-width="2"/>' +
          '<text x="184" y="82" font-size="11" fill="#16a34a">theta_p=28.15 deg</text>' +
          '<text x="92" y="34" font-size="11">principal directions</text>',
      ),
    },
    {
      title: 'Compute invariant-based equivalent intensity',
      formula:
        '$$\\sigma_{eq}=\\sqrt{\\sigma_x^2-\\sigma_x\\sigma_y+\\sigma_y^2+3\\tau_{xy}^2}=\\sqrt{120^2-120\\cdot80+80^2+3\\cdot30^2}$$',
      body: 'Numerically, $\\sigma_{eq}=\\sqrt{14400-9600+6400+2700}=\\sqrt{13900}=117.9\\,\\text{MPa}$. Energy-density style invariants remain unchanged under axis rotation.',
      takeaway:
        'Principal decomposition rewrites a coupled tensor into uncoupled eigen-directions while preserving invariants.',
    },
  ],
  solution:
    'For $\\boldsymbol\\sigma=\\begin{bmatrix}120&30\\\\30&80\\end{bmatrix}$ MPa: principal values are $\\lambda_1=136.06\\,\\text{MPa}$ and $\\lambda_2=63.94\\,\\text{MPa}$. The principal-axis angle is $\\theta_p=28.15^\\circ$, and invariant-based equivalent intensity is $\\sigma_{eq}=117.9\\,\\text{MPa}$.',
  verifiedPatterns: ['\\lambda_1=136.06\\,\\text{MPa}', '\\lambda_2=63.94\\,\\text{MPa}', '\\theta_p=28.15^\\circ', '\\sigma_{eq}=117.9\\,\\text{MPa}'],
  minDiagramSteps: 2,
};
