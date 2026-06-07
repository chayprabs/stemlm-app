import { wrapPhysicsSvg } from '../physics-svg';
import type { PhysicsQuestionDef } from './types';

export const Q44: PhysicsQuestionDef = {
  id: 'q44',
  number: 44,
  topic: 'Green Function Solution in 1D Field Theory',
  question:
    'Physics electric field boundary-value problem: solve -d^2phi/dx^2=rho/epsilon0 on 0<x<L with phi(0)=phi(L)=0 using the 1D Green function, then evaluate phi and field values for L=0.90 m and a point charge q=2.0 nC located at x0=0.30 m.',
  steps: [
    {
      title: 'Construct Green function for Dirichlet boundaries',
      formula:
        '$$G(x,\\xi)=\\begin{cases}\\dfrac{x(L-\\xi)}{L},&x<\\xi\\\\[2mm]\\dfrac{\\xi(L-x)}{L},&x>\\xi\\end{cases},\\qquad -\\frac{d^2G}{dx^2}=\\delta(x-\\xi)$$',
      body: 'With $L=0.90\\,\\text{m}$ and source at $\\xi=x_0=0.30\\,\\text{m}$, the piecewise factors are $(L-\\xi)/L=0.60/0.90=0.667$ and $\\xi/L=0.30/0.90=0.333$.',
      diagram: wrapPhysicsSvg(
        '<line x1="40" y1="120" x2="260" y2="120" stroke="#333" stroke-width="2"/>' +
          '<line x1="40" y1="120" x2="40" y2="30" stroke="#333" stroke-width="2"/>' +
          '<line x1="260" y1="120" x2="260" y2="30" stroke="#333" stroke-width="2"/>' +
          '<path d="M 40 120 L 130 55 L 260 120" fill="none" stroke="#1d4ed8" stroke-width="2.5"/>' +
          '<line x1="113" y1="120" x2="113" y2="67" stroke="#dc2626" stroke-width="1.5" stroke-dasharray="4 3"/>' +
          '<text x="100" y="135" font-size="11">x0=0.30 m</text>' +
          '<text x="147" y="58" font-size="11" fill="#1d4ed8">G(x,x0)</text>',
      ),
    },
    {
      title: 'Write potential for a point source',
      formula:
        '$$\\phi(x)=\\frac{1}{\\epsilon_0}\\int_0^L G(x,\\xi)\\rho(\\xi)\\,d\\xi=\\frac{q}{\\epsilon_0}G(x,x_0)$$',
      body: 'At $x=0.60\\,\\text{m}>x_0$, $G=\\xi(L-x)/L=0.30(0.90-0.60)/0.90=0.10\\,\\text{m}$. So $\\phi(0.60)=\\frac{(2.0\\times10^{-9})(0.10)}{8.854\\times10^{-12}}=22.6\\,\\text{V}$.',
    },
    {
      title: 'Differentiate to get electric field pieces',
      formula:
        '$$E(x)=-\\frac{d\\phi}{dx}=\\begin{cases}-\\dfrac{q(L-x_0)}{\\epsilon_0L},&x<x_0\\\\[2mm]+\\dfrac{qx_0}{\\epsilon_0L},&x>x_0\\end{cases}$$',
      body: 'For $x<x_0$, $E=-\\frac{(2.0\\times10^{-9})(0.60)}{(8.854\\times10^{-12})(0.90)}=-150.6\\,\\text{V/m}$. For $x>x_0$, $E=+\\frac{(2.0\\times10^{-9})(0.30)}{(8.854\\times10^{-12})(0.90)}=+75.3\\,\\text{V/m}$.',
      diagram: wrapPhysicsSvg(
        '<line x1="35" y1="90" x2="270" y2="90" stroke="#333" stroke-width="2"/>' +
          '<line x1="110" y1="30" x2="110" y2="150" stroke="#555" stroke-width="1.5" stroke-dasharray="4 3"/>' +
          '<line x1="40" y1="55" x2="110" y2="55" stroke="#dc2626" stroke-width="3"/>' +
          '<line x1="110" y1="120" x2="260" y2="120" stroke="#16a34a" stroke-width="3"/>' +
          '<text x="45" y="47" font-size="11" fill="#dc2626">E=-150.6 V/m</text>' +
          '<text x="142" y="114" font-size="11" fill="#16a34a">E=+75.3 V/m</text>' +
          '<text x="95" y="165" font-size="11">x0</text>',
      ),
    },
    {
      title: 'Check boundary and continuity conditions',
      formula: '$$\\phi(0)=0,\\ \\phi(L)=0,\\quad \\left.\\frac{d\\phi}{dx}\\right|_{x_0^+}-\\left.\\frac{d\\phi}{dx}\\right|_{x_0^-}=-\\frac{q}{\\epsilon_0}=-226\\,\\text{V}$$',
      body: 'The field discontinuity is $E(x_0^+)-E(x_0^-)=75.3-(-150.6)=225.9\\,\\text{V/m}$, consistent with $q/\\epsilon_0\\approx226\\,\\text{V/m}$ in 1D units.',
      takeaway:
        'Green functions convert boundary-value differential equations into direct source integrals with exact piecewise fields.',
    },
  ],
  solution:
    'For $L=0.90\\,\\text{m}$ and $x_0=0.30\\,\\text{m}$, the Dirichlet Green function is $G=x(L-x_0)/L$ for $x<x_0$ and $G=x_0(L-x)/L$ for $x>x_0$. With $q=2.0\\,\\text{nC}$: $\\phi(0.60)=22.6\\,\\text{V}$, $E(x<x_0)=-150.6\\,\\text{V/m}$, and $E(x>x_0)=+75.3\\,\\text{V/m}$.',
  verifiedPatterns: ['\\phi(0.60)=22.6\\,\\text{V}', '150.6\\,\\text{V/m}', '75.3\\,\\text{V/m}', 'q/\\epsilon_0'],
  minDiagramSteps: 2,
};
