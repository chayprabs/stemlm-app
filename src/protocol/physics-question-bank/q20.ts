import { physicsGraph, wrapPhysicsSvg } from '../physics-svg';
import type { PhysicsQuestionDef } from './types';

export const Q20: PhysicsQuestionDef = {
  id: 'q20',
  number: 20,
  topic: 'Quantum Harmonic Oscillator Operator Method',
  question:
    'Physics quantum harmonic oscillator using ladder operators: prove commutator [a,a†], use H=ħω(a†a+1/2) to get H|n>, evaluate uncertainties for n=2 with m=1.0e-26 kg and ω=2.0e13 s^-1, and for coherent state α=1.5 compute mean occupation and mean energy.',
  steps: [
    {
      title: 'Ladder operators and commutator',
      formula:
        '$$a=\\sqrt{\\frac{m\\omega}{2\\hbar}}x+\\frac{i}{\\sqrt{2m\\hbar\\omega}}p,\\quad a^\\dagger=\\sqrt{\\frac{m\\omega}{2\\hbar}}x-\\frac{i}{\\sqrt{2m\\hbar\\omega}}p,\\quad [a,a^\\dagger]=1$$',
      body: 'Using $[x,p]=i\\hbar$ gives $[a,a^\\dagger]=\\frac{m\\omega}{2\\hbar}[x,x]+\\frac{1}{2m\\hbar\\omega}[p,p]+\\frac{i}{2\\hbar}([x,p]-[p,x])=1$.',
      diagram: wrapPhysicsSvg(
        '<path d="M 40 130 Q 95 45 150 130 Q 205 45 260 130" fill="none" stroke="#1d4ed8" stroke-width="2.5"/>' +
          '<line x1="40" y1="130" x2="260" y2="130" stroke="#333" stroke-width="2"/>' +
          '<text x="100" y="28" font-size="11">V(x) parabola</text>' +
          '<text x="48" y="146" font-size="11">x</text>',
      ),
    },
    {
      title: 'Energy eigenvalues from operator Hamiltonian',
      formula:
        '$$H=\\hbar\\omega\\left(a^\\dagger a+\\tfrac12\\right),\\quad H|n\\rangle=\\hbar\\omega\\left(n+\\tfrac12\\right)|n\\rangle$$',
      body: 'For $n=2$, $E_2=(2.5)\\hbar\\omega=(2.5)(1.054\\times10^{-34})(2.0\\times10^{13})=5.27\\times10^{-21}\\,\\text{J}=0.0329\\,\\text{eV}$.',
      diagram: wrapPhysicsSvg(
        '<line x1="40" y1="140" x2="260" y2="140" stroke="#333" stroke-width="2"/>' +
          '<line x1="40" y1="140" x2="40" y2="30" stroke="#333" stroke-width="2"/>' +
          '<line x1="95" y1="125" x2="230" y2="125" stroke="#1d4ed8" stroke-width="2"/>' +
          '<line x1="95" y1="95" x2="230" y2="95" stroke="#1d4ed8" stroke-width="2"/>' +
          '<line x1="95" y1="65" x2="230" y2="65" stroke="#1d4ed8" stroke-width="2"/>' +
          '<text x="235" y="128" font-size="11">n=0</text>' +
          '<text x="235" y="98" font-size="11">n=1</text>' +
          '<text x="235" y="68" font-size="11">n=2</text>' +
          '<text x="18" y="35" font-size="11">E</text>',
      ),
    },
    {
      title: 'Position and momentum uncertainties in |n=2>',
      formula:
        '$$\\Delta x=\\sqrt{\\frac{(n+1/2)\\hbar}{m\\omega}},\\quad \\Delta p=\\sqrt{(n+1/2)m\\hbar\\omega},\\quad \\Delta x\\Delta p=(n+1/2)\\hbar$$',
      body: 'With $n=2$, $m=1.0\\times10^{-26}\\,\\text{kg}$, $\\omega=2.0\\times10^{13}\\,\\text{s}^{-1}$: $\\Delta x=\\sqrt{\\frac{2.5(1.054\\times10^{-34})}{(1.0\\times10^{-26})(2.0\\times10^{13})}}=3.63\\times10^{-11}\\,\\text{m}$, $\\Delta p=\\sqrt{2.5(1.0\\times10^{-26})(1.054\\times10^{-34})(2.0\\times10^{13})}=7.26\\times10^{-24}\\,\\text{kg·m/s}$, so $\\Delta x\\Delta p=(3.63\\times10^{-11})(7.26\\times10^{-24})=2.64\\times10^{-34}\\,\\text{J·s}=2.5\\hbar$.',
    },
    {
      title: 'Coherent state statistics and mean energy',
      formula:
        '$$|\\alpha\\rangle=e^{-\\frac{|\\alpha|^2}{2}}\\sum_{n=0}^{\\infty}\\frac{\\alpha^n}{\\sqrt{n!}}|n\\rangle,\\quad \\langle N\\rangle=|\\alpha|^2,\\quad \\langle H\\rangle=\\hbar\\omega\\left(|\\alpha|^2+\\tfrac12\\right)$$',
      body: 'For $\\alpha=1.5$, $\\langle N\\rangle=|\\alpha|^2=2.25$. Mean energy is $\\langle H\\rangle=(2.75)\\hbar\\omega=(2.75)(1.054\\times10^{-34})(2.0\\times10^{13})=5.80\\times10^{-21}\\,\\text{J}$. Coherent states keep minimum uncertainty with $\\Delta x\\Delta p=\\hbar/2$.',
      takeaway:
        'Operator algebra gives the entire oscillator spectrum and shows coherent states are closest quantum analogs of classical oscillations.',
    },
  ],
  solution:
    '**Commutator:** $[a,a^\\dagger]=1$. **Spectrum:** $H|n\\rangle=\\hbar\\omega(n+1/2)|n\\rangle$ so $E_n=\\hbar\\omega(n+1/2)$. For $n=2$, $E_2=5.27\\times10^{-21}\\,\\text{J}$. **Uncertainties in $|2\\rangle$:** $\\Delta x=3.63\\times10^{-11}\\,\\text{m}$, $\\Delta p=7.26\\times10^{-24}\\,\\text{kg·m/s}$, $\\Delta x\\Delta p=2.5\\hbar$. **Coherent state ($\\alpha=1.5$):** $\\langle N\\rangle=2.25$, $\\langle H\\rangle=5.80\\times10^{-21}\\,\\text{J}$.',
  verifiedPatterns: [
    '[a,a^\\dagger]=1',
    'H|n\\rangle=\\hbar\\omega',
    '5.27\\times10^{-21}\\,\\text{J}',
    '2.5\\hbar',
    '\\langle N\\rangle=2.25',
    '5.80\\times10^{-21}\\,\\text{J}',
  ],
  minDiagramSteps: 2,
};
