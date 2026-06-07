import { wrapPhysicsSvg } from '../physics-svg';
import type { PhysicsQuestionDef } from './types';

export const Q29: PhysicsQuestionDef = {
  id: 'q29',
  number: 29,
  topic: 'Special Relativity Four-Vectors',
  question:
    'Physics relativity using energy-momentum four-vectors: for a moving particle compute gamma factor, four-momentum components, invariant norm, and transformed energy in another frame with field and force interpretation.',
  steps: [
    {
      title: 'Compute gamma, energy, and momentum components',
      formula: '$$\gamma=\frac{1}{\sqrt{1-\beta^2}},\quad E=\gamma mc^2,\quad p_x=\gamma m v$$',
      body: 'For $\beta=v/c=0.80$ and $mc^2=0.511\,\text{MeV}$, $\gamma=1/\sqrt{1-0.80^2}=1.667$. Energy is $E=1.667(0.511)=0.852\,\text{MeV}$. Momentum is $p_xc=\gamma\beta mc^2=1.667(0.80)(0.511)=0.681\,\text{MeV}$, so $p_x=0.681\,\text{MeV}/c$, where $\gamma$ is Lorentz factor and $\beta$ is speed ratio.',
      diagram: wrapPhysicsSvg(
        '<line x1="40" y1="140" x2="40" y2="30" stroke="#333" stroke-width="2"/>' +
          '<line x1="40" y1="140" x2="260" y2="140" stroke="#333" stroke-width="2"/>' +
          '<line x1="40" y1="140" x2="220" y2="50" stroke="#1d4ed8" stroke-width="2.5"/>' +
          '<text x="224" y="52" font-size="11">ct</text>' +
          '<text x="262" y="145" font-size="11">x</text>' +
          '<text x="148" y="86" font-size="11">worldline</text>',
      ),
    },
    {
      title: 'Verify invariant mass-shell condition',
      formula: '$$E^2-(pc)^2=(mc^2)^2$$',
      body: 'Numerically, $E^2-(pc)^2=(0.852)^2-(0.681)^2=0.726-0.464=0.262\,\text{MeV}^2$. Also $(mc^2)^2=(0.511)^2=0.261\,\text{MeV}^2$, matching within rounding, where $E$ is total energy and $p$ is relativistic momentum.',
    },
    {
      title: 'Transform energy to a frame moving at u=0.60c',
      formula: "$$E'=\\gamma_u(E-u p_x),\\quad \\gamma_u=\\frac{1}{\\sqrt{1-u^2/c^2}}$$",
      body: "With $u=0.60c$, $\\gamma_u=1/\\sqrt{1-0.60^2}=1.25$. Using $E=0.852\\,\\text{MeV}$ and $p_xc=0.681\\,\\text{MeV}$ gives $E'=1.25[0.852-0.60(0.681)]=1.25(0.443)=0.554\\,\\text{MeV}$, where $u$ is boost speed.",
      diagram: wrapPhysicsSvg(
        '<line x1="40" y1="140" x2="40" y2="30" stroke="#333" stroke-width="2"/>' +
          '<line x1="40" y1="140" x2="265" y2="140" stroke="#333" stroke-width="2"/>' +
          '<line x1="40" y1="140" x2="220" y2="55" stroke="#1d4ed8" stroke-width="2.5"/>' +
          '<line x1="40" y1="140" x2="190" y2="35" stroke="#dc2626" stroke-width="2" stroke-dasharray="4 3"/>' +
          '<text x="224" y="57" font-size="11" fill="#1d4ed8">ct</text>' +
          '<text x="193" y="33" font-size="11" fill="#dc2626">ct\'</text>' +
          '<text x="190" y="120" font-size="11">boost</text>',
      ),
      takeaway:
        'Four-vector invariants remain fixed across frames while individual energy and momentum components transform by Lorentz boosts.',
    },
  ],
  solution:
    "**Gamma:** $\\gamma=1.667$. **Lab-frame values:** $E=0.852\\,\\text{MeV}$ and $p_x=0.681\\,\\text{MeV}/c$. **Invariant:** $E^2-(pc)^2\\approx(mc^2)^2$. **Boosted energy (u=0.60c):** $E'=0.554\\,\\text{MeV}$.",
  verifiedPatterns: ['\\gamma=1.667', '0.852\\,\\text{MeV}', '0.681\\,\\text{MeV}/c', '0.554\\,\\text{MeV}'],
  minDiagramSteps: 2,
};
