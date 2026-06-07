import { energyProfile, newmanProjection, chemGraph } from '../chem-svg';
import type { ChemistryQuestionDef } from './types';

export const Q10: ChemistryQuestionDef = {
  id: 'q10',
  number: 10,
  topic: 'Elimination Mechanisms (E1, E2, and E1cb)',
  question:
    'Elimination mechanisms: (a) Compare E1 and E2 pathways for 2-bromo-2-methylbutane under different conditions. (b) Use a Newman projection to show anti-periplanar geometry for E2. (c) Explain an E1cb pathway for 2-fluoroacetaldehyde.',
  steps: [
    {
      title: 'E1 vs E2 competition for 2-bromo-2-methylbutane',
      formula:
        '$$\\text{rate}_{E2}=k_{E2}[\\text{RX}][\\text{Base}],\\quad \\text{rate}_{E1}=k_{E1}[\\text{RX}]$$',
      body: 'With $[\\text{RX}]=0.10\\,\\text{M}$ and strong base $[\\text{Base}]=0.50\\,\\text{M}$, if $k_{E2}=2.2\\times10^{-3}\\,\\text{M}^{-1}\\text{s}^{-1}$ then $\\text{rate}_{E2}=2.2\\times10^{-3}\\times0.10\\times0.50=1.1\\times10^{-4}\\,\\text{M s}^{-1}$. If the solvent also allows $k_{E1}=1.1\\times10^{-4}\\,\\text{s}^{-1}$, then $\\text{rate}_{E1}=1.1\\times10^{-4}\\times0.10=1.1\\times10^{-5}\\,\\text{M s}^{-1}$, so E2 is 10 times faster under strong-base conditions.',
      diagram: chemGraph({
        xLabel: 'reaction coordinate',
        yLabel: 'G',
        curves: [
          { d: 'M 40 125 C 90 120 125 75 165 60 L 255 58', stroke: '#1d4ed8', label: 'E2 (strong base)', labelPos: [172, 52] },
          { d: 'M 40 125 C 75 120 95 90 125 84 C 155 78 180 102 210 66 L 255 58', stroke: '#dc2626', label: 'E1 (protic)', labelPos: [175, 95] },
        ],
      }),
    },
    {
      title: 'Concerted E2 dehydrohalogenation mechanism',
      formula: '$$\\text{rate}_{E2}=k[\\text{2-bromo-2-methylbutane}][\\text{EtO}^-]$$',
      body: 'For $[\\text{2-bromo-2-methylbutane}]=0.080\\,\\text{M}$, $[\\text{EtO}^-]=0.40\\,\\text{M}$, and $k=2.5\\times10^{-3}\\,\\text{M}^{-1}\\text{s}^{-1}$, the E2 rate is $2.5\\times10^{-3}\\times0.080\\times0.40=8.0\\times10^{-5}\\,\\text{M s}^{-1}$. The base removes a $\\beta$-H as Br leaves in one step, forming mainly 2-methyl-2-butene (Zaitsev product).',
      diagram: energyProfile({
        title: 'E2: one-step elimination from tertiary bromide',
      }),
    },
    {
      title: 'Anti-periplanar requirement shown by Newman projection',
      formula:
        '$$\\frac{N_{anti}}{N_{gauche}}=e^{-\\Delta G/RT}$$',
      body: 'E2 is fastest when the abstracted $\\beta$-H and C-Br bond are anti-periplanar (dihedral angle near $180^\\circ$). If the anti conformer is lower by $\\Delta G=0.9\\,\\text{kJ mol}^{-1}$ at $298\\,\\text{K}$, then $N_{anti}/N_{gauche}=\\exp[900/(8.314\\times298)]\\approx1.44$, so the anti population is $1.44/(1+1.44)=0.59$ or about $59\\%$.',
      diagram: newmanProjection({
        conformation: 'Anti-periplanar β-H and C-Br alignment for E2',
        energy: 'dihedral ≈ 180°',
      }),
    },
    {
      title: 'E1 elimination path under weak-base solvolysis',
      formula:
        '$$\\text{rate}_{E1}=k[\\text{RX}],\\quad t_{1/2}=\\frac{0.693}{k}$$',
      body: 'In polar protic solvent with weak base, tertiary bromide can ionize first to a carbocation, then lose $\\beta$-H. With $k=1.1\\times10^{-4}\\,\\text{s}^{-1}$ and $[\\text{RX}]=0.10\\,\\text{M}$, $\\text{rate}=1.1\\times10^{-5}\\,\\text{M s}^{-1}$ and $t_{1/2}=0.693/(1.1\\times10^{-4})=6.3\\times10^3\\,\\text{s}=1.75\\,\\text{h}$.',
      diagram: energyProfile({
        title: 'E1 elimination of 2-bromo-2-methylbutane',
        hasIntermediate: true,
      }),
    },
    {
      title: 'Alkene distribution from E1/E2: Zaitsev major product',
      formula:
        '$$K=\\frac{[\\text{2-methyl-2-butene}]}{[\\text{2-methyl-1-butene}]}=e^{-\\Delta G^\\circ/RT}$$',
      body: 'If 2-methyl-2-butene is more stable by $\\Delta G^\\circ=-3.5\\,\\text{kJ mol}^{-1}$ relative to 2-methyl-1-butene at $298\\,\\text{K}$, then $K=\\exp[3500/(8.314\\times298)]\\approx4.1$. This predicts about $4.1:1$ or roughly $80:20$ product ratio favoring the more substituted alkene.',
      diagram: chemGraph({
        xLabel: 'alkene products',
        yLabel: 'relative G',
        points: [
          { x: 120, y: 65, label: '2-methyl-2-butene (major)', fill: '#16a34a' },
          { x: 220, y: 90, label: '2-methyl-1-butene (minor)', fill: '#dc2626' },
        ],
        annotations:
          '<line x1="120" y1="65" x2="220" y2="90" stroke="#333" stroke-dasharray="4 3"/>' +
          '<text x="145" y="72" font-size="9">ΔG° = -3.5 kJ mol⁻¹</text>',
      }),
      takeaway:
        'Both E1 and E2 usually favor the thermodynamically more substituted alkene unless base size/geometry overrides.',
    },
    {
      title: 'E1cb pathway for 2-fluoroacetaldehyde',
      formula:
        '$$K_{deprot}=10^{\\mathrm{p}K_a(\\mathrm{HB})-\\mathrm{p}K_a(\\alpha\\text{-H})},\\quad \\text{rate}_{E1cb}=k[\\text{conjugate base}]$$',
      body: 'For 2-fluoroacetaldehyde ($\\mathrm{FCH_2CHO}$), direct E1/E2 loss of F$^-$ is difficult, so base first removes the acidic $\\alpha$-H to give a resonance-stabilized fluoroenolate (conjugate base), then fluoride leaves in the slower step. If $\\mathrm{p}K_a(\\alpha\\text{-H})\\approx17$ and $\\mathrm{p}K_a(\\mathrm{HB})=19$, then $K_{deprot}=10^{19-17}=10^2$. With $[\\text{conjugate base}]=0.010\\,\\text{M}$ and $k=3.0\\times10^{-4}\\,\\text{s}^{-1}$, $\\text{rate}_{E1cb}=3.0\\times10^{-6}\\,\\text{M s}^{-1}$.',
      diagram: chemGraph({
        xLabel: 'reaction coordinate',
        yLabel: 'G',
        curves: [
          { d: 'M 40 120 C 75 110 95 88 120 84 C 140 82 160 95 180 92 C 205 88 225 70 255 58', stroke: '#7c3aed', label: 'E1cb', labelPos: [205, 82] },
        ],
        points: [{ x: 180, y: 92, label: 'fluoroenolate', fill: '#7c3aed' }],
        annotations:
          '<text x="60" y="45" font-size="9">base deprotonation first, then F⁻ elimination</text>',
      }),
    },
  ],
  solution:
    '**(a)** 2-bromo-2-methylbutane can eliminate by E2 (strong base, bimolecular) or E1 (weak base/protic solvent, unimolecular). **(b)** E2 is concerted and needs anti-periplanar C-H/C-Br alignment, visualized in Newman form. **(c)** E1 proceeds through a tertiary carbocation intermediate with two barriers on the energy diagram. **(d)** Product mixtures typically favor 2-methyl-2-butene (Zaitsev). **(e)** For 2-fluoroacetaldehyde, poor leaving-group behavior of F drives an E1cb route: deprotonation to a stabilized conjugate base followed by slower fluoride loss.',
  verifiedPatterns: [
    '2-bromo-2-methylbutane',
    'E2',
    'anti-periplanar',
    'Zaitsev',
    '2-methyl-2-butene',
    'E1',
    'carbocation',
    'E1cb',
    '2-fluoroacetaldehyde',
    'fluoroenolate',
  ],
  minDiagramSteps: 5,
};
