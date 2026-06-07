import { axesGraph, wrapMathSvg } from '../math-svg';
import type { MathQuestionDef } from './types';

export const Q46: MathQuestionDef = {
  id: 'q46',
  number: 46,
  topic: 'Calculus of variations and the Euler-Lagrange equation',
  question:
    'Minimize the functional $$J[y]=\\int_0^1 \\bigl(y\'(x)^2+2y(x)\\bigr)\\,dx$$ subject to the boundary conditions $y(0)=0$ and $y(1)=0$. Derive the Euler-Lagrange equation, solve for the extremal, and compute the minimum value.',
  steps: [
    {
      title: 'Identify the Lagrangian and write Euler-Lagrange',
      formula:
        '$$L(x,y,y\')=y\'^2+2y,\\qquad \\frac{d}{dx}\\left(\\frac{\\partial L}{\\partial y\'}\\right)-\\frac{\\partial L}{\\partial y}=0$$',
      body: 'Here $\\partial L/\\partial y\'=2y\'$ and $\\partial L/\\partial y=2$. As a quick numerical check, for the trial curve $y=x(1-x)$ we have $y\'(0.5)=0$ and $L(0.5)=0^2+2(0.25)=0.5$, so both terms in the integrand matter.',
      diagram: wrapMathSvg(
        [
          '<rect x="56" y="40" width="188" height="82" fill="#f8fafc" stroke="#64748b"/>',
          '<text x="150" y="64" font-size="13" text-anchor="middle">L = y\'² + 2y</text>',
          '<text x="150" y="88" font-size="13" text-anchor="middle">d/dx(∂L/∂y\') - ∂L/∂y = 0</text>',
          '<text x="150" y="112" font-size="12" text-anchor="middle">Euler-Lagrange stationarity condition</text>',
        ].join(''),
      ),
    },
    {
      title: 'Reduce the Euler-Lagrange equation to an ODE',
      formula:
        '$$\\frac{d}{dx}(2y\')-2=0\\Rightarrow 2y\'\'-2=0\\Rightarrow y\'\'=1$$',
      body: 'Differentiating $2y\'$ gives $2y\'\'$, so the extremal must satisfy the constant-acceleration equation $y\'\'=1$. For example, any candidate with $y\'\'(x)=1$ has second derivative $1.0$ at $x=0.25$, $0.50$, and $0.75$ alike.',
      diagram: axesGraph({
        curves: [
          {
            d: 'M 40 80 L 260 80',
            stroke: '#dc2626',
            label: 'y\'\' = 1',
            labelPos: [208, 72],
          },
        ],
        xLabel: 'x',
        yLabel: 'y\'\'',
      }),
    },
    {
      title: 'Integrate twice and impose the boundary conditions',
      formula:
        '$$y(x)=\\frac{x^2}{2}+Cx+D,\\qquad y(0)=0\\Rightarrow D=0,\\qquad y(1)=0\\Rightarrow C=-\\frac12$$\n$$y(x)=\\frac{x^2-x}{2}$$',
      body: 'The first boundary condition gives $D=0$, and the second gives $0=1/2+C$, so $C=-1/2$. The resulting curve satisfies $y(0.5)=(0.25-0.5)/2=-0.125$, so the minimizer lies below the $x$-axis in the middle of the interval.',
      diagram: axesGraph({
        curves: [
          {
            d: 'M 40 120 Q 150 150 260 120',
            stroke: '#2563eb',
            label: 'y=(x²-x)/2',
            labelPos: [174, 154],
          },
        ],
        points: [
          { x: 40, y: 120, label: '(0,0)', fill: '#333' },
          { x: 260, y: 120, label: '(1,0)', fill: '#333' },
          { x: 150, y: 150, label: '(1/2,-1/8)', fill: '#dc2626' },
        ],
        xLabel: 'x',
        yLabel: 'y',
      }),
    },
    {
      title: 'Check that the extremal is a minimizer',
      formula:
        '$$\\delta^2J[\\eta]=2\\int_0^1 \\eta\'(x)^2\\,dx>0\\quad\\text{for }\\eta(0)=\\eta(1)=0,\\ \\eta\\not\\equiv 0$$',
      body: 'The second variation is positive for every nontrivial admissible variation. For example, if $\\eta(x)=\\sin(\\pi x)$, then $\\eta\'=\\pi\\cos(\\pi x)$ and $$2\\int_0^1 \\eta\'^2dx=2\\pi^2\\int_0^1\\cos^2(\\pi x)dx=2\\pi^2\\cdot \\frac12=\\pi^2>0.$$ So the stationary curve is indeed a minimum.',
      diagram: wrapMathSvg(
        [
          '<path d="M 40 120 Q 150 150 260 120" fill="none" stroke="#2563eb" stroke-width="2.5"/>',
          '<path d="M 40 120 Q 150 136 260 120" fill="none" stroke="#dc2626" stroke-width="2" stroke-dasharray="6 4"/>',
          '<text x="176" y="154" font-size="12">extremal</text>',
          '<text x="182" y="110" font-size="12">variation y+εη</text>',
        ].join(''),
      ),
    },
    {
      title: 'Substitute the minimizer into the functional',
      formula:
        '$$y\'=x-\\frac12,\\qquad y\'^2+2y=\\left(x-\\frac12\\right)^2+x^2-x=2x^2-2x+\\frac14$$\n$$J[y]=\\int_0^1\\left(2x^2-2x+\\frac14\\right)dx=\\frac23-1+\\frac14=-\\frac{1}{12}$$',
      body: 'Everything reduces to an elementary polynomial integral. Numerically, $2/3=0.6667$, so $0.6667-1+0.25=-0.0833=-1/12$, giving the minimum value.',
      takeaway:
        'The Euler-Lagrange equation gives the unique extremal $y(x)=(x^2-x)/2$, and the positive second variation confirms it is the minimizer.',
    },
  ],
  solution:
    'For $$J[y]=\\int_0^1(y\'^2+2y)\\,dx,$$ the Lagrangian is $$L=y\'^2+2y.$$ The Euler-Lagrange equation is $$\\frac{d}{dx}(2y\')-2=0,$$ so $$y\'\'=1.$$ Integrating twice gives $$y(x)=\\frac{x^2}{2}+Cx+D.$$ The boundary conditions $y(0)=0$ and $y(1)=0$ yield $$D=0,\\qquad C=-\\frac12,$$ hence the extremal is $$y(x)=\\frac{x^2-x}{2}.$$ Since $$\\delta^2J[\\eta]=2\\int_0^1\\eta\'(x)^2\\,dx>0$$ for every nonzero admissible variation, this extremal is a minimum. Substituting into the functional gives $$J[y]=\\int_0^1\\left(2x^2-2x+\\frac14\\right)dx=-\\frac{1}{12}.$$ So the minimizing curve is $$y(x)=\\frac{x^2-x}{2}$$ and the minimum value is $$-\\frac{1}{12}.$$',
  verifiedPatterns: ['Euler-Lagrange', 'y\'\'=1', '\\frac{x^2-x}{2}', '\\delta^2J', '-\\frac{1}{12}'],
  minDiagramSteps: 4,
};
