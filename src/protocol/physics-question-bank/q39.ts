import { wrapPhysicsSvg } from '../physics-svg';
import type { PhysicsQuestionDef } from './types';

export const Q39: PhysicsQuestionDef = {
  id: 'q39',
  number: 39,
  topic: 'Bethe-Weizsaecker Binding Energy of Fe-56',
  question:
    'Physics nuclear energy estimate: using the Bethe-Weizsaecker mass formula for the Fe-56 nucleus (A=56, Z=26), evaluate each term numerically and compute total binding energy and binding energy per nucleon.',
  steps: [
    {
      title: 'Set coefficients and geometric factors',
      formula:
        '$$B=a_vA-a_sA^{2/3}-a_c\\frac{Z(Z-1)}{A^{1/3}}-a_a\\frac{(A-2Z)^2}{A}+\\delta,\\quad \\delta=+\\frac{a_p}{A^{1/2}}\\ (\\text{even-even})$$',
      body: 'Use coefficients $a_v=15.8$, $a_s=18.3$, $a_c=0.714$, $a_a=23.2$, $a_p=12.0$ MeV. For $A=56$: $A^{1/3}=3.825$, $A^{2/3}=14.63$, and $A^{1/2}=7.483$.',
      diagram: wrapPhysicsSvg(
        '<circle cx="95" cy="92" r="45" fill="#dbeafe" stroke="#1d4ed8" stroke-width="2"/>' +
          '<circle cx="95" cy="92" r="18" fill="#bfdbfe" stroke="#1d4ed8" stroke-width="1.5"/>' +
          '<text x="72" y="28" font-size="11">Fe-56 nucleus</text>' +
          '<text x="58" y="96" font-size="11">Z=26</text>' +
          '<text x="58" y="112" font-size="11">N=30</text>' +
          '<rect x="165" y="40" width="110" height="90" fill="#f8fafc" stroke="#334155" stroke-width="1.5"/>' +
          '<text x="172" y="60" font-size="11">volume +</text><text x="172" y="78" font-size="11">surface -</text><text x="172" y="96" font-size="11">Coulomb -</text><text x="172" y="114" font-size="11">asymmetry -</text><text x="172" y="132" font-size="11">pairing +</text>',
      ),
    },
    {
      title: 'Compute each contribution in MeV',
      formula:
        '$$B_v=15.8\\times56=884.8,\\ B_s=18.3\\times14.63=267.7,\\ B_c=0.714\\times\\frac{26\\times25}{3.825}=121.3$$',
      body: 'The asymmetry term is $B_a=23.2\\times(56-52)^2/56=23.2\\times16/56=6.63\\,\\text{MeV}$. Pairing is $\\delta=+12/\\sqrt{56}=+1.60\\,\\text{MeV}$ because Fe-56 is even-even.',
    },
    {
      title: 'Assemble total binding energy',
      formula:
        '$$B=884.8-267.7-121.3-6.63+1.60=490.8\\,\\text{MeV},\\qquad \\frac{B}{A}=\\frac{490.8}{56}=8.76\\,\\text{MeV}$$',
      body: 'Total nuclear binding energy is $B=490.8\\,\\text{MeV}$. Per nucleon this gives $B/A=8.76\\,\\text{MeV}$, close to the peak nuclear-energy region around iron.',
      diagram: wrapPhysicsSvg(
        '<line x1="35" y1="145" x2="275" y2="145" stroke="#333" stroke-width="2"/>' +
          '<line x1="35" y1="145" x2="35" y2="25" stroke="#333" stroke-width="2"/>' +
          '<path d="M 40 130 Q 90 78 140 58 Q 180 45 220 52 Q 250 58 270 70" fill="none" stroke="#16a34a" stroke-width="2.5"/>' +
          '<circle cx="218" cy="52" r="4" fill="#dc2626"/>' +
          '<text x="223" y="48" font-size="11" fill="#dc2626">Fe-56, 8.76</text>' +
          '<text x="205" y="160" font-size="11">A</text>' +
          '<text x="8" y="30" font-size="11">B/A</text>',
      ),
    },
    {
      title: 'Convert to joules and mass defect scale',
      formula:
        '$$B_J=(490.8\\,\\text{MeV})(1.602\\times10^{-13}\\,\\text{J/MeV})=7.86\\times10^{-11}\\,\\text{J}$$',
      body: 'Equivalent mass defect is $\\Delta m=B_J/c^2=(7.86\\times10^{-11})/(9.00\\times10^{16})=8.73\\times10^{-28}\\,\\text{kg}$. This large binding energy explains the exceptional stability of Fe-56.',
      takeaway:
        'Bethe-Weizsaecker terms balance to place Fe-56 near maximal binding energy per nucleon.',
    },
  ],
  solution:
    'Using Bethe-Weizsaecker with $A=56$, $Z=26$: $B_v=884.8$, $B_s=267.7$, $B_c=121.3$, $B_a=6.63$, and $\\delta=+1.60$ MeV. Therefore $B=490.8\\,\\text{MeV}$ and $B/A=8.76\\,\\text{MeV}$ for Fe-56.',
  verifiedPatterns: ['B=490.8\\,\\text{MeV}', 'B/A=8.76\\,\\text{MeV}', 'B_c=121.3', '\\delta=+1.60'],
  minDiagramSteps: 2,
};
