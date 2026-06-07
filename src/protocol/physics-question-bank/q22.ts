import { wrapPhysicsSvg } from '../physics-svg';
import type { PhysicsQuestionDef } from './types';

export const Q22: PhysicsQuestionDef = {
  id: 'q22',
  number: 22,
  topic: 'First-Order Perturbation in Infinite Square Well',
  question:
    'Physics quantum particle in a 1D square well with perturbation field $V_1(x)=V_0 x/L$: find unperturbed energy, first-order energy shift, corrected ground energy, and compare to level spacing using wave and momentum language.',
  steps: [
    {
      title: 'Compute the unperturbed ground-state energy',
      formula: '$$E_1^{(0)}=\frac{\pi^2\hbar^2}{2mL^2}$$',
      body: 'For an electron with $L=1.0\times10^{-9}\,\text{m}$, $E_1^{(0)}=\pi^2(1.055\times10^{-34})^2/[2(9.11\times10^{-31})(1.0\times10^{-9})^2]=6.02\times10^{-20}\,\text{J}=0.376\,\text{eV}$.',
      diagram: wrapPhysicsSvg(
        '<line x1="55" y1="140" x2="55" y2="45" stroke="#333" stroke-width="3"/>' +
          '<line x1="225" y1="140" x2="225" y2="45" stroke="#333" stroke-width="3"/>' +
          '<line x1="55" y1="140" x2="225" y2="140" stroke="#333" stroke-width="2"/>' +
          '<line x1="55" y1="140" x2="225" y2="45" stroke="#dc2626" stroke-width="2"/>' +
          '<text x="230" y="50" font-size="11" fill="#dc2626">V1(x)=V0 x/L</text>' +
          '<text x="95" y="34" font-size="11">infinite well 0..L</text>' +
          '<text x="58" y="157" font-size="11">x=0</text><text x="210" y="157" font-size="11">x=L</text>',
      ),
    },
    {
      title: 'Evaluate first-order correction from expectation value',
      formula: '$$\Delta E_1^{(1)}=\langle 1|V_1|1\rangle=\frac{V_0}{2}$$',
      body: 'With $V_0=0.80\,\text{eV}$, the shift is $\Delta E_1^{(1)}=0.80/2=0.40\,\text{eV}=6.41\times10^{-20}\,\text{J}$.',
    },
    {
      title: 'Compute corrected energy and compare with spacing',
      formula: '$$E_1\approx E_1^{(0)}+\Delta E_1^{(1)},\quad \Delta_{21}^{(0)}=E_2^{(0)}-E_1^{(0)}=3E_1^{(0)}$$',
      body: 'The corrected ground energy is $E_1=0.376+0.40=0.776\,\text{eV}$. The unperturbed spacing is $\Delta_{21}^{(0)}=3(0.376)=1.13\,\text{eV}$, so $\Delta E_1^{(1)}/\Delta_{21}^{(0)}=0.40/1.13=0.355$.',
      diagram: wrapPhysicsSvg(
        '<line x1="40" y1="140" x2="265" y2="140" stroke="#333" stroke-width="2"/>' +
          '<line x1="40" y1="140" x2="40" y2="30" stroke="#333" stroke-width="2"/>' +
          '<line x1="90" y1="120" x2="210" y2="120" stroke="#1d4ed8" stroke-width="2"/>' +
          '<line x1="90" y1="70" x2="210" y2="70" stroke="#1d4ed8" stroke-width="2"/>' +
          '<line x1="90" y1="105" x2="210" y2="105" stroke="#dc2626" stroke-width="2" stroke-dasharray="4 3"/>' +
          '<text x="214" y="123" font-size="11">E1(0)</text>' +
          '<text x="214" y="108" font-size="11" fill="#dc2626">E1 corr</text>' +
          '<text x="214" y="73" font-size="11">E2(0)</text>',
      ),
      takeaway:
        'First-order perturbation shifts the level by the average perturbing potential while keeping the wave basis of the unperturbed well.',
    },
  ],
  solution:
    '**Unperturbed:** $E_1^{(0)}=0.376\,\text{eV}$. **First order shift:** $\Delta E_1^{(1)}=V_0/2=0.40\,\text{eV}$. **Corrected ground level:** $E_1\approx0.776\,\text{eV}$. **Perturbative ratio:** $0.40/1.13=0.355$.',
  verifiedPatterns: ['0.376', '0.40', '0.776', '0.355'],
  minDiagramSteps: 2,
};
