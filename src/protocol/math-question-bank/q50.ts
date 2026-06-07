import { axesGraph, matrixDisplay, wrapMathSvg } from '../math-svg';
import type { MathQuestionDef } from './types';

export const Q50: MathQuestionDef = {
  id: 'q50',
  number: 50,
  topic: 'Damped wave equation and the e^{-t} substitution',
  question:
    'Solve the damped wave problem $$u_{tt}+2u_t=c^2u_{xx},\\qquad 0<x<\\pi,$$ with boundary conditions $u(0,t)=u(\\pi,t)=0$ and initial data $$u(x,0)=\\sin x,\\qquad u_t(x,0)=0.$$ Use the substitution $u(x,t)=e^{-t}v(x,t)$ and exploit the single sine mode in the initial data.',
  steps: [
    {
      title: 'Match the initial shape to the first sine mode',
      formula:
        '$$u(x,t)=a(t)\\sin x$$',
      body: 'Because the boundary conditions are homogeneous Dirichlet and the initial profile is exactly $\\sin x$, only the first spatial eigenmode is excited. At $t=0$ we need $a(0)\\sin x=\\sin x$, so $a(0)=1$.',
      diagram: axesGraph({
        curves: [
          {
            d: 'M 40 140 Q 95 55 150 40 T 260 140',
            stroke: '#2563eb',
            label: 'sin x',
            labelPos: [152, 34],
          },
        ],
        points: [
          { x: 40, y: 140, label: '0', fill: '#333' },
          { x: 260, y: 140, label: 'π', fill: '#333' },
        ],
        xLabel: 'x',
        yLabel: 'u(x,0)',
      }),
    },
    {
      title: 'Apply the substitution u = e^{-t}v',
      formula:
        '$$u=e^{-t}v,\\qquad u_t=e^{-t}(v_t-v),\\qquad u_{tt}=e^{-t}(v_{tt}-2v_t+v)$$\n$$u_{tt}+2u_t=c^2u_{xx}\\Rightarrow v_{tt}-v=c^2v_{xx}$$',
      body: 'Substituting the derivatives causes the middle $v_t$ terms to cancel exactly: $(v_{tt}-2v_t+v)+2(v_t-v)=v_{tt}-v$. This is the main benefit of the $e^{-t}$ substitution: it removes the first-order damping term.',
      diagram: wrapMathSvg(
        [
          '<rect x="44" y="44" width="74" height="44" fill="#eff6ff" stroke="#2563eb"/>',
          '<rect x="146" y="44" width="74" height="44" fill="#fef3c7" stroke="#ca8a04"/>',
          '<rect x="102" y="112" width="96" height="40" fill="#fee2e2" stroke="#dc2626"/>',
          '<text x="81" y="70" font-size="12" text-anchor="middle">u_tt</text>',
          '<text x="183" y="70" font-size="12" text-anchor="middle">2u_t</text>',
          '<text x="150" y="136" font-size="12" text-anchor="middle">v_tt - v</text>',
          '<line x1="118" y1="66" x2="146" y2="66" stroke="#333" stroke-width="2"/>',
          '<text x="132" y="58" font-size="12" text-anchor="middle">+</text>',
          '<line x1="183" y1="88" x2="150" y2="112" stroke="#333" stroke-width="2"/>',
        ].join(''),
      ),
    },
    {
      title: 'Separate the transformed equation in the same sine mode',
      formula:
        '$$v(x,t)=b(t)\\sin x\\Rightarrow v_{xx}=-b(t)\\sin x$$\n$$b\'\'(t)\\sin x-b(t)\\sin x=-c^2b(t)\\sin x\\Rightarrow b\'\'+(c^2-1)b=0$$',
      body: 'Since $\\sin x$ is an eigenfunction of the second derivative with eigenvalue $-1$, the PDE reduces to a scalar ODE. For the concrete value $c=2$, the time equation would be $b\'\'+3b=0$, an undamped oscillator.',
      diagram: axesGraph({
        curves: [
          {
            d: 'M 40 112 C 72 70 104 70 136 112 C 168 154 200 154 232 112',
            stroke: '#dc2626',
            label: 'b\'\'+(c²-1)b=0',
            labelPos: [148, 62],
          },
        ],
        xLabel: 't',
        yLabel: 'b',
      }),
    },
    {
      title: 'Translate the initial conditions to b(t)',
      formula:
        '$$u(x,0)=v(x,0)=\\sin x\\Rightarrow b(0)=1$$\n$$u_t(x,0)=v_t(x,0)-v(x,0)=0\\Rightarrow b\'(0)=1$$',
      body: 'At time $0$, the exponential factor is $e^{0}=1$, so $v(x,0)=u(x,0)=\\sin x$. Also $0=u_t(x,0)=v_t(x,0)-v(x,0)$, hence $v_t(x,0)=\\sin x$, which means $b\'(0)=1$.',
      diagram: matrixDisplay(
        [
          ['b(0)', '1'],
          ['b\'(0)', '1'],
        ],
        'Initial data for b(t)',
      ),
    },
    {
      title: 'Solve the time ODE explicitly',
      formula:
        '$$\\omega=\\sqrt{c^2-1},\\qquad b(t)=\\cos(\\omega t)+\\frac{1}{\\omega}\\sin(\\omega t)$$',
      body: 'The general solution of $b\'\'+\\omega^2b=0$ is $A\\cos(\\omega t)+B\\sin(\\omega t)$. Using $b(0)=1$ gives $A=1$, and $b\'(0)=B\\omega=1$ gives $B=1/\\omega$. For $c=2$, we have $\\omega=\\sqrt3$, so $b(t)=\\cos(\\sqrt3 t)+\\frac{1}{\\sqrt3}\\sin(\\sqrt3 t)$.',
      diagram: axesGraph({
        curves: [
          {
            d: 'M 40 104 C 70 72 100 64 130 82 C 160 100 190 124 220 116 C 236 112 250 98 262 84',
            stroke: '#16a34a',
            label: 'oscillatory b(t)',
            labelPos: [172, 70],
          },
        ],
        xLabel: 't',
        yLabel: 'b',
      }),
    },
    {
      title: 'Rebuild u(x,t) and read the damped solution',
      formula:
        '$$u(x,t)=e^{-t}\\left(\\cos\\bigl(\\sqrt{c^2-1}\\,t\\bigr)+\\frac{1}{\\sqrt{c^2-1}}\\sin\\bigl(\\sqrt{c^2-1}\\,t\\bigr)\\right)\\sin x$$',
      body: 'This final expression satisfies the PDE, the boundary conditions, and both initial conditions. For example, at $c=2$, $x=\\pi/2$, and $t=1$, the amplitude is $$e^{-1}\\left(\\cos\\sqrt3+\\frac{1}{\\sqrt3}\\sin\\sqrt3\\right)\\approx 0.1506,$$ showing the expected exponential damping.',
      takeaway:
        'The substitution $u=e^{-t}v$ converts the damped wave equation into a simpler undamped wave-type equation for $v$, after which the single sine mode solves everything explicitly.',
    },
  ],
  solution:
    'Because the initial data is a single eigenmode, write $$u(x,t)=a(t)\\sin x.$$ A convenient way to remove damping is the substitution $$u(x,t)=e^{-t}v(x,t).$$ Then $$u_t=e^{-t}(v_t-v),\\qquad u_{tt}=e^{-t}(v_{tt}-2v_t+v),$$ and substituting into $$u_{tt}+2u_t=c^2u_{xx}$$ gives $$v_{tt}-v=c^2v_{xx}.$$ Now set $$v(x,t)=b(t)\\sin x.$$ Since $v_{xx}=-b(t)\\sin x$, we obtain the ODE $$b\'\'+(c^2-1)b=0.$$ The initial conditions become $$b(0)=1,\\qquad b\'(0)=1.$$ Writing $$\\omega=\\sqrt{c^2-1},$$ the solution is $$b(t)=\\cos(\\omega t)+\\frac{1}{\\omega}\\sin(\\omega t).$$ Therefore $$u(x,t)=e^{-t}\\left(\\cos\\bigl(\\sqrt{c^2-1}\\,t\\bigr)+\\frac{1}{\\sqrt{c^2-1}}\\sin\\bigl(\\sqrt{c^2-1}\\,t\\bigr)\\right)\\sin x.$$',
  verifiedPatterns: [
    'u=e^{-t}v',
    'v_{tt}-v=c^2v_{xx}',
    '\\sqrt{c^2-1}',
    'e^{-t}',
    '\\sin x',
  ],
  minDiagramSteps: 5,
};
