import { wrapPhysicsSvg } from '../physics-svg';
import type { PhysicsQuestionDef } from './types';

export const Q27: PhysicsQuestionDef = {
  id: 'q27',
  number: 27,
  topic: 'Larmor Radiation from Accelerated Charge',
  question:
    'Physics electromagnetic radiation from an accelerated charge: for circular motion in a magnetic field, compute acceleration, Larmor power, and radiated energy per cycle using force, momentum, wave, and energy ideas.',
  steps: [
    {
      title: 'Compute centripetal acceleration for the charge trajectory',
      formula: '$$a=\omega^2 r,\quad \omega=2\pi f$$',
      body: 'With $f=1.00\times10^8\,\text{Hz}$ and $r=2.00\times10^{-2}\,\text{m}$, $\omega=2\pi(1.00\times10^8)=6.283\times10^8\,\text{s}^{-1}$. Then $a=(6.283\times10^8)^2(2.00\times10^{-2})=7.90\times10^{15}\,\text{m/s}^2$.',
      diagram: wrapPhysicsSvg(
        '<circle cx="145" cy="95" r="48" fill="none" stroke="#1d4ed8" stroke-width="2.5"/>' +
          '<circle cx="145" cy="95" r="4" fill="#dc2626"/>' +
          '<line x1="145" y1="95" x2="193" y2="95" stroke="#333" stroke-width="1.5"/>' +
          '<path d="M 188 95 Q 198 88 205 95" fill="none" stroke="#16a34a" stroke-width="2"/>' +
          '<polygon points="205,95 196,91 196,99" fill="#16a34a"/>' +
          '<text x="198" y="86" font-size="11" fill="#16a34a">v</text>' +
          '<text x="160" y="90" font-size="11">r</text>',
      ),
    },
    {
      title: 'Evaluate Larmor radiation power',
      formula: '$$P=\frac{q^2 a^2}{6\pi\epsilon_0 c^3}$$',
      body: 'For electron charge $q=1.602\times10^{-19}\,\text{C}$, numerator is $q^2a^2=(1.602\times10^{-19})^2(7.90\times10^{15})^2=1.60\times10^{-6}$. Denominator is $6\pi(8.854\times10^{-12})(3.00\times10^8)^3=4.50\times10^{15}$, so $P=1.60\times10^{-6}/4.50\times10^{15}=3.56\times10^{-22}\,\text{W}$.',
    },
    {
      title: 'Energy radiated per revolution and momentum scale',
      formula: '$$\Delta E=\frac{P}{f},\quad p_\gamma\sim\frac{\Delta E}{c}$$',
      body: 'Per cycle, $\Delta E=(3.56\times10^{-22})/(1.00\times10^8)=3.56\times10^{-30}\,\text{J}$. The associated photon-momentum scale is $p_\gamma\sim\Delta E/c=(3.56\times10^{-30})/(3.00\times10^8)=1.19\times10^{-38}\,\text{kg·m/s}$.',
      diagram: wrapPhysicsSvg(
        '<circle cx="120" cy="95" r="40" fill="none" stroke="#333" stroke-width="2"/>' +
          '<line x1="120" y1="55" x2="255" y2="35" stroke="#dc2626" stroke-width="2"/>' +
          '<line x1="120" y1="135" x2="255" y2="155" stroke="#dc2626" stroke-width="2"/>' +
          '<text x="260" y="36" font-size="11" fill="#dc2626">radiation</text>' +
          '<text x="260" y="157" font-size="11" fill="#dc2626">radiation</text>' +
          '<text x="96" y="100" font-size="11">q</text>',
      ),
      takeaway:
        'Larmor radiation is tiny for nonrelativistic electron motion but directly tied to acceleration squared.',
    },
  ],
  solution:
    '**Angular speed:** $\omega=6.283\times10^8\,\text{s}^{-1}$. **Acceleration:** $a=7.90\times10^{15}\,\text{m/s}^2$. **Larmor power:** $P=3.56\times10^{-22}\,\text{W}$. **Per-cycle energy:** $\Delta E=3.56\times10^{-30}\,\text{J}$.',
  verifiedPatterns: ['7.90', '3.56', '10^{-30}', '1.19'],
  minDiagramSteps: 2,
};
