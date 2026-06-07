import { wrapPhysicsSvg } from '../physics-svg';
import type { PhysicsQuestionDef } from './types';

export const Q41: PhysicsQuestionDef = {
  id: 'q41',
  number: 41,
  topic: 'Michelson and Fabry-Perot Interference',
  question:
    'Physics wave interference optics: for a Michelson interferometer with wavelength 632.8 nm and mirror displacement 0.40 um, find fringe shift; then for a Fabry-Perot cavity with length L=5.0 mm and mirror reflectivity R=0.85 compute FSR, finesse, and linewidth.',
  steps: [
    {
      title: 'Michelson fringe shift from mirror displacement',
      formula:
        '$$m=\\frac{2\\Delta x}{\\lambda}=\\frac{2(0.40\\times10^{-6})}{632.8\\times10^{-9}}=1.26\\ \\text{fringes}$$',
      body: 'Optical path changes by $2\\Delta x=0.80\\,\\mu\\text{m}$. Therefore the phase shift is $\\Delta\\phi=2\\pi m=2\\pi(1.26)=7.92\\,\\text{rad}$ and the observed shift is 1.26 bright/dark cycles.',
      diagram: wrapPhysicsSvg(
        '<rect x="138" y="68" width="24" height="24" fill="#e2e8f0" stroke="#333" stroke-width="2"/>' +
          '<line x1="40" y1="80" x2="138" y2="80" stroke="#1d4ed8" stroke-width="2"/>' +
          '<line x1="162" y1="80" x2="255" y2="50" stroke="#1d4ed8" stroke-width="2"/>' +
          '<line x1="162" y1="80" x2="255" y2="115" stroke="#dc2626" stroke-width="2"/>' +
          '<rect x="255" y="35" width="18" height="30" fill="#f8fafc" stroke="#333" stroke-width="2"/>' +
          '<rect x="255" y="100" width="18" height="30" fill="#f8fafc" stroke="#333" stroke-width="2"/>' +
          '<text x="30" y="73" font-size="11">laser</text>' +
          '<text x="205" y="40" font-size="11">M1</text><text x="205" y="145" font-size="11">M2</text>' +
          '<text x="172" y="160" font-size="11">delta x=0.40 um</text>',
      ),
    },
    {
      title: 'Fabry-Perot free spectral range',
      formula: '$$\\mathrm{FSR}=\\frac{c}{2L}=\\frac{3.00\\times10^8}{2(5.0\\times10^{-3})}=3.00\\times10^{10}\\,\\text{Hz}=30.0\\,\\text{GHz}$$',
      body: 'For cavity length $L=5.0\\,\\text{mm}$, adjacent longitudinal modes are separated by $30.0\\,\\text{GHz}$. Resonance order at 632.8 nm is $q=2L/\\lambda=2(5.0\\times10^{-3})/(632.8\\times10^{-9})=1.58\\times10^4$.',
    },
    {
      title: 'Compute finesse and linewidth',
      formula:
        '$$\\mathcal F=\\frac{\\pi\\sqrt{R}}{1-R}=\\frac{\\pi\\sqrt{0.85}}{0.15}=19.3,\\qquad \\delta\\nu=\\frac{\\mathrm{FSR}}{\\mathcal F}=\\frac{30.0\\,\\text{GHz}}{19.3}=1.55\\,\\text{GHz}$$',
      body: 'Numerically, $\\sqrt{0.85}=0.922$ and $\\mathcal F=19.3$. The resonance width is $\\delta\\nu=1.55\\,\\text{GHz}$, which is much smaller than FSR, so peaks are well resolved.',
      diagram: wrapPhysicsSvg(
        '<line x1="35" y1="145" x2="270" y2="145" stroke="#333" stroke-width="2"/>' +
          '<line x1="35" y1="145" x2="35" y2="25" stroke="#333" stroke-width="2"/>' +
          '<path d="M 45 135 Q 55 50 65 135 T 85 135 T 105 135 T 125 135 T 145 135 T 165 135 T 185 135 T 205 135 T 225 135 T 245 135" fill="none" stroke="#16a34a" stroke-width="2.3"/>' +
          '<line x1="85" y1="145" x2="85" y2="45" stroke="#dc2626" stroke-width="1.5" stroke-dasharray="4 3"/>' +
          '<line x1="105" y1="145" x2="105" y2="45" stroke="#dc2626" stroke-width="1.5" stroke-dasharray="4 3"/>' +
          '<text x="74" y="38" font-size="11">FSR</text>' +
          '<text x="112" y="62" font-size="11">linewidth</text>',
      ),
    },
    {
      title: 'Compare metrology sensitivity scales',
      formula: '$$\\Delta x_{1\\,\\text{fringe}}=\\frac{\\lambda}{2}=316.4\\,\\text{nm},\\qquad \\tau_c\\approx\\frac{1}{\\pi\\delta\\nu}=2.05\\times10^{-10}\\,\\text{s}$$',
      body: 'Michelson converts displacement to fringe count with $316.4\\,\\text{nm}$ per fringe. Fabry-Perot converts frequency to transmission peaks with coherence time $\\tau_c=1/(\\pi\\times1.55\\times10^9)=2.05\\times10^{-10}\\,\\text{s}$.',
      takeaway:
        'Michelson gives direct path-difference fringes, while Fabry-Perot provides high spectral resolution through cavity resonance.',
    },
  ],
  solution:
    'Michelson fringe shift is $m=2\\Delta x/\\lambda=1.26$ fringes for $\\Delta x=0.40\\,\\mu\\text{m}$ and $\\lambda=632.8\\,\\text{nm}$. For Fabry-Perot with $L=5.0\\,\\text{mm}$ and $R=0.85$: $\\mathrm{FSR}=30.0\\,\\text{GHz}$, finesse $\\mathcal F=19.3$, and linewidth $\\delta\\nu=1.55\\,\\text{GHz}$.',
  verifiedPatterns: ['1.26\\ \\text{fringes}', '30.0\\,\\text{GHz}', '\\mathcal F=19.3', '\\delta\\nu=1.55\\,\\text{GHz}'],
  minDiagramSteps: 2,
};
