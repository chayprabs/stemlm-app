import { wrapPhysicsSvg } from '../physics-svg';
import type { PhysicsQuestionDef } from './types';

export const Q24: PhysicsQuestionDef = {
  id: 'q24',
  number: 24,
  topic: 'Thermodynamic Potentials and Maxwell Relations',
  question:
    'Physics quantum energy and wave-field thermodynamic potentials with Maxwell relations: derive differential identities, evaluate derivative links for a gas model, and compute a finite change with force and momentum interpretation.',
  steps: [
    {
      title: 'Write a potential differential and identify conjugate pairs',
      formula: '$$dA=-S\,dT-P\,dV$$',
      body: 'For a sample state with $T=300\,\text{K}$ and $V=2.00\times10^{-2}\,\text{m}^3$, use $P(T,V)=nRT/V+\alpha T^2$ with $n=1$ and $\alpha=3.0\,\text{Pa/K}^2$: $P=(1\cdot8.314\cdot300)/(2.00\times10^{-2})+3.0(300)^2=3.95\times10^5\,\text{Pa}$.',
      diagram: wrapPhysicsSvg(
        '<rect x="55" y="40" width="190" height="100" fill="none" stroke="#333" stroke-width="2"/>' +
          '<line x1="150" y1="40" x2="150" y2="140" stroke="#94a3b8" stroke-width="1.5"/>' +
          '<line x1="55" y1="90" x2="245" y2="90" stroke="#94a3b8" stroke-width="1.5"/>' +
          '<text x="78" y="72" font-size="11">A(T,V)</text>' +
          '<text x="170" y="72" font-size="11">dA=-S dT</text>' +
          '<text x="165" y="108" font-size="11">-P dV</text>' +
          '<text x="80" y="108" font-size="11">energy map</text>',
      ),
    },
    {
      title: 'Apply a Maxwell relation from mixed derivatives',
      formula: '$$\left(\frac{\partial S}{\partial V}\right)_T=\left(\frac{\partial P}{\partial T}\right)_V$$',
      body: 'Differentiate the model pressure: $(\partial P/\partial T)_V=nR/V+2\alpha T=(8.314/2.00\times10^{-2})+2(3.0)(300)=415.7+1800=2215.7\,\text{Pa/K}$. Therefore $(\partial S/\partial V)_T=2215.7\,\text{J/(m}^3\text{K)}$.',
    },
    {
      title: 'Use another potential and second Maxwell relation',
      formula: '$$dG=-S\,dT+V\,dP,\quad \left(\frac{\partial V}{\partial T}\right)_P=-\left(\frac{\partial S}{\partial P}\right)_T$$',
      body: 'For ideal-gas behavior at $P=1.00\times10^5\,\text{Pa}$ and $n=1$, $(\partial V/\partial T)_P=nR/P=(8.314)/(1.00\times10^5)=8.31\times10^{-5}\,\text{m}^3/\text{K}$. So $(\partial S/\partial P)_T=-8.31\times10^{-5}\,\text{m}^3/\text{K}$.',
      diagram: wrapPhysicsSvg(
        '<line x1="40" y1="140" x2="270" y2="140" stroke="#333" stroke-width="2"/>' +
          '<line x1="40" y1="140" x2="40" y2="25" stroke="#333" stroke-width="2"/>' +
          '<path d="M 55 125 Q 120 95 210 60" fill="none" stroke="#1d4ed8" stroke-width="2.5"/>' +
          '<path d="M 55 120 Q 120 80 210 42" fill="none" stroke="#dc2626" stroke-width="2" stroke-dasharray="4 3"/>' +
          '<text x="210" y="58" font-size="11" fill="#1d4ed8">T=300K</text>' +
          '<text x="210" y="40" font-size="11" fill="#dc2626">T=360K</text>' +
          '<text x="18" y="30" font-size="11">P</text><text x="262" y="156" font-size="11">V</text>',
      ),
    },
    {
      title: 'Compute a finite change from the derivative',
      formula: '$$\Delta S\approx\left(\frac{\partial S}{\partial V}\right)_T\Delta V$$',
      body: 'At fixed $T=300\,\text{K}$ with $\Delta V=1.00\times10^{-3}\,\text{m}^3$, $\Delta S\approx(2215.7)(1.00\times10^{-3})=2.22\,\text{J/K}$. This gives a direct numeric energy-distribution change from the Maxwell relation.',
      takeaway:
        'Maxwell relations convert hard-to-measure derivatives into directly computable ones using potential differentials.',
    },
  ],
  solution:
    '**From $dA$:** $(\partial S/\partial V)_T=(\partial P/\partial T)_V$. With the given model this equals $2215.7\,\text{J/(m}^3\text{K)}$. **From $dG$:** $(\partial V/\partial T)_P=8.31\times10^{-5}\,\text{m}^3/\text{K}$ and $(\partial S/\partial P)_T=-8.31\times10^{-5}\,\text{m}^3/\text{K}$. **Finite change:** for $\Delta V=1.00\times10^{-3}\,\text{m}^3$, $\Delta S=2.22\,\text{J/K}$.',
  verifiedPatterns: ['2215.7', '8.31', '2.22'],
  minDiagramSteps: 2,
};
