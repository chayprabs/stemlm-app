import { wrapPhysicsSvg } from '../physics-svg';
import type { PhysicsQuestionDef } from './types';

export const Q32: PhysicsQuestionDef = {
  id: 'q32',
  number: 32,
  topic: 'Identical Particles in a 1D Infinite Well',
  question:
    'Physics quantum identical particles in a one-dimensional well: build symmetric and antisymmetric wave states, compare allowed energy occupancy for bosons and fermions, and compute total energy and momentum-level consequences.',
  steps: [
    {
      title: 'Compute single-particle base energy for L=1.0 nm',
      formula: '$$E_n=n^2E_1,\quad E_1=\frac{\pi^2\hbar^2}{2mL^2}$$',
      body: 'For electron mass and $L=1.0\times10^{-9}\,\text{m}$, $E_1=6.02\times10^{-20}\,\text{J}=0.376\,\text{eV}$. Then $E_2=4E_1=1.50\,\text{eV}$.',
      diagram: wrapPhysicsSvg(
        '<line x1="45" y1="140" x2="255" y2="140" stroke="#333" stroke-width="2"/>' +
          '<line x1="45" y1="140" x2="45" y2="30" stroke="#333" stroke-width="2"/>' +
          '<line x1="95" y1="120" x2="220" y2="120" stroke="#1d4ed8" stroke-width="2"/>' +
          '<line x1="95" y1="78" x2="220" y2="78" stroke="#dc2626" stroke-width="2"/>' +
          '<text x="225" y="123" font-size="11">n=1</text>' +
          '<text x="225" y="81" font-size="11">n=2</text>',
      ),
    },
    {
      title: 'Write symmetric and antisymmetric two-particle states',
      formula:
        '$$\Psi_\pm(x_1,x_2)=\frac{1}{\sqrt2}[\psi_a(x_1)\psi_b(x_2)\pm\psi_b(x_1)\psi_a(x_2)]$$',
      body: 'Normalization check is $(1/\sqrt2)^2+(1/\sqrt2)^2=1/2+1/2=1.0$. Bosons use $+$ symmetry; fermions use $-$ antisymmetry when spin state is symmetric.',
    },
    {
      title: 'Compare boson and fermion ground-state energies',
      formula: '$$E_{\text{boson}}=2E_1,\quad E_{\text{fermion}}=E_1+E_2$$',
      body: 'For two bosons both in $n=1$, $E_{\text{boson}}=2(0.376)=0.752\,\text{eV}$. For spin-polarized fermions, Pauli filling gives $E_{\text{fermion}}=0.376+1.50=1.88\,\text{eV}$. Energy difference is $1.88-0.752=1.13\,\text{eV}$.',
      diagram: wrapPhysicsSvg(
        '<line x1="40" y1="140" x2="270" y2="140" stroke="#333" stroke-width="2"/>' +
          '<line x1="40" y1="140" x2="40" y2="30" stroke="#333" stroke-width="2"/>' +
          '<rect x="80" y="110" width="30" height="30" fill="#1d4ed8"/>' +
          '<rect x="115" y="110" width="30" height="30" fill="#1d4ed8"/>' +
          '<rect x="180" y="110" width="30" height="30" fill="#dc2626"/>' +
          '<rect x="180" y="68" width="30" height="30" fill="#dc2626"/>' +
          '<text x="78" y="102" font-size="10">bosons</text>' +
          '<text x="176" y="102" font-size="10">fermions</text>',
      ),
      takeaway:
        'Exchange symmetry changes occupancy rules and therefore the many-particle ground energy in the same confining wave system.',
    },
  ],
  solution:
    '**Single-particle levels:** $E_1=0.376\,\text{eV}$ and $E_2=1.50\,\text{eV}$. **Symmetry states:** $\Psi_\pm=(1/\sqrt2)(ab\pm ba)$. **Totals:** bosons $2E_1=0.752\,\text{eV}$, spin-polarized fermions $E_1+E_2=1.88\,\text{eV}$.',
  verifiedPatterns: ['0.376', '0.752', '1.88', '1.13', '1/2+1/2=1.0'],
  minDiagramSteps: 2,
};
