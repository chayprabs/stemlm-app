import { wrapPhysicsSvg } from '../physics-svg';
import type { PhysicsQuestionDef } from './types';

export const Q28: PhysicsQuestionDef = {
  id: 'q28',
  number: 28,
  topic: 'Retarded Potentials for an Oscillating Dipole',
  question:
    'Physics electromagnetic wave and field from an oscillating dipole using retarded potentials: compute retarded time, far-field amplitudes, magnetic field, and Poynting flux with energy and momentum transport.',
  steps: [
    {
      title: 'Compute retarded time delay and wave number',
      formula: '$$t_r=t-\frac{r}{c},\quad k=\frac{\omega}{c},\quad \omega=2\pi f$$',
      body: 'With $r=2.0\,\text{m}$ and $f=1.00\times10^9\,\text{Hz}$, delay is $r/c=2.0/(3.00\times10^8)=6.67\times10^{-9}\,\text{s}$. Angular frequency is $\omega=2\pi(1.00\times10^9)=6.283\times10^9\,\text{s}^{-1}$ and $k=\omega/c=20.94\,\text{m}^{-1}$.',
      diagram: wrapPhysicsSvg(
        '<line x1="40" y1="90" x2="260" y2="90" stroke="#333" stroke-width="2"/>' +
          '<line x1="80" y1="60" x2="80" y2="120" stroke="#dc2626" stroke-width="3"/>' +
          '<line x1="80" y1="90" x2="220" y2="90" stroke="#1d4ed8" stroke-width="2.5"/>' +
          '<polygon points="220,90 208,84 208,96" fill="#1d4ed8"/>' +
          '<text x="52" y="55" font-size="11">dipole p(t)</text>' +
          '<text x="150" y="78" font-size="11">r=2 m</text>' +
          '<text x="140" y="106" font-size="11">t_r=t-r/c</text>',
      ),
    },
    {
      title: 'Evaluate far-zone electric and magnetic amplitudes',
      formula:
        '$$E_\theta=\frac{k^2 p_0\sin\theta}{4\pi\epsilon_0 r}\cos(\omega t_r),\quad B_\phi=\frac{E_\theta}{c}$$',
      body: 'At $\theta=90^\circ$, with $p_0=1.00\times10^{-29}\,\text{C·m}$, electric amplitude is $E_0=(20.94)^2(1.00\times10^{-29})/[4\pi(8.854\times10^{-12})(2.0)]=1.97\times10^{-17}\,\text{V/m}$. Then $B_0=E_0/c=(1.97\times10^{-17})/(3.00\times10^8)=6.57\times10^{-26}\,\text{T}$.',
    },
    {
      title: 'Compute average Poynting flux at the observer point',
      formula: '$$\langle S\rangle=\frac{E_0^2}{2\mu_0 c}$$',
      body: 'Using $E_0=1.97\times10^{-17}\,\text{V/m}$ gives $E_0^2=3.88\times10^{-34}$. Then $\langle S\rangle=3.88\times10^{-34}/[2(1.257\times10^{-6})(3.00\times10^8)]=5.15\times10^{-37}\,\text{W/m}^2$.',
      diagram: wrapPhysicsSvg(
        '<line x1="40" y1="130" x2="260" y2="130" stroke="#333" stroke-width="2"/>' +
          '<line x1="150" y1="30" x2="150" y2="150" stroke="#333" stroke-width="2"/>' +
          '<line x1="150" y1="95" x2="235" y2="95" stroke="#1d4ed8" stroke-width="2.5"/>' +
          '<line x1="235" y1="95" x2="235" y2="45" stroke="#dc2626" stroke-width="2.5"/>' +
          '<line x1="150" y1="95" x2="200" y2="60" stroke="#16a34a" stroke-width="2"/>' +
          '<text x="238" y="100" font-size="11" fill="#1d4ed8">E\u03b8</text>' +
          '<text x="239" y="43" font-size="11" fill="#dc2626">B\u03c6</text>' +
          '<text x="202" y="58" font-size="11" fill="#16a34a">S</text>',
      ),
      takeaway:
        'Retarded potentials encode propagation delay and produce transverse fields carrying outward energy-momentum flux.',
    },
  ],
  solution:
    '**Delay:** $r/c=6.67\times10^{-9}\,\text{s}$. **Wave number:** $k=20.94\,\text{m}^{-1}$. **Field amplitudes at $\theta=90^\circ$:** $E_0=1.97\times10^{-17}\,\text{V/m}$ and $B_0=6.57\times10^{-26}\,\text{T}$. **Average flux:** $\langle S\rangle=5.15\times10^{-37}\,\text{W/m}^2$.',
  verifiedPatterns: ['6.67', '20.94', '1.97', '6.57', '5.15'],
  minDiagramSteps: 2,
};
