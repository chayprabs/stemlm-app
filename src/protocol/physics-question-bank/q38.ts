import { wrapPhysicsSvg } from '../physics-svg';
import type { PhysicsQuestionDef } from './types';

export const Q38: PhysicsQuestionDef = {
  id: 'q38',
  number: 38,
  topic: 'Nearly Free Electron Band Gap at Zone Boundary',
  question:
    'Physics crystal electron wave model: in a 1D periodic potential with lattice spacing a=0.30 nm and Fourier component |U_G|=0.20 eV, evaluate the nearly-free-electron energies at the first Brillouin-zone boundary k=pi/a and compute the band-gap size from Bragg diffraction coupling.',
  steps: [
    {
      title: 'Locate first zone boundary and free-electron energy',
      formula:
        '$$k_B=\\frac{\\pi}{a}=\\frac{\\pi}{0.30\\times10^{-9}}=1.05\\times10^{10}\\,\\text{m}^{-1},\\quad E_0=\\frac{\\hbar^2k_B^2}{2m_e}=4.18\\,\\text{eV}$$',
      body: 'Using $a=0.30\\,\\text{nm}$ gives $k_B=1.05\\times10^{10}\\,\\text{m}^{-1}$. The free-electron energy at this wave vector is $E_0=6.69\\times10^{-19}\\,\\text{J}=4.18\\,\\text{eV}$.',
      diagram: wrapPhysicsSvg(
        '<line x1="35" y1="145" x2="270" y2="145" stroke="#333" stroke-width="2"/>' +
          '<line x1="35" y1="145" x2="35" y2="25" stroke="#333" stroke-width="2"/>' +
          '<path d="M 35 130 Q 95 98 150 70 Q 205 43 270 28" fill="none" stroke="#1d4ed8" stroke-width="2.5"/>' +
          '<line x1="150" y1="145" x2="150" y2="55" stroke="#dc2626" stroke-width="1.5" stroke-dasharray="4 3"/>' +
          '<text x="136" y="158" font-size="11">k=pi/a</text>' +
          '<text x="155" y="58" font-size="11" fill="#dc2626">zone edge</text>',
      ),
    },
    {
      title: 'Apply two-wave coupling at zone edge',
      formula: '$$E_{\\pm}=E_0\\pm|U_G|,\\qquad \\Delta E=E_+-E_-=2|U_G|$$',
      body: 'With $E_0=4.18\\,\\text{eV}$ and $|U_G|=0.20\\,\\text{eV}$: $E_-=4.18-0.20=3.98\\,\\text{eV}$ and $E_+=4.18+0.20=4.38\\,\\text{eV}$. The direct gap is $\\Delta E=4.38-3.98=0.40\\,\\text{eV}$.',
    },
    {
      title: 'Interpret standing-wave character at boundary',
      formula:
        '$$\\psi_\\pm(x)=\\frac{1}{\\sqrt2}\\left(e^{ik_Bx}\\pm e^{-ik_Bx}\\right),\\quad |\\psi_+|^2\\propto\\cos^2(k_Bx),\\quad |\\psi_-|^2\\propto\\sin^2(k_Bx)$$',
      body: 'The lower branch localizes where potential energy is lower, while the upper branch localizes where potential energy is higher. Numerically, splitting is $|U_G|=0.20\\,\\text{eV}$ on each side of $E_0=4.18\\,\\text{eV}$.',
      diagram: wrapPhysicsSvg(
        '<line x1="35" y1="145" x2="270" y2="145" stroke="#333" stroke-width="2"/>' +
          '<line x1="35" y1="145" x2="35" y2="20" stroke="#333" stroke-width="2"/>' +
          '<path d="M 45 130 Q 95 95 145 70" fill="none" stroke="#1d4ed8" stroke-width="2.5"/>' +
          '<path d="M 155 62 Q 205 40 255 28" fill="none" stroke="#1d4ed8" stroke-width="2.5"/>' +
          '<path d="M 45 136 Q 95 110 145 86" fill="none" stroke="#16a34a" stroke-width="2.5"/>' +
          '<path d="M 155 94 Q 205 72 255 58" fill="none" stroke="#16a34a" stroke-width="2.5"/>' +
          '<line x1="150" y1="145" x2="150" y2="55" stroke="#555" stroke-width="1.5" stroke-dasharray="4 3"/>' +
          '<text x="166" y="66" font-size="11" fill="#1d4ed8">E+</text>' +
          '<text x="166" y="97" font-size="11" fill="#16a34a">E-</text>' +
          '<text x="175" y="83" font-size="11">gap 0.40 eV</text>',
      ),
    },
    {
      title: 'Relate gap to transport-scale wave energies',
      formula: '$$\\Delta E=0.40\\,\\text{eV}=6.41\\times10^{-20}\\,\\text{J}$$',
      body: 'At room temperature $k_BT=0.0259\\,\\text{eV}$, so $\\Delta E/k_BT=0.40/0.0259=15.4$. This sizeable ratio means thermal excitation across this zone-edge gap is strongly suppressed.',
      takeaway:
        'Nearly-free-electron theory predicts a zone-boundary band gap from Bragg coupling of counter-propagating electron waves.',
    },
  ],
  solution:
    'At $a=0.30\\,\\text{nm}$, the first zone boundary is $k_B=\\pi/a=1.05\\times10^{10}\\,\\text{m}^{-1}$. Free-electron energy there is $E_0=4.18\\,\\text{eV}$. With $|U_G|=0.20\\,\\text{eV}$, the split energies are $E_-=3.98\\,\\text{eV}$ and $E_+=4.38\\,\\text{eV}$, so the band gap is $\\Delta E=0.40\\,\\text{eV}$.',
  verifiedPatterns: ['k_B=\\frac{\\pi}{a}', 'E_0=4.18\\,\\text{eV}', 'E_-=3.98\\,\\text{eV}', 'E_+=4.38\\,\\text{eV}', '\\Delta E=0.40\\,\\text{eV}'],
  minDiagramSteps: 2,
};
