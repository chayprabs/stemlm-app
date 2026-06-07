import { wrapPhysicsSvg } from '../physics-svg';
import type { PhysicsQuestionDef } from './types';

export const Q18: PhysicsQuestionDef = {
  id: 'q18',
  number: 18,
  topic: 'Normal-Incidence Fresnel Coefficients',
  question:
    'Physics optics at normal incidence: an electromagnetic wave in air strikes a dielectric with relative permittivity εr=4 and μr≈1. Find refractive index n, Fresnel amplitude coefficients r and t for electric field, and power coefficients R and T. Use incident field amplitude Ei0=30 V/m.',
  steps: [
    {
      title: 'Find refractive index of dielectric',
      formula: '$$n_2=\\sqrt{\\epsilon_r\\mu_r}=\\sqrt{4\\cdot1}=2,\\quad n_1\\,(\\text{air})\\approx1$$',
      body: 'The medium has $n_2=2$. For air, $n_1\\approx1$. At normal incidence the wave speed drops by $v_2=c/n_2=c/2$.',
      diagram: wrapPhysicsSvg(
        '<line x1="150" y1="25" x2="150" y2="155" stroke="#333" stroke-width="2"/>' +
          '<rect x="150" y="25" width="130" height="130" fill="#dbeafe" opacity="0.6"/>' +
          '<line x1="35" y1="90" x2="145" y2="90" stroke="#1d4ed8" stroke-width="3"/>' +
          '<polygon points="145,90 133,84 133,96" fill="#1d4ed8"/>' +
          '<line x1="145" y1="90" x2="70" y2="55" stroke="#dc2626" stroke-width="2.5"/>' +
          '<polygon points="70,55 80,55 74,64" fill="#dc2626"/>' +
          '<line x1="155" y1="90" x2="260" y2="90" stroke="#16a34a" stroke-width="3"/>' +
          '<polygon points="260,90 248,84 248,96" fill="#16a34a"/>' +
          '<text x="55" y="78" font-size="11" fill="#1d4ed8">E_i</text>' +
          '<text x="78" y="50" font-size="11" fill="#dc2626">E_r</text>' +
          '<text x="225" y="78" font-size="11" fill="#16a34a">E_t</text>' +
          '<text x="48" y="145" font-size="11">air n=1</text>' +
          '<text x="178" y="145" font-size="11">dielectric n=2</text>',
      ),
    },
    {
      title: 'Compute Fresnel amplitude coefficients',
      formula:
        '$$r=\\frac{n_1-n_2}{n_1+n_2}=\\frac{1-2}{1+2}=-\\frac13,\\quad t=\\frac{2n_1}{n_1+n_2}=\\frac{2}{3}$$',
      body: 'With $E_{i0}=30\\,\\text{V/m}$, reflected amplitude is $E_{r0}=rE_{i0}=(-1/3)(30)=-10\\,\\text{V/m}$ and transmitted amplitude is $E_{t0}=tE_{i0}=(2/3)(30)=20\\,\\text{V/m}$.',
    },
    {
      title: 'Find reflected and transmitted power fractions',
      formula:
        '$$R=|r|^2=\\left(\\frac13\\right)^2=\\frac19=0.111,\\quad T=\\frac{n_2}{n_1}|t|^2=2\\left(\\frac{2}{3}\\right)^2=\\frac89=0.889$$',
      body: 'The interface reflects $11.1\\%$ of incident power and transmits $88.9\\%$. Energy conservation check: $R+T=0.111+0.889=1.000$.',
      diagram: wrapPhysicsSvg(
        '<line x1="40" y1="140" x2="270" y2="140" stroke="#333" stroke-width="2"/>' +
          '<line x1="40" y1="140" x2="40" y2="30" stroke="#333" stroke-width="2"/>' +
          '<rect x="75" y="128" width="50" height="12" fill="#dc2626"/>' +
          '<rect x="145" y="42" width="50" height="98" fill="#16a34a"/>' +
          '<text x="80" y="122" font-size="11">R=0.111</text>' +
          '<text x="150" y="36" font-size="11">T=0.889</text>' +
          '<text x="15" y="35" font-size="11">fraction</text>',
      ),
    },
    {
      title: 'Interpret phase and impedance mismatch',
      formula: '$$r<0\\Rightarrow \\text{reflected }E\\text{ has }\\pi\\text{ phase flip}$$',
      body: 'Because $n_1=1<n_2=2$, the reflected field is $E_{r0}=rE_{i0}=-10\\,\\text{V/m}$ (phase flip). Transmitted field $E_{t0}=20\\,\\text{V/m}$ keeps sign while $|t|=2/3$.',
      takeaway: 'At normal incidence, amplitude coefficients are simple ratios of refractive indices and power still satisfies $R+T=1$.',
    },
  ],
  solution:
    '**Index:** $n_2=2$. **Amplitude coefficients:** $r=-1/3$, $t=2/3$. For $E_{i0}=30\\,\\text{V/m}$: $E_{r0}=-10\\,\\text{V/m}$, $E_{t0}=20\\,\\text{V/m}$. **Power:** $R=1/9=0.111$, $T=8/9=0.889$ with $R+T=1$.',
  verifiedPatterns: ['n_2=2', '=-\\frac13', '\\frac{2}{3}', '\\frac19=0.111', '\\frac89=0.889', 'R+T=1'],
  minDiagramSteps: 2,
};
