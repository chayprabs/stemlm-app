import { axesGraph, numberLine, wrapMathSvg } from '../math-svg';
import type { MathQuestionDef } from './types';

export const Q17: MathQuestionDef = {
  id: 'q17',
  number: 17,
  topic: 'Sturm-Liouville eigenvalues and eigenfunctions',
  question:
    'Solve the boundary-value problem $$y\'\'+\\lambda y=0,\\qquad y(0)=0,\\qquad y\'(L)=0.$$ Find all eigenvalues and eigenfunctions.',
  steps: [
    {
      title: 'Separate the problem by the sign of lambda',
      formula:
        '$$\\lambda<0,\\qquad \\lambda=0,\\qquad \\lambda>0$$',
      body: 'The spectral parameter changes the shape of the solutions: hyperbolic for $\\lambda<0$, linear for $\\lambda=0$, and oscillatory for $\\lambda>0$. For example, with $L=1$, the first admissible eigenvalue will eventually turn out to be $\\pi^2/4\\approx2.467>0$, so the nontrivial branch is the oscillatory one.',
      diagram: numberLine(
        [
          { pos: -1, label: 'lambda<0', color: '#dc2626' },
          { pos: 0, label: '0', color: '#333' },
          { pos: 1, label: 'lambda>0', color: '#16a34a' },
        ],
        [-1.2, 1.2],
      ),
    },
    {
      title: 'Rule out the case lambda < 0',
      formula:
        '$$\\lambda=-\\mu^2\\ (\\mu>0)\\quad\\Rightarrow\\quad y=A\\sinh(\\mu x)+B\\cosh(\\mu x)$$\n$$y(0)=0\\Rightarrow B=0,\\qquad y\'(L)=A\\mu\\cosh(\\mu L)=0\\Rightarrow A=0$$',
      body: 'Taking $\\mu=1$ and $L=1$ gives $\\cosh(1)\\approx1.543$, which is not zero. Therefore $A\\mu\\cosh(\\mu L)=0$ forces $A=0$, so there is no nontrivial solution when $\\lambda<0$.',
      diagram: axesGraph({
        curves: [
          {
            d: 'M 42 126 C 90 122 136 108 182 84 S 232 42 258 22',
            stroke: '#dc2626',
            label: 'sinh branch',
            labelPos: [204, 26],
          },
        ],
        xLabel: 'x',
        yLabel: 'y',
      }),
    },
    {
      title: 'Rule out the case lambda = 0',
      formula:
        '$$y\'\'=0\\quad\\Rightarrow\\quad y=Ax+B$$\n$$y(0)=0\\Rightarrow B=0,\\qquad y\'(L)=A=0$$',
      body: 'At $L=1$, the derivative condition is still $y\'(1)=A=0$, so $A=0$ and then $B=0$. Thus $\\lambda=0$ also produces only the trivial solution.',
      diagram: wrapMathSvg(
        [
          '<line x1="42" y1="126" x2="252" y2="48" stroke="#334155" stroke-width="2.5"/>',
          '<text x="176" y="44" font-size="12">Ax+B</text>',
          '<text x="88" y="144" font-size="12">B=0 at x=0</text>',
          '<text x="182" y="120" font-size="12">A=0 from y\'(L)=0</text>',
        ].join(''),
      ),
    },
    {
      title: 'Solve the case lambda = k^2 > 0',
      formula:
        '$$\\lambda=k^2\\ (k>0)\\quad\\Rightarrow\\quad y=A\\sin kx+B\\cos kx$$\n$$y(0)=0\\Rightarrow B=0,\\qquad y\'(L)=Ak\\cos kL=0$$',
      body: 'If we test $k=\\pi/(2L)$, then $\\cos(kL)=\\cos(\\pi/2)=0$, so this branch can satisfy the right boundary condition. Because $B=0$, only the sine term survives.',
      diagram: axesGraph({
        curves: [
          {
            d: 'M 40 126 C 78 126 98 84 122 58 S 170 24 198 58 S 236 126 258 126',
            stroke: '#1d4ed8',
            label: 'A sin(kx)',
            labelPos: [198, 48],
          },
        ],
        xLabel: 'x',
        yLabel: 'y',
      }),
    },
    {
      title: 'Enforce the derivative boundary condition',
      formula:
        '$$\\cos kL=0\\quad\\Rightarrow\\quad kL=\\frac{(2n-1)\\pi}{2},\\qquad n=1,2,3,\\dots$$\n$$\\lambda_n=k_n^2=\\left(\\frac{(2n-1)\\pi}{2L}\\right)^2$$',
      body: 'For $n=1$ and $L=1$, we get $k_1=\\pi/2\\approx1.571$ and $\\lambda_1=\\pi^2/4\\approx2.467$. For $n=2$, $k_2=3\\pi/2\\approx4.712$, giving $\\lambda_2=9\\pi^2/4\\approx22.207$.',
      diagram: numberLine(
        [
          { pos: 2.467, label: 'lambda1', color: '#dc2626' },
          { pos: 22.207, label: 'lambda2', color: '#16a34a' },
        ],
        [0, 24],
      ),
    },
    {
      title: 'Write the eigenfunctions',
      formula:
        '$$y_n(x)=\\sin\\!\\left(\\frac{(2n-1)\\pi x}{2L}\\right),\\qquad n=1,2,3,\\dots$$',
      body: 'When $L=1$ and $n=1$, the first eigenfunction is $y_1(x)=\\sin(\\pi x/2)$. Then $y_1(0)=0$ and $y_1\'(1)=(\\pi/2)\\cos(\\pi/2)=0$, so it satisfies both boundary conditions exactly.',
      diagram: axesGraph({
        curves: [
          {
            d: 'M 40 126 C 86 126 114 94 150 70 S 214 22 258 22',
            stroke: '#7c3aed',
            label: 'y1(x)',
            labelPos: [212, 28],
          },
        ],
        xLabel: 'x',
        yLabel: 'y',
      }),
      takeaway: 'Mixed boundary conditions shift the spectrum from $n\\pi/L$ to the half-integer values $(2n-1)\\pi/(2L)$.',
    },
  ],
  solution:
    'There are three cases. If $$\\lambda=-\\mu^2<0,$$ then $$y=A\\sinh(\\mu x)+B\\cosh(\\mu x).$$ The condition $$y(0)=0$$ gives $$B=0,$$ and then $$y\'(L)=A\\mu\\cosh(\\mu L)=0$$ forces $$A=0,$$ so there is no nontrivial solution. If $$\\lambda=0,$$ then $$y=Ax+B,$$ and the boundary conditions again force $$A=B=0.$$ Therefore only $$\\lambda>0$$ yields eigenvalues. Writing $$\\lambda=k^2,$$ we get $$y=A\\sin kx+B\\cos kx.$$ From $$y(0)=0$$ we obtain $$B=0,$$ and from $$y\'(L)=Ak\\cos kL=0$$ we need $$\\cos kL=0.$$ Hence $$kL=\\frac{(2n-1)\\pi}{2},\\qquad n=1,2,3,\\dots,$$ so $$\\lambda_n=\\left(\\frac{(2n-1)\\pi}{2L}\\right)^2,$$ with eigenfunctions $$y_n(x)=\\sin\\!\\left(\\frac{(2n-1)\\pi x}{2L}\\right).$$',
  verifiedPatterns: [
    '\\lambda_n=\\left(\\frac{(2n-1)\\pi}{2L}\\right)^2',
    'y_n(x)=\\sin\\!\\left(\\frac{(2n-1)\\pi x}{2L}\\right)',
    '\\cos kL=0',
    'n=1,2,3,\\dots',
  ],
  minDiagramSteps: 6,
};
