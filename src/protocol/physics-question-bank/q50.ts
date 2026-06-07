import { wrapPhysicsSvg } from '../physics-svg';
import type { PhysicsQuestionDef } from './types';

export const Q50: PhysicsQuestionDef = {
  id: 'q50',
  number: 50,
  topic: 'Blackbody Radiation: Planck and Stefan-Boltzmann',
  question:
    'Physics photon wave and energy radiation: for a blackbody at T=5800 K, compute Wien peak wavelength, Planck spectral radiance near 500 nm, total flux from Stefan-Boltzmann law, and luminosity for radius R=6.96e8 m.',
  steps: [
    {
      title: 'Find Wien peak wavelength and photon energy',
      formula:
        '$$\\lambda_{max}=\\frac{b}{T}=\\frac{2.898\\times10^{-3}}{5800}=4.996\\times10^{-7}\\,\\text{m}=500\\,\\text{nm}$$',
      body: 'Peak photon energy is $E_\\gamma=hc/\\lambda_{max}=(6.626\\times10^{-34})(3.00\\times10^8)/(4.996\\times10^{-7})=3.98\\times10^{-19}\\,\\text{J}=2.48\\,\\text{eV}$.',
      diagram: wrapPhysicsSvg(
        '<line x1="35" y1="145" x2="270" y2="145" stroke="#333" stroke-width="2"/>' +
          '<line x1="35" y1="145" x2="35" y2="25" stroke="#333" stroke-width="2"/>' +
          '<path d="M 40 140 Q 100 40 160 68 Q 220 92 265 126" fill="none" stroke="#dc2626" stroke-width="2.5"/>' +
          '<line x1="112" y1="145" x2="112" y2="55" stroke="#1d4ed8" stroke-width="1.5" stroke-dasharray="4 3"/>' +
          '<text x="90" y="50" font-size="11" fill="#1d4ed8">lambda_max=500 nm</text>',
      ),
    },
    {
      title: 'Evaluate Planck spectral radiance at 500 nm',
      formula:
        '$$B_\\lambda(T)=\\frac{2hc^2}{\\lambda^5}\\frac{1}{e^{hc/(\\lambda k_BT)}-1}$$',
      body: 'Here $B_\\lambda$ is spectral radiance, $\\lambda$ is wavelength, and $k_B$ is Boltzmann constant. At $\\lambda=500\\,\\text{nm}$ and $T=5800\\,\\text{K}$, exponent is $x=hc/(\\lambda k_BT)=4.96$. Numerator is $2hc^2/\\lambda^5=3.82\\times10^{15}\\,\\text{W·m}^{-3}\\text{sr}^{-1}$ and denominator is $e^{4.96}-1=142$, so $B_\\lambda=2.69\\times10^{13}\\,\\text{W·m}^{-3}\\text{sr}^{-1}$.',
    },
    {
      title: 'Compute total emitted flux (Stefan-Boltzmann)',
      formula: '$$j^*=\\sigma T^4=(5.670\\times10^{-8})(5800)^4=6.41\\times10^7\\,\\text{W/m}^2$$',
      body: 'Using $T^4=(5800)^4=1.13\\times10^{15}$ gives total radiative flux $j^*=6.41\\times10^7\\,\\text{W/m}^2$. This is the integrated blackbody energy flux over all wavelengths.',
      diagram: wrapPhysicsSvg(
        '<circle cx="100" cy="90" r="38" fill="#f59e0b" stroke="#b45309" stroke-width="2"/>' +
          '<line x1="138" y1="90" x2="240" y2="90" stroke="#dc2626" stroke-width="2"/><polygon points="240,90 230,85 230,95" fill="#dc2626"/>' +
          '<line x1="126" y1="65" x2="220" y2="40" stroke="#fb923c" stroke-width="2"/><polygon points="220,40 210,36 212,46" fill="#fb923c"/>' +
          '<line x1="126" y1="115" x2="220" y2="140" stroke="#f97316" stroke-width="2"/><polygon points="220,140 210,134 212,144" fill="#f97316"/>' +
          '<text x="150" y="83" font-size="11">j*=6.41e7 W/m^2</text>' +
          '<text x="66" y="145" font-size="11">blackbody surface</text>',
      ),
    },
    {
      title: 'Compute luminosity for radius 6.96e8 m',
      formula: '$$L=4\\pi R^2\\sigma T^4=4\\pi(6.96\\times10^8)^2(6.41\\times10^7)=3.90\\times10^{26}\\,\\text{W}$$',
      body: 'The emitting area is $4\\pi R^2=6.09\\times10^{18}\\,\\text{m}^2$. Multiplying by $j^*=6.41\\times10^7\\,\\text{W/m}^2$ gives $L=3.90\\times10^{26}\\,\\text{W}$.',
      takeaway:
        'Planck law sets spectral shape, Wien sets peak wavelength, and Stefan-Boltzmann gives total radiative power.',
    },
  ],
  solution:
    'At $T=5800\\,\\text{K}$: $\\lambda_{max}=4.996\\times10^{-7}\\,\\text{m}\\approx500\\,\\text{nm}$ and corresponding photon energy is $2.48\\,\\text{eV}$. Planck radiance at 500 nm is $B_\\lambda=2.69\\times10^{13}\\,\\text{W·m}^{-3}\\text{sr}^{-1}$. Stefan-Boltzmann flux is $j^*=6.41\\times10^7\\,\\text{W/m}^2$, and for $R=6.96\\times10^8\\,\\text{m}$ luminosity is $L=3.90\\times10^{26}\\,\\text{W}$.',
  verifiedPatterns: ['\\lambda_{max}=4.996\\times10^{-7}\\,\\text{m}', '2.48\\,\\text{eV}', 'B_\\lambda=2.69\\times10^{13}', 'j^*=6.41\\times10^7\\,\\text{W/m}^2', 'L=3.90\\times10^{26}\\,\\text{W}'],
  minDiagramSteps: 2,
};
