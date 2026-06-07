import { matrixDisplay, numberLine } from '../math-svg';
import type { MathQuestionDef } from './types';

export const Q36: MathQuestionDef = {
  id: 'q36',
  number: 36,
  topic: 'LU decomposition and condition number',
  question:
    'In this 3x3 linear algebra problem, solve the matrix system $$Ax=b$$ using LU decomposition for $$A=\\begin{bmatrix}3&1&0\\\\1&4&1\\\\0&1&3\\end{bmatrix},\\qquad b=\\begin{bmatrix}4\\\\6\\\\4\\end{bmatrix},$$ and compute the infinity-norm condition number of $A$.',
  steps: [
    {
      title: 'Write the matrix system',
      formula:
        '$$A=\\begin{bmatrix}3&1&0\\\\1&4&1\\\\0&1&3\\end{bmatrix},\\qquad b=\\begin{bmatrix}4\\\\6\\\\4\\end{bmatrix}$$',
      body: 'The row sums are $3+1+0=4$, $1+4+1=6$, and $0+1+3=4$, so elimination should be straightforward. We will factor $A$ as $LU$, then solve $Ly=b$ followed by $Ux=y$.',
      diagram: matrixDisplay(
        [
          ['3', '1', '0'],
          ['1', '4', '1'],
          ['0', '1', '3'],
        ],
        'Matrix A',
      ),
    },
    {
      title: 'Perform elimination to obtain the LU factorization',
      formula:
        '$$L=\\begin{bmatrix}1&0&0\\\\[2pt]\\frac13&1&0\\\\[2pt]0&\\frac3{11}&1\\end{bmatrix},\\qquad U=\\begin{bmatrix}3&1&0\\\\[2pt]0&\\frac{11}{3}&1\\\\[2pt]0&0&\\frac{30}{11}\\end{bmatrix}$$',
      body: 'The first multiplier is $l_{21}=1/3$, which eliminates the entry below the leading $3$. The second multiplier is $l_{32}=3/11$, which eliminates the remaining subdiagonal entry in the third row.',
      diagram: matrixDisplay(
        [
          ['3', '1', '0'],
          ['0', '11/3', '1'],
          ['0', '0', '30/11'],
        ],
        'Upper-triangular U',
      ),
    },
    {
      title: 'Solve Ly = b by forward substitution',
      formula:
        '$$y_1=4,\\qquad \\frac13 y_1+y_2=6\\Rightarrow y_2=\\frac{14}{3},\\qquad \\frac3{11}y_2+y_3=4\\Rightarrow y_3=\\frac{30}{11}$$',
      body: 'Forward substitution gives $y_1=4$, then $y_2=6-4/3=14/3$, and finally $y_3=4-(3/11)(14/3)=30/11$. Each new component comes from one subtraction because the diagonal entries of $L$ are $1$.',
      diagram: matrixDisplay(
        [
          ['y1', '4'],
          ['y2', '14/3'],
          ['y3', '30/11'],
        ],
        'Intermediate vector y',
      ),
    },
    {
      title: 'Solve Ux = y by back substitution',
      formula:
        '$$\\frac{30}{11}x_3=\\frac{30}{11}\\Rightarrow x_3=1$$\n$$\\frac{11}{3}x_2+x_3=\\frac{14}{3}\\Rightarrow x_2=1$$\n$$3x_1+x_2=4\\Rightarrow x_1=1$$',
      body: 'Working upward gives $x_3=1$, then $x_2=(14/3-1)/(11/3)=1$, and finally $x_1=(4-1)/3=1$. So the arithmetic collapses neatly to the vector of all ones.',
      diagram: matrixDisplay(
        [
          ['x1', '1'],
          ['x2', '1'],
          ['x3', '1'],
        ],
        'Solution vector x',
      ),
    },
    {
      title: 'Compute the infinity-norm condition number',
      formula:
        '$$A^{-1}=\\frac{1}{30}\\begin{bmatrix}11&-3&1\\\\-3&9&-3\\\\1&-3&11\\end{bmatrix}$$\n$$\\|A\\|_\\infty=6,\\qquad \\|A^{-1}\\|_\\infty=\\frac{15}{30}=\\frac12,\\qquad \\kappa_\\infty(A)=\\|A\\|_\\infty\\|A^{-1}\\|_\\infty=3$$',
      body: 'The largest row sum of $A$ is $|1|+|4|+|1|=6$, coming from the middle row. Each row sum of $A^{-1}$ is $15/30=1/2$, so the infinity-norm condition number is exactly $3$, indicating a well-conditioned system.',
      diagram: numberLine(
        [
          { pos: 0.5, label: '||A^-1||_inf = 1/2', color: '#2563eb' },
          { pos: 3, label: 'kappa_inf = 3', color: '#16a34a' },
          { pos: 6, label: '||A||_inf = 6', color: '#dc2626' },
        ],
        [0, 6],
      ),
    },
    {
      title: 'Summarize the numerical meaning',
      formula: '$$x=\\begin{bmatrix}1\\\\1\\\\1\\end{bmatrix},\\qquad \\kappa_\\infty(A)=3$$',
      body: 'The final answer is $x=(1,1,1)^T$, and the bound is scaled only by $\\kappa_\\infty(A)=3$. That is a modest amplification factor, consistent with the stable LU factors above.',
      takeaway: 'LU factorization separates the solve into structured triangular steps, while the condition number measures how sensitive the answer is to perturbations.',
    },
  ],
  solution:
    'Factoring $$A=LU$$ gives $$L=\\begin{bmatrix}1&0&0\\\\[2pt]\\frac13&1&0\\\\[2pt]0&\\frac3{11}&1\\end{bmatrix},\\qquad U=\\begin{bmatrix}3&1&0\\\\[2pt]0&\\frac{11}{3}&1\\\\[2pt]0&0&\\frac{30}{11}\\end{bmatrix}.$$ Solving $$Ly=b$$ yields $$y=\\begin{bmatrix}4\\\\[2pt]\\frac{14}{3}\\\\[2pt]\\frac{30}{11}\\end{bmatrix},$$ and solving $$Ux=y$$ gives $$x=\\begin{bmatrix}1\\\\1\\\\1\\end{bmatrix}.$$ Also $$A^{-1}=\\frac{1}{30}\\begin{bmatrix}11&-3&1\\\\-3&9&-3\\\\1&-3&11\\end{bmatrix},$$ so $$\\|A\\|_\\infty=6,$$ $$\\|A^{-1}\\|_\\infty=\\frac12,$$ and therefore $$\\kappa_\\infty(A)=3.$$',
  verifiedPatterns: ['\\frac3{11}', '\\frac{14}{3}', '\\frac{30}{11}', '\\kappa_\\infty(A)=3', '\\begin{bmatrix}1\\\\1\\\\1\\end{bmatrix}'],
  minDiagramSteps: 5,
};
