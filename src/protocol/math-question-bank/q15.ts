import { matrixDisplay, numberLine, phasePlane, wrapMathSvg } from '../math-svg';
import type { MathQuestionDef } from './types';

export const Q15: MathQuestionDef = {
  id: 'q15',
  number: 15,
  topic: 'Linear systems and phase portraits',
  question:
    'For the linear system $$\\frac{d}{dt}\\begin{bmatrix}x\\\\y\\end{bmatrix}=\\begin{bmatrix}1&-4\\\\1&-3\\end{bmatrix}\\begin{bmatrix}x\\\\y\\end{bmatrix},$$ determine the eigenstructure, write the general solution, and sketch the phase portrait.',
  steps: [
    {
      title: 'Record the system matrix',
      formula:
        '$$A=\\begin{bmatrix}1&-4\\\\1&-3\\end{bmatrix}$$',
      body: 'The trace is $1+(-3)=-2$ and the determinant is $1(-3)-(-4)(1)=-3+4=1$. Those two numbers already suggest a stable matrix because the trace is negative and the determinant is positive.',
      diagram: matrixDisplay(
        [
          ['1', '-4'],
          ['1', '-3'],
        ],
        'System matrix A',
      ),
    },
    {
      title: 'Compute the characteristic polynomial',
      formula:
        '$$p(\\lambda)=\\det(A-\\lambda I)=\\begin{vmatrix}1-\\lambda&-4\\\\1&-3-\\lambda\\end{vmatrix}=\\lambda^2+2\\lambda+1=(\\lambda+1)^2$$',
      body: 'Substituting $\\lambda=-1$ gives $(-1)^2+2(-1)+1=1-2+1=0$, so the matrix has the repeated eigenvalue $\\lambda=-1$.',
      diagram: numberLine([{ pos: -1, label: '-1 (double)', color: '#dc2626' }], [-2, 0]),
    },
    {
      title: 'Find an eigenvector and a generalized eigenvector',
      formula:
        '$$A+I=\\begin{bmatrix}2&-4\\\\1&-2\\end{bmatrix},\\qquad (A+I)v=0\\Rightarrow v=\\begin{bmatrix}2\\\\1\\end{bmatrix}$$\n$$ (A+I)w=v\\Rightarrow w=\\begin{bmatrix}1\\\\0\\end{bmatrix}$$',
      body: 'Checking directly, $A(2,1)^T=(-2,-1)^T=-1(2,1)^T$, so $v=(2,1)^T$ is an eigenvector. Also $(A+I)(1,0)^T=(2,1)^T=v$, so $w=(1,0)^T$ is a valid generalized eigenvector.',
      diagram: wrapMathSvg(
        [
          '<line x1="48" y1="124" x2="120" y2="88" stroke="#1d4ed8" stroke-width="2.5"/>',
          '<polygon points="120,88 111,88 115,96" fill="#1d4ed8"/>',
          '<line x1="48" y1="124" x2="96" y2="124" stroke="#16a34a" stroke-width="2.5"/>',
          '<polygon points="96,124 87,120 87,128" fill="#16a34a"/>',
          '<text x="130" y="88" font-size="12">v=(2,1)</text>',
          '<text x="106" y="136" font-size="12">w=(1,0)</text>',
        ].join(''),
      ),
    },
    {
      title: 'Write the Jordan-form solution',
      formula:
        '$$X(t)=e^{-t}\\left[c_1v+c_2\\bigl(tv+w\\bigr)\\right]$$\n$$\\begin{bmatrix}x(t)\\\\y(t)\\end{bmatrix}=e^{-t}\\left[c_1\\begin{bmatrix}2\\\\1\\end{bmatrix}+c_2\\begin{bmatrix}2t+1\\\\t\\end{bmatrix}\\right]$$',
      body: 'For example, if $c_1=1$ and $c_2=1$, then at $t=1$ we get $X(1)=e^{-1}(5,2)^T\\approx(1.839,0.736)^T$. The exponential factor $e^{-t}$ drives every solution toward the origin as $t\\to\\infty$.',
      diagram: wrapMathSvg(
        [
          '<rect x="36" y="44" width="228" height="88" fill="#f8fafc" stroke="#334155" stroke-width="2"/>',
          '<text x="150" y="78" font-size="16" text-anchor="middle">X(t)=e^(-t)[c1 v + c2(tv+w)]</text>',
          '<text x="150" y="104" font-size="12" text-anchor="middle">Jordan block gives the extra t factor</text>',
        ].join(''),
      ),
    },
    {
      title: 'Classify the phase portrait',
      formula:
        '$$e^{-t}\\to0\\quad\\text{as}\\quad t\\to\\infty\\qquad\\Rightarrow\\qquad (0,0)\\text{ is asymptotically stable}$$',
      body: 'Using $c_1=1$ and $c_2=1$ again, $X(3)=e^{-3}(9,4)^T\\approx(0.448,0.199)^T$, much closer to the origin than at $t=1$. Because there is only one eigenvector, the origin is a stable improper node and trajectories are tangent to the line $y=x/2$ near $(0,0)$.',
      diagram: phasePlane(
        [
          'M 70 132 C 92 112 110 102 132 94 C 152 86 170 82 190 80',
          'M 76 46 C 94 68 114 84 136 96 C 156 108 176 118 196 126',
          'M 104 142 C 122 120 138 106 154 96 C 170 86 186 78 204 72',
          'M 106 38 C 126 62 144 78 162 92 C 178 104 194 114 214 126',
        ],
        [40, 140],
        ['all trajectories decay', 'single eigendirection y=x/2'],
      ),
      takeaway: 'The given matrix does not have distinct eigenvalues; it has a repeated eigenvalue $-1$ and produces a stable improper node rather than a two-direction stable node.',
    },
  ],
  solution:
    'For $$A=\\begin{bmatrix}1&-4\\\\1&-3\\end{bmatrix},$$ the characteristic polynomial is $$p(\\lambda)=\\lambda^2+2\\lambda+1=(\\lambda+1)^2,$$ so the only eigenvalue is the repeated value $$\\lambda=-1.$$ Solving $$(A+I)v=0$$ gives the eigenvector $$v=(2,1)^T,$$ and solving $$(A+I)w=v$$ gives one generalized eigenvector $$w=(1,0)^T.$$ Therefore the Jordan-form solution is $$X(t)=e^{-t}\\left[c_1\\begin{bmatrix}2\\\\1\\end{bmatrix}+c_2\\begin{bmatrix}2t+1\\\\t\\end{bmatrix}\\right].$$ Every solution decays to the origin because of the factor $$e^{-t},$$ and the phase portrait is a stable improper node with trajectories tangent to the eigendirection $$y=x/2.$$',
  verifiedPatterns: ['(\\lambda+1)^2', 'v=(2,1)^T', 'w=(1,0)^T', 'stable improper node', 'y=x/2'],
  minDiagramSteps: 5,
};
