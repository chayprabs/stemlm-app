import { matrixDisplay, wrapMathSvg } from '../math-svg';
import type { MathQuestionDef } from './types';

export const Q08: MathQuestionDef = {
  id: 'q08',
  number: 8,
  topic: 'Eigenvalues, diagonalization, and matrix powers',
  question:
    'For the matrix $$A=\\begin{bmatrix}4&1&0\\\\2&3&0\\\\0&0&5\\end{bmatrix},$$ find the eigenvalues and corresponding eigenvectors, show that this matrix is diagonalizable, and compute $A^{10}$.',
  steps: [
    {
      title: 'Notice the block structure of A',
      body: 'The matrix splits into the top-left $2\\times 2$ block with entries $4,1,2,3$ and the separate bottom-right entry $5$. That means one eigenvalue is already $5=a_{33}$, and the other eigenvalues come from the top-left block.',
      diagram: matrixDisplay(
        [
          ['4', '1', '0'],
          ['2', '3', '0'],
          ['0', '0', '5'],
        ],
        'Matrix A',
        [
          [0, 0],
          [0, 1],
          [1, 0],
          [1, 1],
          [2, 2],
        ],
      ),
    },
    {
      title: 'Compute the characteristic polynomial',
      formula:
        '$$\\chi_A(\\lambda)=(5-\\lambda)\\det\\!\\begin{bmatrix}4-\\lambda&1\\\\2&3-\\lambda\\end{bmatrix}=(5-\\lambda)\\bigl((4-\\lambda)(3-\\lambda)-2\\bigr)$$\n$$=(5-\\lambda)(\\lambda^2-7\\lambda+10)=(5-\\lambda)^2(\\lambda-2)$$',
      body: 'For the block determinant, $(4-\\lambda)(3-\\lambda)-2=12-7\\lambda+\\lambda^2-2=\\lambda^2-7\\lambda+10$. Substituting $\\lambda=5$ gives $25-35+10=0$, and substituting $\\lambda=2$ gives $4-14+10=0$, so the eigenvalues are $5$, $5$, and $2$.',
      diagram: wrapMathSvg(
        [
          '<rect x="34" y="44" width="110" height="86" fill="#dbeafe" stroke="#1d4ed8"/>',
          '<rect x="196" y="44" width="70" height="86" fill="#dcfce7" stroke="#16a34a"/>',
          '<text x="89" y="88" font-size="13" text-anchor="middle">2x2 block</text>',
          '<text x="89" y="108" font-size="12" text-anchor="middle">eigs 5 and 2</text>',
          '<text x="231" y="88" font-size="13" text-anchor="middle">entry 5</text>',
          '<text x="231" y="108" font-size="12" text-anchor="middle">eigenvalue 5</text>',
        ].join(''),
      ),
    },
    {
      title: 'Find the eigenspace for lambda = 5',
      formula:
        '$$A-5I=\\begin{bmatrix}-1&1&0\\\\2&-2&0\\\\0&0&0\\end{bmatrix},\\qquad -x+y=0$$\n$$E_5=\\operatorname{span}\\{(1,1,0),(0,0,1)\\}$$',
      body: 'Solving $(A-5I)v=0$ gives $-x+y=0$, so $y=x$ and $z$ is free. Choosing $(x,z)=(1,0)$ gives $(1,1,0)$, and choosing $(x,z)=(0,1)$ gives $(0,0,1)$, so the geometric multiplicity is $2=\\text{algebraic multiplicity of }5$.',
      diagram: matrixDisplay(
        [
          ['-1', '1', '0'],
          ['2', '-2', '0'],
          ['0', '0', '0'],
        ],
        'A - 5I',
        [[0, 1]],
      ),
    },
    {
      title: 'Find the eigenspace for lambda = 2',
      formula:
        '$$A-2I=\\begin{bmatrix}2&1&0\\\\2&1&0\\\\0&0&3\\end{bmatrix},\\qquad 2x+y=0,\\ z=0$$\n$$E_2=\\operatorname{span}\\{(1,-2,0)\\}$$',
      body: 'The equations are $2x+y=0$ and $3z=0$, so $y=-2x$ and $z=0$. Setting $x=1$ gives the eigenvector $(1,-2,0)$, and that gives one independent direction for the eigenvalue $2$.',
      diagram: wrapMathSvg(
        [
          '<line x1="60" y1="120" x2="135" y2="70" stroke="#1d4ed8" stroke-width="2.5"/>',
          '<polygon points="135,70 126,71 130,79" fill="#1d4ed8"/>',
          '<line x1="60" y1="120" x2="170" y2="120" stroke="#333" stroke-width="2"/>',
          '<line x1="60" y1="120" x2="60" y2="35" stroke="#333" stroke-width="2"/>',
          '<text x="182" y="124" font-size="12">x</text>',
          '<text x="48" y="32" font-size="12">y</text>',
          '<text x="144" y="64" font-size="12">(1,-2,0)</text>',
        ].join(''),
      ),
    },
    {
      title: 'Assemble a diagonalization',
      formula:
        '$$P=\\begin{bmatrix}1&0&1\\\\1&0&-2\\\\0&1&0\\end{bmatrix},\\qquad D=\\operatorname{diag}(5,5,2),\\qquad A=PDP^{-1}$$',
      body: 'Take the columns of $P$ to be $(1,1,0)$, $(0,0,1)$, and $(1,-2,0)$. The determinant is $\\det(P)=-3\\neq 0$, so the eigenvectors are independent and $A$ is diagonalizable.',
      diagram: wrapMathSvg(
        [
          '<rect x="26" y="46" width="96" height="80" fill="#dbeafe" stroke="#1d4ed8"/>',
          '<rect x="188" y="46" width="86" height="80" fill="#dcfce7" stroke="#16a34a"/>',
          '<text x="74" y="86" font-size="18" text-anchor="middle">P</text>',
          '<text x="231" y="86" font-size="18" text-anchor="middle">D</text>',
          '<text x="74" y="108" font-size="12" text-anchor="middle">eigenvectors</text>',
          '<text x="231" y="108" font-size="12" text-anchor="middle">5, 5, 2</text>',
          '<text x="150" y="92" font-size="16" text-anchor="middle">A = P D P^-1</text>',
        ].join(''),
      ),
    },
    {
      title: 'Raise A to the tenth power',
      formula:
        '$$A^{10}=PD^{10}P^{-1},\\qquad D^{10}=\\operatorname{diag}(5^{10},5^{10},2^{10})$$',
      body: 'Here $5^{10}=9{,}765{,}625$ and $2^{10}=1{,}024$. Substituting those values into the block formula gives row $1=(6{,}510{,}758,\\ 3{,}254{,}867,\\ 0)$, row $2=(6{,}509{,}734,\\ 3{,}255{,}891,\\ 0)$, and row $3=(0,0,9{,}765{,}625)$. Therefore $A^{10}$ has entries $6510758$, $3254867$, $6509734$, $3255891$, and $9765625$ exactly as shown in the diagram.',
      diagram: matrixDisplay(
        [
          ['6510758', '3254867', '0'],
          ['6509734', '3255891', '0'],
          ['0', '0', '9765625'],
        ],
        'A^10',
      ),
      takeaway: 'Repeated eigenvalues do not prevent diagonalization when the eigenspace has enough independent vectors.',
    },
  ],
  solution:
    [
      'The characteristic polynomial is $\\chi_A(\\lambda)=(5-\\lambda)^2(\\lambda-2)$, so the eigenvalues are $5,5,2$.',
      'For $\\lambda=5$, an eigenspace basis is $(1,1,0)$ and $(0,0,1)$.',
      'For $\\lambda=2$, an eigenvector is $(1,-2,0)$.',
      'These three eigenvectors are independent, so $A$ is diagonalizable with $P=\\begin{bmatrix}1&0&1\\\\1&0&-2\\\\0&1&0\\end{bmatrix}$ and $D=\\operatorname{diag}(5,5,2)$.',
      'Using $A^{10}=PD^{10}P^{-1}$ gives rows $(6510758,3254867,0)$, $(6509734,3255891,0)$, and $(0,0,9765625)$.',
    ].join('\\n'),
  verifiedPatterns: ['(5-\\lambda)^2(\\lambda-2)', '(1,1,0)', '(1,-2,0)', '6510758', '9765625'],
  minDiagramSteps: 4,
};
