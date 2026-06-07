import { wrapPhysicsSvg } from '../physics-svg';
import type { PhysicsQuestionDef } from './types';

export const Q36: PhysicsQuestionDef = {
  id: 'q36',
  number: 36,
  topic: 'FCC Reciprocal Lattice and Wave Vectors',
  question:
    'Physics crystal wave diffraction problem: for an FCC crystal with lattice constant a=0.361 nm, derive reciprocal primitive vectors, identify the reciprocal lattice type, and compute the reciprocal-wave magnitudes for (111) and (200) along with d-spacing and first-Brillouin-zone scale.',
  steps: [
    {
      title: 'Write FCC direct lattice vectors and reciprocal definition',
      formula:
        '$$\\mathbf a_1=\\frac{a}{2}(0,1,1),\\ \\mathbf a_2=\\frac{a}{2}(1,0,1),\\ \\mathbf a_3=\\frac{a}{2}(1,1,0),\\quad \\mathbf b_i=2\\pi\\frac{\\mathbf a_j\\times\\mathbf a_k}{\\mathbf a_1\\cdot(\\mathbf a_2\\times\\mathbf a_3)}$$',
      body: 'Using $a=0.361\\,\\text{nm}=3.61\\times10^{-10}\\,\\text{m}$ gives cell volume $V_c=\\mathbf a_1\\cdot(\\mathbf a_2\\times\\mathbf a_3)=a^3/4=1.18\\times10^{-29}\\,\\text{m}^3$. The reciprocal scale is $2\\pi/a=1.74\\times10^{10}\\,\\text{m}^{-1}=17.4\\,\\text{nm}^{-1}$.',
      diagram: wrapPhysicsSvg(
        '<rect x="45" y="35" width="95" height="95" fill="none" stroke="#1d4ed8" stroke-width="2"/>' +
          '<circle cx="45" cy="35" r="4" fill="#1d4ed8"/><circle cx="140" cy="35" r="4" fill="#1d4ed8"/><circle cx="45" cy="130" r="4" fill="#1d4ed8"/><circle cx="140" cy="130" r="4" fill="#1d4ed8"/>' +
          '<circle cx="92" cy="35" r="4" fill="#dc2626"/><circle cx="45" cy="82" r="4" fill="#dc2626"/><circle cx="140" cy="82" r="4" fill="#dc2626"/><circle cx="92" cy="130" r="4" fill="#dc2626"/>' +
          '<text x="55" y="150" font-size="11">direct FCC crystal</text>' +
          '<line x1="175" y1="35" x2="260" y2="35" stroke="#16a34a" stroke-width="2"/><line x1="175" y1="35" x2="217" y2="112" stroke="#16a34a" stroke-width="2"/><line x1="260" y1="35" x2="217" y2="112" stroke="#16a34a" stroke-width="2"/>' +
          '<circle cx="175" cy="35" r="4" fill="#16a34a"/><circle cx="260" cy="35" r="4" fill="#16a34a"/><circle cx="217" cy="112" r="4" fill="#16a34a"/>' +
          '<text x="182" y="150" font-size="11">reciprocal BCC motif</text>',
      ),
    },
    {
      title: 'Derive reciprocal primitive vectors and lattice type',
      formula:
        '$$\\mathbf b_1=\\frac{2\\pi}{a}(-1,1,1),\\quad \\mathbf b_2=\\frac{2\\pi}{a}(1,-1,1),\\quad \\mathbf b_3=\\frac{2\\pi}{a}(1,1,-1)$$',
      body: 'Each reciprocal primitive vector has magnitude $|\\mathbf b_1|=(2\\pi/a)\\sqrt{3}=(17.4)(1.732)=30.1\\,\\text{nm}^{-1}$. The reciprocal conventional cubic constant is $a^*=4\\pi/a=(4\\pi)/(0.361)=34.8\\,\\text{nm}^{-1}$, so the reciprocal crystal is BCC.',
    },
    {
      title: 'Compute reciprocal-wave magnitudes for selected planes',
      formula:
        '$$|\\mathbf G_{hkl}|=\\frac{2\\pi}{a}\\sqrt{h^2+k^2+l^2},\\quad d_{hkl}=\\frac{a}{\\sqrt{h^2+k^2+l^2}}$$',
      body: 'For $(111)$, $|\\mathbf G_{111}|=(17.4)\\sqrt{3}=30.1\\,\\text{nm}^{-1}$ and $d_{111}=0.361/\\sqrt{3}=0.208\\,\\text{nm}$. For $(200)$, $|\\mathbf G_{200}|=(17.4)(2)=34.8\\,\\text{nm}^{-1}$ and $d_{200}=0.361/2=0.1805\\,\\text{nm}$.',
      diagram: wrapPhysicsSvg(
        '<line x1="35" y1="145" x2="275" y2="145" stroke="#333" stroke-width="2"/>' +
          '<line x1="35" y1="145" x2="35" y2="25" stroke="#333" stroke-width="2"/>' +
          '<circle cx="90" cy="90" r="42" fill="none" stroke="#1d4ed8" stroke-width="2"/>' +
          '<line x1="90" y1="90" x2="132" y2="56" stroke="#dc2626" stroke-width="2"/>' +
          '<line x1="90" y1="90" x2="132" y2="90" stroke="#16a34a" stroke-width="2"/>' +
          '<text x="136" y="58" font-size="11" fill="#dc2626">|G111|=30.1</text>' +
          '<text x="136" y="93" font-size="11" fill="#16a34a">|G200|=34.8</text>' +
          '<text x="65" y="35" font-size="11">first Brillouin scale</text>',
      ),
    },
    {
      title: 'Connect reciprocal waves to diffraction condition',
      formula: '$$2d_{hkl}\\sin\\theta=\\lambda,\\qquad \\mathbf k_{out}-\\mathbf k_{in}=\\mathbf G$$',
      body: 'For an electron wave with $\\lambda=0.154\\,\\text{nm}$ and $d_{111}=0.208\\,\\text{nm}$, Bragg angle is $\\sin\\theta=\\lambda/(2d)=0.154/(0.416)=0.370$, so $\\theta=21.7^\\circ$. The diffraction wave-vector transfer equals $\\mathbf G_{111}$.',
      takeaway:
        'An FCC crystal has a BCC reciprocal lattice, and reciprocal-wave magnitudes set d-spacings and diffraction angles directly.',
    },
  ],
  solution:
    'For FCC $a=0.361\\,\\text{nm}$: reciprocal primitive vectors are $\\mathbf b_1=(2\\pi/a)(-1,1,1)$, $\\mathbf b_2=(2\\pi/a)(1,-1,1)$, $\\mathbf b_3=(2\\pi/a)(1,1,-1)$, so the reciprocal crystal is BCC with $a^*=4\\pi/a=34.8\\,\\text{nm}^{-1}$. Magnitudes: $|\\mathbf G_{111}|=30.1\\,\\text{nm}^{-1}$ and $|\\mathbf G_{200}|=34.8\\,\\text{nm}^{-1}$. Spacings: $d_{111}=0.208\\,\\text{nm}$ and $d_{200}=0.1805\\,\\text{nm}$.',
  verifiedPatterns: ['a^*=4\\pi/a=34.8', '|\\mathbf G_{111}|=30.1', 'd_{111}=0.208', '|\\mathbf G_{200}|=34.8'],
  minDiagramSteps: 2,
};
