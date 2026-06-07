import { physicsGraph, wrapPhysicsSvg } from '../physics-svg';
import type { PhysicsQuestionDef } from './types';

export const Q19: PhysicsQuestionDef = {
  id: 'q19',
  number: 19,
  topic: 'Infinite Square Well Superposition',
  question:
    'Physics quantum particle in a 1D infinite square well (0<x<L, L=1.0 nm): write eigenfunctions and energies, then for initial state proportional to ψ1+sqrt(3)ψ2 find normalized coefficients and expectation values of energy, position, and momentum at t=0.',
  steps: [
    {
      title: 'Eigenfunctions and quantized energies',
      formula:
        '$$\\psi_n(x)=\\sqrt{\\frac{2}{L}}\\sin\\!\\left(\\frac{n\\pi x}{L}\\right),\\quad E_n=\\frac{n^2\\pi^2\\hbar^2}{2mL^2}$$',
      body: 'For an electron with $L=1.0\\times10^{-9}\\,\\text{m}$: $E_1=\\pi^2\\hbar^2/(2mL^2)=6.02\\times10^{-20}\\,\\text{J}=0.376\\,\\text{eV}$ and $E_2=4E_1=1.50\\,\\text{eV}$.',
      diagram: wrapPhysicsSvg(
        '<line x1="55" y1="140" x2="245" y2="140" stroke="#333" stroke-width="2"/>' +
          '<line x1="55" y1="140" x2="55" y2="35" stroke="#333" stroke-width="2"/>' +
          '<line x1="85" y1="115" x2="220" y2="115" stroke="#1d4ed8" stroke-width="2"/>' +
          '<line x1="85" y1="75" x2="220" y2="75" stroke="#dc2626" stroke-width="2"/>' +
          '<text x="226" y="118" font-size="11">E1</text>' +
          '<text x="226" y="78" font-size="11">E2=4E1</text>' +
          '<text x="42" y="40" font-size="11">E</text>',
      ),
    },
    {
      title: 'Normalize the superposition state',
      formula:
        '$$\\Psi(x,0)=N\\left(\\psi_1+\\sqrt3\\,\\psi_2\\right),\\quad 1=|N|^2(1+3)\\Rightarrow N=\\frac12$$',
      body: 'Thus coefficients are $c_1=1/2=0.50$ and $c_2=\\sqrt3/2=0.866$. Time dependence is $\\Psi(x,t)=c_1\\psi_1e^{-iE_1t/\\hbar}+c_2\\psi_2e^{-iE_2t/\\hbar}$.',
      diagram: wrapPhysicsSvg(
        '<line x1="55" y1="140" x2="245" y2="140" stroke="#333" stroke-width="2"/>' +
          '<path d="M 60 120 Q 100 60 150 100 T 240 80" fill="none" stroke="#1d4ed8" stroke-width="2"/>' +
          '<path d="M 60 130 Q 110 90 150 115 T 240 110" fill="none" stroke="#dc2626" stroke-width="2"/>' +
          '<line x1="55" y1="50" x2="55" y2="140" stroke="#333" stroke-width="1"/>' +
          '<text x="200" y="70" font-size="11" fill="#1d4ed8">psi1</text>' +
          '<text x="200" y="105" font-size="11" fill="#dc2626">psi2</text>' +
          '<text x="42" y="55" font-size="11">Re Psi</text>',
      ),
    },
    {
      title: 'Expectation value of energy',
      formula:
        '$$\\langle E\\rangle=|c_1|^2E_1+|c_2|^2E_2=\\frac14E_1+\\frac34(4E_1)=\\frac{13}{4}E_1$$',
      body: 'Numerically, $\\langle E\\rangle=(13/4)(0.376\\,\\text{eV})=1.22\\,\\text{eV}=1.95\\times10^{-19}\\,\\text{J}$.',
      diagram: physicsGraph({
        points: [
          { x: 120, y: 115, label: 'E1' },
          { x: 180, y: 75, label: 'E2' },
          { x: 155, y: 90, label: '<E>' },
        ],
        xLabel: 'state',
        yLabel: 'energy',
      }),
    },
    {
      title: 'Expectation values of position and momentum at t=0',
      formula:
        '$$\\langle x\\rangle=\\frac{L}{2}+2c_1c_2\\langle1|x|2\\rangle,\\quad \\langle1|x|2\\rangle=-\\frac{16L}{9\\pi^2}\\Rightarrow \\langle x\\rangle=L\\left(\\frac12-\\frac{8\\sqrt3}{9\\pi^2}\\right)=0.344L$$',
      body: 'With $L=1.0\\,\\text{nm}$, $\\langle x\\rangle=0.344\\,\\text{nm}$. Also $\\langle p\\rangle=0$ at $t=0$ because $\\Psi(x,0)$ is real.',
      diagram: wrapPhysicsSvg(
        '<line x1="55" y1="140" x2="245" y2="140" stroke="#333" stroke-width="2"/>' +
          '<line x1="130" y1="140" x2="130" y2="70" stroke="#1d4ed8" stroke-width="2"/>' +
          '<circle cx="130" cy="95" r="22" fill="none" stroke="#dc2626" stroke-width="1.5" stroke-dasharray="4 3"/>' +
          '<line x1="55" y1="115" x2="245" y2="115" stroke="#64748b" stroke-width="1" stroke-dasharray="3 2"/>' +
          '<text x="138" y="65" font-size="11">x avg</text>' +
          '<text x="175" y="110" font-size="11">L/2</text>' +
          '<text x="42" y="125" font-size="11">0</text><text x="230" y="125" font-size="11">L</text>',
      ),
      takeaway: 'A two-level superposition gives weighted energy average and shifts $\\langle x\\rangle$ away from $L/2$ via interference.',
    },
  ],
  solution:
    '**Eigenstates:** $\\psi_n=\\sqrt{2/L}\\sin(n\\pi x/L)$, $E_n=n^2\\pi^2\\hbar^2/(2mL^2)$. **Normalization:** $N=1/2$, so $c_1=1/2$, $c_2=\\sqrt3/2$. **Energy expectation:** $\\langle E\\rangle=(13/4)E_1=1.22\\,\\text{eV}$ for $L=1\\,\\text{nm}$. **Other expectations at $t=0$:** $\\langle x\\rangle=0.344L=0.344\\,\\text{nm}$ and $\\langle p\\rangle=0$.',
  verifiedPatterns: ['N=\\frac12', '\\frac{13}{4}E_1', '1.22\\,\\text{eV}', '0.344L', '\\langle p\\rangle=0'],
  minDiagramSteps: 2,
};
