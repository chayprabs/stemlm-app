import { physicsGraph, wrapPhysicsSvg } from '../physics-svg';
import type { PhysicsQuestionDef } from './types';

export const Q26: PhysicsQuestionDef = {
  id: 'q26',
  number: 26,
  topic: 'Fermi-Dirac and Bose-Einstein Occupation Comparison',
  question:
    'Physics quantum statistics in an energy field: compare Fermi-Dirac and Bose-Einstein occupation numbers at the same energy and momentum state, and show the classical wave-limit approximation.',
  steps: [
    {
      title: 'Compute reduced energy and both occupation functions',
      formula:
        '$$x=\frac{\varepsilon-\mu}{k_B T},\quad f_{FD}=\frac{1}{e^x+1},\quad f_{BE}=\frac{1}{e^x-1}$$',
      body: 'With $\varepsilon=0.20\,\text{eV}$, $\mu=0.10\,\text{eV}$, and $T=300\,\text{K}$, $x=(0.20-0.10)/(8.617\times10^{-5}\times300)=3.87$. Then $f_{FD}=1/(e^{3.87}+1)=0.0204$ and $f_{BE}=1/(e^{3.87}-1)=0.0213$.',
      diagram: physicsGraph({
        points: [
          { x: 110, y: 120, label: 'FD 0.0204' },
          { x: 185, y: 115, label: 'BE 0.0213' },
        ],
        xLabel: 'distribution',
        yLabel: 'occupation',
      }),
    },
    {
      title: 'Compute Maxwell-Boltzmann approximation at same x',
      formula: '$$f_{MB}=e^{-x}$$',
      body: 'Using $x=3.87$ gives $f_{MB}=e^{-3.87}=0.0209$. Deviations are $|f_{FD}-f_{MB}|=|0.0204-0.0209|=5.0\times10^{-4}$ and $|f_{BE}-f_{MB}|=|0.0213-0.0209|=4.0\times10^{-4}$.',
    },
    {
      title: 'Quantify fractional difference between quantum distributions',
      formula: '$$\delta=\frac{f_{BE}-f_{FD}}{f_{MB}}$$',
      body: 'Numerically $\delta=(0.0213-0.0204)/0.0209=0.0009/0.0209=0.043$, so the Bose and Fermi occupations differ by about $4.3\%$ at this state.',
      diagram: wrapPhysicsSvg(
        '<line x1="40" y1="140" x2="270" y2="140" stroke="#333" stroke-width="2"/>' +
          '<line x1="40" y1="140" x2="40" y2="30" stroke="#333" stroke-width="2"/>' +
          '<rect x="80" y="106" width="40" height="34" fill="#1d4ed8"/>' +
          '<rect x="140" y="104" width="40" height="36" fill="#dc2626"/>' +
          '<rect x="200" y="105" width="40" height="35" fill="#16a34a"/>' +
          '<text x="80" y="100" font-size="10">FD</text>' +
          '<text x="140" y="98" font-size="10">BE</text>' +
          '<text x="198" y="99" font-size="10">MB</text>',
      ),
      takeaway:
        'For $x\gg1$, both quantum distributions approach the classical exponential form, while retaining opposite-sign corrections.',
    },
  ],
  solution:
    '**Reduced energy:** $x=3.87$. **Occupations:** $f_{FD}=0.0204$, $f_{BE}=0.0213$. **Classical limit:** $f_{MB}=0.0209$. **Relative difference:** $(f_{BE}-f_{FD})/f_{MB}=0.043$.',
  verifiedPatterns: ['x=3.87', 'f_{FD}=0.0204', 'f_{BE}=0.0213', 'f_{MB}=0.0209', '0.043'],
  minDiagramSteps: 2,
};
