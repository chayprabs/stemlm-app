import { wrapPhysicsSvg } from '../physics-svg';
import type { PhysicsQuestionDef } from './types';

export const Q49: PhysicsQuestionDef = {
  id: 'q49',
  number: 49,
  topic: 'Schwarzschild Geodesics and Photon Paths',
  question:
    'Physics relativity geodesics around a compact mass: for a non-rotating object of mass M=10 Msun, compute Schwarzschild radius, ISCO radius, orbital speed at ISCO, gravitational redshift at r=4rs, and weak-field photon deflection for impact parameter b=200 km.',
  steps: [
    {
      title: 'Compute Schwarzschild and characteristic radii',
      formula:
        '$$r_s=\\frac{2GM}{c^2}=2.95\\,\\text{km}\\times\\left(\\frac{M}{M_\\odot}\\right)=29.5\\,\\text{km},\\quad r_{ISCO}=6\\frac{GM}{c^2}=3r_s=88.6\\,\\text{km}$$',
      body: 'For $M=10M_\\odot$, Schwarzschild radius is $r_s=29.5\\,\\text{km}$. The photon sphere is at $r_{ph}=1.5r_s=44.3\\,\\text{km}$ and the innermost stable circular orbit is $r_{ISCO}=88.6\\,\\text{km}$.',
      diagram: wrapPhysicsSvg(
        '<circle cx="140" cy="90" r="26" fill="#111827" stroke="#334155" stroke-width="2"/>' +
          '<circle cx="140" cy="90" r="44" fill="none" stroke="#dc2626" stroke-width="2" stroke-dasharray="4 3"/>' +
          '<circle cx="140" cy="90" r="66" fill="none" stroke="#1d4ed8" stroke-width="2"/>' +
          '<text x="171" y="91" font-size="11" fill="#dc2626">1.5 rs</text>' +
          '<text x="207" y="91" font-size="11" fill="#1d4ed8">3 rs (ISCO)</text>' +
          '<text x="98" y="28" font-size="11">Schwarzschild geometry</text>',
      ),
    },
    {
      title: 'Find orbital speed near ISCO',
      formula: '$$v_{ISCO}\\approx\\sqrt{\\frac{GM}{r_{ISCO}}}=\\frac{c}{\\sqrt6}=0.408c=1.22\\times10^8\\,\\text{m/s}$$',
      body: 'Using $c=3.00\\times10^8\\,\\text{m/s}$ gives $v_{ISCO}=0.408c$. Numerically this is $1.22\\times10^8\\,\\text{m/s}$, showing strongly relativistic orbital motion.',
    },
    {
      title: 'Evaluate gravitational redshift at r=4rs',
      formula:
        '$$1+z=\\left(1-\\frac{r_s}{r}\\right)^{-1/2},\\qquad z=\\left(1-\\frac{1}{4}\\right)^{-1/2}-1=0.155$$',
      body: 'Here $z$ is the gravitational redshift factor. At emission radius $r=4r_s=118\\,\\text{km}$, observed photon frequency is reduced by factor $1/(1+z)=1/1.155=0.866$. So a $600\\,\\text{THz}$ emitted photon is seen as $519\\,\\text{THz}$.',
      diagram: wrapPhysicsSvg(
        '<circle cx="90" cy="90" r="24" fill="#111827"/>' +
          '<line x1="114" y1="90" x2="250" y2="90" stroke="#1d4ed8" stroke-width="2"/>' +
          '<polygon points="250,90 240,85 240,95" fill="#1d4ed8"/>' +
          '<text x="118" y="82" font-size="11">photon climbs out</text>' +
          '<text x="145" y="106" font-size="11">f_obs=0.866 f_emit</text>',
      ),
    },
    {
      title: 'Compute weak-field light deflection',
      formula:
        '$$\\alpha\\approx\\frac{4GM}{bc^2}=\\frac{4(GM/c^2)}{b}=\\frac{4(14.77\\,\\text{km})}{200\\,\\text{km}}=0.295\\,\\text{rad}=16.9^\\circ$$',
      body: 'Here $GM/c^2=r_s/2=14.77\\,\\text{km}$. For impact parameter $b=200\\,\\text{km}$, predicted bending is $\\alpha=0.295\\,\\text{rad}$, equivalent to $16.9^\\circ$.',
      takeaway:
        'Schwarzschild geodesics set orbital stability, redshift, and photon bending with scales determined by $r_s=2GM/c^2$.',
    },
  ],
  solution:
    'For $M=10M_\\odot$: $r_s=29.5\\,\\text{km}$, $r_{ISCO}=3r_s=88.6\\,\\text{km}$, and $r_{ph}=1.5r_s=44.3\\,\\text{km}$. Orbital speed at ISCO is about $0.408c$. At $r=4r_s$, gravitational redshift is $z=0.155$. Weak-field photon deflection at $b=200\\,\\text{km}$ is $\\alpha=0.295\\,\\text{rad}=16.9^\\circ$.',
  verifiedPatterns: ['r_s=29.5\\,\\text{km}', 'r_{ISCO}=88.6\\,\\text{km}', '0.408c', 'z=0.155', '\\alpha=0.295\\,\\text{rad}'],
  minDiagramSteps: 2,
};
