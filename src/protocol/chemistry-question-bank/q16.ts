import { crystalFieldSplitting, chemGraph, uvVisCurves } from '../chem-svg';
import type { ChemistryQuestionDef } from './types';

export const Q16: ChemistryQuestionDef = {
  id: 'q16',
  number: 16,
  topic: 'Coordination Chemistry Bonding',
  question:
    'Coordination chemistry bonding: (a) Compare [Fe(CN)6]4- and [Fe(H2O)6]2+ using crystal field theory. (b) Draw octahedral, tetrahedral, and square-planar splitting diagrams. (c) Explain ligand strength using the spectrochemical series and connect it to color and magnetism.',
  steps: [
    {
      title: '[Fe(CN)6]4- as strong-field low-spin d6 complex',
      formula: '$$\\mathrm{CFSE}_{oct}=(-0.4n_{t2g}+0.6n_{eg})\\Delta_o$$',
      body: 'For Fe2+ in [Fe(CN)6]4-, the d6 low-spin occupancy is $t_{2g}^6e_g^0$, so $\\mathrm{CFSE}=(-0.4\\times6+0.6\\times0)\\Delta_o=-2.4\\Delta_o$. If $\\Delta_o=33{,}000\\,\\text{cm}^{-1}$, then stabilization is $-2.4\\times33{,}000=-79{,}200\\,\\text{cm}^{-1}$, which strongly favors pairing.',
      diagram: crystalFieldSplitting({
        metal: 'Fe',
        ligand: 'CN',
        strongField: true,
      }),
    },
    {
      title: '[Fe(H2O)6]2+ as weak-field high-spin d6 complex',
      formula: '$$\\mathrm{CFSE}_{oct}=(-0.4\\times4+0.6\\times2)\\Delta_o$$',
      body: 'In [Fe(H2O)6]2+, Fe2+ remains d6 but with high-spin occupancy $t_{2g}^4e_g^2$. Thus $\\mathrm{CFSE}=(-1.6+1.2)\\Delta_o=-0.4\\Delta_o$. With $\\Delta_o=10{,}500\\,\\text{cm}^{-1}$, the stabilization is only $-4{,}200\\,\\text{cm}^{-1}$, so pairing is much less favored than in cyanide complexes.',
      diagram: crystalFieldSplitting({
        metal: 'Fe',
        ligand: 'H2O',
        strongField: false,
      }),
    },
    {
      title: 'Octahedral vs tetrahedral splitting magnitudes',
      formula: '$$\\Delta_t=\\frac{4}{9}\\Delta_o$$',
      body: 'Here, $\\Delta_t$ is tetrahedral splitting and $\\Delta_o$ is octahedral splitting. If an octahedral complex has $\\Delta_o=9{,}000\\,\\text{cm}^{-1}$, then $\\Delta_t=(4/9)\\times9{,}000=4{,}000\\,\\text{cm}^{-1}$. Because $\\Delta_t$ is small, tetrahedral complexes are usually high-spin.',
      diagram: chemGraph({
        xLabel: 'field type',
        yLabel: 'relative d-level energy',
        annotations:
          '<text x="55" y="28" font-size="10" font-weight="bold">Octahedral</text>' +
          '<line x1="55" y1="55" x2="120" y2="55" stroke="#dc2626" stroke-width="2"/><text x="124" y="58" font-size="9">eg</text>' +
          '<line x1="55" y1="95" x2="120" y2="95" stroke="#1d4ed8" stroke-width="2"/><text x="124" y="98" font-size="9">t2g</text>' +
          '<line x1="90" y1="55" x2="90" y2="95" stroke="#333" stroke-dasharray="3 2"/><text x="95" y="78" font-size="8">Δo</text>' +
          '<text x="175" y="28" font-size="10" font-weight="bold">Tetrahedral</text>' +
          '<line x1="175" y1="70" x2="240" y2="70" stroke="#dc2626" stroke-width="2"/><text x="244" y="73" font-size="9">t2</text>' +
          '<line x1="175" y1="100" x2="240" y2="100" stroke="#1d4ed8" stroke-width="2"/><text x="244" y="103" font-size="9">e</text>' +
          '<line x1="210" y1="70" x2="210" y2="100" stroke="#333" stroke-dasharray="3 2"/><text x="214" y="88" font-size="8">Δt</text>',
      }),
    },
    {
      title: 'Square-planar splitting for strong-field d8 cases',
      formula: '$$\\Delta_{sp}\\approx1.3\\Delta_o$$',
      body: 'Here, $\\Delta_{sp}$ is square-planar splitting and $\\Delta_o$ is the octahedral reference splitting. If $\\Delta_o=12{,}000\\,\\text{cm}^{-1}$, then $\\Delta_{sp}\\approx1.3\\times12{,}000=15{,}600\\,\\text{cm}^{-1}$. This large gap explains why many square-planar d8 complexes are diamagnetic.',
      diagram: chemGraph({
        xLabel: 'orbital set',
        yLabel: 'energy',
        annotations:
          '<text x="95" y="22" font-size="10" font-weight="bold">Square-planar d-orbital order</text>' +
          '<line x1="90" y1="45" x2="220" y2="45" stroke="#dc2626" stroke-width="2"/><text x="224" y="48" font-size="9">dx2-y2</text>' +
          '<line x1="90" y1="70" x2="220" y2="70" stroke="#f59e0b" stroke-width="2"/><text x="224" y="73" font-size="9">dxy</text>' +
          '<line x1="90" y1="95" x2="220" y2="95" stroke="#1d4ed8" stroke-width="2"/><text x="224" y="98" font-size="9">dz2</text>' +
          '<line x1="90" y1="120" x2="220" y2="120" stroke="#16a34a" stroke-width="2"/><text x="224" y="123" font-size="9">dxz, dyz</text>',
      }),
    },
    {
      title: 'Spectrochemical series and absorption energy',
      formula: '$$E=\\frac{hc}{\\lambda}$$',
      body: 'A ligand higher in the spectrochemical series gives larger splitting and absorbs shorter wavelength light. For $\\lambda=420\\,\\text{nm}$ (stronger field), $E=(6.626\\times10^{-34}\\times3.00\\times10^8)/(420\\times10^{-9})=4.73\\times10^{-19}\\,\\text{J}$. For $\\lambda=620\\,\\text{nm}$ (weaker field), $E=3.21\\times10^{-19}\\,\\text{J}$. The larger transition energy matches stronger-field ligands like CN-.',
      diagram: uvVisCurves(),
    },
    {
      title: 'Magnetic moments: low-spin vs high-spin iron(II)',
      formula: '$$\\mu=\\sqrt{n(n+2)}\\,\\text{BM}$$',
      body: 'Here $\\mu$ is the magnetic moment (in BM) and $n$ is the number of unpaired electrons. For low-spin [Fe(CN)6]4-, $n=0$ so $\\mu=\\sqrt{0}=0\\,\\text{BM}$ (diamagnetic). For high-spin [Fe(H2O)6]2+, $n=4$ so $\\mu=\\sqrt{4(4+2)}=\\sqrt{24}=4.90\\,\\text{BM}$. This contrast is a direct ligand-field signature.',
      diagram: chemGraph({
        xLabel: 'complex',
        yLabel: 'magnetic moment (BM)',
        points: [
          { x: 110, y: 135, label: '[Fe(CN)6]4-: 0.0', fill: '#16a34a' },
          { x: 220, y: 70, label: '[Fe(H2O)6]2+: 4.9', fill: '#dc2626' },
        ],
        annotations:
          '<line x1="110" y1="135" x2="220" y2="70" stroke="#333" stroke-dasharray="4 3"/>' +
          '<text x="115" y="52" font-size="9">higher unpaired count for weak field</text>',
      }),
      takeaway:
        'Coordination bonding trends are unified by crystal-field splitting: stronger ligands increase Δ, favor low-spin states, and change both color and magnetism.',
    },
  ],
  solution:
    '**(a)** [Fe(CN)6]4- is strong-field low-spin d6 with large octahedral splitting and large negative CFSE, while [Fe(H2O)6]2+ is weak-field high-spin d6 with smaller splitting. **(b)** Octahedral, tetrahedral, and square-planar diagrams differ in ordering and magnitude, with $\\Delta_t=(4/9)\\Delta_o$ and typically large square-planar gaps. **(c)** The spectrochemical series places CN- above H2O, so cyanide complexes absorb higher-energy light and often become diamagnetic. The measured magnetic moment is therefore much smaller for [Fe(CN)6]4- than for [Fe(H2O)6]2+.',
  verifiedPatterns: [
    '[Fe(CN)6]4-',
    '[Fe(H2O)6]2+',
    'CFSE',
    'low-spin',
    'high-spin',
    'octahedral',
    'tetrahedral',
    'square-planar',
    'spectrochemical series',
    'magnetic moment',
  ],
  minDiagramSteps: 5,
};
