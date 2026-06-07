import { energyProfile, chemGraph, irSpectrum } from '../chem-svg';
import type { ChemistryQuestionDef } from './types';

export const Q20: ChemistryQuestionDef = {
  id: 'q20',
  number: 20,
  topic: 'Aromatic Chemistry',
  question:
    'Organic chemistry of aromatic compounds: (a) Explain electrophilic aromatic substitution nitration and halogenation of benzene with Lewis-acid catalyst reagents. (b) Quantify directing effects and Hammett correlations. (c) Compare alpha and beta substitution in naphthalene.',
  steps: [
    {
      title: 'Generation of nitronium electrophile for nitration',
      formula: '$$\\mathrm{HNO_3}+\\mathrm{H_2SO_4}\\rightarrow\\mathrm{NO_2^+}+\\mathrm{HSO_4^-}+\\mathrm{H_2O}$$',
      body: 'If $0.200\\,\\text{mol}$ HNO3 is used and nitronium formation is $85\\%$, then $n(\\mathrm{NO_2^+})=0.200\\times0.85=0.170\\,\\text{mol}$. The nitronium ion is the key electrophile that attacks the aromatic ring to form the sigma complex in nitration.',
      diagram: energyProfile({
        title: 'Benzene nitration (EAS) energy profile',
        hasIntermediate: true,
      }),
    },
    {
      title: 'Rate estimate for aromatic nitration',
      formula: '$$\\text{rate}=k[\\text{ArH}][\\mathrm{NO_2^+}]$$',
      body: 'With $k=1.2\\times10^{-3}\\,\\text{M}^{-1}\\text{s}^{-1}$, $[\\text{ArH}]=0.50\\,\\text{M}$, and $[\\mathrm{NO_2^+}]=0.020\\,\\text{M}$, the rate is $1.2\\times10^{-3}\\times0.50\\times0.020=1.2\\times10^{-5}\\,\\text{M s}^{-1}$. This emphasizes that nitration rate depends on both aromatic substrate and electrophile concentrations.',
      diagram: chemGraph({
        xLabel: 'reaction coordinate',
        yLabel: 'G',
        curves: [{ d: 'M 40 125 C 85 120 105 85 130 80 C 155 76 178 100 210 66 L 255 58', stroke: '#dc2626', label: 'nitration', labelPos: [180, 98] }],
        annotations:
          '<text x="74" y="30" font-size="9">sigma complex controls activation barrier</text>',
      }),
    },
    {
      title: 'Aromatic halogenation via Lewis-acid activation',
      formula: '$$\\text{rate}=k[\\text{ArH}][\\mathrm{Br_2}][\\mathrm{FeBr_3}]$$',
      body: 'For bromination with $k=2.0\\times10^{-2}\\,\\text{M}^{-2}\\text{s}^{-1}$, $[\\text{ArH}]=0.40\\,\\text{M}$, $[\\mathrm{Br_2}]=0.10\\,\\text{M}$, and $[\\mathrm{FeBr_3}]=0.050\\,\\text{M}$, rate becomes $2.0\\times10^{-2}\\times0.40\\times0.10\\times0.050=4.0\\times10^{-5}\\,\\text{M s}^{-1}$. FeBr3 polarizes Br2 to generate the effective electrophile for EAS halogenation.',
      diagram: energyProfile({
        title: 'Bromination of benzene (EAS)',
        hasIntermediate: true,
      }),
    },
    {
      title: 'Directing effects in substituted benzenes',
      formula: '$$\\text{selectivity ratio}=\\frac{\\text{ortho}+\\text{para}}{\\text{meta}}$$',
      body: 'Suppose nitration of toluene gives $58\\%$ ortho, $37\\%$ para, and $5\\%$ meta. Then the directing ratio is $(58+37)/5=19.0$, confirming ortho/para activation by an electron-donating methyl group. For nitrobenzene, meta substitution dominates because the nitro group deactivates ortho/para sigma-complex stabilization.',
      diagram: chemGraph({
        xLabel: 'substitution path',
        yLabel: 'relative barrier',
        points: [
          { x: 90, y: 78, label: 'ortho', fill: '#16a34a' },
          { x: 160, y: 72, label: 'para', fill: '#1d4ed8' },
          { x: 230, y: 112, label: 'meta', fill: '#dc2626' },
        ],
        annotations:
          '<text x="58" y="28" font-size="10">EDG: ortho/para favored; EWG: meta favored</text>',
      }),
    },
    {
      title: 'Hammett plot for substituent effects',
      formula: '$$\\log\\left(\\frac{k}{k_0}\\right)=\\rho\\sigma$$',
      body: 'Using two substituents: for p-NO2, let $\\sigma=+0.78$ and $\\log(k/k_0)=+1.17$; for p-OMe, $\\sigma=-0.27$ and $\\log(k/k_0)=-0.41$. The slope estimate is $\\rho=(1.17-(-0.41))/(0.78-(-0.27))=1.58/1.05=1.50$. Positive $\\rho$ indicates the reaction is accelerated by electron-withdrawing substituents in the rate-limiting step.',
      diagram: chemGraph({
        xLabel: 'sigma',
        yLabel: 'log(k/k0)',
        curves: [{ d: 'M 70 120 L 240 55', stroke: '#1d4ed8', label: 'rho ~ +1.5', labelPos: [170, 60] }],
        points: [
          { x: 88, y: 113, label: 'p-OMe', fill: '#16a34a' },
          { x: 212, y: 62, label: 'p-NO2', fill: '#dc2626' },
        ],
      }),
    },
    {
      title: 'Naphthalene substitution: alpha versus beta attack',
      formula: '$$\\frac{k_\\alpha}{k_\\beta}=e^{-\\Delta\\Delta G^\\ddagger/RT}$$',
      body: 'If alpha attack has lower activation free energy by $\\Delta\\Delta G^\\ddagger=-5.7\\,\\text{kJ mol}^{-1}$ at $298\\,\\text{K}$, then $k_\\alpha/k_\\beta=\\exp[5700/(8.314\\times298)]=9.97$. This predicts an alpha:beta product ratio near $10:1$, matching the known preference for alpha substitution in naphthalene EAS.',
      diagram: irSpectrum({
        title: 'Aromatic substitution markers',
        peaks: [
          { x: 110, label: '1600 C=C' },
          { x: 170, label: '1520 NO2 asym' },
          { x: 210, label: '1350 NO2 sym' },
        ],
      }),
      takeaway:
        'Aromatic EAS outcomes are controlled by electrophile strength, sigma-complex stability, substituent electronics, and transition-state energetics captured by Hammett and activation-free-energy analysis.',
    },
  ],
  solution:
    '**(a)** Nitration and halogenation both proceed through electrophilic aromatic substitution with sigma-complex intermediates. **(b)** Directing effects follow substituent electronics: donating groups favor ortho/para, withdrawing groups often favor meta; Hammett plots quantify this with $\\rho$. **(c)** In naphthalene, alpha substitution is usually faster because the corresponding sigma complex is better stabilized, giving a larger alpha product fraction.',
  verifiedPatterns: [
    'nitration',
    'halogenation',
    'electrophilic aromatic substitution',
    'nitronium',
    'ortho',
    'para',
    'meta',
    'Hammett',
    'rho',
    'naphthalene',
    'alpha',
    'beta',
  ],
  minDiagramSteps: 5,
};
