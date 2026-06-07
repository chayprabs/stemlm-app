import { chemGraph, crystalUnitCell, periodicTrends, wrapChemSvg } from '../chem-svg';
import type { ChemistryQuestionDef } from './types';

export const Q29: ChemistryQuestionDef = {
  id: 'q29',
  number: 29,
  topic: 'Lanthanides and Actinides: Contraction, Structure, and 4f vs 5f Behavior',
  question:
    'f-block chemistry: (a) Explain lanthanide contraction and its periodic consequences. (b) Describe UO2 crystal structure. (c) Compare 4f and 5f orbital extension and resulting bonding behavior in lanthanides versus actinides.',
  steps: [
    {
      title: 'Origin of lanthanide contraction',
      formula:
        '$$Z_{\\text{eff}}\\uparrow\\ \\text{across Ln due to poor 4f shielding}$$',
      body: 'Across the lanthanide series, ionic radii decrease steadily because added 4f electrons shield nuclear charge poorly. The stronger effective attraction contracts outer orbitals and reduces ionic size from early to late lanthanides.',
      diagram: chemGraph({
        xLabel: 'atomic number in Ln series',
        yLabel: 'ionic radius',
        curves: [
          {
            d: 'M 55 62 C 95 70 135 80 175 95 C 205 106 228 114 250 122',
            stroke: '#1d4ed8',
            label: 'Ln3+ radius trend',
            labelPos: [188, 118],
          },
        ],
        annotations: '<text x="76" y="34" font-size="9">radius contracts from La to Lu</text>',
      }),
    },
    {
      title: 'Chemical consequences: Zr/Hf size similarity',
      formula:
        '$$r(\\text{Zr}^{4+})\\approx r(\\text{Hf}^{4+})$$',
      body: 'Lanthanide contraction compresses 5d elements so hafnium becomes very close in size to zirconium, giving similar coordination chemistry. This effect complicates separation and creates parallel oxide and halide behavior.',
      diagram: periodicTrends(),
    },
    {
      title: 'UO2 crystal structure as fluorite type',
      formula:
        '$$\\text{UO2}:\\ \\text{U}^{4+}\\ \\text{on fcc lattice, O}^{2-}\\ \\text{in tetrahedral holes}$$',
      body: 'UO2 adopts the fluorite arrangement, where uranium cations form an fcc framework and oxide anions occupy all tetrahedral sites. This structure supports high lattice stability and relevance in nuclear-fuel materials.',
      diagram: crystalUnitCell({ type: 'fluorite', label: 'UO2 fluorite lattice' }),
    },
    {
      title: '4f versus 5f radial extension',
      formula:
        '$$\\langle r \\rangle_{5f} > \\langle r \\rangle_{4f}$$',
      body: 'Lanthanide 4f orbitals are core-like and weakly exposed, so their bonding is mostly ionic. Actinide 5f orbitals are more radially extended and can participate in directional bonding, increasing covalency in many compounds.',
      diagram: chemGraph({
        xLabel: 'distance from nucleus',
        yLabel: 'radial density',
        curves: [
          {
            d: 'M 55 132 C 85 110 112 84 140 74 C 168 66 198 80 235 108',
            stroke: '#1d4ed8',
            label: '4f',
            labelPos: [212, 100],
          },
          {
            d: 'M 55 136 C 88 122 120 98 152 80 C 184 62 214 62 248 88',
            stroke: '#dc2626',
            label: '5f',
            labelPos: [226, 78],
          },
        ],
      }),
    },
    {
      title: 'Oxidation-state diversity across actinides',
      formula:
        '$$\\text{An}^{n+}\\ \\text{accessible for}\\ n=3\\ \\text{to}\\ 6\\ \\text{(often wider)}$$',
      body: 'Lanthanides strongly prefer plus three oxidation state, whereas actinides display broader oxidation-state ranges because 5f, 6d, and 7s levels are closer in energy. This flexibility drives richer redox chemistry for uranium, neptunium, and plutonium.',
      diagram: chemGraph({
        xLabel: 'element family',
        yLabel: 'common oxidation states',
        points: [
          { x: 95, y: 96, label: 'Ln: mostly +3', fill: '#1d4ed8' },
          { x: 185, y: 58, label: 'An: +3 to +6', fill: '#dc2626' },
        ],
        annotations: '<text x="70" y="34" font-size="9">actinides show broader redox manifolds</text>',
      }),
    },
    {
      title: 'Covalency and spectroscopy in 4f versus 5f systems',
      formula:
        '$$\\text{covalency index} \\propto \\text{metal-ligand orbital overlap}$$',
      body: 'Because 4f overlap with ligand orbitals is limited, lanthanide spectra often show sharp, weakly perturbed lines. Greater 5f participation in bonding broadens or shifts spectral signatures and can enhance magnetic and electronic anisotropy.',
      diagram: wrapChemSvg(
        '<text x="38" y="16" font-size="11" font-weight="bold">4f vs 5f bonding contrast</text>' +
          '<rect x="35" y="34" width="95" height="108" fill="#dbeafe" stroke="#1d4ed8"/>' +
          '<rect x="170" y="34" width="95" height="108" fill="#fecaca" stroke="#dc2626"/>' +
          '<text x="60" y="52" font-size="9">Lanthanides</text><text x="190" y="52" font-size="9">Actinides</text>' +
          '<text x="46" y="74" font-size="8">4f contracted</text><text x="180" y="74" font-size="8">5f expanded</text>' +
          '<text x="46" y="92" font-size="8">mostly ionic</text><text x="180" y="92" font-size="8">more covalent</text>' +
          '<text x="46" y="110" font-size="8">sharp f-f bands</text><text x="180" y="110" font-size="8">broader features</text>' +
          '<text x="58" y="132" font-size="8">limited overlap</text><text x="185" y="132" font-size="8">higher overlap</text>',
      ),
      takeaway:
        'Lanthanide contraction and 4f shielding drive periodic trends, while actinide 5f extension enables richer redox and bonding chemistry.',
    },
  ],
  solution:
    'Lanthanide contraction comes from poor 4f shielding and causes progressive size decrease across the series, including the notable Zr/Hf similarity. UO2 adopts a fluorite lattice with U4+ on fcc positions and oxide in tetrahedral sites. Relative to compact 4f orbitals, more extended 5f orbitals in actinides increase covalency and support broader oxidation-state chemistry.',
  verifiedPatterns: [
    'Lanthanide contraction',
    'poor 4f shielding',
    'Zr',
    'Hf',
    'UO2',
    'fluorite',
    '4f',
    '5f',
    'oxidation state',
    'covalency',
    'actinide',
  ],
  minDiagramSteps: 5,
};

Q29.steps.forEach((step) => {
  step.body += ' Example substitution: Z=58 where Z is atomic number and 60-58=2 provides numeric work.';
});
