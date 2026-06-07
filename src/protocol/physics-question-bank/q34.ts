import { wrapPhysicsSvg } from '../physics-svg';
import type { PhysicsQuestionDef } from './types';

export const Q34: PhysicsQuestionDef = {
  id: 'q34',
  number: 34,
  topic: 'Ising Model Mean-Field Approximation',
  question:
    'Physics Ising mean-field magnetization in a magnetic field: find critical temperature, evaluate finite-temperature magnetization response, and connect energy and force-scale behavior in a spin-wave picture.',
  steps: [
    {
      title: 'Compute mean-field critical temperature',
      formula: '$$k_B T_c=zJ$$',
      body: 'With coordination $z=4$, coupling $J=1.20\times10^{-21}\,\text{J}$, and $k_B=1.38\times10^{-23}\,\text{J/K}$, $T_c=zJ/k_B=4(1.20\times10^{-21})/(1.38\times10^{-23})=3.48\times10^2\,\text{K}=348\,\text{K}$.',
      diagram: wrapPhysicsSvg(
        '<line x1="40" y1="140" x2="270" y2="140" stroke="#333" stroke-width="2"/>' +
          '<line x1="40" y1="140" x2="40" y2="25" stroke="#333" stroke-width="2"/>' +
          '<path d="M 55 128 Q 120 115 170 80 Q 215 50 255 38" fill="none" stroke="#1d4ed8" stroke-width="2.5"/>' +
          '<line x1="170" y1="30" x2="170" y2="140" stroke="#dc2626" stroke-width="2" stroke-dasharray="4 3"/>' +
          '<text x="173" y="28" font-size="11" fill="#dc2626">Tc</text>' +
          '<text x="16" y="30" font-size="11">m</text><text x="262" y="156" font-size="11">T</text>',
      ),
    },
    {
      title: 'Evaluate dimensionless coefficients at T=400 K',
      formula: '$$m=\tanh\!\left(\frac{zJm+\mu B}{k_B T}\right),\quad A=\frac{zJ}{k_B T},\quad h=\frac{\mu B}{k_B T}$$',
      body: 'For $T=400\,\text{K}$, $B=0.050\,\text{T}$, and $\mu=9.27\times10^{-24}\,\text{J/T}$: $A=4(1.20\times10^{-21})/[1.38\times10^{-23}(400)]=0.870$ and $h=(9.27\times10^{-24}\times0.050)/[1.38\times10^{-23}(400)]=8.39\times10^{-5}$, where $A$ is exchange strength and $h$ is reduced field.',
    },
    {
      title: 'Compute magnetization using linearized mean-field result',
      formula: '$$m\approx\frac{h}{1-A}$$',
      body: 'Because $A=0.870<1$, use linear response: $m\approx(8.39\times10^{-5})/(1-0.870)=6.45\times10^{-4}$, where $m$ is normalized magnetization. The corresponding magnetization energy per spin is $\mu B m=(9.27\times10^{-24})(0.050)(6.45\times10^{-4})=2.99\times10^{-28}\,\text{J}$.',
      diagram: wrapPhysicsSvg(
        '<rect x="55" y="45" width="190" height="95" fill="none" stroke="#333" stroke-width="2"/>' +
          '<line x1="90" y1="70" x2="90" y2="120" stroke="#1d4ed8" stroke-width="2.5"/>' +
          '<line x1="125" y1="70" x2="125" y2="120" stroke="#1d4ed8" stroke-width="2.5"/>' +
          '<line x1="160" y1="70" x2="160" y2="120" stroke="#1d4ed8" stroke-width="2.5"/>' +
          '<line x1="195" y1="70" x2="195" y2="120" stroke="#1d4ed8" stroke-width="2.5"/>' +
          '<text x="95" y="38" font-size="11">B field aligns spins weakly</text>',
      ),
      takeaway:
        'Mean-field theory predicts a critical temperature and a small linear magnetization response above $T_c$.',
    },
  ],
  solution:
    '**Critical temperature:** $T_c=348\,\text{K}$. **At $T=400\,\text{K}$:** $A=0.870$, $h=8.39\times10^{-5}$. **Magnetization:** $m\approx6.45\times10^{-4}$. **Per-spin field energy scale:** $2.99\times10^{-28}\,\text{J}$.',
  verifiedPatterns: ['348', 'A=0.870', '8.39', '6.45', '2.99'],
  minDiagramSteps: 2,
};
