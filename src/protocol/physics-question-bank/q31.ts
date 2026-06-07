import { wrapPhysicsSvg } from '../physics-svg';
import type { PhysicsQuestionDef } from './types';

export const Q31: PhysicsQuestionDef = {
  id: 'q31',
  number: 31,
  topic: 'Variational Estimate for Hydrogen Ground State',
  question:
    'Physics quantum variational method for hydrogen: use a trial wavefunction to compute energy functional, optimize the variational parameter, and compare with exact binding energy using field, force, momentum, and wave reasoning.',
  steps: [
    {
      title: 'Write trial state and energy expectation',
      formula:
        '$$\psi(r)=\left(\frac{\alpha^3}{\pi}\right)^{1/2}e^{-\alpha r},\quad E(\alpha)=\frac{\hbar^2\alpha^2}{2m_e}-\frac{e^2\alpha}{4\pi\epsilon_0}$$',
      body: 'At $\alpha=1.60\times10^{10}\,\text{m}^{-1}$, kinetic term is $\hbar^2\alpha^2/(2m_e)=[(1.055\times10^{-34})^2(1.60\times10^{10})^2]/[2(9.11\times10^{-31})]=1.56\times10^{-18}\,\text{J}$. Coulomb term is $e^2\alpha/(4\pi\epsilon_0)=[(1.602\times10^{-19})^2(1.60\times10^{10})]/[4\pi(8.854\times10^{-12})]=3.69\times10^{-18}\,\text{J}$, so $E(\alpha)=-2.13\times10^{-18}\,\text{J}=-13.3\,\text{eV}$.',
      diagram: wrapPhysicsSvg(
        '<line x1="40" y1="140" x2="270" y2="140" stroke="#333" stroke-width="2"/>' +
          '<line x1="40" y1="140" x2="40" y2="25" stroke="#333" stroke-width="2"/>' +
          '<circle cx="55" cy="130" r="5" fill="#dc2626"/>' +
          '<path d="M 50 65 Q 95 95 140 110 Q 190 122 255 135" fill="none" stroke="#1d4ed8" stroke-width="2.5"/>' +
          '<line x1="55" y1="130" x2="90" y2="105" stroke="#64748b" stroke-width="1" stroke-dasharray="3 2"/>' +
          '<text x="58" y="58" font-size="11">|psi(r)|^2</text>' +
          '<text x="16" y="30" font-size="11">amp</text><text x="262" y="156" font-size="11">r</text>',
      ),
    },
    {
      title: 'Minimize with respect to variational parameter',
      formula: '$$\frac{dE}{d\alpha}=\frac{\hbar^2}{m_e}\alpha-\frac{e^2}{4\pi\epsilon_0}=0\Rightarrow \alpha_*=\frac{m_e e^2}{4\pi\epsilon_0\hbar^2}=\frac{1}{a_0}$$',
      body: 'Using $a_0=5.29\times10^{-11}\,\text{m}$ gives $\alpha_*=1/a_0=1/(5.29\times10^{-11})=1.89\times10^{10}\,\text{m}^{-1}$.',
    },
    {
      title: 'Evaluate minimum energy at the optimum',
      formula: '$$E_{\min}=E(\alpha_*)=-\frac{m_e e^4}{2(4\pi\epsilon_0)^2\hbar^2}=-13.6\,\text{eV}$$',
      body: 'Substituting $\alpha_*=1.89\times10^{10}\,\text{m}^{-1}$ into $E(\alpha)$ gives $E_{\min}=-2.18\times10^{-18}\,\text{J}=-13.6\,\text{eV}$. The trial value at $1.60\times10^{10}\,\text{m}^{-1}$ was $-13.3\,\text{eV}$, so optimization lowers energy by $0.3\,\text{eV}$.',
      diagram: wrapPhysicsSvg(
        '<line x1="40" y1="140" x2="270" y2="140" stroke="#333" stroke-width="2"/>' +
          '<line x1="40" y1="140" x2="40" y2="25" stroke="#333" stroke-width="2"/>' +
          '<path d="M 55 70 Q 130 35 205 82 Q 225 97 250 120" fill="none" stroke="#dc2626" stroke-width="2.5"/>' +
          '<circle cx="130" cy="35" r="4" fill="#1d4ed8"/>' +
          '<text x="136" y="32" font-size="11">Emin</text>' +
          '<text x="16" y="30" font-size="11">E</text><text x="252" y="156" font-size="11">\u03b1</text>',
      ),
      takeaway:
        'The variational principle gives an upper bound and recovers the hydrogen scale when the trial parameter matches $1/a_0$.',
    },
  ],
  solution:
    '**Trial functional:** $E(\alpha)=\hbar^2\alpha^2/(2m_e)-e^2\alpha/(4\pi\epsilon_0)$. **Optimum:** $\alpha_*=1/a_0=1.89\times10^{10}\,\text{m}^{-1}$. **Minimum energy:** $E_{\min}=-2.18\times10^{-18}\,\text{J}=-13.6\,\text{eV}$.',
  verifiedPatterns: ['1.89', '-13.6', '-2.18', '0.3'],
  minDiagramSteps: 2,
};
