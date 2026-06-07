import { matrixDisplay, wrapMathSvg } from '../math-svg';
import type { MathQuestionDef } from './types';

export const Q07: MathQuestionDef = {
  id: 'q07',
  number: 7,
  topic: 'Rank, null space, and column space',
  question:
    'Let $$A=\\begin{bmatrix}1&2&-1&3\\\\2&4&1&5\\\\-1&-2&3&-1\\\\3&6&0&8\\end{bmatrix}.$$ Row reduce $A$, determine $\\operatorname{rank}(A)$, find a basis for $\\mathcal N(A)$ and a basis for $\\operatorname{Col}(A)$, and verify the rank-nullity theorem.',
  steps: [
    {
      title: 'Write the matrix and look for immediate row relations',
      body: 'The first column already suggests elimination from $R_1=(1,2,-1,3)$. Using the visible multiples $2R_1=(2,4,-2,6)$ and $3R_1=(3,6,-3,9)$ gives starting differences $R_2-2R_1=(0,0,3,-1)$ and $R_4-3R_1=(0,0,3,-1)$.',
      diagram: matrixDisplay(
        [
          ['1', '2', '-1', '3'],
          ['2', '4', '1', '5'],
          ['-1', '-2', '3', '-1'],
          ['3', '6', '0', '8'],
        ],
        'Matrix A',
        [[0, 0]],
      ),
    },
    {
      title: 'Eliminate below the first pivot',
      formula:
        '$$R_2\\leftarrow R_2-2R_1,\\quad R_3\\leftarrow R_3+R_1,\\quad R_4\\leftarrow R_4-3R_1$$',
      body: 'Those operations give $R_2=(0,0,3,-1)$, $R_3=(0,0,2,2)$, and $R_4=(0,0,3,-1)$, so after the first pivot we have $$\\begin{bmatrix}1&2&-1&3\\\\0&0&3&-1\\\\0&0&2&2\\\\0&0&3&-1\\end{bmatrix}.$$',
      diagram: matrixDisplay(
        [
          ['1', '2', '-1', '3'],
          ['0', '0', '3', '-1'],
          ['0', '0', '2', '2'],
          ['0', '0', '3', '-1'],
        ],
        'After first-column elimination',
        [[0, 0], [1, 2]],
      ),
    },
    {
      title: 'Finish the row reduction to RREF',
      formula:
        '$$R_2\\leftarrow \\tfrac13R_2,\\quad R_3\\leftarrow R_3-2R_2,\\quad R_4\\leftarrow R_4-3R_2,\\quad R_3\\leftarrow \\tfrac38R_3$$\n$$R_2\\leftarrow R_2+\\tfrac13R_3,\\quad R_1\\leftarrow R_1+R_2-3R_3$$',
      body: 'Scaling gives $R_2=(0,0,1,-\\tfrac13)$. Then $R_3=(0,0,0,\\tfrac83)$ and $R_4=(0,0,0,0)$, so $R_3$ scales to $(0,0,0,1)$. Clearing the fourth and third columns yields $$\\operatorname{rref}(A)=\\begin{bmatrix}1&2&0&0\\\\0&0&1&0\\\\0&0&0&1\\\\0&0&0&0\\end{bmatrix}.$$',
      diagram: matrixDisplay(
        [
          ['1', '2', '0', '0'],
          ['0', '0', '1', '0'],
          ['0', '0', '0', '1'],
          ['0', '0', '0', '0'],
        ],
        'RREF of A',
        [
          [0, 0],
          [1, 2],
          [2, 3],
        ],
      ),
    },
    {
      title: 'Read off the rank from the pivot columns',
      formula: '$$\\operatorname{rank}(A)=3$$',
      body: 'The rref has $3$ pivot rows and pivot columns $1$, $3$, and $4$, so the rank is $3=\\#\\{\\text{pivots}\\}$. Column $2$ is the only free column in the domain.',
      diagram: wrapMathSvg(
        [
          '<rect x="28" y="40" width="50" height="90" fill="#dbeafe" stroke="#1d4ed8"/>',
          '<rect x="88" y="40" width="50" height="90" fill="#fee2e2" stroke="#dc2626"/>',
          '<rect x="148" y="40" width="50" height="90" fill="#dbeafe" stroke="#1d4ed8"/>',
          '<rect x="208" y="40" width="50" height="90" fill="#dbeafe" stroke="#1d4ed8"/>',
          '<text x="53" y="88" font-size="13" text-anchor="middle">col 1</text>',
          '<text x="113" y="88" font-size="13" text-anchor="middle">col 2</text>',
          '<text x="173" y="88" font-size="13" text-anchor="middle">col 3</text>',
          '<text x="233" y="88" font-size="13" text-anchor="middle">col 4</text>',
          '<text x="53" y="110" font-size="12" text-anchor="middle">pivot</text>',
          '<text x="113" y="110" font-size="12" text-anchor="middle">free</text>',
          '<text x="173" y="110" font-size="12" text-anchor="middle">pivot</text>',
          '<text x="233" y="110" font-size="12" text-anchor="middle">pivot</text>',
        ].join(''),
      ),
    },
    {
      title: 'Solve Ax = 0 for the null space basis',
      formula:
        '$$x_1+2x_2=0,\\qquad x_3=0,\\qquad x_4=0$$\n$$x_2=t\\Rightarrow x=(-2t,t,0,0)=t(-2,1,0,0)$$',
      body: 'From the rref equations, choosing the free variable $x_2=t$ gives $x_1=-2t$, $x_3=0$, and $x_4=0$. Setting $t=1$ gives the basis vector $(-2,1,0,0)$, so $\\mathcal N(A)=\\operatorname{span}\\{(-2,1,0,0)\\}$.',
      diagram: wrapMathSvg(
        [
          '<line x1="40" y1="90" x2="145" y2="90" stroke="#333" stroke-width="2"/>',
          '<polygon points="145,90 136,85 136,95" fill="#333"/>',
          '<text x="30" y="82" font-size="13">t</text>',
          '<text x="210" y="82" font-size="13" text-anchor="middle">(-2t, t, 0, 0)</text>',
          '<text x="210" y="108" font-size="12" text-anchor="middle">t = 1 gives (-2,1,0,0)</text>',
          '<circle cx="40" cy="90" r="4" fill="#dc2626"/>',
          '<circle cx="145" cy="90" r="4" fill="#1d4ed8"/>',
        ].join(''),
      ),
    },
    {
      title: 'Choose a column space basis and verify rank-nullity',
      formula:
        '$$\\operatorname{Col}(A)=\\operatorname{span}\\left\\{\\begin{bmatrix}1\\\\2\\\\-1\\\\3\\end{bmatrix},\\begin{bmatrix}-1\\\\1\\\\3\\\\0\\end{bmatrix},\\begin{bmatrix}3\\\\5\\\\-1\\\\8\\end{bmatrix}\\right\\},\\qquad 3+1=4$$',
      body: 'The pivot columns are columns $1$, $3$, and $4$ of the original matrix, namely $(1,2,-1,3)^T$, $(-1,1,3,0)^T$, and $(3,5,-1,8)^T$. Their count is $3$, the nullity is $1$, and rank-nullity checks as $\\operatorname{rank}(A)+\\operatorname{nullity}(A)=3+1=4$.',
      takeaway: 'Pivot columns come from the original matrix, while null-space equations come from the rref.',
    },
  ],
  solution:
    'Row reduction gives $$\\operatorname{rref}(A)=\\begin{bmatrix}1&2&0&0\\\\0&0&1&0\\\\0&0&0&1\\\\0&0&0&0\\end{bmatrix}.$$ Hence $\\operatorname{rank}(A)=3$ with pivot columns $1$, $3$, and $4$. Solving $Ax=0$ gives $x_1=-2x_2$, $x_3=0$, $x_4=0$, so $$\\mathcal N(A)=\\operatorname{span}\\{(-2,1,0,0)\\}.$$ A basis for the column space is the set of original pivot columns $$\\left\\{(1,2,-1,3)^T,\\;(-1,1,3,0)^T,\\;(3,5,-1,8)^T\\right\\}.$$ Therefore the nullity is $1$, and rank-nullity is $3+1=4$.',
  verifiedPatterns: ['rank}(A)=3', '(-2,1,0,0)', '3+1=4', 'pivot columns $1$, $3$, and $4$'],
  minDiagramSteps: 4,
};
