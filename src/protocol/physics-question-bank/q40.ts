import { wrapPhysicsSvg } from '../physics-svg';
import type { PhysicsQuestionDef } from './types';

export const Q40: PhysicsQuestionDef = {
  id: 'q40',
  number: 40,
  topic: 'Radioactive Decay Chain Dynamics',
  question:
    'Physics nuclear decay and photon activity: in a chain A -> B -> C (stable), let N_A(0)=1.00e6, t1/2,A=2.0 h, and t1/2,B=6.0 h. Compute populations at t=5.0 h and compare the two decay activities.',
  steps: [
    {
      title: 'Convert half-lives to decay constants',
      formula:
        '$$\\lambda_A=\\frac{\\ln2}{2.0\\,\\text{h}}=0.3466\\,\\text{h}^{-1},\\qquad \\lambda_B=\\frac{\\ln2}{6.0\\,\\text{h}}=0.1155\\,\\text{h}^{-1}$$',
      body: 'With $N_A(0)=1.00\\times10^6$, the parent population at $t=5.0\\,\\text{h}$ is $N_A=1.00\\times10^6e^{-0.3466\\times5.0}=1.77\\times10^5$.',
      diagram: wrapPhysicsSvg(
        '<rect x="40" y="55" width="65" height="40" fill="#dbeafe" stroke="#1d4ed8" stroke-width="2"/>' +
          '<rect x="130" y="55" width="65" height="40" fill="#fee2e2" stroke="#dc2626" stroke-width="2"/>' +
          '<rect x="220" y="55" width="50" height="40" fill="#dcfce7" stroke="#16a34a" stroke-width="2"/>' +
          '<line x1="105" y1="75" x2="130" y2="75" stroke="#333" stroke-width="2"/><polygon points="130,75 122,70 122,80" fill="#333"/>' +
          '<line x1="195" y1="75" x2="220" y2="75" stroke="#333" stroke-width="2"/><polygon points="220,75 212,70 212,80" fill="#333"/>' +
          '<text x="62" y="80" font-size="11">A</text><text x="152" y="80" font-size="11">B</text><text x="238" y="80" font-size="11">C</text>' +
          '<text x="50" y="115" font-size="11">lambda_A=0.3466 h^-1</text><text x="140" y="130" font-size="11">lambda_B=0.1155 h^-1</text>',
      ),
    },
    {
      title: 'Use Bateman solution for daughter isotope',
      formula:
        '$$N_B(t)=N_{A0}\\frac{\\lambda_A}{\\lambda_B-\\lambda_A}\\left(e^{-\\lambda_A t}-e^{-\\lambda_B t}\\right)$$',
      body: 'At $t=5.0\\,\\text{h}$: $N_B=1.00\\times10^6\\times\\frac{0.3466}{0.1155-0.3466}(e^{-1.733}-e^{-0.577})=5.77\\times10^5$. The stable product is $N_C=1.00\\times10^6-1.77\\times10^5-5.77\\times10^5=2.46\\times10^5$.',
    },
    {
      title: 'Compute activities and compare',
      formula: '$$A_i=\\lambda_iN_i,\\qquad A_A=0.3466(1.77\\times10^5),\\quad A_B=0.1155(5.77\\times10^5)$$',
      body: 'Numerically, $A_A=6.13\\times10^4\\,\\text{h}^{-1}=17.0\\,\\text{Bq}$ and $A_B=6.66\\times10^4\\,\\text{h}^{-1}=18.5\\,\\text{Bq}$. The daughter activity is slightly larger at 5 h, so gamma-photon emission is dominated by B.',
      diagram: wrapPhysicsSvg(
        '<line x1="40" y1="145" x2="270" y2="145" stroke="#333" stroke-width="2"/>' +
          '<line x1="40" y1="145" x2="40" y2="30" stroke="#333" stroke-width="2"/>' +
          '<rect x="95" y="95" width="45" height="50" fill="#1d4ed8"/>' +
          '<rect x="165" y="90" width="45" height="55" fill="#dc2626"/>' +
          '<text x="94" y="88" font-size="11">A=17.0 Bq</text>' +
          '<text x="160" y="83" font-size="11">B=18.5 Bq</text>' +
          '<text x="108" y="160" font-size="11">A</text><text x="178" y="160" font-size="11">B</text>',
      ),
    },
    {
      title: 'Check total population conservation',
      formula: '$$N_A+N_B+N_C=1.77\\times10^5+5.77\\times10^5+2.46\\times10^5=1.00\\times10^6$$',
      body: 'The sum equals the initial total exactly, confirming the decay-chain algebra. Numerically, $1.77+5.77+2.46=10.00$ in units of $10^5$ nuclei.',
      takeaway:
        'Decay chains can show transient daughter dominance in activity even when the daughter has a longer half-life.',
    },
  ],
  solution:
    'For $t=5.0\\,\\text{h}$: $N_A=1.77\\times10^5$, $N_B=5.77\\times10^5$, and $N_C=2.46\\times10^5$. Activities are $A_A=17.0\\,\\text{Bq}$ and $A_B=18.5\\,\\text{Bq}$, so daughter isotope B is slightly more active at that time.',
  verifiedPatterns: ['N_A=1.77\\times10^5', 'N_B=5.77\\times10^5', 'N_C=2.46\\times10^5', 'A_A=17.0\\,\\text{Bq}', 'A_B=18.5\\,\\text{Bq}'],
  minDiagramSteps: 2,
};
