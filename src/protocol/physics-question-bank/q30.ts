import { wrapPhysicsSvg } from '../physics-svg';
import type { PhysicsQuestionDef } from './types';

export const Q30: PhysicsQuestionDef = {
  id: 'q30',
  number: 30,
  topic: 'Clebsch-Gordan Coupling for j1=1 and j2=1/2',
  question:
    'Physics quantum angular momentum addition for j1=1 and j2=1/2: build coupled states, verify normalization and orthogonality coefficients, and extract probability weights relevant to momentum, wave, energy, and field coupling.',
  steps: [
    {
      title: 'List allowed total angular momenta and top state',
      formula: '$$J=\frac{3}{2},\frac{1}{2},\quad \left|\frac{3}{2},\frac{3}{2}\right\rangle=|1,1\rangle\left|\frac{1}{2},\frac{1}{2}\right\rangle$$',
      body: 'From addition rules, $J$ can be $1+1/2=3/2$ or $1-1/2=1/2$. For $M=3/2$ there is only one product basis state, so coefficient is $1.0=1/1$.',
      diagram: wrapPhysicsSvg(
        '<line x1="70" y1="35" x2="70" y2="145" stroke="#333" stroke-width="2"/>' +
          '<line x1="160" y1="35" x2="160" y2="145" stroke="#333" stroke-width="2"/>' +
          '<line x1="250" y1="35" x2="250" y2="145" stroke="#333" stroke-width="2"/>' +
          '<text x="50" y="28" font-size="11">m1</text>' +
          '<text x="145" y="28" font-size="11">m2</text>' +
          '<text x="240" y="28" font-size="11">M</text>' +
          '<text x="43" y="52" font-size="11">+1</text><text x="145" y="52" font-size="11">+1/2</text><text x="239" y="52" font-size="11">+3/2</text>' +
          '<text x="39" y="92" font-size="11">0</text><text x="145" y="92" font-size="11">+1/2</text><text x="239" y="92" font-size="11">+1/2</text>' +
          '<text x="39" y="132" font-size="11">+1</text><text x="145" y="132" font-size="11">-1/2</text><text x="239" y="132" font-size="11">+1/2</text>',
      ),
    },
    {
      title: 'Write the J=3/2, M=1/2 coupled state',
      formula:
        '$$\left|\frac{3}{2},\frac{1}{2}\right\rangle=\sqrt{\frac{2}{3}}|1,0\rangle\left|\frac{1}{2},\frac{1}{2}\right\rangle+\sqrt{\frac{1}{3}}|1,1\rangle\left|\frac{1}{2},-\frac{1}{2}\right\rangle$$',
      body: 'Normalization check: $(\sqrt{2/3})^2+(\sqrt{1/3})^2=2/3+1/3=1.000$. So probabilities in the two product states are $2/3=0.667$ and $1/3=0.333$.',
    },
    {
      title: 'Construct orthogonal J=1/2, M=1/2 state',
      formula:
        '$$\left|\frac{1}{2},\frac{1}{2}\right\rangle=\sqrt{\frac{1}{3}}|1,0\rangle\left|\frac{1}{2},\frac{1}{2}\right\rangle-\sqrt{\frac{2}{3}}|1,1\rangle\left|\frac{1}{2},-\frac{1}{2}\right\rangle$$',
      body: 'Orthogonality with the $J=3/2$ state gives $(\sqrt{2/3})(\sqrt{1/3})+(\sqrt{1/3})(-\sqrt{2/3})=0.471-0.471=0.000$. This confirms a distinct coupled multiplet.',
      diagram: wrapPhysicsSvg(
        '<rect x="55" y="45" width="190" height="95" fill="none" stroke="#333" stroke-width="2"/>' +
          '<text x="72" y="70" font-size="11">|3/2,1/2> : sqrt(2/3), sqrt(1/3)</text>' +
          '<text x="72" y="100" font-size="11">|1/2,1/2> : sqrt(1/3), -sqrt(2/3)</text>' +
          '<text x="72" y="130" font-size="11">dot product = 0</text>',
      ),
      takeaway:
        'Clebsch-Gordan coefficients encode how product basis amplitudes combine into normalized, orthogonal total-angular-momentum states.',
    },
  ],
  solution:
    '**Allowed totals:** $J=3/2,1/2$. **Key coefficient state:** $|3/2,1/2\rangle=\sqrt{2/3}|1,0\rangle|1/2,1/2\rangle+\sqrt{1/3}|1,1\rangle|1/2,-1/2\rangle$. **Orthogonal partner:** $|1/2,1/2\rangle=\sqrt{1/3}|1,0\rangle|1/2,1/2\rangle-\sqrt{2/3}|1,1\rangle|1/2,-1/2\rangle$. Probability weights are $2/3$ and $1/3$.',
  verifiedPatterns: ['J=3/2', '2/3=0.667', '1/3=0.333', '0.471-0.471=0.000'],
  minDiagramSteps: 2,
};
