import { axesGraph, wrapMathSvg } from '../math-svg';
import type { MathQuestionDef } from './types';

export const Q28: MathQuestionDef = {
  id: 'q28',
  number: 28,
  topic: 'Heat equation on a finite interval by separation of variables',
  question:
    'Solve the heat equation $$u_t=ku_{xx},\\qquad 0<x<L,\\ t>0,$$ with boundary conditions $$u(0,t)=u(L,t)=0$$ and initial condition $$u(x,0)=x(L-x).$$ Use separation of variables and express the solution as a sine series.',
  steps: [
    {
      title: 'Separate variables in the PDE',
      formula:
        '$$u(x,t)=X(x)T(t)\\quad\\Longrightarrow\\quad X(x)T^{\\prime}(t)=kX^{\\prime\\prime}(x)T(t)$$',
      body: 'Dividing by $kXT$ shows that the time and space dependence must equal the same constant. If we later use the first mode $n=1$, the time factor becomes $e^{-k\\pi^2 t/L^2}$; for example, when $k=1$, $L=1$, and $t=0.1$, this factor is $e^{-0.1\\pi^2}\\approx 0.373$.',
      diagram: axesGraph({
        curves: [
          {
            d: 'M 40 140 Q 95 82 150 48 Q 205 82 260 140',
            stroke: '#1d4ed8',
            label: 'u(x,0)=x(L-x)',
            labelPos: [182, 40],
          },
        ],
        xLabel: 'x',
        yLabel: 'u',
      }),
    },
    {
      title: 'Introduce the separation constant and derive the ODEs',
      formula:
        '$$\\frac{T^{\\prime}}{kT}=\\frac{X^{\\prime\\prime}}{X}=-\\lambda\\quad\\Longrightarrow\\quad X^{\\prime\\prime}+\\lambda X=0,\\qquad T^{\\prime}+k\\lambda T=0$$',
      body: 'The minus sign is chosen so the boundary value problem for $X$ has nontrivial oscillatory solutions. With the sample value $\\lambda=(\\pi/L)^2$, the time equation gives $$T(t)=e^{-k\\pi^2 t/L^2},$$ so at $t=0.2$ with $k=L=1$ we get $T(0.2)=e^{-0.2\\pi^2}\\approx 0.139$.',
      diagram: wrapMathSvg(
        [
          '<rect x="28" y="48" width="104" height="74" fill="#dbeafe" stroke="#1d4ed8"/>',
          '<rect x="168" y="48" width="104" height="74" fill="#dcfce7" stroke="#16a34a"/>',
          '<text x="80" y="82" font-size="15" text-anchor="middle">Xpp + lambda X = 0</text>',
          '<text x="220" y="82" font-size="15" text-anchor="middle">Tp + k lambda T = 0</text>',
          '<text x="150" y="90" font-size="16" text-anchor="middle">and</text>',
        ].join(''),
      ),
    },
    {
      title: 'Use the zero boundary conditions to get the eigenfunctions',
      formula:
        '$$X_n(x)=\\sin\\left(\\frac{n\\pi x}{L}\\right),\qquad \\lambda_n=\\left(\\frac{n\\pi}{L}\\right)^2,\qquad n=1,2,3,\\dots$$',
      body: 'These sine modes vanish at both endpoints because $\\sin(0)=0$ and $\\sin(n\\pi)=0$. For instance, with $n=1$ and $x=L/2$, $$X_1(L/2)=\\sin(\\pi/2)=1,$$ so the first eigenfunction reaches its maximum in the middle of the rod.',
      diagram: axesGraph({
        curves: [
          {
            d: 'M 40 140 Q 95 38 150 20 Q 205 38 260 140',
            stroke: '#16a34a',
            label: 'sin(pi x / L)',
            labelPos: [180, 30],
          },
        ],
        points: [
          { x: 40, y: 140, label: '0', fill: '#dc2626' },
          { x: 260, y: 140, label: 'L', fill: '#dc2626' },
        ],
        xLabel: 'x',
        yLabel: 'X_n',
      }),
    },
    {
      title: 'Expand the initial profile in the sine basis',
      formula:
        '$$x(L-x)=\\sum_{n=1}^\\infty b_n\\sin\\left(\\frac{n\\pi x}{L}\\right),\qquad b_n=\\frac{2}{L}\\int_0^L x(L-x)\\sin\\left(\\frac{n\\pi x}{L}\\right)dx$$\n$$b_n=\\frac{4L^2}{\\pi^3n^3}\\bigl(1-(-1)^n\\bigr)$$',
      body: 'The coefficient formula comes from Fourier sine orthogonality. Plugging in $n=1$ gives $$b_1=\\frac{4L^2}{\\pi^3}(1-(-1))=\\frac{8L^2}{\\pi^3},$$ while $n=2$ gives $$b_2=\\frac{4L^2}{8\\pi^3}(1-1)=0.$$ So only odd sine modes survive.',
      diagram: wrapMathSvg(
        [
          '<line x1="42" y1="132" x2="264" y2="132" stroke="#333" stroke-width="2"/>',
          '<rect x="62" y="68" width="24" height="64" fill="#1d4ed8"/>',
          '<rect x="114" y="120" width="24" height="12" fill="#94a3b8"/>',
          '<rect x="166" y="104" width="24" height="28" fill="#1d4ed8"/>',
          '<rect x="218" y="124" width="24" height="8" fill="#94a3b8"/>',
          '<text x="74" y="60" font-size="12" text-anchor="middle">n=1</text>',
          '<text x="126" y="114" font-size="12" text-anchor="middle">n=2</text>',
          '<text x="178" y="96" font-size="12" text-anchor="middle">n=3</text>',
          '<text x="230" y="118" font-size="12" text-anchor="middle">n=4</text>',
        ].join(''),
      ),
    },
    {
      title: 'Assemble the full time-dependent series',
      formula:
        '$$u(x,t)=\\sum_{n=1}^\\infty \\frac{4L^2}{\\pi^3n^3}\\bigl(1-(-1)^n\\bigr)\\sin\\left(\\frac{n\\pi x}{L}\\right)e^{-kn^2\\pi^2t/L^2}$$\n$$=\\sum_{m=0}^\\infty \\frac{8L^2}{\\pi^3(2m+1)^3}\\sin\\left(\\frac{(2m+1)\\pi x}{L}\\right)e^{-k(2m+1)^2\\pi^2t/L^2}$$',
      body: 'At the midpoint $x=L/2$, the first term is $$\\frac{8L^2}{\\pi^3}\\sin(\\pi/2)e^{-k\\pi^2t/L^2}.$$ If $L=k=1$ and $t=0.1$, that leading contribution is $$\\frac{8}{\\pi^3}e^{-0.1\\pi^2}\\approx 0.258\\times 0.373\\approx 0.096,$$ showing the temperature decays rapidly in time.',
      diagram: axesGraph({
        curves: [
          {
            d: 'M 40 136 Q 95 98 150 86 Q 205 98 260 136',
            stroke: '#dc2626',
            label: 'later time',
            labelPos: [196, 80],
          },
          {
            d: 'M 40 140 Q 95 82 150 48 Q 205 82 260 140',
            stroke: '#94a3b8',
            label: 'initial',
            labelPos: [196, 42],
          },
        ],
        xLabel: 'x',
        yLabel: 'u',
      }),
    },
    {
      title: 'State the separated solution clearly',
      body: 'The boundary conditions force sine modes, the initial parabola selects only odd coefficients, and the exponential time factors damp higher modes even faster than the first. That is why the solution eventually looks like a scaled copy of the first sine wave.',
      takeaway: 'Separation of variables turns the PDE into an eigenfunction expansion: spatial sine modes times exponential decay factors.',
    },
  ],
  solution:
    'Assume $$u(x,t)=X(x)T(t).$$ Then $$X(x)T^{\\prime}(t)=kX^{\\prime\\prime}(x)T(t),$$ so after separation we get $$X^{\\prime\\prime}+\\lambda X=0,\\qquad T^{\\prime}+k\\lambda T=0.$$ The boundary conditions $$u(0,t)=u(L,t)=0$$ force $$X_n(x)=\\sin\\left(\\frac{n\\pi x}{L}\\right),\\qquad \\lambda_n=\\left(\\frac{n\\pi}{L}\\right)^2.$$ Expanding the initial data gives $$x(L-x)=\\sum_{n=1}^\\infty b_n\\sin\\left(\\frac{n\\pi x}{L}\\right),\qquad b_n=\\frac{2}{L}\\int_0^L x(L-x)\\sin\\left(\\frac{n\\pi x}{L}\\right)dx=\\frac{4L^2}{\\pi^3n^3}\\bigl(1-(-1)^n\\bigr).$$ Therefore $$u(x,t)=\\sum_{n=1}^\\infty \\frac{4L^2}{\\pi^3n^3}\\bigl(1-(-1)^n\\bigr)\\sin\\left(\\frac{n\\pi x}{L}\\right)e^{-kn^2\\pi^2t/L^2},$$ or equivalently $$u(x,t)=\\sum_{m=0}^\\infty \\frac{8L^2}{\\pi^3(2m+1)^3}\\sin\\left(\\frac{(2m+1)\\pi x}{L}\\right)e^{-k(2m+1)^2\\pi^2t/L^2}.$$',
  verifiedPatterns: [
    '\\sin\\left(\\frac{n\\pi x}{L}\\right)',
    '\\lambda_n=\\left(\\frac{n\\pi}{L}\\right)^2',
    '1-(-1)^n',
    '\\frac{8L^2}{\\pi^3(2m+1)^3}',
    'e^{-k(2m+1)^2\\pi^2t/L^2}',
  ],
  minDiagramSteps: 5,
};
