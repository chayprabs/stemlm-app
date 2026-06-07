import { wrapPhysicsSvg } from '../physics-svg';
import type { PhysicsQuestionDef } from './types';

export const Q21: PhysicsQuestionDef = {
  id: 'q21',
  number: 21,
  topic: 'Hydrogen Atom Spectrum H-alpha Line',
  question:
    'Physics quantum hydrogen atom transition for the H-alpha line: use energy levels to find wavelength, photon frequency, photon energy, and photon momentum in a wave and field picture with energy and force-scale interpretation.',
  steps: [
    {
      title: 'Use hydrogen level formula for the n=3 to n=2 transition',
      formula:
        '$$\frac{1}{\lambda}=R_H\left(\frac{1}{2^2}-\frac{1}{3^2}\right)=R_H\left(\frac{5}{36}\right),\quad R_H=1.097\times10^7\,\text{m}^{-1}$$',
      body: 'Substituting numbers gives $1/\lambda=(1.097\times10^7)(5/36)=1.523\times10^6\,\text{m}^{-1}$, so $\lambda=1/(1.523\times10^6)=6.563\times10^{-7}\,\text{m}=656.3\,\text{nm}$.',
      diagram: wrapPhysicsSvg(
        '<line x1="45" y1="135" x2="260" y2="135" stroke="#333" stroke-width="2"/>' +
          '<line x1="45" y1="135" x2="45" y2="30" stroke="#333" stroke-width="2"/>' +
          '<line x1="95" y1="105" x2="230" y2="105" stroke="#1d4ed8" stroke-width="2"/>' +
          '<line x1="95" y1="70" x2="230" y2="70" stroke="#1d4ed8" stroke-width="2"/>' +
          '<path d="M 190 74 L 190 101" stroke="#dc2626" stroke-width="2.5"/>' +
          '<polygon points="190,101 184,92 196,92" fill="#dc2626"/>' +
          '<text x="235" y="108" font-size="11">n=2</text>' +
          '<text x="235" y="73" font-size="11">n=3</text>' +
          '<text x="198" y="88" font-size="11" fill="#dc2626">H-alpha</text>',
      ),
    },
    {
      title: 'Compute frequency and photon energy',
      formula: '$$f=\frac{c}{\lambda},\quad E=hf$$',
      body: 'Using $\lambda=6.563\times10^{-7}\,\text{m}$ gives $f=(3.00\times10^8)/(6.563\times10^{-7})=4.57\times10^{14}\,\text{Hz}$. Then $E=(6.626\times10^{-34})(4.57\times10^{14})=3.03\times10^{-19}\,\text{J}=1.89\,\text{eV}$.',
    },
    {
      title: 'Compute photon momentum from wave relation',
      formula: '$$p=\frac{h}{\lambda}$$',
      body: 'Numerically, $p=(6.626\times10^{-34})/(6.563\times10^{-7})=1.01\times10^{-27}\,\text{kg·m/s}$. The equivalent radiation force scale for full absorption over $\Delta t=1.0\,\text{ns}$ is $F=\Delta p/\Delta t=(1.01\times10^{-27})/(1.0\times10^{-9})=1.01\times10^{-18}\,\text{N}$.',
      diagram: wrapPhysicsSvg(
        '<line x1="30" y1="95" x2="270" y2="95" stroke="#333" stroke-width="2"/>' +
          '<path d="M 40 95 Q 60 70 80 95 Q 100 120 120 95 Q 140 70 160 95 Q 180 120 200 95" fill="none" stroke="#1d4ed8" stroke-width="2.5"/>' +
          '<line x1="210" y1="95" x2="260" y2="95" stroke="#dc2626" stroke-width="2.5"/>' +
          '<polygon points="260,95 248,89 248,101" fill="#dc2626"/>' +
          '<text x="62" y="62" font-size="11">\u03bb=656.3 nm</text>' +
          '<text x="214" y="84" font-size="11" fill="#dc2626">p=h/\u03bb</text>',
      ),
      takeaway:
        'The H-alpha spectral line corresponds to a red photon with well-defined wavelength, energy, and momentum from quantum hydrogen levels.',
    },
  ],
  solution:
    '**Rydberg step:** $\lambda=656.3\,\text{nm}$. **Frequency:** $f=4.57\times10^{14}\,\text{Hz}$. **Photon energy:** $E=3.03\times10^{-19}\,\text{J}=1.89\,\text{eV}$. **Photon momentum:** $p=1.01\times10^{-27}\,\text{kg·m/s}$.',
  verifiedPatterns: ['656.3', '4.57', '1.89', '1.01'],
  minDiagramSteps: 2,
};
