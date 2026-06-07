import { wrapPhysicsSvg } from '../physics-svg';
import type { PhysicsQuestionDef } from './types';

export const Q37: PhysicsQuestionDef = {
  id: 'q37',
  number: 37,
  topic: 'Free Electron Density of States in Copper',
  question:
    'Physics quantum electron gas in a crystal metal: for copper with electron number density n=8.47e28 m^-3, compute Fermi wave vector, Fermi energy, Fermi velocity, and the free-electron density of states at the Fermi energy.',
  steps: [
    {
      title: 'Find Fermi wave vector from electron density',
      formula: '$$k_F=(3\\pi^2 n)^{1/3}=(3\\pi^2\\times8.47\\times10^{28})^{1/3}=1.36\\times10^{10}\\,\\text{m}^{-1}$$',
      body: 'The occupied electron-wave sphere in $k$-space has radius $k_F=1.36\\times10^{10}\\,\\text{m}^{-1}$. Numerically, $3\\pi^2n=2.51\\times10^{30}\\,\\text{m}^{-3}$ and its cube root gives $k_F=1.36\\times10^{10}\\,\\text{m}^{-1}$.',
      diagram: wrapPhysicsSvg(
        '<line x1="40" y1="145" x2="270" y2="145" stroke="#333" stroke-width="2"/>' +
          '<line x1="40" y1="145" x2="40" y2="30" stroke="#333" stroke-width="2"/>' +
          '<circle cx="120" cy="95" r="48" fill="none" stroke="#1d4ed8" stroke-width="2"/>' +
          '<line x1="120" y1="95" x2="168" y2="95" stroke="#dc2626" stroke-width="2"/>' +
          '<text x="172" y="99" font-size="11" fill="#dc2626">kF</text>' +
          '<text x="78" y="40" font-size="11">occupied electron states</text>',
      ),
    },
    {
      title: 'Compute Fermi energy and Fermi velocity',
      formula:
        '$$E_F=\\frac{\\hbar^2k_F^2}{2m_e}=\\frac{(1.055\\times10^{-34})^2(1.36\\times10^{10})^2}{2(9.11\\times10^{-31})}=7.03\\,\\text{eV}$$',
      body: 'In joules, $E_F=1.13\\times10^{-18}\\,\\text{J}=7.03\\,\\text{eV}$. The corresponding speed is $v_F=\\hbar k_F/m_e=(1.055\\times10^{-34})(1.36\\times10^{10})/(9.11\\times10^{-31})=1.57\\times10^6\\,\\text{m/s}$.',
    },
    {
      title: 'Evaluate free-electron DOS expression',
      formula:
        '$$\\frac{g(E)}{V}=\\frac{1}{2\\pi^2}\\left(\\frac{2m_e}{\\hbar^2}\\right)^{3/2}\\sqrt{E},\\qquad \\frac{g(E_F)}{V}=\\frac{3n}{2E_F}$$',
      body: 'Using $n=8.47\\times10^{28}\\,\\text{m}^{-3}$ and $E_F=1.13\\times10^{-18}\\,\\text{J}$ gives $g(E_F)/V=3n/(2E_F)=1.13\\times10^{47}\\,\\text{J}^{-1}\\text{m}^{-3}$. Converting with $1\\,\\text{eV}=1.602\\times10^{-19}\\,\\text{J}$ gives $g(E_F)/V=1.81\\times10^{28}\\,\\text{eV}^{-1}\\text{m}^{-3}$.',
      diagram: wrapPhysicsSvg(
        '<line x1="40" y1="145" x2="270" y2="145" stroke="#333" stroke-width="2"/>' +
          '<line x1="40" y1="145" x2="40" y2="25" stroke="#333" stroke-width="2"/>' +
          '<path d="M 45 140 Q 95 120 145 90 Q 195 55 255 40" fill="none" stroke="#16a34a" stroke-width="2.5"/>' +
          '<line x1="190" y1="145" x2="190" y2="70" stroke="#dc2626" stroke-width="1.5" stroke-dasharray="4 3"/>' +
          '<text x="194" y="72" font-size="11" fill="#dc2626">EF</text>' +
          '<text x="210" y="40" font-size="11" fill="#16a34a">g(E)</text>',
      ),
    },
    {
      title: 'Use DOS for thermal scale near the Fermi level',
      formula: '$$k_BT\\,(300\\,\\text{K})=(8.617\\times10^{-5}\\,\\text{eV/K})(300)=0.0259\\,\\text{eV}\\ll E_F$$',
      body: 'The ratio is $k_BT/E_F=0.0259/7.03=3.69\\times10^{-3}$, so only a small fraction of electron states near $E_F$ are thermally active. This explains why the free-electron heat capacity is much smaller than classical predictions.',
      takeaway: 'Copper is strongly quantum-degenerate: $E_F\\gg k_BT$, with DOS at $E_F$ controlling low-temperature response.',
    },
  ],
  solution:
    'For copper with $n=8.47\\times10^{28}\\,\\text{m}^{-3}$: $k_F=1.36\\times10^{10}\\,\\text{m}^{-1}$, $E_F=7.03\\,\\text{eV}$, and $v_F=1.57\\times10^6\\,\\text{m/s}$. The free-electron DOS at the Fermi level is $g(E_F)/V=1.13\\times10^{47}\\,\\text{J}^{-1}\\text{m}^{-3}=1.81\\times10^{28}\\,\\text{eV}^{-1}\\text{m}^{-3}$.',
  verifiedPatterns: ['k_F=1.36\\times10^{10}', 'E_F=7.03\\,\\text{eV}', 'v_F=1.57\\times10^6', '1.81\\times10^{28}\\,\\text{eV}^{-1}\\text{m}^{-3}'],
  minDiagramSteps: 2,
};
