import { wrapPhysicsSvg } from '../physics-svg';
import type { PhysicsQuestionDef } from './types';

export const Q42: PhysicsQuestionDef = {
  id: 'q42',
  number: 42,
  topic: 'Single-Slit Envelope with Diffraction Grating',
  question:
    'Physics wave diffraction-interference problem: monochromatic light with wavelength 500 nm passes through a grating of period d=40 um where each slit has width a=20 um, and the screen is at L=2.0 m. Find grating maxima positions, single-slit minima, and missing orders.',
  steps: [
    {
      title: 'Compute principal grating maxima',
      formula:
        '$$d\\sin\\theta_m=m\\lambda,\\quad \\sin\\theta_1=\\frac{500\\times10^{-9}}{40\\times10^{-6}}=0.0125$$',
      body: 'For $m=\\pm1$, $\\theta_1\\approx0.0125\\,\\text{rad}$ and screen position is $y_1=L\\tan\\theta_1\\approx2.0(0.0125)=0.0250\\,\\text{m}=2.50\\,\\text{cm}$.',
      diagram: wrapPhysicsSvg(
        '<rect x="55" y="35" width="12" height="110" fill="#64748b"/>' +
          '<rect x="61" y="52" width="4" height="14" fill="#f8fafc"/><rect x="61" y="82" width="4" height="14" fill="#f8fafc"/><rect x="61" y="112" width="4" height="14" fill="#f8fafc"/>' +
          '<line x1="67" y1="89" x2="255" y2="89" stroke="#1d4ed8" stroke-width="1.5"/>' +
          '<line x1="67" y1="89" x2="255" y2="56" stroke="#dc2626" stroke-width="1.5"/>' +
          '<line x1="67" y1="89" x2="255" y2="122" stroke="#dc2626" stroke-width="1.5"/>' +
          '<line x1="255" y1="30" x2="255" y2="150" stroke="#333" stroke-width="2"/>' +
          '<text x="260" y="60" font-size="11">m=+1</text><text x="260" y="92" font-size="11">m=0</text><text x="260" y="125" font-size="11">m=-1</text>',
      ),
    },
    {
      title: 'Find single-slit diffraction minima',
      formula:
        '$$a\\sin\\theta_p=p\\lambda,\\quad \\sin\\theta_{p=1}=\\frac{500\\times10^{-9}}{20\\times10^{-6}}=0.0250$$',
      body: 'For first envelope minimum, $\\theta_{p=1}\\approx0.0250\\,\\text{rad}$ and $y_{p=1}=L\\tan\\theta\\approx2.0(0.0250)=0.0500\\,\\text{m}=5.00\\,\\text{cm}$. The central diffraction envelope spans from $-5.00$ cm to $+5.00$ cm.',
    },
    {
      title: 'Determine missing grating orders',
      formula:
        '$$\\frac{m\\lambda}{d}=\\frac{p\\lambda}{a}\\Rightarrow m=p\\frac{d}{a}=p\\frac{40}{20}=2p$$',
      body: 'Even grating orders coincide with single-slit zeros: $m=\\pm2,\\pm4,\\dots$ are missing. For example, $m=2$ would be at $y\\approx2(2.50\\,\\text{cm})=5.00\\,\\text{cm}$, exactly the first envelope minimum.',
      diagram: wrapPhysicsSvg(
        '<line x1="35" y1="145" x2="270" y2="145" stroke="#333" stroke-width="2"/>' +
          '<line x1="35" y1="145" x2="35" y2="25" stroke="#333" stroke-width="2"/>' +
          '<path d="M 40 140 Q 100 88 150 40 Q 200 88 260 140" fill="none" stroke="#16a34a" stroke-width="2.5"/>' +
          '<line x1="150" y1="145" x2="150" y2="40" stroke="#1d4ed8" stroke-width="2"/>' +
          '<line x1="125" y1="145" x2="125" y2="70" stroke="#1d4ed8" stroke-width="2"/>' +
          '<line x1="175" y1="145" x2="175" y2="70" stroke="#1d4ed8" stroke-width="2"/>' +
          '<line x1="100" y1="145" x2="100" y2="95" stroke="#94a3b8" stroke-width="2"/>' +
          '<line x1="200" y1="145" x2="200" y2="95" stroke="#94a3b8" stroke-width="2"/>' +
          '<text x="92" y="90" font-size="10">m=+2 missing</text><text x="188" y="90" font-size="10">m=-2 missing</text>',
      ),
    },
    {
      title: 'Count bright orders inside central envelope',
      formula: '$$|m|<\\frac{d}{a}=2\\Rightarrow m=0,\\pm1\\ \\text{only}$$',
      body: 'Only three principal maxima survive inside the central envelope: $m=0$ at $y=0$ and $m=\\pm1$ at $y=\\pm2.50\\,\\text{cm}$. The next order $m=\\pm2$ is suppressed by the diffraction envelope.',
      takeaway:
        'The observed pattern is grating interference modulated by a single-slit diffraction envelope, which removes specific orders.',
    },
  ],
  solution:
    'With $\\lambda=500\\,\\text{nm}$, $d=40\\,\\mu\\text{m}$, $a=20\\,\\mu\\text{m}$, $L=2.0\\,\\text{m}$: grating first-order peaks are at $y=\\pm2.50\\,\\text{cm}$, first single-slit minima are at $y=\\pm5.00\\,\\text{cm}$, and missing orders satisfy $m=2p$ so even orders are absent.',
  verifiedPatterns: ['2.50\\,\\text{cm}', '5.00\\,\\text{cm}', 'm=2p', 'm=0,\\pm1'],
  minDiagramSteps: 2,
};
