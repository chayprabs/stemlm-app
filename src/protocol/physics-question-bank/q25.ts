import { wrapPhysicsSvg } from '../physics-svg';
import type { PhysicsQuestionDef } from './types';

export const Q25: PhysicsQuestionDef = {
  id: 'q25',
  number: 25,
  topic: 'Canonical Ensemble for a Two-Level Quantum System',
  question:
    'Physics quantum canonical ensemble with two energy levels in a field interaction: compute partition function, state probabilities, mean energy, and heat-capacity scale for wave and momentum-based thermal physics.',
  steps: [
    {
      title: 'Compute inverse temperature and partition function',
      formula: '$$\beta=\frac{1}{k_B T},\quad Z=1+e^{-\beta\varepsilon}$$',
      body: 'Using $\varepsilon=0.12\,\text{eV}$ and $T=300\,\text{K}$ with $k_B=8.617\times10^{-5}\,\text{eV/K}$ gives $\beta=1/(8.617\times10^{-5}\times300)=38.68\,\text{eV}^{-1}$. Then $\beta\varepsilon=4.64$ and $Z=1+e^{-4.64}=1.0096$.',
      diagram: wrapPhysicsSvg(
        '<line x1="50" y1="140" x2="255" y2="140" stroke="#333" stroke-width="2"/>' +
          '<line x1="95" y1="120" x2="225" y2="120" stroke="#1d4ed8" stroke-width="2"/>' +
          '<line x1="95" y1="70" x2="225" y2="70" stroke="#dc2626" stroke-width="2"/>' +
          '<text x="228" y="123" font-size="11">E0=0</text>' +
          '<text x="228" y="73" font-size="11">E1=\u03b5</text>' +
          '<text x="108" y="58" font-size="11">\u03b5=0.12 eV</text>',
      ),
    },
    {
      title: 'Find occupancy probabilities',
      formula: '$$p_0=\frac{1}{Z},\quad p_1=\frac{e^{-\beta\varepsilon}}{Z}$$',
      body: 'Numerically $p_0=1/1.0096=0.9905$ and $p_1=e^{-4.64}/1.0096=0.0095$. The sum check is $p_0+p_1=0.9905+0.0095=1.0000$.',
    },
    {
      title: 'Compute mean energy and heat-capacity factor',
      formula: '$$\langle E\rangle=\varepsilon p_1,\quad C=k_B\frac{(\beta\varepsilon)^2e^{-\beta\varepsilon}}{(1+e^{-\beta\varepsilon})^2}$$',
      body: 'Mean energy is $\langle E\rangle=(0.12)(0.0095)=1.14\times10^{-3}\,\text{eV}=1.83\times10^{-22}\,\text{J}$. Heat capacity is $C=(8.617\times10^{-5})(4.64)^2\,e^{-4.64}/(1+e^{-4.64})^2=1.74\times10^{-5}\,\text{eV/K}=2.79\times10^{-24}\,\text{J/K}$.',
      diagram: wrapPhysicsSvg(
        '<line x1="40" y1="140" x2="270" y2="140" stroke="#333" stroke-width="2"/>' +
          '<line x1="40" y1="140" x2="40" y2="30" stroke="#333" stroke-width="2"/>' +
          '<path d="M 50 130 Q 110 90 150 95 Q 200 102 260 125" fill="none" stroke="#1d4ed8" stroke-width="2.5"/>' +
          '<text x="180" y="88" font-size="11">C(T)</text>' +
          '<text x="16" y="33" font-size="11">C</text><text x="264" y="156" font-size="11">T</text>',
      ),
      takeaway:
        'In a two-level canonical system, thermal occupation of the excited state directly controls both mean energy and heat capacity.',
    },
  ],
  solution:
    '**Inverse temperature:** $\beta=38.68\,\text{eV}^{-1}$. **Partition function:** $Z=1.0096$. **Probabilities:** $p_0=0.9905$, $p_1=0.0095$. **Mean energy:** $\langle E\rangle=1.14\times10^{-3}\,\text{eV}$. **Heat capacity:** $C=2.79\times10^{-24}\,\text{J/K}$.',
  verifiedPatterns: ['Z=1.0096', 'p_1=0.0095', '1.14', '2.79'],
  minDiagramSteps: 2,
};
