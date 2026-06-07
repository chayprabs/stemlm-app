import { matrixDisplay, numberLine, wrapMathSvg } from '../math-svg';
import type { MathQuestionDef } from './types';

export const Q38: MathQuestionDef = {
  id: 'q38',
  number: 38,
  topic: 'Power method for a dominant eigenvalue',
  question:
    'Apply the power method to the matrix $$A=\\begin{bmatrix}4&1\\\\2&3\\end{bmatrix}$$ to approximate its dominant eigenvalue, starting from $$x^{(0)}=(1,0)^T.$$ Normalize each iterate by its largest component, and carry out four iterations.',
  steps: [
    {
      title: 'Set up the matrix and the initial vector',
      formula:
        '$$A=\\begin{bmatrix}4&1\\\\2&3\\end{bmatrix},\\qquad x^{(0)}=\\begin{bmatrix}1\\\\0\\end{bmatrix}$$',
      body: 'The power method repeatedly multiplies by $A$ and rescales. Starting from $x^{(0)}=(1,0)^T$ means the first matrix product will be $(4,2)^T$, which already points into the positive quadrant.',
      diagram: matrixDisplay(
        [
          ['4', '1'],
          ['2', '3'],
        ],
        'Matrix A',
      ),
    },
    {
      title: 'First iteration',
      formula:
        '$$y^{(1)}=Ax^{(0)}=\\begin{bmatrix}4\\\\2\\end{bmatrix},\\qquad \\mu_1=4,\\qquad x^{(1)}=\\frac{1}{4}y^{(1)}=\\begin{bmatrix}1\\\\0.5\\end{bmatrix}$$',
      body: 'The largest component of $y^{(1)}$ is $4$, so dividing by $4$ gives $x^{(1)}=(1,0.5)^T$. The second component has already moved halfway toward the limiting ratio $1$.',
      diagram: wrapMathSvg(
        [
          '<line x1="50" y1="126" x2="170" y2="126" stroke="#1d4ed8" stroke-width="2.5"/>',
          '<polygon points="170,126 161,122 161,130" fill="#1d4ed8"/>',
          '<line x1="50" y1="126" x2="170" y2="66" stroke="#dc2626" stroke-width="2.5"/>',
          '<polygon points="170,66 161,69 165,77" fill="#dc2626"/>',
          '<text x="178" y="130" font-size="12">x^(0)</text>',
          '<text x="178" y="64" font-size="12">x^(1)</text>',
        ].join(''),
      ),
    },
    {
      title: 'Second iteration',
      formula:
        '$$y^{(2)}=Ax^{(1)}=\\begin{bmatrix}4.5\\\\3.5\\end{bmatrix},\\qquad \\mu_2=4.5,\\qquad x^{(2)}=\\frac{1}{4.5}y^{(2)}=\\begin{bmatrix}1\\\\\\frac79\\end{bmatrix}\\approx\\begin{bmatrix}1\\\\0.777778\\end{bmatrix}$$',
      body: 'After the second multiplication, the normalized vector is $x^{(2)}=(1,0.777778)^T$. The ratio has increased from $0.5$ to $0.777778$, moving toward the target value $1$.',
      diagram: wrapMathSvg(
        [
          '<line x1="50" y1="126" x2="170" y2="66" stroke="#dc2626" stroke-width="2.5"/>',
          '<polygon points="170,66 161,69 165,77" fill="#dc2626"/>',
          '<line x1="50" y1="126" x2="170" y2="32" stroke="#16a34a" stroke-width="2.5"/>',
          '<polygon points="170,32 161,35 165,43" fill="#16a34a"/>',
          '<text x="178" y="64" font-size="12">x^(1)</text>',
          '<text x="178" y="30" font-size="12">x^(2)</text>',
        ].join(''),
      ),
    },
    {
      title: 'Third iteration',
      formula:
        '$$y^{(3)}=Ax^{(2)}=\\begin{bmatrix}\\frac{43}{9}\\\\\\frac{13}{3}\\end{bmatrix},\\qquad \\mu_3=\\frac{43}{9}\\approx 4.777778$$\n$$x^{(3)}=\\frac{9}{43}y^{(3)}=\\begin{bmatrix}1\\\\\\frac{39}{43}\\end{bmatrix}\\approx\\begin{bmatrix}1\\\\0.906977\\end{bmatrix}$$',
      body: 'Now $x^{(3)}=(1,0.906977)^T$, so the gap to the target ratio is only $1-0.906977=0.093023$. The scaling factor $\\mu_3=4.777778$ also moves closer to the dominant eigenvalue.',
      diagram: wrapMathSvg(
        [
          '<line x1="50" y1="126" x2="170" y2="32" stroke="#16a34a" stroke-width="2.5"/>',
          '<polygon points="170,32 161,35 165,43" fill="#16a34a"/>',
          '<line x1="50" y1="126" x2="170" y2="18" stroke="#7c3aed" stroke-width="2.5"/>',
          '<polygon points="170,18 161,21 165,29" fill="#7c3aed"/>',
          '<text x="178" y="30" font-size="12">x^(2)</text>',
          '<text x="178" y="16" font-size="12">x^(3)</text>',
        ].join(''),
      ),
    },
    {
      title: 'Fourth iteration',
      formula:
        '$$y^{(4)}=Ax^{(3)}=\\begin{bmatrix}\\frac{211}{43}\\\\\\frac{203}{43}\\end{bmatrix},\\qquad \\mu_4=\\frac{211}{43}\\approx 4.906977$$\n$$x^{(4)}=\\frac{43}{211}y^{(4)}=\\begin{bmatrix}1\\\\\\frac{203}{211}\\end{bmatrix}\\approx\\begin{bmatrix}1\\\\0.962085\\end{bmatrix}$$',
      body: 'By the fourth iteration the second component is $0.962085$, so the remaining gap is $1-0.962085=0.037915$. The power method is clearly converging to the dominant eigenvector direction.',
      diagram: wrapMathSvg(
        [
          '<line x1="50" y1="126" x2="170" y2="18" stroke="#7c3aed" stroke-width="2.5"/>',
          '<polygon points="170,18 161,21 165,29" fill="#7c3aed"/>',
          '<line x1="50" y1="126" x2="170" y2="10" stroke="#f59e0b" stroke-width="2.5"/>',
          '<polygon points="170,10 161,13 165,21" fill="#f59e0b"/>',
          '<text x="178" y="16" font-size="12">x^(3)</text>',
          '<text x="178" y="10" font-size="12">x^(4)</text>',
        ].join(''),
      ),
    },
    {
      title: 'Identify the limiting eigenpair',
      formula:
        '$$\\det(A-\\lambda I)=(4-\\lambda)(3-\\lambda)-2=\\lambda^2-7\\lambda+10=(\\lambda-5)(\\lambda-2)$$\n$$\\lambda_{\\max}=5,\\qquad v=\\begin{bmatrix}1\\\\1\\end{bmatrix}$$',
      body: 'The exact eigenvalues are $5$ and $2$, so the dominant eigenvalue is $5$. The corresponding eigenvector satisfies $(A-5I)v=0$, giving $v=(1,1)^T$, which matches the direction of the iterates.',
      diagram: numberLine(
        [
          { pos: 2, label: 'lambda = 2', color: '#64748b' },
          { pos: 4.906977, label: 'mu4', color: '#dc2626' },
          { pos: 5, label: 'lambda_max = 5', color: '#16a34a' },
        ],
        [2, 5],
      ),
      takeaway: 'The power method converges to the dominant eigenvector direction, and the scaling factors converge to the dominant eigenvalue.',
    },
  ],
  solution:
    'Starting from $$x^{(0)}=\\begin{bmatrix}1\\\\0\\end{bmatrix},$$ the power method gives $$x^{(1)}=\\begin{bmatrix}1\\\\0.5\\end{bmatrix},\\qquad x^{(2)}=\\begin{bmatrix}1\\\\\\frac79\\end{bmatrix}\\approx\\begin{bmatrix}1\\\\0.777778\\end{bmatrix},$$ $$x^{(3)}=\\begin{bmatrix}1\\\\\\frac{39}{43}\\end{bmatrix}\\approx\\begin{bmatrix}1\\\\0.906977\\end{bmatrix},\\qquad x^{(4)}=\\begin{bmatrix}1\\\\\\frac{203}{211}\\end{bmatrix}\\approx\\begin{bmatrix}1\\\\0.962085\\end{bmatrix}.$$ The associated scaling factors are $$\\mu_1=4,\\ \\mu_2=4.5,\\ \\mu_3=\\frac{43}{9}\\approx 4.777778,\\ \\mu_4=\\frac{211}{43}\\approx 4.906977.$$ Since $$\\det(A-\\lambda I)=(\\lambda-5)(\\lambda-2),$$ the dominant eigenvalue is $$\\lambda_{\\max}=5$$ with eigenvector $$v=(1,1)^T,$$ which agrees with the observed convergence.',
  verifiedPatterns: ['\\frac79', '\\frac{39}{43}', '\\frac{203}{211}', '4.906977', '\\lambda_{\\max}=5'],
  minDiagramSteps: 5,
};
