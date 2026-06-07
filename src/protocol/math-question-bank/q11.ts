import { matrixDisplay, numberLine, wrapMathSvg } from '../math-svg';
import type { MathQuestionDef } from './types';

export const Q11: MathQuestionDef = {
  id: 'q11',
  number: 11,
  topic: 'Quadratic forms and orthogonal diagonalization',
  question:
    'Consider the quadratic form $$Q(x)=2x_1^2+4x_1x_2+5x_2^2-2x_2x_3+x_3^2.$$ Find the symmetric matrix $A$ with $Q(x)=x^TAx$, determine the eigenvalues of $A$, orthogonally diagonalize $A$, and show that the minimum of $Q(x)$ on the unit sphere $\\lVert x\\rVert=1$ is the smallest eigenvalue.',
  steps: [
    {
      title: 'Build the symmetric matrix for the quadratic form',
      formula:
        '$$Q(x)=x^TAx,\\qquad A=\\begin{bmatrix}2&2&0\\\\2&5&-1\\\\0&-1&1\\end{bmatrix}$$',
      body: 'The diagonal coefficients go directly into $A$: $a_{11}=2$, $a_{22}=5$, and $a_{33}=1$. The cross terms satisfy $2a_{12}x_1x_2=4x_1x_2$, so $a_{12}=a_{21}=2$, and $2a_{23}x_2x_3=-2x_2x_3$, so $a_{23}=a_{32}=-1$.',
      diagram: matrixDisplay(
        [
          ['2', '2', '0'],
          ['2', '5', '-1'],
          ['0', '-1', '1'],
        ],
        'Symmetric matrix A',
      ),
    },
    {
      title: 'Compute the characteristic polynomial and eigenvalues',
      formula:
        '$$p(\\lambda)=\\det(\\lambda I-A)=\\lambda^3-8\\lambda^2+12\\lambda-4$$\n$$\\lambda_1\\approx 0.474572,\\qquad \\lambda_2\\approx 1.369102,\\qquad \\lambda_3\\approx 6.156325$$',
      body: 'The trace check is $\\lambda_1+\\lambda_2+\\lambda_3\\approx 0.474572+1.369102+6.156325=8$, matching $\\operatorname{tr}(A)=8$. Also $0.474572\\cdot 1.369102\\cdot 6.156325\\approx 4$, matching $\\det(A)=4$, so these numerical roots are consistent.',
      diagram: numberLine(
        [
          { pos: 0.474572, label: '0.475', color: '#dc2626' },
          { pos: 1.369102, label: '1.369', color: '#2563eb' },
          { pos: 6.156325, label: '6.156', color: '#16a34a' },
        ],
        [0, 6.5],
      ),
    },
    {
      title: 'Choose orthonormal eigenvectors',
      formula:
        '$$q_1\\approx(-0.520657,\\ 0.397113,\\ 0.755789)^T$$\n$$q_2\\approx(0.739239,\\ -0.233192,\\ 0.631781)^T$$\n$$q_3\\approx(-0.427132,\\ -0.887650,\\ 0.172148)^T$$',
      body: 'These vectors are normalized to length $1$. For example, $Aq_1\\approx( -0.247090,\\ 0.188459,\\ 0.358677)^T=0.474572\\,q_1$, so $q_1$ is an eigenvector for the smallest eigenvalue. Likewise $Aq_2\\approx 1.369102\\,q_2$ and $Aq_3\\approx 6.156325\\,q_3$.',
      diagram: wrapMathSvg(
        [
          '<line x1="54" y1="126" x2="102" y2="62" stroke="#dc2626" stroke-width="2.5"/>',
          '<polygon points="102,62 94,65 99,73" fill="#dc2626"/>',
          '<line x1="54" y1="126" x2="160" y2="92" stroke="#2563eb" stroke-width="2.5"/>',
          '<polygon points="160,92 151,89 153,99" fill="#2563eb"/>',
          '<line x1="54" y1="126" x2="128" y2="142" stroke="#16a34a" stroke-width="2.5"/>',
          '<polygon points="128,142 120,136 118,146" fill="#16a34a"/>',
          '<text x="110" y="58" font-size="12">q1</text>',
          '<text x="170" y="92" font-size="12">q2</text>',
          '<text x="136" y="154" font-size="12">q3</text>',
        ].join(''),
      ),
    },
    {
      title: 'Form the orthogonal diagonalization',
      formula:
        '$$P=[q_1\\ q_2\\ q_3],\\qquad D=\\operatorname{diag}(0.474572,1.369102,6.156325),\\qquad A\\approx PDP^T$$',
      body: 'Because the matrix is symmetric, eigenvectors for distinct eigenvalues are orthogonal. Using the three unit vectors above gives $P^TP\\approx I_3$, and the product $PDP^T$ reproduces the entries $2.000$, $5.000$, and $1.000$ on the diagonal of $A$ to rounding accuracy.',
      diagram: matrixDisplay(
        [
          ['0.474572', '0', '0'],
          ['0', '1.369102', '0'],
          ['0', '0', '6.156325'],
        ],
        'Diagonal matrix D',
      ),
    },
    {
      title: 'Rewrite Q on the unit sphere in eigen-coordinates',
      formula:
        '$$x=Py\\Rightarrow Q(x)=x^TAx=y^TDy=0.474572\\,y_1^2+1.369102\\,y_2^2+6.156325\\,y_3^2$$\n$$\\lVert x\\rVert=1\\Rightarrow \\lVert y\\rVert=1\\Rightarrow y_1^2+y_2^2+y_3^2=1$$',
      body: 'Since $P$ is orthogonal, changing coordinates preserves length. The value of $Q$ is therefore a weighted average of the eigenvalues with weights $y_1^2$, $y_2^2$, and $y_3^2$, and those weights add to $1= y_1^2+y_2^2+y_3^2$.',
      diagram: wrapMathSvg(
        [
          '<circle cx="84" cy="90" r="42" fill="none" stroke="#64748b" stroke-width="2"/>',
          '<line x1="84" y1="90" x2="116" y2="58" stroke="#dc2626" stroke-width="2.5"/>',
          '<polygon points="116,58 108,61 113,68" fill="#dc2626"/>',
          '<line x1="84" y1="90" x2="146" y2="90" stroke="#2563eb" stroke-width="2.5"/>',
          '<polygon points="146,90 137,86 137,94" fill="#2563eb"/>',
          '<line x1="84" y1="90" x2="110" y2="126" stroke="#16a34a" stroke-width="2.5"/>',
          '<polygon points="110,126 102,121 101,131" fill="#16a34a"/>',
          '<text x="60" y="38" font-size="12">||y|| = 1</text>',
          '<text x="126" y="56" font-size="12">y1</text>',
          '<text x="154" y="94" font-size="12">y2</text>',
          '<text x="116" y="140" font-size="12">y3</text>',
        ].join(''),
      ),
    },
    {
      title: 'Read off the minimum from the smallest eigenvalue',
      formula:
        '$$\\min_{\\lVert x\\rVert=1}Q(x)=\\lambda_{\\min}\\approx 0.474572$$\n$$\\text{attained at }x=\\pm q_1$$',
      body: 'Because $0.474572<1.369102<6.156325$, the expression for $Q(x)$ is minimized by taking $y_1^2=1$ and $y_2=y_3=0$. That means $y=(\\pm1,0,0)$, so $x=Py=\\pm q_1$, and the minimum value is $0.474572$.',
      takeaway: 'For a symmetric matrix, the Rayleigh quotient on the unit sphere is minimized by the eigenvector of the smallest eigenvalue.',
    },
  ],
  solution:
    'The quadratic form has symmetric matrix $$A=\\begin{bmatrix}2&2&0\\\\2&5&-1\\\\0&-1&1\\end{bmatrix}.$$ Its characteristic polynomial is $$p(\\lambda)=\\lambda^3-8\\lambda^2+12\\lambda-4,$$ with eigenvalues approximately $$\\lambda_1\\approx0.474572,\\qquad \\lambda_2\\approx1.369102,\\qquad \\lambda_3\\approx6.156325.$$ One orthonormal eigenbasis is $$q_1\\approx(-0.520657,0.397113,0.755789)^T,\\quad q_2\\approx(0.739239,-0.233192,0.631781)^T,\\quad q_3\\approx(-0.427132,-0.887650,0.172148)^T.$$ With $$P=[q_1\\ q_2\\ q_3],\\qquad D=\\operatorname{diag}(0.474572,1.369102,6.156325),$$ we have the orthogonal diagonalization $$A\\approx PDP^T.$$ On the unit sphere, $$Q(x)=x^TAx=y^TDy=\\lambda_1 y_1^2+\\lambda_2 y_2^2+\\lambda_3 y_3^2$$ with $y=P^Tx$ and $y_1^2+y_2^2+y_3^2=1$, so $$\\min_{\\lVert x\\rVert=1}Q(x)=\\lambda_{\\min}\\approx0.474572,$$ attained at $x=\\pm q_1$.',
  verifiedPatterns: ['0.474572', '1.369102', '6.156325', 'PDP^T', '\\lambda_{\\min}'],
  minDiagramSteps: 5,
};
