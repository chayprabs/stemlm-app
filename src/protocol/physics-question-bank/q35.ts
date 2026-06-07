import { wrapPhysicsSvg } from '../physics-svg';
import type { PhysicsQuestionDef } from './types';

export const Q35: PhysicsQuestionDef = {
  id: 'q35',
  number: 35,
  topic: 'Equipartition Theorem and Virial Relation',
  question:
    'Physics statistical mechanics with equipartition and virial theorem: compute thermal energy and rms momentum scale for a gas, then apply force-law virial balance to relate kinetic and potential energy in bound motion and wave-like oscillation.',
  steps: [
    {
      title: 'Use equipartition for translational thermal energy',
      formula: '$$U=\frac{3}{2}Nk_B T$$',
      body: 'For $N=2.00\times10^{23}$ and $T=350\,\text{K}$, $U=(3/2)(2.00\times10^{23})(1.38\times10^{-23})(350)=1.45\times10^3\,\text{J}$. Energy per particle is $U/N=(1.45\times10^3)/(2.00\times10^{23})=7.24\times10^{-21}\,\text{J}$.',
      diagram: wrapPhysicsSvg(
        '<circle cx="90" cy="85" r="7" fill="#1d4ed8"/><circle cx="130" cy="65" r="7" fill="#1d4ed8"/><circle cx="150" cy="110" r="7" fill="#1d4ed8"/><circle cx="185" cy="80" r="7" fill="#1d4ed8"/><circle cx="220" cy="105" r="7" fill="#1d4ed8"/>' +
          '<line x1="90" y1="85" x2="115" y2="85" stroke="#dc2626" stroke-width="2"/><polygon points="115,85 106,81 106,89" fill="#dc2626"/>' +
          '<line x1="185" y1="80" x2="210" y2="72" stroke="#dc2626" stroke-width="2"/><polygon points="210,72 201,70 204,79" fill="#dc2626"/>' +
          '<text x="55" y="32" font-size="11">thermal motion</text>',
      ),
    },
    {
      title: 'Compute rms speed and momentum scale',
      formula: '$$v_{\text{rms}}=\sqrt{\frac{3k_B T}{m}},\quad p_{\text{rms}}=mv_{\text{rms}}$$',
      body: 'For argon atom mass $m=6.63\times10^{-26}\,\text{kg}$, $v_{\text{rms}}=\sqrt{3(1.38\times10^{-23})(350)/(6.63\times10^{-26})}=4.68\times10^2\,\text{m/s}$. Then $p_{\text{rms}}=(6.63\times10^{-26})(4.68\times10^2)=3.10\times10^{-23}\,\text{kg·m/s}$, where $v_{\\text{rms}}$ is root-mean-square speed.',
    },
    {
      title: 'Apply virial theorem for inverse-square bound motion',
      formula: '$$2\langle K\rangle+\langle V\rangle=0,\quad E=\langle K\rangle+\langle V\rangle=-\langle K\rangle$$',
      body: 'Given measured mean kinetic energy $\langle K\rangle=4.00\times10^{-20}\,\text{J}$, virial gives $\langle V\rangle=-2\langle K\rangle=-8.00\times10^{-20}\,\text{J}$, where $K$ is mean kinetic energy and $V$ is mean potential energy. Total energy is $E=\langle K\rangle+\langle V\rangle=4.00\times10^{-20}-8.00\times10^{-20}=-4.00\times10^{-20}\,\text{J}$.',
      diagram: wrapPhysicsSvg(
        '<line x1="40" y1="140" x2="270" y2="140" stroke="#333" stroke-width="2"/>' +
          '<line x1="40" y1="140" x2="40" y2="30" stroke="#333" stroke-width="2"/>' +
          '<rect x="80" y="100" width="45" height="40" fill="#1d4ed8"/>' +
          '<rect x="150" y="60" width="45" height="80" fill="#dc2626"/>' +
          '<line x1="220" y1="120" x2="260" y2="120" stroke="#16a34a" stroke-width="2.5"/>' +
          '<text x="82" y="95" font-size="10">Kavg</text>' +
          '<text x="152" y="55" font-size="10">Vavg</text>' +
          '<text x="223" y="114" font-size="10">E&lt;0</text>',
      ),
      takeaway:
        'Equipartition sets thermal kinetic scales, while virial constraints connect kinetic and potential energies in bound systems.',
    },
  ],
  solution:
    '**Equipartition energy:** $U=1.45\times10^3\,\text{J}$. **RMS values (argon, 350 K):** $v_{\text{rms}}=4.68\times10^2\,\text{m/s}$ and $p_{\text{rms}}=3.10\times10^{-23}\,\text{kg·m/s}$. **Virial example:** with $\langle K\rangle=4.00\times10^{-20}\,\text{J}$, $\langle V\rangle=-8.00\times10^{-20}\,\text{J}$ and $E=-4.00\times10^{-20}\,\text{J}$.',
  verifiedPatterns: ['1.45', '4.68', '3.10', '-8.00', '-4.00'],
  minDiagramSteps: 2,
};
