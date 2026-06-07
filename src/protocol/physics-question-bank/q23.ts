import { wrapPhysicsSvg } from '../physics-svg';
import type { PhysicsQuestionDef } from './types';

export const Q23: PhysicsQuestionDef = {
  id: 'q23',
  number: 23,
  topic: 'Quantum Barrier Transmission',
  question:
    'Physics quantum tunneling through a rectangular barrier: for a particle wave with energy below barrier field height, compute decay constant, transmission probability, and transmitted energy flux interpretation using momentum and force scales.',
  steps: [
    {
      title: 'Set parameters and compute evanescent decay constant',
      formula: '$$\kappa=\frac{\sqrt{2m(U_0-E)}}{\hbar}$$',
      body: 'Using $m=9.11\times10^{-31}\,\text{kg}$, $U_0-E=0.30\,\text{eV}=4.81\times10^{-20}\,\text{J}$ gives $\kappa=\sqrt{2(9.11\times10^{-31})(4.81\times10^{-20})}/(1.055\times10^{-34})=2.81\times10^9\,\text{m}^{-1}$.',
      diagram: wrapPhysicsSvg(
        '<line x1="30" y1="135" x2="270" y2="135" stroke="#333" stroke-width="2"/>' +
          '<line x1="85" y1="135" x2="85" y2="65" stroke="#333" stroke-width="2"/>' +
          '<line x1="210" y1="135" x2="210" y2="65" stroke="#333" stroke-width="2"/>' +
          '<line x1="85" y1="65" x2="210" y2="65" stroke="#333" stroke-width="2"/>' +
          '<path d="M 35 105 Q 55 90 75 105" fill="none" stroke="#1d4ed8" stroke-width="2.5"/>' +
          '<path d="M 85 105 L 210 105" fill="none" stroke="#dc2626" stroke-width="2" stroke-dasharray="4 3"/>' +
          '<path d="M 215 105 Q 235 90 255 105" fill="none" stroke="#16a34a" stroke-width="2.5"/>' +
          '<text x="122" y="58" font-size="11">U0=0.50 eV</text>' +
          '<text x="130" y="121" font-size="11" fill="#dc2626">e^{-\u03ba x}</text>',
      ),
    },
    {
      title: 'Estimate transmission in thick-barrier limit',
      formula: '$$T\approx e^{-2\kappa a}$$',
      body: 'For $a=0.30\,\text{nm}=3.0\times10^{-10}\,\text{m}$, exponent is $2\kappa a=2(2.81\times10^9)(3.0\times10^{-10})=1.69$, so $T\approx e^{-1.69}=0.184$.',
    },
    {
      title: 'Compute reflected fraction and transmitted flux ratio',
      formula: '$$R\approx1-T,\quad \frac{J_\text{trans}}{J_\text{inc}}=T$$',
      body: 'Numerically $R=1-0.184=0.816$. If incident flux is $J_\text{inc}=5.0\times10^{24}\,\text{m}^{-2}\text{s}^{-1}$, then $J_\text{trans}=TJ_\text{inc}=0.184(5.0\times10^{24})=9.2\times10^{23}\,\text{m}^{-2}\text{s}^{-1}$.',
      diagram: wrapPhysicsSvg(
        '<line x1="40" y1="140" x2="260" y2="140" stroke="#333" stroke-width="2"/>' +
          '<line x1="40" y1="140" x2="40" y2="35" stroke="#333" stroke-width="2"/>' +
          '<rect x="80" y="121" width="45" height="19" fill="#dc2626"/>' +
          '<rect x="145" y="96" width="45" height="44" fill="#1d4ed8"/>' +
          '<text x="82" y="115" font-size="11">T=0.184</text>' +
          '<text x="147" y="90" font-size="11">R=0.816</text>' +
          '<text x="15" y="38" font-size="11">fraction</text>',
      ),
      takeaway:
        'Barrier transmission depends exponentially on width and energy gap, so small parameter changes can strongly alter quantum flux.',
    },
  ],
  solution:
    '**Decay constant:** $\kappa=2.81\times10^9\,\text{m}^{-1}$. **Transmission:** $T\approx e^{-2\kappa a}=0.184$. **Reflection:** $R\approx0.816$. For $J_\text{inc}=5.0\times10^{24}$, transmitted flux is $9.2\times10^{23}\,\text{m}^{-2}\text{s}^{-1}$.',
  verifiedPatterns: ['2.81', '0.184', '0.816', '9.2'],
  minDiagramSteps: 2,
};
