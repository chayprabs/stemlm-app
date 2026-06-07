import { chemGraph, vseprMolecule, irSpectrum } from '../chem-svg';
import type { ChemistryQuestionDef } from './types';

export const Q17: ChemistryQuestionDef = {
  id: 'q17',
  number: 17,
  topic: 'Coordination Isomerism',
  question:
    'Coordination isomerism: (a) Analyze cis/trans forms of [Co(NH3)4Cl2]+. (b) Enumerate isomers of Cr(en)(ox)Cl2. (c) Compare cisplatin and transplatin geometries/reactivity. (d) Apply EAN and 18-electron counting to Ni(CO)4.',
  steps: [
    {
      title: 'cis/trans distribution for [Co(NH3)4Cl2]+',
      formula: '$$K_{iso}=\\frac{[\\text{cis-[Co(NH}_3\\text{)}_4\\text{Cl}_2]^+]}{[\\text{trans-[Co(NH}_3\\text{)}_4\\text{Cl}_2]^+]}$$',
      body: 'If $K_{iso}=2.4$ at synthesis temperature and total concentration is $0.30\\,\\text{M}$, set trans concentration as $x$ and cis as $2.4x$. Then $x+2.4x=0.30$, so $x=0.088\\,\\text{M}$ and cis concentration is $0.212\\,\\text{M}$. The cis-[Co(NH3)4Cl2]+ form is therefore favored under these conditions.',
      diagram: chemGraph({
        xLabel: 'isomer',
        yLabel: 'relative amount',
        points: [
          { x: 110, y: 78, label: 'cis 0.212 M', fill: '#16a34a' },
          { x: 220, y: 118, label: 'trans 0.088 M', fill: '#dc2626' },
        ],
        annotations:
          '<text x="68" y="24" font-size="10" font-weight="bold">[Co(NH3)4Cl2]+ isomer ratio</text>' +
          '<line x1="110" y1="78" x2="220" y2="118" stroke="#333" stroke-dasharray="4 3"/>',
      }),
    },
    {
      title: 'Dipole moment contrast between cis and trans forms',
      formula: '$$\\mu_{net}=\\sqrt{\\mu_1^2+\\mu_2^2+2\\mu_1\\mu_2\\cos\\theta}$$',
      body: 'Taking each Co-Cl bond dipole as $\\mu_1=\\mu_2=2.2\\,\\text{D}$: for cis geometry with $\\theta=90^\\circ$, $\\mu_{net}=\\sqrt{2.2^2+2.2^2}=3.11\\,\\text{D}$. For trans geometry with $\\theta=180^\\circ$, $\\mu_{net}=\\sqrt{2.2^2+2.2^2-2(2.2)(2.2)}=0$. This gives a practical way to distinguish cis and trans in solution.',
      diagram: chemGraph({
        xLabel: 'geometry',
        yLabel: 'dipole moment (D)',
        points: [
          { x: 110, y: 76, label: 'cis: 3.11 D', fill: '#1d4ed8' },
          { x: 220, y: 135, label: 'trans: ~0 D', fill: '#7c3aed' },
        ],
        annotations:
          '<text x="86" y="30" font-size="9">vector addition of M-Cl bond dipoles</text>',
      }),
    },
    {
      title: 'Isomer count for Cr(en)(ox)Cl2',
      formula: '$$N_{total}=N_{geo}+N_{opt}$$',
      body: 'For octahedral Cr(en)(ox)Cl2, two geometric arrangements are possible (cis and trans). The cis arrangement is chiral and appears as $\\Delta$ and $\\Lambda$ enantiomers, while trans is achiral. So the total count is $N_{total}=1\\,(trans)+2\\,(cis\\,optical)=3$ distinct isomers.',
      diagram: chemGraph({
        xLabel: 'isomer family',
        yLabel: 'count',
        points: [
          { x: 95, y: 105, label: 'trans: 1', fill: '#16a34a' },
          { x: 170, y: 90, label: 'cis-Δ: 1', fill: '#dc2626' },
          { x: 240, y: 90, label: 'cis-Λ: 1', fill: '#dc2626' },
        ],
        annotations:
          '<text x="72" y="28" font-size="10" font-weight="bold">Cr(en)(ox)Cl2 isomer set</text>',
      }),
    },
    {
      title: 'cisplatin vs transplatin aquation kinetics',
      formula: '$$t_{1/2}=\\frac{0.693}{k}$$',
      body: 'If cisplatin aquation has $k=1.8\\times10^{-5}\\,\\text{s}^{-1}$, then $t_{1/2}=0.693/(1.8\\times10^{-5})=3.85\\times10^4\\,\\text{s}=10.7\\,\\text{h}$. For transplatin with $k=3.5\\times10^{-6}\\,\\text{s}^{-1}$, $t_{1/2}=1.98\\times10^5\\,\\text{s}=55.0\\,\\text{h}$. Faster aquation of cisplatin correlates with greater biological activity.',
      diagram: vseprMolecule({
        name: 'cisplatin (cis-[Pt(NH3)2Cl2])',
        geometry: 'square planar, adjacent Cl ligands',
        angle: '90°',
        hybrid: 'dsp2',
      }),
    },
    {
      title: 'EAN and 18-electron count for Ni(CO)4',
      formula: '$$\\mathrm{EAN}=Z-\\mathrm{OS}+2L$$',
      body: 'For Ni(CO)4, nickel is in oxidation state $0$, so $\\mathrm{EAN}=28-0+2\\times4=36$, equal to krypton. The valence-electron count is $10$ from Ni(0) plus $8$ from four CO donors, totaling $18$ electrons. This satisfies both the EAN criterion and the 18-electron rule.',
      diagram: chemGraph({
        xLabel: 'electron accounting',
        yLabel: 'electrons',
        points: [
          { x: 90, y: 95, label: 'Ni(0): 10 e-', fill: '#1d4ed8' },
          { x: 170, y: 105, label: '4CO: 8 e-', fill: '#16a34a' },
          { x: 245, y: 70, label: 'total: 18 e-', fill: '#dc2626' },
        ],
        annotations:
          '<text x="72" y="24" font-size="10" font-weight="bold">Ni(CO)4 electron count and EAN</text>',
      }),
    },
    {
      title: 'Back-bonding evidence from CO stretching frequencies',
      formula: '$$\\Delta\\tilde\\nu=\\tilde\\nu(\\mathrm{CO_{free}})-\\tilde\\nu(\\mathrm{CO_{complex}})$$',
      body: 'With free CO at $2143\\,\\text{cm}^{-1}$ and a Ni(CO)4 band at $2056\\,\\text{cm}^{-1}$, the shift is $\\Delta\\tilde\\nu=2143-2056=87\\,\\text{cm}^{-1}$. A lower stretching frequency indicates stronger metal-to-CO back-donation, consistent with a stable 18-electron Ni(CO)4 complex.',
      diagram: irSpectrum({
        title: 'IR signature: CO free vs Ni(CO)4',
        peaks: [
          { x: 120, label: '2143 free CO' },
          { x: 190, label: '2056 Ni(CO)4' },
        ],
      }),
      takeaway:
        'Coordination isomerism combines geometry, optical activity, and electronic structure: measurable dipole, kinetics, and spectroscopy all distinguish isomers.',
    },
  ],
  solution:
    '**(a)** [Co(NH3)4Cl2]+ has distinct cis and trans geometrical isomers, often with different dipole moments and relative abundances; a trans-[Co(NH3)4Cl2] arrangement cancels bond dipoles more effectively. **(b)** Cr(en)(ox)Cl2 gives three distinct isomers (one trans and two optical cis forms). **(c)** cisplatin and transplatin differ sharply in ligand arrangement and aquation behavior, explaining their different biological action. **(d)** Ni(CO)4 obeys EAN and the 18-electron rule with strong back-bonding reflected by lowered CO stretching frequency.',
  verifiedPatterns: [
    'cis-[Co(NH3)4Cl2]+',
    'trans-[Co(NH3)4Cl2]',
    'Cr(en)(ox)Cl2',
    'cisplatin',
    'transplatin',
    'EAN',
    'Ni(CO)4',
    '18-electron rule',
    'back-donation',
  ],
  minDiagramSteps: 5,
};
