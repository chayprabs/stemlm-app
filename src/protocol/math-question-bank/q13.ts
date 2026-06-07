import { axesGraph, numberLine, wrapMathSvg } from '../math-svg';
import type { MathQuestionDef } from './types';

export const Q13: MathQuestionDef = {
  id: 'q13',
  number: 13,
  topic: 'Variation of parameters for a second-order ODE',
  question:
    'Solve the initial value problem $$y\'\'-3y\'+2y=\\frac{e^x}{1+e^x},\\qquad y(0)=0,\\qquad y\'(0)=1,$$ using variation of parameters.',
  steps: [
    {
      title: 'Solve the homogeneous equation first',
      formula:
        '$$r^2-3r+2=(r-1)(r-2)=0\\qquad\\Rightarrow\\qquad y_h=c_1e^x+c_2e^{2x}$$',
      body: 'The two roots are $r=1$ and $r=2$. Checking numerically, $1^2-3(1)+2=0$ and $2^2-3(2)+2=4-6+2=0$, so the fundamental solutions are $e^x$ and $e^{2x}$.',
      diagram: numberLine(
        [
          { pos: 1, label: 'r=1', color: '#dc2626' },
          { pos: 2, label: 'r=2', color: '#16a34a' },
        ],
        [0.5, 2.5],
      ),
    },
    {
      title: 'Set up variation of parameters',
      formula:
        '$$y_1=e^x,\\qquad y_2=e^{2x},\\qquad W=y_1y_2\'-y_2y_1\'=e^{3x}$$\n$$u_1\'=-\\frac{y_2f(x)}{W}=-\\frac{1}{1+e^x},\\qquad u_2\'=\\frac{y_1f(x)}{W}=\\frac{e^{-x}}{1+e^x}$$',
      body: 'At $x=0$, the Wronskian is $W(0)=e^0=1$. The parameter derivatives are then $u_1\'(0)=-1/(1+1)=-1/2$ and $u_2\'(0)=1/(1+1)=1/2$.',
      diagram: wrapMathSvg(
        [
          '<rect x="38" y="40" width="224" height="96" fill="#f8fafc" stroke="#334155" stroke-width="2"/>',
          '<line x1="112" y1="40" x2="112" y2="136" stroke="#334155"/>',
          '<line x1="188" y1="40" x2="188" y2="136" stroke="#334155"/>',
          '<line x1="38" y1="78" x2="262" y2="78" stroke="#334155"/>',
          '<text x="75" y="64" font-size="12" text-anchor="middle">y1</text>',
          '<text x="150" y="64" font-size="12" text-anchor="middle">y2</text>',
          '<text x="225" y="64" font-size="12" text-anchor="middle">W</text>',
          '<text x="75" y="104" font-size="12" text-anchor="middle">e^x</text>',
          '<text x="150" y="104" font-size="12" text-anchor="middle">e^(2x)</text>',
          '<text x="225" y="104" font-size="12" text-anchor="middle">e^(3x)</text>',
        ].join(''),
      ),
    },
    {
      title: 'Integrate u1 and u2 with zero lower limit',
      formula:
        '$$u_1(x)=\\int_0^x-\\frac{1}{1+e^s}\\,ds=-x+\\ln\\!\\frac{1+e^x}{2}$$\n$$u_2(x)=\\int_0^x\\frac{e^{-s}}{1+e^s}\\,ds=1-x-e^{-x}+\\ln\\!\\frac{1+e^x}{2}$$',
      body: 'The lower limit $0$ is convenient because it makes both parameters vanish initially: $u_1(0)=0$ and $u_2(0)=1-0-1+\\ln 1=0$. At $x=1$, $\\ln\\!((1+e)/2)\\approx0.620$, so $u_1(1)\\approx-0.380$ and $u_2(1)\\approx0.252$.',
      diagram: axesGraph({
        curves: [
          {
            d: 'M 44 116 C 84 106 124 98 164 90 S 236 74 256 66',
            stroke: '#1d4ed8',
            label: 'u1,u2 from integrals',
            labelPos: [184, 60],
          },
        ],
        xLabel: 'x',
        yLabel: 'value',
        points: [{ x: 44, y: 116, label: '0', fill: '#dc2626' }],
      }),
    },
    {
      title: 'Build a particular solution',
      formula:
        '$$y_p=u_1y_1+u_2y_2$$\n$$y_p=e^x\\left(-x+\\ln\\!\\frac{1+e^x}{2}\\right)+e^{2x}\\left(1-x-e^{-x}+\\ln\\!\\frac{1+e^x}{2}\\right)$$',
      body: 'Because $u_1(0)=u_2(0)=0$, we get $y_p(0)=0$. Using $x=1$, the two terms are $e(-0.380)\\approx-1.033$ and $e^2(0.252)\\approx1.862$, so $y_p(1)\\approx0.829$.',
      diagram: axesGraph({
        curves: [
          {
            d: 'M 42 132 C 78 124 112 112 146 96 S 214 62 258 44',
            stroke: '#16a34a',
            label: 'y_p',
            labelPos: [226, 40],
          },
        ],
        xLabel: 'x',
        yLabel: 'y',
      }),
    },
    {
      title: 'Use the initial conditions to determine c1 and c2',
      formula:
        '$$y=c_1e^x+c_2e^{2x}+y_p$$\n$$y(0)=0\\Rightarrow c_1+c_2=0$$\n$$y\'(0)=1\\Rightarrow c_1+2c_2=1$$\n$$c_1=-1,\\qquad c_2=1$$',
      body: 'The zero-lower-limit construction gives $y_p(0)=0$ and $y_p\'(0)=0$, so the initial data come only from the homogeneous part. Solving $c_1+c_2=0$ and $c_1+2c_2=1$ gives $c_2=1$ and then $c_1=-1$.',
      diagram: wrapMathSvg(
        [
          '<rect x="42" y="44" width="82" height="92" fill="#fee2e2" stroke="#dc2626"/>',
          '<rect x="176" y="44" width="82" height="92" fill="#dcfce7" stroke="#16a34a"/>',
          '<text x="83" y="84" font-size="20" text-anchor="middle">c1</text>',
          '<text x="83" y="108" font-size="14" text-anchor="middle">-1</text>',
          '<text x="217" y="84" font-size="20" text-anchor="middle">c2</text>',
          '<text x="217" y="108" font-size="14" text-anchor="middle">1</text>',
        ].join(''),
      ),
    },
    {
      title: 'Write the final solution in compact form',
      formula:
        '$$L(x)=\\ln\\!\\frac{1+e^x}{2}$$\n$$y(x)=e^x\\bigl(L(x)-x-2\\bigr)+e^{2x}\\bigl(L(x)-x+2\\bigr)$$',
      body: 'At $x=0$, $L(0)=\\ln 1=0$, so $y(0)=1(-2)+1(2)=0$. At $x=1$, $L(1)\\approx0.620$, hence $y(1)\\approx e(-2.380)+e^2(1.620)\\approx-6.470+11.971=5.501$.',
      diagram: axesGraph({
        curves: [
          {
            d: 'M 40 138 C 76 134 108 122 140 102 S 210 56 258 28',
            stroke: '#7c3aed',
            label: 'solution y(x)',
            labelPos: [206, 34],
          },
        ],
        xLabel: 'x',
        yLabel: 'y',
      }),
      takeaway: 'Variation of parameters turns the forcing term into two integrals against the fundamental solutions, then the initial conditions fix the remaining homogeneous constants.',
    },
  ],
  solution:
    'The complementary solution of $$y\'\'-3y\'+2y=0$$ is $$y_h=c_1e^x+c_2e^{2x}.$$ For variation of parameters, choose $$y_1=e^x,\\qquad y_2=e^{2x},\\qquad W=e^{3x}.$$ Then $$u_1\'=-\\frac{1}{1+e^x},\\qquad u_2\'=\\frac{e^{-x}}{1+e^x}.$$ Using zero lower limits gives $$u_1(x)=-x+\\ln\\!\\frac{1+e^x}{2},\\qquad u_2(x)=1-x-e^{-x}+\\ln\\!\\frac{1+e^x}{2},$$ so $$y_p=u_1y_1+u_2y_2.$$ Because $$y_p(0)=0=y_p\'(0),$$ the initial conditions yield $$c_1+c_2=0,\\qquad c_1+2c_2=1,$$ hence $$c_1=-1,\\qquad c_2=1.$$ Therefore, with $$L(x)=\\ln\\!\\frac{1+e^x}{2},$$ the solution is $$y(x)=e^x\\bigl(L(x)-x-2\\bigr)+e^{2x}\\bigl(L(x)-x+2\\bigr).$$',
  verifiedPatterns: ['W=e^{3x}', 'c_1=-1', 'c_2=1', '\\ln\\!\\frac{1+e^x}{2}', 'L(x)-x+2'],
  minDiagramSteps: 5,
};
