import { wrapPhysicsSvg } from '../physics-svg';
import type { PhysicsQuestionDef } from './types';

export const Q43: PhysicsQuestionDef = {
  id: 'q43',
  number: 43,
  topic: 'Laser Three-Level versus Four-Level Operation',
  question:
    'Physics photon and energy analysis of laser gain media: compare a three-level and four-level laser at wavelength 632.8 nm, with threshold inversion Nth=2.0e16 cm^-3 and total active density N=5.0e18 cm^-3; compute photon energy, required excited fraction, and output power for slope efficiency 0.65 with pump 8 W and threshold pump 2 W.',
  steps: [
    {
      title: 'Photon energy for the lasing transition',
      formula:
        '$$E_\\gamma=\\frac{hc}{\\lambda}=\\frac{(6.626\\times10^{-34})(3.00\\times10^8)}{632.8\\times10^{-9}}=3.14\\times10^{-19}\\,\\text{J}=1.96\\,\\text{eV}$$',
      body: 'For $\\lambda=632.8\\,\\text{nm}$, each emitted photon carries $E_\\gamma=3.14\\times10^{-19}\\,\\text{J}$. The optical frequency is $f=c/\\lambda=4.74\\times10^{14}\\,\\text{Hz}$.',
      diagram: wrapPhysicsSvg(
        '<line x1="80" y1="135" x2="250" y2="135" stroke="#333" stroke-width="2"/>' +
          '<line x1="80" y1="105" x2="250" y2="105" stroke="#333" stroke-width="2"/>' +
          '<line x1="80" y1="75" x2="250" y2="75" stroke="#333" stroke-width="2"/>' +
          '<line x1="80" y1="45" x2="250" y2="45" stroke="#333" stroke-width="2"/>' +
          '<line x1="160" y1="47" x2="160" y2="72" stroke="#dc2626" stroke-width="2"/><polygon points="160,72 155,64 165,64" fill="#dc2626"/>' +
          '<line x1="200" y1="107" x2="200" y2="132" stroke="#16a34a" stroke-width="2"/><polygon points="200,132 195,124 205,124" fill="#16a34a"/>' +
          '<text x="42" y="49" font-size="11">E3</text><text x="42" y="79" font-size="11">E2</text><text x="42" y="109" font-size="11">E1</text><text x="42" y="139" font-size="11">E0</text>' +
          '<text x="165" y="67" font-size="11" fill="#dc2626">three-level laser</text><text x="205" y="127" font-size="11" fill="#16a34a">four-level laser</text>',
      ),
    },
    {
      title: 'Three-level threshold excited fraction',
      formula: '$$\\Delta N=N_2-N_1=N_{th},\\quad N_1\\approx N-N_2\\Rightarrow N_2=\\frac{N+N_{th}}{2}$$',
      body: 'With $N=5.0\\times10^{18}$ and $N_{th}=2.0\\times10^{16}\\,\\text{cm}^{-3}$: $N_2=(5.0\\times10^{18}+2.0\\times10^{16})/2=2.51\\times10^{18}\\,\\text{cm}^{-3}$. The required excited fraction is $N_2/N=2.51\\times10^{18}/5.0\\times10^{18}=0.502$ (50.2%).',
    },
    {
      title: 'Four-level threshold excited fraction',
      formula: '$$\\Delta N\\approx N_2-0=N_{th}\\Rightarrow N_2\\approx N_{th}=2.0\\times10^{16}\\,\\text{cm}^{-3}$$',
      body: 'The required fraction is $N_2/N=2.0\\times10^{16}/5.0\\times10^{18}=4.0\\times10^{-3}=0.40\\%$. Four-level operation therefore needs about $50.2/0.40=125.5$ times lower excited fraction than the three-level case.',
      diagram: wrapPhysicsSvg(
        '<line x1="40" y1="145" x2="270" y2="145" stroke="#333" stroke-width="2"/>' +
          '<line x1="40" y1="145" x2="40" y2="25" stroke="#333" stroke-width="2"/>' +
          '<rect x="90" y="45" width="55" height="100" fill="#dc2626"/>' +
          '<rect x="175" y="137" width="55" height="8" fill="#16a34a"/>' +
          '<text x="83" y="38" font-size="11">three-level 50.2%</text>' +
          '<text x="160" y="132" font-size="11">four-level 0.40%</text>',
      ),
    },
    {
      title: 'Output power from slope efficiency',
      formula: '$$P_{out}=\\eta_s(P_p-P_{th})=0.65(8-2)=3.90\\,\\text{W}$$',
      body: 'Useful optical power is $P_{out}=3.90\\,\\text{W}$. Photon rate is $\\dot N_\\gamma=P_{out}/E_\\gamma=3.90/(3.14\\times10^{-19})=1.24\\times10^{19}\\,\\text{s}^{-1}$.',
      takeaway:
        'Four-level lasers reach inversion far more easily, enabling lower threshold and stronger photon output for a given pump.',
    },
  ],
  solution:
    'At $632.8\\,\\text{nm}$, photon energy is $E_\\gamma=1.96\\,\\text{eV}$. For $N=5.0\\times10^{18}\\,\\text{cm}^{-3}$ and $N_{th}=2.0\\times10^{16}\\,\\text{cm}^{-3}$: three-level needs $N_2=2.51\\times10^{18}$ (50.2%), while four-level needs $N_2=2.0\\times10^{16}$ (0.40%). With $\\eta_s=0.65$, $P_p=8\\,\\text{W}$, $P_{th}=2\\,\\text{W}$, output is $P_{out}=3.90\\,\\text{W}$.',
  verifiedPatterns: ['E_\\gamma=1.96\\,\\text{eV}', '50.2%', '0.40%', 'P_{out}=3.90\\,\\text{W}', '1.24\\times10^{19}\\,\\text{s}^{-1}'],
  minDiagramSteps: 2,
};
