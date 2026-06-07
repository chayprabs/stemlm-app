import { wrapPhysicsSvg } from '../physics-svg';
import type { PhysicsQuestionDef } from './types';

export const Q33: PhysicsQuestionDef = {
  id: 'q33',
  number: 33,
  topic: 'Fermi Golden Rule for a Hydrogen Transition',
  question:
    'Physics quantum transition rate in hydrogen using Fermi golden rule: from matrix element and photon-state density in a wave field, compute transition probability rate, lifetime, and energy-momentum emission scale.',
  steps: [
    {
      title: 'Compute perturbation matrix element magnitude',
      formula: '$$|V_{fi}|=|d_{fi}|E_0$$',
      body: 'With dipole matrix element $|d_{fi}|=3.0\times10^{-29}\,\text{C·m}$ and field amplitude $E_0=5.0\times10^3\,\text{V/m}$, $|V_{fi}|=(3.0\times10^{-29})(5.0\times10^3)=1.50\times10^{-25}\,\text{J}$, where $d_{fi}$ is transition dipole and $E_0$ is driving field amplitude.',
      diagram: wrapPhysicsSvg(
        '<line x1="50" y1="140" x2="250" y2="140" stroke="#333" stroke-width="2"/>' +
          '<line x1="95" y1="112" x2="220" y2="112" stroke="#1d4ed8" stroke-width="2"/>' +
          '<line x1="95" y1="72" x2="220" y2="72" stroke="#dc2626" stroke-width="2"/>' +
          '<path d="M 170 76 L 170 108" stroke="#16a34a" stroke-width="2.5"/>' +
          '<polygon points="170,108 164,99 176,99" fill="#16a34a"/>' +
          '<text x="224" y="115" font-size="11">|i></text>' +
          '<text x="224" y="75" font-size="11">|f></text>' +
          '<text x="175" y="92" font-size="11" fill="#16a34a">photon</text>',
      ),
    },
    {
      title: 'Apply Fermi golden rule for transition rate',
      formula: '$$W=\frac{2\pi}{\hbar}|V_{fi}|^2\rho(E_f)$$',
      body: 'Using $\rho(E_f)=2.0\times10^{20}\,\text{J}^{-1}$ and $|V_{fi}|=1.50\times10^{-25}\,\text{J}$ gives $|V_{fi}|^2=2.25\times10^{-50}\,\text{J}^2$. Also $(2\pi/\hbar)=5.96\times10^{34}\,\text{J}^{-1}\text{s}^{-1}$, so $W=(5.96\times10^{34})(2.25\times10^{-50})(2.0\times10^{20})=2.68\times10^5\,\text{s}^{-1}$, where $W$ is the transition rate and $\rho(E_f)$ is the final-state density.',
    },
    {
      title: 'Compute lifetime and emitted momentum scale',
      formula: '$$\tau=\frac{1}{W},\quad p_\gamma=\frac{\Delta E}{c}$$',
      body: 'The lifetime is $\tau=1/(2.68\times10^5)=3.73\times10^{-6}\,\text{s}$, where $\tau$ is mean lifetime. For transition energy $\Delta E=1.89\,\text{eV}=3.03\times10^{-19}\,\text{J}$, photon momentum is $p_\gamma=(3.03\times10^{-19})/(3.00\times10^8)=1.01\times10^{-27}\,\text{kg·m/s}$.',
      diagram: wrapPhysicsSvg(
        '<line x1="40" y1="140" x2="260" y2="140" stroke="#333" stroke-width="2"/>' +
          '<line x1="40" y1="140" x2="40" y2="30" stroke="#333" stroke-width="2"/>' +
          '<rect x="80" y="48" width="40" height="92" fill="#1d4ed8"/>' +
          '<rect x="155" y="108" width="40" height="32" fill="#dc2626"/>' +
          '<text x="82" y="42" font-size="10">W=2.68e5</text>' +
          '<text x="157" y="102" font-size="10">\u03c4=3.73e-6</text>' +
          '<text x="12" y="32" font-size="11">rate</text>',
      ),
      takeaway:
        'Fermi golden rule ties microscopic coupling and state density directly to observable transition rates and lifetimes.',
    },
  ],
  solution:
    '**Matrix element:** $|V_{fi}|=1.50\times10^{-25}\,\text{J}$. **Rate:** $W=2.68\times10^5\,\text{s}^{-1}$. **Lifetime:** $\tau=3.73\times10^{-6}\,\text{s}$. **Photon momentum scale:** $p_\gamma=1.01\times10^{-27}\,\text{kg·m/s}$.',
  verifiedPatterns: ['1.50', '2.68', '3.73', '1.01'],
  minDiagramSteps: 2,
};
